"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/settings";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { PaperCard, SectionRule } from "@/components/ui/paper";

export function ProfileForms({ name, email }: { name: string; email: string }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, IDLE_STATE as ActionState);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, IDLE_STATE as ActionState);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PaperCard className="p-4 sm:p-5">
        <SectionRule label="Profil" />
        <FormFeedback state={profileState} />
        <form action={profileAction} className="mt-4 space-y-4">
          <Field label="Nama" htmlFor="profile-name" required>
            <Input id="profile-name" name="name" required maxLength={120} defaultValue={name} />
          </Field>
          <Field label="Email" htmlFor="profile-email" hint="Email hanya dapat diubah oleh admin sistem.">
            <Input id="profile-email" value={email} readOnly disabled />
          </Field>
          <Button type="submit" disabled={profilePending}>
            {profilePending ? "Menyimpan…" : "Simpan profil"}
          </Button>
        </form>
      </PaperCard>

      <PaperCard className="p-4 sm:p-5">
        <SectionRule label="Kata sandi" />
        <FormFeedback state={passwordState} />
        <form action={passwordAction} className="mt-4 space-y-4">
          <Field label="Kata sandi saat ini" htmlFor="current-password" required>
            <Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Kata sandi baru" htmlFor="new-password" hint="Minimal 8 karakter." required>
            <Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Ulangi kata sandi baru" htmlFor="confirm-password" required>
            <Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Button type="submit" variant="secondary" disabled={passwordPending}>
            {passwordPending ? "Menyimpan…" : "Ubah kata sandi"}
          </Button>
        </form>
      </PaperCard>
    </div>
  );
}
