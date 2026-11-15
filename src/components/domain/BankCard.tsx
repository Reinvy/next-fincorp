import Link from "next/link";
import type { BankAccountSummary } from "@/lib/dto";
import { formatIDR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Stamp } from "@/components/ui/paper";

const THEMES: Record<string, { band: string; chip: string; label: string }> = {
  FOREST: { band: "bg-forest-deep", chip: "bg-forest-soft text-forest", label: "Hijau botol" },
  MUSTARD: { band: "bg-mustard", chip: "bg-mustard-soft text-mustard", label: "Mustard" },
  SKY: { band: "bg-sky", chip: "bg-sky-soft text-sky", label: "Biru" },
  VERMILION: { band: "bg-vermilion", chip: "bg-vermilion-soft text-vermilion", label: "Merah" },
  INK: { band: "bg-ink", chip: "bg-paper-deep text-ink", label: "Tinta" },
};

export function BankCard({ account }: { account: BankAccountSummary }) {
  const theme = THEMES[account.cardTheme] ?? THEMES.FOREST;
  return (
    <Link
      href={`/cash-bank/${account.id}`}
      className="group block overflow-hidden rounded-[5px] border border-rule bg-card shadow-[0_1px_0_var(--color-rule),0_14px_30px_-26px_rgba(33,31,26,.5)] transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div className={cn("h-1.5 w-full", theme.band)} aria-hidden="true" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{account.name}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
              {account.type === "CASH" ? "KAS" : account.bankName ?? "BANK"}
              {account.accountNumber ? ` · ${account.accountNumber}` : ""}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-[2px] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]", theme.chip)}>
            {theme.label}
          </span>
        </div>
        <p className="mt-4 text-right font-mono text-[20px] font-medium tabular-nums text-ink">
          {formatIDR(account.balance)}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-rule pt-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            Akun {account.coaCode}
          </span>
          {account.isActive ? <Stamp tone="forest">Aktif</Stamp> : <Stamp tone="neutral">Nonaktif</Stamp>}
        </div>
      </div>
    </Link>
  );
}
