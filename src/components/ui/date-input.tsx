import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function DateInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="date"
      className={cn(
        "h-[38px] w-full rounded-[3px] border border-rule bg-paper-light px-3 font-mono text-[13px] text-ink transition-colors focus:border-forest focus:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
