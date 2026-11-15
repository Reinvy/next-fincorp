import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getSalesInvoiceDetail } from "@/server/sales/invoices";
import { listBankAccounts } from "@/server/cash/accounts";
import { DomainError } from "@/lib/db-errors";
import { todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { PageHeader, PaperCard, SectionRule, StatusStamp, Stamp } from "@/components/ui/paper";
import { PrintButton } from "@/components/print/PrintButton";
import { InvoiceDocument } from "@/components/print/InvoiceDocument";
import { InvoiceActions } from "@/components/forms/InvoiceActions";

export const dynamic = "force-dynamic";

export default async function SalesInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireActorPage();
  let invoice;
  try {
    invoice = await getSalesInvoiceDetail(actor, id);
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
          <Link href="/sales" className="text-xs text-ink-soft hover:text-ink">
            ← Kembali ke penjualan
          </Link>
        }
        eyebrow="Faktur penjualan"
        title={invoice.number}
        description={invoice.customerName}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <PrintButton />
            {canEdit ? <InvoiceActions invoice={invoice} accounts={accounts} today={todayISO()} /> : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <PaperCard className="print-sheet p-4 sm:p-6">
          <InvoiceDocument company={company} invoice={invoice} />
        </PaperCard>

        <aside className="space-y-4 print:hidden">
          <PaperCard className="p-4">
            <SectionRule label="Status" />
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusStamp status={invoice.status} />
              {invoice.overdue ? <StatusStamp kind="overdue" status="OVERDUE" /> : null}
              <StatusStamp kind="taxInvoice" status={invoice.taxInvoiceStatus} />
              {invoice.status === "VOID" ? <Stamp tone="vermilion">Dibatalkan</Stamp> : null}
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Total</dt><dd className="money">{formatIDR(invoice.grandTotal)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Dibayar</dt><dd className="money">{formatIDR(invoice.paidAmount)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-ink-soft">Retur</dt><dd className="money">{formatIDR(invoice.creditedAmount)}</dd></div>
              <div className="flex justify-between gap-2 border-t border-rule pt-2"><dt className="text-ink-soft">Sisa</dt><dd className="money font-medium">{formatIDR(invoice.outstanding)}</dd></div>
            </dl>
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
                        {payment.date} · {payment.bankAccountName}
                        {payment.voided ? " · dibatalkan" : ""}
                      </p>
                    </div>
                    {payment.voided ? <Stamp tone="neutral">Batal</Stamp> : <Stamp tone="forest">Masuk</Stamp>}
                  </li>
                ))}
              </ul>
            )}
          </PaperCard>

          <PaperCard className="p-4">
            <SectionRule label="Nota kredit" />
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

          <PaperCard className="p-4">
            <SectionRule label="Data pelanggan" />
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-ink">{invoice.customerName}</p>
              {invoice.customerNpwp ? <p className="font-mono text-xs text-ink-soft">NPWP {invoice.customerNpwp}</p> : null}
              {invoice.customerAddress ? <p className="text-xs text-ink-soft">{invoice.customerAddress}</p> : null}
            </div>
            <Link href="/sales/customers" className="mt-3 inline-block text-xs text-forest underline underline-offset-4">
              Kelola pelanggan
            </Link>
          </PaperCard>
        </aside>
      </div>
    </>
  );
}
