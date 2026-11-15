import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { listEfakturInvoices } from "@/server/tax/efaktur";
import { formatDateID, formatMonthID, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { TAX_INVOICE_STATUS_LABELS } from "@/lib/constants";
import type { TaxInvoiceStatus } from "@/lib/types";
import { firstValue } from "@/lib/params";
import { PageHeader, PaperCard, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { TaxInvoiceDialog } from "@/components/forms/SalesDialogs";
import { DownloadLink } from "@/components/ui/download-link";
import { buttonStyles } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "e-Faktur" };

export default async function EfakturPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const rawPeriod = firstValue(params.period);
  const period = rawPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawPeriod) ? rawPeriod : todayISO().slice(0, 7);
  const rawStatus = firstValue(params.status);
  const status =
    rawStatus && rawStatus in TAX_INVOICE_STATUS_LABELS ? (rawStatus as TaxInvoiceStatus) : undefined;
  const q = firstValue(params.q)?.trim();
  const rows = await listEfakturInvoices(actor, { period, status, q });
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link href="/tax" className="text-xs text-ink-soft hover:text-ink">
            ← Kembali ke pajak
          </Link>
        }
        eyebrow={activeCompany.companyName}
        title="e-Faktur"
        description="Pencatatan status faktur pajak lokal. Tidak ada koneksi langsung ke DJP."
        actions={
          <DownloadLink href={`/api/export/efaktur?period=${period}`} className={buttonStyles({ variant: "secondary", size: "md" })}>
            CSV
          </DownloadLink>
        }
      />

      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/tax/efaktur" resetHref="/tax/efaktur">
          <Field label="Periode" htmlFor="period">
            <Input id="period" name="period" type="month" defaultValue={period} className="h-9" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={status ?? ""} className="h-9">
              <option value="">Semua status</option>
              {Object.entries(TAX_INVOICE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nomor faktur / pelanggan" className="h-9" />
          </Field>
        </SearchFilterBar>

        <div className="border-b border-rule bg-paper-light px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {formatMonthID(period)} · {rows.length} faktur
        </div>

        <DataTable
          caption="Daftar faktur pajak penjualan"
          rows={rows}
          getRowKey={(row) => row.id}
          rowHref={(row) => `/sales/${row.id}`}
          minWidth={980}
          empty={<div className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada faktur pada periode ini.</div>}
          columns={[
            { key: "number", header: "Faktur", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
            { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
            { key: "customer", header: "Pelanggan", render: (row) => <span className="block max-w-[180px] truncate">{row.customerName}</span> },
            { key: "npwp", header: "NPWP", render: (row) => <span className="font-mono text-xs">{row.customerNpwp ?? "—"}</span> },
            { key: "total", header: "Nilai", align: "right", render: (row) => formatIDR(row.grandTotal) },
            { key: "taxNumber", header: "Nomor pajak", render: (row) => <span className="font-mono text-xs">{row.taxInvoiceNumber ?? "—"}</span> },
            { key: "status", header: "Status", render: (row) => <StatusStamp kind="taxInvoice" status={row.taxInvoiceStatus} /> },
            {
              key: "actions",
              header: "Aksi",
              align: "right",
              render: (row) =>
                canEdit && row.canUpdate ? (
                  <TaxInvoiceDialog
                    invoiceId={row.id}
                    currentStatus={row.taxInvoiceStatus}
                    number={row.taxInvoiceNumber}
                    date={row.taxInvoiceDate}
                  />
                ) : null,
            },
          ]}
        />
      </PaperCard>
    </>
  );
}
