import { requireActorPage } from "@/lib/access";
import { listCustomers } from "@/server/sales/customers";
import { firstValue } from "@/lib/params";
import { SalesTabs } from "@/components/layout/SalesTabs";
import { CustomerActiveButton, CustomerDialog } from "@/components/forms/CustomerDialog";
import { PageHeader, PaperCard, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pelanggan" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q)?.trim();
  const includeInactive = firstValue(params.inactive) === "1";
  const { actor, activeCompany } = await requireActorPage();
  const customers = await listCustomers(actor, { q, includeInactive });
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Pelanggan"
        description="Data pelanggan dipakai pada faktur dan laporan piutang."
        actions={canEdit ? <CustomerDialog triggerLabel="Tambah pelanggan" /> : undefined}
      />
      <SalesTabs />

      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/sales/customers" resetHref="/sales/customers">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nama atau NPWP" className="h-9" />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-xs text-ink-soft">
            <input type="checkbox" name="inactive" value="1" defaultChecked={includeInactive} className="h-4 w-4 accent-[var(--color-forest)]" />
            Tampilkan nonaktif
          </label>
        </SearchFilterBar>

        <DataTable
          caption="Daftar pelanggan"
          rows={customers}
          getRowKey={(row) => row.id}
          minWidth={780}
          empty={<div className="px-6 py-10 text-center text-sm text-ink-soft">Belum ada pelanggan.</div>}
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
                    <CustomerDialog initial={row} triggerLabel="Ubah" variant="ghost" size="sm" />
                    <CustomerActiveButton customer={row} />
                  </div>
                ) : null,
            },
          ]}
        />
        <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {customers.length} pelanggan
        </p>
      </PaperCard>
    </>
  );
}
