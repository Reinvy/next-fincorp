import { prisma } from "@/lib/prisma";
import { D, safeDiv } from "@/lib/money";
import {
  addDays,
  addMonths,
  dateFromISO,
  fiscalYearBounds,
  formatMonthShortID,
  monthBounds,
  monthKey,
  todayISO,
} from "@/lib/dates";
import { getAgingReport } from "@/server/accounting/aging";
import { getBalanceSheet, getCompanyLetterhead } from "@/server/accounting/reports";
import { getTaxSummary } from "@/server/tax/tax";
import { getDeadlines } from "@/server/accounting/deadlines";
import { listJournals } from "@/server/accounting/journals";
import { listBankAccounts } from "@/server/cash/accounts";
import type { Actor } from "@/lib/types";

export interface KpiValue {
  current: number;
  previous: number;
  delta: number | null;
}

export interface DashboardData {
  today: Date;
  cash: KpiValue;
  receivable: KpiValue;
  payable: KpiValue;
  revenueMtd: KpiValue;
  expenseMtd: KpiValue;
  netMtd: KpiValue;
  netYtd: number;
  revenueYtd: number;
  expenseYtd: number;
  ppnNet: number;
  currentRatio: number;
  debtEquityRatio: number;
  netMargin: number;
  cashAccounts: Array<{ id: string; name: string; balance: number; cardTheme: string; type: string }>;
  chart: Array<{ label: string; revenue: number; expense: number }>;
  cashChart: Array<{ label: string; inflow: number; outflow: number }>;
  recentJournals: Awaited<ReturnType<typeof listJournals>>["rows"];
  overdueInvoices: Array<{
    id: string;
    kind: "AR" | "AP";
    number: string;
    party: string;
    dueDate: string;
    outstanding: number;
    daysOverdue: number;
    href: string;
  }>;
  deadlines: Awaited<ReturnType<typeof getDeadlines>>;
  company: NonNullable<Awaited<ReturnType<typeof getCompanyLetterhead>>>;
}

function deltaOf(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

async function pnlRange(actor: Actor, from: Date, to: Date) {
  const accounts = await prisma.glAccount.findMany({
    where: {
      companyId: actor.companyId,
      children: { none: {} },
      reportGroup: {
        in: [
          "REVENUE",
          "CONTRA_REVENUE",
          "COST_OF_GOODS_SOLD",
          "CONTRA_COGS",
          "OPERATING_EXPENSE",
          "OTHER_INCOME",
          "OTHER_EXPENSE",
          "TAX_EXPENSE",
        ],
      },
    },
    select: { id: true, reportGroup: true },
  });
  const rows = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      accountId: { in: accounts.map((account) => account.id) },
      journalEntry: { companyId: actor.companyId, status: "POSTED", date: { gte: from, lte: to } },
    },
    _sum: { debit: true, credit: true },
  });
  const groupById = new Map(accounts.map((account) => [account.id, account.reportGroup]));
  const raw = new Map<string, ReturnType<typeof D>>();
  for (const row of rows) {
    const group = groupById.get(row.accountId);
    if (!group) continue;
    raw.set(group, (raw.get(group) ?? D(0)).plus(D(row._sum.debit ?? 0)).minus(D(row._sum.credit ?? 0)));
  }
  const revenue = (raw.get("REVENUE") ?? D(0))
    .plus(raw.get("OTHER_INCOME") ?? D(0))
    .plus(raw.get("CONTRA_REVENUE") ?? D(0))
    .negated();
  const expense = (raw.get("COST_OF_GOODS_SOLD") ?? D(0))
    .plus(raw.get("CONTRA_COGS") ?? D(0))
    .plus(raw.get("OPERATING_EXPENSE") ?? D(0))
    .plus(raw.get("OTHER_EXPENSE") ?? D(0))
    .plus(raw.get("TAX_EXPENSE") ?? D(0));
  return { revenue: revenue.toNumber(), expense: expense.toNumber(), net: revenue.minus(expense).toNumber() };
}

async function cashAt(actor: Actor, date: Date): Promise<number> {
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId, systemRole: { in: ["CASH", "BANK"] } },
    select: { id: true },
  });
  if (accounts.length === 0) return 0;
  const aggregate = await prisma.journalLine.aggregate({
    where: {
      accountId: { in: accounts.map((account) => account.id) },
      journalEntry: { companyId: actor.companyId, status: "POSTED", date: { lte: date } },
    },
    _sum: { debit: true, credit: true },
  });
  return D(aggregate._sum.debit ?? 0).minus(D(aggregate._sum.credit ?? 0)).toNumber();
}

async function cashFlowByMonth(actor: Actor, start: Date, end: Date) {
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId, systemRole: { in: ["CASH", "BANK"] } },
    select: { id: true },
  });
  if (accounts.length === 0) return [];
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: accounts.map((account) => account.id) },
      journalEntry: { companyId: actor.companyId, status: "POSTED", date: { gte: start, lte: end } },
    },
    include: { journalEntry: { select: { date: true } } },
  });
  const byMonth = new Map<string, { inflow: number; outflow: number }>();
  for (const line of lines) {
    const key = monthKey(line.journalEntry.date);
    const entry = byMonth.get(key) ?? { inflow: 0, outflow: 0 };
    entry.inflow += D(line.debit).toNumber();
    entry.outflow += D(line.credit).toNumber();
    byMonth.set(key, entry);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => ({ key, ...value }));
}

export async function getDashboard(actor: Actor): Promise<DashboardData> {
  const today = dateFromISO(todayISO());
  const currentMonth = monthBounds(monthKey(today));
  const previousMonthBounds = monthBounds(monthKey(addMonths(currentMonth.start, -1)));
  const startOfMonth = currentMonth.start;

  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: { fiscalYearStartMonth: true, fiscalYearStartDay: true },
  });
  const fiscal = fiscalYearBounds(today, company?.fiscalYearStartMonth ?? 1, company?.fiscalYearStartDay ?? 1);

  const [
    cash,
    cashPrevious,
    aging,
    currentPnl,
    previousPnl,
    ytdPnl,
    balanceSheet,
    tax,
    journals,
    bankAccounts,
    deadlines,
    previousAging,
    previousPayable,
    letterhead,
  ] = await Promise.all([
    cashAt(actor, today),
    cashAt(actor, addMonths(today, -1)),
    getAgingReport(actor, { type: "AR", asOf: today }),
    pnlRange(actor, currentMonth.start, today),
    pnlRange(actor, previousMonthBounds.start, previousMonthBounds.end),
    pnlRange(actor, fiscal.start, today),
    getBalanceSheet(actor, today),
    getTaxSummary(actor, monthKey(today)),
    listJournals(actor, { page: 1 }),
    listBankAccounts(actor),
    getDeadlines(actor, monthKey(today)),
    getAgingReport(actor, { type: "AR", asOf: addDays(startOfMonth, -1) }),
    getAgingReport(actor, { type: "AP", asOf: addDays(startOfMonth, -1) }),
    getCompanyLetterhead(actor),
  ]);

  const payable = await getAgingReport(actor, { type: "AP", asOf: today });

  // Chart data for six months ending today.
  const months: Array<{ key: string; start: Date; end: Date }> = [];
  for (let index = 5; index >= 0; index -= 1) {
    const cursor = monthBounds(monthKey(addMonths(today, -index)));
    months.push({ key: monthKey(cursor.start), start: cursor.start, end: cursor.end });
  }
  const chart = [];
  for (const month of months) {
    const pnl = await pnlRange(actor, month.start, month.end);
    chart.push({ label: formatMonthShortID(month.key), revenue: pnl.revenue, expense: pnl.expense });
  }
  const cashFlow = await cashFlowByMonth(actor, months[0].start, months[months.length - 1].end);
  const cashChart = months.map((month) => {
    const row = cashFlow.find((entry) => entry.key === month.key);
    return { label: formatMonthShortID(month.key), inflow: row?.inflow ?? 0, outflow: row?.outflow ?? 0 };
  });

  const overdueRows: DashboardData["overdueInvoices"] = [];
  const [salesOverdue, purchaseOverdue] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { lt: today } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] }, dueDate: { lt: today } },
      include: { vendor: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);
  const MS_PER_DAY = 86_400_000;
  for (const invoice of salesOverdue) {
    overdueRows.push({
      id: invoice.id,
      kind: "AR",
      number: invoice.number,
      party: invoice.customer.name,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      outstanding: D(invoice.grandTotal).minus(D(invoice.paidAmount)).minus(D(invoice.creditedAmount)).toNumber(),
      daysOverdue: Math.round((today.getTime() - invoice.dueDate.getTime()) / MS_PER_DAY),
      href: `/sales/${invoice.id}`,
    });
  }
  for (const invoice of purchaseOverdue) {
    overdueRows.push({
      id: invoice.id,
      kind: "AP",
      number: invoice.number,
      party: invoice.vendor.name,
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      outstanding: D(invoice.grandTotal).minus(D(invoice.paidAmount)).minus(D(invoice.creditedAmount)).toNumber(),
      daysOverdue: Math.round((today.getTime() - invoice.dueDate.getTime()) / MS_PER_DAY),
      href: `/purchases/${invoice.id}`,
    });
  }
  overdueRows.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const currentAssets = balanceSheet.assetSections
    .filter((section) => section.key === "current-asset")
    .reduce((acc, section) => acc + section.total, 0);
  const currentLiabilities = balanceSheet.liabilitySections
    .filter((section) => section.key === "current-liability")
    .reduce((acc, section) => acc + section.total, 0);

  if (!company) throw new Error("Perusahaan tidak ditemukan.");

  return {
    today,
    cash: { current: cash, previous: cashPrevious, delta: deltaOf(cash, cashPrevious) },
    receivable: { current: aging.totals.total, previous: previousAging.totals.total, delta: deltaOf(aging.totals.total, previousAging.totals.total) },
    payable: { current: payable.totals.total, previous: previousPayable.totals.total, delta: deltaOf(payable.totals.total, previousPayable.totals.total) },
    revenueMtd: { current: currentPnl.revenue, previous: previousPnl.revenue, delta: deltaOf(currentPnl.revenue, previousPnl.revenue) },
    expenseMtd: { current: currentPnl.expense, previous: previousPnl.expense, delta: deltaOf(currentPnl.expense, previousPnl.expense) },
    netMtd: { current: currentPnl.net, previous: previousPnl.net, delta: deltaOf(currentPnl.net, previousPnl.net) },
    netYtd: ytdPnl.net,
    revenueYtd: ytdPnl.revenue,
    expenseYtd: ytdPnl.expense,
    ppnNet: tax.vat.net,
    currentRatio: safeDiv(currentAssets, currentLiabilities).toNumber(),
    debtEquityRatio: safeDiv(balanceSheet.totalLiabilities, balanceSheet.totalEquity).toNumber(),
    netMargin: ytdPnl.revenue === 0 ? 0 : (ytdPnl.net / ytdPnl.revenue) * 100,
    cashAccounts: bankAccounts
      .filter((account) => account.isActive)
      .map((account) => ({
        id: account.id,
        name: account.name,
        balance: account.balance,
        cardTheme: account.cardTheme,
        type: account.type,
      })),
    chart,
    cashChart,
    recentJournals: journals.rows.slice(0, 6),
    overdueInvoices: overdueRows.slice(0, 6),
    deadlines: deadlines.filter((deadline) => deadline.status !== "done").slice(0, 6),
    company: letterhead!,
  };
}
