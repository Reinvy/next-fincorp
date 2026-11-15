import { z } from "zod";
import {
  amountStringSchema,
  idSchema,
  isoDateSchema,
  monthPeriodSchema,
  optionalText,
  requiredText,
} from "@/lib/schemas/common";

export const settlePpnSchema = z.object({
  period: monthPeriodSchema,
  bankAccountId: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.string().trim().max(64).nullable(),
  ),
  paymentDate: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    isoDateSchema.nullable(),
  ),
});

export const payTaxSchema = z.object({
  type: z.enum(["PPH21", "PPH22", "PPH23", "PPH4_2", "PPH25", "PPH29"]),
  period: monthPeriodSchema,
  amount: amountStringSchema,
  bankAccountId: idSchema("Rekening"),
  paymentDate: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    isoDateSchema.nullable(),
  ),
  billingId: optionalText(60),
  ntpN: optionalText(40),
});

export const manualDeadlineSchema = z.object({
  title: requiredText(120, "Judul"),
  dueDate: isoDateSchema,
  category: z.enum(["TAX", "INVOICE", "PAYMENT", "CLOSING", "OTHER"]),
  amount: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    amountStringSchema.nullable(),
  ),
  notes: optionalText(240),
});
