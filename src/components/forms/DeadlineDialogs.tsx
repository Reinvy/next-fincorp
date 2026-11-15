"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createDeadlineAction, deleteDeadlineAction, updateDeadlineAction } from "@/actions/deadlines";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { DeadlineView } from "@/lib/dto";
import { DEADLINE_CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function ManualDeadlineDialog({
  initial,
  defaultDate,
  triggerLabel = "Tenggat manual",
  variant = "secondary",
}: {
  initial?: DeadlineView;
  defaultDate: string;
  triggerLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    initial ? updateDeadlineAction : createDeadlineAction,
    IDLE_STATE as ActionState,
  );

  return (
    <>
      <Button variant={variant} size={initial ? "sm" : "md"} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={initial ? "Ubah tenggat" : "Tambah tenggat manual"}
        description="Tenggat manual tidak membuat jurnal; catat transaksinya melalui modul terkait."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="deadline-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan tenggat"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="deadline-form" action={formAction} className="space-y-4">
          {initial ? <input type="hidden" name="deadlineId" value={initial.id} /> : null}
          <Field label="Judul" htmlFor="deadline-title" required>
            <Input id="deadline-title" name="title" required maxLength={120} defaultValue={initial?.title} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal" htmlFor="deadline-date" required>
              <Input id="deadline-date" name="dueDate" type="date" required defaultValue={initial?.dueDate ?? defaultDate} />
            </Field>
            <Field label="Kategori" htmlFor="deadline-category" required>
              <Select id="deadline-category" name="category" defaultValue={initial?.category ?? "OTHER"}>
                {Object.entries(DEADLINE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Nominal (opsional)" htmlFor="deadline-amount">
              <MoneyInput name="amount" defaultValue={initial?.amount ?? ""} />
            </Field>
            <Field label="Catatan" htmlFor="deadline-notes">
              <Textarea id="deadline-notes" name="notes" rows={2} maxLength={240} defaultValue={initial?.notes ?? ""} />
            </Field>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function ConfirmDeleteDeadlineButton({ deadlineId }: { deadlineId: string }) {
  const toast = useToast();
  const router = useRouter();
  return (
    <ConfirmButton
      title="Hapus tenggat?"
      description="Tenggat manual akan dihapus permanen. Tindakan ini tercatat di jejak audit."
      confirmLabel="Hapus"
      variant="ghost"
      size="sm"
      onConfirm={async () => {
        const result = await deleteDeadlineAction(deadlineId);
        if (result.status === "error") toast.error(result.message);
        if (result.status === "success") {
          toast.success(result.message);
          router.refresh();
        }
      }}
    >
      Hapus
    </ConfirmButton>
  );
}
