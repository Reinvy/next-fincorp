"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { formatNumberID } from "@/lib/money";

export interface MoneyInputProps {
  id?: string;
  name: string;
  value?: string;
  defaultValue?: string | number;
  onValueChange?: (digits: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  invalid?: boolean;
  placeholder?: string;
}

function normalizeDigits(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  return String(value).replace(/\D/g, "").slice(0, 16);
}

/** Rupiah input: displays thousand separators, stores/returns digit strings only. */
export function MoneyInput({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  className,
  invalid,
  placeholder,
}: MoneyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [internal, setInternal] = useState(() => normalizeDigits(defaultValue));
  const digits = value !== undefined ? normalizeDigits(value) : internal;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = normalizeDigits(event.target.value);
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  return (
    <div
      className={cn(
        "flex h-[38px] items-center overflow-hidden rounded-[3px] border border-rule bg-paper-light transition-colors focus-within:border-forest focus-within:bg-card focus-within:ring-2 focus-within:ring-forest focus-within:ring-offset-2 focus-within:ring-offset-paper",
        invalid && "border-vermilion",
        disabled && "opacity-60",
        className,
      )}
    >
      <span aria-hidden="true" className="select-none border-r border-rule px-2.5 font-mono text-[11px] text-ink-faint">
        Rp
      </span>
      <input
        id={inputId}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        aria-invalid={invalid || undefined}
        placeholder={placeholder ?? "0"}
        value={digits ? formatNumberID(digits) : ""}
        onChange={handleChange}
        className="h-full w-full bg-transparent px-2.5 text-right font-mono text-[13px] tabular-nums text-ink outline-none"
      />
      <input type="hidden" name={name} value={digits === "" ? "0" : digits} />
    </div>
  );
}
