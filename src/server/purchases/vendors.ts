import { prisma, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import type { Actor } from "@/lib/types";
import type { VendorView } from "@/lib/dto";

export interface VendorInput {
  name: string;
  npwp?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactPerson?: string | null;
}

function validate(input: VendorInput) {
  const name = input.name.trim();
  if (!name || name.length > 120) throw new DomainError("INVALID_INPUT", "Nama vendor wajib diisi, maksimal 120 karakter.");
  return name;
}

export async function listVendors(
  actor: Actor,
  filters: { q?: string; includeInactive?: boolean } = {},
): Promise<VendorView[]> {
  const vendors = await prisma.vendor.findMany({
    where: {
      companyId: actor.companyId,
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.q?.trim()
        ? {
            OR: [
              { name: { contains: filters.q.trim(), mode: "insensitive" } },
              { npwp: { contains: filters.q.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
  });
  return vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    npwp: vendor.npwp,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    contactPerson: vendor.contactPerson,
    isActive: vendor.isActive,
    invoiceCount: vendor._count.invoices,
  }));
}

export async function createVendor(tx: Tx, actor: Actor, input: VendorInput): Promise<{ id: string }> {
  const name = validate(input);
  const vendor = await tx.vendor.create({
    data: {
      companyId: actor.companyId,
      name,
      npwp: input.npwp?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      contactPerson: input.contactPerson?.trim() || null,
    },
    select: { id: true },
  });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "CREATE",
    entityType: "Vendor",
    entityId: vendor.id,
    summary: `Menambah vendor ${name}`,
  });
  return vendor;
}

export async function updateVendor(tx: Tx, actor: Actor, vendorId: string, input: VendorInput): Promise<void> {
  const existing = await tx.vendor.findFirst({ where: { id: vendorId, companyId: actor.companyId }, select: { id: true } });
  if (!existing) throw new DomainError("NOT_FOUND", "Vendor tidak ditemukan.");
  const name = validate(input);
  await tx.vendor.update({
    where: { id: vendorId },
    data: {
      name,
      npwp: input.npwp?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      contactPerson: input.contactPerson?.trim() || null,
    },
  });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "UPDATE",
    entityType: "Vendor",
    entityId: vendorId,
    summary: `Mengubah vendor ${name}`,
  });
}

export async function setVendorActive(tx: Tx, actor: Actor, vendorId: string, isActive: boolean): Promise<void> {
  const existing = await tx.vendor.findFirst({
    where: { id: vendorId, companyId: actor.companyId },
    select: { id: true, name: true },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Vendor tidak ditemukan.");
  await tx.vendor.update({ where: { id: vendorId }, data: { isActive } });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    entityType: "Vendor",
    entityId: vendorId,
    summary: `${isActive ? "Mengaktifkan" : "Menonaktifkan"} vendor ${existing.name}`,
  });
}
