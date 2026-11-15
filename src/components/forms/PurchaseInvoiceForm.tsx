"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { savePurchaseInvoiceAction } from "@/actions/purchases";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { AccountOption, VendorView } from "@/lib/dto";
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
  accountId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
}

const WITHHOLDING_OPTIONS = [
  { value: "NONE", label: "Tanpa potongan", rate: "0" },
  { value: "PPH21", label: "PPh 21", rate: "2" },
  { value: "PPH22", label: "PPh 22", rate: "2" },
  { value: "PPH23", label: "PPh 23", rate: "2" },
  { value: "PPH4_2", label: "PPh 4(2)", rate: "10" },
];

function amounts(row: RowState) {
  const gross = Math.round(Number(row.quantity || "0") * Number(row.unitPrice || "0"));
  const discount = Math.round((gross * Number(row.discountPercent || "0")) / 100);
  return { gross, discount, amount: gross - discount };
}

export function PurchaseInvoiceForm({
  vendors,
  itemAccounts,
  today,
  defaultDueDate,
  ppnRate,
  defaultWithholdingType = "NONE",
}: {
  vendors: VendorView[];
  itemAccounts: AccountOption[];
  today: string;
  defaultDueDate: string;
  ppnRate: string;
  defaultWithholdingType?: string;
}) {
  const formId = useId();
  const [rows, setRows] = useState<RowState[]>(() => [
    { key: `${formId}-0`, accountId: "", description: "", quantity: "1", unitPrice: "", discountPercent: "0" },
  ]);
  function emptyRow(): RowState {
    return { key: crypto.randomUUID(), accountId: "", description: "", quantity: "1", unitPrice: "", discountPercent: "0" };
  }
  const [ppn, setPpn] = useState(ppnRate);
  const [withholdingType, setWithholdingType] = useState(defaultWithholdingType);
  const [withholdingRate, setWithholdingRate] = useState(
    WITHHOLDING_OPTIONS.find((option) => option.value === defaultWithholdingType)?.rate ?? "0",
  );
  const [state, formAction, pending] = useActionState(savePurchaseInvoiceAction, IDLE_STATE as ActionState);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    for (const row of rows) {
      const value = amounts(row);
      subtotal += value.gross;
      discountTotal += value.discount;
    }
    const dpp = subtotal - discountTotal;
    const ppnAmount = Math.round((dpp * Number(ppn || "0")) / 100);
    const withholdingAmount =
      withholdingType === "NONE" ? 0 : Math.round((dpp * Number(withholdingRate || "0")) / 100);
    return { subtotal, discountTotal, dpp, ppnAmount, grandTotal: dpp + ppnAmount, withholdingAmount };
  }, [rows, ppn, withholdingType, withholdingRate]);

  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  const itemsJson = JSON.stringify(
    rows.map((row) => ({
      accountId: row.accountId,
      description: row.description,
      quantity: row.quantity || "0",
      unitPrice: row.unitPrice || "0",
      discountPercent: row.discountPercent || "0",
    })),
  );
  const validRows = rows.every(
    (row) => row.accountId && row.description.trim().length > 0 && Number(row.quantity) > 0,
  );

  return (
    <form action={formAction} className="space-y-6">
      <FormFeedback state={state} />
      <input type="hidden" name="itemsJson" value={itemsJson} />

      <section className="paper-sheet p-4 sm:p-5">
        <SectionRule label="Informasi faktur" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Vendor" htmlFor="purchase-vendor" required className="lg:col-span-2">
            <Select id="purchase-vendor" name="vendorId" required defaultValue="">
              <option value="" disabled>Pilih vendor…</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal faktur" htmlFor="purchase-date" required>
            <DateInput id="purchase-date" name="date" required defaultValue={today} />
          </Field>
          <Field label="Jatuh tempo" htmlFor="purchase-dueDate" required>
            <DateInput id="purchase-dueDate" name="dueDate" required defaultValue={defaultDueDate} />
          </Field>
          <Field label="Tarif PPN (%)" htmlFor="purchase-ppn">
            <Input id="purchase-ppn" name="ppnRate" inputMode="decimal" value={ppn} onChange={(event) => setPpn(event.target.value)} required />
          </Field>
          <Field label="Jenis potongan" htmlFor="purchase-withholdingType">
            <Select
              id="purchase-withholdingType"
              name="withholdingType"
              value={withholdingType}
              onChange={(event) => {
                setWithholdingType(event.target.value);
                setWithholdingRate(WITHHOLDING_OPTIONS.find((option) => option.value === event.target.value)?.rate ?? "0");
              }}
            >
              {WITHHOLDING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tarif potongan (%)" htmlFor="purchase-withholdingRate" hint="PPh 23/4(2) dipotong saat pembayaran.">
            <Input
              id="purchase-withholdingRate"
              name="withholdingRate"
              inputMode="decimal"
              value={withholdingRate}
              onChange={(event) => setWithholdingRate(event.target.value)}
              disabled={withholdingType === "NONE"}
              required
            />
          </Field>
        </div>
      </section>

      <section className="paper-sheet overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <div>
            <h2 className="font-display text-[22px] font-semibold leading-tight text-ink">Baris pembelian</h2>
            <p className="text-xs text-ink-faint">Setiap baris didebit ke akun persediaan, HPP, atau beban.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setRows((current) => [...current, emptyRow()])}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Baris
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="ledger-table" style={{ minWidth: 1000 }}>
            <caption className="sr-only">Baris item faktur pembelian</caption>
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: 210 }}>Akun</th>
                <th scope="col" style={{ minWidth: 200 }}>Deskripsi</th>
                <th scope="col" style={{ width: 90 }}>Qty</th>
                <th scope="col" style={{ width: 160 }}>Harga</th>
                <th scope="col" style={{ width: 100 }}>Diskon %</th>
                <th scope="col" className="num" style={{ width: 140 }}>Jumlah</th>
                <th scope="col" style={{ width: 44 }}><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key}>
                  <td>
                    <label htmlFor={`acc-${row.key}`} className="sr-only">Akun baris {index + 1}</label>
                    <Select
                      id={`acc-${row.key}`}
                      value={row.accountId}
                      onChange={(event) => updateRow(row.key, { accountId: event.target.value })}
                      className="h-9 text-[12px]"
                    >
                      <option value="">Pilih akun…</option>
                      {itemAccounts.map((account) => (
                        <option key={account.value} value={account.value}>{account.code} · {account.name}</option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <label htmlFor={`pdesc-${row.key}`} className="sr-only">Deskripsi baris {index + 1}</label>
                    <Input
                      id={`pdesc-${row.key}`}
                      value={row.description}
                      maxLength={200}
                      onChange={(event) => updateRow(row.key, { description: event.target.value })}
                      className="h-9 text-[12px]"
                    />
                  </td>
                  <td>
                    <label htmlFor={`pqty-${row.key}`} className="sr-only">Kuantitas baris {index + 1}</label>
                    <Input
                      id={`pqty-${row.key}`}
                      inputMode="decimal"
                      value={row.quantity}
                      onChange={(event) => updateRow(row.key, { quantity: event.target.value.replace(/[^\d.]/g, "") })}
                      className="h-9 text-right font-mono text-[12px]"
                    />
                  </td>
                  <td>
                    <MoneyInput
                      name={`pprice-${row.key}`}
                      value={row.unitPrice}
                      onValueChange={(digits) => updateRow(row.key, { unitPrice: digits })}
                      className="h-9"
                    />
                  </td>
                  <td>
                    <label htmlFor={`pdisc-${row.key}`} className="sr-only">Diskon baris {index + 1}</label>
                    <Input
                      id={`pdisc-${row.key}`}
                      inputMode="decimal"
                      value={row.discountPercent}
                      onChange={(event) => updateRow(row.key, { discountPercent: event.target.value.replace(/[^\d.]/g, "") })}
                      className="h-9 text-right font-mono text-[12px]"
                    />
                  </td>
                  <td className="num">{formatIDR(amounts(row).amount)}</td>
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
            <Field label="Catatan faktur" htmlFor="purchase-notes">
              <Textarea id="purchase-notes" name="notes" rows={3} maxLength={240} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Posting membuat jurnal Dr akun baris + PPN Masukan / Cr Utang Usaha.
            {withholdingType !== "NONE" ? " PPh baru diakui saat pembayaran." : ""}
          </p>
        </section>
        <section className="paper-sheet p-4 sm:p-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><span className="money">{formatIDR(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">Diskon</span><span className="money text-vermilion">−{formatIDR(totals.discountTotal, { withSymbol: false })}</span></div>
            <div className="flex justify-between border-t border-rule pt-2"><span className="text-ink-soft">DPP</span><span className="money">{formatIDR(totals.dpp)}</span></div>
            <div className="flex justify-between"><span className="text-ink-soft">PPN {ppn || "0"}%</span><span className="money">{formatIDR(totals.ppnAmount)}</span></div>
            <div className="double-rule flex justify-between pt-2 text-base font-medium"><span>Total utang</span><span className="money">{formatIDR(totals.grandTotal)}</span></div>
            {withholdingType !== "NONE" ? (
              <div className="flex justify-between text-xs"><span className="text-ink-soft">Potongan PPh (saat bayar)</span><span className="money">{formatIDR(totals.withholdingAmount)}</span></div>
            ) : null}
          </div>
          <div className="mt-3">
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
