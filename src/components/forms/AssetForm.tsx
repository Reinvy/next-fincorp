"use client";

import { useActionState, useMemo, useState } from "react";
import { createAssetAction } from "@/actions/assets";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { AccountOption, BankAccountSummary } from "@/lib/dto";
import { formatIDR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { SectionRule } from "@/components/ui/paper";

export function AssetForm({
  accounts,
  bankAccounts,
  today,
}: {
  accounts: AccountOption[];
  bankAccounts: BankAccountSummary[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(createAssetAction, IDLE_STATE as ActionState);
  const assetAccounts = accounts.filter((account) => account.systemRole === "FIXED_ASSET");
  const accumulatedAccounts = accounts.filter((account) => account.systemRole === "ACCUMULATED_DEPRECIATION");
  const expenseAccounts = accounts.filter((account) => account.systemRole === "DEPRECIATION_EXPENSE");
  const fundingAccounts = bankAccounts.filter((account) => account.isActive);
  const [cost, setCost] = useState("");
  const [residual, setResidual] = useState("");
  const [life, setLife] = useState("48");
  const [method, setMethod] = useState("STRAIGHT_LINE");
  const [rate, setRate] = useState("");

  const estimate = useMemo(() => {
    const base = Number(cost || "0") - Number(residual || "0");
    const months = Number(life || "0");
    if (base <= 0 || months <= 0) return 0;
    if (method === "STRAIGHT_LINE") return Math.round(base / months);
    const annual = Number(rate || "0") || 200 / (months / 12);
    return Math.round((base * annual) / 100 / 12);
  }, [cost, residual, life, method, rate]);

  return (
    <form action={formAction} className="space-y-6">
      <FormFeedback state={state} />

      <section className="paper-sheet p-4 sm:p-5">
        <SectionRule label="Identitas aset" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Kode aset" htmlFor="asset-code" hint="Kosongkan untuk nomor otomatis AST/YYYY/####.">
            <Input id="asset-code" name="code" maxLength={30} />
          </Field>
          <Field label="Nama aset" htmlFor="asset-name" required className="lg:col-span-2">
            <Input id="asset-name" name="name" required maxLength={120} />
          </Field>
          <Field label="Kategori" htmlFor="asset-category" required>
            <Input id="asset-category" name="category" required maxLength={80} placeholder="Peralatan" />
          </Field>
          <Field label="Tanggal perolehan" htmlFor="asset-purchaseDate" required>
            <DateInput id="asset-purchaseDate" name="purchaseDate" required defaultValue={today} />
          </Field>
          <Field label="Lokasi" htmlFor="asset-location">
            <Input id="asset-location" name="location" maxLength={120} />
          </Field>
          <Field label="Penanggung jawab" htmlFor="asset-responsible">
            <Input id="asset-responsible" name="responsible" maxLength={120} />
          </Field>
        </div>
      </section>

      <section className="paper-sheet p-4 sm:p-5">
        <SectionRule label="Nilai & penyusutan" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Harga perolehan" htmlFor="asset-price" required>
            <MoneyInput name="purchasePrice" onValueChange={setCost} required />
          </Field>
          <Field label="Nilai residu" htmlFor="asset-residual">
            <MoneyInput name="residualValue" onValueChange={setResidual} defaultValue={0} />
          </Field>
          <Field label="Umur manfaat (bulan)" htmlFor="asset-life" required>
            <Input
              id="asset-life"
              name="usefulLifeMonths"
              inputMode="numeric"
              value={life}
              onChange={(event) => setLife(event.target.value.replace(/\D/g, ""))}
              required
            />
          </Field>
          <Field label="Metode" htmlFor="asset-method" required>
            <Select id="asset-method" name="method" value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="STRAIGHT_LINE">Garis lurus</option>
              <option value="DECLINING_BALANCE">Saldo menurun</option>
            </Select>
          </Field>
          {method === "DECLINING_BALANCE" ? (
            <Field label="Tarif tahunan (%)" htmlFor="asset-rate" hint="Kosongkan untuk 200% ÷ umur (tahun).">
              <Input id="asset-rate" name="annualRate" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} />
            </Field>
          ) : (
            <input type="hidden" name="annualRate" value="" />
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Estimasi penyusutan / bulan</p>
            <p className="mt-1 font-mono text-lg">{formatIDR(estimate)}</p>
          </div>
        </div>
      </section>

      <section className="paper-sheet p-4 sm:p-5">
        <SectionRule label="Akun & pendanaan" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Akun aset" htmlFor="asset-account" required>
            <Select id="asset-account" name="assetAccountId" required defaultValue={assetAccounts[0]?.value ?? ""}>
              {assetAccounts.map((account) => (
                <option key={account.value} value={account.value}>{account.code} · {account.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Akun akumulasi" htmlFor="asset-accumulated" required>
            <Select id="asset-accumulated" name="accumulatedAccountId" required defaultValue={accumulatedAccounts[0]?.value ?? ""}>
              {accumulatedAccounts.map((account) => (
                <option key={account.value} value={account.value}>{account.code} · {account.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Akun beban penyusutan" htmlFor="asset-expense" required>
            <Select id="asset-expense" name="depreciationExpenseAccountId" required defaultValue={expenseAccounts[0]?.value ?? ""}>
              {expenseAccounts.map((account) => (
                <option key={account.value} value={account.value}>{account.code} · {account.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Jenis pendanaan" htmlFor="asset-fundingType" required>
            <Select id="asset-fundingType" name="fundingType" defaultValue="BANK">
              <option value="BANK">Bank</option>
              <option value="CASH">Kas</option>
            </Select>
          </Field>
          <Field label="Rekening pembayar" htmlFor="asset-funding" required className="sm:col-span-2">
            <Select id="asset-funding" name="fundingAccountId" required defaultValue={fundingAccounts.find((account) => account.type === "BANK")?.id ?? fundingAccounts[0]?.id ?? ""}>
              {fundingAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.type === "CASH" ? "Kas" : "Bank"} · {account.name} · {formatIDR(account.balance)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Perolehan didebit ke akun aset dan dikredit ke rekening pembayar. Saldo rekening tidak boleh menjadi negatif.
        </p>
      </section>

      {state.status === "error" ? (
        <p role="alert" className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-[13px] text-vermilion">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan aset & jurnal perolehan"}
      </Button>
    </form>
  );
}
