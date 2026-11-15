import type { Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import Decimal from "decimal.js";
import { D, roundRp, sum } from "@/lib/money";
import { dateFromISO, isoFromDate, todayDate } from "@/lib/dates";
import { writeAudit } from "@/lib/audit";
import type { Actor, JournalType, SourceType } from "@/lib/types";
import { DOCUMENT_KEYS, nextDocumentNumber } from "@/server/accounting/numbering";
import { assertPeriodOpen } from "@/server/accounting/periods";

export interface JournalLineInput {
  accountId: string;
  description?: string | null;
  debit: string | number;
  credit: string | number;
}

export interface PostJournalInput {
  date: Date;
  description: string;
  reference?: string | null;
  type: JournalType;
  sourceType?: SourceType | null;
  sourceId?: string | null;
  lines: JournalLineInput[];
  number?: string;
  postedAt?: Date;
}

interface NormalizedLine {
  accountId: string;
  description: string | null;
  debit: Decimal;
  credit: Decimal;
  sortOrder: number;
}

interface AccountSnapshot {
  id: string;
  code: string;
  name: string;
  systemRole: string;
}

function normalizeDate(date: Date): Date {
  return dateFromISO(isoFromDate(date));
}

function normalizeAmount(value: string | number, label: string): Decimal {
  const amount = D(value);
  if (amount.isNegative()) throw new DomainError("INVALID_INPUT", `${label} tidak boleh negatif.`);
  if (!amount.equals(roundRp(amount))) {
    throw new DomainError("INVALID_INPUT", `${label} harus dalam rupiah bulat.`);
  }
  return amount;
}

async function loadAccounts(tx: Tx, companyId: string, lines: NormalizedLine[]): Promise<Map<string, AccountSnapshot>> {
  const ids = Array.from(new Set(lines.map((line) => line.accountId)));
  const accounts = await tx.glAccount.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true, code: true, name: true, systemRole: true, isActive: true },
  });
  if (accounts.length !== ids.length) {
    throw new DomainError("INVALID_INPUT", "Ada akun yang tidak ditemukan pada perusahaan ini.");
  }
  const byId = new Map(accounts.map((account) => [account.id, account]));
  for (const account of accounts) {
    if (!account.isActive) {
      throw new DomainError("INVALID_INPUT", `Akun ${account.code} ${account.name} tidak aktif.`);
    }
  }
  const childCount = await tx.glAccount.count({ where: { parentId: { in: ids } } });
  if (childCount > 0) {
    const parents = await tx.glAccount.findMany({
      where: { parentId: { in: ids } },
      select: { parentId: true },
      distinct: ["parentId"],
    });
    const parentIds = new Set(parents.map((row) => row.parentId));
    const offender = accounts.find((account) => parentIds.has(account.id));
    throw new DomainError(
      "INVALID_INPUT",
      `Akun ${offender?.code ?? ""} adalah akun induk. Jurnal hanya boleh memakai akun daun.`,
    );
  }
  return byId;
}

async function assertCashNotNegative(
  tx: Tx,
  companyId: string,
  lines: NormalizedLine[],
  accounts: Map<string, AccountSnapshot>,
): Promise<void> {
  const cashAccounts = Array.from(accounts.values()).filter(
    (account) => account.systemRole === "CASH" || account.systemRole === "BANK",
  );
  for (const account of cashAccounts) {
    const delta = lines
      .filter((line) => line.accountId === account.id)
      .reduce((acc, line) => acc.plus(line.debit).minus(line.credit), D(0));
    if (delta.isZero()) continue;
    const aggregate = await tx.journalLine.aggregate({
      where: { accountId: account.id, journalEntry: { companyId, status: "POSTED" } },
      _sum: { debit: true, credit: true },
    });
    const current = D(aggregate._sum.debit ?? 0).minus(D(aggregate._sum.credit ?? 0));
    const projected = current.plus(delta);
    if (projected.isNegative()) {
      throw new DomainError(
        "NEGATIVE_CASH",
        `Saldo ${account.code} ${account.name} akan negatif (${projected.toFixed(0)}). Catat penerimaan atau pilih rekening lain.`,
      );
    }
  }
}

function validateBalance(lines: NormalizedLine[]): { debitTotal: Decimal; creditTotal: Decimal } {
  if (lines.length < 2) throw new DomainError("INVALID_INPUT", "Jurnal memerlukan minimal dua baris.");
  for (const line of lines) {
    const debit = line.debit;
    const credit = line.credit;
    if (debit.isNegative() || credit.isNegative()) {
      throw new DomainError("INVALID_INPUT", "Nilai debit/kredit tidak boleh negatif.");
    }
    if (debit.isZero() === credit.isZero()) {
      throw new DomainError("INVALID_INPUT", "Setiap baris jurnal harus memiliki tepat satu sisi debit atau kredit.");
    }
  }
  const debitTotal = sum(lines.map((line) => line.debit));
  const creditTotal = sum(lines.map((line) => line.credit));
  if (!debitTotal.equals(creditTotal)) {
    throw new DomainError(
      "INVALID_INPUT",
      `Jurnal tidak seimbang: debit ${debitTotal.toFixed(0)} vs kredit ${creditTotal.toFixed(0)}.`,
    );
  }
  return { debitTotal, creditTotal };
}

function normalizeLines(lines: JournalLineInput[]): NormalizedLine[] {
  return lines.map((line, index) => ({
    accountId: line.accountId,
    description: line.description?.trim() || null,
    debit: normalizeAmount(line.debit, "Debit"),
    credit: normalizeAmount(line.credit, "Kredit"),
    sortOrder: index,
  }));
}

export interface PostedEntry {
  id: string;
  number: string;
  companyId: string;
  date: Date;
  description: string;
  type: JournalType;
  status: string;
  sourceType: SourceType | null;
  sourceId: string | null;
}

export async function postJournal(tx: Tx, actor: Actor, input: PostJournalInput): Promise<PostedEntry> {
  const date = normalizeDate(input.date);
  const description = input.description.trim();
  if (description.length < 3 || description.length > 240) {
    throw new DomainError("INVALID_INPUT", "Keterangan jurnal harus 3–240 karakter.");
  }

  const lines = normalizeLines(input.lines);
  const { debitTotal } = validateBalance(lines);
  const accounts = await loadAccounts(tx, actor.companyId, lines);
  await assertPeriodOpen(tx, actor.companyId, date);
  await assertCashNotNegative(tx, actor.companyId, lines, accounts);

  const number = input.number ?? (await nextDocumentNumber(tx, actor.companyId, DOCUMENT_KEYS.JOURNAL.key, DOCUMENT_KEYS.JOURNAL.prefix, date));

  const entry = await tx.journalEntry.create({
    data: {
      companyId: actor.companyId,
      number,
      date,
      description,
      reference: input.reference?.trim() || null,
      type: input.type,
      status: "POSTED",
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      postedAt: input.postedAt ?? new Date(),
      createdById: actor.userId,
      lines: {
        create: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit.toFixed(2),
          credit: line.credit.toFixed(2),
          sortOrder: line.sortOrder,
        })),
      },
    },
    select: {
      id: true,
      number: true,
      companyId: true,
      date: true,
      description: true,
      type: true,
      status: true,
      sourceType: true,
      sourceId: true,
    },
  });

  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "POST",
    entityType: "JournalEntry",
    entityId: entry.id,
    summary: `Posting jurnal ${number}: ${description}`,
    metadata: { amount: debitTotal.toFixed(2), date: isoFromDate(date), type: input.type },
  });

  return entry as PostedEntry;
}

export interface DraftInput {
  date: Date;
  description: string;
  reference?: string | null;
  type?: JournalType;
  lines: JournalLineInput[];
}

async function validateDraft(tx: Tx, actor: Actor, input: DraftInput) {
  const description = input.description.trim();
  if (description.length < 3 || description.length > 240) {
    throw new DomainError("INVALID_INPUT", "Keterangan jurnal harus 3–240 karakter.");
  }
  const lines = normalizeLines(input.lines);
  validateBalance(lines);
  await loadAccounts(tx, actor.companyId, lines);
  return { description, lines };
}

export async function createJournalDraft(tx: Tx, actor: Actor, input: DraftInput): Promise<{ id: string; number: string }> {
  const { description, lines } = await validateDraft(tx, actor, input);
  const date = normalizeDate(input.date);
  const number = await nextDocumentNumber(tx, actor.companyId, DOCUMENT_KEYS.JOURNAL.key, DOCUMENT_KEYS.JOURNAL.prefix, date);
  const entry = await tx.journalEntry.create({
    data: {
      companyId: actor.companyId,
      number,
      date,
      description,
      reference: input.reference?.trim() || null,
      type: input.type ?? "MANUAL",
      status: "DRAFT",
      sourceType: "MANUAL",
      createdById: actor.userId,
      lines: {
        create: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit.toFixed(2),
          credit: line.credit.toFixed(2),
          sortOrder: line.sortOrder,
        })),
      },
    },
    select: { id: true, number: true },
  });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "CREATE_DRAFT",
    entityType: "JournalEntry",
    entityId: entry.id,
    summary: `Membuat draf jurnal ${entry.number}`,
  });
  return entry;
}

export async function updateJournalDraft(
  tx: Tx,
  actor: Actor,
  entryId: string,
  input: DraftInput,
): Promise<void> {
  const existing = await tx.journalEntry.findFirst({
    where: { id: entryId, companyId: actor.companyId },
    select: { id: true, status: true, number: true },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Draf jurnal tidak ditemukan.");
  if (existing.status !== "DRAFT") throw new DomainError("INVALID_STATUS", "Hanya draf yang dapat diubah.");

  const { description, lines } = await validateDraft(tx, actor, input);
  const date = normalizeDate(input.date);
  await tx.journalLine.deleteMany({ where: { journalEntryId: entryId } });
  await tx.journalEntry.update({
    where: { id: entryId },
    data: {
      date,
      description,
      reference: input.reference?.trim() || null,
      lines: {
        create: lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit.toFixed(2),
          credit: line.credit.toFixed(2),
          sortOrder: line.sortOrder,
        })),
      },
    },
  });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "UPDATE_DRAFT",
    entityType: "JournalEntry",
    entityId: entryId,
    summary: `Memperbarui draf jurnal ${existing.number}`,
  });
}

export async function deleteJournalDraft(tx: Tx, actor: Actor, entryId: string): Promise<void> {
  const existing = await tx.journalEntry.findFirst({
    where: { id: entryId, companyId: actor.companyId },
    select: { id: true, status: true, number: true },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Draf jurnal tidak ditemukan.");
  if (existing.status !== "DRAFT") throw new DomainError("INVALID_STATUS", "Jurnal terposting tidak dapat dihapus; buat jurnal pembalik.");
  await tx.journalEntry.delete({ where: { id: entryId } });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "DELETE_DRAFT",
    entityType: "JournalEntry",
    entityId: entryId,
    summary: `Menghapus draf jurnal ${existing.number}`,
  });
}

export async function postJournalDraft(tx: Tx, actor: Actor, entryId: string): Promise<PostedEntry> {
  const existing = await tx.journalEntry.findFirst({
    where: { id: entryId, companyId: actor.companyId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Draf jurnal tidak ditemukan.");
  if (existing.status !== "DRAFT") throw new DomainError("INVALID_STATUS", "Jurnal ini sudah terposting.");

  const date = normalizeDate(existing.date);
  const lines: NormalizedLine[] = existing.lines.map((line, index) => ({
    accountId: line.accountId,
    description: line.description,
    debit: D(line.debit),
    credit: D(line.credit),
    sortOrder: index,
  }));
  const { debitTotal } = validateBalance(lines);
  const accounts = await loadAccounts(tx, actor.companyId, lines);
  await assertPeriodOpen(tx, actor.companyId, date);
  await assertCashNotNegative(tx, actor.companyId, lines, accounts);

  const entry = await tx.journalEntry.update({
    where: { id: entryId },
    data: { status: "POSTED", postedAt: new Date() },
    select: {
      id: true,
      number: true,
      companyId: true,
      date: true,
      description: true,
      type: true,
      status: true,
      sourceType: true,
      sourceId: true,
    },
  });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "POST",
    entityType: "JournalEntry",
    entityId: entry.id,
    summary: `Posting draf jurnal ${entry.number}: ${entry.description}`,
    metadata: { amount: debitTotal.toFixed(2), date: isoFromDate(date) },
  });
  return entry as PostedEntry;
}

interface ReverseOptions {
  manualOnly: boolean;
  description?: string;
}

async function reverseEntry(tx: Tx, actor: Actor, entryId: string, options: ReverseOptions): Promise<PostedEntry> {
  const entry = await tx.journalEntry.findFirst({
    where: { id: entryId, companyId: actor.companyId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!entry) throw new DomainError("NOT_FOUND", "Jurnal tidak ditemukan.");
  if (entry.status !== "POSTED") throw new DomainError("INVALID_STATUS", "Hanya jurnal terposting yang dapat dibatalkan.");
  if (entry.voidedAt) throw new DomainError("INVALID_STATUS", "Jurnal ini sudah dibatalkan.");

  if (options.manualOnly && entry.sourceType !== "MANUAL" && entry.sourceType !== null) {
    throw new DomainError("INVALID_STATUS", "Jurnal otomatis dibatalkan dari dokumen sumbernya.");
  }

  const existingReversal = await tx.journalEntry.findFirst({
    where: { reversalOfId: entry.id, companyId: actor.companyId },
    select: { id: true },
  });
  if (existingReversal) throw new DomainError("INVALID_STATUS", "Jurnal ini sudah memiliki pembalik.");

  const planned = entry.lines.map((line, index) => ({
    accountId: line.accountId,
    description: line.description,
    debit: line.credit,
    credit: line.debit,
    sortOrder: index,
  }));
  const normalized: NormalizedLine[] = planned.map((line, index) => ({
    accountId: line.accountId,
    description: line.description,
    debit: D(line.debit),
    credit: D(line.credit),
    sortOrder: index,
  }));
  const accounts = await loadAccounts(tx, actor.companyId, normalized);
  const date = todayDate();
  await assertPeriodOpen(tx, actor.companyId, date);
  await assertCashNotNegative(tx, actor.companyId, normalized, accounts);

  const number = await nextDocumentNumber(tx, actor.companyId, DOCUMENT_KEYS.JOURNAL.key, DOCUMENT_KEYS.JOURNAL.prefix, date);
  const description = (options.description ?? `Pembalik ${entry.number}`).slice(0, 240);
  const reversal = await tx.journalEntry.create({
    data: {
      companyId: actor.companyId,
      number,
      date,
      description,
      reference: entry.number,
      type: "REVERSAL",
      status: "POSTED",
      sourceType: "REVERSAL",
      sourceId: entry.id,
      reversalOfId: entry.id,
      postedAt: new Date(),
      createdById: actor.userId,
      lines: {
        create: normalized.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: line.debit.toFixed(2),
          credit: line.credit.toFixed(2),
          sortOrder: line.sortOrder,
        })),
      },
    },
    select: {
      id: true,
      number: true,
      companyId: true,
      date: true,
      description: true,
      type: true,
      status: true,
      sourceType: true,
      sourceId: true,
    },
  });

  await tx.journalEntry.update({
    where: { id: entry.id },
    data: { voidedAt: new Date(), voidedById: actor.userId },
  });

  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "VOID",
    entityType: "JournalEntry",
    entityId: entry.id,
    summary: `Membatalkan jurnal ${entry.number} dengan ${reversal.number}`,
    metadata: { reversalId: reversal.id },
  });

  return reversal as PostedEntry;
}

export async function reverseJournal(tx: Tx, actor: Actor, entryId: string): Promise<PostedEntry> {
  return reverseEntry(tx, actor, entryId, { manualOnly: true });
}

export async function reverseDocumentJournal(
  tx: Tx,
  actor: Actor,
  entryId: string,
  description: string,
): Promise<PostedEntry> {
  return reverseEntry(tx, actor, entryId, { manualOnly: false, description });
}
