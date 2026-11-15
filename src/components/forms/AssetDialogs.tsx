"use client";

import { useActionState, useState } from "react";
import { disposeAssetAction, runDepreciationAction } from "@/actions/assets";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { BankAccountSummary } from "@/lib/dto";
import { todayISO } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";

export function DepreciationDialog({ defaultPeriod }: { defaultPeriod?: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(runDepreciationAction, IDLE_STATE as ActionState);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Jalankan penyusutan</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Jalankan penyusutan"
        description="Satu periode hanya dapat dijalankan sekali. Jurnal dibuat pada hari terakhir periode."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="depreciation-form" disabled={pending}>
              {pending ? "Memproses…" : "Jalankan"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="depreciation-form" action={formAction}>
          <Field label="Periode" htmlFor="depreciation-period" required hint="Format YYYY-MM, misalnya 2026-11.">
            <Input
              id="depreciation-period"
              name="period"
              type="month"
              required
              defaultValue={defaultPeriod ?? todayISO().slice(0, 7)}
            />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export function DisposalDialog({
  assetId,
  accounts,
}: {
  assetId: string;
  accounts: BankAccountSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(disposeAssetAction, IDLE_STATE as ActionState);
  const available = accounts.filter((account) => account.isActive);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Lepas aset</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Pelepasan aset"
        description="Nilai buku, hasil pelepasan, dan laba/rugi dihitung dari akumulasi penyusutan saat ini."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="disposal-form" variant="danger" disabled={pending}>
              {pending ? "Memproses…" : "Lepas aset"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="disposal-form" action={formAction} className="space-y-4">
          <input type="hidden" name="assetId" value={assetId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal pelepasan" htmlFor="disposal-date" required>
              <DateInput id="disposal-date" name="date" required defaultValue={todayISO()} />
            </Field>
            <Field label="Hasil pelepasan" htmlFor="disposal-proceeds" required hint="Isi 0 bila aset dihapuskan.">
              <MoneyInput name="proceeds" defaultValue={0} required />
            </Field>
            <Field label="Rekening penerima" htmlFor="disposal-bank" hint="Wajib bila hasil pelepasan lebih dari 0.">
              <Select id="disposal-bank" name="bankAccountId" defaultValue={available[0]?.id ?? ""}>
                <option value="">Tidak ada penerimaan kas</option>
                {available.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Catatan" htmlFor="disposal-note">
              <Textarea id="disposal-note" name="note" rows={2} maxLength={240} />
            </Field>
          </div>
          <p className="text-xs text-ink-faint">
            Jurnal: Dr akumulasi penyusutan + kas / Cr aset, dengan selisih ke laba/rugi pelepasan.
          </p>
        </form>
      </Dialog>
    </>
  );
}
