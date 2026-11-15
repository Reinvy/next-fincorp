import { requireActorPage } from "@/lib/access";
import { getAssetCategories, listFixedAssets } from "@/server/assets/assets";
import { listDepreciationRuns } from "@/server/assets/depreciation";
import { formatDateID } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { ASSET_STATUS_LABELS } from "@/lib/constants";
import { firstValue } from "@/lib/params";
import type { AssetStatus } from "@/lib/types";
import { DepreciationDialog } from "@/components/forms/AssetDialogs";
import { ActionLink, KpiCard, PageHeader, PaperCard, SectionRule, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aset Tetap" };

export default async function FixedAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q)?.trim();
  const rawStatus = firstValue(params.status);
  const status = rawStatus && rawStatus in ASSET_STATUS_LABELS ? (rawStatus as AssetStatus) : undefined;
  const category = firstValue(params.category);
  const { actor, activeCompany } = await requireActorPage();
  const [assets, runs, categories] = await Promise.all([
    listFixedAssets(actor, { q, status, category }),
    listDepreciationRuns(actor),
    getAssetCategories(actor),
  ]);
  const canEdit = actor.role !== "VIEWER";
  const active = assets.filter((asset) => asset.status !== "DISPOSED");
  const totalCost = active.reduce((acc, asset) => acc + asset.purchasePrice, 0);
  const totalAccumulated = active.reduce((acc, asset) => acc + asset.accumulatedDepreciation, 0);
  const totalBook = active.reduce((acc, asset) => acc + asset.bookValue, 0);

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Aset Tetap"
        description="Register aset, penyusutan bulanan, dan pelepasan. Semua membentuk jurnal di buku besar."
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <ActionLink href="/fixed-assets/new">Aset baru</ActionLink>
              <DepreciationDialog />
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Harga perolehan" value={formatIDR(totalCost)} note={`${active.length} aset aktif`} index="01" />
        <KpiCard label="Akumulasi" value={formatIDR(totalAccumulated)} note="Penyusutan s.d. hari ini" index="02" tone="mustard" />
        <KpiCard label="Nilai buku" value={formatIDR(totalBook)} note="Perolehan − akumulasi" index="03" tone="forest" />
        <KpiCard label="Penyusutan bulanan" value={formatIDR(active.reduce((acc, asset) => acc + asset.monthlyDepreciation, 0))} note="Estimasi aset aktif" index="04" />
      </div>

      <PaperCard className="mt-6 overflow-hidden">
        <div className="border-b border-rule px-4 py-3">
          <SectionRule label="Register aset" />
        </div>
        <SearchFilterBar action="/fixed-assets" resetHref="/fixed-assets">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Kode atau nama aset" className="h-9" />
          </Field>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={status ?? ""} className="h-9">
              <option value="">Semua status</option>
              {Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Kategori" htmlFor="category">
            <Select id="category" name="category" defaultValue={category ?? ""} className="h-9">
              <option value="">Semua kategori</option>
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </Select>
          </Field>
        </SearchFilterBar>
        <DataTable
          caption="Register aset tetap"
          rows={assets}
          getRowKey={(row) => row.id}
          rowHref={(row) => `/fixed-assets/${row.id}`}
          minWidth={1040}
          columns={[
            { key: "code", header: "Kode", render: (row) => <span className="font-mono text-xs">{row.code}</span> },
            { key: "name", header: "Aset", render: (row) => <span className="block max-w-[220px] truncate" title={row.name}>{row.name}</span> },
            { key: "category", header: "Kategori", render: (row) => row.category },
            { key: "date", header: "Perolehan", render: (row) => <span className="font-mono text-xs">{formatDateID(row.purchaseDate)}</span> },
            { key: "cost", header: "Harga", align: "right", render: (row) => formatIDR(row.purchasePrice) },
            { key: "accumulated", header: "Akumulasi", align: "right", render: (row) => formatIDR(row.accumulatedDepreciation) },
            { key: "book", header: "Nilai buku", align: "right", render: (row) => formatIDR(row.bookValue) },
            { key: "status", header: "Status", render: (row) => <StatusStamp kind="asset" status={row.status} /> },
          ]}
        />
        <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {assets.length} aset
        </p>
      </PaperCard>

      <PaperCard className="mt-4 overflow-hidden">
        <div className="border-b border-rule px-4 py-3">
          <SectionRule label="Riwayat penyusutan" />
        </div>
        <DataTable
          caption="Riwayat menjalankan penyusutan"
          rows={runs}
          getRowKey={(row) => row.id}
          minWidth={620}
          empty={<p className="px-6 py-8 text-center text-sm text-ink-soft">Belum ada penyusutan dijalankan.</p>}
          columns={[
            { key: "period", header: "Periode", render: (row) => <span className="font-mono text-xs">{row.period}</span> },
            { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
            { key: "assets", header: "Aset", align: "right", render: (row) => String(row.assetCount) },
            { key: "total", header: "Total", align: "right", render: (row) => formatIDR(row.totalAmount) },
            { key: "journal", header: "Jurnal", render: (row) => <span className="font-mono text-xs">{row.journalNumber}</span> },
          ]}
        />
      </PaperCard>
    </>
  );
}
