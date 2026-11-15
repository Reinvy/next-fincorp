"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
}

// Module-level store: server-action revalidation can remount the provider, and
// toasts must survive that remount long enough to be read by the user.
const EMPTY: ToastItem[] = [];
let toasts: ToastItem[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  notify();
}

function push(tone: ToastTone, message: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, tone, message }];
  notify();
  window.setTimeout(() => dismiss(id), 4000);
}

const api: ToastApi = {
  success: (message) => push("success", message),
  error: (message) => push("error", message),
  info: (message) => push("info", message),
  dismiss,
};

const toneStyles: Record<ToastTone, { bar: string; icon: ReactNode }> = {
  success: { bar: "border-l-forest", icon: <CheckCircle2 className="h-4 w-4 text-forest" aria-hidden="true" /> },
  error: { bar: "border-l-vermilion", icon: <XCircle className="h-4 w-4 text-vermilion" aria-hidden="true" /> },
  info: { bar: "border-l-sky", icon: <Info className="h-4 w-4 text-sky" aria-hidden="true" /> },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);

  return (
    <>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="app-toast no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2"
      >
        {items.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 border border-rule border-l-[3px] bg-card px-3 py-2.5 shadow-[0_10px_24px_-16px_rgba(33,31,26,.6)]",
              toneStyles[toast.tone].bar,
            )}
          >
            <span className="mt-0.5">{toneStyles[toast.tone].icon}</span>
            <p className="flex-1 text-[13px] leading-5 text-ink">{toast.message}</p>
            <button
              type="button"
              aria-label="Tutup notifikasi"
              className="text-ink-faint hover:text-ink"
              onClick={() => dismiss(toast.id)}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export function useToast(): ToastApi {
  return api;
}
