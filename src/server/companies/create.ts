import type { Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { D } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { COA_TEMPLATE } from "./template";

export interface CreateCompanyInput {
  name: string;
  slug?: string;
  npwp?: string;
  nib?: string;
  pkpNumber?: string;
  pkpDate?: Date;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  kpp?: string;
  isPkp?: boolean;
  ppnRate?: string | number;
  fiscalYearStartMonth?: number;
  fiscalYearStartDay?: number;
  logoDataUrl?: string;
}

export async function resolveUniqueSlug(tx: Tx, name: string, preferred?: string): Promise<string> {
  const base = (preferred ? slugify(preferred) : "") || slugify(name) || "perusahaan";
  let candidate = base;
  let suffix = 2;
  while (await tx.company.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    const trimmed = base.slice(0, 57).replace(/-+$/, "") || "perusahaan";
    candidate = `${trimmed}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** Insert the full template chart of accounts, parents first, with computed levels. */
export async function createChartOfAccounts(tx: Tx, companyId: string): Promise<void> {
  const idByCode = new Map<string, { id: string; level: number }>();
  for (const account of COA_TEMPLATE) {
    const parent = account.parentCode ? idByCode.get(account.parentCode) : undefined;
    if (account.parentCode && !parent) {
      throw new Error(`Template COA tidak konsisten: parent ${account.parentCode} belum dibuat.`);
    }
    const level = parent ? parent.level + 1 : 1;
    const created = await tx.glAccount.create({
      data: {
        companyId,
        code: account.code,
        name: account.name,
        type: account.type,
        reportGroup: account.reportGroup,
        normalBalance: account.normalBalance,
        systemRole: account.systemRole,
        parentId: parent?.id ?? null,
        level,
      },
      select: { id: true },
    });
    idByCode.set(account.code, { id: created.id, level });
  }
}

export async function createCompanyForUser(
  tx: Tx,
  userId: string,
  input: CreateCompanyInput,
): Promise<{ companyId: string; slug: string }> {
  const name = input.name.trim();
  if (!name) throw new DomainError("INVALID_INPUT", "Nama perusahaan wajib diisi.");

  const slug = await resolveUniqueSlug(tx, name, input.slug);
  const company = await tx.company.create({
    data: {
      name,
      slug,
      npwp: input.npwp,
      nib: input.nib,
      pkpNumber: input.pkpNumber,
      pkpDate: input.pkpDate ?? null,
      address: input.address,
      city: input.city,
      province: input.province,
      postalCode: input.postalCode,
      email: input.email,
      phone: input.phone,
      kpp: input.kpp,
      isPkp: input.isPkp ?? false,
      ppnRate: D(input.ppnRate ?? 11).toFixed(2),
      fiscalYearStartMonth: input.fiscalYearStartMonth ?? 1,
      fiscalYearStartDay: input.fiscalYearStartDay ?? 1,
      logoDataUrl: input.logoDataUrl,
    },
    select: { id: true },
  });

  await tx.companyMember.create({ data: { companyId: company.id, userId, role: "ADMIN" } });
  await createChartOfAccounts(tx, company.id);

  await tx.auditLog.create({
    data: {
      companyId: company.id,
      userId,
      action: "CREATE",
      entityType: "Company",
      entityId: company.id,
      summary: `Membuat perusahaan ${name} beserta bagan akun standar`,
    },
  });

  return { companyId: company.id, slug };
}
