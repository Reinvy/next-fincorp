import { z } from "zod";
import {
  amountStringSchema,
  idSchema,
  isoDateSchema,
  optionalEmailSchema,
  optionalText,
  quantityStringSchema,
  percentStringSchema,
  requiredText,
} from "@/lib/schemas/common";

export const customerSchema = z.object({
  name: requiredText(120, "Nama pelanggan"),
  npwp: optionalText(30),
  email: optionalEmailSchema,
  phone: optionalText(30),
  address: optionalText(240),
  contactPerson: optionalText(80),
});

export const salesInvoiceItemSchema = z.object({
  description: requiredText(200, "Deskripsi"),
  quantity: quantityStringSchema,
  unitPrice: amountStringSchema,
  discountPercent: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? "0" : value),
    percentStringSchema,
  ),
});

export const salesInvoiceItemsSchema = z.array(salesInvoiceItemSchema).min(1, "Faktur memerlukan minimal satu baris");

export const salesInvoiceSchema = z.object({
  customerId: idSchema("Pelanggan"),
  revenueAccountId: idSchema("Akun pendapatan"),
  date: isoDateSchema,
  dueDate: isoDateSchema,
  ppnRate: percentStringSchema,
  notes: optionalText(240),
  paymentTerms: optionalText(80),
  taxInvoiceNumber: optionalText(40),
  taxInvoiceDate: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    isoDateSchema.nullable(),
  ),
  itemsJson: z.string().trim().min(2, "Baris faktur wajib diisi"),
});

export function parseInvoiceItems(itemsJson: string): z.infer<typeof salesInvoiceItemsSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(itemsJson);
  } catch {
    throw new z.ZodError([
      { code: "custom", message: "Format baris faktur tidak valid.", path: ["itemsJson"], input: itemsJson },
    ]);
  }
  return salesInvoiceItemsSchema.parse(parsed);
}

export const salesPaymentSchema = z.object({
  invoiceId: idSchema("Faktur"),
  bankAccountId: idSchema("Rekening"),
  date: isoDateSchema,
  amount: amountStringSchema,
  reference: optionalText(80),
  note: optionalText(240),
});

export const creditNoteSchema = z.object({
  invoiceId: idSchema("Faktur"),
  date: isoDateSchema,
  reason: requiredText(240, "Alasan"),
  itemsJson: z.string().trim().min(2, "Baris retur wajib diisi"),
});

export const creditNoteItemsSchema = z
  .array(z.object({ invoiceItemId: idSchema("Baris faktur"), quantity: quantityStringSchema }))
  .min(1, "Pilih minimal satu baris untuk diretur");

export function parseCreditNoteItems(itemsJson: string): z.infer<typeof creditNoteItemsSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(itemsJson);
  } catch {
    throw new z.ZodError([
      { code: "custom", message: "Format baris retur tidak valid.", path: ["itemsJson"], input: itemsJson },
    ]);
  }
  return creditNoteItemsSchema.parse(parsed);
}

export const taxInvoiceSchema = z.object({
  invoiceId: idSchema("Faktur"),
  status: z.enum(["NONE", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"]),
  number: optionalText(40),
  date: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? null : value),
    isoDateSchema.nullable(),
  ),
});
