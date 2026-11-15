import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { getCashFlow, getCompanyLetterhead } from "@/server/accounting/reports";
import { dateFromISO, formatDateLongID, isoFromDate, monthBounds, todayISO } from "@/lib/dates";
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
export const metadata = { title: "Arus Kas" };

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor } = await requireActorPage();
  const defaults = monthBounds(todayISO().slice(0, 7));
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const from = rawFrom ? dateFromISO(rawFrom) : defaults.start;
  const to = rawTo ? dateFromISO(rawTo) : dateFromISO(todayISO());
  const [data, company] = await Promise.all([getCashFlow(actor, from, to), getCompanyLetterhead(actor)]);
  if (!company) return null;
  const csvQuery = `?from=${isoFromDate(from)}&to=${isoFromDate(to)}`;
  const sections = [
    { key: "OPERATING", label: "Arus kas operasi", total: data.operating },
    { key: "INVESTING", label: "Arus kas investasi", total: data.investing },
    { key: "FINANCING", label: "Arus kas pendanaan", total: data.financing },
  ] as const;

  return (
    <>
      <PageHeader
        breadcrumbs={<Link href="/reports" className="text-xs text-ink-soft hover:text-ink">← Kembali ke laporan</Link>}
        eyebrow="Laporan keuangan"
        title="Arus Kas"
        description={`${formatDateLongID(from)} – ${formatDateLongID(to)}. Metode langsung dari mutasi kas/bank.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            <DownloadLink href={`/api/export/cash-flow${csvQuery}`} className={buttonStyles({ variant: "ghost", size: "md" })}>CSV</DownloadLink>
          </div>
        }
      />
      <div className="mb-4 print:hidden">
        <SearchFilterBar action="/reports/cash-flow" resetHref="/reports/cash-flow" className="border border-rule">
          <Field label="Dari" htmlFor="from"><Input id="from" name="from" type="date" defaultValue={isoFromDate(from)} className="h-9" /></Field>
          <Field label="Sampai" htmlFor="to"><Input id="to" name="to" type="date" defaultValue={isoFromDate(to)} className="h-9" /></Field>
          <div className="pb-1">{data.reconciled ? <Stamp tone="forest">Rekonsiliasi</Stamp> : <Stamp tone="vermilion">Selisih</Stamp>}</div>
        </SearchFilterBar>
      </div>

      <ReportDocument
        company={company}
        title="Arus Kas"
        subtitle={`${formatDateLongID(from)} – ${formatDateLongID(to)}`}
        meta={<span>Dalam Rupiah</span>}
        notes="Transfer antar rekening tidak dihitung sebagai arus kas karena bersih nol. Klasifikasi mengikuti akun lawan jurnal."
      >
        <table className="ledger-table" style={{ minWidth: 560 }}>
          <caption className="sr-only">Arus kas {formatDateLongID(from)} sampai {formatDateLongID(to)}</caption>
          <tbody>
            <tr><td>Saldo kas awal</td><td className="num">{formatIDR(data.opening)}</td></tr>
            <tr><td colSpan={2} className="!bg-paper-deep px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">Arus kas</td></tr>
            {sections.map((section) => (
              <tr key={section.key}>
                <td className="pl-6">{section.label}</td>
                <td className="num">{formatIDR(section.total, { negative: "parentheses" })}</td>
              </tr>
            ))}
            <tr><td className="font-medium">Perubahan kas bersih</td><td className="num font-medium">{formatIDR(data.netChange, { negative: "parentheses" })}</td></tr>
          </tbody>
          <tfoot>
            <tr className="double-rule"><td className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em]">Saldo kas akhir</td><td className="num px-3 py-2 font-medium">{formatIDR(data.closing)}</td></tr>
          </tfoot>
        </table>

        <h2 className="mt-5 font-display text-lg font-semibold text-ink">Rincian mutasi kas</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 640 }}>
            <caption className="sr-only">Rincian mutasi kas</caption>
            <thead>
              <tr><th scope="col">Tanggal</th><th scope="col">Jurnal</th><th scope="col">Keterangan</th><th scope="col">Klasifikasi</th><th scope="col" className="num">Jumlah</th></tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr><td colSpan={5} className="!h-16 text-center text-sm text-ink-soft">Tidak ada mutasi kas.</td></tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={`${row.number}-${row.date}`}>
                    <td className="font-mono text-xs">{row.date}</td>
                    <td className="font-mono text-xs">{row.number}</td>
                    <td>{row.description}</td>
                    <td className="text-xs uppercase tracking-[0.08em] text-ink-soft">{row.classification}</td>
                    <td className="num">{formatIDR(row.amount, { negative: "parentheses" })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ReportDocument>
    </>
  );
}
