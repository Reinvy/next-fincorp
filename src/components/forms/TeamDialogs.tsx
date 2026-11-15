"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteMemberAction, removeMemberByIdAction, updateMemberRoleAction } from "@/actions/team";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { TeamMemberView } from "@/lib/dto";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateID } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(inviteMemberAction, IDLE_STATE as ActionState);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Tambah anggota</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah anggota tim"
        description="Jika email belum terdaftar, akun dibuat dengan kata sandi sementara. Sampaikan kata sandi sekali saja."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="invite-member-form" disabled={pending}>
              {pending ? "Menambahkan…" : "Tambah anggota"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="invite-member-form" action={formAction} className="space-y-4">
          <Field label="Nama" htmlFor="invite-name" required>
            <Input id="invite-name" name="name" required maxLength={120} />
          </Field>
          <Field label="Email" htmlFor="invite-email" required>
            <Input id="invite-email" name="email" type="email" required maxLength={160} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kata sandi sementara" htmlFor="invite-password" required hint="Hanya dipakai bila akun baru.">
              <Input id="invite-password" name="password" type="text" required minLength={8} maxLength={128} />
            </Field>
            <Field label="Peran" htmlFor="invite-role" required>
              <Select id="invite-role" name="role" defaultValue="VIEWER">
                <option value="ADMIN">Admin</option>
                <option value="ACCOUNTANT">Akuntan</option>
                <option value="VIEWER">Pengamat</option>
              </Select>
            </Field>
          </div>
          <p className="text-xs text-ink-faint">
            Admin dapat mengelola tim dan menutup periode. Akuntan mencatat transaksi. Pengamat hanya membaca.
          </p>
        </form>
      </Dialog>
    </>
  );
}

export function TeamMemberRow({
  member,
  currentUserId,
}: {
  member: TeamMemberView;
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(updateMemberRoleAction, IDLE_STATE as ActionState);
  const toast = useToast();
  const router = useRouter();
  const [deletePending, startDelete] = useTransition();
  const isSelf = member.userId === currentUserId;

  return (
    <tr>
      <td>
        <p className="text-[13px] text-ink">{member.name}{isSelf ? " (Anda)" : ""}</p>
        <p className="font-mono text-[10px] text-ink-faint">{member.email}</p>
      </td>
      <td>
        <FormFeedback state={state} />
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="membershipId" value={member.id} />
          <label htmlFor={`role-${member.id}`} className="sr-only">Peran {member.name}</label>
          <Select
            id={`role-${member.id}`}
            name="role"
            defaultValue={member.role}
            className="h-8 w-[130px] text-[12px]"
            disabled={pending}
          >
            <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
            <option value="ACCOUNTANT">{ROLE_LABELS.ACCOUNTANT}</option>
            <option value="VIEWER">{ROLE_LABELS.VIEWER}</option>
          </Select>
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            {pending ? "…" : "Simpan"}
          </Button>
        </form>
      </td>
      <td className="font-mono text-xs text-ink-faint">{formatDateID(member.createdAt)}</td>
      <td className="text-right">
        <ConfirmButton
          title={`Hapus ${member.name}?`}
          description="Akses anggota ke perusahaan dicabut. Riwayat jurnal yang ia buat tetap tersimpan."
          confirmLabel="Hapus anggota"
          variant="ghost"
          size="sm"
          disabled={deletePending}
          onConfirm={() =>
            startDelete(async () => {
              const result = await removeMemberByIdAction(member.id);
              if (result.status === "error") toast.error(result.message);
              if (result.status === "success") {
                toast.success(result.message);
                router.refresh();
              }
            })
          }
        >
          Hapus
        </ConfirmButton>
      </td>
    </tr>
  );
}
