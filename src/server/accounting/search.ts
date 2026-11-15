import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/types";

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  items: SearchItem[];
}

export async function searchCompany(actor: Actor, rawQuery: string): Promise<SearchGroup[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  const [invoices, purchases, customers, vendors, journals, assets, accounts] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { companyId: actor.companyId, OR: [{ number: contains }, { customer: { name: contains } }] },
      include: { customer: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId: actor.companyId, OR: [{ number: contains }, { vendor: { name: contains } }] },
      include: { vendor: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.customer.findMany({
      where: { companyId: actor.companyId, OR: [{ name: contains }, { npwp: contains }] },
      take: 5,
    }),
    prisma.vendor.findMany({
      where: { companyId: actor.companyId, OR: [{ name: contains }, { npwp: contains }] },
      take: 5,
    }),
    prisma.journalEntry.findMany({
      where: { companyId: actor.companyId, OR: [{ number: contains }, { description: contains }, { reference: contains }] },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.fixedAsset.findMany({
      where: { companyId: actor.companyId, OR: [{ code: contains }, { name: contains }] },
      take: 5,
    }),
    prisma.glAccount.findMany({
      where: { companyId: actor.companyId, OR: [{ code: contains }, { name: contains }] },
      orderBy: { code: "asc" },
      take: 5,
    }),
  ]);

  const groups: SearchGroup[] = [
    {
      key: "sales",
      label: "Faktur penjualan",
      items: invoices.map((invoice) => ({
        id: invoice.id,
        title: invoice.number,
        subtitle: `${invoice.customer.name} · ${invoice.status}`,
        href: `/sales/${invoice.id}`,
      })),
    },
    {
      key: "purchases",
      label: "Faktur pembelian",
      items: purchases.map((invoice) => ({
        id: invoice.id,
        title: invoice.number,
        subtitle: `${invoice.vendor.name} · ${invoice.status}`,
        href: `/purchases/${invoice.id}`,
      })),
    },
    {
      key: "customers",
      label: "Pelanggan",
      items: customers.map((customer) => ({
        id: customer.id,
        title: customer.name,
        subtitle: customer.npwp ?? "Tanpa NPWP",
        href: "/sales/customers",
      })),
    },
    {
      key: "vendors",
      label: "Vendor",
      items: vendors.map((vendor) => ({
        id: vendor.id,
        title: vendor.name,
        subtitle: vendor.npwp ?? "Tanpa NPWP",
        href: "/purchases/vendors",
      })),
    },
    {
      key: "journals",
      label: "Jurnal",
      items: journals.map((journal) => ({
        id: journal.id,
        title: journal.number,
        subtitle: journal.description,
        href: `/accounting/journal/${journal.id}`,
      })),
    },
    {
      key: "assets",
      label: "Aset tetap",
      items: assets.map((asset) => ({
        id: asset.id,
        title: `${asset.code} · ${asset.name}`,
        subtitle: asset.category,
        href: `/fixed-assets/${asset.id}`,
      })),
    },
    {
      key: "accounts",
      label: "Akun",
      items: accounts.map((account) => ({
        id: account.id,
        title: `${account.code} · ${account.name}`,
        subtitle: account.type,
        href: "/accounting/coa",
      })),
    },
  ];

  return groups
    .filter((group) => group.items.length > 0)
    .map((group) => ({ ...group, items: group.items.slice(0, 5) }))
    .slice(0, 6);
}
