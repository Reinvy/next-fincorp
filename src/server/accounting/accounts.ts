import { prisma, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import type { AccountNode, AccountOption } from "@/lib/dto";
import type { AccountType, Actor, NormalBalance, ReportGroup, SystemRole } from "@/lib/types";

export interface AccountInput {
  code: string;
  name: string;
  description?: string | null;
  type: AccountType;
  reportGroup: ReportGroup;
  systemRole?: SystemRole;
  parentId?: string | null;
}

const SYSTEM_ROLE_RULES: Record<Exclude<SystemRole, "NONE">, { types: AccountType[]; groups?: ReportGroup[] }> = {
  CASH: { types: ["ASSET"] },
  BANK: { types: ["ASSET"] },
  ACCOUNTS_RECEIVABLE: { types: ["ASSET"] },
  VAT_INPUT: { types: ["ASSET"], groups: ["CURRENT_ASSET"] },
  INVENTORY: { types: ["ASSET"] },
  FIXED_ASSET: { types: ["ASSET"], groups: ["FIXED_ASSET"] },
  ACCUMULATED_DEPRECIATION: { types: ["ASSET"], groups: ["ACCUMULATED_DEPRECIATION"] },
  ACCOUNTS_PAYABLE: { types: ["LIABILITY"] },
  VAT_OUTPUT: { types: ["LIABILITY"] },
  VAT_PAYABLE: { types: ["LIABILITY"] },
  VAT_RECEIVABLE: { types: ["ASSET"] },
  WITHHOLDING_PAYABLE: { types: ["LIABILITY"] },
  TAX_PAYABLE: { types: ["LIABILITY"] },
  SALES_REVENUE: { types: ["REVENUE"] },
  SALES_RETURN: { types: ["REVENUE"], groups: ["CONTRA_REVENUE"] },
  PURCHASE_RETURN: { types: ["EXPENSE"], groups: ["CONTRA_COGS"] },
  OTHER_INCOME: { types: ["REVENUE"], groups: ["OTHER_INCOME"] },
  COST_OF_GOODS_SOLD: { types: ["EXPENSE"], groups: ["COST_OF_GOODS_SOLD"] },
  DEPRECIATION_EXPENSE: { types: ["EXPENSE"] },
  BANK_FEE: { types: ["EXPENSE"] },
  LOSS_ON_DISPOSAL: { types: ["EXPENSE"] },
  GAIN_ON_DISPOSAL: { types: ["REVENUE"], groups: ["OTHER_INCOME"] },
  RETAINED_EARNINGS: { types: ["EQUITY"], groups: ["EQUITY"] },
  OPENING_BALANCE: { types: ["EQUITY"], groups: ["EQUITY"] },
  EQUITY: { types: ["EQUITY"], groups: ["EQUITY"] },
  OTHER_EXPENSE: { types: ["EXPENSE"] },
};

export function deriveNormalBalance(type: AccountType, reportGroup: ReportGroup): NormalBalance {
  if (reportGroup === "CONTRA_REVENUE") return "DEBIT";
  if (reportGroup === "CONTRA_COGS" || reportGroup === "ACCUMULATED_DEPRECIATION") return "CREDIT";
  return type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT";
}

function assertRoleCompatibility(input: AccountInput): void {
  const role = input.systemRole ?? "NONE";
  if (role === "NONE") return;
  const rule = SYSTEM_ROLE_RULES[role];
  if (!rule.types.includes(input.type)) {
    throw new DomainError("INVALID_INPUT", `Peran sistem ${role} tidak cocok dengan tipe akun ${input.type}.`);
  }
  if (rule.groups && !rule.groups.includes(input.reportGroup)) {
    throw new DomainError("INVALID_INPUT", `Peran sistem ${role} tidak cocok dengan kelompok laporan ${input.reportGroup}.`);
  }
}

export async function listAccountsForOptions(actor: Actor): Promise<AccountOption[]> {
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId, isActive: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      reportGroup: true,
      systemRole: true,
      normalBalance: true,
      isActive: true,
    },
  });
  return accounts.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
    name: account.name,
    code: account.code,
    type: account.type,
    reportGroup: account.reportGroup,
    systemRole: account.systemRole,
    normalBalance: account.normalBalance,
    isActive: account.isActive,
  }));
}

export async function listLeafAccounts(actor: Actor): Promise<AccountOption[]> {
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId, isActive: true, children: { none: {} } },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      reportGroup: true,
      systemRole: true,
      normalBalance: true,
      isActive: true,
    },
  });
  return accounts.map((account) => ({
    value: account.id,
    label: `${account.code} · ${account.name}`,
    name: account.name,
    code: account.code,
    type: account.type,
    reportGroup: account.reportGroup,
    systemRole: account.systemRole,
    normalBalance: account.normalBalance,
    isActive: account.isActive,
  }));
}

export async function getAccountTree(
  actor: Actor,
  filters: { q?: string; type?: AccountType; active?: boolean } = {},
): Promise<AccountNode[]> {
  const accounts = await prisma.glAccount.findMany({
    where: { companyId: actor.companyId },
    orderBy: { code: "asc" },
  });
  const sums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { journalEntry: { companyId: actor.companyId, status: "POSTED" } },
    _sum: { debit: true, credit: true },
  });
  const balanceByAccount = new Map<string, number>();
  for (const row of sums) {
    const debit = Number(row._sum.debit ?? 0);
    const credit = Number(row._sum.credit ?? 0);
    balanceByAccount.set(row.accountId, debit - credit);
  }

  const nodes = new Map<string, AccountNode>();
  for (const account of accounts) {
    nodes.set(account.id, {
      id: account.id,
      code: account.code,
      name: account.name,
      description: account.description,
      type: account.type,
      reportGroup: account.reportGroup,
      normalBalance: account.normalBalance,
      systemRole: account.systemRole,
      parentId: account.parentId,
      level: account.level,
      isActive: account.isActive,
      hasChildren: false,
      balance: balanceByAccount.get(account.id) ?? 0,
      children: [],
    });
  }

  const roots: AccountNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      const parent = nodes.get(node.parentId);
      if (parent) parent.hasChildren = true;
      parent?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const query = filters.q?.trim().toLowerCase();
  function matches(node: AccountNode): boolean {
    if (filters.active !== undefined && node.isActive !== filters.active) return false;
    if (filters.type && node.type !== filters.type) return false;
    if (query && !`${node.code} ${node.name}`.toLowerCase().includes(query)) return false;
    return true;
  }
  function prune(node: AccountNode): AccountNode | null {
    const children = node.children.map(prune).filter((child): child is AccountNode => child !== null);
    if (matches(node) || children.length > 0) return { ...node, children };
    return null;
  }
  return roots.map(prune).filter((node): node is AccountNode => node !== null);
}

export async function flattenAccounts(tree: AccountNode[]): Promise<AccountNode[]> {
  const out: AccountNode[] = [];
  function walk(nodes: AccountNode[]) {
    for (const node of nodes) {
      out.push(node);
      walk(node.children);
    }
  }
  walk(tree);
  return out;
}

async function validateParent(tx: Tx, companyId: string, parentId: string | null | undefined): Promise<{ level: number }> {
  if (!parentId) return { level: 1 };
  const parent = await tx.glAccount.findFirst({
    where: { id: parentId, companyId },
    select: { id: true, level: true, code: true },
  });
  if (!parent) throw new DomainError("INVALID_INPUT", "Akun induk tidak ditemukan.");
  if (parent.level >= 5) throw new DomainError("INVALID_INPUT", "Kedalaman bagan akun maksimal 5 level.");
  const posted = await tx.journalLine.count({ where: { accountId: parent.id } });
  if (posted > 0) {
    throw new DomainError("INVALID_INPUT", "Akun induk sudah memiliki jurnal; tidak dapat dijadikan induk.");
  }
  return { level: parent.level + 1 };
}

export async function createAccount(tx: Tx, actor: Actor, input: AccountInput): Promise<{ id: string; code: string }> {
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || code.length > 20) throw new DomainError("INVALID_INPUT", "Kode akun wajib diisi, maksimal 20 karakter.");
  if (!name || name.length > 120) throw new DomainError("INVALID_INPUT", "Nama akun wajib diisi, maksimal 120 karakter.");
  assertRoleCompatibility(input);

  const duplicate = await tx.glAccount.findUnique({
    where: { companyId_code: { companyId: actor.companyId, code } },
    select: { id: true },
  });
  if (duplicate) throw new DomainError("DUPLICATE", `Kode akun ${code} sudah dipakai.`);

  const { level } = await validateParent(tx, actor.companyId, input.parentId);
  const normalBalance = deriveNormalBalance(input.type, input.reportGroup);

  const account = await tx.glAccount.create({
    data: {
      companyId: actor.companyId,
      code,
      name,
      description: input.description?.trim() || null,
      type: input.type,
      reportGroup: input.reportGroup,
      normalBalance,
      systemRole: input.systemRole ?? "NONE",
      parentId: input.parentId ?? null,
      level,
    },
    select: { id: true, code: true },
  });

  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "CREATE",
    entityType: "GlAccount",
    entityId: account.id,
    summary: `Menambah akun ${code} ${name}`,
  });
  return account;
}

export async function updateAccount(
  tx: Tx,
  actor: Actor,
  accountId: string,
  input: AccountInput,
): Promise<void> {
  const existing = await tx.glAccount.findFirst({
    where: { id: accountId, companyId: actor.companyId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      type: true,
      reportGroup: true,
      systemRole: true,
      parentId: true,
      level: true,
    },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Akun tidak ditemukan.");

  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || code.length > 20) throw new DomainError("INVALID_INPUT", "Kode akun wajib diisi, maksimal 20 karakter.");
  if (!name || name.length > 120) throw new DomainError("INVALID_INPUT", "Nama akun wajib diisi, maksimal 120 karakter.");

  const structuralChange =
    code !== existing.code ||
    input.type !== existing.type ||
    input.reportGroup !== existing.reportGroup ||
    (input.systemRole ?? "NONE") !== existing.systemRole ||
    (input.parentId ?? null) !== existing.parentId;

  if (existing.systemRole !== "NONE" && structuralChange) {
    throw new DomainError(
      "INVALID_INPUT",
      "Akun sistem hanya boleh diubah nama/keterangannya. Buat akun baru lalu petakan ulang.",
    );
  }

  const lineCount = await tx.journalLine.count({ where: { accountId } });
  if (lineCount > 0 && (input.type !== existing.type || input.reportGroup !== existing.reportGroup)) {
    throw new DomainError("INVALID_INPUT", "Akun sudah memiliki jurnal; tipe dan kelompok laporan tidak dapat diubah.");
  }

  assertRoleCompatibility(input);
  if (code !== existing.code) {
    const duplicate = await tx.glAccount.findUnique({
      where: { companyId_code: { companyId: actor.companyId, code } },
      select: { id: true },
    });
    if (duplicate) throw new DomainError("DUPLICATE", `Kode akun ${code} sudah dipakai.`);
  }

  let level = existing.level;
  if ((input.parentId ?? null) !== existing.parentId) {
    if (input.parentId === accountId) throw new DomainError("INVALID_INPUT", "Akun tidak dapat menjadi induk dirinya sendiri.");
    const children = await tx.glAccount.findMany({ where: { parentId: accountId }, select: { id: true } });
    const parentResult = await validateParent(tx, actor.companyId, input.parentId);
    if (children.length > 0 && parentResult.level + 1 > 5) {
      throw new DomainError("INVALID_INPUT", "Kedalaman bagan akun maksimal 5 level.");
    }
    level = parentResult.level;
  }

  const normalBalance = deriveNormalBalance(input.type, input.reportGroup);
  await tx.glAccount.update({
    where: { id: accountId },
    data: {
      code,
      name,
      description: input.description?.trim() || null,
      type: input.type,
      reportGroup: input.reportGroup,
      normalBalance,
      systemRole: input.systemRole ?? "NONE",
      parentId: input.parentId ?? null,
      level,
    },
  });

  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "UPDATE",
    entityType: "GlAccount",
    entityId: accountId,
    summary: `Mengubah akun ${existing.code} → ${code} ${name}`,
  });
}

export async function setAccountActive(
  tx: Tx,
  actor: Actor,
  accountId: string,
  isActive: boolean,
): Promise<void> {
  const account = await tx.glAccount.findFirst({
    where: { id: accountId, companyId: actor.companyId },
    select: { id: true, code: true, name: true, systemRole: true, isActive: true },
  });
  if (!account) throw new DomainError("NOT_FOUND", "Akun tidak ditemukan.");
  if (account.isActive === isActive) return;

  if (!isActive) {
    if (account.systemRole !== "NONE") {
      throw new DomainError("INVALID_INPUT", "Akun sistem tidak dapat dinonaktifkan.");
    }
    const activeChildren = await tx.glAccount.count({ where: { parentId: accountId, isActive: true } });
    if (activeChildren > 0) {
      throw new DomainError("INVALID_INPUT", "Nonaktifkan akun turunan terlebih dahulu.");
    }
    const activeBank = await tx.bankAccount.count({ where: { coaAccountId: accountId, isActive: true } });
    if (activeBank > 0) {
      throw new DomainError("INVALID_INPUT", "Rekening bank yang terkait masih aktif. Nonaktifkan rekeningnya dahulu.");
    }
  }

  await tx.glAccount.update({ where: { id: accountId }, data: { isActive } });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    entityType: "GlAccount",
    entityId: accountId,
    summary: `${isActive ? "Mengaktifkan" : "Menonaktifkan"} akun ${account.code} ${account.name}`,
  });
}

export async function getAccountByCode(tx: Tx, companyId: string, code: string) {
  const account = await tx.glAccount.findUnique({
    where: { companyId_code: { companyId, code } },
    select: { id: true, code: true, name: true, systemRole: true, isActive: true },
  });
  if (!account) throw new DomainError("INVALID_INPUT", `Akun ${code} tidak ditemukan pada perusahaan ini.`);
  return account;
}
