"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBankAccountAction, createCashTransactionAction, createTransferAction, setBankAccountActiveAction } from "@/actions/cash";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { AccountOption, BankAccountSummary } from "@/lib/dto";
import { todayISO } from "@/lib/dates";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useToast } from "@/components/ui/toast";

export function BankAccountDialog({
  triggerLabel = "Rekening baru",
  variant = "primary",
}: {
  triggerLabel?: string;
  variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createBankAccountAction, IDLE_STATE as ActionState);

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah rekening kas/bank"
        description="Akun COA dibuat otomatis di bawah Kas atau Bank, beserta jurnal saldo awal bila diisi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" form="bank-account-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan rekening"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="bank-account-form" action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama rekening" htmlFor="bank-name" required>
              <Input id="bank-name" name="name" required maxLength={80} placeholder="Bank BCA Operasional" />
            </Field>
            <Field label="Jenis" htmlFor="bank-type" required>
              <Select id="bank-type" name="type" defaultValue="BANK">
                <option value="BANK">Bank</option>
                <option value="CASH">Kas</option>
              </Select>
            </Field>
            <Field label="Nama bank" htmlFor="bank-bankName">
              <Input id="bank-bankName" name="bankName" maxLength={80} placeholder="BCA" />
            </Field>
            <Field label="Nomor rekening" htmlFor="bank-accountNumber">
              <Input id="bank-accountNumber" name="accountNumber" maxLength={40} placeholder="1234567890" />
            </Field>
            <Field label="Saldo awal" htmlFor="bank-openingBalance" required>
              <MoneyInput name="openingBalance" defaultValue={0} />
            </Field>
            <Field label="Tanggal saldo awal" htmlFor="bank-openingDate" required>
              <Input id="bank-openingDate" name="openingDate" type="date" required defaultValue={todayISO()} />
            </Field>
            <Field label="Warna kartu" htmlFor="bank-theme" className="sm:col-span-2">
              <Select id="bank-theme" name="cardTheme" defaultValue="FOREST">
                <option value="FOREST">Hijau botol</option>
                <option value="SKY">Biru</option>
                <option value="MUSTARD">Kuning mustard</option>
                <option value="VERMILION">Merah</option>
                <option value="INK">Tinta</option>
              </Select>
            </Field>
          </div>
          <p className="text-xs text-ink-faint">
            Saldo awal dicatat sebagai jurnal Dr rekening / Cr Saldo Awal (3200). Tanggal tidak boleh berada di periode
            tertutup.
          </p>
        </form>
      </Dialog>
    </>
  );
}

export function CashTransactionDialog({
  accounts,
  counterAccounts,
  defaultAccountId,
  triggerLabel = "Kas masuk/keluar",
  variant = "secondary",
}: {
  accounts: BankAccountSummary[];
  counterAccounts: AccountOption[];
  defaultAccountId?: string;
  triggerLabel?: string;
  variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCashTransactionAction, IDLE_STATE as ActionState);
  const available = accounts.filter((account) => account.isActive);

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} disabled={available.length === 0}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Transaksi kas masuk/keluar"
        description="Pilih rekening dan akun lawan. Jurnal dibuat otomatis dan saldo rekening tidak boleh negatif."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" form="cash-transaction-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan transaksi"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="cash-transaction-form" action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rekening" htmlFor="cash-bankAccountId" required>
              <Select id="cash-bankAccountId" name="bankAccountId" defaultValue={defaultAccountId ?? available[0]?.id ?? ""} required>
                {available.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.type === "CASH" ? "Kas" : "Bank"} · {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Arah" htmlFor="cash-direction" required>
              <Select id="cash-direction" name="direction" defaultValue="OUT">
                <option value="OUT">Kas keluar</option>
                <option value="IN">Kas masuk</option>
              </Select>
            </Field>
            <Field label="Tanggal" htmlFor="cash-date" required>
              <Input id="cash-date" name="date" type="date" required defaultValue={todayISO()} />
            </Field>
            <Field label="Nominal" htmlFor="cash-amount" required>
              <MoneyInput name="amount" required />
            </Field>
            <Field label="Kategori" htmlFor="cash-category" required>
              <Input id="cash-category" name="category" required maxLength={80} placeholder="Operasional" />
            </Field>
            <Field label="Akun lawan" htmlFor="cash-counterAccountId" required>
              <Select id="cash-counterAccountId" name="counterAccountId" required defaultValue="">
                <option value="" disabled>
                  Pilih akun…
                </option>
                {counterAccounts.map((account) => (
                  <option key={account.value} value={account.value}>
                    {account.code} · {account.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Keterangan" htmlFor="cash-description" required>
            <Textarea id="cash-description" name="description" required maxLength={240} minLength={3} rows={2} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export function TransferDialog({
  accounts,
  defaultFromId,
  triggerLabel = "Transfer",
  variant = "secondary",
}: {
  accounts: BankAccountSummary[];
  defaultFromId?: string;
  triggerLabel?: string;
  variant?: ButtonProps["variant"];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTransferAction, IDLE_STATE as ActionState);
  const available = accounts.filter((account) => account.isActive);
  const defaultTo = available.find((account) => account.id !== defaultFromId)?.id ?? "";

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} disabled={available.length < 2}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Transfer antar rekening"
        description="Transfer tidak memengaruhi laba; hanya memindahkan saldo antar akun kas/bank."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" form="transfer-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan transfer"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="transfer-form" action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dari rekening" htmlFor="transfer-from" required>
              <Select id="transfer-from" name="fromAccountId" required defaultValue={defaultFromId ?? available[0]?.id ?? ""}>
                {available.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ke rekening" htmlFor="transfer-to" required>
              <Select id="transfer-to" name="toAccountId" required defaultValue={defaultTo}>
                {available.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tanggal" htmlFor="transfer-date" required>
              <Input id="transfer-date" name="date" type="date" required defaultValue={todayISO()} />
            </Field>
            <Field label="Nominal" htmlFor="transfer-amount" required>
              <MoneyInput name="amount" required />
            </Field>
          </div>
          <Field label="Keterangan" htmlFor="transfer-description" required>
            <Input id="transfer-description" name="description" required minLength={3} maxLength={240} placeholder="Pindah dana operasional" />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export function BankAccountActiveButton({ accountId, isActive }: { accountId: string; isActive: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(nextActive: boolean) {
    startTransition(async () => {
      const result = await setBankAccountActiveAction(accountId, nextActive);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  if (isActive) {
    return (
      <ConfirmButton
        title="Nonaktifkan rekening?"
        description="Rekening hanya dapat dinonaktifkan saat saldo nol dan semua baris rekonsiliasi sudah dicocokkan atau diabaikan."
        confirmLabel="Nonaktifkan"
        onConfirm={() => apply(false)}
        disabled={pending}
      >
        Nonaktifkan
      </ConfirmButton>
    );
  }
  return (
    <Button variant="secondary" disabled={pending} onClick={() => apply(true)}>
      {pending ? "Memproses…" : "Aktifkan"}
    </Button>
  );
}
