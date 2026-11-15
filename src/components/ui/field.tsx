import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | string[];
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  const describedBy = message ? `${htmlFor ?? "field"}-error` : hint ? `${htmlFor ?? "field"}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft"
      >
        {label}
        {required ? <span className="ml-1 text-vermilion">*</span> : null}
      </label>
      {children}
      {message ? (
        <p id={describedBy} role="alert" className="text-xs text-vermilion">
          {message}
        </p>
      ) : hint ? (
        <p id={describedBy} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
