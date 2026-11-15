import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getCompanyLetterhead, getIncomeStatement } from "@/server/accounting/reports";
import { dateFromISO, fiscalYearBounds, formatDateLongID, isoFromDate, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { PageHeader } from "@/components/ui/paper";
import { Delta } from "@/components/ui/money";
import { ReportDocument } from "@/components/print/ReportDocument";
import { PrintButton } from "@/components/print/PrintButton";
import { DownloadLink } from "@/components/ui/download-link";
import { buttonStyles } from "@/components/ui/button";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laba Rugi" };

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor } = await requireActorPage();
  const company = await prisma.company.findUnique({
    where: { id: actor.companyId },
    select: { fiscalYearStartMonth: true, fiscalYearStartDay: true },
  });
  const today = dateFromISO(todayISO());
  const fiscal = fiscalYearBounds(today, company?.fiscalYearStartMonth ?? 1, company?.fiscalYearStartDay ?? 1);
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const from = rawFrom ? dateFromISO(rawFrom) : fiscal.start;
  const to = rawTo ? dateFromISO(rawTo) : today;
  const [data, letterhead] = await Promise.all([getIncomeStatement(actor, from, to), getCompanyLetterhead(actor)]);
  if (!letterhead) return null;
  const csvQuery = `?from=${isoFromDate(from)}&to=${isoFromDate(to)}`;

  return (
    <>
      <PageHeader
        breadcrumbs={<Link href="/reports" className="text-xs text-ink-soft hover:text-ink">← Kembali ke laporan</Link>}
        eyebrow="Laporan keuangan"
        title="Laba Rugi"
        description={`${formatDateLongID(from)} – ${formatDateLongID(to)} dibanding periode sebelumnya.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            <DownloadLink href={`/api/export/income-statement${csvQuery}`} className={buttonStyles({ variant: "ghost", size: "md" })}>CSV</DownloadLink>
          </div>
        }
      />
      <div className="mb-4 print:hidden">
        <SearchFilterBar action="/reports/income-statement" resetHref="/reports/income-statement" className="border border-rule">
          <Field label="Dari" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={isoFromDate(from)} className="h-9" />
          </Field>
          <Field label="Sampai" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={isoFromDate(to)} className="h-9" />
          </Field>
        </SearchFilterBar>
      </div>

      <ReportDocument
        company={letterhead}
        title="Laba Rugi"
        subtitle={`${formatDateLongID(from)} – ${formatDateLongID(to)}`}
        meta={<span>Dalam Rupiah · pembanding {formatDateLongID(data.previousFrom)} – {formatDateLongID(data.previousTo)}</span>}
        notes="Klasifikasi mengikuti kelompok laporan akun. Retur penjualan mengurangi pendapatan; retur pembelian mengurangi HPP."
      >
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 680 }}>
            <caption className="sr-only">Laba rugi {formatDateLongID(from)} sampai {formatDateLongID(to)}</caption>
            <thead>
              <tr>
                <th scope="col">Uraian</th>
                <th scope="col" className="num">Periode ini</th>
                <th scope="col" className="num">Periode lalu</th>
                <th scope="col" className="num">Varians</th>
              </tr>
            </thead>
            <tbody>
              {data.sections.slice(0, 3).map((section) => (
                <SectionRows key={section.key} section={section} />
              ))}
              <tr className="font-medium">
                <td className="text-ink">Laba kotor</td>
                <td className="num">{formatIDR(data.grossProfit)}</td>
                <td className="num">{formatIDR(data.previousGrossProfit)}</td>
                <td className="num">{varianceCell(data.grossProfit, data.previousGrossProfit)}</td>
              </tr>
              <tr className="font-medium">
                <td className="text-ink">Laba operasi</td>
                <td className="num">{formatIDR(data.operatingProfit)}</td>
                <td className="num">{formatIDR(data.previousOperatingProfit)}</td>
                <td className="num">{varianceCell(data.operatingProfit, data.previousOperatingProfit)}</td>
              </tr>
              {data.sections.slice(3).map((section) => (
                <SectionRows key={section.key} section={section} />
              ))}
              <tr className="font-medium">
                <td className="text-ink">Laba sebelum pajak</td>
                <td className="num">{formatIDR(data.profitBeforeTax)}</td>
                <td className="num">{formatIDR(data.previousProfitBeforeTax)}</td>
                <td className="num">{varianceCell(data.profitBeforeTax, data.previousProfitBeforeTax)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="double-rule">
                <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink">Laba bersih</td>
                <td className="num px-3 py-2 font-medium">{formatIDR(data.netProfit, { negative: "parentheses" })}</td>
                <td className="num px-3 py-2">{formatIDR(data.previousNetProfit, { negative: "parentheses" })}</td>
                <td className="num px-3 py-2">{varianceCell(data.netProfit, data.previousNetProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportDocument>
    </>
  );
}

function SectionRows({ section }: { section: Awaited<ReturnType<typeof getIncomeStatement>>["sections"][number] }) {
  return (
    <>
      <tr>
        <td colSpan={4} className="!bg-paper-deep px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {section.label}
        </td>
      </tr>
      {section.lines.map((line) => (
        <tr key={`${section.key}-${line.code}`}>
          <td className="pl-6">
            <span className="mr-2 font-mono text-[10px] text-ink-faint">{line.code}</span>
            {line.label}
          </td>
          <td className="num">{formatIDR(line.amount, { negative: "parentheses" })}</td>
          <td className="num">{formatIDR(line.previous, { negative: "parentheses" })}</td>
          <td className="num"><Delta value={line.variance} /></td>
        </tr>
      ))}
      <tr>
        <td className="text-right font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">Subtotal {section.label}</td>
        <td className="num text-ink-soft">{formatIDR(section.total, { negative: "parentheses" })}</td>
        <td className="num text-ink-soft">{formatIDR(section.previousTotal, { negative: "parentheses" })}</td>
        <td className="num"><Delta value={section.variance} /></td>
      </tr>
    </>
  );
}

function varianceCell(current: number, previous: number) {
  if (previous === 0) return <span className="font-mono text-xs text-ink-faint">—</span>;
  return <Delta value={((current - previous) / Math.abs(previous)) * 100} />;
}
