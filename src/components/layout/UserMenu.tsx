"use client";

import Link from "next/link";
import { ChevronsUpDown, LifeBuoy, LogOut, Settings, User } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { initials } from "@/lib/utils";

export function UserMenu({ user }: { user: { name: string; email: string } }) {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[3px] px-2 py-1.5 text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/60 bg-paper/10 font-mono text-[10px] text-gold">
          {initials(user.name)}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[12px] font-medium leading-4 text-paper">{user.name}</span>
          <span className="block truncate text-[10px] leading-4 text-paper/45">{user.email}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-paper/40" aria-hidden="true" />
      </summary>

      <div className="absolute bottom-full left-0 z-40 mb-1 w-60 rounded-[3px] border border-rule bg-card p-1 shadow-[0_18px_40px_-24px_rgba(33,31,26,.6)]">
        <Link href="/settings/profile" className="flex items-center gap-2 rounded-[2px] px-2 py-1.5 text-[13px] text-ink hover:bg-paper-light">
          <User className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
          Profil &amp; kata sandi
        </Link>
        <Link href="/settings/company" className="flex items-center gap-2 rounded-[2px] px-2 py-1.5 text-[13px] text-ink hover:bg-paper-light">
          <Settings className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
          Pengaturan perusahaan
        </Link>
        <Link href="/support" className="flex items-center gap-2 rounded-[2px] px-2 py-1.5 text-[13px] text-ink hover:bg-paper-light">
          <LifeBuoy className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
          Bantuan
        </Link>
        <div className="mt-1 border-t border-rule pt-1">
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-[2px] px-2 py-1.5 text-left text-[13px] text-vermilion hover:bg-vermilion-soft"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Keluar
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}
