import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { getDashboard } from "@/server/accounting/dashboard";
import { getAlerts } from "@/server/accounting/alerts";
import { formatDateID, formatDateLongID, formatMonthID } from "@/lib/dates";
import { formatIDR, formatNumberID, formatPercentID } from "@/lib/money";
import { JOURNAL_TYPE_LABELS } from "@/lib/constants";
import { ActionLink, EmptyState, KpiCard, PageHeader, PaperCard, SectionRule, StatusStamp } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { Delta } from "@/components/ui/money";
import { BarChart } from "@/components/charts/charts";
import { DismissAlertButton } from "@/components/forms/DismissAlertButton";
import { buttonStyles } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { actor, activeCompany, user } = await requireActorPage();
  const [data, alerts] = await Promise.all([getDashboard(actor), getAlerts(actor, user.id)]);
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        eyebrow={`${activeCompany.companyName} · ${formatDateLongID(data.today)}`}
        title="Ringkasan"
        description="Posisi keuangan hari ini dan aktivitas terakhir. Semua angka berasal dari jurnal terposting."
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <ActionLink href="/sales/new">Faktur penjualan</ActionLink>
              <ActionLink href="/purchases/new" variant="secondary">Pembelian</ActionLink>
              <ActionLink href="/accounting/journal/new" variant="ghost">Jurnal</ActionLink>
            </div>
          ) : undefined
        }
      />

      {alerts.length > 0 ? (
        <PaperCard className="mb-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">Perlu perhatian · {alerts.length}</p>
            <Link href="/deadlines" className="text-xs text-forest underline underline-offset-4">Semua tenggat</Link>
          </div>
          <ul className="divide-y divide-rule">
            {alerts.map((alert) => (
              <li key={alert.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <Link href={alert.href} className="text-[13px] font-medium text-ink hover:underline hover:underline-offset-4">
                    {alert.title}
                  </Link>
                  <p className="text-[11px] text-ink-faint">{alert.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.1em] ${alert.tone === "danger" ? "text-vermilion" : "text-mustard"}`}
                  >
                    {alert.tone === "danger" ? "Mendesak" : "Segera"}
                  </span>
                  <DismissAlertButton alertKey={alert.key} />
                </div>
              </li>
            ))}
          </ul>
        </PaperCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Kas & Bank" value={formatIDR(data.cash.current)} note={`Bulan lalu ${formatIDR(data.cash.previous)}`} index="01" />
        <KpiCard label="Piutang Usaha" value={formatIDR(data.receivable.current)} note={`${formatIDR(data.receivable.previous)} awal bulan`} index="02" />
        <KpiCard label="Utang Usaha" value={formatIDR(data.payable.current)} note={`${formatIDR(data.payable.previous)} awal bulan`} index="03" tone="mustard" />
        <KpiCard
          label="Laba Bersih YTD"
          value={formatIDR(data.netYtd, { negative: "parentheses" })}
          note={`Margin ${formatPercentID(data.netMargin)}`}
          index="04"
          tone={data.netYtd < 0 ? "vermilion" : "forest"}
        />
        <KpiCard label="Pendapatan Bulan Ini" value={formatIDR(data.revenueMtd.current)} note={<Delta value={data.revenueMtd.delta} />} index="05" />
        <KpiCard label="Beban Bulan Ini" value={formatIDR(data.expenseMtd.current)} note={<Delta value={data.expenseMtd.delta} />} index="06" tone="mustard" />
        <KpiCard label="Laba Bulan Ini" value={formatIDR(data.netMtd.current, { negative: "parentheses" })} note={<Delta value={data.netMtd.delta} />} index="07" tone={data.netMtd.current < 0 ? "vermilion" : "forest"} />
        <KpiCard
          label="PPN Bulan Ini"
          value={formatIDR(data.ppnNet)}
          note={data.ppnNet > 0 ? "Kurang bayar" : "Lebih bayar"}
          index="08"
          tone={data.ppnNet > 0 ? "mustard" : "forest"}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <PaperCard className="px-4 py-3">
          <p className="eyebrow">Rasio lancar</p>
          <p className="mt-1 font-mono text-lg">{formatNumberID(data.currentRatio * 100, 1)}%</p>
          <p className="text-[11px] text-ink-faint">Aset lancar ÷ liabilitas jangka pendek</p>
        </PaperCard>
        <PaperCard className="px-4 py-3">
          <p className="eyebrow">DER</p>
          <p className="mt-1 font-mono text-lg">{formatNumberID(data.debtEquityRatio * 100, 1)}%</p>
          <p className="text-[11px] text-ink-faint">Total liabilitas ÷ ekuitas</p>
        </PaperCard>
        <PaperCard className="px-4 py-3">
          <p className="eyebrow">Laba YTD</p>
          <p className="mt-1 font-mono text-lg">{formatIDR(data.netYtd, { negative: "parentheses" })}</p>
          <p className="text-[11px] text-ink-faint">Pendapatan {formatIDR(data.revenueYtd)} · beban {formatIDR(data.expenseYtd)}</p>
        </PaperCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PaperCard className="p-4">
          <SectionRule label="Pendapatan vs beban" right={<span className="font-mono text-[10px] text-ink-faint">6 bulan</span>} />
          <div className="mt-3">
            <BarChart
              labels={data.chart.map((row) => row.label)}
              series={[
                { name: "Pendapatan", color: "var(--color-forest)", values: data.chart.map((row) => row.revenue) },
                { name: "Beban", color: "var(--color-vermilion)", values: data.chart.map((row) => row.expense) },
              ]}
              height={210}
            />
          </div>
        </PaperCard>
        <PaperCard className="p-4">
          <SectionRule label="Kas masuk vs keluar" right={<span className="font-mono text-[10px] text-ink-faint">6 bulan</span>} />
          <div className="mt-3">
            <BarChart
              labels={data.cashChart.map((row) => row.label)}
              series={[
                { name: "Masuk", color: "var(--color-sky)", values: data.cashChart.map((row) => row.inflow) },
                { name: "Keluar", color: "var(--color-mustard)", values: data.cashChart.map((row) => row.outflow) },
              ]}
              height={210}
            />
          </div>
        </PaperCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <PaperCard className="overflow-hidden">
          <div className="border-b border-rule px-4 py-3">
            <SectionRule label="Jurnal terakhir" right={<Link href="/accounting/journal" className="text-xs text-forest underline underline-offset-4">Semua</Link>} />
          </div>
          <DataTable
            caption="Jurnal terakhir"
            rows={data.recentJournals}
            getRowKey={(row) => row.id}
            rowHref={(row) => `/accounting/journal/${row.id}`}
            minWidth={640}
            columns={[
              { key: "number", header: "Nomor", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
              { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
              { key: "description", header: "Keterangan", render: (row) => <span className="block max-w-[240px] truncate">{row.description}</span> },
              { key: "type", header: "Tipe", render: (row) => JOURNAL_TYPE_LABELS[row.type] ?? row.type },
              { key: "total", header: "Nilai", align: "right", render: (row) => formatIDR(row.total) },
            ]}
          />
        </PaperCard>

        <PaperCard className="p-4">
          <SectionRule label="Rekening" right={<Link href="/cash-bank" className="text-xs text-forest underline underline-offset-4">Kas &amp; bank</Link>} />
          {data.cashAccounts.length === 0 ? (
            <p className="mt-3 text-xs text-ink-faint">Belum ada rekening aktif.</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule">
              {data.cashAccounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <Link href={`/cash-bank/${account.id}`} className="text-[13px] text-ink hover:underline hover:underline-offset-4">
                      {account.name}
                    </Link>
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                      {account.type === "CASH" ? "Kas" : "Bank"}
                    </p>
                  </div>
                  <span className="money text-xs">{formatIDR(account.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </PaperCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PaperCard className="overflow-hidden">
          <div className="border-b border-rule px-4 py-3">
            <SectionRule label="Faktur lewat jatuh tempo" />
          </div>
          {data.overdueInvoices.length === 0 ? (
            <EmptyState title="Tidak ada faktur lewat jatuh tempo" description="Piutang dan utang saat ini masih dalam tenggat." />
          ) : (
            <DataTable
              caption="Faktur lewat jatuh tempo"
              rows={data.overdueInvoices}
              getRowKey={(row) => `${row.kind}-${row.id}`}
              rowHref={(row) => row.href}
              minWidth={560}
              columns={[
                { key: "number", header: "Faktur", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
                { key: "party", header: "Pihak", render: (row) => <span className="block max-w-[150px] truncate">{row.party}</span> },
                { key: "due", header: "Jatuh tempo", render: (row) => <span className="font-mono text-xs">{formatDateID(row.dueDate)}</span> },
                { key: "days", header: "Hari", align: "right", render: (row) => <span className="text-vermilion">{row.daysOverdue}</span> },
                { key: "amount", header: "Sisa", align: "right", render: (row) => formatIDR(row.outstanding) },
              ]}
            />
          )}
        </PaperCard>

        <PaperCard className="overflow-hidden">
          <div className="border-b border-rule px-4 py-3">
            <SectionRule label="Tenggat terdekat" right={<Link href="/deadlines" className="text-xs text-forest underline underline-offset-4">Kalender</Link>} />
          </div>
          {data.deadlines.length === 0 ? (
            <EmptyState title="Tidak ada tenggat" description={formatMonthID(data.today.toISOString().slice(0, 7))} />
          ) : (
            <ul className="divide-y divide-rule">
              {data.deadlines.map((deadline) => (
                <li key={deadline.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <Link href={deadline.href ?? "/deadlines"} className="text-[13px] text-ink hover:underline hover:underline-offset-4">
                      {deadline.title}
                    </Link>
                    <p className="font-mono text-[10px] text-ink-faint">{deadline.dueDate}</p>
                  </div>
                  <StatusStamp kind="period" status={deadline.status === "overdue" ? "CLOSED" : "OPEN"} label={deadline.status === "overdue" ? "Terlambat" : deadline.status === "soon" ? "Segera" : "Akan datang"} />
                </li>
              ))}
            </ul>
          )}
        </PaperCard>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/reports" className={buttonStyles({ variant: "secondary", size: "sm" })}>Buka laporan</Link>
        <Link href="/accounting/trial-balance" className={buttonStyles({ variant: "ghost", size: "sm" })}>Neraca saldo</Link>
        <Link href="/tax" className={buttonStyles({ variant: "ghost", size: "sm" })}>Pajak</Link>
      </div>
    </>
  );
}
