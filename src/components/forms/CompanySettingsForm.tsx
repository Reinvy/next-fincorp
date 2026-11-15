"use client";

import { useActionState, useState } from "react";
import { removeCompanyLogoAction, updateCompanySettingsAction } from "@/actions/settings";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import { MONTH_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { PaperCard, SectionRule } from "@/components/ui/paper";
import { DownloadLink } from "@/components/ui/download-link";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export interface CompanySettingsData {
  name: string;
  npwp: string | null;
  nib: string | null;
  pkpNumber: string | null;
  kpp: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  email: string | null;
  phone: string | null;
  isPkp: boolean;
  ppnRate: string;
  fiscalYearStartMonth: number;
  logoDataUrl: string | null;
}

export function CompanySettingsForm({ company, canEdit }: { company: CompanySettingsData; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(updateCompanySettingsAction, IDLE_STATE as ActionState);
  const toast = useToast();
  const router = useRouter();
  const [logoPending, setLogoPending] = useState(false);

  async function removeLogo() {
    setLogoPending(true);
    try {
      const result = await removeCompanyLogoAction();
      if (result.status === "error") toast.error(result.message);
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    } finally {
      setLogoPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaperCard className="p-4 sm:p-5">
        <SectionRule label="Identitas" />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {company.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUrl} alt="Logo perusahaan" className="h-16 w-16 rounded-[2px] border border-rule object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-[2px] border border-dashed border-rule text-[10px] text-ink-faint">
              Tanpa logo
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">{company.name}</p>
            <p className="text-xs text-ink-faint">Logo tampil pada kop cetak. Maksimal 512 KB (PNG/JPEG/WebP).</p>
            {canEdit && company.logoDataUrl ? (
              <Button variant="ghost" size="sm" className="mt-1" disabled={logoPending} onClick={removeLogo}>
                {logoPending ? "…" : "Hapus logo"}
              </Button>
            ) : null}
          </div>
        </div>
      </PaperCard>

      <FormFeedback state={state} />
      <form action={formAction} className="space-y-4">
        <PaperCard className="p-4 sm:p-5">
          <SectionRule label="Profil perusahaan" />
          <fieldset disabled={!canEdit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nama perusahaan" htmlFor="company-name" required className="sm:col-span-2">
              <Input id="company-name" name="name" required maxLength={120} defaultValue={company.name} />
            </Field>
            <Field label="NPWP" htmlFor="company-npwp"><Input id="company-npwp" name="npwp" maxLength={30} defaultValue={company.npwp ?? ""} /></Field>
            <Field label="NIB" htmlFor="company-nib"><Input id="company-nib" name="nib" maxLength={30} defaultValue={company.nib ?? ""} /></Field>
            <Field label="Email" htmlFor="company-email"><Input id="company-email" name="email" type="email" defaultValue={company.email ?? ""} /></Field>
            <Field label="Telepon" htmlFor="company-phone"><Input id="company-phone" name="phone" maxLength={30} defaultValue={company.phone ?? ""} /></Field>
            <Field label="Alamat" htmlFor="company-address" className="sm:col-span-2">
              <Textarea id="company-address" name="address" rows={2} maxLength={240} defaultValue={company.address ?? ""} />
            </Field>
            <Field label="Kota" htmlFor="company-city"><Input id="company-city" name="city" maxLength={80} defaultValue={company.city ?? ""} /></Field>
            <Field label="Provinsi" htmlFor="company-province"><Input id="company-province" name="province" maxLength={80} defaultValue={company.province ?? ""} /></Field>
            <Field label="Kode pos" htmlFor="company-postal"><Input id="company-postal" name="postalCode" maxLength={10} defaultValue={company.postalCode ?? ""} /></Field>
          </fieldset>
        </PaperCard>

        <PaperCard className="p-4 sm:p-5">
          <SectionRule label="Pajak & periode" />
          <fieldset disabled={!canEdit} className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox id="company-pkp" name="isPkp" defaultChecked={company.isPkp} />
              PKP aktif
            </label>
            <Field label="Nomor PKP" htmlFor="company-pkpNumber"><Input id="company-pkpNumber" name="pkpNumber" maxLength={40} defaultValue={company.pkpNumber ?? ""} /></Field>
            <Field label="KPP" htmlFor="company-kpp"><Input id="company-kpp" name="kpp" maxLength={80} defaultValue={company.kpp ?? ""} /></Field>
            <Field label="Tarif PPN (%)" htmlFor="company-ppnRate" required><Input id="company-ppnRate" name="ppnRate" inputMode="decimal" required defaultValue={company.ppnRate} /></Field>
            <Field label="Bulan awal tahun buku" htmlFor="company-fiscal">
              <Select id="company-fiscal" name="fiscalYearStartMonth" defaultValue={String(company.fiscalYearStartMonth)}>
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </Select>
            </Field>
          </fieldset>
        </PaperCard>

        <PaperCard className="p-4 sm:p-5">
          <SectionRule label="Logo" />
          <div className="mt-4">
            <Field label="Unggah logo" htmlFor="company-logo">
              <Input id="company-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={!canEdit} className="py-1.5" />
            </Field>
          </div>
        </PaperCard>

        {canEdit ? (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>{pending ? "Menyimpan…" : "Simpan pengaturan"}</Button>
            <DownloadLink href="/api/export/backup" className="text-xs text-forest underline underline-offset-4">Unduh cadangan JSON</DownloadLink>
          </div>
        ) : (
          <p className="text-xs text-ink-faint">Hanya admin yang dapat mengubah pengaturan perusahaan.</p>
        )}
      </form>
    </div>
  );
}
