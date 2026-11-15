"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveSalesInvoiceAction } from "@/actions/sales";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { AccountOption, CustomerView } from "@/lib/dto";
import { formatIDR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { SectionRule, Stamp } from "@/components/ui/paper";

interface RowState {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
}

let rowCounter = 0;
function emptyRow(): RowState {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, description: "", quantity: "1", unitPrice: "", discountPercent: "0" };
}

function lineAmounts(row: RowState) {
  const qty = Number(row.quantity || "0");
  const price = Number(row.unitPrice || "0");
  const discountPercent = Number(row.discountPercent || "0");
  const gross = Math.round(qty * price);
  const discount = Math.round((gross * discountPercent) / 100);
  return { gross, discount, amount: gross - discount };
}

export function SalesInvoiceForm({
  customers,
  revenueAccounts,
  today,
  defaultDueDate,
  ppnRate,
  isPkp,
}: {
  customers: CustomerView[];
  revenueAccounts: AccountOption[];
  today: string;
  defaultDueDate: string;
  ppnRate: string;
  isPkp: boolean;
}) {
  const [rows, setRows] = useState<RowState[]>([emptyRow()]);
  const [rowPpnRate, setRowPpnRate] = useState(isPkp ? ppnRate : "0");
  const [state, formAction, pending] = useActionState(saveSalesInvoiceAction, IDLE_STATE as ActionState);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    for (const row of rows) {
      const amounts = lineAmounts(row);
      subtotal += amounts.gross;
      discountTotal += amounts.discount;
    }
    const dpp = subtotal - discountTotal;
    const ppnAmount = Math.round((dpp * Number(rowPpnRate || "0")) / 100);
    return { subtotal, discountTotal, dpp, ppnAmount, grandTotal: dpp + ppnAmount };
  }, [rows, rowPpnRate]);

  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  const itemsJson = JSON.stringify(
    rows.map((row) => ({
      description: row.description,
      quantity: row.quantity || "0",
      unitPrice: row.unitPrice || "0",
      discountPercent: row.discountPercent || "0",
    })),
  );
  const validRows = rows.every((row) => row.description.trim().length > 0 && Number(row.quantity) > 0);

  return (
    <form action={formAction} className="space-y-6">
      <FormFeedback state={state} />
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <section className="paper-sheet p-4 sm:p-5">
        <SectionRule label="Informasi faktur" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Pelanggan" htmlFor="invoice-customer" required className="lg:col-span-2">
            <Select id="invoice-customer" name="customerId" required defaultValue="">
              <option value="" disabled>
                Pilih pelanggan…
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal faktur" htmlFor="invoice-date" required>
            <DateInput id="invoice-date" name="date" required defaultValue={today} />
          </Field>
          <Field label="Jatuh tempo" htmlFor="invoice-dueDate" required>
            <DateInput id="invoice-dueDate" name="dueDate" required defaultValue={defaultDueDate} />
          </Field>
          <Field label="Akun pendapatan" htmlFor="invoice-revenue" required className="lg:col-span-2">
            <Select id="invoice-revenue" name="revenueAccountId" required defaultValue="">
              <option value="" disabled>
                Pilih akun pendapatan…
              </option>
              {revenueAccounts.map((account) => (
                <option key={account.value} value={account.value}>
                  {account.code} · {account.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tarif PPN (%)" htmlFor="invoice-ppnRate" hint={isPkp ? undefined : "Perusahaan non-PKP: PPN 0%."}>
            <Input
              id="invoice-ppnRate"
              name="ppnRate"
              inputMode="decimal"
              value={rowPpnRate}
              onChange={(event) => setRowPpnRate(event.target.value)}
              disabled={!isPkp}
              required
            />
          </Field>
          <Field label="Termin" htmlFor="invoice-terms">
            <Input id="invoice-terms" name="paymentTerms" maxLength={80} placeholder="NET 14" />
          </Field>
        </div>
        {isPkp ? (
          <div className="mt-4 grid gap-4 border-t border-dashed border-rule pt-4 sm:grid-cols-2">
            <Field label="Nomor faktur pajak" htmlFor="invoice-taxNumber" hint="Kosongkan bila belum diterbitkan.">
              <Input id="invoice-taxNumber" name="taxInvoiceNumber" maxLength={40} placeholder="010.000-26.00000001" />
            </Field>
            <Field label="Tanggal faktur pajak" htmlFor="invoice-taxDate">
              <Input id="invoice-taxDate" name="taxInvoiceDate" type="date" />
            </Field>
          </div>
        ) : (
          <input type="hidden" name="ppnRate" value="0" />
        )}
      </section>

      <section className="paper-sheet overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <div>
            <h2 className="font-display text-[22px] font-semibold leading-tight text-ink">Baris faktur</h2>
            <p className="text-xs text-ink-faint">Diskon dihitung per baris sebelum PPN.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setRows((current) => [...current, emptyRow()])}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Baris
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 860 }}>
            <caption className="sr-only">Baris item faktur penjualan</caption>
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: 240 }}>Deskripsi</th>
                <th scope="col" style={{ width: 110 }}>Qty</th>
                <th scope="col" style={{ width: 170 }}>Harga satuan</th>
                <th scope="col" style={{ width: 110 }}>Diskon %</th>
                <th scope="col" className="num" style={{ width: 150 }}>Jumlah</th>
                <th scope="col" style={{ width: 44 }}><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key}>
                  <td>
                    <label htmlFor={`desc-${row.key}`} className="sr-only">Deskripsi baris {index + 1}</label>
                    <Input
                      id={`desc-${row.key}`}
                      value={row.description}
                      maxLength={200}
                      onChange={(event) => updateRow(row.key, { description: event.target.value })}
                      className="h-9 text-[12px]"
                      placeholder="Jasa konsultasi…"
                    />
                  </td>
                  <td>
                    <label htmlFor={`qty-${row.key}`} className="sr-only">Kuantitas baris {index + 1}</label>
                    <Input
                      id={`qty-${row.key}`}
                      inputMode="decimal"
                      value={row.quantity}
                      onChange={(event) => updateRow(row.key, { quantity: event.target.value.replace(/[^\d.]/g, "") })}
                      className="h-9 text-right font-mono text-[12px]"
                    />
                  </td>
                  <td>
                    <MoneyInput
                      name={`price-${row.key}`}
                      value={row.unitPrice}
                      onValueChange={(digits) => updateRow(row.key, { unitPrice: digits })}
                      className="h-9"
                    />
                  </td>
                  <td>
                    <label htmlFor={`disc-${row.key}`} className="sr-only">Diskon baris {index + 1}</label>
                    <Input
                      id={`disc-${row.key}`}
                      inputMode="decimal"
                      value={row.discountPercent}
                      onChange={(event) => updateRow(row.key, { discountPercent: event.target.value.replace(/[^\d.]/g, "") })}
                      className="h-9 text-right font-mono text-[12px]"
                    />
                  </td>
                  <td className="num">{formatIDR(lineAmounts(row).amount)}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus baris ${index + 1}`}
                      disabled={rows.length <= 1}
                      onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="paper-sheet p-4 sm:p-5">
          <SectionRule label="Catatan" />
          <div className="mt-3">
            <Field label="Catatan faktur" htmlFor="invoice-notes">
              <Textarea id="invoice-notes" name="notes" rows={3} maxLength={240} placeholder="Instruksi pembayaran, nomor PO, dsb." />
            </Field>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Faktur yang diposting akan membuat jurnal Dr Piutang Usaha / Cr Pendapatan / Cr PPN Keluaran.
          </p>
        </section>
        <section className="paper-sheet p-4 sm:p-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><span className="money">{formatIDR(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Diskon</span><span className="money text-vermilion">−{formatIDR(totals.discountTotal, { withSymbol: false })}</span></div>
            <div className="flex justify-between border-t border-rule pt-2"><span className="text-ink-soft">DPP</span><span className="money">{formatIDR(totals.dpp)}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">PPN {rowPpnRate || "0"}%</span><span className="money">{formatIDR(totals.ppnAmount)}</span></div>
            <div className="double-rule flex justify-between pt-2 text-base font-medium"><span>Total</span><span className="money">{formatIDR(totals.grandTotal)}</span></div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {validRows && totals.grandTotal > 0 ? <Stamp tone="forest">Siap disimpan</Stamp> : <Stamp tone="mustard">Lengkapi baris</Stamp>}
          </div>
        </section>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-[13px] text-vermilion">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-ink-faint">Total {formatIDR(totals.grandTotal)}</p>
          <div className="flex items-center gap-2">
            <Button type="submit" name="mode" value="draft" variant="secondary" disabled={pending || !validRows}>
              {pending ? "Memproses…" : "Simpan draf"}
            </Button>
            <Button type="submit" name="mode" value="post" disabled={pending || !validRows || totals.grandTotal <= 0}>
              {pending ? "Memproses…" : "Posting faktur"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
