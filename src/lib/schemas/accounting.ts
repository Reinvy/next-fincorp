import { z } from "zod";
import {
  amountStringSchema,
  idSchema,
  isoDateSchema,
  optionalText,
  requiredText,
} from "@/lib/schemas/common";

const accountTypeSchema = z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]);
const reportGroupSchema = z.enum([
  "CURRENT_ASSET",
  "FIXED_ASSET",
  "ACCUMULATED_DEPRECIATION",
  "OTHER_ASSET",
  "CURRENT_LIABILITY",
  "LONG_TERM_LIABILITY",
  "EQUITY",
  "REVENUE",
  "CONTRA_REVENUE",
  "COST_OF_GOODS_SOLD",
  "CONTRA_COGS",
  "OPERATING_EXPENSE",
  "OTHER_INCOME",
  "OTHER_EXPENSE",
  "TAX_EXPENSE",
]);
const systemRoleSchema = z.enum([
  "NONE",
  "CASH",
  "BANK",
  "ACCOUNTS_RECEIVABLE",
  "VAT_INPUT",
  "INVENTORY",
  "FIXED_ASSET",
  "ACCUMULATED_DEPRECIATION",
  "ACCOUNTS_PAYABLE",
  "VAT_OUTPUT",
  "VAT_PAYABLE",
  "VAT_RECEIVABLE",
  "WITHHOLDING_PAYABLE",
  "TAX_PAYABLE",
  "SALES_REVENUE",
  "SALES_RETURN",
  "PURCHASE_RETURN",
  "OTHER_INCOME",
  "OTHER_EXPENSE",
  "COST_OF_GOODS_SOLD",
  "DEPRECIATION_EXPENSE",
  "BANK_FEE",
  "LOSS_ON_DISPOSAL",
  "GAIN_ON_DISPOSAL",
  "RETAINED_EARNINGS",
  "OPENING_BALANCE",
  "EQUITY",
]);

export const accountFormSchema = z.object({
  code: requiredText(20, "Kode akun"),
  name: requiredText(120, "Nama akun"),
  description: optionalText(240),
  type: accountTypeSchema,
  reportGroup: reportGroupSchema,
  systemRole: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? "NONE" : value),
    systemRoleSchema,
  ),
  parentId: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.string().trim().max(64).nullable(),
  ),
});

export const journalLineSchema = z.object({
  accountId: idSchema("Akun"),
  description: optionalText(200),
  debit: z.preprocess((value) => (value === "" || value === undefined ? "0" : value), amountStringSchema),
  credit: z.preprocess((value) => (value === "" || value === undefined ? "0" : value), amountStringSchema),
});

export const journalLinesSchema = z.array(journalLineSchema).min(2, "Jurnal memerlukan minimal dua baris");

export const journalFormSchema = z.object({
  date: isoDateSchema,
  description: requiredText(240, "Keterangan"),
  reference: optionalText(80),
  linesJson: z.string().trim().min(2, "Baris jurnal wajib diisi"),
});

export function parseJournalLines(linesJson: string): z.infer<typeof journalLinesSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(linesJson);
  } catch {
    throw new z.ZodError([
      { code: "custom", message: "Format baris jurnal tidak valid.", path: ["linesJson"], input: linesJson },
    ]);
  }
  return journalLinesSchema.parse(parsed);
}

export const periodFormSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  note: optionalText(240),
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;
export type JournalFormInput = z.infer<typeof journalFormSchema>;
