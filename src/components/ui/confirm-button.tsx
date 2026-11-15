"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export interface ConfirmButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  children: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
}

/** Destructive trigger with an in-app confirmation dialog (never window.confirm). */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  onConfirm,
  variant = "danger",
  ...buttonProps
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  async function confirm() {
    setPending(true);
    try {
      if (onConfirm) {
        await onConfirm();
      } else {
        triggerRef.current?.closest("form")?.requestSubmit();
      }
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button ref={triggerRef} variant={variant} onClick={() => setOpen(true)} {...buttonProps}>
        {children}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              {cancelLabel}
            </Button>
            <Button variant="danger" onClick={confirm} disabled={pending}>
              {pending ? "Memproses…" : confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Tindakan ini tercatat di jejak audit. Pastikan Anda sudah memeriksa dokumen terkait.
        </p>
      </Dialog>
    </>
  );
}
