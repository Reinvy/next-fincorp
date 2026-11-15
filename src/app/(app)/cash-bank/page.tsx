import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { getCashPosition } from "@/server/cash/accounts";
import { listCashActivity } from "@/server/cash/transactions";
import { listLeafAccounts } from "@/server/accounting/accounts";
import { formatIDR } from "@/lib/money";
import { formatDateID } from "@/lib/dates";
import { JOURNAL_TYPE_LABELS } from "@/lib/constants";
import { BankCard } from "@/components/domain/BankCard";
import { BankAccountDialog, CashTransactionDialog, TransferDialog } from "@/components/forms/CashDialogs";
import { ActionLink, EmptyState, KpiCard, PageHeader, PaperCard, SectionRule } from "@/components/ui/paper";
import { DataTable } from "@/components/ui/data-table";
import { buttonStyles } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kas & Bank" };

export default async function CashBankPage() {
  const { actor, activeCompany } = await requireActorPage();
  const [position, activity, leafAccounts] = await Promise.all([
    getCashPosition(actor),
    listCashActivity(actor, { limit: 10 }),
    listLeafAccounts(actor),
  ]);
  const counterAccounts = leafAccounts.filter(
    (account) => account.systemRole !== "CASH" && account.systemRole !== "BANK",
  );
  const canEdit = actor.role !== "VIEWER";
  const activeCount = position.accounts.filter((account) => account.isActive).length;

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Kas & Bank"
        description="Saldo dihitung dari jurnal terposting. Saldo awal hanya metadata; seluruh mutasi masuk ke buku besar."
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <BankAccountDialog />
              <CashTransactionDialog accounts={position.accounts} counterAccounts={counterAccounts} />
              <TransferDialog accounts={position.accounts} />
              <ActionLink href="/cash-bank/reconciliation" variant="ghost">
                Rekonsiliasi
              </ActionLink>
            </div>
          ) : (
            <ActionLink href="/cash-bank/reconciliation" variant="secondary">
              Rekonsiliasi
            </ActionLink>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total kas & bank" value={formatIDR(position.total)} note={`${activeCount} rekening aktif`} index="01" />
        <KpiCard label="Kas" value={formatIDR(position.cash)} note="Rekening tunai" index="02" />
        <KpiCard label="Bank" value={formatIDR(position.bank)} note="Rekening bank" index="03" />
        <KpiCard
          label="Rekening"
          value={String(position.accounts.length)}
          note={position.accounts.length === 0 ? "Belum ada rekening" : "Termasuk nonaktif"}
          index="04"
        />
      </div>

      <div className="mt-6">
        <SectionRule label="Buku rekening" right={<span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Saldo berjalan</span>} />
        {position.accounts.length === 0 ? (
          <PaperCard className="mt-3">
            <EmptyState
              title="Belum ada rekening kas atau bank"
              description="Tambahkan rekening dengan saldo awal. Jurnal saldo awal akan dibuat otomatis dan menjadi dasar seluruh pembayaran."
              action={canEdit ? <BankAccountDialog triggerLabel="Tambah rekening pertama" /> : undefined}
            />
          </PaperCard>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {position.accounts.map((account) => (
              <BankCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </div>

      <PaperCard className="mt-6 overflow-hidden">
        <div className="border-b border-rule px-4 py-3">
          <SectionRule
            label="Mutasi terakhir"
            right={
              <Link href="/cash-bank/reconciliation" className="text-xs text-forest underline underline-offset-4">
                Rekonsiliasi bank
              </Link>
            }
          />
        </div>
        <DataTable
          caption="Mutasi kas dan bank terakhir"
          rows={activity}
          getRowKey={(row) => row.id}
          rowHref={(row) => `/accounting/journal/${row.journalEntryId}`}
          minWidth={720}
          empty={<EmptyState title="Belum ada mutasi" description="Transaksi kas, pembayaran, dan transfer akan tampil di sini." />}
          columns={[
            { key: "date", header: "Tanggal", render: (row) => <span className="font-mono text-xs">{formatDateID(row.date)}</span> },
            { key: "number", header: "Jurnal", render: (row) => <span className="font-mono text-xs">{row.number}</span> },
            {
              key: "description",
              header: "Keterangan",
              render: (row) => (
                <span className="block max-w-[320px] truncate" title={row.description}>
                  {row.description}
                </span>
              ),
            },
            { key: "type", header: "Tipe", render: (row) => JOURNAL_TYPE_LABELS[row.type] ?? row.type },
            { key: "account", header: "Rekening", render: (row) => <span className="text-ink-soft">{row.accountName}</span> },
            {
              key: "amount",
              header: "Nominal",
              align: "right",
              render: (row) => (
                <span className={row.amount < 0 ? "money text-vermilion" : "money text-forest"}>
                  {formatIDR(row.amount)}
                </span>
              ),
            },
          ]}
        />
      </PaperCard>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/cash-bank/reconciliation" className={buttonStyles({ variant: "ghost", size: "sm" })}>
          Impor & cocokkan mutasi bank
        </Link>
      </div>
    </>
  );
}
