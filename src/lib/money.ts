import Decimal from "decimal.js";

export type Moneyish = Decimal | string | number | { toString(): string };

/** Convert any money-ish value (string, number, Prisma.Decimal) into a decimal.js instance. */
export function D(value: Moneyish): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === "number") return new Decimal(value);
  return new Decimal(value.toString());
}

/** Rupiah rounding: HALF_UP to 0 decimals. */
export function roundRp(value: Moneyish): Decimal {
  return D(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
}

export function sum(values: Moneyish[]): Decimal {
  return values.reduce<Decimal>((acc, value) => acc.plus(D(value)), new Decimal(0));
}

export function mul(a: Moneyish, b: Moneyish): Decimal {
  return D(a).times(D(b));
}

export function div(a: Moneyish, b: Moneyish): Decimal {
  return D(a).dividedBy(D(b));
}

/** Percentage of a base, e.g. pct(1000, 11) = 110. */
export function pct(base: Moneyish, percent: Moneyish): Decimal {
  return D(base).times(D(percent)).dividedBy(100);
}

export function toNumber(value: Moneyish | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return D(value).toNumber();
}

export function toStringValue(value: Moneyish | null | undefined): string {
  if (value === null || value === undefined) return "0";
  return D(value).toFixed(2);
}

export interface FormatIdrOptions {
  negative?: "minus" | "parentheses";
  withSymbol?: boolean;
}

const idNumber = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format rupiah for display. Always zero-decimal, Indonesian separators. */
export function formatIDR(value: Moneyish | null | undefined, options: FormatIdrOptions = {}): string {
  const { negative = "minus", withSymbol = true } = options;
  const amount = roundRp(value ?? 0);
  const isNegative = amount.isNegative() && !amount.isZero();
  const body = idNumber.format(amount.abs().toNumber());
  const withPrefix = withSymbol ? `Rp ${body}` : body;
  if (isNegative) {
    return negative === "parentheses" ? `(${withPrefix})` : `-${withPrefix}`;
  }
  return withPrefix;
}

export function formatNumberID(value: Moneyish | null | undefined, decimals = 0): string {
  const amount = D(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount.toNumber());
}

export function formatPercentID(value: Moneyish | null | undefined, decimals = 2): string {
  return `${formatNumberID(value ?? 0, decimals)}%`;
}

export function formatQuantityID(value: Moneyish | null | undefined, decimals = 4): string {
  const amount = D(value ?? 0);
  const fixed = amount.toFixed(decimals);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return formatNumberID(trimmed === "" ? "0" : trimmed, Math.min(decimals, (trimmed.split(".")[1] ?? "").length));
}

/** Divide safely: returns 0 when the denominator is zero. */
export function safeDiv(a: Moneyish, b: Moneyish): Decimal {
  const denominator = D(b);
  if (denominator.isZero()) return new Decimal(0);
  return D(a).dividedBy(denominator);
}

/** Ratio expressed as a percentage, 2 decimals, no trailing zeros. */
export function ratioPercent(a: Moneyish, b: Moneyish, decimals = 2): string {
  return formatPercentID(safeDiv(a, b).times(100), decimals);
}
