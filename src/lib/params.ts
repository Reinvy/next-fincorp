import { dateFromISO, isValidISODate, todayISO } from "@/lib/dates";

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function dateParam(value: string | string[] | undefined, fallback: Date): Date {
  const raw = firstValue(value);
  return raw && isValidISODate(raw) ? dateFromISO(raw) : fallback;
}

export function intParam(value: string | string[] | undefined, fallback: number): number {
  const raw = firstValue(value);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function todayParam(): Date {
  return dateFromISO(todayISO());
}
