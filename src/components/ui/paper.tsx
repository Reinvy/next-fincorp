import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ASSET_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  JOURNAL_STATUS_LABELS,
  PERIOD_STATUS_LABELS,
  TAX_INVOICE_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/constants";
import { buttonStyles } from "@/components/ui/button";

export function PaperCard({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div" | "aside";
}) {
  return <Tag className={cn("paper-sheet", className)}>{children}</Tag>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumbs ? <div className="mb-2">{breadcrumbs}</div> : null}
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(28px,4vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {description ? <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function KpiCard({
  label,
  value,
  note,
  index,
  tone = "ink",
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  index?: string;
  tone?: "ink" | "forest" | "vermilion" | "mustard" | "sky";
  className?: string;
}) {
  const tones = {
    ink: "text-ink",
    forest: "text-forest",
    vermilion: "text-vermilion",
    mustard: "text-mustard",
    sky: "text-sky",
  } as const;

  return (
    <div className={cn("paper-sheet relative px-4 pb-4 pt-4", className)}>
      {index ? (
        <span aria-hidden="true" className="absolute right-3 top-3 font-mono text-[10px] text-ink-faint">
          {index}
        </span>
      ) : null}
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <p className={cn("mt-2 font-mono text-[22px] font-medium leading-tight tabular-nums", tones[tone])}>{value}</p>
      {note ? <div className="mt-3 border-t border-rule pt-2 text-xs text-ink-faint">{note}</div> : null}
    </div>
  );
}

export type StampTone = "neutral" | "forest" | "mustard" | "sky" | "vermilion" | "gold";

const stampTones: Record<StampTone, string> = {
  neutral: "text-ink-faint",
  forest: "text-forest",
  mustard: "text-mustard",
  sky: "text-sky",
  vermilion: "text-vermilion",
  gold: "text-gold",
};

export function Stamp({
  children,
  tone = "neutral",
  plain,
  className,
}: {
  children: ReactNode;
  tone?: StampTone;
  plain?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("stamp", plain && "stamp-plain", stampTones[tone], className)}>{children}</span>
  );
}

export type StatusKind = "document" | "journal" | "taxInvoice" | "asset" | "period" | "ticket" | "overdue";

const STATUS_MAP: Record<StatusKind, Record<string, { label: string; tone: StampTone }>> = {
  document: Object.fromEntries(
    Object.entries(DOCUMENT_STATUS_LABELS).map(([status, label]) => [
      status,
      {
        label,
        tone:
          status === "PAID"
            ? "forest"
            : status === "PARTIAL"
              ? "sky"
              : status === "UNPAID"
                ? "mustard"
                : "neutral",
      },
    ]),
  ) as Record<string, { label: string; tone: StampTone }>,
  journal: {
    DRAFT: { label: JOURNAL_STATUS_LABELS.DRAFT, tone: "neutral" },
    POSTED: { label: JOURNAL_STATUS_LABELS.POSTED, tone: "forest" },
  },
  taxInvoice: {
    NONE: { label: TAX_INVOICE_STATUS_LABELS.NONE, tone: "neutral" },
    DRAFT: { label: TAX_INVOICE_STATUS_LABELS.DRAFT, tone: "neutral" },
    SUBMITTED: { label: TAX_INVOICE_STATUS_LABELS.SUBMITTED, tone: "sky" },
    APPROVED: { label: TAX_INVOICE_STATUS_LABELS.APPROVED, tone: "forest" },
    REJECTED: { label: TAX_INVOICE_STATUS_LABELS.REJECTED, tone: "vermilion" },
    CANCELLED: { label: TAX_INVOICE_STATUS_LABELS.CANCELLED, tone: "neutral" },
  },
  asset: {
    ACTIVE: { label: ASSET_STATUS_LABELS.ACTIVE, tone: "forest" },
    FULLY_DEPRECIATED: { label: ASSET_STATUS_LABELS.FULLY_DEPRECIATED, tone: "neutral" },
    DISPOSED: { label: ASSET_STATUS_LABELS.DISPOSED, tone: "neutral" },
  },
  period: {
    OPEN: { label: PERIOD_STATUS_LABELS.OPEN, tone: "sky" },
    CLOSED: { label: PERIOD_STATUS_LABELS.CLOSED, tone: "neutral" },
  },
  ticket: {
    OPEN: { label: TICKET_STATUS_LABELS.OPEN, tone: "mustard" },
    IN_PROGRESS: { label: TICKET_STATUS_LABELS.IN_PROGRESS, tone: "sky" },
    RESOLVED: { label: TICKET_STATUS_LABELS.RESOLVED, tone: "forest" },
    CLOSED: { label: TICKET_STATUS_LABELS.CLOSED, tone: "neutral" },
  },
  overdue: {
    OVERDUE: { label: "Jatuh Tempo", tone: "vermilion" },
  },
};

export function StatusStamp({
  status,
  kind = "document",
  label,
  className,
}: {
  status: string;
  kind?: StatusKind;
  label?: string;
  className?: string;
}) {
  const entry = STATUS_MAP[kind][status] ?? { label: label ?? status, tone: "neutral" as StampTone };
  return (
    <Stamp tone={entry.tone} className={className}>
      {label ?? entry.label}
    </Stamp>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-12 text-center", className)}>
      <div aria-hidden="true" className="mx-auto mb-5 w-40 space-y-3">
        <div className="h-px bg-rule" />
        <div className="h-px bg-rule" />
        <div className="h-px bg-rule" />
      </div>
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SectionRule({ label, right, className }: { label: string; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <h2 className="font-display text-[22px] font-semibold leading-tight text-ink">{label}</h2>
      <span className="h-px flex-1 bg-rule" aria-hidden="true" />
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function FolioLabel({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
      <span className="text-gold">{index}</span>
      <span>{children}</span>
    </p>
  );
}

export function ActionLink({
  href,
  children,
  variant = "primary",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return (
    <Link href={href} className={buttonStyles({ variant, size })}>
      {children}
    </Link>
  );
}
