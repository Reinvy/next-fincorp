"use client";

import { useActionState, useState } from "react";
import { createDebitNoteAction, recordPurchasePaymentAction } from "@/actions/purchases";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { BankAccountSummary } from "@/lib/dto";
import { formatIDR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { Stamp } from "@/components/ui/paper";

export function PurchasePaymentDialog({
  invoiceId,
  outstanding,
  withholdingAmount,
  accounts,
  today,
  bankAmountHint,
}: {
  invoiceId: string;
  outstanding: number;
  withholdingAmount: number;
  accounts: BankAccountSummary[];
  today: string;
  bankAmountHint: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordPurchasePaymentAction, IDLE_STATE as ActionState);
  const available = accounts.filter((account) => account.isActive);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={available.length === 0 || outstanding <= 0}>
        Catat pembayaran
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Bayar faktur pembelian"
        description={`Sisa utang ${formatIDR(outstanding)}. Pajak dipotong otomatis saat pembayaran.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="purchase-payment-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan pembayaran"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="purchase-payment-form" action={formAction} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal" htmlFor="purchase-payment-date" required>
              <DateInput id="purchase-payment-date" name="date" required defaultValue={today} />
            </Field>
            <Field label="Nominal pelunasan" htmlFor="purchase-payment-amount" required>
              <MoneyInput name="amount" defaultValue={Math.floor(outstanding)} required />
            </Field>
            <Field label="Rekening pembayar" htmlFor="purchase-payment-bank" required>
              <Select id="purchase-payment-bank" name="bankAccountId" required defaultValue={available[0]?.id ?? ""}>
                {available.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · saldo {formatIDR(account.balance)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Referensi" htmlFor="purchase-payment-reference">
              <Input id="purchase-payment-reference" name="reference" maxLength={80} />
            </Field>
          </div>
          <div className="rounded-[2px] border border-rule bg-paper-light px-3 py-2 text-xs text-ink-soft">
            Potongan pajak outstanding: <span className="money">{formatIDR(withholdingAmount)}</span>. Estimasi kas keluar
            saat pelunasan penuh: <span className="money">{formatIDR(Math.max(0, bankAmountHint))}</span>.
          </div>
          <Field label="Catatan" htmlFor="purchase-payment-note">
            <Textarea id="purchase-payment-note" name="note" rows={2} maxLength={240} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export interface DebitNoteSourceItem {
  id: string;
  description: string;
  accountName: string;
  quantity: number;
  creditedQuantity: number;
  unitPrice: number;
  discountPercent: number;
}

export function PurchaseDebitNoteDialog({
  invoiceId,
  items,
  today,
  outstanding,
}: {
  invoiceId: string;
  items: DebitNoteSourceItem[];
  today: string;
  outstanding: number;
}) {
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(createDebitNoteAction, IDLE_STATE as ActionState);
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
        Nota debit
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nota debit / retur pembelian"
        description="Retur hanya sebelum pembayaran. Nilai retur mengurangi utang dan potongan pajak berikutnya."
        maxWidth={780}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="purchase-debit-note-form" disabled={pending || selected.length === 0}>
              {pending ? "Menyimpan…" : "Buat nota debit"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="purchase-debit-note-form" action={formAction} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="itemsJson" value={itemsJson} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal retur" htmlFor="debit-note-date" required>
              <DateInput id="debit-note-date" name="date" required defaultValue={today} />
            </Field>
            <Field label="Alasan" htmlFor="debit-note-reason" required>
              <Input id="debit-note-reason" name="reason" required minLength={3} maxLength={240} />
            </Field>
          </div>
          <div className="overflow-x-auto">
            <table className="ledger-table" style={{ minWidth: 640 }}>
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
                        <p className="font-mono text-[10px] text-ink-faint">{item.accountName}</p>
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
