import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { getTaxSummary, TAX_ACCOUNT } from "@/server/tax/tax";
import { getCompanyLetterhead } from "@/server/accounting/reports";
import { formatDateLongID, formatMonthID, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { TAX_TYPE_LABELS } from "@/lib/constants";
import { firstValue } from "@/lib/params";
import { PageHeader } from "@/components/ui/paper";
import { ReportDocument } from "@/components/print/ReportDocument";
import { PrintButton } from "@/components/print/PrintButton";
import { DownloadLink } from "@/components/ui/download-link";
import { buttonStyles } from "@/components/ui/button";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rekap Pajak" };

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = firstValue(params.period);
  const period = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : todayISO().slice(0, 7);
  const { actor } = await requireActorPage();
  const [data, company] = await Promise.all([getTaxSummary(actor, period), getCompanyLetterhead(actor)]);
  if (!company) return null;
  const csvQuery = `?period=${period}`;

  return (
    <>
      <PageHeader
        breadcrumbs={<Link href="/reports" className="text-xs text-ink-soft hover:text-ink">← Kembali ke laporan</Link>}
        eyebrow="Laporan keuangan"
        title="Rekap Pajak"
        description={`PPN dan PPh periode ${formatMonthID(period)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            <DownloadLink href={`/api/export/tax-ppn${csvQuery}`} className={buttonStyles({ variant: "ghost", size: "md" })}>CSV</DownloadLink>
            <Link href={`/tax?period=${period}`} className={buttonStyles({ variant: "secondary", size: "md" })}>Kelola pajak</Link>
          </div>
        }
      />
      <div className="mb-4 print:hidden">
        <SearchFilterBar action="/reports/tax" resetHref="/reports/tax" className="border border-rule">
          <Field label="Periode" htmlFor="period">
            <Input id="period" name="period" type="month" defaultValue={period} className="h-9" />
          </Field>
        </SearchFilterBar>
      </div>

      <ReportDocument
        company={company}
        title="Rekap Pajak"
        subtitle={formatMonthID(period)}
        meta={<span>Dalam Rupiah</span>}
        notes="PPN dihitung dari mutasi jurnal PPN Keluaran/Masukan, bukan dari status e-Faktur. PPh diakui saat pembayaran vendor."
      >
        <h2 className="font-display text-lg font-semibold text-ink">PPN</h2>
        <table className="ledger-table mt-2" style={{ minWidth: 520 }}>
          <caption className="sr-only">Rekap PPN</caption>
          <tbody>
            <tr><td>PPN Keluaran</td><td className="num">{formatIDR(data.vat.output)}</td></tr>
            <tr><td>PPN Masukan</td><td className="num">{formatIDR(data.vat.input)}</td></tr>
            <tr><td className="font-medium">PPN Neto</td><td className="num font-medium">{formatIDR(data.vat.net)}</td></tr>
            <tr><td>Status kompensasi</td><td className="num">{data.vatSettled ? "Selesai" : "Belum"}</td></tr>
            {data.vatSettled ? (
              <>
                <tr><td>Tanggal bayar</td><td className="num">{data.vatSettled.date}</td></tr>
                <tr><td>Nominal bayar</td><td className="num">{formatIDR(data.vatSettled.amount)}</td></tr>
                <tr><td>Jurnal kompensasi</td><td className="num">{data.vatSettled.settlementJournalNumber ?? "—"}</td></tr>
                <tr><td>Jurnal bayar</td><td className="num">{data.vatSettled.journalNumber ?? "—"}</td></tr>
              </>
            ) : null}
          </tbody>
        </table>

        <h2 className="mt-5 font-display text-lg font-semibold text-ink">PPh dipotong</h2>
        <table className="ledger-table mt-2" style={{ minWidth: 560 }}>
          <caption className="sr-only">Rekap PPh</caption>
          <thead>
            <tr><th scope="col">Jenis</th><th scope="col">Akun</th><th scope="col" className="num">Dipungut</th><th scope="col" className="num">Dibayar</th><th scope="col" className="num">Saldo utang</th></tr>
          </thead>
          <tbody>
            {data.pphWithheld.map((row) => (
              <tr key={row.type}>
                <td>{TAX_TYPE_LABELS[row.type] ?? row.type}</td>
                <td className="font-mono text-xs">{row.accountCode} · {row.accountName}</td>
                <td className="num">{formatIDR(row.withheld)}</td>
                <td className="num">{formatIDR(row.paid)}</td>
                <td className="num">{formatIDR(row.liabilityBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mt-5 font-display text-lg font-semibold text-ink">Pembayaran pajak</h2>
        <table className="ledger-table mt-2" style={{ minWidth: 620 }}>
          <caption className="sr-only">Pembayaran pajak periode {period}</caption>
          <thead>
            <tr><th scope="col">Jenis</th><th scope="col">Tanggal</th><th scope="col">Rekening</th><th scope="col">Billing / NTPN</th><th scope="col" className="num">Nominal</th><th scope="col">Jurnal</th></tr>
          </thead>
          <tbody>
            {data.payments.length === 0 ? (
              <tr><td colSpan={6} className="!h-16 text-center text-sm text-ink-soft">Belum ada pembayaran.</td></tr>
            ) : (
              data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{TAX_TYPE_LABELS[payment.type] ?? payment.type}</td>
                  <td className="font-mono text-xs">{formatDateLongID(payment.date)}</td>
                  <td>{payment.bankName ?? "—"}</td>
                  <td className="font-mono text-[11px]">{[payment.billingId, payment.ntpN].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="num">{formatIDR(payment.amount)}</td>
                  <td className="font-mono text-xs">{payment.journalNumber ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="mt-4 text-[11px] text-ink-faint">
          Akun PPh 25/29: {TAX_ACCOUNT.PPH25}. Status e-Faktur tidak mengubah angka PPN pada laporan ini.
        </p>
      </ReportDocument>
    </>
  );
}
