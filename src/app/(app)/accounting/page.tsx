import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getTrialBalance } from "@/server/accounting/trial-balance";
import { listJournals } from "@/server/accounting/journals";
import { todayISO } from "@/lib/dates";
import { dateFromISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { JOURNAL_TYPE_LABELS, PERIOD_STATUS_LABELS } from "@/lib/constants";
import { AccountingTabs } from "@/components/layout/AccountingTabs";
import { ActionLink, KpiCard, PageHeader, PaperCard, SectionRule, Stamp, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Akuntansi" };

export default async function AccountingPage() {
  const { actor, activeCompany } = await requireActorPage();
  const canEdit = actor.role !== "VIEWER";
  const asOf = dateFromISO(todayISO());
  const [trialBalance, journals, period] = await Promise.all([
    getTrialBalance(actor, asOf),
    listJournals(actor, { page: 1 }),
    prisma.fiscalPeriod.findUnique({
      where: {
        companyId_year_month: { companyId: actor.companyId, year: asOf.getUTCFullYear(), month: asOf.getUTCMonth() + 1 },
      },
      select: { status: true },
    }),
  ]);

  const groupTotal = (groups: string[]) =>
    trialBalance.groups
      .filter((group) => groups.includes(group.group))
      .reduce((acc, group) => acc + group.debit - group.credit, 0);

  const assets = groupTotal(["CURRENT_ASSET", "FIXED_ASSET", "ACCUMULATED_DEPRECIATION", "OTHER_ASSET"]);
  const liabilities = -groupTotal(["CURRENT_LIABILITY", "LONG_TERM_LIABILITY"]);
  const equity = -groupTotal(["EQUITY"]);
  const revenue =
    -groupTotal(["REVENUE", "OTHER_INCOME"]) - groupTotal(["CONTRA_REVENUE"]);
  const expenses =
    groupTotal(["COST_OF_GOODS_SOLD", "OPERATING_EXPENSE", "OTHER_EXPENSE", "TAX_EXPENSE"]) -
    groupTotal(["CONTRA_COGS"]);
  const netProfit = revenue - expenses;
  const periodStatus = period?.status ?? "OPEN";

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Akuntansi"
        description="Seluruh saldo berasal dari jurnal terposting. Tidak ada saldo yang disimpan terpisah."
        actions={canEdit ? <ActionLink href="/accounting/journal/new">Jurnal baru</ActionLink> : undefined}
      />
      <AccountingTabs />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Aset" value={formatIDR(assets)} note="Nilai buku per hari ini" index="01" />
        <KpiCard label="Liabilitas" value={formatIDR(liabilities)} note="Termasuk utang pajak" index="02" tone="mustard" />
        <KpiCard label="Ekuitas" value={formatIDR(equity)} note="Belum termasuk laba berjalan" index="03" />
        <KpiCard
          label="Laba Berjalan (YTD)"
          value={formatIDR(netProfit)}
          note={`Pendapatan ${formatIDR(revenue)} · Beban ${formatIDR(expenses)}`}
          index="04"
          tone={netProfit < 0 ? "vermilion" : "forest"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PaperCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <SectionRule label="Jurnal terakhir" right={<Link href="/accounting/journal" className="text-xs text-forest underline underline-offset-4">Semua jurnal</Link>} />
          </div>
          <DataTable
            caption="Enam jurnal terakhir"
            rows={journals.rows.slice(0, 6)}
            getRowKey={(row) => row.id}
            rowHref={(row) => `/accounting/journal/${row.id}`}
            minWidth={640}
            columns={[
              { key: "number", header: "Nomor", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
              { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{row.date}</span> },
              {
                key: "description",
                header: "Keterangan",
                render: (row) => (
                  <span className="block max-w-[260px] truncate" title={row.description}>
                    {row.description}
                  </span>
                ),
              },
              { key: "type", header: "Tipe", render: (row) => JOURNAL_TYPE_LABELS[row.type] ?? row.type },
              { key: "total", header: "Nilai", align: "right", render: (row) => formatIDR(row.total) },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusStamp kind="journal" status={row.status} />,
              },
            ]}
          />
        </PaperCard>

        <div className="space-y-4">
          <PaperCard className="p-4">
            <SectionRule label="Periode berjalan" />
            <div className="mt-3 flex items-center justify-between">
              <p className="font-mono text-sm text-ink">{asOf.toISOString().slice(0, 7)}</p>
              <StatusStamp kind="period" status={periodStatus} label={PERIOD_STATUS_LABELS[periodStatus]} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-rule pt-3 text-sm">
              <span className="text-ink-soft">Neraca saldo</span>
              {trialBalance.balanced ? <Stamp tone="forest">Seimbang</Stamp> : <Stamp tone="vermilion">Selisih</Stamp>}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-rule pt-3 text-sm">
              <span className="text-ink-soft">Debit</span>
              <span className="money">{formatIDR(trialBalance.totalDebit)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-ink-soft">Kredit</span>
              <span className="money">{formatIDR(trialBalance.totalCredit)}</span>
            </div>
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="Buku & laporan" />
            <ul className="mt-3 space-y-1.5 text-sm">
              <li><Link href="/accounting/coa" className="text-ink hover:underline">Bagan akun</Link></li>
              <li><Link href="/accounting/journal" className="text-ink hover:underline">Jurnal umum</Link></li>
              <li><Link href="/accounting/ledger" className="text-ink hover:underline">Buku besar</Link></li>
              <li><Link href="/accounting/trial-balance" className="text-ink hover:underline">Neraca saldo</Link></li>
              <li><Link href="/accounting/closing" className="text-ink hover:underline">Buka/tutup periode</Link></li>
            </ul>
          </PaperCard>
        </div>
      </div>
    </>
  );
}
