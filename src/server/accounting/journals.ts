import { prisma, withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { D, sum } from "@/lib/money";
import { LEDGER_PAGE_SIZE, PAGE_SIZE } from "@/lib/constants";
import type { Actor, JournalStatus, SourceType } from "@/lib/types";
import type { JournalDetail, JournalListItem } from "@/lib/dto";
import {
  createJournalDraft,
  deleteJournalDraft,
  postJournal,
  postJournalDraft,
  reverseJournal,
  updateJournalDraft,
  type DraftInput,
  type PostJournalInput,
} from "@/server/accounting/posting";

export interface JournalFilters {
  q?: string;
  from?: Date;
  to?: Date;
  status?: JournalStatus;
  page?: number;
}

export async function listJournals(
  actor: Actor,
  filters: JournalFilters = {},
): Promise<{ rows: JournalListItem[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const where = {
    companyId: actor.companyId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { number: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { description: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { reference: { contains: filters.q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.journalEntry.count({ where }),
    prisma.journalEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        date: true,
        description: true,
        reference: true,
        type: true,
        status: true,
        sourceType: true,
        createdAt: true,
        lines: { select: { debit: true } },
      },
    }),
  ]);

  return {
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: rows.map((row) => ({
      id: row.id,
      number: row.number,
      date: row.date.toISOString().slice(0, 10),
      description: row.description,
      reference: row.reference,
      type: row.type,
      status: row.status,
      sourceType: row.sourceType,
      total: sum(row.lines.map((line) => line.debit)).toNumber(),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

async function resolveSource(
  sourceType: SourceType | null,
  sourceId: string | null,
): Promise<{ label: string; href: string } | null> {
  if (!sourceType || !sourceId) return null;
  switch (sourceType) {
    case "SALES_INVOICE": {
      const invoice = await prisma.salesInvoice.findUnique({ where: { id: sourceId }, select: { number: true } });
      return invoice ? { label: `Faktur penjualan ${invoice.number}`, href: `/sales/${sourceId}` } : null;
    }
    case "PURCHASE_INVOICE": {
      const invoice = await prisma.purchaseInvoice.findUnique({ where: { id: sourceId }, select: { number: true } });
      return invoice ? { label: `Faktur pembelian ${invoice.number}`, href: `/purchases/${sourceId}` } : null;
    }
    case "SALES_PAYMENT": {
      const payment = await prisma.salesPayment.findUnique({
        where: { id: sourceId },
        select: { invoiceId: true, invoice: { select: { number: true } } },
      });
      return payment ? { label: `Pembayaran ${payment.invoice.number}`, href: `/sales/${payment.invoiceId}` } : null;
    }
    case "PURCHASE_PAYMENT": {
      const payment = await prisma.purchasePayment.findUnique({
        where: { id: sourceId },
        select: { invoiceId: true, invoice: { select: { number: true } } },
      });
      return payment ? { label: `Pembayaran ${payment.invoice.number}`, href: `/purchases/${payment.invoiceId}` } : null;
    }
    case "SALES_CREDIT_NOTE": {
      const note = await prisma.salesCreditNote.findUnique({
        where: { id: sourceId },
        select: { number: true, invoiceId: true },
      });
      return note ? { label: `Nota kredit ${note.number}`, href: `/sales/${note.invoiceId}` } : null;
    }
    case "PURCHASE_DEBIT_NOTE": {
      const note = await prisma.purchaseDebitNote.findUnique({
        where: { id: sourceId },
        select: { number: true, invoiceId: true },
      });
      return note ? { label: `Nota debit ${note.number}`, href: `/purchases/${note.invoiceId}` } : null;
    }
    case "CASH_TRANSACTION": {
      const transaction = await prisma.cashTransaction.findUnique({
        where: { id: sourceId },
        select: { bankAccountId: true, bankAccount: { select: { name: true } } },
      });
      return transaction
        ? { label: `Kas ${transaction.bankAccount.name}`, href: `/cash-bank/${transaction.bankAccountId}` }
        : null;
    }
    case "BANK_TRANSFER": {
      const transfer = await prisma.bankTransfer.findUnique({
        where: { id: sourceId },
        select: { fromAccountId: true },
      });
      return transfer ? { label: "Transfer bank", href: `/cash-bank/${transfer.fromAccountId}` } : null;
    }
    case "DEPRECIATION_RUN": {
      const run = await prisma.depreciationRun.findUnique({ where: { id: sourceId }, select: { period: true } });
      return run ? { label: `Penyusutan ${run.period}`, href: "/fixed-assets" } : null;
    }
    case "ASSET_ACQUISITION":
    case "ASSET_DISPOSAL": {
      const asset = await prisma.fixedAsset.findUnique({ where: { id: sourceId }, select: { code: true } });
      return asset ? { label: `Aset ${asset.code}`, href: `/fixed-assets/${sourceId}` } : null;
    }
    case "TAX_PAYMENT":
      return { label: "Pembayaran pajak", href: "/tax" };
    case "OPENING_BALANCE":
      return { label: "Saldo awal kas/bank", href: "/cash-bank" };
    default:
      return null;
  }
}

export async function getJournalDetail(actor: Actor, journalId: string): Promise<JournalDetail> {
  const entry = await prisma.journalEntry.findFirst({
    where: { id: journalId, companyId: actor.companyId },
    include: {
      lines: {
        orderBy: { sortOrder: "asc" },
        include: { account: { select: { code: true, name: true } } },
      },
    },
  });
  if (!entry) throw new DomainError("NOT_FOUND", "Jurnal tidak ditemukan.");

  const reversal = await prisma.journalEntry.findFirst({
    where: { reversalOfId: entry.id, companyId: actor.companyId },
    select: { id: true },
  });
  const source = await resolveSource(entry.sourceType, entry.sourceId);
  const debitTotal = sum(entry.lines.map((line) => D(line.debit)));
  const creditTotal = sum(entry.lines.map((line) => D(line.credit)));
  const manual = entry.sourceType === "MANUAL" || entry.sourceType === null;

  return {
    id: entry.id,
    number: entry.number,
    date: entry.date.toISOString().slice(0, 10),
    description: entry.description,
    reference: entry.reference,
    type: entry.type,
    status: entry.status,
    sourceType: entry.sourceType,
    total: debitTotal.toNumber(),
    createdAt: entry.createdAt.toISOString(),
    lines: entry.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      description: line.description,
      debit: D(line.debit).toNumber(),
      credit: D(line.credit).toNumber(),
    })),
    totalDebit: debitTotal.toNumber(),
    totalCredit: creditTotal.toNumber(),
    sourceKind: source?.label ?? null,
    sourceId: source?.href ?? null,
    voided: entry.voidedAt !== null,
    reversalOfId: entry.reversalOfId,
    postedAt: entry.postedAt?.toISOString() ?? null,
    canVoid: manual && entry.status === "POSTED" && !entry.voidedAt && !reversal,
  };
}

export interface ManualJournalInput extends DraftInput {
  reference?: string | null;
}

export async function saveManualJournal(
  actor: Actor,
  input: ManualJournalInput,
  mode: "draft" | "post",
): Promise<{ id: string; number: string }> {
  return withFinancialTx(async (tx) => {
    if (mode === "draft") {
      return createJournalDraft(tx, actor, input);
    }
    const posted = await postJournal(tx, actor, {
      date: input.date,
      description: input.description,
      reference: input.reference,
      type: "MANUAL",
      sourceType: "MANUAL",
      lines: input.lines,
    } satisfies PostJournalInput);
    return { id: posted.id, number: posted.number };
  });
}

export async function saveJournalDraft(actor: Actor, entryId: string, input: ManualJournalInput): Promise<void> {
  await withFinancialTx(async (tx) => {
    await updateJournalDraft(tx, actor, entryId, input);
  });
}

export async function postDraftJournal(actor: Actor, entryId: string): Promise<{ id: string; number: string }> {
  return withFinancialTx(async (tx) => {
    const posted = await postJournalDraft(tx, actor, entryId);
    return { id: posted.id, number: posted.number };
  });
}

export async function deleteDraftJournal(actor: Actor, entryId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    await deleteJournalDraft(tx, actor, entryId);
  });
}

export async function voidManualJournal(actor: Actor, entryId: string): Promise<{ number: string }> {
  return withFinancialTx(async (tx) => {
    const reversal = await reverseJournal(tx, actor, entryId);
    return { number: reversal.number };
  });
}

export interface LedgerFilters {
  accountId: string;
  from: Date;
  to: Date;
  page?: number;
}

export interface LedgerReport {
  account: { id: string; code: string; name: string; normalBalance: "DEBIT" | "CREDIT" };
  opening: number;
  ending: number;
  rows: Array<{
    id: string;
    journalEntryId: string;
    date: string;
    number: string;
    description: string;
    reference: string | null;
    debit: number;
    credit: number;
    balance: number;
  }>;
  page: number;
  totalPages: number;
  total: number;
}

export async function getLedgerReport(actor: Actor, filters: LedgerFilters): Promise<LedgerReport> {
  const account = await prisma.glAccount.findFirst({
    where: { id: filters.accountId, companyId: actor.companyId },
    select: { id: true, code: true, name: true, normalBalance: true },
  });
  if (!account) throw new DomainError("NOT_FOUND", "Akun tidak ditemukan.");

  const openingAgg = await prisma.journalLine.aggregate({
    where: {
      accountId: account.id,
      journalEntry: { companyId: actor.companyId, status: "POSTED", date: { lt: filters.from } },
    },
    _sum: { debit: true, credit: true },
  });
  const openingRaw = D(openingAgg._sum.debit ?? 0).minus(D(openingAgg._sum.credit ?? 0));

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: account.id,
      journalEntry: {
        companyId: actor.companyId,
        status: "POSTED",
        date: { gte: filters.from, lte: filters.to },
      },
    },
    orderBy: [{ journalEntry: { date: "asc" } }, { journalEntry: { number: "asc" } }, { sortOrder: "asc" }],
    include: {
      journalEntry: { select: { number: true, date: true, description: true, reference: true } },
    },
  });

  const sign = account.normalBalance === "DEBIT" ? 1 : -1;
  const page = Math.max(1, filters.page ?? 1);
  const totalPages = Math.max(1, Math.ceil(lines.length / LEDGER_PAGE_SIZE));
  const startIndex = (page - 1) * LEDGER_PAGE_SIZE;
  let running = openingRaw;
  for (let index = 0; index < startIndex; index += 1) {
    const line = lines[index];
    running = running.plus(line.debit).minus(line.credit);
  }
  const pageLines = lines.slice(startIndex, startIndex + LEDGER_PAGE_SIZE);
  const rows: LedgerReport["rows"] = [];
  for (const line of pageLines) {
    running = running.plus(line.debit).minus(line.credit);
    rows.push({
      id: line.id,
      journalEntryId: line.journalEntryId,
      date: line.journalEntry.date.toISOString().slice(0, 10),
      number: line.journalEntry.number,
      description: line.description ?? line.journalEntry.description,
      reference: line.journalEntry.reference,
      debit: D(line.debit).toNumber(),
      credit: D(line.credit).toNumber(),
      balance: sign * running.toNumber(),
    });
  }
  const ending = openingRaw.plus(
    sum(lines.map((line) => D(line.debit).minus(line.credit))),
  );

  return {
    account: { id: account.id, code: account.code, name: account.name, normalBalance: account.normalBalance },
    opening: sign * openingRaw.toNumber(),
    ending: sign * ending.toNumber(),
    rows,
    page,
    totalPages,
    total: lines.length,
  };
}
