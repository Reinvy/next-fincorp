/**
 * Date-only helpers. Accounting dates are stored as UTC midnight (`@db.Date`) and
 * every conversion goes through UTC components so the server timezone never leaks.
 * "Today" is computed in Asia/Jakarta.
 */
export const APP_TIME_ZONE = "Asia/Jakarta";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function isValidISODate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const date = dateFromISO(iso);
  return isoFromDate(date) === iso;
}

/** Today as `YYYY-MM-DD` in Asia/Jakarta. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Parse `YYYY-MM-DD` as UTC midnight. Throws on malformed input. */
export function dateFromISO(iso: string): Date {
  if (!ISO_DATE.test(iso)) throw new Error(`Tanggal tidak valid: ${iso}`);
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal tidak valid: ${iso}`);
  }
  return date;
}

export function isoFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function todayDate(): Date {
  return dateFromISO(todayISO());
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_ID_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "12 Jan 2026" */
export function formatDateID(value: Date | string): string {
  const date = typeof value === "string" ? dateFromISO(value.slice(0, 10)) : value;
  return `${date.getUTCDate()} ${MONTHS_ID_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "12 Januari 2026" */
export function formatDateLongID(value: Date | string): string {
  const date = typeof value === "string" ? dateFromISO(value.slice(0, 10)) : value;
  return `${date.getUTCDate()} ${MONTHS_ID[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatDateTimeID(value: Date): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
  return `${formatted} WIB`;
}

/** "Januari 2026" from `YYYY-MM` or a date. */
export function formatMonthID(value: string | Date): string {
  const key = typeof value === "string" ? value : monthKey(value);
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_ID[month - 1]} ${year}`;
}

export function formatMonthShortID(key: string): string {
  const [, month] = key.split("-").map(Number);
  return MONTHS_ID_SHORT[month - 1];
}

/** `YYYY-MM` from a UTC date. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function parseMonthKey(period: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new Error(`Periode tidak valid: ${period}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Periode tidak valid: ${period}`);
  return { year, month };
}

/** First and last day (UTC) of a `YYYY-MM` period. */
export function monthBounds(period: string): { start: Date; end: Date } {
  const { year, month } = parseMonthKey(period);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

export function lastDayOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0));
}

export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(year, month + months, 1));
  const last = lastDayOfMonth(target.getUTCFullYear(), target.getUTCMonth() + 1).getUTCDate();
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, last)));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Whole days from `from` to `to` (to - from). */
export function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Inclusive start/end bounds of the fiscal year containing `asOf`. */
export function fiscalYearBounds(
  asOf: Date,
  startMonth = 1,
  startDay = 1,
): { start: Date; end: Date } {
  const year = asOf.getUTCFullYear();
  const startThisYear = new Date(Date.UTC(year, startMonth - 1, startDay));
  const start = asOf.getTime() >= startThisYear.getTime() ? startThisYear : new Date(Date.UTC(year - 1, startMonth - 1, startDay));
  const end = new Date(Date.UTC(start.getUTCFullYear() + 1, startMonth - 1, startDay - 1));
  return { start, end };
}

export type TaxDueKind = "PPN" | "PPH21" | "PPH22" | "PPH23" | "PPH4_2" | "PPH25" | "PPH29";

/** Statutory due date for a `YYYY-MM` tax period (date-only, UTC). */
export function taxDueDate(type: TaxDueKind, period: string): Date {
  const { year, month } = parseMonthKey(period);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  switch (type) {
    case "PPH21":
    case "PPH22":
    case "PPH23":
    case "PPH4_2":
      return new Date(Date.UTC(nextYear, nextMonth - 1, 10));
    case "PPH25":
      return new Date(Date.UTC(nextYear, nextMonth - 1, 15));
    case "PPN":
    case "PPH29":
    default:
      return lastDayOfMonth(nextYear, nextMonth);
  }
}

/** Human friendly relative label for a due date. */
export function dueLabel(dueDate: Date, today: Date = todayDate()): string {
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return `Terlambat ${Math.abs(diff)} hari`;
  if (diff === 0) return "Jatuh tempo hari ini";
  if (diff <= 7) return `${diff} hari lagi`;
  return formatDateID(dueDate);
}
