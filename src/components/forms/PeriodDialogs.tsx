"use client";

import { useActionState, useState } from "react";
import { closePeriodAction, reopenPeriodAction } from "@/actions/periods";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import { formatMonthID } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";

export function ClosePeriodDialog({ year, month }: { year: number; month: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(closePeriodAction, IDLE_STATE as ActionState);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Tutup
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Tutup periode ${formatMonthID(`${year}-${String(month).padStart(2, "0")}`)}?`}
        description="Setelah ditutup, jurnal bertanggal periode ini akan ditolak sampai dibuka kembali."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" form="close-period-form" disabled={pending}>
              {pending ? "Menutup…" : "Tutup periode"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="close-period-form" action={formAction}>
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <Field label="Catatan" htmlFor="close-note" hint="Opsional, misalnya alasan penutupan lebih awal.">
            <Textarea id="close-note" name="note" rows={3} maxLength={240} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export function ReopenPeriodDialog({ year, month }: { year: number; month: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reopenPeriodAction, IDLE_STATE as ActionState);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Buka kembali
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Buka kembali periode ${formatMonthID(`${year}-${String(month).padStart(2, "0")}`)}?`}
        description="Alasan wajib dicatat di jejak audit."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" form="reopen-period-form" variant="danger" disabled={pending}>
              Buka periode
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <p className="mb-3 border-l-2 border-mustard bg-mustard-soft px-3 py-2 text-xs text-ink-soft">
          Membuka periode memungkinkan jurnal lama ditambahkan atau dibalik. Pastikan laporan yang sudah terbit
          disesuaikan.
        </p>
        <form id="reopen-period-form" action={formAction}>
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <Field label="Alasan" htmlFor="reopen-note" required>
            <Textarea id="reopen-note" name="note" rows={3} maxLength={240} required placeholder="Contoh: koreksi faktur yang salah tanggal" />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
