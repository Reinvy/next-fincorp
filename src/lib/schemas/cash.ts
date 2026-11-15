import { z } from "zod";
import { idSchema, isoDateSchema, optionalText, requiredText } from "@/lib/schemas/common";
import { amountStringSchema } from "@/lib/schemas/common";

export const bankAccountSchema = z.object({
  name: requiredText(80, "Nama rekening"),
  bankName: optionalText(80),
  accountNumber: optionalText(40),
  type: z.enum(["CASH", "BANK"]),
  openingBalance: amountStringSchema,
  openingDate: isoDateSchema,
  cardTheme: z.enum(["FOREST", "MUSTARD", "SKY", "VERMILION", "INK"]),
  coaAccountId: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.string().trim().max(64).nullable(),
  ),
});

export const cashTransactionSchema = z.object({
  bankAccountId: idSchema("Rekening"),
  counterAccountId: idSchema("Akun lawan"),
  date: isoDateSchema,
  description: requiredText(240, "Keterangan"),
  category: requiredText(80, "Kategori"),
  amount: amountStringSchema,
  direction: z.enum(["IN", "OUT"]),
});

export const transferSchema = z.object({
  fromAccountId: idSchema("Rekening asal"),
  toAccountId: idSchema("Rekening tujuan"),
  date: isoDateSchema,
  amount: amountStringSchema,
  description: requiredText(240, "Keterangan"),
});

export const matchStatementSchema = z.object({
  lineId: idSchema("Baris rekonsiliasi"),
  journalLineId: idSchema("Baris jurnal"),
});
