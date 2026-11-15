import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { listPeriods } from "@/server/accounting/periods";
import { formatDateTimeID, formatMonthID, todayISO } from "@/lib/dates";
import { buttonStyles } from "@/components/ui/button";
import { AccountingTabs } from "@/components/layout/AccountingTabs";
import { PageHeader, PaperCard, StatusStamp } from "@/components/ui/paper";
import { ClosePeriodDialog, ReopenPeriodDialog } from "@/components/forms/PeriodDialogs";
import { formatNumberID } from "@/lib/money";
import { firstValue } from "@/lib/params";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutup Buku" };

export default async function ClosingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const currentYear = Number(todayISO().slice(0, 4));
  const rawYear = Number.parseInt(firstValue(params.year) ?? "", 10);
  const year = Number.isFinite(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : currentYear;
  const periods = await listPeriods(actor, year);
  const canManage = actor.role === "ADMIN";

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Tutup Buku"
        description="Menutup periode mengunci jurnal bertanggal periode tersebut. Draf harus diselesaikan lebih dulu."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/accounting/closing?year=${year - 1}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              ← {year - 1}
            </Link>
            <span className="font-mono text-sm text-ink">{year}</span>
            <Link href={`/accounting/closing?year=${year + 1}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              {year + 1} →
            </Link>
          </div>
        }
      />
      <AccountingTabs />

      {!canManage ? (
        <p className="mb-4 border-l-2 border-sky bg-sky-soft px-3 py-2 text-[13px] text-ink-soft">
          Hanya admin yang dapat menutup atau membuka periode. Anda dapat melihat status dan jumlah draf.
        </p>
      ) : null}

      <PaperCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 820 }}>
            <caption className="sr-only">Status periode {year}</caption>
            <thead>
              <tr>
                <th scope="col">Periode</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">Draf jurnal</th>
                <th scope="col" className="num">Draf penjualan</th>
                <th scope="col" className="num">Draf pembelian</th>
                <th scope="col">Ditutup</th>
                <th scope="col" className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const drafts = period.draftJournals + period.draftSales + period.draftPurchases;
                return (
                  <tr key={period.month}>
                    <td className="font-medium">{formatMonthID(`${year}-${String(period.month).padStart(2, "0")}`)}</td>
                    <td><StatusStamp kind="period" status={period.status} /></td>
                    <td className="num">{period.draftJournals ? formatNumberID(period.draftJournals) : "—"}</td>
                    <td className="num">{period.draftSales ? formatNumberID(period.draftSales) : "—"}</td>
                    <td className="num">{period.draftPurchases ? formatNumberID(period.draftPurchases) : "—"}</td>
                    <td className="text-xs text-ink-soft">
                      {period.closedAt
                        ? `${formatDateTimeID(new Date(period.closedAt))}${period.closedByName ? ` · ${period.closedByName}` : ""}`
                        : "—"}
                      {period.status === "CLOSED" && period.note ? (
                        <span className="block max-w-[220px] truncate text-[11px] text-ink-faint" title={period.note}>
                          {period.note}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-right">
                      {canManage ? (
                        period.status === "CLOSED" ? (
                          <ReopenPeriodDialog year={year} month={period.month} />
                        ) : (
                          <span title={drafts > 0 ? "Selesaikan draf terlebih dahulu" : undefined}>
                            <ClosePeriodDialog year={year} month={period.month} />
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PaperCard>

      <div className="mt-4 grid gap-3 text-xs text-ink-faint sm:grid-cols-2">
        <p>
          Tutup buku tidak membuat jurnal penutup otomatis. Laba tahun berjalan tetap dihitung dari akun pendapatan dan
          beban.
        </p>
        <p>
          Periode tertutup hanya menolak posting baru. Laporan historis tetap dapat dicetak kapan saja.
        </p>
      </div>
    </>
  );
}
