import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { REPORT_GROUP_LABELS } from "@/lib/constants";
import type { Actor, ReportGroup } from "@/lib/types";

const GROUP_ORDER: ReportGroup[] = [
  "CURRENT_ASSET",
  "FIXED_ASSET",
  "ACCUMULATED_DEPRECIATION",
  "OTHER_ASSET",
  "CURRENT_LIABILITY",
  "LONG_TERM_LIABILITY",
  "EQUITY",
  "REVENUE",
  "CONTRA_REVENUE",
  "COST_OF_GOODS_SOLD",
  "CONTRA_COGS",
  "OPERATING_EXPENSE",
  "OTHER_INCOME",
  "OTHER_EXPENSE",
  "TAX_EXPENSE",
];

export interface TrialBalanceAccount {
  id: string;
  code: string;
  name: string;
  reportGroup: ReportGroup;
  debit: number;
  credit: number;
}

export interface TrialBalanceGroup {
  group: ReportGroup;
  label: string;
  accounts: TrialBalanceAccount[];
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  asOf: Date;
  groups: TrialBalanceGroup[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

/** Grouped trial balance from posted journal lines only. */
export async function getTrialBalance(actor: Actor, asOf: Date): Promise<TrialBalanceReport> {
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId, children: { none: {} } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, reportGroup: true },
  });
  const sums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: { companyId: actor.companyId, status: "POSTED", date: { lte: asOf } },
    },
    _sum: { debit: true, credit: true },
  });
  const sumsByAccount = new Map(sums.map((row) => [row.accountId, row]));

  const byGroup = new Map<ReportGroup, TrialBalanceAccount[]>();
  for (const account of accounts) {
    const row = sumsByAccount.get(account.id);
    if (!row) continue;
    const raw = D(row._sum.debit ?? 0).minus(D(row._sum.credit ?? 0));
    if (raw.isZero()) continue;
    const debit = raw.greaterThan(0) ? raw.toNumber() : 0;
    const credit = raw.isNegative() ? raw.abs().toNumber() : 0;
    const list = byGroup.get(account.reportGroup) ?? [];
    list.push({
      id: account.id,
      code: account.code,
      name: account.name,
      reportGroup: account.reportGroup,
      debit,
      credit,
    });
    byGroup.set(account.reportGroup, list);
  }

  const groups: TrialBalanceGroup[] = [];
  for (const group of GROUP_ORDER) {
    const rows = byGroup.get(group);
    if (!rows || rows.length === 0) continue;
    groups.push({
      group,
      label: REPORT_GROUP_LABELS[group] ?? group,
      accounts: rows,
      debit: rows.reduce((acc, row) => acc + row.debit, 0),
      credit: rows.reduce((acc, row) => acc + row.credit, 0),
    });
  }

  const totalDebit = groups.reduce((acc, group) => acc + group.debit, 0);
  const totalCredit = groups.reduce((acc, group) => acc + group.credit, 0);
  const balanced = Math.round(totalDebit * 100) === Math.round(totalCredit * 100);
  if (!balanced) {
    console.error(
      `[trial-balance] tidak seimbang untuk perusahaan ${actor.companyId}: debit ${totalDebit} vs kredit ${totalCredit}`,
    );
  }

  return { asOf, groups, totalDebit, totalCredit, balanced };
}

/** Signed (normal-balance) totals per report group, used by statements. */
export async function getGroupBalances(
  actor: Actor,
  range: { from?: Date; to: Date },
): Promise<Map<ReportGroup, number>> {
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId, children: { none: {} } },
    select: { id: true, reportGroup: true },
  });
  const groupByAccount = new Map(accounts.map((account) => [account.id, account.reportGroup]));
  const rows = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      journalEntry: {
        companyId: actor.companyId,
        status: "POSTED",
        date: { ...(range.from ? { gte: range.from } : {}), lte: range.to },
      },
    },
    _sum: { debit: true, credit: true },
  });

  const totals = new Map<ReportGroup, ReturnType<typeof D>>();
  for (const row of rows) {
    const group = groupByAccount.get(row.accountId);
    if (!group) continue;
    const raw = D(row._sum.debit ?? 0).minus(D(row._sum.credit ?? 0));
    totals.set(group, (totals.get(group) ?? D(0)).plus(raw));
  }
  const result = new Map<ReportGroup, number>();
  for (const [group, value] of totals) result.set(group, value.toNumber());
  return result;
}

export async function getAccountRawBalance(actor: Actor, accountId: string, asOf?: Date): Promise<number> {
  const aggregate = await prisma.journalLine.aggregate({
    where: {
      accountId,
      journalEntry: {
        companyId: actor.companyId,
        status: "POSTED",
        ...(asOf ? { date: { lte: asOf } } : {}),
      },
    },
    _sum: { debit: true, credit: true },
  });
  return D(aggregate._sum.debit ?? 0).minus(D(aggregate._sum.credit ?? 0)).toNumber();
}
