import { formatIDR, formatNumberID, type FormatIdrOptions, type Moneyish } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Money({
  value,
  options,
  className,
}: {
  value: Moneyish | null | undefined;
  options?: FormatIdrOptions;
  className?: string;
}) {
  return <span className={cn("money whitespace-nowrap", className)}>{formatIDR(value, options)}</span>;
}

export function Delta({
  value,
  suffix = "%",
  className,
}: {
  value: number | null;
  suffix?: string;
  className?: string;
}) {
  if (value === null || !Number.isFinite(value)) {
    return <span className={cn("font-mono text-xs text-ink-faint", className)}>—</span>;
  }
  const positive = value > 0;
  const negative = value < 0;
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums",
        positive && "text-forest",
        negative && "text-vermilion",
        !positive && !negative && "text-ink-faint",
        className,
      )}
    >
      {positive ? "▲" : negative ? "▼" : "•"} {formatNumberID(Math.abs(value), 1)}
      {suffix}
    </span>
  );
}
