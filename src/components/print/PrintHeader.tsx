import type { ReactNode } from "react";
import { LedgerMark } from "@/components/brand/LedgerMark";
import { formatDateLongID } from "@/lib/dates";

export interface CompanyLetterhead {
  name: string;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  npwp?: string | null;
  email?: string | null;
  phone?: string | null;
  logoDataUrl?: string | null;
}

function addressLine(company: CompanyLetterhead): string {
  return [company.address, company.city, company.province, company.postalCode].filter(Boolean).join(", ");
}

export function PrintHeader({
  company,
  title,
  subtitle,
  meta,
  actions,
}: {
  company: CompanyLetterhead;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="border-b-2 border-ink pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {company.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUrl} alt="" className="h-12 w-12 rounded-[2px] object-contain" />
          ) : (
            <LedgerMark size={46} className="text-forest" />
          )}
          <div>
            <p className="font-display text-xl font-semibold leading-tight text-ink">{company.name}</p>
            <p className="mt-0.5 max-w-sm text-[11px] leading-4 text-ink-soft">{addressLine(company)}</p>
            <p className="text-[11px] leading-4 text-ink-soft">
              {company.npwp ? `NPWP ${company.npwp}` : null}
              {company.email ? ` · ${company.email}` : null}
              {company.phone ? ` · ${company.phone}` : null}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p> : null}
          {meta ? <div className="mt-1 text-xs text-ink-soft">{meta}</div> : null}
          {actions ? <div className="no-print mt-2 flex justify-end gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function SignatureBlock({
  left = "Dibuat oleh",
  middle = "Diperiksa",
  right = "Disetujui",
  names,
}: {
  left?: string;
  middle?: string;
  right?: string;
  names?: [string | null | undefined, string | null | undefined, string | null | undefined];
}) {
  const labels = [left, middle, right];
  return (
    <div className="mt-10 grid grid-cols-3 gap-6 text-center print-avoid-break">
      {labels.map((label, index) => (
        <div key={label}>
          <p className="text-[11px] text-ink-soft">{label}</p>
          <div className="mx-auto mt-12 border-b border-rule-strong" />
          <p className="mt-1 min-h-4 font-mono text-[10px] text-ink">{names?.[index] ?? "\u00A0"}</p>
        </div>
      ))}
    </div>
  );
}

export function DocumentMeta({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{item.label}</dt>
          <dd className="mt-0.5 text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PrintPeriod({ from, to }: { from: string; to: string }) {
  return (
    <span>
      Periode {formatDateLongID(from)} – {formatDateLongID(to)}
    </span>
  );
}
