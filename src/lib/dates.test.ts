import { describe, expect, it } from "vitest";
import {
  addMonths,
  dateFromISO,
  daysBetween,
  fiscalYearBounds,
  formatDateID,
  formatMonthID,
  isoFromDate,
  lastDayOfMonth,
  monthBounds,
  monthKey,
  taxDueDate,
  todayISO,
} from "@/lib/dates";

describe("ISO date conversion", () => {
  it("round-trips date-only strings without timezone drift", () => {
    expect(isoFromDate(dateFromISO("2026-11-15"))).toBe("2026-11-15");
    expect(dateFromISO("2026-01-01").getTime()).toBe(Date.UTC(2026, 0, 1));
  });

  it("rejects impossible dates", () => {
    expect(() => dateFromISO("2026-02-30")).toThrow();
    expect(() => dateFromISO("15-11-2026")).toThrow();
    expect(() => dateFromISO("2026-13-01")).toThrow();
  });

  it("formats Indonesian dates", () => {
    expect(formatDateID("2026-11-05")).toBe("5 Nov 2026");
    expect(formatMonthID("2026-07")).toBe("Juli 2026");
    expect(formatMonthID(monthKey(dateFromISO("2026-12-31")))).toBe("Desember 2026");
  });
});

describe("todayISO", () => {
  it("uses Asia/Jakarta, not UTC", () => {
    expect(todayISO(new Date("2026-11-14T17:30:00Z"))).toBe("2026-11-15");
    expect(todayISO(new Date("2026-11-15T16:59:00Z"))).toBe("2026-11-15");
    expect(todayISO(new Date("2026-11-15T17:01:00Z"))).toBe("2026-11-16");
  });
});

describe("month and fiscal bounds", () => {
  it("returns first and last day of a period", () => {
    const { start, end } = monthBounds("2026-02");
    expect(isoFromDate(start)).toBe("2026-02-01");
    expect(isoFromDate(end)).toBe("2026-02-28");
    expect(isoFromDate(lastDayOfMonth(2024, 2))).toBe("2024-02-29");
  });

  it("clamps month arithmetic at month end", () => {
    expect(isoFromDate(addMonths(dateFromISO("2026-01-31"), 1))).toBe("2026-02-28");
    expect(isoFromDate(addMonths(dateFromISO("2026-12-15"), 1))).toBe("2027-01-15");
  });

  it("computes whole-day differences", () => {
    expect(daysBetween(dateFromISO("2026-11-01"), dateFromISO("2026-11-15"))).toBe(14);
    expect(daysBetween(dateFromISO("2026-11-15"), dateFromISO("2026-11-01"))).toBe(-14);
  });

  it("computes the fiscal year around any date", () => {
    const calendar = fiscalYearBounds(dateFromISO("2026-11-15"), 1, 1);
    expect(isoFromDate(calendar.start)).toBe("2026-01-01");
    expect(isoFromDate(calendar.end)).toBe("2026-12-31");

    const april = fiscalYearBounds(dateFromISO("2026-03-31"), 4, 1);
    expect(isoFromDate(april.start)).toBe("2025-04-01");
    expect(isoFromDate(april.end)).toBe("2026-03-31");

    const aprilAfter = fiscalYearBounds(dateFromISO("2026-04-01"), 4, 1);
    expect(isoFromDate(aprilAfter.start)).toBe("2026-04-01");
    expect(isoFromDate(aprilAfter.end)).toBe("2027-03-31");
  });
});

describe("tax due dates", () => {
  it("uses the 10th for monthly withholding taxes", () => {
    expect(isoFromDate(taxDueDate("PPH23", "2026-02"))).toBe("2026-03-10");
    expect(isoFromDate(taxDueDate("PPH4_2", "2026-12"))).toBe("2027-01-10");
  });

  it("uses month end for PPN", () => {
    expect(isoFromDate(taxDueDate("PPN", "2026-01"))).toBe("2026-02-28");
    expect(isoFromDate(taxDueDate("PPN", "2026-12"))).toBe("2027-01-31");
  });

  it("uses the 15th for PPh 25", () => {
    expect(isoFromDate(taxDueDate("PPH25", "2026-06"))).toBe("2026-07-15");
  });
});
