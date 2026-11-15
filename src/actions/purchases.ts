"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { withFinancialTx } from "@/lib/prisma";
import { actionError, success } from "@/lib/actions";
import { dateFromISO } from "@/lib/dates";
import { idSchema } from "@/lib/schemas/common";
import {
  parsePurchaseDebitItems,
  parsePurchaseItems,
  purchaseDebitNoteSchema,
  purchaseInvoiceSchema,
  purchasePaymentSchema,
  vendorSchema,
} from "@/lib/schemas/purchases";
import { createVendor, setVendorActive, updateVendor } from "@/server/purchases/vendors";
import {
  createPurchaseInvoice,
  postPurchaseInvoice,
  voidPurchaseInvoice,
} from "@/server/purchases/invoices";
import { recordPurchasePayment, voidPurchasePayment } from "@/server/purchases/payments";
import { createPurchaseDebitNote } from "@/server/purchases/debit-notes";
import type { ActionState } from "@/lib/types";

function revalidatePurchases() {
  revalidatePath("/purchases");
  revalidatePath("/purchases/vendors");
  revalidatePath("/purchases/debit-notes");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
  revalidatePath("/accounting/ledger");
  revalidatePath("/accounting/trial-balance");
  revalidatePath("/tax");
}

export async function createVendorAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const input = vendorSchema.parse(Object.fromEntries(formData));
    await withFinancialTx((tx) => createVendor(tx, actor, input));
    revalidatePurchases();
    return success(`Vendor ${input.name} berhasil ditambahkan.`);
  } catch (error) {
    return actionError(error, "Gagal menambah vendor.");
  }
}

export async function updateVendorAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const vendorId = idSchema("Vendor").parse(formData.get("vendorId"));
    const input = vendorSchema.parse(Object.fromEntries(formData));
    await withFinancialTx((tx) => updateVendor(tx, actor, vendorId, input));
    revalidatePurchases();
    return success("Vendor berhasil diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal memperbarui vendor.");
  }
}

export async function setVendorActiveAction(vendorId: string, isActive: boolean): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await withFinancialTx((tx) => setVendorActive(tx, actor, vendorId, isActive));
    revalidatePurchases();
    return success(isActive ? "Vendor diaktifkan." : "Vendor dinonaktifkan.");
  } catch (error) {
    return actionError(error, "Gagal mengubah status vendor.");
  }
}

export async function savePurchaseInvoiceAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = purchaseInvoiceSchema.parse(Object.fromEntries(formData));
    const items = parsePurchaseItems(parsed.itemsJson);
    const mode = formData.get("mode") === "draft" ? "draft" : "post";
    const invoice = await createPurchaseInvoice(
      actor,
      {
        vendorId: parsed.vendorId,
        date: dateFromISO(parsed.date),
        dueDate: dateFromISO(parsed.dueDate),
        ppnRate: parsed.ppnRate,
        withholdingType: parsed.withholdingType,
        withholdingRate: parsed.withholdingRate,
        notes: parsed.notes,
        items,
      },
      mode,
    );
    revalidatePurchases();
    return success(
      mode === "draft" ? `Draf pembelian ${invoice.number} disimpan.` : `Faktur pembelian ${invoice.number} terposting.`,
      `/purchases/${invoice.id}`,
    );
  } catch (error) {
    return actionError(error, "Gagal menyimpan faktur pembelian.");
  }
}

export async function postPurchaseInvoiceAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const invoiceId = idSchema("Faktur").parse(formData.get("invoiceId"));
    await postPurchaseInvoice(actor, invoiceId);
    revalidatePurchases();
    revalidatePath(`/purchases/${invoiceId}`);
    return success("Faktur pembelian berhasil diposting.");
  } catch (error) {
    return actionError(error, "Gagal memposting faktur pembelian.");
  }
}

export async function voidPurchaseInvoiceAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const invoiceId = idSchema("Faktur").parse(formData.get("invoiceId"));
    await voidPurchaseInvoice(actor, invoiceId);
    revalidatePurchases();
    revalidatePath(`/purchases/${invoiceId}`);
    return success("Faktur pembelian dibatalkan.");
  } catch (error) {
    return actionError(error, "Gagal membatalkan faktur pembelian.");
  }
}

export async function recordPurchasePaymentAction(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = purchasePaymentSchema.parse(Object.fromEntries(formData));
    const payment = await recordPurchasePayment(actor, {
      invoiceId: parsed.invoiceId,
      bankAccountId: parsed.bankAccountId,
      date: dateFromISO(parsed.date),
      amount: parsed.amount,
      reference: parsed.reference,
      note: parsed.note,
    });
    revalidatePurchases();
    revalidatePath(`/purchases/${parsed.invoiceId}`);
    return success(
      `Pembayaran tercatat (${payment.number}), potongan pajak Rp ${payment.withheld.toLocaleString("id-ID")}.`,
    );
  } catch (error) {
    return actionError(error, "Gagal mencatat pembayaran pembelian.");
  }
}

export async function voidPurchasePaymentAction(paymentId: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await voidPurchasePayment(actor, paymentId);
    revalidatePurchases();
    return success("Pembayaran dibatalkan dan jurnal pembalik dibuat.");
  } catch (error) {
    return actionError(error, "Gagal membatalkan pembayaran.");
  }
}

export async function createDebitNoteAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = purchaseDebitNoteSchema.parse(Object.fromEntries(formData));
    const items = parsePurchaseDebitItems(parsed.itemsJson);
    const note = await createPurchaseDebitNote(actor, {
      invoiceId: parsed.invoiceId,
      date: dateFromISO(parsed.date),
      reason: parsed.reason,
      items,
    });
    revalidatePurchases();
    revalidatePath(`/purchases/${parsed.invoiceId}`);
    return success(`Nota debit ${note.number} dibuat sebesar Rp ${note.total.toLocaleString("id-ID")}.`);
  } catch (error) {
    return actionError(error, "Gagal membuat nota debit.");
  }
}
