"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onboardingAction } from "@/actions/company";
import { IDLE_STATE } from "@/lib/types";
import { MONTH_OPTIONS } from "@/lib/constants";
import { Field } from "@/components/ui/field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperCard, SectionRule } from "@/components/ui/paper";

export function OnboardingForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(onboardingAction, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success" && state.redirectTo) {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <p className="eyebrow">Langkah 1 dari 2</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.02em] text-ink">Buat perusahaan</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Bagan akun standar dan keanggotaan admin dibuat otomatis. Rekening bank ditambahkan setelah ini dari menu Kas
          &amp; Bank.
        </p>
      </div>

      <PaperCard className="p-4 sm:p-5">
        <SectionRule label="Profil perusahaan" />
        <div className="mt-4 space-y-4">
          <Field label="Nama perusahaan" htmlFor="name" required error={errors.name}>
            <Input id="name" name="name" required maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NPWP" htmlFor="npwp" error={errors.npwp}>
              <Input id="npwp" name="npwp" maxLength={30} />
            </Field>
            <Field label="NIB" htmlFor="nib" error={errors.nib}>
              <Input id="nib" name="nib" maxLength={30} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email}>
              <Input id="email" name="email" type="email" />
            </Field>
            <Field label="Telepon" htmlFor="phone" error={errors.phone}>
              <Input id="phone" name="phone" maxLength={30} />
            </Field>
          </div>
          <Field label="Alamat" htmlFor="address" error={errors.address}>
            <Textarea id="address" name="address" rows={2} maxLength={240} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kota" htmlFor="city" error={errors.city}>
              <Input id="city" name="city" maxLength={80} />
            </Field>
            <Field label="Provinsi" htmlFor="province" error={errors.province}>
              <Input id="province" name="province" maxLength={80} />
            </Field>
            <Field label="Kode pos" htmlFor="postalCode" error={errors.postalCode}>
              <Input id="postalCode" name="postalCode" maxLength={10} />
            </Field>
          </div>
        </div>
      </PaperCard>

      <PaperCard className="p-4 sm:p-5">
        <SectionRule label="Pajak & periode" />
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <Checkbox id="isPkp" name="isPkp" />
            Perusahaan dikukuhkan sebagai PKP
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nomor PKP" htmlFor="pkpNumber" error={errors.pkpNumber}>
              <Input id="pkpNumber" name="pkpNumber" maxLength={40} />
            </Field>
            <Field label="KPP" htmlFor="kpp" error={errors.kpp}>
              <Input id="kpp" name="kpp" maxLength={80} />
            </Field>
            <Field label="Tarif PPN (%)" htmlFor="ppnRate" required error={errors.ppnRate}>
              <Input id="ppnRate" name="ppnRate" inputMode="decimal" defaultValue="11" required />
            </Field>
          </div>
          <Field label="Bulan awal tahun buku" htmlFor="fiscalYearStartMonth">
            <Select id="fiscalYearStartMonth" name="fiscalYearStartMonth" defaultValue="1">
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </PaperCard>

      {state.status === "error" ? (
        <p role="alert" className="border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-[13px] text-vermilion">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Membuat…" : "Buat perusahaan"}
        </Button>
        <span className="text-xs text-ink-faint">Semua data keuangan disimpan di server, bukan browser.</span>
      </div>
    </form>
  );
}
