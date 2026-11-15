import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { dateFromISO } from "@/lib/dates";

/**
 * Hard invariants of the ledger. Throws with a complete issue list; used by the
 * seed and by `npm run db:verify`.
 */
export async function verifyLedger(companyId: string): Promise<void> {
  const issues: string[] = [];

  const entries = await prisma.journalEntry.findMany({
    where: { companyId, status: "POSTED" },
    include: { lines: true },
  });
  for (const entry of entries) {
    if (entry.lines.length < 2) issues.push(`Jurnal ${entry.number} memiliki kurang dari 2 baris.`);
    const debit = entry.lines.reduce((acc, line) => acc.plus(D(line.debit)), D(0));
    const credit = entry.lines.reduce((acc, line) => acc.plus(D(line.credit)), D(0));
    if (!debit.equals(credit)) issues.push(`Jurnal ${entry.number} tidak seimbang (${debit} vs ${credit}).`);
    if (!entry.postedAt) issues.push(`Jurnal ${entry.number} berstatus POSTED tanpa postedAt.`);
  }

  const draftWithPosted = await prisma.journalEntry.count({
    where: { companyId, status: "DRAFT", postedAt: { not: null } },
  });
  if (draftWithPosted > 0) issues.push(`${draftWithPosted} draf jurnal memiliki postedAt.`);

  const accounts = await prisma.glAccount.findMany({
    where: { companyId },
    select: { id: true, code: true, name: true, reportGroup: true, children: { select: { id: true } } },
  });
  const leafIds = accounts.filter((account) => account.children.length === 0).map((account) => account.id);
  const sums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { accountId: { in: leafIds }, journalEntry: { companyId, status: "POSTED" } },
    _sum: { debit: true, credit: true },
  });
  let totalDebit = D(0);
  let totalCredit = D(0);
  const rawByGroup = new Map<string, ReturnType<typeof D>>();
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  for (const row of sums) {
    const account = accountById.get(row.accountId);
    if (!account) continue;
    const debit = D(row._sum.debit ?? 0);
    const credit = D(row._sum.credit ?? 0);
    totalDebit = totalDebit.plus(debit);
    totalCredit = totalCredit.plus(credit);
    const raw = debit.minus(credit);
    rawByGroup.set(account.reportGroup, (rawByGroup.get(account.reportGroup) ?? D(0)).plus(raw));
  }
  if (!totalDebit.equals(totalCredit)) {
    issues.push(`Neraca saldo tidak seimbang: debit ${totalDebit} vs kredit ${totalCredit}.`);
  }

  const sumGroups = (groups: string[]) =>
    groups.reduce((acc, group) => acc.plus(rawByGroup.get(group) ?? D(0)), D(0));
  const assets = sumGroups(["CURRENT_ASSET", "FIXED_ASSET", "ACCUMULATED_DEPRECIATION", "OTHER_ASSET"]);
  const liabilities = sumGroups(["CURRENT_LIABILITY", "LONG_TERM_LIABILITY"]);
  const equity = sumGroups(["EQUITY"]);
  const profitAndLoss = sumGroups([
    "REVENUE",
    "CONTRA_REVENUE",
    "COST_OF_GOODS_SOLD",
    "CONTRA_COGS",
    "OPERATING_EXPENSE",
    "OTHER_INCOME",
    "OTHER_EXPENSE",
    "TAX_EXPENSE",
  ]);
  const balanceSheetRight = liabilities.plus(equity).plus(profitAndLoss).negated();
  if (!assets.equals(balanceSheetRight)) {
    issues.push(
      `Neraca tidak seimbang: aset ${assets} vs liabilitas+ekuitas+laba ${balanceSheetRight}.`,
    );
  }

  const invoices = await prisma.salesInvoice.findMany({
    where: { companyId },
    select: { number: true, grandTotal: true, paidAmount: true, creditedAmount: true, status: true, dueDate: true },
  });
  for (const invoice of invoices) {
    const settled = D(invoice.paidAmount).plus(D(invoice.creditedAmount));
    if (settled.greaterThan(D(invoice.grandTotal))) {
      issues.push(`Faktur ${invoice.number} dibayar/diretur melebihi total.`);
    }
  }
  const purchases = await prisma.purchaseInvoice.findMany({
    where: { companyId },
    select: { number: true, grandTotal: true, paidAmount: true, creditedAmount: true },
  });
  for (const invoice of purchases) {
    const settled = D(invoice.paidAmount).plus(D(invoice.creditedAmount));
    if (settled.greaterThan(D(invoice.grandTotal))) {
      issues.push(`Faktur pembelian ${invoice.number} dibayar/diretur melebihi total.`);
    }
  }

  const bankAccounts = await prisma.bankAccount.findMany({
    where: { companyId },
    select: { name: true, coaAccountId: true },
  });
  for (const bank of bankAccounts) {
    const aggregate = await prisma.journalLine.aggregate({
      where: { accountId: bank.coaAccountId, journalEntry: { companyId, status: "POSTED" } },
      _sum: { debit: true, credit: true },
    });
    const balance = D(aggregate._sum.debit ?? 0).minus(D(aggregate._sum.credit ?? 0));
    if (balance.isNegative()) issues.push(`Saldo rekening ${bank.name} negatif (${balance}).`);
  }

  const duplicateSales = await prisma.$queryRaw<Array<{ number: string; count: bigint }>>`
    SELECT number, COUNT(*)::bigint AS count FROM "SalesInvoice" WHERE "companyId" = ${companyId} GROUP BY number HAVING COUNT(*) > 1
  `;
  const duplicatePurchases = await prisma.$queryRaw<Array<{ number: string; count: bigint }>>`
    SELECT number, COUNT(*)::bigint AS count FROM "PurchaseInvoice" WHERE "companyId" = ${companyId} GROUP BY number HAVING COUNT(*) > 1
  `;
  if (duplicateSales.length > 0) issues.push(`Nomor faktur penjualan duplikat: ${duplicateSales.map((row) => row.number).join(", ")}.`);
  if (duplicatePurchases.length > 0) issues.push(`Nomor faktur pembelian duplikat: ${duplicatePurchases.map((row) => row.number).join(", ")}.`);

  const statusCounts = await prisma.salesInvoice.groupBy({
    by: ["status"],
    where: { companyId },
    _count: { _all: true },
  });
  const byStatus = new Map(statusCounts.map((row) => [row.status, row._count._all]));
  if (!byStatus.get("UNPAID")) issues.push("Seed tidak memiliki faktur UNPAID.");
  if (!byStatus.get("PARTIAL")) issues.push("Seed tidak memiliki faktur PARTIAL.");
  if (!byStatus.get("DRAFT")) issues.push("Seed tidak memiliki faktur DRAFT.");
  const overdue = invoices.filter(
    (invoice) =>
      (invoice.status === "UNPAID" || invoice.status === "PARTIAL") &&
      invoice.dueDate.getTime() < dateFromISO("2026-11-15").getTime(),
  );
  if (overdue.length === 0) issues.push("Seed tidak memiliki faktur lewat jatuh tempo.");

  const runs = await prisma.depreciationRun.count({ where: { companyId } });
  if (runs !== 10) issues.push(`Jumlah penyusutan seharusnya 10, ditemukan ${runs}.`);

  const closed = await prisma.fiscalPeriod.count({ where: { companyId, status: "CLOSED" } });
  if (closed < 3) issues.push(`Periode tertutup minimal 3, ditemukan ${closed}.`);

  if (issues.length > 0) {
    throw new Error(`Verifikasi buku besar gagal:\n- ${issues.join("\n- ")}`);
  }
}
