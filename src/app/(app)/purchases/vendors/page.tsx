import { requireActorPage } from "@/lib/access";
import { listVendors } from "@/server/purchases/vendors";
import { firstValue } from "@/lib/params";
import { PurchaseTabs } from "@/components/layout/PurchaseTabs";
import { VendorActiveButton, VendorDialog } from "@/components/forms/VendorDialog";
import { PageHeader, PaperCard, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendor" };

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q)?.trim();
  const includeInactive = firstValue(params.inactive) === "1";
  const { actor, activeCompany } = await requireActorPage();
  const vendors = await listVendors(actor, { q, includeInactive });
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Vendor"
        description="Data vendor dipakai pada faktur pembelian dan laporan utang."
        actions={canEdit ? <VendorDialog triggerLabel="Tambah vendor" /> : undefined}
      />
      <PurchaseTabs />

      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/purchases/vendors" resetHref="/purchases/vendors">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nama atau NPWP" className="h-9" />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-xs text-ink-soft">
            <input type="checkbox" name="inactive" value="1" defaultChecked={includeInactive} className="h-4 w-4 accent-[var(--color-forest)]" />
            Tampilkan nonaktif
          </label>
        </SearchFilterBar>

        <DataTable
          caption="Daftar vendor"
          rows={vendors}
          getRowKey={(row) => row.id}
          minWidth={780}
          empty={<div className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada vendor.</div>}
          columns={[
            { key: "name", header: "Nama", render: (row) => <span className="font-medium text-ink">{row.name}</span> },
            { key: "npwp", header: "NPWP", render: (row) => <span className="font-mono text-xs">{row.npwp ?? "—"}</span> },
            { key: "contact", header: "Kontak", render: (row) => <span className="text-ink-soft">{row.contactPerson ?? row.email ?? "—"}</span> },
            { key: "phone", header: "Telepon", render: (row) => <span className="font-mono text-xs">{row.phone ?? "—"}</span> },
            { key: "invoices", header: "Faktur", align: "right", render: (row) => String(row.invoiceCount ?? 0) },
            {
              key: "status",
              header: "Status",
              render: (row) => (row.isActive ? <StatusStamp kind="period" status="OPEN" label="Aktif" /> : <StatusStamp kind="period" status="CLOSED" label="Nonaktif" />),
            },
            {
              key: "actions",
              header: "Aksi",
              align: "right",
              render: (row) =>
                canEdit ? (
                  <div className="flex items-center justify-end gap-1">
                    <VendorDialog initial={row} triggerLabel="Ubah" variant="ghost" size="sm" />
                    <VendorActiveButton vendor={row} />
                  </div>
                ) : null,
            },
          ]}
        />
        <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {vendors.length} vendor
        </p>
      </PaperCard>
    </>
  );
}
