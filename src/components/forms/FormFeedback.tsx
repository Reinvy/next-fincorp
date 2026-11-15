"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

export interface FormFeedbackProps {
  state: ActionState;
  onSuccess?: () => void;
  onError?: () => void;
  /** Replacement for the automatic toast text. */
  successMessage?: string;
}

/** Bridges ActionState to a toast, dialog close and router refresh/redirect. */
export function FormFeedback({ state, onSuccess, onError, successMessage }: FormFeedbackProps) {
  const toast = useToast();
  const router = useRouter();
  const handled = useRef<ActionState | null>(null);
  const callbacks = useRef({ onSuccess, onError });

  useEffect(() => {
    callbacks.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  useEffect(() => {
    if (state.status === "idle" || handled.current === state) return;
    handled.current = state;

    if (state.status === "error") {
      toast.error(state.message);
      callbacks.current.onError?.();
      return;
    }

    toast.success(successMessage ?? state.message);
    callbacks.current.onSuccess?.();
    // Server Actions that call revalidatePath already stream a fresh RSC payload.
    // An extra router.refresh() here remounts the toast host and discards the toast.
    if (state.redirectTo) router.push(state.redirectTo);
  }, [state, toast, router, successMessage]);

  return null;
}
