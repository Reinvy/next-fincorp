"use client";

import { useActionState, useState } from "react";
import { createCreditNoteAction, recordSalesPaymentAction, updateTaxInvoiceAction } from "@/actions/sales";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { BankAccountSummary } from "@/lib/dto";
import { formatIDR } from "@/lib/money";
import { TAX_INVOICE_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { Stamp } from "@/components/ui/paper";

export function SalesPaymentDialog({
  invoiceId,
  outstanding,
  accounts,
  today,
  triggerLabel = "Catat pembayaran",
}: {
  invoiceId: string;
  outstanding: number;
  accounts: BankAccountSummary[];
  today: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordSalesPaymentAction, IDLE_STATE as ActionState);
  const available = accounts.filter((account) => account.isActive);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={available.length === 0 || outstanding <= 0}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Catat pembayaran"
        description={`Sisa tagihan ${formatIDR(outstanding)}. Pembayaran tidak boleh melebihi sisa.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="sales-payment-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan pembayaran"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="sales-payment-form" action={formAction} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal" htmlFor="sales-payment-date" required>
              <DateInput id="sales-payment-date" name="date" required defaultValue={today} />
            </Field>
            <Field label="Jumlah" htmlFor="sales-payment-amount" required>
              <MoneyInput name="amount" defaultValue={Math.floor(outstanding)} required />
            </Field>
            <Field label="Rekening penerima" htmlFor="sales-payment-bank" required>
              <Select id="sales-payment-bank" name="bankAccountId" required defaultValue={available[0]?.id ?? ""}>
                {available.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · saldo {formatIDR(account.balance)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Referensi" htmlFor="sales-payment-reference">
              <Input id="sales-payment-reference" name="reference" maxLength={80} placeholder="No. transfer" />
            </Field>
          </div>
          <Field label="Catatan" htmlFor="sales-payment-note">
            <Textarea id="sales-payment-note" name="note" rows={2} maxLength={240} />
          </Field>
          {available.length === 0 ? (
            <p className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-xs text-vermilion">
              Belum ada rekening aktif. Tambahkan rekening di menu Kas &amp; Bank.
            </p>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}

export interface CreditNoteSourceItem {
  id: string;
  description: string;
  quantity: number;
  creditedQuantity: number;
  unitPrice: number;
  discountPercent: number;
}

export function SalesCreditNoteDialog({
  invoiceId,
  items,
  today,
  outstanding,
}: {
  invoiceId: string;
  items: CreditNoteSourceItem[];
  today: string;
  outstanding: number;
}) {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(createCreditNoteAction, IDLE_STATE as ActionState);

  const selected = items
    .map((item) => ({ item, quantity: Number(quantities[item.id] || "0") }))
    .filter((entry) => entry.quantity > 0);
  const dpp = selected.reduce((acc, entry) => {
    const gross = Math.round(entry.quantity * entry.item.unitPrice);
    return acc + gross - Math.round((gross * entry.item.discountPercent) / 100);
  }, 0);

  const itemsJson = JSON.stringify(
    selected.map((entry) => ({ invoiceItemId: entry.item.id, quantity: quantities[entry.item.id] })),
  );

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={outstanding <= 0}>
        Nota kredit
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nota kredit / retur penjualan"
        description="Retur mengurangi piutang dan pendapatan. Nilai retur tidak boleh melebihi sisa tagihan."
        maxWidth={760}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="sales-credit-note-form" disabled={pending || selected.length === 0}>
              {pending ? "Menyimpan…" : "Buat nota kredit"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="sales-credit-note-form" action={formAction} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="itemsJson" value={itemsJson} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal retur" htmlFor="credit-note-date" required>
              <DateInput id="credit-note-date" name="date" required defaultValue={today} />
            </Field>
            <Field label="Alasan" htmlFor="credit-note-reason" required>
              <Input id="credit-note-reason" name="reason" required minLength={3} maxLength={240} placeholder="Pengurangan lingkup" />
            </Field>
          </div>
          <div className="overflow-x-auto">
            <table className="ledger-table" style={{ minWidth: 560 }}>
              <caption className="sr-only">Pilih kuantitas yang diretur</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="num">Harga</th>
                  <th scope="col" className="num">Sisa qty</th>
                  <th scope="col" style={{ width: 120 }}>Retur qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const remaining = Math.max(0, item.quantity - item.creditedQuantity);
                  return (
                    <tr key={item.id}>
                      <td>
                        <p className="text-[13px] text-ink">{item.description}</p>
                        <p className="font-mono text-[10px] text-ink-faint">Diskon {item.discountPercent}%</p>
                      </td>
                      <td className="num">{formatIDR(item.unitPrice)}</td>
                      <td className="num">{remaining}</td>
                      <td>
                        <Input
                          aria-label={`Kuantitas retur ${item.description}`}
                          inputMode="decimal"
                          value={quantities[item.id] ?? ""}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [item.id]: event.target.value.replace(/[^\d.]/g, ""),
                            }))
                          }
                          className="h-9 text-right font-mono text-[12px]"
                          disabled={remaining <= 0}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-rule pt-3">
            <span className="text-xs text-ink-faint">DPP retur (sebelum PPN)</span>
            <span className="money">{formatIDR(dpp)}</span>
          </div>
          {selected.length > 0 ? <Stamp tone="sky">Retur {selected.length} baris</Stamp> : null}
        </form>
      </Dialog>
    </>
  );
}

export function TaxInvoiceDialog({
  invoiceId,
  currentStatus,
  number,
  date,
}: {
  invoiceId: string;
  currentStatus: string;
  number: string | null;
  date: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateTaxInvoiceAction, IDLE_STATE as ActionState);
  const transitions: Record<string, string[]> = {
    NONE: ["DRAFT", "SUBMITTED"],
    DRAFT: ["SUBMITTED", "CANCELLED"],
    SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
    APPROVED: ["CANCELLED"],
    REJECTED: ["DRAFT", "SUBMITTED", "CANCELLED"],
    CANCELLED: [],
  };
  const options = [currentStatus, ...(transitions[currentStatus] ?? [])];

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Status faktur pajak</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Faktur pajak"
        description="Status lokal untuk pemantauan e-Faktur. Tidak ada koneksi langsung ke DJP."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="tax-invoice-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan status"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="tax-invoice-form" action={formAction} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="tax-status" required>
              <Select id="tax-status" name="status" defaultValue={currentStatus}>
                {options.map((status) => (
                  <option key={status} value={status}>
                    {TAX_INVOICE_STATUS_LABELS[status] ?? status}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nomor faktur pajak" htmlFor="tax-number">
              <Input id="tax-number" name="number" maxLength={40} defaultValue={number ?? ""} />
            </Field>
            <Field label="Tanggal faktur pajak" htmlFor="tax-date">
              <DateInput id="tax-date" name="date" defaultValue={date ?? ""} />
            </Field>
          </div>
          <p className="text-xs text-ink-faint">
            Transisi status mengikuti alur: draf → dilaporkan → disetujui/ditolak → dibatalkan.
          </p>
        </form>
      </Dialog>
    </>
  );
}
