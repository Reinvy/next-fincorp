import { describe, expect, it } from "vitest";
import {
  classifyCashFlow,
  computeInvoiceTotals,
  computeLineAmounts,
  computeWithholding,
  outstandingAmount,
} from "@/server/accounting/calc";

describe("line and invoice math", () => {
  it("rounds gross and discount per line", () => {
    const line = computeLineAmounts({ quantity: "3", unitPrice: "1234.5", discountPercent: "5" });
    expect(line.gross.toFixed(0)).toBe("3704");
    expect(line.discount.toFixed(0)).toBe("185");
    expect(line.amount.toFixed(0)).toBe("3519");
  });

  it("computes DPP, PPN and grand total", () => {
    const totals = computeInvoiceTotals(
      [
        { quantity: "1", unitPrice: "10000000", discountPercent: "5" },
        { quantity: "2", unitPrice: "1000000", discountPercent: "0" },
      ],
      "11",
    );
    expect(totals.subtotal.toFixed(0)).toBe("12000000");
    expect(totals.discountTotal.toFixed(0)).toBe("500000");
    expect(totals.dpp.toFixed(0)).toBe("11500000");
    expect(totals.ppnAmount.toFixed(0)).toBe("1265000");
    expect(totals.grandTotal.toFixed(0)).toBe("12765000");
  });

  it("floors outstanding at zero", () => {
    expect(outstandingAmount("100", "80", "30").toNumber()).toBe(0);
    expect(outstandingAmount("100", "40", "10").toNumber()).toBe(50);
  });
});

describe("withholding", () => {
  it("withholds proportionally and settles the remainder on the final payment", () => {
    const partial = computeWithholding({
      withholdingAmount: "200000",
      withheldSoFar: "0",
      paymentAmount: "5000000",
      settlementTarget: "10000000",
      finalPayment: false,
    });
    expect(partial.toNumber()).toBe(100000);

    const final = computeWithholding({
      withholdingAmount: "200000",
      withheldSoFar: "100000",
      paymentAmount: "5000000",
      settlementTarget: "10000000",
      finalPayment: true,
    });
    expect(final.toNumber()).toBe(100000);
  });

  it("never withholds more than remaining liability", () => {
    const result = computeWithholding({
      withholdingAmount: "200000",
      withheldSoFar: "150000",
      paymentAmount: "10000000",
      settlementTarget: "10000000",
      finalPayment: false,
    });
    expect(result.toNumber()).toBe(50000);
  });
});

describe("cash flow classification", () => {
  it("classifies asset, equity and operating counterparts", () => {
    expect(classifyCashFlow(["FIXED_ASSET"])).toBe("INVESTING");
    expect(classifyCashFlow(["ACCUMULATED_DEPRECIATION"])).toBe("INVESTING");
    expect(classifyCashFlow(["EQUITY"])).toBe("FINANCING");
    expect(classifyCashFlow(["LONG_TERM_LIABILITY"])).toBe("FINANCING");
    expect(classifyCashFlow(["REVENUE"])).toBe("OPERATING");
    expect(classifyCashFlow(["CURRENT_ASSET", "FIXED_ASSET"])).toBe("INVESTING");
  });
});
