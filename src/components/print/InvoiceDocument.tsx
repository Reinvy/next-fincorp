import type { CompanyLetterhead } from "@/components/print/PrintHeader";
import { DocumentMeta, PrintHeader, SignatureBlock } from "@/components/print/PrintHeader";
import type { SalesInvoiceDetail } from "@/lib/dto";
import { formatDateID } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { StatusStamp, Stamp } from "@/components/ui/paper";

export function InvoiceDocument({
  company,
  invoice,
}: {
  company: CompanyLetterhead;
  invoice: SalesInvoiceDetail;
}) {
  return (
    <div>
      <PrintHeader
        company={company}
        title="Faktur Penjualan"
        subtitle={invoice.number}
        meta={
          <span>
            {formatDateID(invoice.date)} · jatuh tempo {formatDateID(invoice.dueDate)}
          </span>
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="eyebrow">Ditagihkan kepada</p>
          <p className="mt-1 font-medium text-ink">{invoice.customerName}</p>
          {invoice.customerNpwp ? <p className="font-mono text-[11px] text-ink-soft">NPWP {invoice.customerNpwp}</p> : null}
          {invoice.customerAddress ? <p className="mt-1 max-w-xs text-xs text-ink-soft">{invoice.customerAddress}</p> : null}
        </div>
        <div className="sm:text-right">
          <div className="flex gap-2 sm:justify-end">
            <StatusStamp status={invoice.status} />
            {invoice.overdue ? <StatusStamp kind="overdue" status="OVERDUE" /> : null}
          </div>
          <div className="mt-2">
            <DocumentMeta
              items={[
                { label: "Nomor", value: <span className="font-mono text-xs">{invoice.number}</span> },
                { label: "Jatuh tempo", value: <span className="font-mono text-xs">{formatDateID(invoice.dueDate)}</span> },
                ...(invoice.taxInvoiceNumber
                  ? [{ label: "Faktur pajak", value: <span className="font-mono text-xs">{invoice.taxInvoiceNumber}</span> }]
                  : []),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="ledger-table" style={{ minWidth: 560 }}>
          <caption className="sr-only">Item faktur {invoice.number}</caption>
          <thead>
            <tr>
              <th scope="col">Deskripsi</th>
              <th scope="col" className="num">Qty</th>
              <th scope="col" className="num">Harga</th>
              <th scope="col" className="num">Diskon</th>
              <th scope="col" className="num">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{formatIDR(item.unitPrice)}</td>
                <td className="num">{item.discountPercent ? `${item.discountPercent}%` : "—"}</td>
                <td className="num">{formatIDR(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="max-w-sm text-xs text-ink-soft">
          {invoice.paymentTerms ? <p>Termin: {invoice.paymentTerms}</p> : null}
          {invoice.notes ? <p className="mt-1 whitespace-pre-line">{invoice.notes}</p> : null}
          <p className="mt-2 font-mono text-[10px] text-ink-faint">
            Pembayaran: {formatIDR(invoice.paidAmount)} · Retur: {formatIDR(invoice.creditedAmount)}
          </p>
        </div>
        <div className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><span className="money">{formatIDR(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Diskon</span><span className="money">−{formatIDR(invoice.discountTotal, { withSymbol: false })}</span></div>
          <div className="flex justify-between border-t border-rule pt-1.5"><span className="text-ink-soft">DPP</span><span className="money">{formatIDR(invoice.dpp)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">PPN {invoice.ppnRate}%</span><span className="money">{formatIDR(invoice.ppnAmount)}</span></div>
          <div className="double-rule flex justify-between pt-2 text-base font-medium"><span>Total</span><span className="money">{formatIDR(invoice.grandTotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Sisa tagihan</span><span className="money font-medium">{formatIDR(invoice.outstanding)}</span></div>
        </div>
      </div>

      {invoice.payments.filter((payment) => !payment.voided).length > 0 ? (
        <div className="mt-5">
          <p className="eyebrow">Riwayat pembayaran</p>
          <table className="ledger-table mt-2" style={{ minWidth: 420 }}>
            <caption className="sr-only">Pembayaran faktur {invoice.number}</caption>
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Rekening</th>
                <th scope="col">Referensi</th>
                <th scope="col" className="num">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments
                .filter((payment) => !payment.voided)
                .map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-mono text-xs">{formatDateID(payment.date)}</td>
                    <td>{payment.bankAccountName}</td>
                    <td>{payment.reference ?? "—"}</td>
                    <td className="num">{formatIDR(payment.amount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {invoice.returns.length > 0 ? (
        <div className="mt-4">
          <p className="eyebrow">Nota kredit</p>
          <ul className="mt-1 text-xs text-ink-soft">
            {invoice.returns.map((note) => (
              <li key={note.id}>
                {note.number} · {formatDateID(note.date)} · {formatIDR(note.total)} — {note.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invoice.taxInvoiceStatus !== "NONE" ? (
        <div className="mt-4 flex items-center gap-2">
          <span className="eyebrow">Faktur pajak</span>
          <StatusStamp kind="taxInvoice" status={invoice.taxInvoiceStatus} />
          {invoice.taxInvoiceDate ? <span className="font-mono text-[10px] text-ink-faint">{formatDateID(invoice.taxInvoiceDate)}</span> : null}
        </div>
      ) : null}

      <SignatureBlock left="Dibuat oleh" middle="Diperiksa" right="Diterima pelanggan" />
      <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
        Dokumen ini dihasilkan dari jurnal terposting FinCorp
      </p>
      {invoice.status === "VOID" ? <div className="mt-2 text-center"><Stamp tone="vermilion">Dibatalkan</Stamp></div> : null}
    </div>
  );
}
