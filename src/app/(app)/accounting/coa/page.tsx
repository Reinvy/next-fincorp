import { requireActorPage } from "@/lib/access";
import { getAccountTree } from "@/server/accounting/accounts";
import type { AccountNode } from "@/lib/dto";
import { ACCOUNT_TYPE_LABELS, REPORT_GROUP_LABELS } from "@/lib/constants";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { AccountingTabs } from "@/components/layout/AccountingTabs";
import { AccountDialog, AccountToggleButton, type ParentOption } from "@/components/forms/AccountDialog";
import { PageHeader, PaperCard, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bagan Akun" };

const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const;

export default async function ChartOfAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q)?.trim();
  const rawType = firstValue(params.type);
  const type = TYPES.includes(rawType as (typeof TYPES)[number]) ? (rawType as (typeof TYPES)[number]) : undefined;
  const rawActive = firstValue(params.active);
  const active = rawActive === "active" ? true : rawActive === "inactive" ? false : undefined;
  const { actor, activeCompany } = await requireActorPage();
  const tree = await getAccountTree(actor, { q, type, active });

  function flatten(nodes: AccountNode[], out: AccountNode[] = []): AccountNode[] {
    for (const node of nodes) {
      out.push(node);
      flatten(node.children, out);
    }
    return out;
  }
  const rows = flatten(tree);
  const parentOptions: ParentOption[] = flatten(await getAccountTree(actor)).map((node) => ({
    id: node.id,
    code: node.code,
    name: node.name,
    level: node.level,
  }));
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Bagan Akun"
        description="Struktur akun lima level. Hanya akun daun aktif yang dapat menerima jurnal."
        actions={canEdit ? <AccountDialog accounts={parentOptions} triggerLabel="Tambah akun" /> : undefined}
      />
      <AccountingTabs />

      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/accounting/coa" resetHref="/accounting/coa">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Kode atau nama akun" className="h-9" />
          </Field>
          <Field label="Tipe" htmlFor="type">
            <Select id="type" name="type" defaultValue={type ?? ""} className="h-9">
              <option value="">Semua tipe</option>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {ACCOUNT_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="active">
            <Select id="active" name="active" defaultValue={rawActive ?? ""} className="h-9">
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </Select>
          </Field>
        </SearchFilterBar>

        <DataTable
          caption="Bagan akun perusahaan"
          rows={rows}
          getRowKey={(row) => row.id}
          minWidth={900}
          empty={
            <div className="px-6 py-10 text-center text-sm text-ink-soft">
              Tidak ada akun yang cocok dengan filter.
            </div>
          }
          columns={[
            {
              key: "code",
              header: "Kode",
              render: (row) => <span className="font-mono text-xs text-ink-soft">{row.code}</span>,
            },
            {
              key: "name",
              header: "Nama akun",
              render: (row) => (
                <span style={{ paddingLeft: (row.level - 1) * 16 }} className={row.hasChildren ? "font-medium text-ink" : "text-ink"}>
                  {row.name}
                </span>
              ),
            },
            { key: "type", header: "Tipe", render: (row) => ACCOUNT_TYPE_LABELS[row.type] ?? row.type },
            { key: "group", header: "Kelompok", render: (row) => REPORT_GROUP_LABELS[row.reportGroup] ?? row.reportGroup },
            {
              key: "balance",
              header: "Saldo",
              align: "right",
              render: (row) => (
                <span className="money">{formatIDR(row.normalBalance === "DEBIT" ? row.balance : -row.balance)}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (row) =>
                row.isActive ? <StatusStamp kind="period" status="OPEN" label="Aktif" /> : <StatusStamp kind="period" status="CLOSED" label="Nonaktif" />,
            },
            {
              key: "actions",
              header: "Aksi",
              align: "right",
              render: (row) =>
                canEdit ? (
                  <div className="flex items-center justify-end gap-1">
                    <AccountDialog
                      accounts={parentOptions}
                      initial={{
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        description: row.description,
                        type: row.type,
                        reportGroup: row.reportGroup,
                        systemRole: row.systemRole,
                        parentId: row.parentId,
                      }}
                      triggerLabel="Ubah"
                      triggerVariant="ghost"
                      triggerSize="sm"
                    />
                    <AccountToggleButton accountId={row.id} isActive={row.isActive} systemRole={row.systemRole} />
                  </div>
                ) : null,
            },
          ]}
        />
        <div className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {rows.length} akun ditampilkan
        </div>
      </PaperCard>
    </>
  );
}
