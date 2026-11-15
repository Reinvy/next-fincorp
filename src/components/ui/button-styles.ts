import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-[3px] border font-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "border-forest bg-forest text-card hover:bg-forest-deep hover:border-forest-deep",
  secondary: "border-rule-strong bg-card text-ink hover:bg-paper-light",
  ghost: "border-transparent bg-transparent text-ink-soft hover:bg-paper-light hover:text-ink",
  danger: "border-vermilion bg-vermilion text-card hover:bg-[#94301f] hover:border-[#94301f]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[10px]",
  md: "h-9 px-3",
  lg: "h-10 px-4",
  icon: "h-9 w-9 px-0",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}
