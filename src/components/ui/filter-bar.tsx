import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonStyles } from "@/components/ui/button";

/** GET filter form: every filter lives in the URL, no client state. */
export function SearchFilterBar({
  action,
  children,
  resetHref,
  submitLabel = "Terapkan",
  className,
}: {
  action: string;
  children: ReactNode;
  resetHref?: string;
  submitLabel?: string;
  className?: string;
}) {
  return (
    <form
      method="get"
      action={action}
      className={cn("flex flex-col gap-3 border-b border-rule bg-paper-light/70 px-4 py-3 md:flex-row md:items-end", className)}
    >
      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">{children}</div>
      <div className="flex items-center gap-2">
        <button type="submit" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          {submitLabel}
        </button>
        {resetHref ? (
          <Link href={resetHref} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function FilterChip({
  label,
  value,
  active,
  href,
  onRemove,
}: {
  label: string;
  value?: string;
  active?: boolean;
  href?: string;
  onRemove?: ReactNode;
}) {
  const body = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
        active ? "border-forest bg-forest-soft text-forest" : "border-rule bg-card text-ink-soft",
      )}
    >
      {label}
      {value ? <span className="normal-case tracking-normal text-ink">{value}</span> : null}
      {onRemove}
    </span>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
