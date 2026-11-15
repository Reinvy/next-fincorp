import { describe, expect, it } from "vitest";
import { monthlyDepreciationAmount } from "@/server/assets/depreciation";

const baseAsset = {
  purchaseDate: new Date(Date.UTC(2026, 0, 5)),
  purchasePrice: "12000000",
  residualValue: "0",
  usefulLifeMonths: 12,
  method: "STRAIGHT_LINE" as const,
  annualRate: null,
  accumulatedDepreciation: "0",
};

describe("straight-line depreciation", () => {
  it("uses the monthly amount before the final month", () => {
    const result = monthlyDepreciationAmount(baseAsset, new Date(Date.UTC(2026, 5, 30)));
    expect(result.amount.toNumber()).toBe(1000000);
  });

  it("caps the final month at the remaining depreciable value", () => {
    const result = monthlyDepreciationAmount(
      { ...baseAsset, accumulatedDepreciation: "11000000" },
      new Date(Date.UTC(2026, 11, 31)),
    );
    expect(result.amount.toNumber()).toBe(1000000);
  });

  it("never depreciates below residual value", () => {
    const result = monthlyDepreciationAmount(
      { ...baseAsset, residualValue: "2000000", accumulatedDepreciation: "10000000" },
      new Date(Date.UTC(2026, 11, 31)),
    );
    expect(result.amount.toNumber()).toBe(0);
  });
});

describe("declining-balance depreciation", () => {
  it("uses the book value each month", () => {
    const asset = {
      ...baseAsset,
      usefulLifeMonths: 36,
      method: "DECLINING_BALANCE" as const,
      annualRate: "66.67",
      purchasePrice: "36000000",
    };
    const first = monthlyDepreciationAmount(asset, new Date(Date.UTC(2026, 5, 30)));
    const second = monthlyDepreciationAmount(
      { ...asset, accumulatedDepreciation: first.amount.toFixed(2) },
      new Date(Date.UTC(2026, 6, 31)),
    );
    expect(first.amount.toNumber()).toBe(2000100);
    expect(second.amount.toNumber()).toBeLessThan(first.amount.toNumber());
  });
});
