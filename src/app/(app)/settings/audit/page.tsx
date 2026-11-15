import { requireActorPage } from "@/lib/access";
import { listAuditLogs } from "@/server/accounting/audit";
import { dateFromISO, formatDateTimeID, todayISO } from "@/lib/dates";
import { firstValue } from "@/lib/params";
import { PageHeader, PaperCard } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jejak Audit" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const q = firstValue(params.q)?.trim();
  const action = firstValue(params.action)?.trim();
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);

  if (actor.role === "VIEWER") {
    return (
      <>
        <PageHeader eyebrow={activeCompany.companyName} title="Jejak Audit" />
        <PaperCard className="p-6"><p className="text-sm text-ink">Jejak audit hanya dapat dibaca admin dan akuntan.</p></PaperCard>
      </>
    );
  }

  const result = await listAuditLogs(actor, {
    q,
    action,
    from: rawFrom ? dateFromISO(rawFrom) : undefined,
    to: rawTo ? dateFromISO(rawTo) : undefined,
    page,
  });

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Jejak Audit"
        description={`Aktivitas keuangan perusahaan. Hari ini ${formatDateTimeID(new Date())}.`}
      />
      <PaperCard className="overflow-hidden">
        <SearchFilterBar action="/settings/audit" resetHref="/settings/audit">
          <Field label="Cari" htmlFor="q">
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Ringkasan atau entitas" className="h-9" />
          </Field>
          <Field label="Aksi" htmlFor="action">
            <Input id="action" name="action" defaultValue={action ?? ""} placeholder="POST, VOID, PAYMENT…" className="h-9" />
          </Field>
          <Field label="Dari" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={rawFrom ?? ""} className="h-9" />
          </Field>
          <Field label="Sampai" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={rawTo ?? ""} className="h-9" />
          </Field>
        </SearchFilterBar>
        <DataTable
          caption="Jejak audit perusahaan"
          rows={result.rows}
          getRowKey={(row) => row.id}
          minWidth={860}
          columns={[
            { key: "time", header: "Waktu", render: (row) => <span className="font-mono text-xs whitespace-nowrap">{formatDateTimeID(new Date(row.createdAt))}</span> },
            { key: "user", header: "Pengguna", render: (row) => row.userName },
            { key: "action", header: "Aksi", render: (row) => <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">{row.action}</span> },
            { key: "entity", header: "Entitas", render: (row) => <span className="font-mono text-xs">{row.entityType}</span> },
            { key: "summary", header: "Ringkasan", render: (row) => <span className="block max-w-[420px]" title={row.summary}>{row.summary}</span> },
          ]}
        />
        <Pagination page={result.page} totalPages={result.totalPages} basePath="/settings/audit" searchParams={{ q, action, from: rawFrom, to: rawTo }} />
        <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {result.total} catatan · {todayISO()}
        </p>
      </PaperCard>
    </>
  );
}
