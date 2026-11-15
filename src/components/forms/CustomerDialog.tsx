"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomerAction, setCustomerActiveAction, updateCustomerAction } from "@/actions/sales";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { CustomerView } from "@/lib/dto";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function CustomerDialog({
  initial,
  triggerLabel,
  variant = "primary",
  size = "md",
}: {
  initial?: CustomerView;
  triggerLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    initial ? updateCustomerAction : createCustomerAction,
    IDLE_STATE as ActionState,
  );

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={initial ? `Ubah pelanggan ${initial.name}` : "Tambah pelanggan"}
        description="Data pelanggan dipakai pada faktur penjualan dan laporan piutang."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" form="customer-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan pelanggan"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="customer-form" action={formAction} className="space-y-4">
          {initial ? <input type="hidden" name="customerId" value={initial.id} /> : null}
          <Field label="Nama" htmlFor="customer-name" required>
            <Input id="customer-name" name="name" required maxLength={120} defaultValue={initial?.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NPWP" htmlFor="customer-npwp">
              <Input id="customer-npwp" name="npwp" maxLength={30} defaultValue={initial?.npwp ?? ""} />
            </Field>
            <Field label="Kontak" htmlFor="customer-contact">
              <Input id="customer-contact" name="contactPerson" maxLength={80} defaultValue={initial?.contactPerson ?? ""} />
            </Field>
            <Field label="Email" htmlFor="customer-email">
              <Input id="customer-email" name="email" type="email" defaultValue={initial?.email ?? ""} />
            </Field>
            <Field label="Telepon" htmlFor="customer-phone">
              <Input id="customer-phone" name="phone" maxLength={30} defaultValue={initial?.phone ?? ""} />
            </Field>
          </div>
          <Field label="Alamat" htmlFor="customer-address">
            <Textarea id="customer-address" name="address" rows={2} maxLength={240} defaultValue={initial?.address ?? ""} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export function CustomerActiveButton({ customer }: { customer: CustomerView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setCustomerActiveAction(customer.id, !customer.isActive);
          if (result.status === "error") toast.error(result.message);
          if (result.status === "success") {
            toast.success(result.message);
            router.refresh();
          }
        })
      }
    >
      {pending ? "…" : customer.isActive ? "Nonaktifkan" : "Aktifkan"}
    </Button>
  );
}
