"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TabItem {
  href: string;
  label: string;
  exact?: boolean;
}

export function TabNav({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Tab" className={cn("flex gap-1 overflow-x-auto border-b border-rule", className)}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
              active
                ? "border-forest text-forest"
                : "border-transparent text-ink-faint hover:border-rule-strong hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
