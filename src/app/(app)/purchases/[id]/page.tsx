import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getPurchaseInvoiceDetail } from "@/server/purchases/invoices";
import { listBankAccounts } from "@/server/cash/accounts";
import { DomainError } from "@/lib/db-errors";
import { todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { WITHHOLDING_LABELS } from "@/lib/constants";
import { PageHeader, PaperCard, SectionRule, StatusStamp, Stamp } from "@/components/ui/paper";
import { PrintButton } from "@/components/print/PrintButton";
import { PurchaseDocument } from "@/components/print/PurchaseDocument";
import { PurchaseActions } from "@/components/forms/PurchaseActions";

export const dynamic = "force-dynamic";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActorPage();
  let invoice;
  try {
    invoice = await getPurchaseInvoiceDetail(actor, id);
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  const [accounts, company] = await Promise.all([
    listBankAccounts(actor),
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
  if (!company) notFound();
  const canEdit = actor.role !== "VIEWER";

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link href="/purchases" className="text-xs text-ink-soft hover:text-ink">
            ← Kembali ke pembelian
          </Link>
        }
        eyebrow="Faktur pembelian"
        title={invoice.number}
        description={invoice.vendorName}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            {canEdit ? <PurchaseActions invoice={invoice} accounts={accounts} today={todayISO()} /> : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <PaperCard className="print-sheet p-4 sm:p-6">
          <PurchaseDocument company={company} invoice={invoice} />
        </PaperCard>

        <aside className="space-y-4 print:hidden">
          <PaperCard className="p-4">
            <SectionRule label="Status" />
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusStamp status={invoice.status} />
              {invoice.overdue ? <StatusStamp kind="overdue" status="OVERDUE" /> : null}
              {invoice.status === "VOID" ? <Stamp tone="vermilion">Dibatalkan</Stamp> : null}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Total</dt><dd className="money">{formatIDR(invoice.grandTotal)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Dibayar</dt><dd className="money">{formatIDR(invoice.paidAmount)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Retur</dt><dd className="money">{formatIDR(invoice.creditedAmount)}</dd></div>
              <div className="flex justify-between gap-2 border-t border-rule pt-2"><dt className="text-ink-soft">Sisa utang</dt><dd className="money font-medium">{formatIDR(invoice.outstanding)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">PPh belum dipotong</dt><dd className="money">{formatIDR(invoice.withholdingAmount)}</dd></div>
            </dl>
            <p className="mt-2 text-[11px] text-ink-faint">
              {WITHHOLDING_LABELS[invoice.withholdingType] ?? invoice.withholdingType} · tarif {invoice.withholdingRate}%
            </p>
            {invoice.journalEntryId ? (
              <Link href={`/accounting/journal/${invoice.journalEntryId}`} className="mt-3 inline-block text-xs text-forest underline underline-offset-4">
                Lihat jurnal faktur
              </Link>
            ) : (
              <p className="mt-3 text-xs text-ink-faint">Draf belum memiliki jurnal.</p>
            )}
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="Pembayaran" />
            {invoice.payments.length === 0 ? (
              <p className="mt-2 text-xs text-ink-faint">Belum ada pembayaran.</p>
            ) : (
              <ul className="mt-2 divide-y divide-rule text-sm">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-mono text-xs">{formatIDR(payment.amount)}</p>
                      <p className="text-[10px] text-ink-faint">
                        {payment.date} · {payment.bankAccountName} · kas {formatIDR(payment.bankAmount)}
                        {payment.voided ? " · dibatalkan" : ""}
                      </p>
                      {payment.withheldAmount > 0 ? (
                        <p className="text-[10px] text-ink-faint">PPh dipotong {formatIDR(payment.withheldAmount)}</p>
                      ) : null}
                    </div>
                    {payment.voided ? <Stamp tone="neutral">Batal</Stamp> : <Stamp tone="forest">Bayar</Stamp>}
                  </li>
                ))}
              </ul>
            )}
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="Nota debit" />
            {invoice.returns.length === 0 ? (
              <p className="mt-2 text-xs text-ink-faint">Belum ada retur.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {invoice.returns.map((note) => (
                  <li key={note.id}>
                    <p className="font-mono text-xs">{note.number}</p>
                    <p className="text-[10px] text-ink-faint">{note.date} · {formatIDR(note.total)}</p>
                    <p className="text-[12px] text-ink-soft">{note.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </PaperCard>
        </aside>
      </div>
    </>
  );
}
