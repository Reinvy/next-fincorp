import Decimal from "decimal.js";
import { D, roundRp, sum, type Moneyish } from "@/lib/money";
import type { ReportGroup } from "@/lib/types";

export interface LineAmountInput {
  quantity: string | number;
  unitPrice: string | number;
  discountPercent: string | number;
}

export interface ComputedLine {
  gross: Decimal;
  discount: Decimal;
  amount: Decimal;
}

/** gross = round(qty × price); discount = round(gross × %); amount = gross − discount. */
export function computeLineAmounts(input: LineAmountInput): ComputedLine {
  const gross = roundRp(D(input.quantity).times(D(input.unitPrice)));
  const discount = roundRp(gross.times(D(input.discountPercent)).dividedBy(100));
  return { gross, discount, amount: gross.minus(discount) };
}

export interface InvoiceTotals {
  subtotal: Decimal;
  discountTotal: Decimal;
  dpp: Decimal;
  ppnAmount: Decimal;
  grandTotal: Decimal;
  lines: ComputedLine[];
}

export function computeInvoiceTotals(items: LineAmountInput[], ppnRate: string | number): InvoiceTotals {
  const lines = items.map(computeLineAmounts);
  const subtotal = sum(lines.map((line) => line.gross));
  const discountTotal = sum(lines.map((line) => line.discount));
  const dpp = sum(lines.map((line) => line.amount));
  const ppnAmount = roundRp(dpp.times(D(ppnRate)).dividedBy(100));
  return { subtotal, discountTotal, dpp, ppnAmount, grandTotal: dpp.plus(ppnAmount), lines };
}

/** Pro-rata withholding for a purchase payment; the final payment settles the remainder. */
export function computeWithholding(input: {
  withholdingAmount: Moneyish;
  withheldSoFar: Moneyish;
  paymentAmount: Moneyish;
  settlementTarget: Moneyish;
  finalPayment: boolean;
}): Decimal {
  const withholding = D(input.withholdingAmount);
  const withheld = D(input.withheldSoFar);
  if (input.finalPayment) {
    const remainder = withholding.minus(withheld);
    return remainder.greaterThan(0) ? remainder : D(0);
  }
  const target = D(input.settlementTarget);
  if (!target.greaterThan(0)) return D(0);
  const proportional = roundRp(withholding.times(D(input.paymentAmount)).dividedBy(target));
  const capped = withholding.minus(withheld);
  const result = proportional.greaterThan(capped) ? capped : proportional;
  return result.greaterThan(0) ? result : D(0);
}

export function outstandingAmount(total: Moneyish, paid: Moneyish, credited: Moneyish): Decimal {
  const value = D(total).minus(D(paid)).minus(D(credited));
  return value.greaterThan(0) ? value : D(0);
}

export type CashFlowClass = "OPERATING" | "INVESTING" | "FINANCING";

/** Classify a cash movement by the report groups of its non-cash counterparts. */
export function classifyCashFlow(counterpartGroups: ReportGroup[]): CashFlowClass {
  if (counterpartGroups.some((group) => group === "FIXED_ASSET" || group === "ACCUMULATED_DEPRECIATION")) {
    return "INVESTING";
  }
  if (counterpartGroups.some((group) => group === "EQUITY" || group === "LONG_TERM_LIABILITY")) {
    return "FINANCING";
  }
  return "OPERATING";
}
