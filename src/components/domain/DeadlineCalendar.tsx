import type { DeadlineView } from "@/lib/dto";
import { formatMonthID, parseMonthKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const CATEGORY_DOT: Record<string, string> = {
  TAX: "bg-vermilion",
  INVOICE: "bg-forest",
  PAYMENT: "bg-mustard",
  CLOSING: "bg-sky",
  OTHER: "bg-ink-faint",
};

export function DeadlineCalendar({ month, deadlines }: { month: string; deadlines: DeadlineView[] }) {
  const { year, month: monthNumber } = parseMonthKey(month);
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const startOffset = (firstDay.getUTCDay() + 6) % 7;
  const cells: Array<{ day: number | null; items: DeadlineView[] }> = [];
  for (let index = 0; index < startOffset; index += 1) cells.push({ day: null, items: [] });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, items: deadlines.filter((deadline) => deadline.dueDate === iso) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, items: [] });

  return (
    <div className="paper-sheet overflow-hidden">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <h2 className="font-display text-lg font-semibold text-ink">{formatMonthID(month)}</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{deadlines.length} tenggat</p>
      </div>
      <div className="grid grid-cols-7 border-b border-rule bg-paper-deep">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-1.5 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-ink-soft">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, index) => (
          <div
            key={index}
            className={cn(
              "min-h-[92px] border-b border-r border-rule p-1.5 last:border-r-0",
              cell.day === null && "bg-paper-light/50",
            )}
          >
            {cell.day ? (
              <>
                <p className="font-mono text-[11px] text-ink-soft">{cell.day}</p>
                <ul className="mt-1 space-y-0.5">
                  {cell.items.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-start gap-1">
                      <span
                        aria-hidden="true"
                        className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", CATEGORY_DOT[item.category] ?? "bg-ink-faint")}
                      />
                      <span
                        className={cn(
                          "line-clamp-2 text-[10px] leading-3",
                          item.status === "done" ? "text-ink-faint line-through" : "text-ink",
                        )}
                        title={item.title}
                      >
                        {item.title}
                      </span>
                    </li>
                  ))}
                  {cell.items.length > 3 ? (
                    <li className="font-mono text-[9px] text-ink-faint">+{cell.items.length - 3} lagi</li>
                  ) : null}
                </ul>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
