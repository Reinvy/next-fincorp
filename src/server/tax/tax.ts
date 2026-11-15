import { prisma, withFinancialTx, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D, roundRp } from "@/lib/money";
import { formatMonthID, lastDayOfMonth, monthBounds, parseMonthKey, todayDate } from "@/lib/dates";
import type { Actor, TaxInvoiceStatus, TaxType } from "@/lib/types";
import { postJournal } from "@/server/accounting/posting";
import { getAccountByCode } from "@/server/accounting/accounts";

export const TAX_ACCOUNT: Record<Exclude<TaxType, "PPN">, string> = {
  PPH21: "2130",
  PPH22: "2145",
  PPH23: "2140",
  PPH4_2: "2150",
  PPH25: "2160",
  PPH29: "2160",
};

type ReadClient = Pick<Tx, "glAccount" | "journalLine">;

export interface VatSummary {
  output: number;
  input: number;
  net: number;
}

export interface TaxPaymentView {
  id: string;
  type: TaxType;
  period: string;
  date: string;
  amount: number;
  billingId: string | null;
  ntpN: string | null;
  bankName: string | null;
  journalNumber: string | null;
  settlementJournalNumber: string | null;
}

export interface PphWithheldRow {
  type: Exclude<TaxType, "PPN">;
  withheld: number;
  accountCode: string;
  accountName: string;
  liabilityBalance: number;
  paid: number;
}

export interface TaxSummary {
  period: string;
  vat: VatSummary;
  vatSettled: TaxPaymentView | null;
  pphWithheld: PphWithheldRow[];
  efaktur: Record<TaxInvoiceStatus, number>;
  payments: TaxPaymentView[];
}

async function vatFromLedger(client: ReadClient, companyId: string, period: string): Promise<VatSummary> {
  const { start, end } = monthBounds(period);
  const accounts = await client.glAccount.findMany({
    where: { companyId, systemRole: { in: ["VAT_OUTPUT", "VAT_INPUT"] } },
    select: { id: true, systemRole: true },
  });
  if (accounts.length === 0) return { output: 0, input: 0, net: 0 };
  const lines = await client.journalLine.findMany({
    where: {
      accountId: { in: accounts.map((account) => account.id) },
      journalEntry: {
        companyId,
        status: "POSTED",
        date: { gte: start, lte: end },
        NOT: { sourceType: "TAX_PAYMENT" },
      },
    },
    select: { accountId: true, debit: true, credit: true },
  });
  const roleById = new Map(accounts.map((account) => [account.id, account.systemRole]));
  let output = D(0);
  let input = D(0);
  for (const line of lines) {
    const role = roleById.get(line.accountId);
    if (role === "VAT_OUTPUT") output = output.plus(D(line.credit)).minus(D(line.debit));
    if (role === "VAT_INPUT") input = input.plus(D(line.debit)).minus(D(line.credit));
  }
  return { output: output.toNumber(), input: input.toNumber(), net: output.minus(input).toNumber() };
}

async function paymentViews(companyId: string, where: { period?: string; type?: TaxType }): Promise<TaxPaymentView[]> {
  const payments = await prisma.taxPayment.findMany({
    where: { companyId, ...(where.period ? { period: where.period } : {}), ...(where.type ? { type: where.type } : {}) },
    orderBy: [{ date: "desc" }],
  });
  const bankIds = payments.map((payment) => payment.bankAccountId).filter((id): id is string => Boolean(id));
  const journalIds = Array.from(
    new Set(
      payments.flatMap((payment) =>
        [payment.journalEntryId, payment.settlementJournalId].filter((id): id is string => Boolean(id)),
      ),
    ),
  );
  const [banks, journals] = await Promise.all([
    prisma.bankAccount.findMany({ where: { id: { in: bankIds } }, select: { id: true, name: true } }),
    prisma.journalEntry.findMany({ where: { id: { in: journalIds } }, select: { id: true, number: true } }),
  ]);
  const bankName = new Map(banks.map((bank) => [bank.id, bank.name]));
  const journalNumber = new Map(journals.map((journal) => [journal.id, journal.number]));
  return payments.map((payment) => ({
    id: payment.id,
    type: payment.type,
    period: payment.period,
    date: payment.date.toISOString().slice(0, 10),
    amount: D(payment.amount).toNumber(),
    billingId: payment.billingId,
    ntpN: payment.ntpN,
    bankName: payment.bankAccountId ? (bankName.get(payment.bankAccountId) ?? null) : null,
    journalNumber: journalNumber.get(payment.journalEntryId) ?? null,
    settlementJournalNumber: payment.settlementJournalId
      ? (journalNumber.get(payment.settlementJournalId) ?? null)
      : null,
  }));
}

export async function getTaxSummary(actor: Actor, period: string): Promise<TaxSummary> {
  parseMonthKey(period);
  const { start, end } = monthBounds(period);
  const vat = await vatFromLedger({ glAccount: prisma.glAccount, journalLine: prisma.journalLine }, actor.companyId, period);
  const payments = await paymentViews(actor.companyId, { period });
  const vatSettled = payments.find((payment) => payment.type === "PPN") ?? null;

  const pphPayments = await prisma.purchasePayment.findMany({
    where: {
      companyId: actor.companyId,
      voidedAt: null,
      date: { gte: start, lte: end },
      invoice: { withholdingType: { not: "NONE" } },
    },
    include: { invoice: { select: { withholdingType: true } } },
  });
  const withheldByType = new Map<string, ReturnType<typeof D>>();
  for (const payment of pphPayments) {
    const type = payment.invoice.withholdingType;
    withheldByType.set(type, (withheldByType.get(type) ?? D(0)).plus(D(payment.withheldAmount)));
  }

  const accounts = await prisma.glAccount.findMany({
    where: {
      companyId: actor.companyId,
      code: { in: Object.values(TAX_ACCOUNT) },
      children: { none: {} },
    },
    select: { id: true, code: true, name: true },
  });
  const liability = new Map<string, number>();
  for (const account of accounts) {
    const aggregate = await prisma.journalLine.aggregate({
      where: { accountId: account.id, journalEntry: { companyId: actor.companyId, status: "POSTED" } },
      _sum: { debit: true, credit: true },
    });
    liability.set(account.code, D(aggregate._sum.credit ?? 0).minus(D(aggregate._sum.debit ?? 0)).toNumber());
  }
  const paidByType = new Map<string, number>();
  for (const payment of payments) {
    paidByType.set(payment.type, (paidByType.get(payment.type) ?? 0) + payment.amount);
  }

  const pphWithheld: PphWithheldRow[] = (["PPH21", "PPH22", "PPH23", "PPH4_2"] as const).map((type) => {
    const code = TAX_ACCOUNT[type];
    const account = accounts.find((entry) => entry.code === code);
    return {
      type,
      withheld: (withheldByType.get(type) ?? D(0)).toNumber(),
      accountCode: code,
      accountName: account?.name ?? "—",
      liabilityBalance: liability.get(code) ?? 0,
      paid: paidByType.get(type) ?? 0,
    };
  });

  const efakturRows = await prisma.salesInvoice.groupBy({
    by: ["taxInvoiceStatus"],
    where: { companyId: actor.companyId, date: { gte: start, lte: end }, status: { notIn: ["VOID"] } },
    _count: { _all: true },
  });
  const efaktur: Record<TaxInvoiceStatus, number> = {
    NONE: 0,
    DRAFT: 0,
    SUBMITTED: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };
  for (const row of efakturRows) efaktur[row.taxInvoiceStatus] = row._count._all;

  return { period, vat, vatSettled, pphWithheld, efaktur, payments };
}

export interface SettlePpnInput {
  period: string;
  bankAccountId?: string | null;
  paymentDate?: Date | null;
}

export async function settlePpn(
  actor: Actor,
  input: SettlePpnInput,
): Promise<{ settlementJournal: string; paymentJournal: string | null; net: number }> {
  const { year, month } = parseMonthKey(input.period);
  const periodEnd = lastDayOfMonth(year, month);

  return withFinancialTx(async (tx) => {
    const existing = await tx.taxPayment.findUnique({
      where: { companyId_type_period: { companyId: actor.companyId, type: "PPN", period: input.period } },
      select: { id: true },
    });
    if (existing) throw new DomainError("DUPLICATE", "PPN periode ini sudah diselesaikan.");

    const vat = await vatFromLedger(tx, actor.companyId, input.period);
    if (vat.output === 0 && vat.input === 0) {
      throw new DomainError("INVALID_INPUT", `Tidak ada mutasi PPN pada periode ${formatMonthID(input.period)}.`);
    }
    const net = roundRp(vat.net).toNumber();
    const vatOutput = await getAccountByCode(tx, actor.companyId, "2120");
    const vatInput = await getAccountByCode(tx, actor.companyId, "1140");
    const vatPayable = await getAccountByCode(tx, actor.companyId, "2170");
    const vatReceivable = await getAccountByCode(tx, actor.companyId, "1170");

    const settlementLines = [
      { accountId: vatOutput.id, debit: D(vat.output).toFixed(2), credit: "0" },
      { accountId: vatInput.id, debit: "0", credit: D(vat.input).toFixed(2) },
    ];
    if (net > 0) settlementLines.push({ accountId: vatPayable.id, debit: "0", credit: net.toFixed(2) });
    if (net < 0) settlementLines.push({ accountId: vatReceivable.id, debit: Math.abs(net).toFixed(2), credit: "0" });

    const settlement = await postJournal(tx, actor, {
      date: periodEnd,
      description: `Kompensasi PPN ${formatMonthID(input.period)}`,
      type: "TAX",
      sourceType: "TAX_PAYMENT",
      lines: settlementLines,
    });

    let paymentJournalId: string | null = null;
    let paymentJournalNumber: string | null = null;
    let paymentDate = periodEnd;
    let bankId: string | null = null;
    if (net > 0) {
      if (!input.bankAccountId) throw new DomainError("INVALID_INPUT", "Pilih rekening pembayar PPN.");
      const bank = await tx.bankAccount.findFirst({
        where: { id: input.bankAccountId, companyId: actor.companyId },
        include: { coaAccount: { select: { id: true, isActive: true } } },
      });
      if (!bank) throw new DomainError("INVALID_INPUT", "Rekening tidak ditemukan.");
      if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening tidak aktif.");
      paymentDate = input.paymentDate ?? todayDate();
      const payment = await postJournal(tx, actor, {
        date: paymentDate,
        description: `Pembayaran PPN ${formatMonthID(input.period)}`,
        type: "TAX",
        sourceType: "TAX_PAYMENT",
        lines: [
          { accountId: vatPayable.id, debit: net.toFixed(2), credit: "0" },
          { accountId: bank.coaAccountId, debit: "0", credit: net.toFixed(2) },
        ],
      });
      paymentJournalId = payment.id;
      paymentJournalNumber = payment.number;
      bankId = bank.id;
    }

    await tx.taxPayment.create({
      data: {
        companyId: actor.companyId,
        type: "PPN",
        period: input.period,
        date: paymentDate,
        amount: net > 0 ? net.toFixed(2) : "0",
        bankAccountId: bankId,
        journalEntryId: paymentJournalId ?? settlement.id,
        settlementJournalId: settlement.id,
        createdById: actor.userId,
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "SETTLE_PPN",
      entityType: "TaxPayment",
      entityId: input.period,
      summary: `PPN ${formatMonthID(input.period)}: output ${vat.output}, input ${vat.input}, net ${net}`,
      metadata: { settlement: settlement.number, payment: paymentJournalNumber },
    });

    return { settlementJournal: settlement.number, paymentJournal: paymentJournalNumber, net };
  });
}

export interface PayWithholdingInput {
  type: Exclude<TaxType, "PPN">;
  period: string;
  amount: string;
  bankAccountId: string;
  paymentDate?: Date | null;
  billingId?: string | null;
  ntpN?: string | null;
}

export async function payWithholdingTax(
  actor: Actor,
  input: PayWithholdingInput,
): Promise<{ number: string; amount: number }> {
  const amount = D(input.amount);
  if (!amount.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Nominal pembayaran pajak harus lebih dari nol.");
  if (!amount.equals(amount.toDecimalPlaces(0))) throw new DomainError("INVALID_INPUT", "Nominal pajak harus rupiah bulat.");
  parseMonthKey(input.period);

  return withFinancialTx(async (tx) => {
    const existing = await tx.taxPayment.findUnique({
      where: { companyId_type_period: { companyId: actor.companyId, type: input.type, period: input.period } },
      select: { id: true },
    });
    if (existing) throw new DomainError("DUPLICATE", "Pembayaran pajak untuk periode ini sudah dicatat.");

    const taxAccount = await getAccountByCode(tx, actor.companyId, TAX_ACCOUNT[input.type]);
    const aggregate = await tx.journalLine.aggregate({
      where: { accountId: taxAccount.id, journalEntry: { companyId: actor.companyId, status: "POSTED" } },
      _sum: { debit: true, credit: true },
    });
    const liability = D(aggregate._sum.credit ?? 0).minus(D(aggregate._sum.debit ?? 0));
    if (liability.lessThan(amount)) {
      throw new DomainError(
        "INVALID_INPUT",
        `Belum ada kewajiban ${taxAccount.name} sebesar itu (saldo ${liability.toFixed(0)}). Catat liabilitas lewat jurnal manual terlebih dahulu.`,
      );
    }

    const bank = await tx.bankAccount.findFirst({
      where: { id: input.bankAccountId, companyId: actor.companyId },
      include: { coaAccount: { select: { id: true, isActive: true } } },
    });
    if (!bank) throw new DomainError("INVALID_INPUT", "Rekening tidak ditemukan.");
    if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening tidak aktif.");

    const paymentDate = input.paymentDate ?? todayDate();
    const journal = await postJournal(tx, actor, {
      date: paymentDate,
      description: `Pembayaran ${taxAccount.name} periode ${formatMonthID(input.period)}`,
      type: "TAX",
      sourceType: "TAX_PAYMENT",
      lines: [
        { accountId: taxAccount.id, debit: amount.toFixed(2), credit: "0" },
        { accountId: bank.coaAccountId, debit: "0", credit: amount.toFixed(2) },
      ],
    });

    await tx.taxPayment.create({
      data: {
        companyId: actor.companyId,
        type: input.type,
        period: input.period,
        date: paymentDate,
        amount: amount.toFixed(2),
        billingId: input.billingId?.trim() || null,
        ntpN: input.ntpN?.trim() || null,
        bankAccountId: bank.id,
        journalEntryId: journal.id,
        settlementJournalId: null,
        createdById: actor.userId,
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "PAY_TAX",
      entityType: "TaxPayment",
      entityId: input.period,
      summary: `Membayar ${taxAccount.name} ${formatMonthID(input.period)} sebesar ${amount.toFixed(0)}`,
      metadata: { journal: journal.number, type: input.type },
    });

    return { number: journal.number, amount: amount.toNumber() };
  });
}

export async function listTaxPayments(actor: Actor): Promise<TaxPaymentView[]> {
  return paymentViews(actor.companyId, {});
}

export function previousPeriod(period: string): string {
  const { year, month } = parseMonthKey(period);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return `${previous.year}-${String(previous.month).padStart(2, "0")}`;
}
