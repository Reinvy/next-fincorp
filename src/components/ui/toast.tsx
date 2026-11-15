"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
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

const ToastContext = createContext<ToastApi | null>(null);

const toneStyles: Record<ToastTone, { bar: string; icon: ReactNode }> = {
  success: { bar: "border-l-forest", icon: <CheckCircle2 className="h-4 w-4 text-forest" aria-hidden="true" /> },
  error: { bar: "border-l-vermilion", icon: <XCircle className="h-4 w-4 text-vermilion" aria-hidden="true" /> },
  info: { bar: "border-l-sky", icon: <Info className="h-4 w-4 text-sky" aria-hidden="true" /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="app-toast no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2"
      >
        {toasts.map((toast) => (
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
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam ToastProvider.");
  return context;
}
