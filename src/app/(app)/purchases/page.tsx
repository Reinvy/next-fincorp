import { requireActorPage } from "@/lib/access";
import { getPurchaseSummary, listPurchaseInvoices } from "@/server/purchases/invoices";
import { getAgingReport } from "@/server/accounting/aging";
import { dateFromISO, formatDateID, monthBounds, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { DOCUMENT_STATUS_LABELS, PAGE_SIZE, WITHHOLDING_LABELS } from "@/lib/constants";
import type { DocumentStatus } from "@/lib/types";
import { firstValue } from "@/lib/params";
import { PurchaseTabs } from "@/components/layout/PurchaseTabs";
import { ActionLink, KpiCard, PageHeader, PaperCard, SectionRule, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pembelian" };

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const q = firstValue(params.q)?.trim();
  const rawStatus = firstValue(params.status);
  const statusValues = Object.keys(DOCUMENT_STATUS_LABELS) as DocumentStatus[];
  const status = rawStatus && statusValues.includes(rawStatus as DocumentStatus) ? (rawStatus as DocumentStatus) : undefined;
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);
  const today = dateFromISO(todayISO());
  const month = monthBounds(todayISO().slice(0, 7));

  const [result, summary, aging] = await Promise.all([
    listPurchaseInvoices(actor, {
      q,
      status,
      from: rawFrom ? dateFromISO(rawFrom) : undefined,
      to: rawTo ? dateFromISO(rawTo) : undefined,
      page,
    }),
    getPurchaseSummary(actor, month),
    getAgingReport(actor, { type: "AP", asOf: today }),
  ]);
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Pembelian"
        description="Faktur vendor, potongan PPh, pembayaran, dan nota debit."
        actions={canEdit ? <ActionLink href="/purchases/new">Faktur pembelian</ActionLink> : undefined}
      />
      <PurchaseTabs />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Utang beredar" value={formatIDR(summary.outstanding)} note={`${summary.openCount} faktur terbuka`} index="01" />
        <KpiCard label="Lewat jatuh tempo" value={formatIDR(summary.overdueOutstanding)} note="Termasuk sebagian dibayar" index="02" tone="vermilion" />
        <KpiCard label="Kas keluar bulan ini" value={formatIDR(summary.paidThisMonth)} note={formatDateID(month.start)} index="03" tone="forest" />
        <KpiCard label="Draf" value={String(summary.draftCount)} note="Belum memengaruhi laporan" index="04" tone="mustard" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PaperCard className="overflow-hidden">
          <div className="border-b border-rule px-4 py-3">
            <SectionRule label="Daftar faktur pembelian" />
          </div>
          <SearchFilterBar action="/purchases" resetHref="/purchases">
            <Field label="Cari" htmlFor="q">
              <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nomor atau vendor" className="h-9" />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" name="status" defaultValue={status ?? ""} className="h-9">
                <option value="">Semua status</option>
                {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Dari" htmlFor="from">
              <Input id="from" name="from" type="date" defaultValue={rawFrom ?? ""} className="h-9" />
            </Field>
            <Field label="Sampai" htmlFor="to">
              <Input id="to" name="to" type="date" defaultValue={rawTo ?? ""} className="h-9" />
            </Field>
          </SearchFilterBar>
          <DataTable
            caption="Daftar faktur pembelian"
            rows={result.rows}
            getRowKey={(row) => row.id}
            rowHref={(row) => `/purchases/${row.id}`}
            minWidth={1020}
            columns={[
              { key: "number", header: "Nomor", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
              { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
              { key: "vendor", header: "Vendor", render: (row) => <span className="block max-w-[180px] truncate" title={row.vendorName}>{row.vendorName}</span> },
              { key: "dueDate", header: "Jatuh tempo", render: (row) => <span className={`font-mono text-xs ${row.overdue ? "text-vermilion" : ""}`}>{formatDateID(row.dueDate)}</span> },
              { key: "total", header: "Total", align: "right", render: (row) => formatIDR(row.grandTotal) },
              { key: "outstanding", header: "Sisa", align: "right", render: (row) => formatIDR(row.outstanding) },
              {
                key: "withholding",
                header: "PPh",
                render: (row) =>
                  row.withholdingType === "NONE" ? (
                    <span className="text-xs text-ink-faint">—</span>
                  ) : (
                    <span className="text-xs">{WITHHOLDING_LABELS[row.withholdingType] ?? row.withholdingType}</span>
                  ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => (
                  <span className="flex flex-wrap gap-1">
                    <StatusStamp status={row.status} />
                    {row.overdue ? <StatusStamp kind="overdue" status="OVERDUE" /> : null}
                  </span>
                ),
              },
            ]}
          />
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/purchases" searchParams={{ q, status, from: rawFrom, to: rawTo }} />
          <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            {result.total} faktur · {PAGE_SIZE} per halaman
          </p>
        </PaperCard>

        <div className="space-y-4">
          <PaperCard className="p-4">
            <SectionRule label="Umur utang" />
            <p className="mt-1 text-xs text-ink-faint">Per {formatDateID(aging.asOf)}</p>
            <table className="ledger-table mt-3">
              <caption className="sr-only">Ringkasan umur utang</caption>
              <tbody>
                {[
                  ["Belum jatuh tempo", aging.totals.current],
                  ["1–30 hari", aging.totals.d1_30],
                  ["31–60 hari", aging.totals.d31_60],
                  ["61–90 hari", aging.totals.d61_90],
                  ["> 90 hari", aging.totals.over90],
                ].map(([label, value]) => (
                  <tr key={String(label)}>
                    <td className="text-ink-soft">{label}</td>
                    <td className="num">{formatIDR(Number(value))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="double-rule">
                  <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink">Total</td>
                  <td className="num px-3 py-2 font-medium">{formatIDR(aging.totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </PaperCard>
          <PaperCard className="p-4">
            <SectionRule label="Pintasan" />
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><ActionLink href="/purchases/vendors" variant="ghost" size="sm">Vendor</ActionLink></li>
              <li><ActionLink href="/purchases/debit-notes" variant="ghost" size="sm">Nota debit</ActionLink></li>
              <li><ActionLink href="/tax" variant="ghost" size="sm">Pajak &amp; PPh</ActionLink></li>
              <li><ActionLink href="/reports/aging" variant="ghost" size="sm">Laporan utang</ActionLink></li>
            </ul>
          </PaperCard>
        </div>
      </div>
    </>
  );
}
