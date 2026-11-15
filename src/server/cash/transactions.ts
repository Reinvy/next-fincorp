import { randomUUID } from "node:crypto";
import { prisma, withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D } from "@/lib/money";
import { postJournal } from "@/server/accounting/posting";
import type { Actor, CashDirection, JournalType } from "@/lib/types";

export interface CashTransactionInput {
  bankAccountId: string;
  date: Date;
  description: string;
  category: string;
  amount: string;
  direction: CashDirection;
  counterAccountId: string;
}

export async function createCashTransaction(
  actor: Actor,
  input: CashTransactionInput,
): Promise<{ id: string; number: string }> {
  const description = input.description.trim();
  if (description.length < 3 || description.length > 240) {
    throw new DomainError("INVALID_INPUT", "Keterangan transaksi harus 3–240 karakter.");
  }
  const category = input.category.trim();
  if (!category) throw new DomainError("INVALID_INPUT", "Kategori transaksi wajib diisi.");
  const amount = D(input.amount);
  if (!amount.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Nominal harus lebih dari nol.");
  if (!amount.equals(amount.toDecimalPlaces(0))) {
    throw new DomainError("INVALID_INPUT", "Nominal harus rupiah bulat.");
  }

  return withFinancialTx(async (tx) => {
    const bank = await tx.bankAccount.findFirst({
      where: { id: input.bankAccountId, companyId: actor.companyId },
      include: { coaAccount: { select: { id: true, name: true, isActive: true } } },
    });
    if (!bank) throw new DomainError("NOT_FOUND", "Rekening tidak ditemukan.");
    if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening tidak aktif.");

    const counter = await tx.glAccount.findFirst({
      where: { id: input.counterAccountId, companyId: actor.companyId },
      select: { id: true, name: true, systemRole: true, isActive: true, children: { select: { id: true } } },
    });
    if (!counter) throw new DomainError("INVALID_INPUT", "Akun lawan tidak ditemukan.");
    if (!counter.isActive) throw new DomainError("INVALID_INPUT", "Akun lawan tidak aktif.");
    if (counter.children.length > 0) throw new DomainError("INVALID_INPUT", "Akun lawan harus akun daun.");
    if (counter.systemRole === "CASH" || counter.systemRole === "BANK") {
      throw new DomainError("INVALID_INPUT", "Gunakan menu transfer untuk memindahkan dana antar rekening.");
    }

    const transactionId = randomUUID();
    const lines =
      input.direction === "IN"
        ? [
            { accountId: bank.coaAccountId, debit: amount.toFixed(2), credit: "0" },
            { accountId: counter.id, debit: "0", credit: amount.toFixed(2) },
          ]
        : [
            { accountId: counter.id, debit: amount.toFixed(2), credit: "0" },
            { accountId: bank.coaAccountId, debit: "0", credit: amount.toFixed(2) },
          ];

    const journal = await postJournal(tx, actor, {
      date: input.date,
      description,
      reference: category,
      type: (input.direction === "IN" ? "CASH_IN" : "CASH_OUT") as JournalType,
      sourceType: "CASH_TRANSACTION",
      sourceId: transactionId,
      lines,
    });

    await tx.cashTransaction.create({
      data: {
        id: transactionId,
        companyId: actor.companyId,
        bankAccountId: bank.id,
        date: input.date,
        description,
        category,
        amount: amount.toFixed(2),
        direction: input.direction,
        counterAccountId: counter.id,
        journalEntryId: journal.id,
        createdById: actor.userId,
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "CREATE",
      entityType: "CashTransaction",
      entityId: transactionId,
      summary: `${input.direction === "IN" ? "Kas masuk" : "Kas keluar"} ${amount.toFixed(0)} pada ${bank.name}: ${description}`,
      metadata: { journal: journal.number, counterAccount: counter.name },
    });

    return { id: transactionId, number: journal.number };
  });
}

export interface BankTransferInput {
  fromAccountId: string;
  toAccountId: string;
  date: Date;
  amount: string;
  description: string;
}

export async function createBankTransfer(actor: Actor, input: BankTransferInput): Promise<{ id: string; number: string }> {
  if (input.fromAccountId === input.toAccountId) {
    throw new DomainError("INVALID_INPUT", "Rekening asal dan tujuan harus berbeda.");
  }
  const description = input.description.trim();
  if (description.length < 3 || description.length > 240) {
    throw new DomainError("INVALID_INPUT", "Keterangan transfer harus 3–240 karakter.");
  }
  const amount = D(input.amount);
  if (!amount.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Nominal transfer harus lebih dari nol.");
  if (!amount.equals(amount.toDecimalPlaces(0))) {
    throw new DomainError("INVALID_INPUT", "Nominal transfer harus rupiah bulat.");
  }

  return withFinancialTx(async (tx) => {
    const accounts = await tx.bankAccount.findMany({
      where: { id: { in: [input.fromAccountId, input.toAccountId] }, companyId: actor.companyId },
      include: { coaAccount: { select: { id: true, name: true, isActive: true } } },
    });
    if (accounts.length !== 2) throw new DomainError("INVALID_INPUT", "Rekening asal atau tujuan tidak ditemukan.");
    const from = accounts.find((account) => account.id === input.fromAccountId);
    const to = accounts.find((account) => account.id === input.toAccountId);
    if (!from || !to) throw new DomainError("INVALID_INPUT", "Rekening tidak ditemukan.");
    if (!from.isActive || !to.isActive) throw new DomainError("INVALID_INPUT", "Kedua rekening harus aktif.");

    const transferId = randomUUID();
    const journal = await postJournal(tx, actor, {
      date: input.date,
      description,
      type: "TRANSFER",
      sourceType: "BANK_TRANSFER",
      sourceId: transferId,
      lines: [
        { accountId: to.coaAccountId, debit: amount.toFixed(2), credit: "0" },
        { accountId: from.coaAccountId, debit: "0", credit: amount.toFixed(2) },
      ],
    });

    await tx.bankTransfer.create({
      data: {
        id: transferId,
        companyId: actor.companyId,
        fromAccountId: from.id,
        toAccountId: to.id,
        date: input.date,
        amount: amount.toFixed(2),
        description,
        journalEntryId: journal.id,
        createdById: actor.userId,
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "CREATE",
      entityType: "BankTransfer",
      entityId: transferId,
      summary: `Transfer ${amount.toFixed(0)} dari ${from.name} ke ${to.name}`,
      metadata: { journal: journal.number },
    });
    return { id: transferId, number: journal.number };
  });
}

export interface CashActivityRow {
  id: string;
  journalEntryId: string;
  date: string;
  number: string;
  description: string;
  type: JournalType;
  accountName: string;
  amount: number;
}

export async function listCashActivity(
  actor: Actor,
  options: { bankAccountId?: string; limit?: number } = {},
): Promise<CashActivityRow[]> {
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { companyId: actor.companyId, ...(options.bankAccountId ? { id: options.bankAccountId } : {}) },
    select: { coaAccountId: true },
  });
  if (bankAccounts.length === 0) return [];
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: bankAccounts.map((account) => account.coaAccountId) },
      journalEntry: { companyId: actor.companyId, status: "POSTED" },
    },
    orderBy: [{ journalEntry: { date: "desc" } }, { journalEntry: { number: "desc" } }],
    take: options.limit ?? 12,
    include: {
      account: { select: { name: true } },
      journalEntry: { select: { id: true, number: true, date: true, description: true, type: true } },
    },
  });
  return lines.map((line) => ({
    id: line.id,
    journalEntryId: line.journalEntry.id,
    date: line.journalEntry.date.toISOString().slice(0, 10),
    number: line.journalEntry.number,
    description: line.journalEntry.description,
    type: line.journalEntry.type,
    accountName: line.account.name,
    amount: D(line.debit).minus(D(line.credit)).toNumber(),
  }));
}
