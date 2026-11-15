import { prisma, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import type { Actor } from "@/lib/types";
import type { CustomerView } from "@/lib/dto";

export interface CustomerInput {
  name: string;
  npwp?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactPerson?: string | null;
}

function validate(input: CustomerInput) {
  const name = input.name.trim();
  if (!name || name.length > 120) throw new DomainError("INVALID_INPUT", "Nama pelanggan wajib diisi, maksimal 120 karakter.");
  return name;
}

export async function listCustomers(
  actor: Actor,
  filters: { q?: string; includeInactive?: boolean } = {},
): Promise<CustomerView[]> {
  const customers = await prisma.customer.findMany({
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
  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    npwp: customer.npwp,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    contactPerson: customer.contactPerson,
    isActive: customer.isActive,
    invoiceCount: customer._count.invoices,
  }));
}

export async function createCustomer(tx: Tx, actor: Actor, input: CustomerInput): Promise<{ id: string }> {
  const name = validate(input);
  const customer = await tx.customer.create({
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
    entityType: "Customer",
    entityId: customer.id,
    summary: `Menambah pelanggan ${name}`,
  });
  return customer;
}

export async function updateCustomer(tx: Tx, actor: Actor, customerId: string, input: CustomerInput): Promise<void> {
  const existing = await tx.customer.findFirst({ where: { id: customerId, companyId: actor.companyId }, select: { id: true } });
  if (!existing) throw new DomainError("NOT_FOUND", "Pelanggan tidak ditemukan.");
  const name = validate(input);
  await tx.customer.update({
    where: { id: customerId },
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
    entityType: "Customer",
    entityId: customerId,
    summary: `Mengubah pelanggan ${name}`,
  });
}

export async function setCustomerActive(tx: Tx, actor: Actor, customerId: string, isActive: boolean): Promise<void> {
  const existing = await tx.customer.findFirst({
    where: { id: customerId, companyId: actor.companyId },
    select: { id: true, name: true },
  });
  if (!existing) throw new DomainError("NOT_FOUND", "Pelanggan tidak ditemukan.");
  await tx.customer.update({ where: { id: customerId }, data: { isActive } });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    entityType: "Customer",
    entityId: customerId,
    summary: `${isActive ? "Mengaktifkan" : "Menonaktifkan"} pelanggan ${existing.name}`,
  });
}
