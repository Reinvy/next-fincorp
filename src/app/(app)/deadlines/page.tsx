import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { getDeadlines } from "@/server/accounting/deadlines";
import { formatMonthID, parseMonthKey, todayISO } from "@/lib/dates";
import { formatIDR } from "@/lib/money";
import { DEADLINE_CATEGORY_LABELS } from "@/lib/constants";
import { firstValue } from "@/lib/params";
import { buttonStyles } from "@/components/ui/button";
import { KpiCard, PageHeader, PaperCard, SectionRule, StatusStamp } from "@/components/ui/paper";
import { DeadlineCalendar } from "@/components/domain/DeadlineCalendar";
import { ConfirmDeleteDeadlineButton, ManualDeadlineDialog } from "@/components/forms/DeadlineDialogs";
import { DeadlineCompleteButton } from "@/components/forms/TaxDialogs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tenggat Waktu" };

const STATUS_LABEL: Record<string, string> = {
  done: "Selesai",
  overdue: "Terlambat",
  soon: "Segera",
  upcoming: "Akan datang",
};

function shiftMonth(month: string, delta: number): string {
  const { year, month: number } = parseMonthKey(month);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { actor, activeCompany } = await requireActorPage();
  const raw = firstValue(params.month);
  const month = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : todayISO().slice(0, 7);
  const deadlines = await getDeadlines(actor, month);
  const canEdit = actor.role !== "VIEWER";
  const today = todayISO();
  const defaultDate = month === today.slice(0, 7) ? today : `${month}-01`;
  const overdue = deadlines.filter((deadline) => deadline.status === "overdue");
  const soon = deadlines.filter((deadline) => deadline.status === "soon");

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Tenggat Waktu"
        description="Jatuh tempo faktur, setoran pajak, dan pengingat tutup buku. Tenggat manual tidak membuat jurnal."
        actions={
          canEdit ? <ManualDeadlineDialog defaultDate={defaultDate} triggerLabel="Tenggat manual" variant="primary" /> : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total tenggat" value={String(deadlines.length)} note={formatMonthID(month)} index="01" />
        <KpiCard label="Terlambat" value={String(overdue.length)} note="Perlu tindakan" index="02" tone="vermilion" />
        <KpiCard label="≤ 7 hari" value={String(soon.length)} note="Segera jatuh tempo" index="03" tone="mustard" />
        <KpiCard
          label="Selesai"
          value={String(deadlines.filter((deadline) => deadline.status === "done").length)}
          note="Periode ini"
          index="04"
          tone="forest"
        />
      </div>

      <div className="mb-4 mt-6 flex items-center gap-2">
        <Link href={`/deadlines?month=${shiftMonth(month, -1)}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>←</Link>
        <span className="font-display text-lg font-semibold text-ink">{formatMonthID(month)}</span>
        <Link href={`/deadlines?month=${shiftMonth(month, 1)}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>→</Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <DeadlineCalendar month={month} deadlines={deadlines} />

        <PaperCard className="p-4">
          <SectionRule label="Agenda" />
          {deadlines.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Tidak ada tenggat pada bulan ini.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {deadlines.map((deadline) => (
                <li key={deadline.id} className="rounded-[2px] border border-rule bg-card px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                        {deadline.dueDate} · {DEADLINE_CATEGORY_LABELS[deadline.category] ?? deadline.category}
                      </p>
                      <p className={`text-[13px] ${deadline.status === "done" ? "text-ink-faint line-through" : "text-ink"}`}>
                        {deadline.href ? (
                          <Link href={deadline.href} className="hover:underline hover:underline-offset-4">
                            {deadline.title}
                          </Link>
                        ) : (
                          deadline.title
                        )}
                      </p>
                      {deadline.amount ? <p className="money mt-0.5 text-xs">{formatIDR(deadline.amount)}</p> : null}
                      {deadline.notes ? <p className="mt-0.5 text-[11px] text-ink-faint">{deadline.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusStamp kind="period" status={deadline.status === "done" ? "OPEN" : "CLOSED"} label={STATUS_LABEL[deadline.status]} />
                    </div>
                  </div>
                  {!deadline.derived && canEdit ? (
                    <div className="mt-1 flex flex-wrap items-center justify-end gap-1 border-t border-rule pt-1">
                      <ManualDeadlineDialog initial={deadline} defaultDate={defaultDate} triggerLabel="Ubah" variant="ghost" />
                      <DeadlineCompleteButton deadline={deadline} />
                      <ConfirmDeleteDeadlineButton deadlineId={deadline.id} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PaperCard>
      </div>
    </>
  );
}
