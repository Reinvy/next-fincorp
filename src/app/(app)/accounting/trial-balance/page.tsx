import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getTrialBalance } from "@/server/accounting/trial-balance";
import { dateFromISO, formatDateLongID, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { AccountingTabs } from "@/components/layout/AccountingTabs";
import { PageHeader, PaperCard, Stamp } from "@/components/ui/paper";
import { PrintButton } from "@/components/print/PrintButton";
import { PrintHeader, SignatureBlock } from "@/components/print/PrintHeader";
import { SearchFilterBar } from "@/components/ui/filter-bar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Neraca Saldo" };

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawAsOf = firstValue(params.asOf);
  const asOf = rawAsOf ? dateFromISO(rawAsOf) : dateFromISO(todayISO());
  const { actor, activeCompany } = await requireActorPage();
  const [report, company] = await Promise.all([
    getTrialBalance(actor, asOf),
    prisma.company.findUnique({
      where: { id: actor.companyId },
      select: {
        name: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        npwp: true,
        email: true,
        phone: true,
        logoDataUrl: true,
      },
    }),
  ]);
  if (!company) return null;

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Neraca Saldo"
        description="Saldo setiap akun daun dari jurnal terposting sampai tanggal yang dipilih."
        actions={<PrintButton />}
      />
      <AccountingTabs />

      <PaperCard className="print-sheet p-4 sm:p-6">
        <PrintHeader
          company={company}
          title="Neraca Saldo"
          subtitle={`Per ${formatDateLongID(asOf)}`}
          meta={<span>Dalam Rupiah</span>}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <SearchFilterBar action="/accounting/trial-balance" resetHref="/accounting/trial-balance" className="w-full border-0 bg-transparent p-0">
            <Field label="Per tanggal" htmlFor="asOf">
              <Input id="asOf" name="asOf" type="date" defaultValue={asOf.toISOString().slice(0, 10)} className="h-9" />
            </Field>
          </SearchFilterBar>
          {report.balanced ? <Stamp tone="forest">Seimbang</Stamp> : <Stamp tone="vermilion">Tidak seimbang</Stamp>}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 680 }}>
            <caption className="sr-only">Neraca saldo per {formatDateLongID(asOf)}</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: 100 }}>Kode</th>
                <th scope="col">Nama akun</th>
                <th scope="col" className="num">Debit</th>
                <th scope="col" className="num">Kredit</th>
              </tr>
            </thead>
            {report.groups.map((group) => (
              <tbody key={group.group}>
                <tr>
                  <td colSpan={4} className="!bg-paper-deep px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    {group.label}
                  </td>
                </tr>
                {group.accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="font-mono text-xs text-ink-faint">{account.code}</td>
                    <td>{account.name}</td>
                    <td className="num">{account.debit ? formatIDR(account.debit) : "—"}</td>
                    <td className="num">{account.credit ? formatIDR(account.credit) : "—"}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} className="text-right font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                    Subtotal {group.label}
                  </td>
                  <td className="num text-ink-soft">{formatIDR(group.debit)}</td>
                  <td className="num text-ink-soft">{formatIDR(group.credit)}</td>
                </tr>
              </tbody>
            ))}
            <tfoot>
              <tr className="double-rule">
                <td colSpan={2} className="px-3 py-3 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-ink">
                  Total
                </td>
                <td className="num px-3 py-3 font-medium">{formatIDR(report.totalDebit)}</td>
                <td className="num px-3 py-3 font-medium">{formatIDR(report.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {report.groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">Belum ada jurnal terposting sampai tanggal ini.</p>
        ) : null}

        <p className="mt-4 text-xs text-ink-faint">
          Tidak ada saldo yang disimpan; seluruh angka dihitung ulang dari jurnal terposting.
        </p>
        <SignatureBlock left="Dibuat oleh" middle="Diperiksa" right="Disetujui" />
      </PaperCard>
    </>
  );
}
