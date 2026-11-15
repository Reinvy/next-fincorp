"use client";

import { useActionState, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAdditionalCompanyAction, switchCompanyAction } from "@/actions/company";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import { MONTH_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function SwitchCompanyButton({ companyId, active }: { companyId: string; active: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (active) return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-forest">Aktif</span>;
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await switchCompanyAction(companyId);
          if (result.status === "error") toast.error(result.message);
          if (result.status === "success") {
            toast.success(result.message);
            router.refresh();
          }
        })
      }
    >
      {pending ? "…" : "Aktifkan"}
    </Button>
  );
}

export function CreateCompanyDialog({ hasMemberships }: { hasMemberships: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createAdditionalCompanyAction, IDLE_STATE as ActionState);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{hasMemberships ? "Perusahaan baru" : "Buat perusahaan"}</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Buat perusahaan baru"
        description="Bagan akun standar dibuat otomatis. Anda menjadi admin, dan data perusahaan lain tetap terpisah."
        maxWidth={620}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="additional-company-form" disabled={pending}>
              {pending ? "Membuat…" : "Buat perusahaan"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="additional-company-form" action={formAction} className="space-y-4">
          <Field label="Nama perusahaan" htmlFor="new-company-name" required>
            <Input id="new-company-name" name="name" required maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NPWP" htmlFor="new-company-npwp"><Input id="new-company-npwp" name="npwp" maxLength={30} /></Field>
            <Field label="Kota" htmlFor="new-company-city"><Input id="new-company-city" name="city" maxLength={80} /></Field>
            <Field label="Tarif PPN (%)" htmlFor="new-company-ppn" required>
              <Input id="new-company-ppn" name="ppnRate" inputMode="decimal" defaultValue="11" required />
            </Field>
            <Field label="Awal tahun buku" htmlFor="new-company-fiscal">
              <Select id="new-company-fiscal" name="fiscalYearStartMonth" defaultValue="1">
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="isPkp" /> Dikukuhkan sebagai PKP
          </label>
        </form>
      </Dialog>
    </>
  );
}
