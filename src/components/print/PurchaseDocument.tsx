import type { CompanyLetterhead } from "@/components/print/PrintHeader";
import { DocumentMeta, PrintHeader, SignatureBlock } from "@/components/print/PrintHeader";
import type { PurchaseInvoiceDetail } from "@/lib/dto";
import { formatDateID } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { StatusStamp, Stamp } from "@/components/ui/paper";
import { WITHHOLDING_LABELS } from "@/lib/constants";

export function PurchaseDocument({
  company,
  invoice,
}: {
  company: CompanyLetterhead;
  invoice: PurchaseInvoiceDetail;
}) {
  return (
    <div>
      <PrintHeader
        company={company}
        title="Faktur Pembelian"
        subtitle={invoice.number}
        meta={
          <span>
            {formatDateID(invoice.date)} · jatuh tempo {formatDateID(invoice.dueDate)}
          </span>
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="eyebrow">Vendor</p>
          <p className="mt-1 font-medium text-ink">{invoice.vendorName}</p>
          {invoice.vendorNpwp ? <p className="font-mono text-[11px] text-ink-soft">NPWP {invoice.vendorNpwp}</p> : null}
          {invoice.vendorAddress ? <p className="mt-1 max-w-xs text-xs text-ink-soft">{invoice.vendorAddress}</p> : null}
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
                {
                  label: "Potongan",
                  value: (
                    <span className="text-xs">
                      {WITHHOLDING_LABELS[invoice.withholdingType] ?? invoice.withholdingType} {invoice.withholdingRate}%
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="ledger-table" style={{ minWidth: 600 }}>
          <caption className="sr-only">Item faktur pembelian {invoice.number}</caption>
          <thead>
            <tr>
              <th scope="col">Akun / deskripsi</th>
              <th scope="col" className="num">Qty</th>
              <th scope="col" className="num">Harga</th>
              <th scope="col" className="num">Diskon</th>
              <th scope="col" className="num">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <p>{item.description}</p>
                  <p className="font-mono text-[10px] text-ink-faint">{item.accountName}</p>
                </td>
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
          {invoice.notes ? <p className="whitespace-pre-line">{invoice.notes}</p> : null}
          <p className="mt-2 font-mono text-[10px] text-ink-faint">
            Dibayar: {formatIDR(invoice.paidAmount)} · Retur: {formatIDR(invoice.creditedAmount)}
          </p>
        </div>
        <div className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><span className="money">{formatIDR(invoice.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Diskon</span><span className="money">−{formatIDR(invoice.discountTotal, { withSymbol: false })}</span></div>
          <div className="flex justify-between border-t border-rule pt-1.5"><span className="text-ink-soft">DPP</span><span className="money">{formatIDR(invoice.dpp)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">PPN {invoice.ppnRate}%</span><span className="money">{formatIDR(invoice.ppnAmount)}</span></div>
          <div className="double-rule flex justify-between pt-2 text-base font-medium"><span>Total</span><span className="money">{formatIDR(invoice.grandTotal)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Sisa utang</span><span className="money font-medium">{formatIDR(invoice.outstanding)}</span></div>
          {invoice.withholdingAmount > 0 ? (
            <div className="flex justify-between text-xs"><span className="text-ink-soft">PPh belum dipotong</span><span className="money">{formatIDR(invoice.withholdingAmount)}</span></div>
          ) : null}
        </div>
      </div>

      {invoice.payments.filter((payment) => !payment.voided).length > 0 ? (
        <div className="mt-5">
          <p className="eyebrow">Riwayat pembayaran</p>
          <table className="ledger-table mt-2" style={{ minWidth: 480 }}>
            <caption className="sr-only">Pembayaran faktur {invoice.number}</caption>
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Rekening</th>
                <th scope="col" className="num">Pelunasan</th>
                <th scope="col" className="num">Kas keluar</th>
              </tr>
            </thead>
            <tbody>
              {invoice.payments
                .filter((payment) => !payment.voided)
                .map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-mono text-xs">{formatDateID(payment.date)}</td>
                    <td>{payment.bankAccountName}</td>
                    <td className="num">{formatIDR(payment.amount)}</td>
                    <td className="num">{formatIDR(payment.bankAmount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {invoice.returns.length > 0 ? (
        <div className="mt-4">
          <p className="eyebrow">Nota debit</p>
          <ul className="mt-1 text-xs text-ink-soft">
            {invoice.returns.map((note) => (
              <li key={note.id}>
                {note.number} · {formatDateID(note.date)} · {formatIDR(note.total)} — {note.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SignatureBlock left="Dibuat oleh" middle="Diperiksa" right="Disetujui" />
      {invoice.status === "VOID" ? <div className="mt-2 text-center"><Stamp tone="vermilion">Dibatalkan</Stamp></div> : null}
    </div>
  );
}
