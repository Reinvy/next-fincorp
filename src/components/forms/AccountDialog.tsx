"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createAccountAction, setAccountActiveAction, updateAccountAction } from "@/actions/accounts";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import { ACCOUNT_TYPE_LABELS, REPORT_GROUP_LABELS } from "@/lib/constants";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export interface AccountDialogData {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  reportGroup: string;
  systemRole: string;
  parentId: string | null;
}

export interface ParentOption {
  id: string;
  code: string;
  name: string;
  level: number;
}

const SYSTEM_ROLES = [
  ["NONE", "Tanpa peran sistem"],
  ["CASH", "Kas"],
  ["BANK", "Bank"],
  ["ACCOUNTS_RECEIVABLE", "Piutang usaha"],
  ["VAT_INPUT", "PPN masukan"],
  ["INVENTORY", "Persediaan"],
  ["FIXED_ASSET", "Aset tetap"],
  ["ACCUMULATED_DEPRECIATION", "Akumulasi penyusutan"],
  ["ACCOUNTS_PAYABLE", "Utang usaha"],
  ["VAT_OUTPUT", "PPN keluaran"],
  ["VAT_PAYABLE", "Utang PPN"],
  ["VAT_RECEIVABLE", "PPN lebih bayar"],
  ["WITHHOLDING_PAYABLE", "Utang PPh potongan"],
  ["TAX_PAYABLE", "Utang PPh 25/29"],
  ["SALES_REVENUE", "Pendapatan penjualan"],
  ["SALES_RETURN", "Retur penjualan"],
  ["PURCHASE_RETURN", "Retur pembelian"],
  ["OTHER_INCOME", "Pendapatan lain"],
  ["OTHER_EXPENSE", "Beban lain"],
  ["COST_OF_GOODS_SOLD", "Beban pokok penjualan"],
  ["DEPRECIATION_EXPENSE", "Beban penyusutan"],
  ["BANK_FEE", "Beban administrasi bank"],
  ["LOSS_ON_DISPOSAL", "Kerugian pelepasan aset"],
  ["GAIN_ON_DISPOSAL", "Keuntungan pelepasan aset"],
  ["RETAINED_EARNINGS", "Laba ditahan"],
  ["OPENING_BALANCE", "Saldo awal"],
  ["EQUITY", "Modal"],
] as const;

export function AccountDialog({
  accounts,
  initial,
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "md",
  triggerClassName,
}: {
  accounts: ParentOption[];
  initial?: AccountDialogData;
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    initial ? updateAccountAction : createAccountAction,
    IDLE_STATE as ActionState,
  );
  const locked = initial && initial.systemRole !== "NONE";
  const parentOptions = accounts.filter((account) => account.id !== initial?.id && account.level < 5);

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={initial ? `Ubah akun ${initial.code}` : "Tambah akun"}
        description={
          initial
            ? "Akun sistem hanya dapat diubah nama dan keterangannya."
            : "Kode, tipe, dan kelompok menentukan posisi akun pada laporan."
        }
        maxWidth={680}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" form="account-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan akun"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="account-form" action={formAction} className="space-y-4">
          {initial ? <input type="hidden" name="accountId" value={initial.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label="Kode" htmlFor="account-code" required>
              <Input
                id="account-code"
                name="code"
                required
                maxLength={20}
                defaultValue={initial?.code}
                disabled={Boolean(locked)}
                className="font-mono"
              />
            </Field>
            <Field label="Nama akun" htmlFor="account-name" required>
              <Input id="account-name" name="name" required maxLength={120} defaultValue={initial?.name} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipe" htmlFor="account-type" required>
              <Select id="account-type" name="type" defaultValue={initial?.type ?? "EXPENSE"} disabled={Boolean(locked)}>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kelompok laporan" htmlFor="account-group" required>
              <Select
                id="account-group"
                name="reportGroup"
                defaultValue={initial?.reportGroup ?? "OPERATING_EXPENSE"}
                disabled={Boolean(locked)}
              >
                {Object.entries(REPORT_GROUP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Peran sistem" htmlFor="account-role" hint="Menentukan pemetaan otomatis transaksi.">
              <Select
                id="account-role"
                name="systemRole"
                defaultValue={initial?.systemRole ?? "NONE"}
                disabled={Boolean(locked)}
              >
                {SYSTEM_ROLES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Akun induk" htmlFor="account-parent">
              <Select
                id="account-parent"
                name="parentId"
                defaultValue={initial?.parentId ?? ""}
                disabled={Boolean(locked)}
              >
                <option value="">— Akar (level 1) —</option>
                {parentOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {"—".repeat(Math.max(0, account.level - 1))} {account.code} · {account.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Keterangan" htmlFor="account-description">
            <Textarea id="account-description" name="description" rows={2} maxLength={240} defaultValue={initial?.description ?? ""} />
          </Field>
          {locked ? (
            <p className="border-l-2 border-mustard bg-mustard-soft px-3 py-2 text-xs text-ink-soft">
              Akun ini terhubung ke modul otomatis. Untuk mengganti kode/tipe, buat akun baru dan petakan ulang
              transaksi berikutnya.
            </p>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}

export function AccountToggleButton({
  accountId,
  isActive,
  systemRole,
}: {
  accountId: string;
  isActive: boolean;
  systemRole: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (systemRole !== "NONE") return null;

  async function toggle() {
    setPending(true);
    try {
      const result = await setAccountActiveAction(accountId, !isActive);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={toggle}>
      {pending ? "…" : isActive ? "Nonaktifkan" : "Aktifkan"}
    </Button>
  );
}
