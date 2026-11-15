import { prisma, withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D } from "@/lib/money";
import { addDays, isValidISODate, dateFromISO } from "@/lib/dates";
import { MAX_CSV_ROWS } from "@/lib/constants";
import { parseCsv } from "@/lib/csv";
import type { Actor, BankStatementStatus } from "@/lib/types";
import type { BankAccountSummary } from "@/lib/dto";
import { getBankAccount } from "@/server/cash/accounts";

export interface StatementLineView {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  amount: number;
  status: BankStatementStatus;
  matchedJournalLineId: string | null;
  matchedJournalNumber: string | null;
}

export interface CandidateLine {
  id: string;
  date: string;
  number: string;
  description: string;
  amount: number;
}

export interface ReconciliationSummary {
  statementTotal: number;
  ledgerTotal: number;
  difference: number;
  matched: number;
  unmatched: number;
  ignored: number;
  done: boolean;
}

export interface ReconciliationData {
  account: BankAccountSummary;
  lines: StatementLineView[];
  candidates: CandidateLine[];
  summary: ReconciliationSummary;
}

const HEADER = ["date", "description", "reference", "amount"];

export async function importBankStatement(
  actor: Actor,
  input: { bankAccountId: string; csv: string },
): Promise<{ imported: number; skipped: number }> {
  return withFinancialTx(async (tx) => {
    const bank = await tx.bankAccount.findFirst({
      where: { id: input.bankAccountId, companyId: actor.companyId },
      select: { id: true, name: true, isActive: true },
    });
    if (!bank) throw new DomainError("NOT_FOUND", "Rekening tidak ditemukan.");
    if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening tidak aktif.");

    const rows = parseCsv(input.csv);
    if (rows.length === 0) throw new DomainError("INVALID_INPUT", "Berkas CSV kosong.");
    const header = rows[0].map((cell) => cell.trim().toLowerCase());
    if (header.length !== HEADER.length || header.some((cell, index) => cell !== HEADER[index])) {
      throw new DomainError("INVALID_INPUT", "Header CSV harus: date,description,reference,amount");
    }
    const dataRows = rows.slice(1);
    if (dataRows.length === 0) throw new DomainError("INVALID_INPUT", "Tidak ada baris data pada CSV.");
    if (dataRows.length > MAX_CSV_ROWS) {
      throw new DomainError("INVALID_INPUT", `Maksimal ${MAX_CSV_ROWS} baris per impor.`);
    }

    const errors: string[] = [];
    const parsed = dataRows.map((row, index) => {
      const lineNumber = index + 2;
      if (row.length !== 4) {
        errors.push(`Baris ${lineNumber}: harus memiliki 4 kolom.`);
        return null;
      }
      const [dateRaw, descriptionRaw, referenceRaw, amountRaw] = row.map((cell) => cell.trim());
      if (!isValidISODate(dateRaw)) errors.push(`Baris ${lineNumber}: tanggal "${dateRaw}" tidak valid.`);
      if (descriptionRaw.length < 3 || descriptionRaw.length > 200) {
        errors.push(`Baris ${lineNumber}: deskripsi harus 3–200 karakter.`);
      }
      if (!/^-?\d+(\.\d{1,2})?$/.test(amountRaw)) {
        errors.push(`Baris ${lineNumber}: nominal "${amountRaw}" tidak valid.`);
      }
      if (referenceRaw.length > 80) errors.push(`Baris ${lineNumber}: referensi maksimal 80 karakter.`);
      return {
        date: dateRaw,
        description: descriptionRaw,
        reference: referenceRaw || null,
        amount: amountRaw,
      };
    });
    if (errors.length > 0) {
      throw new DomainError("INVALID_INPUT", `CSV memiliki ${errors.length} baris bermasalah: ${errors.slice(0, 4).join(" ")}`);
    }

    let imported = 0;
    let skipped = 0;
    for (const row of parsed) {
      if (!row) continue;
      const date = dateFromISO(row.date);
      const amount = D(row.amount).toFixed(2);
      const duplicate = await tx.bankStatementLine.findFirst({
        where: {
          bankAccountId: bank.id,
          date,
          description: row.description,
          amount,
          reference: row.reference ?? null,
        },
        select: { id: true },
      });
      if (duplicate) {
        skipped += 1;
        continue;
      }
      await tx.bankStatementLine.create({
        data: {
          companyId: actor.companyId,
          bankAccountId: bank.id,
          date,
          description: row.description,
          reference: row.reference,
          amount,
          status: "UNMATCHED",
        },
      });
      imported += 1;
    }

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "IMPORT",
      entityType: "BankStatementLine",
      entityId: bank.id,
      summary: `Impor rekonsiliasi ${bank.name}: ${imported} baru, ${skipped} duplikat`,
      metadata: { imported, skipped },
    });

    return { imported, skipped };
  });
}

export async function autoMatchStatement(
  actor: Actor,
  input: { bankAccountId: string; from: Date; to: Date },
): Promise<{ matched: number; ambiguous: number; none: number }> {
  return withFinancialTx(async (tx) => {
    const bank = await tx.bankAccount.findFirst({
      where: { id: input.bankAccountId, companyId: actor.companyId },
      select: { id: true, coaAccountId: true, name: true },
    });
    if (!bank) throw new DomainError("NOT_FOUND", "Rekening tidak ditemukan.");

    const statementLines = await tx.bankStatementLine.findMany({
      where: {
        bankAccountId: bank.id,
        status: "UNMATCHED",
        date: { gte: input.from, lte: input.to },
      },
      orderBy: { date: "asc" },
    });

    let matched = 0;
    let ambiguous = 0;
    let none = 0;
    for (const line of statementLines) {
      const candidates = await tx.journalLine.findMany({
        where: {
          accountId: bank.coaAccountId,
          bankStatementLine: null,
          journalEntry: {
            companyId: actor.companyId,
            status: "POSTED",
            date: { gte: addDays(line.date, -3), lte: addDays(line.date, 3) },
          },
        },
        select: { id: true, debit: true, credit: true },
      });
      const amount = D(line.amount);
      const exact = candidates.filter((candidate) => D(candidate.debit).minus(D(candidate.credit)).equals(amount));
      if (exact.length === 1) {
        await tx.bankStatementLine.update({
          where: { id: line.id },
          data: { status: "MATCHED", matchedJournalLineId: exact[0].id },
        });
        matched += 1;
      } else if (exact.length > 1) {
        ambiguous += 1;
      } else {
        none += 1;
      }
    }

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "RECONCILE_AUTO",
      entityType: "BankStatementLine",
      entityId: bank.id,
      summary: `Cocokkan otomatis ${bank.name}: ${matched} cocok, ${ambiguous} ambigu, ${none} tanpa pasangan`,
      metadata: { matched, ambiguous, none },
    });

    return { matched, ambiguous, none };
  });
}

async function loadStatementAndJournal(actor: Actor, lineId: string, journalLineId: string) {
  const statement = await prisma.bankStatementLine.findFirst({
    where: { id: lineId, companyId: actor.companyId },
    include: { bankAccount: { select: { coaAccountId: true } } },
  });
  if (!statement) throw new DomainError("NOT_FOUND", "Baris rekonsiliasi tidak ditemukan.");
  if (statement.status === "MATCHED") throw new DomainError("INVALID_STATUS", "Baris ini sudah dicocokkan.");
  const journalLine = await prisma.journalLine.findFirst({
    where: { id: journalLineId, accountId: statement.bankAccount.coaAccountId, journalEntry: { companyId: actor.companyId } },
    include: { journalEntry: { select: { status: true, number: true, date: true, companyId: true } }, bankStatementLine: { select: { id: true } } },
  });
  if (!journalLine) throw new DomainError("NOT_FOUND", "Baris jurnal tidak ditemukan pada rekening ini.");
  if (journalLine.journalEntry.status !== "POSTED") throw new DomainError("INVALID_STATUS", "Baris jurnal belum terposting.");
  if (journalLine.bankStatementLine) throw new DomainError("INVALID_STATUS", "Baris jurnal sudah dipakai baris rekonsiliasi lain.");
  const journalAmount = D(journalLine.debit).minus(D(journalLine.credit));
  if (!journalAmount.equals(D(statement.amount))) {
    throw new DomainError("INVALID_INPUT", "Nominal baris jurnal tidak sama dengan mutasi rekening.");
  }
  return { statement, journalLine };
}

export async function matchStatementLine(
  actor: Actor,
  input: { lineId: string; journalLineId: string },
): Promise<void> {
  await withFinancialTx(async (tx) => {
    const { statement, journalLine } = await loadStatementAndJournal(actor, input.lineId, input.journalLineId);
    await tx.bankStatementLine.update({
      where: { id: statement.id },
      data: { status: "MATCHED", matchedJournalLineId: journalLine.id },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "RECONCILE_MATCH",
      entityType: "BankStatementLine",
      entityId: statement.id,
      summary: `Mencocokkan mutasi ${statement.description} dengan jurnal ${journalLine.journalEntry.number}`,
    });
  });
}

export async function unmatchStatementLine(actor: Actor, lineId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const statement = await tx.bankStatementLine.findFirst({
      where: { id: lineId, companyId: actor.companyId },
      select: { id: true, status: true, description: true },
    });
    if (!statement) throw new DomainError("NOT_FOUND", "Baris rekonsiliasi tidak ditemukan.");
    if (statement.status !== "MATCHED") throw new DomainError("INVALID_STATUS", "Baris ini tidak sedang dicocokkan.");
    await tx.bankStatementLine.update({
      where: { id: statement.id },
      data: { status: "UNMATCHED", matchedJournalLineId: null },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "RECONCILE_UNMATCH",
      entityType: "BankStatementLine",
      entityId: statement.id,
      summary: `Melepas kecocokan mutasi ${statement.description}`,
    });
  });
}

export async function ignoreStatementLine(actor: Actor, lineId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const statement = await tx.bankStatementLine.findFirst({
      where: { id: lineId, companyId: actor.companyId },
      select: { id: true, status: true, description: true },
    });
    if (!statement) throw new DomainError("NOT_FOUND", "Baris rekonsiliasi tidak ditemukan.");
    if (statement.status === "MATCHED") {
      throw new DomainError("INVALID_STATUS", "Lepas kecocokan terlebih dahulu sebelum mengabaikan baris.");
    }
    await tx.bankStatementLine.update({
      where: { id: statement.id },
      data: { status: "IGNORED" },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "RECONCILE_IGNORE",
      entityType: "BankStatementLine",
      entityId: statement.id,
      summary: `Mengabaikan mutasi ${statement.description}`,
    });
  });
}

export async function getReconciliation(
  actor: Actor,
  input: { bankAccountId: string; from: Date; to: Date },
): Promise<ReconciliationData> {
  const account = await getBankAccount(actor, input.bankAccountId);
  const lines = await prisma.bankStatementLine.findMany({
    where: {
      companyId: actor.companyId,
      bankAccountId: account.id,
      date: { gte: input.from, lte: input.to },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { matchedJournalLine: { include: { journalEntry: { select: { number: true } } } } },
  });

  const candidateLines = await prisma.journalLine.findMany({
    where: {
      accountId: account.coaAccountId,
      bankStatementLine: null,
      journalEntry: {
        companyId: actor.companyId,
        status: "POSTED",
        date: { gte: addDays(input.from, -7), lte: addDays(input.to, 7) },
      },
    },
    orderBy: [{ journalEntry: { date: "asc" } }, { journalEntry: { number: "asc" } }],
    include: { journalEntry: { select: { number: true, date: true, description: true } } },
  });

  const statementTotal = lines
    .filter((line) => line.status !== "IGNORED")
    .reduce((acc, line) => acc.plus(D(line.amount)), D(0));
  const ledgerAgg = await prisma.journalLine.aggregate({
    where: {
      accountId: account.coaAccountId,
      journalEntry: { companyId: actor.companyId, status: "POSTED", date: { gte: input.from, lte: input.to } },
    },
    _sum: { debit: true, credit: true },
  });
  const ledgerTotal = D(ledgerAgg._sum.debit ?? 0).minus(D(ledgerAgg._sum.credit ?? 0));
  const matched = lines.filter((line) => line.status === "MATCHED").length;
  const ignored = lines.filter((line) => line.status === "IGNORED").length;
  const unmatched = lines.filter((line) => line.status === "UNMATCHED").length;

  return {
    account,
    lines: lines.map((line) => ({
      id: line.id,
      date: line.date.toISOString().slice(0, 10),
      description: line.description,
      reference: line.reference,
      amount: D(line.amount).toNumber(),
      status: line.status,
      matchedJournalLineId: line.matchedJournalLineId,
      matchedJournalNumber: line.matchedJournalLine?.journalEntry.number ?? null,
    })),
    candidates: candidateLines.map((line) => ({
      id: line.id,
      date: line.journalEntry.date.toISOString().slice(0, 10),
      number: line.journalEntry.number,
      description: line.description ?? line.journalEntry.description,
      amount: D(line.debit).minus(D(line.credit)).toNumber(),
    })),
    summary: {
      statementTotal: statementTotal.toNumber(),
      ledgerTotal: ledgerTotal.toNumber(),
      difference: statementTotal.minus(ledgerTotal).toNumber(),
      matched,
      unmatched,
      ignored,
      done: lines.length > 0 && unmatched === 0,
    },
  };
}
