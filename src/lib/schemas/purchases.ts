import { z } from "zod";
import {
  amountStringSchema,
  idSchema,
  isoDateSchema,
  optionalEmailSchema,
  optionalText,
  percentStringSchema,
  quantityStringSchema,
  requiredText,
} from "@/lib/schemas/common";

export const vendorSchema = z.object({
  name: requiredText(120, "Nama vendor"),
  npwp: optionalText(30),
  email: optionalEmailSchema,
  phone: optionalText(30),
  address: optionalText(240),
  contactPerson: optionalText(80),
});

export const purchaseItemSchema = z.object({
  accountId: idSchema("Akun baris"),
  description: requiredText(200, "Deskripsi"),
  quantity: quantityStringSchema,
  unitPrice: amountStringSchema,
  discountPercent: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? "0" : value),
    percentStringSchema,
  ),
});

export const purchaseItemsSchema = z.array(purchaseItemSchema).min(1, "Faktur memerlukan minimal satu baris");

export const purchaseInvoiceSchema = z.object({
  vendorId: idSchema("Vendor"),
  date: isoDateSchema,
  dueDate: isoDateSchema,
  ppnRate: percentStringSchema,
  withholdingType: z.enum(["NONE", "PPH21", "PPH22", "PPH23", "PPH4_2"]),
  withholdingRate: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? "0" : value),
    percentStringSchema,
  ),
  notes: optionalText(240),
  itemsJson: z.string().trim().min(2, "Baris faktur wajib diisi"),
});

export function parsePurchaseItems(itemsJson: string): z.infer<typeof purchaseItemsSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(itemsJson);
  } catch {
    throw new z.ZodError([
      { code: "custom", message: "Format baris faktur tidak valid.", path: ["itemsJson"], input: itemsJson },
    ]);
  }
  return purchaseItemsSchema.parse(parsed);
}

export const purchasePaymentSchema = z.object({
  invoiceId: idSchema("Faktur"),
  bankAccountId: idSchema("Rekening"),
  date: isoDateSchema,
  amount: amountStringSchema,
  reference: optionalText(80),
  note: optionalText(240),
});

export const purchaseDebitNoteSchema = z.object({
  invoiceId: idSchema("Faktur"),
  date: isoDateSchema,
  reason: requiredText(240, "Alasan"),
  itemsJson: z.string().trim().min(2, "Baris retur wajib diisi"),
});

export const purchaseDebitItemsSchema = z
  .array(z.object({ invoiceItemId: idSchema("Baris faktur"), quantity: quantityStringSchema }))
  .min(1, "Pilih minimal satu baris untuk diretur");

export function parsePurchaseDebitItems(itemsJson: string): z.infer<typeof purchaseDebitItemsSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(itemsJson);
  } catch {
    throw new z.ZodError([
      { code: "custom", message: "Format baris retur tidak valid.", path: ["itemsJson"], input: itemsJson },
    ]);
  }
  return purchaseDebitItemsSchema.parse(parsed);
}
