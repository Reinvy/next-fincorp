import { cn } from "@/lib/utils";

export function LedgerMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="6" fill="currentColor" opacity="0.14" />
      <rect x="15" y="11" width="34" height="42" rx="2" fill="var(--color-card)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 22h34M15 30h34M15 38h20M15 46h20" stroke="var(--color-rule-strong)" strokeWidth="1.3" />
      <path
        d="M37 47l5.5-7 6.5 10"
        stroke="var(--color-gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
