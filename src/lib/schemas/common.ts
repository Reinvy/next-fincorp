import { z } from "zod";
import { isValidISODate } from "@/lib/dates";

export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => isValidISODate(value), "Tanggal harus berformat YYYY-MM-DD");

export const monthPeriodSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periode harus berformat YYYY-MM");

/** Money input stays a digit string until the service parses it with Decimal. */
export const amountStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Jumlah harus berupa angka bulat tanpa pemisah")
  .max(16, "Jumlah terlalu besar");

export const quantityStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,4})?$/, "Kuantitas maksimal 4 desimal")
  .max(20, "Kuantitas terlalu besar");

export const percentStringSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Persentase maksimal 2 desimal")
  .refine((value) => Number(value) >= 0 && Number(value) <= 100, "Persentase harus 0 sampai 100");

export const optionalPercentStringSchema = z
  .string()
  .trim()
  .optional()
  .default("0")
  .pipe(percentStringSchema);

export function optionalText(max: number, message = "Teks terlalu panjang") {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max, message).optional(),
  );
}

export function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .max(max, `${label} maksimal ${max} karakter`);
}

export const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email("Format email tidak valid").max(160).optional(),
);

export function checkboxSchema() {
  return z.preprocess((value) => value === true || value === "true" || value === "on", z.boolean());
}

export function idSchema(label = "ID") {
  return z.string().trim().min(1, `${label} wajib diisi`).max(64);
}

export function parsePagination(searchParams: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const page = Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
  return page;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function formBoolean(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on" || value === "1";
}

export function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
