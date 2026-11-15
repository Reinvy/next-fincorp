import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { listLeafAccounts } from "@/server/accounting/accounts";
import { getLedgerReport } from "@/server/accounting/journals";
import { dateFromISO, formatDateID, monthBounds, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { LEDGER_PAGE_SIZE } from "@/lib/constants";
import { AccountingTabs } from "@/components/layout/AccountingTabs";
import { EmptyState, KpiCard, PageHeader, PaperCard } from "@/components/ui/paper";
import { Pagination } from "@/components/ui/pagination";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PrintButton } from "@/components/print/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buku Besar" };

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const accounts = await listLeafAccounts(actor);
  const today = dateFromISO(todayISO());
  const defaults = monthBounds(today.toISOString().slice(0, 7));

  if (accounts.length === 0) {
    return (
      <>
        <PageHeader eyebrow={activeCompany.companyName} title="Buku Besar" />
        <AccountingTabs />
        <PaperCard>
          <EmptyState title="Belum ada akun" description="Buat bagan akun terlebih dahulu." />
        </PaperCard>
      </>
    );
  }

  const rawAccount = firstValue(params.account);
  const accountId = accounts.some((account) => account.value === rawAccount) ? rawAccount! : accounts[0].value;
  const rawFrom = firstValue(params.from);
  const rawTo = firstValue(params.to);
  const from = rawFrom ? dateFromISO(rawFrom) : defaults.start;
  const to = rawTo ? dateFromISO(rawTo) : defaults.end;
  const page = Math.max(1, Number.parseInt(firstValue(params.page) ?? "1", 10) || 1);
  const report = await getLedgerReport(actor, { accountId, from, to, page });

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Buku Besar"
        description="Mutasi per akun dengan saldo berjalan sesuai saldo normal akun."
        actions={<PrintButton />}
      />
      <AccountingTabs />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Saldo awal" value={formatIDR(report.opening)} note={formatDateID(from)} index="01" />
        <KpiCard label="Perubahan" value={formatIDR(report.rows.reduce((acc, row) => acc + (report.account.normalBalance === "DEBIT" ? row.debit - row.credit : row.credit - row.debit), 0))} note="Halaman ini" index="02" />
        <KpiCard label="Saldo akhir" value={formatIDR(report.ending)} note={formatDateID(to)} index="03" tone="forest" />
      </div>

      <PaperCard className="overflow-hidden print-sheet">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3">
          <div>
            <p className="font-mono text-xs text-ink-faint">{report.account.code}</p>
            <h2 className="font-display text-xl font-semibold text-ink">{report.account.name}</h2>
          </div>
          <p className="font-mono text-[11px] text-ink-soft">
            {formatDateID(from)} – {formatDateID(to)} · {report.total} mutasi
          </p>
        </div>

        <SearchFilterBar action="/accounting/ledger" resetHref="/accounting/ledger" className="print:hidden">
          <Field label="Akun" htmlFor="account">
            <Select id="account" name="account" defaultValue={accountId} className="h-9 min-w-[220px]">
              {accounts.map((account) => (
                <option key={account.value} value={account.value}>
                  {account.code} · {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dari" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={from.toISOString().slice(0, 10)} className="h-9" />
          </Field>
          <Field label="Sampai" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={to.toISOString().slice(0, 10)} className="h-9" />
          </Field>
        </SearchFilterBar>

        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 760 }}>
            <caption className="sr-only">Buku besar {report.account.name}</caption>
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Jurnal</th>
                <th scope="col">Keterangan</th>
                <th scope="col" className="num">Debit</th>
                <th scope="col" className="num">Kredit</th>
                <th scope="col" className="num">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  Saldo awal per {formatDateID(from)}
                </td>
                <td className="num font-medium">{formatIDR(report.opening)}</td>
              </tr>
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!h-20 text-center text-sm text-ink-soft">
                    Tidak ada mutasi pada rentang ini.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{formatDateID(row.date)}</td>
                    <td>
                      <Link href={`/accounting/journal/${row.journalEntryId}`} className="font-mono text-xs text-forest underline underline-offset-4">
                        {row.number}
                      </Link>
                    </td>
                    <td>
                      <span className="block max-w-[320px] truncate" title={row.description}>{row.description}</span>
                      {row.reference ? <span className="font-mono text-[10px] text-ink-faint">{row.reference}</span> : null}
                    </td>
                    <td className="num">{row.debit ? formatIDR(row.debit) : "—"}</td>
                    <td className="num">{row.credit ? formatIDR(row.credit) : "—"}</td>
                    <td className="num">{formatIDR(row.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="double-rule">
                <td colSpan={5} className="px-3 py-3 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                  Saldo akhir
                </td>
                <td className="num px-3 py-3 font-medium">{formatIDR(report.ending)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <Pagination
          page={report.page}
          totalPages={report.totalPages}
          basePath="/accounting/ledger"
          searchParams={{ account: accountId, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }}
        />
        <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {LEDGER_PAGE_SIZE} baris per halaman
        </p>
      </PaperCard>
    </>
  );
}
