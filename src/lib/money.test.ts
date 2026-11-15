import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  D,
  formatIDR,
  formatNumberID,
  formatPercentID,
  pct,
  ratioPercent,
  roundRp,
  safeDiv,
  sum,
  toNumber,
} from "@/lib/money";

describe("roundRp", () => {
  it("rounds HALF_UP to whole rupiah", () => {
    expect(roundRp("1000.5").toFixed(0)).toBe("1001");
    expect(roundRp("1000.49").toFixed(0)).toBe("1000");
    expect(roundRp("0.5").toFixed(0)).toBe("1");
    expect(roundRp("-1000.5").toFixed(0)).toBe("-1001");
  });

  it("accepts Prisma-style decimal objects", () => {
    const prismaLike = { toString: () => "1234.567" };
    expect(roundRp(prismaLike).toFixed(0)).toBe("1235");
  });
});

describe("sum and pct", () => {
  it("adds decimals without binary drift", () => {
    const total = sum(["0.1", "0.2"]);
    expect(total.toFixed(2)).toBe("0.30");
  });

  it("computes a percentage of a base", () => {
    expect(pct("45000000", "11").toFixed(0)).toBe("4950000");
  });

  it("avoids crashes when dividing by zero", () => {
    expect(safeDiv("10", "0").toNumber()).toBe(0);
    expect(ratioPercent("1", "0")).toBe("0,00%");
  });
});

describe("formatting", () => {
  it("formats rupiah with Indonesian separators", () => {
    expect(formatIDR("1234567890")).toBe("Rp 1.234.567.890");
    expect(formatIDR(0)).toBe("Rp 0");
  });

  it("formats negative values with minus or parentheses", () => {
    expect(formatIDR("-1500000")).toBe("-Rp 1.500.000");
    expect(formatIDR("-1500000", { negative: "parentheses" })).toBe("(Rp 1.500.000)");
    expect(formatIDR("-0")).toBe("Rp 0");
  });

  it("can omit the currency symbol", () => {
    expect(formatIDR("2500000", { withSymbol: false })).toBe("2.500.000");
  });

  it("formats percentages with a comma decimal", () => {
    expect(formatPercentID("11")).toBe("11,00%");
    expect(formatPercentID(new Decimal("2.5"), 1)).toBe("2,5%");
  });

  it("formats plain numbers", () => {
    expect(formatNumberID(1234.5, 2)).toBe("1.234,50");
  });
});

describe("conversions", () => {
  it("converts to number only at the boundary", () => {
    expect(toNumber("1999.99")).toBe(1999.99);
    expect(toNumber(null)).toBe(0);
    expect(D("42").plus(1).toNumber()).toBe(43);
  });
});
