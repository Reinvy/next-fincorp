import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { listPurchaseDebitNotes } from "@/server/purchases/debit-notes";
import { formatDateID } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { PurchaseTabs } from "@/components/layout/PurchaseTabs";
import { PageHeader, PaperCard } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nota Debit" };

export default async function PurchaseDebitNotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q)?.trim();
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);
  const { actor, activeCompany } = await requireActorPage();
  const result = await listPurchaseDebitNotes(actor, { q, page });

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Nota Debit"
        description="Retur pembelian yang mengurangi utang vendor dan potongan pajak berikutnya."
      />
      <PurchaseTabs />

      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/purchases/debit-notes" resetHref="/purchases/debit-notes">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nomor nota, faktur, vendor" className="h-9" />
          </Field>
        </SearchFilterBar>

        <DataTable
          caption="Daftar nota debit pembelian"
          rows={result.rows}
          getRowKey={(row) => row.id}
          rowHref={(row) => `/purchases/${row.invoiceId}`}
          minWidth={860}
          empty={<div className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada nota debit.</div>}
          columns={[
            { key: "number", header: "Nomor", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
            { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
            { key: "party", header: "Vendor", render: (row) => row.partyName },
            {
              key: "invoice",
              header: "Faktur",
              render: (row) => (
                <Link href={`/purchases/${row.invoiceId}`} className="font-mono text-xs text-forest underline underline-offset-4">
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
        <Pagination page={result.page} totalPages={result.totalPages} basePath="/purchases/debit-notes" searchParams={{ q }} />
        <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {result.total} nota debit
        </p>
      </PaperCard>
    </>
  );
}
