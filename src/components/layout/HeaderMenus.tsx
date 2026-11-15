"use client";

import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { QUICK_ACTIONS } from "@/components/layout/nav";

export function QuickActions() {
  return (
    <details className="group relative no-print">
      <summary
        className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[3px] border border-forest bg-forest px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-card hover:bg-forest-deep [&::-webkit-details-marker]:hidden"
        aria-label="Aksi cepat"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Baru</span>
      </summary>
      <div className="absolute right-0 z-40 mt-1 w-64 rounded-[3px] border border-rule bg-card p-1 shadow-[0_18px_40px_-24px_rgba(33,31,26,.6)]">
        <p className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">Aksi cepat</p>
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="block rounded-[2px] px-2 py-1.5 hover:bg-paper-light"
          >
            <span className="block text-[13px] text-ink">{action.label}</span>
            <span className="block text-[11px] text-ink-faint">{action.hint}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}

export function NotificationBell({ count }: { count: number }) {
  const label = count > 0 ? `${count} peringatan` : "Tidak ada peringatan";
  return (
    <Link
      href="/deadlines"
      aria-label={`Buka tenggat waktu — ${label}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-[3px] border border-rule bg-card text-ink-soft hover:bg-paper-light hover:text-ink"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vermilion px-1 font-mono text-[9px] text-card">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
