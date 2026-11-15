import { randomUUID } from "node:crypto";
import { prisma, withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D, roundRp, type Moneyish } from "@/lib/money";
import { addMonths, lastDayOfMonth, monthKey, parseMonthKey, formatMonthID } from "@/lib/dates";
import type { Actor, DepreciationMethod } from "@/lib/types";
import type { FixedAssetView } from "@/lib/dto";
import { postJournal, type JournalLineInput } from "@/server/accounting/posting";

interface AssetForDepreciation {
  id: string;
  code: string;
  name: string;
  purchaseDate: Date;
  purchasePrice: Moneyish;
  residualValue: Moneyish;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  annualRate: Moneyish | null;
  accumulatedDepreciation: Moneyish;
  depreciationExpenseAccountId: string;
  accumulatedAccountId: string;
  status: string;
}

function finalMonthEnd(purchaseDate: Date, lifeMonths: number): Date {
  return new Date(Date.UTC(purchaseDate.getUTCFullYear(), purchaseDate.getUTCMonth() + lifeMonths, 0));
}

export function monthlyDepreciationAmount(asset: {
  purchaseDate: Date;
  purchasePrice: Moneyish;
  residualValue: Moneyish;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  annualRate: Moneyish | null;
  accumulatedDepreciation: Moneyish;
}, periodEnd: Date): { amount: ReturnType<typeof D>; remaining: ReturnType<typeof D> } {
  const cost = D(asset.purchasePrice);
  const residual = D(asset.residualValue);
  const accumulated = D(asset.accumulatedDepreciation);
  const depreciable = cost.minus(residual);
  const remaining = depreciable.minus(accumulated);
  if (!remaining.greaterThan(0)) return { amount: D(0), remaining: D(0) };

  let base: ReturnType<typeof D>;
  if (asset.method === "STRAIGHT_LINE") {
    base = roundRp(depreciable.dividedBy(asset.usefulLifeMonths));
  } else {
    const rate = asset.annualRate
      ? D(asset.annualRate)
      : D(200).dividedBy(D(asset.usefulLifeMonths).dividedBy(12));
    base = roundRp(cost.minus(accumulated).times(rate).dividedBy(100).dividedBy(12));
  }

  const isFinalMonth = periodEnd.getTime() >= finalMonthEnd(asset.purchaseDate, asset.usefulLifeMonths).getTime();
  const amount = isFinalMonth ? remaining : base.greaterThan(remaining) ? remaining : base;
  return { amount: amount.greaterThan(0) ? amount : D(0), remaining };
}

export interface DepreciationRunResult {
  id: string;
  period: string;
  totalAmount: number;
  journalNumber: string;
  assets: number;
}

export async function runDepreciation(actor: Actor, period: string): Promise<DepreciationRunResult> {
  const { year, month } = parseMonthKey(period);
  const periodEnd = lastDayOfMonth(year, month);

  const existing = await prisma.depreciationRun.findUnique({
    where: { companyId_period: { companyId: actor.companyId, period } },
    select: { id: true },
  });
  if (existing) throw new DomainError("DUPLICATE", `Penyusutan periode ${formatMonthID(period)} sudah dijalankan.`);

  return withFinancialTx(async (tx) => {
    const assets = await tx.fixedAsset.findMany({
      where: {
        companyId: actor.companyId,
        status: "ACTIVE",
        purchaseDate: { lte: periodEnd },
      },
    });
    if (assets.length === 0) {
      throw new DomainError("INVALID_INPUT", "Tidak ada aset aktif yang dapat disusutkan pada periode ini.");
    }

    const computed: Array<{
      asset: AssetForDepreciation;
      amount: ReturnType<typeof D>;
      accumulatedAfter: ReturnType<typeof D>;
      bookValueAfter: ReturnType<typeof D>;
    }> = [];
    for (const asset of assets) {
      const { amount } = monthlyDepreciationAmount(asset, periodEnd);
      if (!amount.greaterThan(0)) continue;
      const accumulatedAfter = D(asset.accumulatedDepreciation).plus(amount);
      const bookValueAfter = D(asset.purchasePrice).minus(accumulatedAfter);
      computed.push({ asset, amount, accumulatedAfter, bookValueAfter });
    }
    if (computed.length === 0) {
      throw new DomainError("INVALID_INPUT", "Tidak ada aset yang dapat disusutkan pada periode ini.");
    }

    const total = computed.reduce((acc, entry) => acc.plus(entry.amount), D(0));
    const byPair = new Map<string, { expenseId: string; accumulatedId: string; amount: ReturnType<typeof D> }>();
    for (const entry of computed) {
      const key = `${entry.asset.depreciationExpenseAccountId}:${entry.asset.accumulatedAccountId}`;
      const current = byPair.get(key);
      if (current) current.amount = current.amount.plus(entry.amount);
      else
        byPair.set(key, {
          expenseId: entry.asset.depreciationExpenseAccountId,
          accumulatedId: entry.asset.accumulatedAccountId,
          amount: entry.amount,
        });
    }
    const lines: JournalLineInput[] = [];
    for (const pair of byPair.values()) {
      lines.push({ accountId: pair.expenseId, debit: pair.amount.toFixed(2), credit: "0" });
      lines.push({ accountId: pair.accumulatedId, debit: "0", credit: pair.amount.toFixed(2) });
    }

    const runId = randomUUID();
    const journal = await postJournal(tx, actor, {
      date: periodEnd,
      description: `Penyusutan periode ${formatMonthID(period)}`,
      type: "DEPRECIATION",
      sourceType: "DEPRECIATION_RUN",
      sourceId: runId,
      lines,
    });

    await tx.depreciationRun.create({
      data: {
        id: runId,
        companyId: actor.companyId,
        period,
        date: periodEnd,
        totalAmount: total.toFixed(2),
        journalEntryId: journal.id,
        createdById: actor.userId,
        entries: {
          create: computed.map((entry) => ({
            assetId: entry.asset.id,
            amount: entry.amount.toFixed(2),
            accumulatedAfter: entry.accumulatedAfter.toFixed(2),
            bookValueAfter: entry.bookValueAfter.toFixed(2),
          })),
        },
      },
    });

    for (const entry of computed) {
      const fullyDepreciated = entry.accumulatedAfter.greaterThanOrEqualTo(
        D(entry.asset.purchasePrice).minus(D(entry.asset.residualValue)),
      );
      await tx.fixedAsset.update({
        where: { id: entry.asset.id },
        data: {
          accumulatedDepreciation: entry.accumulatedAfter.toFixed(2),
          status: fullyDepreciated ? "FULLY_DEPRECIATED" : "ACTIVE",
        },
      });
    }

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "DEPRECIATION",
      entityType: "DepreciationRun",
      entityId: runId,
      summary: `Penyusutan ${formatMonthID(period)} sebesar ${total.toFixed(0)} untuk ${computed.length} aset`,
      metadata: { journal: journal.number, period },
    });

    return {
      id: runId,
      period,
      totalAmount: total.toNumber(),
      journalNumber: journal.number,
      assets: computed.length,
    };
  });
}

export interface DepreciationRunView {
  id: string;
  period: string;
  date: string;
  totalAmount: number;
  journalNumber: string;
  assetCount: number;
}

export async function listDepreciationRuns(actor: Actor): Promise<DepreciationRunView[]> {
  const runs = await prisma.depreciationRun.findMany({
    where: { companyId: actor.companyId },
    orderBy: { period: "desc" },
    include: { entries: { select: { id: true } } },
  });
  const journals = await prisma.journalEntry.findMany({
    where: { id: { in: runs.map((run) => run.journalEntryId) } },
    select: { id: true, number: true },
  });
  const numberById = new Map(journals.map((journal) => [journal.id, journal.number]));
  return runs.map((run) => ({
    id: run.id,
    period: run.period,
    date: run.date.toISOString().slice(0, 10),
    totalAmount: D(run.totalAmount).toNumber(),
    journalNumber: numberById.get(run.journalEntryId) ?? "—",
    assetCount: run.entries.length,
  }));
}

export interface ScheduleRow {
  period: string;
  amount: number;
  accumulatedAfter: number;
  bookValueAfter: number;
}

/** Forward projection using the same monthly formula and residual floor. */
export function projectDepreciation(asset: FixedAssetView, fromPeriod: string, months = 24): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let accumulated = asset.accumulatedDepreciation;
  const cost = asset.purchasePrice;
  const residual = asset.residualValue;
  const depreciable = cost - residual;
  const purchaseDate = new Date(`${asset.purchaseDate}T00:00:00.000Z`);
  const finalEnd = finalMonthEnd(purchaseDate, asset.usefulLifeMonths);
  const remainingAtStart = Math.max(0, depreciable - accumulated);
  if (remainingAtStart <= 0) return rows;

  let cursor = new Date(`${fromPeriod}-01T00:00:00.000Z`);
  for (let index = 0; index < months; index += 1) {
    const periodEnd = lastDayOfMonth(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1);
    const remaining = Math.max(0, depreciable - accumulated);
    if (remaining <= 0) break;
    let base: number;
    if (asset.method === "STRAIGHT_LINE") {
      base = Math.round(depreciable / asset.usefulLifeMonths);
    } else {
      const rate = asset.annualRate ?? 200 / (asset.usefulLifeMonths / 12);
      base = Math.round(((cost - accumulated) * rate) / 100 / 12);
    }
    const isFinal = periodEnd.getTime() >= finalEnd.getTime();
    const amount = Math.min(isFinal ? remaining : base, remaining);
    accumulated += amount;
    rows.push({
      period: monthKey(cursor),
      amount,
      accumulatedAfter: accumulated,
      bookValueAfter: cost - accumulated,
    });
    cursor = addMonths(cursor, 1);
  }
  return rows;
}
