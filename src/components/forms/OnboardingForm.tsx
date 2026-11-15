"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onboardingAction } from "@/actions/company";
import { IDLE_STATE } from "@/lib/types";
import { MONTH_OPTIONS } from "@/lib/constants";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-red-700">{messages[0]}</p>;
}

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
    <form action={formAction} className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Buat perusahaan</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Bagan akun standar dan keanggotaan admin dibuat otomatis. Rekening bank ditambahkan setelah ini.
        </p>
      </div>

      <section className="space-y-4 rounded border border-neutral-200 p-4">
        <h2 className="font-medium">Profil</h2>
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Nama perusahaan *
          </label>
          <input id="name" name="name" required maxLength={120} className="mt-1 w-full rounded border px-3 py-2" />
          <FieldError messages={errors.name} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="npwp" className="block text-sm font-medium">
              NPWP
            </label>
            <input id="npwp" name="npwp" maxLength={30} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="nib" className="block text-sm font-medium">
              NIB
            </label>
            <input id="nib" name="nib" maxLength={30} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input id="email" name="email" type="email" className="mt-1 w-full rounded border px-3 py-2" />
            <FieldError messages={errors.email} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium">
              Telepon
            </label>
            <input id="phone" name="phone" maxLength={30} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium">
            Alamat
          </label>
          <textarea id="address" name="address" rows={2} maxLength={240} className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="city" className="block text-sm font-medium">
              Kota
            </label>
            <input id="city" name="city" maxLength={80} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="province" className="block text-sm font-medium">
              Provinsi
            </label>
            <input id="province" name="province" maxLength={80} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium">
              Kode pos
            </label>
            <input id="postalCode" name="postalCode" maxLength={10} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded border border-neutral-200 p-4">
        <h2 className="font-medium">Pajak & periode</h2>
        <div className="flex items-center gap-2">
          <input id="isPkp" name="isPkp" type="checkbox" className="h-4 w-4" />
          <label htmlFor="isPkp" className="text-sm">
            Perusahaan dikukuhkan sebagai PKP
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pkpNumber" className="block text-sm font-medium">
              Nomor PKP
            </label>
            <input id="pkpNumber" name="pkpNumber" maxLength={40} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="kpp" className="block text-sm font-medium">
              KPP
            </label>
            <input id="kpp" name="kpp" maxLength={80} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label htmlFor="ppnRate" className="block text-sm font-medium">
              Tarif PPN (%)
            </label>
            <input
              id="ppnRate"
              name="ppnRate"
              inputMode="decimal"
              defaultValue="11"
              required
              className="mt-1 w-full rounded border px-3 py-2"
            />
            <FieldError messages={errors.ppnRate} />
          </div>
        </div>
        <div>
          <label htmlFor="fiscalYearStartMonth" className="block text-sm font-medium">
            Bulan awal tahun buku
          </label>
          <select
            id="fiscalYearStartMonth"
            name="fiscalYearStartMonth"
            defaultValue="1"
            className="mt-1 w-full rounded border px-3 py-2"
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-60"
      >
        {pending ? "Membuat…" : "Buat perusahaan"}
      </button>
    </form>
  );
}
