import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getBankAccount, getCashPosition } from "@/server/cash/accounts";
import { getLedgerReport } from "@/server/accounting/journals";
import { listLeafAccounts } from "@/server/accounting/accounts";
import { DomainError } from "@/lib/db-errors";
import { dateFromISO, formatDateID, monthBounds, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { firstValue } from "@/lib/params";
import { LEDGER_PAGE_SIZE } from "@/lib/constants";
import { BankAccountActiveButton, CashTransactionDialog, TransferDialog } from "@/components/forms/CashDialogs";
import { ActionLink, KpiCard, PageHeader, PaperCard, SectionRule, Stamp } from "@/components/ui/paper";
import { PrintButton } from "@/components/print/PrintButton";
import { Pagination } from "@/components/ui/pagination";

export const dynamic = "force-dynamic";

export default async function BankAccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { actor } = await requireActorPage();
  let account;
  try {
    account = await getBankAccount(actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const today = dateFromISO(todayISO());
  const defaults = monthBounds(today.toISOString().slice(0, 7));
  const rawFrom = firstValue(query.from);
  const rawTo = firstValue(query.to);
  const from = rawFrom ? dateFromISO(rawFrom) : defaults.start;
  const to = rawTo ? dateFromISO(rawTo) : defaults.end;
  const page = Math.max(1, Number.parseInt(firstValue(query.page) ?? "1", 10) || 1);

  const [report, position, leafAccounts, transactions, transfers] = await Promise.all([
    getLedgerReport(actor, { accountId: account.coaAccountId, from, to, page }),
    getCashPosition(actor),
    listLeafAccounts(actor),
    prisma.cashTransaction.findMany({
      where: { companyId: actor.companyId, bankAccountId: account.id },
      orderBy: { date: "desc" },
      take: 8,
      include: { counterAccount: { select: { name: true } } },
    }),
    prisma.bankTransfer.findMany({
      where: { companyId: actor.companyId, OR: [{ fromAccountId: account.id }, { toAccountId: account.id }] },
      orderBy: { date: "desc" },
      take: 8,
      include: {
        fromAccount: { select: { name: true } },
        toAccount: { select: { name: true } },
      },
    }),
  ]);
  const counterAccounts = leafAccounts.filter(
    (leaf) => leaf.systemRole !== "CASH" && leaf.systemRole !== "BANK",
  );
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link href="/cash-bank" className="text-xs text-ink-soft hover:text-ink">
            ← Kembali ke kas &amp; bank
          </Link>
        }
        eyebrow={`${account.type === "CASH" ? "Kas" : "Bank"} · Akun ${account.coaCode}`}
        title={account.name}
        description={[account.bankName, account.accountNumber].filter(Boolean).join(" · ") || "Rekening tanpa nomor"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PrintButton />
            {canEdit ? (
              <>
                <CashTransactionDialog
                  accounts={position.accounts}
                  counterAccounts={counterAccounts}
                  defaultAccountId={account.id}
                  triggerLabel="Transaksi"
                />
                <TransferDialog accounts={position.accounts} defaultFromId={account.id} triggerLabel="Transfer" />
                <BankAccountActiveButton accountId={account.id} isActive={account.isActive} />
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Saldo buku" value={formatIDR(account.balance)} note="Dari jurnal terposting" index="01" tone="forest" />
        <KpiCard label="Saldo awal" value={formatIDR(account.openingBalance)} note={formatDateID(account.openingDate)} index="02" />
        <KpiCard label="Status" value={account.isActive ? "Aktif" : "Nonaktif"} note={account.type === "CASH" ? "Kas tunai" : "Rekening bank"} index="03" />
        <KpiCard
          label="Mutasi periode"
          value={formatIDR(report.rows.reduce((acc, row) => acc + row.debit - row.credit, 0))}
          note={`${formatDateID(from)} – ${formatDateID(to)}`}
          index="04"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PaperCard className="overflow-hidden print-sheet">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3">
            <SectionRule label="Buku rekening" />
            <Link
              href={`/cash-bank/reconciliation?account=${account.id}`}
              className="text-xs text-forest underline underline-offset-4"
            >
              Rekonsiliasi
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="ledger-table" style={{ minWidth: 640 }}>
              <caption className="sr-only">Mutasi rekening {account.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Jurnal</th>
                  <th scope="col">Keterangan</th>
                  <th scope="col" className="num">Masuk</th>
                  <th scope="col" className="num">Keluar</th>
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
                      Tidak ada mutasi pada periode ini.
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
                        <span className="block max-w-[260px] truncate" title={row.description}>{row.description}</span>
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
          <form method="get" className="flex flex-wrap items-end gap-2 border-t border-rule px-4 py-3 print:hidden">
            <label className="text-xs text-ink-soft" htmlFor="from">Dari</label>
            <input id="from" name="from" type="date" defaultValue={from.toISOString().slice(0, 10)} className="h-8 rounded border border-rule bg-paper-light px-2 font-mono text-xs" />
            <label className="text-xs text-ink-soft" htmlFor="to">Sampai</label>
            <input id="to" name="to" type="date" defaultValue={to.toISOString().slice(0, 10)} className="h-8 rounded border border-rule bg-paper-light px-2 font-mono text-xs" />
            <button type="submit" className="h-8 rounded border border-rule-strong bg-card px-2 font-mono text-[10px] uppercase tracking-[0.08em]">Terapkan</button>
            <span className="ml-auto font-mono text-[10px] text-ink-faint">{LEDGER_PAGE_SIZE} baris/halaman</span>
          </form>
          <Pagination
            page={report.page}
            totalPages={report.totalPages}
            basePath={`/cash-bank/${account.id}`}
            searchParams={{ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }}
          />
        </PaperCard>

        <div className="space-y-4">
          <PaperCard className="p-4">
            <SectionRule label="Info rekening" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">Akun COA</dt>
                <dd className="font-mono text-xs">{account.coaCode}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">Jenis</dt>
                <dd>{account.type === "CASH" ? "Kas" : "Bank"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">Nomor</dt>
                <dd className="font-mono text-xs">{account.accountNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-soft">Status</dt>
                <dd>{account.isActive ? <Stamp tone="forest">Aktif</Stamp> : <Stamp tone="neutral">Nonaktif</Stamp>}</dd>
              </div>
            </dl>
            <ActionLink href={`/cash-bank/reconciliation?account=${account.id}`} variant="secondary" size="sm">
              Buka rekonsiliasi
            </ActionLink>
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="Transaksi kas" />
            {transactions.length === 0 ? (
              <p className="mt-3 text-xs text-ink-faint">Belum ada transaksi kas langsung.</p>
            ) : (
              <ul className="mt-3 divide-y divide-rule text-sm">
                {transactions.map((transaction) => (
                  <li key={transaction.id} className="flex items-start justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-ink">{transaction.description}</p>
                      <p className="font-mono text-[10px] text-ink-faint">
                        {formatDateID(transaction.date)} · {transaction.counterAccount.name}
                      </p>
                    </div>
                    <span className={`money text-xs ${transaction.direction === "IN" ? "text-forest" : "text-vermilion"}`}>
                      {transaction.direction === "IN" ? "+" : "−"}
                      {formatIDR(Number(transaction.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="Transfer" />
            {transfers.length === 0 ? (
              <p className="mt-3 text-xs text-ink-faint">Belum ada transfer antar rekening.</p>
            ) : (
              <ul className="mt-3 divide-y divide-rule text-sm">
                {transfers.map((transfer) => {
                  const outgoing = transfer.fromAccountId === account.id;
                  return (
                    <li key={transfer.id} className="py-2">
                      <p className="truncate text-[13px] text-ink">{transfer.description}</p>
                      <p className="font-mono text-[10px] text-ink-faint">
                        {formatDateID(transfer.date)} · {transfer.fromAccount.name} → {transfer.toAccount.name}
                      </p>
                      <p className={`money mt-0.5 text-xs ${outgoing ? "text-vermilion" : "text-forest"}`}>
                        {outgoing ? "−" : "+"}
                        {formatIDR(Number(transfer.amount))}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </PaperCard>
        </div>
      </div>
    </>
  );
}
