"use client";

import { useActionState, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTicketAction,
  replyTicketAction,
  updateTicketStatusAction,
} from "@/actions/support";
import { IDLE_STATE, type ActionState, type TicketStatus } from "@/lib/types";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTicketAction, IDLE_STATE as ActionState);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Buka tiket</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Tiket bantuan"
        description="Jelaskan kendala sedetail mungkin. Tiket dibalas oleh admin perusahaan."
        maxWidth={640}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="ticket-form" disabled={pending}>
              {pending ? "Mengirim…" : "Kirim tiket"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="ticket-form" action={formAction} className="space-y-4">
          <Field label="Subjek" htmlFor="ticket-subject" required>
            <Input id="ticket-subject" name="subject" required minLength={3} maxLength={160} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori" htmlFor="ticket-category" required>
              <Select id="ticket-category" name="category" defaultValue="ACCOUNTING">
                {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prioritas" htmlFor="ticket-priority" required>
              <Select id="ticket-priority" name="priority" defaultValue="NORMAL">
                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Deskripsi" htmlFor="ticket-description" required>
            <Textarea id="ticket-description" name="description" required minLength={10} maxLength={2000} rows={5} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export function ReplyForm({ ticketId, disabled }: { ticketId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(replyTicketAction, IDLE_STATE as ActionState);
  if (disabled) return <p className="text-xs text-ink-faint">Tiket ditutup; balasan tidak dapat ditambahkan.</p>;
  return (
    <form action={formAction} className="space-y-3">
      <FormFeedback state={state} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <Field label="Balasan" htmlFor="ticket-reply" required>
        <Textarea id="ticket-reply" name="body" required maxLength={2000} rows={3} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Mengirim…" : "Kirim balasan"}
      </Button>
    </form>
  );
}

const FLOW: Record<TicketStatus, Array<{ status: TicketStatus; label: string }>> = {
  OPEN: [
    { status: "IN_PROGRESS", label: "Proses" },
    { status: "CLOSED", label: "Tutup" },
  ],
  IN_PROGRESS: [
    { status: "RESOLVED", label: "Selesai" },
    { status: "OPEN", label: "Kembali" },
  ],
  RESOLVED: [
    { status: "CLOSED", label: "Tutup" },
    { status: "IN_PROGRESS", label: "Buka kembali" },
  ],
  CLOSED: [],
};

export function TicketStatusControls({
  ticketId,
  status,
  isAdmin,
  isOwner,
}: {
  ticketId: string;
  status: TicketStatus;
  isAdmin: boolean;
  isOwner: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (status === "CLOSED") return <p className="text-xs text-ink-faint">Tiket sudah final.</p>;
  const options = isAdmin
    ? FLOW[status]
    : isOwner
      ? [{ status: "CLOSED" as TicketStatus, label: "Tutup tiket" }]
      : [];
  if (options.length === 0) return null;

  function change(next: TicketStatus) {
    startTransition(async () => {
      const result = await updateTicketStatusAction(ticketId, next);
      if (result.status === "error") toast.error(result.message);
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button key={option.status} variant="secondary" size="sm" disabled={pending} onClick={() => change(option.status)}>
          {option.label}
        </Button>
      ))}
    </div>
  );
}
