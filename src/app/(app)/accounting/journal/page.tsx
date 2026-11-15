import { requireActorPage } from "@/lib/access";
import { listJournals } from "@/server/accounting/journals";
import { dateFromISO, formatDateID } from "@/lib/dates";
import { JOURNAL_TYPE_LABELS } from "@/lib/constants";
import { PAGE_SIZE } from "@/lib/constants";
import { firstValue } from "@/lib/params";
import { formatIDR } from "@/lib/money";
import { AccountingTabs } from "@/components/layout/AccountingTabs";
import { ActionLink, PageHeader, PaperCard, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jurnal" };

export default async function JournalListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const q = firstValue(params.q)?.trim();
  const rawStatus = firstValue(params.status);
  const status = rawStatus === "DRAFT" || rawStatus === "POSTED" ? rawStatus : undefined;
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const from = rawFrom ? dateFromISO(rawFrom) : undefined;
  const to = rawTo ? dateFromISO(rawTo) : undefined;
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);
  const result = await listJournals(actor, { q, status, from, to, page });

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Jurnal Umum"
        description="Setiap transaksi menghasilkan satu jurnal double-entry. Jurnal terposting tidak dapat diubah, hanya dibalik."
        actions={<ActionLink href="/accounting/journal/new">Jurnal baru</ActionLink>}
      />
      <AccountingTabs />

      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/accounting/journal" resetHref="/accounting/journal">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nomor, keterangan, referensi" className="h-9" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={status ?? ""} className="h-9">
              <option value="">Semua status</option>
              <option value="POSTED">Terposting</option>
              <option value="DRAFT">Draf</option>
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
          caption="Daftar jurnal"
          rows={result.rows}
          getRowKey={(row) => row.id}
          rowHref={(row) => `/accounting/journal/${row.id}`}
          minWidth={860}
          columns={[
            { key: "number", header: "Nomor", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
            { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
            {
              key: "description",
              header: "Keterangan",
              render: (row) => (
                <span className="block max-w-[320px] truncate" title={row.description}>
                  {row.description}
                </span>
              ),
            },
            { key: "type", header: "Tipe", render: (row) => JOURNAL_TYPE_LABELS[row.type] ?? row.type },
            { key: "total", header: "Nilai", align: "right", render: (row) => formatIDR(row.total) },
            { key: "status", header: "Status", render: (row) => <StatusStamp kind="journal" status={row.status} /> },
          ]}
        />
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          basePath="/accounting/journal"
          searchParams={{ q, status, from: rawFrom, to: rawTo }}
        />
      </PaperCard>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        {result.total} jurnal · {PAGE_SIZE} per halaman
      </p>
    </>
  );
}
