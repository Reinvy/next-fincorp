import { z } from "zod";
import {
  amountStringSchema,
  idSchema,
  isoDateSchema,
  monthPeriodSchema,
  optionalText,
  percentStringSchema,
  requiredText,
} from "@/lib/schemas/common";

export const assetSchema = z.object({
  code: optionalText(30),
  name: requiredText(120, "Nama aset"),
  category: requiredText(80, "Kategori"),
  purchaseDate: isoDateSchema,
  purchasePrice: amountStringSchema,
  residualValue: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? "0" : value),
    amountStringSchema,
  ),
  usefulLifeMonths: z.coerce.number().int().min(1, "Umur manfaat minimal 1 bulan").max(600, "Umur manfaat maksimal 600 bulan"),
  method: z.enum(["STRAIGHT_LINE", "DECLINING_BALANCE"]),
  annualRate: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    percentStringSchema.nullable(),
  ),
  assetAccountId: idSchema("Akun aset"),
  accumulatedAccountId: idSchema("Akun akumulasi"),
  depreciationExpenseAccountId: idSchema("Akun beban penyusutan"),
  fundingType: z.enum(["CASH", "BANK"]),
  fundingAccountId: idSchema("Rekening pendanaan"),
  location: optionalText(120),
  responsible: optionalText(120),
});

export const depreciationRunSchema = z.object({
  period: monthPeriodSchema,
});

export const disposeAssetSchema = z.object({
  assetId: idSchema("Aset"),
  date: isoDateSchema,
  proceeds: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? "0" : value),
    amountStringSchema,
  ),
  bankAccountId: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    z.string().trim().max(64).nullable(),
  ),
  note: optionalText(240),
});
