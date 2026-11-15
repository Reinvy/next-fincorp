import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { getAgingReport } from "@/server/accounting/aging";
import { getCompanyLetterhead } from "@/server/accounting/reports";
import { dateFromISO, formatDateLongID, isoFromDate, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { PageHeader } from "@/components/ui/paper";
import { ReportDocument } from "@/components/print/ReportDocument";
import { PrintButton } from "@/components/print/PrintButton";
import { DownloadLink } from "@/components/ui/download-link";
import { buttonStyles } from "@/components/ui/button";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aging Piutang & Utang" };

export default async function AgingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const type = firstValue(params.type) === "AP" ? "AP" : "AR";
  const rawAsOf = firstValue(params.asOf);
  const asOf = rawAsOf ? dateFromISO(rawAsOf) : dateFromISO(todayISO());
  const { actor } = await requireActorPage();
  const [data, company] = await Promise.all([
    getAgingReport(actor, { type, asOf }),
    getCompanyLetterhead(actor),
  ]);
  if (!company) return null;
  const csvQuery = `?asOf=${isoFromDate(asOf)}`;

  return (
    <>
      <PageHeader
        breadcrumbs={<Link href="/reports" className="text-xs text-ink-soft hover:text-ink">← Kembali ke laporan</Link>}
        eyebrow="Laporan keuangan"
        title="Aging Piutang & Utang"
        description={`${type === "AR" ? "Piutang pelanggan" : "Utang vendor"} per ${formatDateLongDate(asOf)} berdasarkan sisa tagihan.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            <DownloadLink href={`/api/export/aging-${type.toLowerCase()}${csvQuery}`} className={buttonStyles({ variant: "ghost", size: "md" })}>CSV</DownloadLink>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/reports/aging?type=AR&asOf=${isoFromDate(asOf)}`} className={buttonStyles({ variant: type === "AR" ? "primary" : "secondary", size: "sm" })}>Piutang</Link>
        <Link href={`/reports/aging?type=AP&asOf=${isoFromDate(asOf)}`} className={buttonStyles({ variant: type === "AP" ? "primary" : "secondary", size: "sm" })}>Utang</Link>
      </div>

      <div className="mb-4 print:hidden">
        <SearchFilterBar action="/reports/aging" resetHref={`/reports/aging?type=${type}`} className="border border-rule">
          <input type="hidden" name="type" value={type} />
          <Field label="Per tanggal" htmlFor="asOf">
            <Input id="asOf" name="asOf" type="date" defaultValue={isoFromDate(asOf)} className="h-9" />
          </Field>
        </SearchFilterBar>
      </div>

      <ReportDocument
        company={company}
        title="Aging Piutang & Utang"
        subtitle={`${type === "AR" ? "Piutang Usaha" : "Utang Usaha"} · per ${formatDateLongDate(asOf)}`}
        meta={<span>Dalam Rupiah</span>}
        notes="Umur dihitung dari jatuh tempo. Faktur yang lewat jatuh tempo dimasukkan ke bucket 1–30 hari dan seterusnya."
      >
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 760 }}>
            <caption className="sr-only">Aging per pihak</caption>
            <thead>
              <tr>
                <th scope="col">{type === "AR" ? "Pelanggan" : "Vendor"}</th>
                <th scope="col" className="num">Belum jatuh tempo</th>
                <th scope="col" className="num">1–30</th>
                <th scope="col" className="num">31–60</th>
                <th scope="col" className="num">61–90</th>
                <th scope="col" className="num">&gt;90</th>
                <th scope="col" className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.length === 0 ? (
                <tr><td colSpan={7} className="!h-20 text-center text-sm text-ink-soft">Tidak ada saldo terbuka.</td></tr>
              ) : (
                data.parties.map((party) => (
                  <tr key={party.partyId}>
                    <td>{party.partyName}</td>
                    <td className="num">{formatIDR(party.current)}</td>
                    <td className="num">{formatIDR(party.d1_30)}</td>
                    <td className="num">{formatIDR(party.d31_60)}</td>
                    <td className="num">{formatIDR(party.d61_90)}</td>
                    <td className="num">{formatIDR(party.over90)}</td>
                    <td className="num font-medium">{formatIDR(party.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="double-rule">
                <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]">Total</td>
                <td className="num px-3 py-2">{formatIDR(data.totals.current)}</td>
                <td className="num px-3 py-2">{formatIDR(data.totals.d1_30)}</td>
                <td className="num px-3 py-2">{formatIDR(data.totals.d31_60)}</td>
                <td className="num px-3 py-2">{formatIDR(data.totals.d61_90)}</td>
                <td className="num px-3 py-2">{formatIDR(data.totals.over90)}</td>
                <td className="num px-3 py-2 font-medium">{formatIDR(data.totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <h2 className="mt-5 font-display text-lg font-semibold text-ink">Rincian faktur</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 640 }}>
            <caption className="sr-only">Rincian faktur terbuka</caption>
            <thead>
              <tr>
                <th scope="col">Faktur</th>
                <th scope="col">{type === "AR" ? "Pelanggan" : "Vendor"}</th>
                <th scope="col">Jatuh tempo</th>
                <th scope="col" className="num">Hari</th>
                <th scope="col" className="num">Sisa</th>
                <th scope="col">Bucket</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.flatMap((party) =>
                party.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-mono text-xs">{invoice.number}</td>
                    <td>{invoice.partyName}</td>
                    <td className="font-mono text-xs">{invoice.dueDate}</td>
                    <td className={cn("num", invoice.daysOverdue > 0 && "text-vermilion")}>{invoice.daysOverdue}</td>
                    <td className="num">{formatIDR(invoice.outstanding)}</td>
                    <td className="text-xs">{invoice.bucket === "current" ? "Belum jatuh tempo" : invoice.bucket.replace("d", "").replace("_", "–")}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </ReportDocument>
    </>
  );
}

function formatDateLongDate(date: Date): string {
  return formatDateLongID(date);
}
