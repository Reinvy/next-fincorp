import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { listSalesCreditNotes } from "@/server/sales/credit-notes";
import { formatDateID } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { SalesTabs } from "@/components/layout/SalesTabs";
import { PageHeader, PaperCard } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nota Kredit" };

export default async function SalesCreditNotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q)?.trim();
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);
  const { actor, activeCompany } = await requireActorPage();
  const result = await listSalesCreditNotes(actor, { q, page });

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Nota Kredit"
        description="Retur dan potongan penjualan yang mengurangi piutang dan pendapatan."
      />
      <SalesTabs />

      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/sales/credit-notes" resetHref="/sales/credit-notes">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nomor nota, faktur, pelanggan" className="h-9" />
          </Field>
        </SearchFilterBar>

        <DataTable
          caption="Daftar nota kredit penjualan"
          rows={result.rows}
          getRowKey={(row) => row.id}
          rowHref={(row) => `/sales/${row.invoiceId}`}
          minWidth={860}
          empty={<div className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada nota kredit.</div>}
          columns={[
            { key: "number", header: "Nomor", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
            { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
            { key: "party", header: "Pelanggan", render: (row) => row.partyName },
            {
              key: "invoice",
              header: "Faktur",
              render: (row) => (
                <Link href={`/sales/${row.invoiceId}`} className="font-mono text-xs text-forest underline underline-offset-4">
                  {row.invoiceNumber}
                </Link>
              ),
            },
            { key: "reason", header: "Alasan", render: (row) => <span className="block max-w-[240px] truncate" title={row.reason}>{row.reason}</span> },
            { key: "dpp", header: "DPP", align: "right", render: (row) => formatIDR(row.dpp) },
            { key: "ppn", header: "PPN", align: "right", render: (row) => formatIDR(row.ppnAmount) },
            { key: "total", header: "Total", align: "right", render: (row) => formatIDR(row.total) },
          ]}
        />
        <Pagination page={result.page} totalPages={result.totalPages} basePath="/sales/credit-notes" searchParams={{ q }} />
        <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {result.total} nota kredit
        </p>
      </PaperCard>
    </>
  );
}
