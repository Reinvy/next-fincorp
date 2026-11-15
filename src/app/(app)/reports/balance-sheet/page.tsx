import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { getBalanceSheet, getCompanyLetterhead } from "@/server/accounting/reports";
import { dateFromISO, formatDateLongID, todayISO } from "@/lib/dates";
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
export const metadata = { title: "Neraca" };

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawAsOf = firstValue(params.asOf);
  const asOf = rawAsOf ? dateFromISO(rawAsOf) : dateFromISO(todayISO());
  const { actor } = await requireActorPage();
  const [data, company] = await Promise.all([getBalanceSheet(actor, asOf), getCompanyLetterhead(actor)]);
  if (!company) return null;
  const csvQuery = `?asOf=${asOf.toISOString().slice(0, 10)}`;

  return (
    <>
      <PageHeader
        breadcrumbs={<Link href="/reports" className="text-xs text-ink-soft hover:text-ink">← Kembali ke laporan</Link>}
        eyebrow="Laporan keuangan"
        title="Neraca"
        description={`Posisi keuangan per ${formatDateLongID(asOf)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            <DownloadLink href={`/api/export/balance-sheet${csvQuery}`} className={buttonStyles({ variant: "ghost", size: "md" })}>
              CSV
            </DownloadLink>
          </div>
        }
      />
      <div className="mb-4 print:hidden">
        <SearchFilterBar action="/reports/balance-sheet" resetHref="/reports/balance-sheet" className="border border-rule">
          <Field label="Per tanggal" htmlFor="asOf">
            <Input id="asOf" name="asOf" type="date" defaultValue={asOf.toISOString().slice(0, 10)} className="h-9" />
          </Field>
          <div className="pb-1">{data.balanced ? <Stamp tone="forest">Seimbang</Stamp> : <Stamp tone="vermilion">Tidak seimbang</Stamp>}</div>
        </SearchFilterBar>
      </div>

      <ReportDocument
        company={company}
        title="Neraca"
        subtitle={`Per ${formatDateLongID(asOf)}`}
        meta={<span>Dalam Rupiah</span>}
        notes="Disusun dari jurnal terposting. Laba tahun berjalan dihitung dari akun pendapatan dan beban sejak awal tahun buku."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink">Aset</h2>
            <table className="ledger-table mt-2">
              <caption className="sr-only">Aset per {formatDateLongID(asOf)}</caption>
              <tbody>
                {data.assetSections.map((section) => (
                  <FragmentSection key={section.key} label={section.label} total={section.total}>
                    {section.lines.map((line) => (
                      <tr key={`${section.key}-${line.code}`}>
                        <td className="w-16 font-mono text-[10px] text-ink-faint">{line.code}</td>
                        <td>{line.label}</td>
                        <td className="num">{formatIDR(line.amount, { negative: "parentheses" })}</td>
                      </tr>
                    ))}
                  </FragmentSection>
                ))}
              </tbody>
              <tfoot>
                <tr className="double-rule">
                  <td colSpan={2} className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em]">Total aset</td>
                  <td className="num px-3 py-2 font-medium">{formatIDR(data.totalAssets)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink">Liabilitas</h2>
            <table className="ledger-table mt-2">
              <caption className="sr-only">Liabilitas per {formatDateLongID(asOf)}</caption>
              <tbody>
                {data.liabilitySections.map((section) => (
                  <FragmentSection key={section.key} label={section.label} total={section.total}>
                    {section.lines.map((line) => (
                      <tr key={`${section.key}-${line.code}`}>
                        <td className="w-16 font-mono text-[10px] text-ink-faint">{line.code}</td>
                        <td>{line.label}</td>
                        <td className="num">{formatIDR(line.amount)}</td>
                      </tr>
                    ))}
                  </FragmentSection>
                ))}
              </tbody>
              <tfoot>
                <tr className="double-rule">
                  <td colSpan={2} className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em]">Total liabilitas</td>
                  <td className="num px-3 py-2 font-medium">{formatIDR(data.totalLiabilities)}</td>
                </tr>
              </tfoot>
            </table>

            <h2 className="mt-5 font-display text-lg font-semibold text-ink">Ekuitas</h2>
            <table className="ledger-table mt-2">
              <caption className="sr-only">Ekuitas per {formatDateLongID(asOf)}</caption>
              <tbody>
                {data.equitySections.map((section) => (
                  <FragmentSection key={section.key} label={section.label} total={section.total}>
                    {section.lines.map((line, index) => (
                      <tr key={`${section.key}-${line.code || index}`}>
                        <td className="w-16 font-mono text-[10px] text-ink-faint">{line.code}</td>
                        <td>{line.label}</td>
                        <td className="num">{formatIDR(line.amount, { negative: "parentheses" })}</td>
                      </tr>
                    ))}
                  </FragmentSection>
                ))}
              </tbody>
              <tfoot>
                <tr className="double-rule">
                  <td colSpan={2} className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em]">Total ekuitas</td>
                  <td className="num px-3 py-2 font-medium">{formatIDR(data.totalEquity)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em]">Total liabilitas + ekuitas</td>
                  <td className="num px-3 py-2 font-medium">{formatIDR(data.totalLiabilities + data.totalEquity)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        </div>
      </ReportDocument>
    </>
  );
}

function FragmentSection({
  label,
  total,
  children,
}: {
  label: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr>
        <td colSpan={3} className="!bg-paper-deep px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {label}
        </td>
      </tr>
      {children}
      <tr>
        <td colSpan={2} className="text-right font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          Subtotal
        </td>
        <td className="num text-ink-soft">{formatIDR(total, { negative: "parentheses" })}</td>
      </tr>
    </>
  );
}
