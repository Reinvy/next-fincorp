import { prisma } from "@/lib/prisma";
import { D } from "@/lib/money";
import { daysBetween } from "@/lib/dates";
import type { Actor } from "@/lib/types";

export type AgingBuckets = {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  over90: number;
  total: number;
};

export interface AgingInvoiceRow {
  id: string;
  number: string;
  partyName: string;
  date: string;
  dueDate: string;
  outstanding: number;
  daysOverdue: number;
  bucket: keyof Omit<AgingBuckets, "total">;
}

export interface AgingPartyRow extends AgingBuckets {
  partyId: string;
  partyName: string;
  invoices: AgingInvoiceRow[];
}

export interface AgingReport {
  asOf: Date;
  type: "AR" | "AP";
  parties: AgingPartyRow[];
  totals: AgingBuckets;
}

export function bucketFor(daysOverdue: number): keyof Omit<AgingBuckets, "total"> {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "d1_30";
  if (daysOverdue <= 60) return "d31_60";
  if (daysOverdue <= 90) return "d61_90";
  return "over90";
}

export async function getAgingReport(actor: Actor, options: { type: "AR" | "AP"; asOf: Date }): Promise<AgingReport> {
  const parties = new Map<string, AgingPartyRow>();
  const invoices: AgingInvoiceRow[] = [];

  if (options.type === "AR") {
    const rows = await prisma.salesInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] } },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
    });
    for (const invoice of rows) {
      const outstanding = D(invoice.grandTotal).minus(D(invoice.paidAmount)).minus(D(invoice.creditedAmount));
      if (!outstanding.greaterThan(0)) continue;
      const daysOverdue = daysBetween(invoice.dueDate, options.asOf);
      invoices.push({
        id: invoice.id,
        number: invoice.number,
        partyName: invoice.customer.name,
        date: invoice.date.toISOString().slice(0, 10),
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        outstanding: outstanding.toNumber(),
        daysOverdue,
        bucket: bucketFor(daysOverdue),
      });
      const party = parties.get(invoice.customerId) ?? {
        partyId: invoice.customerId,
        partyName: invoice.customer.name,
        current: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        over90: 0,
        total: 0,
        invoices: [],
      };
      party[bucketFor(daysOverdue)] += outstanding.toNumber();
      party.total += outstanding.toNumber();
      party.invoices.push(invoices[invoices.length - 1]);
      parties.set(invoice.customerId, party);
    }
  } else {
    const rows = await prisma.purchaseInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] } },
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
    });
    for (const invoice of rows) {
      const outstanding = D(invoice.grandTotal).minus(D(invoice.paidAmount)).minus(D(invoice.creditedAmount));
      if (!outstanding.greaterThan(0)) continue;
      const daysOverdue = daysBetween(invoice.dueDate, options.asOf);
      invoices.push({
        id: invoice.id,
        number: invoice.number,
        partyName: invoice.vendor.name,
        date: invoice.date.toISOString().slice(0, 10),
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        outstanding: outstanding.toNumber(),
        daysOverdue,
        bucket: bucketFor(daysOverdue),
      });
      const party = parties.get(invoice.vendorId) ?? {
        partyId: invoice.vendorId,
        partyName: invoice.vendor.name,
        current: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        over90: 0,
        total: 0,
        invoices: [],
      };
      party[bucketFor(daysOverdue)] += outstanding.toNumber();
      party.total += outstanding.toNumber();
      party.invoices.push(invoices[invoices.length - 1]);
      parties.set(invoice.vendorId, party);
    }
  }

  const totals: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0, total: 0 };
  for (const party of parties.values()) {
    totals.current += party.current;
    totals.d1_30 += party.d1_30;
    totals.d31_60 += party.d31_60;
    totals.d61_90 += party.d61_90;
    totals.over90 += party.over90;
    totals.total += party.total;
  }

  return {
    asOf: options.asOf,
    type: options.type,
    parties: Array.from(parties.values()).sort((a, b) => b.total - a.total),
    totals,
  };
}
