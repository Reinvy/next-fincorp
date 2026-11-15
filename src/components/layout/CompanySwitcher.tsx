"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building, Check, ChevronsUpDown } from "lucide-react";
import { switchCompanyAction } from "@/actions/company";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { MembershipOption } from "@/components/layout/AppShell";

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNTANT: "Akuntan",
  VIEWER: "Pengamat",
};

export function CompanySwitcher({
  memberships,
  activeCompanyId,
  compact = false,
}: {
  memberships: MembershipOption[];
  activeCompanyId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const active = memberships.find((membership) => membership.companyId === activeCompanyId) ?? memberships[0];

  function select(companyId: string) {
    if (companyId === activeCompanyId) return;
    startTransition(async () => {
      const result = await switchCompanyAction(companyId);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      if (result.status === "success") toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <details className="group relative">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 rounded-[3px] border transition-colors [&::-webkit-details-marker]:hidden",
          compact
            ? "h-9 max-w-[220px] border-rule bg-card px-2.5 text-ink hover:bg-paper-light"
            : "w-full border-paper/15 bg-paper/5 px-2.5 py-2 text-paper hover:bg-paper/10",
          pending && "opacity-60",
        )}
        aria-label="Ganti perusahaan aktif"
      >
        <Building className={cn("h-4 w-4 shrink-0", compact ? "text-forest" : "text-gold")} aria-hidden="true" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[12px] font-medium leading-4">{active?.companyName ?? "Pilih perusahaan"}</span>
          {!compact ? (
            <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-paper/50">
              {roleLabel[active?.role ?? ""] ?? active?.role}
            </span>
          ) : null}
        </span>
        <ChevronsUpDown className={cn("h-3.5 w-3.5 shrink-0", compact ? "text-ink-faint" : "text-paper/50")} aria-hidden="true" />
      </summary>

      <div
        className={cn(
          "absolute z-40 mt-1 w-64 rounded-[3px] border border-rule bg-card p-1 shadow-[0_18px_40px_-24px_rgba(33,31,26,.6)]",
          compact ? "right-0" : "left-0",
        )}
      >
        <p className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">Perusahaan</p>
        <ul className="max-h-64 overflow-y-auto">
          {memberships.map((membership) => {
            const selected = membership.companyId === activeCompanyId;
            return (
              <li key={membership.companyId}>
                <button
                  type="button"
                  onClick={() => select(membership.companyId)}
                  disabled={pending}
                  className="flex w-full items-center gap-2 rounded-[2px] px-2 py-1.5 text-left text-[13px] text-ink hover:bg-paper-light disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{membership.companyName}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
                      {roleLabel[membership.role] ?? membership.role}
                    </span>
                  </span>
                  {selected ? <Check className="h-3.5 w-3.5 text-forest" aria-label="Aktif" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-1 border-t border-rule pt-1">
          <Link
            href="/companies"
            className="block rounded-[2px] px-2 py-1.5 text-[12px] text-ink-soft hover:bg-paper-light hover:text-ink"
          >
            Kelola perusahaan
          </Link>
        </div>
      </div>
    </details>
  );
}
