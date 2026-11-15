"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVendorAction, setVendorActiveAction, updateVendorAction } from "@/actions/purchases";
import { IDLE_STATE, type ActionState } from "@/lib/types";
import type { VendorView } from "@/lib/dto";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FormFeedback } from "@/components/forms/FormFeedback";
import { useToast } from "@/components/ui/toast";

export function VendorDialog({
  initial,
  triggerLabel,
  variant = "primary",
  size = "md",
}: {
  initial?: VendorView;
  triggerLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    initial ? updateVendorAction : createVendorAction,
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
        title={initial ? `Ubah vendor ${initial.name}` : "Tambah vendor"}
        description="Data vendor dipakai pada faktur pembelian dan laporan utang."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Batal</Button>
            <Button type="submit" form="vendor-form" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan vendor"}
            </Button>
          </>
        }
      >
        <FormFeedback state={state} onSuccess={() => setOpen(false)} />
        <form id="vendor-form" action={formAction} className="space-y-4">
          {initial ? <input type="hidden" name="vendorId" value={initial.id} /> : null}
          <Field label="Nama" htmlFor="vendor-name" required>
            <Input id="vendor-name" name="name" required maxLength={120} defaultValue={initial?.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="NPWP" htmlFor="vendor-npwp">
              <Input id="vendor-npwp" name="npwp" maxLength={30} defaultValue={initial?.npwp ?? ""} />
            </Field>
            <Field label="Kontak" htmlFor="vendor-contact">
              <Input id="vendor-contact" name="contactPerson" maxLength={80} defaultValue={initial?.contactPerson ?? ""} />
            </Field>
            <Field label="Email" htmlFor="vendor-email">
              <Input id="vendor-email" name="email" type="email" defaultValue={initial?.email ?? ""} />
            </Field>
            <Field label="Telepon" htmlFor="vendor-phone">
              <Input id="vendor-phone" name="phone" maxLength={30} defaultValue={initial?.phone ?? ""} />
            </Field>
          </div>
          <Field label="Alamat" htmlFor="vendor-address">
            <Textarea id="vendor-address" name="address" rows={2} maxLength={240} defaultValue={initial?.address ?? ""} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}

export function VendorActiveButton({ vendor }: { vendor: VendorView }) {
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
          const result = await setVendorActiveAction(vendor.id, !vendor.isActive);
          if (result.status === "error") toast.error(result.message);
          if (result.status === "success") {
            toast.success(result.message);
            router.refresh();
          }
        })
      }
    >
      {pending ? "…" : vendor.isActive ? "Nonaktifkan" : "Aktifkan"}
    </Button>
  );
}
