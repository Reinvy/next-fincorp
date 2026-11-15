import { prisma, withFinancialTx, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D } from "@/lib/money";
import { postJournal } from "@/server/accounting/posting";
import type { Actor, BankAccountType, BankCardTheme } from "@/lib/types";
import type { BankAccountSummary } from "@/lib/dto";

export interface CreateBankAccountInput {
  name: string;
  bankName?: string | null;
  accountNumber?: string | null;
  type: BankAccountType;
  openingBalance: string;
  openingDate: Date;
  cardTheme: BankCardTheme;
  coaAccountId?: string | null;
}

async function nextChildCode(tx: Tx, companyId: string, parentId: string, parentCode: string): Promise<string> {
  const children = await tx.glAccount.findMany({
    where: { companyId, parentId },
    select: { code: true },
  });
  const used = new Set(children.map((child) => child.code));
  let candidate = Number(parentCode) + 1;
  while (used.has(String(candidate).padStart(4, "0"))) candidate += 1;
  return String(candidate).padStart(4, "0");
}

async function resolveCoaAccount(
  tx: Tx,
  actor: Actor,
  input: CreateBankAccountInput,
): Promise<{ id: string; code: string }> {
  if (input.coaAccountId) {
    const account = await tx.glAccount.findFirst({
      where: { id: input.coaAccountId, companyId: actor.companyId },
      select: { id: true, code: true, type: true, systemRole: true, isActive: true, children: { select: { id: true } } },
    });
    if (!account) throw new DomainError("INVALID_INPUT", "Akun COA tidak ditemukan.");
    if (!account.isActive) throw new DomainError("INVALID_INPUT", "Akun COA tidak aktif.");
    if (account.children.length > 0) throw new DomainError("INVALID_INPUT", "Akun COA harus akun daun.");
    if (account.type !== "ASSET" || (account.systemRole !== "BANK" && account.systemRole !== "CASH")) {
      throw new DomainError("INVALID_INPUT", "Akun COA harus aset dengan peran BANK atau CASH.");
    }
    const linked = await tx.bankAccount.findUnique({ where: { coaAccountId: account.id }, select: { id: true } });
    if (linked) throw new DomainError("DUPLICATE", "Akun COA sudah dipakai rekening lain.");
    return { id: account.id, code: account.code };
  }

  const parentCode = input.type === "CASH" ? "1110" : "1120";
  const parent = await tx.glAccount.findUnique({
    where: { companyId_code: { companyId: actor.companyId, code: parentCode } },
    select: { id: true, code: true, level: true },
  });
  if (!parent) throw new DomainError("INVALID_INPUT", `Akun induk ${parentCode} tidak ditemukan pada bagan akun.`);
  const code = await nextChildCode(tx, actor.companyId, parent.id, parent.code);
  const account = await tx.glAccount.create({
    data: {
      companyId: actor.companyId,
      code,
      name: input.name.trim(),
      description: input.bankName ? `${input.bankName}${input.accountNumber ? ` · ${input.accountNumber}` : ""}` : null,
      type: "ASSET",
      reportGroup: "CURRENT_ASSET",
      normalBalance: "DEBIT",
      systemRole: input.type,
      parentId: parent.id,
      level: parent.level + 1,
    },
    select: { id: true, code: true },
  });
  return account;
}

export async function createBankAccount(
  actor: Actor,
  input: CreateBankAccountInput,
): Promise<{ id: string; code: string; number: string | null }> {
  const name = input.name.trim();
  if (!name || name.length > 80) throw new DomainError("INVALID_INPUT", "Nama rekening wajib diisi, maksimal 80 karakter.");
  const openingBalance = D(input.openingBalance);
  if (openingBalance.isNegative()) throw new DomainError("INVALID_INPUT", "Saldo awal tidak boleh negatif.");
  if (!openingBalance.equals(openingBalance.toDecimalPlaces(0))) {
    throw new DomainError("INVALID_INPUT", "Saldo awal harus rupiah bulat.");
  }

  return withFinancialTx(async (tx) => {
    const coa = await resolveCoaAccount(tx, actor, input);
    const account = await tx.bankAccount.create({
      data: {
        companyId: actor.companyId,
        name,
        bankName: input.bankName?.trim() || null,
        accountNumber: input.accountNumber?.trim() || null,
        type: input.type,
        coaAccountId: coa.id,
        openingBalance: openingBalance.toFixed(2),
        openingDate: input.openingDate,
        cardTheme: input.cardTheme,
      },
      select: { id: true },
    });

    let journalNumber: string | null = null;
    if (openingBalance.greaterThan(0)) {
      const opening = await tx.glAccount.findUnique({
        where: { companyId_code: { companyId: actor.companyId, code: "3200" } },
        select: { id: true },
      });
      if (!opening) throw new DomainError("INVALID_INPUT", "Akun Saldo Awal (3200) tidak ditemukan.");
      const journal = await postJournal(tx, actor, {
        date: input.openingDate,
        description: `Saldo awal ${name}`,
        type: "OPENING",
        sourceType: "OPENING_BALANCE",
        sourceId: account.id,
        lines: [
          { accountId: coa.id, debit: openingBalance.toFixed(2), credit: "0" },
          { accountId: opening.id, debit: "0", credit: openingBalance.toFixed(2) },
        ],
      });
      journalNumber = journal.number;
    }

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "CREATE",
      entityType: "BankAccount",
      entityId: account.id,
      summary: `Menambah rekening ${name} (${coa.code}) dengan saldo awal ${openingBalance.toFixed(0)}`,
      metadata: { coaAccountId: coa.id, openingJournal: journalNumber },
    });

    return { id: account.id, code: coa.code, number: journalNumber };
  });
}

async function balancesFor(companyId: string, accounts: Array<{ id: string; coaAccountId: string }>) {
  if (accounts.length === 0) return new Map<string, number>();
  const sums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      accountId: { in: accounts.map((account) => account.coaAccountId) },
      journalEntry: { companyId, status: "POSTED" },
    },
    _sum: { debit: true, credit: true },
  });
  const byCoa = new Map(sums.map((row) => [row.accountId, D(row._sum.debit ?? 0).minus(D(row._sum.credit ?? 0)).toNumber()]));
  return new Map(accounts.map((account) => [account.id, byCoa.get(account.coaAccountId) ?? 0]));
}

export async function listBankAccounts(actor: Actor): Promise<BankAccountSummary[]> {
  const accounts = await prisma.bankAccount.findMany({
    where: { companyId: actor.companyId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { coaAccount: { select: { code: true } } },
  });
  const balances = await balancesFor(
    actor.companyId,
    accounts.map((account) => ({ id: account.id, coaAccountId: account.coaAccountId })),
  );
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    type: account.type,
    coaAccountId: account.coaAccountId,
    coaCode: account.coaAccount.code,
    openingBalance: D(account.openingBalance).toNumber(),
    openingDate: account.openingDate.toISOString().slice(0, 10),
    cardTheme: account.cardTheme,
    isActive: account.isActive,
    balance: balances.get(account.id) ?? 0,
  }));
}

export async function getBankAccount(actor: Actor, bankAccountId: string): Promise<BankAccountSummary> {
  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, companyId: actor.companyId },
    include: { coaAccount: { select: { code: true } } },
  });
  if (!account) throw new DomainError("NOT_FOUND", "Rekening tidak ditemukan.");
  const balances = await balancesFor(actor.companyId, [
    { id: account.id, coaAccountId: account.coaAccountId },
  ]);
  return {
    id: account.id,
    name: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    type: account.type,
    coaAccountId: account.coaAccountId,
    coaCode: account.coaAccount.code,
    openingBalance: D(account.openingBalance).toNumber(),
    openingDate: account.openingDate.toISOString().slice(0, 10),
    cardTheme: account.cardTheme,
    isActive: account.isActive,
    balance: balances.get(account.id) ?? 0,
  };
}

export async function setBankAccountActive(actor: Actor, bankAccountId: string, isActive: boolean): Promise<void> {
  await withFinancialTx(async (tx) => {
    const account = await tx.bankAccount.findFirst({
      where: { id: bankAccountId, companyId: actor.companyId },
      include: { coaAccount: { select: { code: true } } },
    });
    if (!account) throw new DomainError("NOT_FOUND", "Rekening tidak ditemukan.");
    if (account.isActive === isActive) return;

    if (!isActive) {
      const aggregate = await tx.journalLine.aggregate({
        where: { accountId: account.coaAccountId, journalEntry: { companyId: actor.companyId, status: "POSTED" } },
        _sum: { debit: true, credit: true },
      });
      const balance = D(aggregate._sum.debit ?? 0).minus(D(aggregate._sum.credit ?? 0));
      if (!balance.isZero()) {
        throw new DomainError("INVALID_INPUT", "Rekening hanya dapat dinonaktifkan saat saldonya nol.");
      }
      const openLines = await tx.bankStatementLine.count({
        where: { bankAccountId, status: "UNMATCHED" },
      });
      if (openLines > 0) {
        throw new DomainError("INVALID_INPUT", "Masih ada baris rekonsiliasi yang belum dicocokkan.");
      }
    }

    await tx.bankAccount.update({ where: { id: bankAccountId }, data: { isActive } });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      entityType: "BankAccount",
      entityId: bankAccountId,
      summary: `${isActive ? "Mengaktifkan" : "Menonaktifkan"} rekening ${account.name}`,
    });
  });
}

export async function getCashPosition(actor: Actor): Promise<{
  accounts: BankAccountSummary[];
  total: number;
  cash: number;
  bank: number;
}> {
  const accounts = await listBankAccounts(actor);
  const active = accounts.filter((account) => account.isActive);
  return {
    accounts,
    total: active.reduce((acc, account) => acc + account.balance, 0),
    cash: active.filter((account) => account.type === "CASH").reduce((acc, account) => acc + account.balance, 0),
    bank: active.filter((account) => account.type === "BANK").reduce((acc, account) => acc + account.balance, 0),
  };
}
