import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { addDays, daysBetween, lastDayOfMonth, monthBounds, parseMonthKey, todayDate, taxDueDate } from "@/lib/dates";
import type { Actor, DeadlineCategory } from "@/lib/types";
import type { DeadlineView } from "@/lib/dto";
import { getTaxSummary, previousPeriod, TAX_ACCOUNT } from "@/server/tax/tax";

function statusFor(dueDate: Date, completed: boolean, today: Date): DeadlineView["status"] {
  if (completed) return "done";
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "soon";
  return "upcoming";
}

export async function getDeadlines(actor: Actor, month: string): Promise<DeadlineView[]> {
  const { year, month: monthNumber } = parseMonthKey(month);
  const { start, end } = monthBounds(month);
  const today = todayDate();
  const previous = previousPeriod(month);
  const previousBounds = monthBounds(previous);
  const items: DeadlineView[] = [];

  const [salesInvoices, purchaseInvoices, manual, previousPeriodRecord, tax] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: {
        companyId: actor.companyId,
        status: { in: ["UNPAID", "PARTIAL", "PAID"] },
        dueDate: { gte: start, lte: end },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: {
        companyId: actor.companyId,
        status: { in: ["UNPAID", "PARTIAL", "PAID"] },
        dueDate: { gte: start, lte: end },
      },
      include: { vendor: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.companyDeadline.findMany({
      where: { companyId: actor.companyId, dueDate: { gte: start, lte: end } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.fiscalPeriod.findUnique({
      where: { companyId_year_month: { companyId: actor.companyId, year: previousBounds.start.getUTCFullYear(), month: previousBounds.start.getUTCMonth() + 1 } },
      select: { status: true },
    }),
    getTaxSummary(actor, previous),
  ]);

  for (const invoice of salesInvoices) {
    const outstanding = D(invoice.grandTotal).minus(D(invoice.paidAmount)).minus(D(invoice.creditedAmount));
    const completed = invoice.status === "PAID" || !outstanding.greaterThan(0);
    items.push({
      id: `invoice-sales-${invoice.id}`,
      title: `Piutang ${invoice.number} — ${invoice.customer.name}`,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      category: "INVOICE",
      amount: outstanding.toNumber(),
      notes: null,
      completedAt: completed ? invoice.updatedAt.toISOString() : null,
      derived: true,
      href: `/sales/${invoice.id}`,
      status: statusFor(invoice.dueDate, completed, today),
    });
  }
  for (const invoice of purchaseInvoices) {
    const outstanding = D(invoice.grandTotal).minus(D(invoice.paidAmount)).minus(D(invoice.creditedAmount));
    const completed = invoice.status === "PAID" || !outstanding.greaterThan(0);
    items.push({
      id: `invoice-purchase-${invoice.id}`,
      title: `Utang ${invoice.number} — ${invoice.vendor.name}`,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      category: "PAYMENT",
      amount: outstanding.toNumber(),
      notes: null,
      completedAt: completed ? invoice.updatedAt.toISOString() : null,
      derived: true,
      href: `/purchases/${invoice.id}`,
      status: statusFor(invoice.dueDate, completed, today),
    });
  }
  for (const entry of manual) {
    items.push({
      id: entry.id,
      title: entry.title,
      dueDate: entry.dueDate.toISOString().slice(0, 10),
      category: entry.category,
      amount: entry.amount ? D(entry.amount).toNumber() : null,
      notes: entry.notes,
      completedAt: entry.completedAt?.toISOString() ?? null,
      derived: false,
      status: statusFor(entry.dueDate, entry.completedAt !== null, today),
    });
  }

  const closeDue = new Date(Date.UTC(year, monthNumber - 1, 5));
  items.push({
    id: `period-close-${previous}`,
    title: `Tutup buku ${previous}`,
    dueDate: closeDue.toISOString().slice(0, 10),
    category: "CLOSING" as DeadlineCategory,
    amount: null,
    notes: "Pengingat internal: periksa draf dan tutup periode.",
    completedAt: previousPeriodRecord?.status === "CLOSED" ? closeDue.toISOString() : null,
    derived: true,
    href: "/accounting/closing",
    status: statusFor(closeDue, previousPeriodRecord?.status === "CLOSED", today),
  });

  const vatDue = lastDayOfMonth(year, monthNumber);
  if (tax.vat.output !== 0 || tax.vat.input !== 0 || tax.vatSettled) {
    const completed = Boolean(tax.vatSettled);
    items.push({
      id: `tax-due-PPN-${previous}`,
      title: `Setor PPN ${previous}`,
      dueDate: vatDue.toISOString().slice(0, 10),
      category: "TAX",
      amount: Math.abs(tax.vat.net),
      notes: `Output ${tax.vat.output} · Input ${tax.vat.input}`,
      completedAt: completed ? tax.vatSettled?.date ?? null : null,
      derived: true,
      href: `/tax?period=${previous}`,
      status: statusFor(vatDue, completed, today),
    });
  }

  for (const row of tax.pphWithheld) {
    if (row.withheld === 0 && row.paid === 0 && row.liabilityBalance === 0) continue;
    const due = taxDueDate(row.type, previous);
    const completed = tax.payments.some((payment) => payment.type === row.type);
    items.push({
      id: `tax-due-${row.type}-${previous}`,
      title: `Setor ${row.accountName} ${previous}`,
      dueDate: due.toISOString().slice(0, 10),
      category: "TAX",
      amount: Math.max(0, row.liabilityBalance),
      notes: row.withheld > 0 ? `Dipungut ${row.withheld}` : null,
      completedAt: completed ? (tax.payments.find((payment) => payment.type === row.type)?.date ?? null) : null,
      derived: true,
      href: `/tax?period=${previous}`,
      status: statusFor(due, completed, today),
    });
  }

  const pph25 = tax.pphWithheld.find((row) => row.type === "PPH21");
  void pph25;
  const pph25Account = await prisma.glAccount.findFirst({
    where: { companyId: actor.companyId, code: TAX_ACCOUNT.PPH25, children: { none: {} } },
    select: { id: true, name: true },
  });
  if (pph25Account) {
    const aggregate = await prisma.journalLine.aggregate({
      where: { accountId: pph25Account.id, journalEntry: { companyId: actor.companyId, status: "POSTED" } },
      _sum: { debit: true, credit: true },
    });
    const balance = D(aggregate._sum.credit ?? 0).minus(D(aggregate._sum.debit ?? 0));
    const due = taxDueDate("PPH25", previous);
    const completed = tax.payments.some((payment) => payment.type === "PPH25");
    if (balance.greaterThan(0) || completed) {
      items.push({
        id: `tax-due-PPH25-${previous}`,
        title: `Angsuran PPh 25 ${previous}`,
        dueDate: due.toISOString().slice(0, 10),
        category: "TAX",
        amount: balance.toNumber(),
        notes: null,
        completedAt: completed ? (tax.payments.find((payment) => payment.type === "PPH25")?.date ?? null) : null,
        derived: true,
        href: `/tax?period=${previous}`,
        status: statusFor(due, completed, today),
      });
    }
  }

  return items
    .filter((item) => item.dueDate >= start.toISOString().slice(0, 10) && item.dueDate <= end.toISOString().slice(0, 10))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.title.localeCompare(b.title)));
}

export function upcomingWindow(today: Date = todayDate()): string {
  return today.toISOString().slice(0, 7);
}

export function addDaysHelper(date: Date, days: number): Date {
  return addDays(date, days);
}
