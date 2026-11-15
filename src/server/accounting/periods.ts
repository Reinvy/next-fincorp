import { prisma, withFinancialTx, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { monthBounds } from "@/lib/dates";
import type { Actor, PeriodStatus } from "@/lib/types";

/** Reject any posting dated inside a CLOSED FiscalPeriod. */
export async function assertPeriodOpen(tx: Tx, companyId: string, date: Date): Promise<void> {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const period = await tx.fiscalPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
    select: { status: true },
  });
  if (period?.status === "CLOSED") {
    throw new DomainError(
      "PERIOD_CLOSED",
      `Periode ${String(month).padStart(2, "0")}/${year} sudah ditutup. Buka kembali periode untuk mencatat transaksi ini.`,
    );
  }
}

export interface PeriodRow {
  year: number;
  month: number;
  status: PeriodStatus;
  closedAt: string | null;
  closedByName: string | null;
  note: string | null;
  draftSales: number;
  draftPurchases: number;
  draftJournals: number;
}

export async function listPeriods(actor: Actor, year: number): Promise<PeriodRow[]> {
  const periods = await prisma.fiscalPeriod.findMany({
    where: { companyId: actor.companyId, year },
    select: { month: true, status: true, closedAt: true, closedById: true, note: true },
  });
  const closedByIds = periods.map((period) => period.closedById).filter((id): id is string => Boolean(id));
  const users = closedByIds.length
    ? await prisma.user.findMany({ where: { id: { in: closedByIds } }, select: { id: true, name: true } })
    : [];
  const userName = new Map(users.map((user) => [user.id, user.name]));

  const rows: PeriodRow[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const period = periods.find((entry) => entry.month === month);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const { start, end } = monthBounds(key);
    const [draftSales, draftPurchases, draftJournals] = await Promise.all([
      prisma.salesInvoice.count({ where: { companyId: actor.companyId, status: "DRAFT", date: { gte: start, lte: end } } }),
      prisma.purchaseInvoice.count({ where: { companyId: actor.companyId, status: "DRAFT", date: { gte: start, lte: end } } }),
      prisma.journalEntry.count({ where: { companyId: actor.companyId, status: "DRAFT", date: { gte: start, lte: end } } }),
    ]);
    rows.push({
      year,
      month,
      status: period?.status === "CLOSED" ? "CLOSED" : "OPEN",
      closedAt: period?.closedAt?.toISOString() ?? null,
      closedByName: period?.closedById ? (userName.get(period.closedById) ?? null) : null,
      note: period?.note ?? null,
      draftSales,
      draftPurchases,
      draftJournals,
    });
  }
  return rows;
}

export interface ClosePeriodInput {
  year: number;
  month: number;
  note?: string | null;
}

export async function closePeriod(actor: Actor, input: ClosePeriodInput): Promise<void> {
  if (actor.role !== "ADMIN") throw new DomainError("FORBIDDEN", "Hanya admin yang dapat menutup periode.");
  const key = `${input.year}-${String(input.month).padStart(2, "0")}`;
  const { start, end } = monthBounds(key);

  await withFinancialTx(async (tx) => {
    const [draftJournals, draftSales, draftPurchases] = await Promise.all([
      tx.journalEntry.count({ where: { companyId: actor.companyId, status: "DRAFT", date: { gte: start, lte: end } } }),
      tx.salesInvoice.count({ where: { companyId: actor.companyId, status: "DRAFT", date: { gte: start, lte: end } } }),
      tx.purchaseInvoice.count({ where: { companyId: actor.companyId, status: "DRAFT", date: { gte: start, lte: end } } }),
    ]);
    if (draftJournals + draftSales + draftPurchases > 0) {
      throw new DomainError(
        "INVALID_STATUS",
        `Periode masih memiliki ${draftJournals} draf jurnal, ${draftSales} draf faktur penjualan, dan ${draftPurchases} draf pembelian. Posting atau hapus draf terlebih dahulu.`,
      );
    }

    const existing = await tx.fiscalPeriod.findUnique({
      where: { companyId_year_month: { companyId: actor.companyId, year: input.year, month: input.month } },
      select: { status: true },
    });
    if (existing?.status === "CLOSED") throw new DomainError("INVALID_STATUS", "Periode ini sudah ditutup.");

    await tx.fiscalPeriod.upsert({
      where: { companyId_year_month: { companyId: actor.companyId, year: input.year, month: input.month } },
      create: {
        companyId: actor.companyId,
        year: input.year,
        month: input.month,
        status: "CLOSED",
        closedAt: new Date(),
        closedById: actor.userId,
        note: input.note?.trim() || null,
      },
      update: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: actor.userId,
        note: input.note?.trim() || null,
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "CLOSE_PERIOD",
      entityType: "FiscalPeriod",
      entityId: key,
      summary: `Menutup periode ${key}`,
      metadata: { year: input.year, month: input.month },
    });
  });
}

export async function reopenPeriod(actor: Actor, input: ClosePeriodInput): Promise<void> {
  if (actor.role !== "ADMIN") throw new DomainError("FORBIDDEN", "Hanya admin yang dapat membuka periode.");
  const note = input.note?.trim() ?? "";
  if (note.length < 3) throw new DomainError("INVALID_INPUT", "Alasan membuka kembali periode wajib diisi.");

  await withFinancialTx(async (tx) => {
    const existing = await tx.fiscalPeriod.findUnique({
      where: { companyId_year_month: { companyId: actor.companyId, year: input.year, month: input.month } },
      select: { status: true },
    });
    if (!existing) throw new DomainError("INVALID_STATUS", "Periode ini belum pernah ditutup.");
    if (existing.status !== "CLOSED") throw new DomainError("INVALID_STATUS", "Periode ini masih terbuka.");

    await tx.fiscalPeriod.update({
      where: { companyId_year_month: { companyId: actor.companyId, year: input.year, month: input.month } },
      data: { status: "OPEN", closedAt: null, closedById: null, note },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "REOPEN_PERIOD",
      entityType: "FiscalPeriod",
      entityId: `${input.year}-${String(input.month).padStart(2, "0")}`,
      summary: `Membuka kembali periode ${input.year}-${String(input.month).padStart(2, "0")}: ${note}`,
    });
  });
}
