import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { addDays, daysBetween, fiscalYearBounds, formatDateID } from "@/lib/dates";
import type { Actor, ReportGroup } from "@/lib/types";

type Decimal = ReturnType<typeof D>;

interface BalanceAccount {
  id: string;
  code: string;
  name: string;
  reportGroup: ReportGroup;
  normalBalance: "DEBIT" | "CREDIT";
}

async function leafAccounts(actor: Actor): Promise<BalanceAccount[]> {
  return prisma.glAccount.findMany({
    where: { companyId: actor.companyId, children: { none: {} } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, reportGroup: true, normalBalance: true },
  });
}

async function rawBalances(
  actor: Actor,
  range: { from?: Date; to: Date },
): Promise<Map<string, Decimal>> {
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
  return new Map(rows.map((row) => [row.accountId, D(row._sum.debit ?? 0).minus(D(row._sum.credit ?? 0))]));
}

async function companyFiscal(actor: Actor) {
  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: { fiscalYearStartMonth: true, fiscalYearStartDay: true },
  });
  return {
    startMonth: company?.fiscalYearStartMonth ?? 1,
    startDay: company?.fiscalYearStartDay ?? 1,
  };
}

function pnlRaw(groups: Map<ReportGroup, Decimal>): Decimal {
  return [
    "REVENUE",
    "CONTRA_REVENUE",
    "COST_OF_GOODS_SOLD",
    "CONTRA_COGS",
    "OPERATING_EXPENSE",
    "OTHER_INCOME",
    "OTHER_EXPENSE",
    "TAX_EXPENSE",
  ]
    .reduce((acc, group) => acc.plus(groups.get(group as ReportGroup) ?? D(0)), D(0));
}

export interface StatementLine {
  code: string;
  label: string;
  amount: number;
}

export interface StatementSection {
  key: string;
  label: string;
  lines: StatementLine[];
  total: number;
}

export interface BalanceSheet {
  asOf: Date;
  assetSections: StatementSection[];
  totalAssets: number;
  liabilitySections: StatementSection[];
  totalLiabilities: number;
  equitySections: StatementSection[];
  priorEarnings: number;
  currentEarnings: number;
  totalEquity: number;
  balanced: boolean;
}

export async function getBalanceSheet(actor: Actor, asOf: Date): Promise<BalanceSheet> {
  const accounts = await leafAccounts(actor);
  const balances = await rawBalances(actor, { to: asOf });
  const groups = new Map<ReportGroup, Decimal>();
  for (const account of accounts) {
    const raw = balances.get(account.id) ?? D(0);
    groups.set(account.reportGroup, (groups.get(account.reportGroup) ?? D(0)).plus(raw));
  }

  const linesFor = (group: ReportGroup, sign: 1 | -1): StatementLine[] =>
    accounts
      .filter((account) => account.reportGroup === group)
      .map((account) => ({
        code: account.code,
        label: account.name,
        amount: sign * (balances.get(account.id) ?? D(0)).toNumber(),
      }))
      .filter((line) => line.amount !== 0);

  const section = (key: string, label: string, group: ReportGroup, sign: 1 | -1): StatementSection => {
    const lines = linesFor(group, sign);
    return {
      key,
      label,
      lines,
      total: lines.reduce((acc, line) => acc + line.amount, 0),
    };
  };

  const assetSections = [
    section("current-asset", "Aset Lancar", "CURRENT_ASSET", 1),
    section("fixed-asset", "Aset Tetap", "FIXED_ASSET", 1),
    section("accumulated-depreciation", "Akumulasi Penyusutan", "ACCUMULATED_DEPRECIATION", 1),
    section("other-asset", "Aset Lainnya", "OTHER_ASSET", 1),
  ].filter((entry) => entry.lines.length > 0);
  const totalAssets = assetSections.reduce((acc, entry) => acc + entry.total, 0);

  const liabilitySections = [
    section("current-liability", "Liabilitas Jangka Pendek", "CURRENT_LIABILITY", -1),
    section("long-term-liability", "Liabilitas Jangka Panjang", "LONG_TERM_LIABILITY", -1),
  ].filter((entry) => entry.lines.length > 0);
  const totalLiabilities = liabilitySections.reduce((acc, entry) => acc + entry.total, 0);

  const equityAccounts = accounts.filter((account) => account.reportGroup === "EQUITY");
  const equityLines: StatementLine[] = equityAccounts.map((account) => ({
    code: account.code,
    label: account.name,
    amount: -(balances.get(account.id) ?? D(0)).toNumber(),
  }));

  const fiscal = fiscalYearBounds(asOf, (await companyFiscal(actor)).startMonth, (await companyFiscal(actor)).startDay);
  const [priorBalances, currentBalances] = await Promise.all([
    rawBalances(actor, { to: addDays(fiscal.start, -1) }),
    rawBalances(actor, { from: fiscal.start, to: asOf }),
  ]);
  const priorGroups = new Map<ReportGroup, Decimal>();
  const currentGroups = new Map<ReportGroup, Decimal>();
  for (const account of accounts) {
    priorGroups.set(account.reportGroup, (priorGroups.get(account.reportGroup) ?? D(0)).plus(priorBalances.get(account.id) ?? D(0)));
    currentGroups.set(
      account.reportGroup,
      (currentGroups.get(account.reportGroup) ?? D(0)).plus(currentBalances.get(account.id) ?? D(0)),
    );
  }
  const priorEarnings = pnlRaw(priorGroups).negated().toNumber();
  const currentEarnings = pnlRaw(currentGroups).negated().toNumber();
  const totalEquity =
    equityLines.reduce((acc, line) => acc + line.amount, 0) + priorEarnings + currentEarnings;
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.5;
  if (!balanced) {
    console.error(`[balance-sheet] tidak seimbang untuk ${actor.companyId}: aset ${totalAssets}, kanan ${totalLiabilities + totalEquity}`);
  }

  return {
    asOf,
    assetSections,
    totalAssets,
    liabilitySections,
    totalLiabilities,
    equitySections: [
      { key: "equity", label: "Modal", lines: equityLines, total: equityLines.reduce((acc, line) => acc + line.amount, 0) },
      {
        key: "earnings",
        label: "Laba",
        lines: [
          { code: "", label: "Laba ditahan sebelum tahun berjalan", amount: priorEarnings },
          { code: "", label: "Laba tahun berjalan", amount: currentEarnings },
        ],
        total: priorEarnings + currentEarnings,
      },
    ],
    priorEarnings,
    currentEarnings,
    totalEquity,
    balanced,
  };
}

export interface IncomeLine extends StatementLine {
  previous: number;
  variance: number | null;
}

export interface IncomeSection {
  key: string;
  label: string;
  lines: IncomeLine[];
  total: number;
  previousTotal: number;
  variance: number | null;
}

export interface IncomeStatement {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  sections: IncomeSection[];
  revenueTotal: number;
  previousRevenueTotal: number;
  cogsTotal: number;
  previousCogsTotal: number;
  grossProfit: number;
  previousGrossProfit: number;
  operatingExpenseTotal: number;
  previousOperatingExpenseTotal: number;
  operatingProfit: number;
  previousOperatingProfit: number;
  otherIncomeTotal: number;
  previousOtherIncomeTotal: number;
  otherExpenseTotal: number;
  previousOtherExpenseTotal: number;
  profitBeforeTax: number;
  previousProfitBeforeTax: number;
  taxTotal: number;
  previousTaxTotal: number;
  netProfit: number;
  previousNetProfit: number;
}

function variance(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export async function getIncomeStatement(actor: Actor, from: Date, to: Date): Promise<IncomeStatement> {
  const accounts = await leafAccounts(actor);
  const days = Math.max(1, daysBetween(from, to) + 1);
  const previousTo = addDays(from, -1);
  const previousFrom = addDays(previousTo, -(days - 1));
  const [currentRaw, previousRaw] = await Promise.all([
    rawBalances(actor, { from, to }),
    rawBalances(actor, { from: previousFrom, to: previousTo }),
  ]);

  const buildSection = (
    key: string,
    label: string,
    groups: ReportGroup[],
    sign: 1 | -1,
  ): IncomeSection => {
    const lines: IncomeLine[] = accounts
      .filter((account) => groups.includes(account.reportGroup))
      .map((account) => {
        const current = sign * (currentRaw.get(account.id) ?? D(0)).toNumber();
        const previous = sign * (previousRaw.get(account.id) ?? D(0)).toNumber();
        return {
          code: account.code,
          label: account.name,
          amount: current,
          previous,
          variance: variance(current, previous),
        };
      })
      .filter((line) => line.amount !== 0 || line.previous !== 0);
    const total = lines.reduce((acc, line) => acc + line.amount, 0);
    const previousTotal = lines.reduce((acc, line) => acc + line.previous, 0);
    return { key, label, lines, total, previousTotal, variance: variance(total, previousTotal) };
  };

  const revenue = buildSection("revenue", "Pendapatan", ["REVENUE", "CONTRA_REVENUE"], -1);
  const cogs = buildSection("cogs", "Beban Pokok Penjualan", ["COST_OF_GOODS_SOLD", "CONTRA_COGS"], 1);
  const operating = buildSection("operating", "Beban Operasional", ["OPERATING_EXPENSE"], 1);
  const otherIncome = buildSection("other-income", "Pendapatan Lain-lain", ["OTHER_INCOME"], -1);
  const otherExpense = buildSection("other-expense", "Beban Lain-lain", ["OTHER_EXPENSE"], 1);
  const tax = buildSection("tax", "Beban Pajak Penghasilan", ["TAX_EXPENSE"], 1);

  const grossProfit = revenue.total - cogs.total;
  const previousGrossProfit = revenue.previousTotal - cogs.previousTotal;
  const operatingProfit = grossProfit - operating.total;
  const previousOperatingProfit = previousGrossProfit - operating.previousTotal;
  const profitBeforeTax = operatingProfit + otherIncome.total - otherExpense.total;
  const previousProfitBeforeTax = previousOperatingProfit + otherIncome.previousTotal - otherExpense.previousTotal;
  const netProfit = profitBeforeTax - tax.total;
  const previousNetProfit = previousProfitBeforeTax - tax.previousTotal;

  return {
    from,
    to,
    previousFrom,
    previousTo,
    sections: [revenue, cogs, operating, otherIncome, otherExpense, tax],
    revenueTotal: revenue.total,
    previousRevenueTotal: revenue.previousTotal,
    cogsTotal: cogs.total,
    previousCogsTotal: cogs.previousTotal,
    grossProfit,
    previousGrossProfit,
    operatingExpenseTotal: operating.total,
    previousOperatingExpenseTotal: operating.previousTotal,
    operatingProfit,
    previousOperatingProfit,
    otherIncomeTotal: otherIncome.total,
    previousOtherIncomeTotal: otherIncome.previousTotal,
    otherExpenseTotal: otherExpense.total,
    previousOtherExpenseTotal: otherExpense.previousTotal,
    profitBeforeTax,
    previousProfitBeforeTax,
    taxTotal: tax.total,
    previousTaxTotal: tax.previousTotal,
    netProfit,
    previousNetProfit,
  };
}

export interface CashFlowRow {
  date: string;
  number: string;
  description: string;
  amount: number;
  classification: "OPERATING" | "INVESTING" | "FINANCING";
}

export interface CashFlowReport {
  from: Date;
  to: Date;
  opening: number;
  closing: number;
  operating: number;
  investing: number;
  financing: number;
  netChange: number;
  rows: CashFlowRow[];
  reconciled: boolean;
}

export async function getCashFlow(actor: Actor, from: Date, to: Date): Promise<CashFlowReport> {
  const cashAccounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId, systemRole: { in: ["CASH", "BANK"] } },
    select: { id: true },
  });
  const cashIds = cashAccounts.map((account) => account.id);
  if (cashIds.length === 0) {
    return {
      from,
      to,
      opening: 0,
      closing: 0,
      operating: 0,
      investing: 0,
      financing: 0,
      netChange: 0,
      rows: [],
      reconciled: true,
    };
  }

  const [openingAgg, closingAgg, entries] = await Promise.all([
    prisma.journalLine.aggregate({
      where: { accountId: { in: cashIds }, journalEntry: { companyId: actor.companyId, status: "POSTED", date: { lt: from } } },
      _sum: { debit: true, credit: true },
    }),
    prisma.journalLine.aggregate({
      where: { accountId: { in: cashIds }, journalEntry: { companyId: actor.companyId, status: "POSTED", date: { lte: to } } },
      _sum: { debit: true, credit: true },
    }),
    prisma.journalEntry.findMany({
      where: {
        companyId: actor.companyId,
        status: "POSTED",
        date: { gte: from, lte: to },
        lines: { some: { accountId: { in: cashIds } } },
      },
      orderBy: [{ date: "asc" }, { number: "asc" }],
      include: { lines: { include: { account: { select: { reportGroup: true, systemRole: true } } } } },
    }),
  ]);

  const opening = D(openingAgg._sum.debit ?? 0).minus(D(openingAgg._sum.credit ?? 0));
  const closing = D(closingAgg._sum.debit ?? 0).minus(D(closingAgg._sum.credit ?? 0));
  let operating = D(0);
  let investing = D(0);
  let financing = D(0);
  const rows: CashFlowRow[] = [];
  for (const entry of entries) {
    const netCash = entry.lines
      .filter((line) => cashIds.includes(line.accountId))
      .reduce((acc, line) => acc.plus(D(line.debit)).minus(D(line.credit)), D(0));
    if (netCash.isZero()) continue;
    const counterpartGroups = entry.lines
      .filter((line) => !cashIds.includes(line.accountId))
      .map((line) => line.account.reportGroup);
    let classification: CashFlowRow["classification"] = "OPERATING";
    if (counterpartGroups.some((group) => group === "FIXED_ASSET" || group === "ACCUMULATED_DEPRECIATION")) {
      classification = "INVESTING";
    } else if (counterpartGroups.some((group) => group === "EQUITY" || group === "LONG_TERM_LIABILITY")) {
      classification = "FINANCING";
    }
    if (classification === "INVESTING") investing = investing.plus(netCash);
    else if (classification === "FINANCING") financing = financing.plus(netCash);
    else operating = operating.plus(netCash);
    rows.push({
      date: entry.date.toISOString().slice(0, 10),
      number: entry.number,
      description: entry.description,
      amount: netCash.toNumber(),
      classification,
    });
  }
  const netChange = operating.plus(investing).plus(financing);
  const reconciled = netChange.equals(closing.minus(opening));
  if (!reconciled) {
    console.error(
      `[cash-flow] tidak rekonsiliasi ${actor.companyId}: perubahan ${netChange} vs ${closing.minus(opening)}`,
    );
  }

  return {
    from,
    to,
    opening: opening.toNumber(),
    closing: closing.toNumber(),
    operating: operating.toNumber(),
    investing: investing.toNumber(),
    financing: financing.toNumber(),
    netChange: netChange.toNumber(),
    rows,
    reconciled,
  };
}

export interface EquityRow {
  code: string;
  label: string;
  beginning: number;
  movement: number;
  ending: number;
}

export interface EquityStatement {
  from: Date;
  to: Date;
  rows: EquityRow[];
  beginningEquity: number;
  beginningEarnings: number;
  contributions: number;
  netProfit: number;
  endingEquity: number;
  balanceSheetEquity: number;
  balanced: boolean;
}

export async function getEquityStatement(actor: Actor, from: Date, to: Date): Promise<EquityStatement> {
  const accounts = await leafAccounts(actor);
  const equityAccounts = accounts.filter((account) => account.reportGroup === "EQUITY");
  const [before, ending, movement, beforePnl, rangePnl, balanceSheet] = await Promise.all([
    rawBalances(actor, { to: addDays(from, -1) }),
    rawBalances(actor, { to }),
    rawBalances(actor, { from, to }),
    rawBalances(actor, { to: addDays(from, -1) }),
    rawBalances(actor, { from, to }),
    getBalanceSheet(actor, to),
  ]);
  const pnlAccounts = accounts.filter((account) =>
    [
      "REVENUE",
      "CONTRA_REVENUE",
      "COST_OF_GOODS_SOLD",
      "CONTRA_COGS",
      "OPERATING_EXPENSE",
      "OTHER_INCOME",
      "OTHER_EXPENSE",
      "TAX_EXPENSE",
    ].includes(account.reportGroup),
  );
  const pnlBefore = pnlAccounts.reduce((acc, account) => acc.plus(beforePnl.get(account.id) ?? D(0)), D(0));
  const pnlRange = pnlAccounts.reduce((acc, account) => acc.plus(rangePnl.get(account.id) ?? D(0)), D(0));
  const rows: EquityRow[] = equityAccounts.map((account) => ({
    code: account.code,
    label: account.name,
    beginning: -(before.get(account.id) ?? D(0)).toNumber(),
    movement: -(movement.get(account.id) ?? D(0)).toNumber(),
    ending: -(ending.get(account.id) ?? D(0)).toNumber(),
  }));
  const beginningEquity = rows.reduce((acc, row) => acc + row.beginning, 0);
  const contributions = rows.reduce((acc, row) => acc + row.movement, 0);
  const beginningEarnings = pnlBefore.negated().toNumber();
  const netProfit = pnlRange.negated().toNumber();
  const endingEquity = beginningEquity + beginningEarnings + contributions + netProfit;
  const balanced = Math.abs(endingEquity - balanceSheet.totalEquity) < 0.5;

  return {
    from,
    to,
    rows,
    beginningEquity,
    beginningEarnings,
    contributions,
    netProfit,
    endingEquity,
    balanceSheetEquity: balanceSheet.totalEquity,
    balanced,
  };
}

export async function getCompanyLetterhead(actor: Actor) {
  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: {
      name: true,
      address: true,
      city: true,
      province: true,
      postalCode: true,
      npwp: true,
      email: true,
      phone: true,
      logoDataUrl: true,
    },
  });
  return company;
}

export function describeRange(from: Date, to: Date): string {
  return `${formatDateID(from)} – ${formatDateID(to)}`;
}
