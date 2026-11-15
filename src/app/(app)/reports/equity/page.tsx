import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getCompanyLetterhead, getEquityStatement } from "@/server/accounting/reports";
import { dateFromISO, fiscalYearBounds, formatDateLongID, isoFromDate, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { PageHeader, Stamp } from "@/components/ui/paper";
import { ReportDocument } from "@/components/print/ReportDocument";
import { PrintButton } from "@/components/print/PrintButton";
import { DownloadLink } from "@/components/ui/download-link";
import { buttonStyles } from "@/components/ui/button";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perubahan Ekuitas" };

export default async function EquityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor } = await requireActorPage();
  const today = dateFromISO(todayISO());
  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: { fiscalYearStartMonth: true, fiscalYearStartDay: true },
  });
  const fiscal = fiscalYearBounds(today, company?.fiscalYearStartMonth ?? 1, company?.fiscalYearStartDay ?? 1);
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const from = rawFrom ? dateFromISO(rawFrom) : fiscal.start;
  const to = rawTo ? dateFromISO(rawTo) : today;
  const [data, letterhead] = await Promise.all([getEquityStatement(actor, from, to), getCompanyLetterhead(actor)]);
  if (!letterhead) return null;
  const csvQuery = `?from=${isoFromDate(from)}&to=${isoFromDate(to)}`;

  return (
    <>
      <PageHeader
        breadcrumbs={<Link href="/reports" className="text-xs text-ink-soft hover:text-ink">← Kembali ke laporan</Link>}
        eyebrow="Laporan keuangan"
        title="Perubahan Ekuitas"
        description={`${formatDateLongID(from)} – ${formatDateLongID(to)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            <DownloadLink href={`/api/export/equity${csvQuery}`} className={buttonStyles({ variant: "ghost", size: "md" })}>CSV</DownloadLink>
          </div>
        }
      />
      <div className="mb-4 print:hidden">
        <SearchFilterBar action="/reports/equity" resetHref="/reports/equity" className="border border-rule">
          <Field label="Dari" htmlFor="from"><Input id="from" name="from" type="date" defaultValue={isoFromDate(from)} className="h-9" /></Field>
          <Field label="Sampai" htmlFor="to"><Input id="to" name="to" type="date" defaultValue={isoFromDate(to)} className="h-9" /></Field>
          <div className="pb-1">{data.balanced ? <Stamp tone="forest">Sama dengan neraca</Stamp> : <Stamp tone="vermilion">Selisih</Stamp>}</div>
        </SearchFilterBar>
      </div>

      <ReportDocument
        company={letterhead}
        title="Laporan Perubahan Ekuitas"
        subtitle={`${formatDateLongID(from)} – ${formatDateLongID(to)}`}
        meta={<span>Dalam Rupiah</span>}
        notes="Mutasi modal dan laba periode. Saldo akhir harus sama dengan total ekuitas pada neraca tanggal akhir."
      >
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 640 }}>
            <caption className="sr-only">Perubahan ekuitas</caption>
            <thead>
              <tr>
                <th scope="col">Akun</th>
                <th scope="col" className="num">Saldo awal</th>
                <th scope="col" className="num">Setoran/(prive)</th>
                <th scope="col" className="num">Laba periode</th>
                <th scope="col" className="num">Saldo akhir</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.code}>
                  <td><span className="mr-2 font-mono text-[10px] text-ink-faint">{row.code}</span>{row.label}</td>
                  <td className="num">{formatIDR(row.beginning, { negative: "parentheses" })}</td>
                  <td className="num">{formatIDR(row.movement, { negative: "parentheses" })}</td>
                  <td className="num">—</td>
                  <td className="num">{formatIDR(row.ending, { negative: "parentheses" })}</td>
                </tr>
              ))}
              <tr>
                <td>Laba ditahan sebelum periode</td>
                <td className="num">{formatIDR(data.beginningEarnings, { negative: "parentheses" })}</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{formatIDR(data.beginningEarnings, { negative: "parentheses" })}</td>
              </tr>
              <tr>
                <td>Laba periode berjalan</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{formatIDR(data.netProfit, { negative: "parentheses" })}</td>
                <td className="num">{formatIDR(data.netProfit, { negative: "parentheses" })}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="double-rule">
                <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]">Total ekuitas</td>
                <td className="num px-3 py-2">{formatIDR(data.beginningEquity + data.beginningEarnings)}</td>
                <td className="num px-3 py-2">{formatIDR(data.contributions)}</td>
                <td className="num px-3 py-2">{formatIDR(data.netProfit)}</td>
                <td className="num px-3 py-2 font-medium">{formatIDR(data.endingEquity)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">
          Ekuitas pada neraca: {formatIDR(data.balanceSheetEquity)}.
        </p>
      </ReportDocument>
    </>
  );
}
