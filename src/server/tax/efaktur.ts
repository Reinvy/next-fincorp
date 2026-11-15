import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { monthBounds } from "@/lib/dates";
import type { Actor, TaxInvoiceStatus } from "@/lib/types";
import type { SalesInvoiceListItem } from "@/lib/dto";

export interface EfakturRow {
  id: string;
  number: string;
  date: string;
  customerName: string;
  customerNpwp: string | null;
  grandTotal: number;
  taxInvoiceNumber: string | null;
  taxInvoiceDate: string | null;
  taxInvoiceStatus: TaxInvoiceStatus;
  canUpdate: boolean;
}

export async function listEfakturInvoices(
  actor: Actor,
  filters: { period?: string; status?: TaxInvoiceStatus; q?: string } = {},
): Promise<EfakturRow[]> {
  const where = {
    companyId: actor.companyId,
    status: { notIn: ["DRAFT", "VOID"] as Array<"DRAFT" | "VOID"> },
    ...(filters.status ? { taxInvoiceStatus: filters.status } : {}),
    ...(filters.period
      ? (() => {
          const { start, end } = monthBounds(filters.period!);
          return { date: { gte: start, lte: end } };
        })()
      : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { number: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { taxInvoiceNumber: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { customer: { name: { contains: filters.q.trim(), mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const invoices = await prisma.salesInvoice.findMany({
    where,
    orderBy: [{ date: "desc" }, { number: "desc" }],
    take: 200,
    include: { customer: { select: { name: true, npwp: true } }, company: { select: { isPkp: true } } },
  });
  return invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    date: invoice.date.toISOString().slice(0, 10),
    customerName: invoice.customer.name,
    customerNpwp: invoice.customer.npwp,
    grandTotal: D(invoice.grandTotal).toNumber(),
    taxInvoiceNumber: invoice.taxInvoiceNumber,
    taxInvoiceDate: invoice.taxInvoiceDate?.toISOString().slice(0, 10) ?? null,
    taxInvoiceStatus: invoice.taxInvoiceStatus,
    canUpdate: invoice.company.isPkp && invoice.taxInvoiceStatus !== "CANCELLED",
  }));
}

/** Rows for dashboards that need overdue tax invoices. */
export async function lateTaxInvoices(actor: Actor): Promise<SalesInvoiceListItem[]> {
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId: actor.companyId,
      taxInvoiceStatus: { in: ["NONE", "DRAFT"] },
      status: { in: ["UNPAID", "PARTIAL"] },
    },
    orderBy: { date: "asc" },
    take: 5,
    include: { customer: { select: { name: true } } },
  });
  return invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    date: invoice.date.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    customerName: invoice.customer.name,
    status: invoice.status,
    grandTotal: D(invoice.grandTotal).toNumber(),
    paidAmount: D(invoice.paidAmount).toNumber(),
    creditedAmount: D(invoice.creditedAmount).toNumber(),
    outstanding: D(invoice.grandTotal).minus(D(invoice.paidAmount)).minus(D(invoice.creditedAmount)).toNumber(),
    overdue: false,
    taxInvoiceStatus: invoice.taxInvoiceStatus,
  }));
}
