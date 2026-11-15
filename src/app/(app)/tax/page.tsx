import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getTaxSummary } from "@/server/tax/tax";
import { listBankAccounts } from "@/server/cash/accounts";
import { formatDateID, formatMonthID, parseMonthKey, todayISO } from "@/lib/dates";
import { formatIDR, D } from "@/lib/money";
import { TAX_TYPE_LABELS } from "@/lib/constants";
import { firstValue } from "@/lib/params";
import { buttonStyles } from "@/components/ui/button";
import { KpiCard, PageHeader, PaperCard, SectionRule, Stamp, StatusStamp } from "@/components/ui/paper";
import { PayTaxDialog, SettlePpnDialog } from "@/components/forms/TaxDialogs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pajak" };

function shiftPeriod(period: string, delta: number): string {
  const { year, month } = parseMonthKey(period);
  const target = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const raw = firstValue(params.period);
  const period = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : todayISO().slice(0, 7);
  const [summary, banks, pph25Account] = await Promise.all([
    getTaxSummary(actor, period),
    listBankAccounts(actor),
    prisma.glAccount.findFirst({
      where: { companyId: actor.companyId, code: "2160", children: { none: {} } },
      select: { id: true },
    }),
  ]);
  const pph25Balance = pph25Account
    ? D(
        (
          await prisma.journalLine.aggregate({
            where: { accountId: pph25Account.id, journalEntry: { companyId: actor.companyId, status: "POSTED" } },
            _sum: { debit: true, credit: true },
          })
        )._sum.credit ?? 0,
      )
        .minus(
          D(
            (
              await prisma.journalLine.aggregate({
                where: { accountId: pph25Account.id, journalEntry: { companyId: actor.companyId, status: "POSTED" } },
                _sum: { debit: true, credit: true },
              })
            )._sum.debit ?? 0,
          ),
        )
        .toNumber()
    : 0;
  const canEdit = actor.role !== "VIEWER";
  const payRows = [
    ...summary.pphWithheld
      .filter((row) => row.withheld > 0 || row.liabilityBalance > 0 || row.paid > 0)
      .map((row) => ({
        type: row.type,
        label: `${TAX_TYPE_LABELS[row.type] ?? row.type} · ${row.accountName}`,
        liability: row.liabilityBalance,
      })),
    { type: "PPH25", label: "PPh 25/29 · Utang PPh 25/29", liability: Math.max(0, pph25Balance) },
  ];

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Pajak"
        description="PPN dihitung dari mutasi jurnal PPN Keluaran dan Masukan. PPh dipotong saat pembayaran vendor."
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              {!summary.vatSettled && (summary.vat.output !== 0 || summary.vat.input !== 0) ? (
                <SettlePpnDialog period={period} net={summary.vat.net} banks={banks} />
              ) : null}
              <PayTaxDialog period={period} banks={banks} rows={payRows} />
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/tax?period=${shiftPeriod(period, -1)}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          ←
        </Link>
        <span className="font-display text-lg font-semibold text-ink">{formatMonthID(period)}</span>
        <Link href={`/tax?period=${shiftPeriod(period, 1)}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          →
        </Link>
        <Link href={`/tax/efaktur?period=${period}`} className="ml-auto text-xs text-forest underline underline-offset-4">
          Detail e-Faktur
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="PPN Keluaran" value={formatIDR(summary.vat.output)} note="Kredit PPN periode ini" index="01" />
        <KpiCard label="PPN Masukan" value={formatIDR(summary.vat.input)} note="Debit PPN periode ini" index="02" />
        <KpiCard label="PPN Neto" value={formatIDR(summary.vat.net)} note={summary.vat.net > 0 ? "Kurang bayar" : "Lebih bayar"} index="03" tone={summary.vat.net > 0 ? "mustard" : "forest"} />
        <KpiCard
          label="Status kompensasi"
          value={summary.vatSettled ? "Selesai" : "Belum"}
          note={summary.vatSettled ? formatDateID(summary.vatSettled.date) : "Belum diselesaikan"}
          index="04"
          tone={summary.vatSettled ? "forest" : "vermilion"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <PaperCard className="overflow-hidden">
          <div className="border-b border-rule px-4 py-3">
            <SectionRule label="PPh dipotong & liabilitas" />
          </div>
          <div className="overflow-x-auto">
            <table className="ledger-table" style={{ minWidth: 640 }}>
              <caption className="sr-only">Ringkasan PPh periode {period}</caption>
              <thead>
                <tr>
                  <th scope="col">Jenis</th>
                  <th scope="col">Akun</th>
                  <th scope="col" className="num">Dipungut</th>
                  <th scope="col" className="num">Dibayar</th>
                  <th scope="col" className="num">Saldo utang</th>
                </tr>
              </thead>
              <tbody>
                {payRows.map((row) => (
                  <tr key={row.type}>
                    <td>{row.label.split(" · ")[0]}</td>
                    <td className="font-mono text-xs">{row.label.split(" · ")[1] ?? "—"}</td>
                    <td className="num">
                      {formatIDR(summary.pphWithheld.find((entry) => entry.type === row.type)?.withheld ?? 0)}
                    </td>
                    <td className="num">
                      {formatIDR(summary.pphWithheld.find((entry) => entry.type === row.type)?.paid ?? 0)}
                    </td>
                    <td className="num">{formatIDR(row.liability)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-rule px-4 py-2 text-xs text-ink-faint">
            PPh hanya diakui saat pembayaran vendor. PPh 21 memerlukan jurnal utang manual sebelum dapat dibayar.
          </p>
        </PaperCard>

        <div className="space-y-4">
          <PaperCard className="p-4">
            <SectionRule label="Kompensasi PPN" />
            {summary.vatSettled ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Tanggal</dt><dd className="font-mono text-xs">{formatDateID(summary.vatSettled.date)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Nominal bayar</dt><dd className="money">{formatIDR(summary.vatSettled.amount)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Rekening</dt><dd>{summary.vatSettled.bankName ?? "Kompensasi"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Jurnal kompensasi</dt><dd className="font-mono text-xs">{summary.vatSettled.settlementJournalNumber ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink-soft">Jurnal bayar</dt><dd className="font-mono text-xs">{summary.vatSettled.journalNumber ?? "—"}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">
                Belum diselesaikan. Penyelesaian mengosongkan PPN Keluaran/Masukan periode dan mencatat Utang PPN atau Lebih Bayar.
              </p>
            )}
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="e-Faktur periode ini" />
            <ul className="mt-3 space-y-1.5 text-sm">
              {Object.entries(summary.efaktur).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between gap-2">
                  <StatusStamp kind="taxInvoice" status={status} />
                  <span className="font-mono text-xs">{count}</span>
                </li>
              ))}
            </ul>
            <Link href={`/tax/efaktur?period=${period}`} className="mt-3 inline-block text-xs text-forest underline underline-offset-4">
              Kelola status e-Faktur
            </Link>
          </PaperCard>
        </div>
      </div>

      <PaperCard className="mt-4 overflow-hidden">
        <div className="border-b border-rule px-4 py-3">
          <SectionRule label="Pembayaran pajak" />
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 640 }}>
            <caption className="sr-only">Pembayaran pajak {period}</caption>
            <thead>
              <tr>
                <th scope="col">Jenis</th>
                <th scope="col">Tanggal</th>
                <th scope="col">Rekening</th>
                <th scope="col">Billing / NTPN</th>
                <th scope="col" className="num">Nominal</th>
                <th scope="col">Jurnal</th>
              </tr>
            </thead>
            <tbody>
              {summary.payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!h-20 text-center text-sm text-ink-soft">Belum ada pembayaran pajak periode ini.</td>
                </tr>
              ) : (
                summary.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td><Stamp tone="sky">{TAX_TYPE_LABELS[payment.type] ?? payment.type}</Stamp></td>
                    <td className="font-mono text-xs">{formatDateID(payment.date)}</td>
                    <td>{payment.bankName ?? "—"}</td>
                    <td className="font-mono text-[11px]">{[payment.billingId, payment.ntpN].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="num">{formatIDR(payment.amount)}</td>
                    <td className="font-mono text-xs">{payment.journalNumber ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PaperCard>
    </>
  );
}
