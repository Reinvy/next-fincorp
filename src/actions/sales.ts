"use server";

import { revalidatePath } from "next/cache";
import { requireActorForAction } from "@/lib/access";
import { withFinancialTx } from "@/lib/prisma";
import { actionError, success } from "@/lib/actions";
import { dateFromISO } from "@/lib/dates";
import {
  creditNoteSchema,
  customerSchema,
  parseCreditNoteItems,
  parseInvoiceItems,
  salesInvoiceSchema,
  salesPaymentSchema,
  taxInvoiceSchema,
} from "@/lib/schemas/sales";
import { idSchema } from "@/lib/schemas/common";
import { createCustomer, setCustomerActive, updateCustomer } from "@/server/sales/customers";
import {
  createSalesInvoice,
  postSalesInvoice,
  updateSalesTaxInvoice,
  voidSalesInvoice,
} from "@/server/sales/invoices";
import { recordSalesPayment, voidSalesPayment } from "@/server/sales/payments";
import { createSalesCreditNote } from "@/server/sales/credit-notes";
import type { ActionState } from "@/lib/types";

function revalidateSales() {
  revalidatePath("/sales");
  revalidatePath("/sales/customers");
  revalidatePath("/sales/credit-notes");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");
  revalidatePath("/accounting/journal");
  revalidatePath("/accounting/ledger");
  revalidatePath("/accounting/trial-balance");
  revalidatePath("/reports");
  revalidatePath("/tax");
  revalidatePath("/tax/efaktur");
}

export async function createCustomerAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const input = customerSchema.parse(Object.fromEntries(formData));
    await withFinancialTx((tx) => createCustomer(tx, actor, input));
    revalidateSales();
    return success(`Pelanggan ${input.name} berhasil ditambahkan.`);
  } catch (error) {
    return actionError(error, "Gagal menambah pelanggan.");
  }
}

export async function updateCustomerAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const customerId = idSchema("Pelanggan").parse(formData.get("customerId"));
    const input = customerSchema.parse(Object.fromEntries(formData));
    await withFinancialTx((tx) => updateCustomer(tx, actor, customerId, input));
    revalidateSales();
    return success("Pelanggan berhasil diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal memperbarui pelanggan.");
  }
}

export async function setCustomerActiveAction(customerId: string, isActive: boolean): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await withFinancialTx((tx) => setCustomerActive(tx, actor, customerId, isActive));
    revalidateSales();
    return success(isActive ? "Pelanggan diaktifkan." : "Pelanggan dinonaktifkan.");
  } catch (error) {
    return actionError(error, "Gagal mengubah status pelanggan.");
  }
}

export async function saveSalesInvoiceAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = salesInvoiceSchema.parse(Object.fromEntries(formData));
    const items = parseInvoiceItems(parsed.itemsJson);
    const mode = formData.get("mode") === "draft" ? "draft" : "post";
    const invoice = await createSalesInvoice(
      actor,
      {
        customerId: parsed.customerId,
        revenueAccountId: parsed.revenueAccountId,
        date: dateFromISO(parsed.date),
        dueDate: dateFromISO(parsed.dueDate),
        ppnRate: parsed.ppnRate,
        items,
        notes: parsed.notes,
        paymentTerms: parsed.paymentTerms,
        taxInvoiceNumber: parsed.taxInvoiceNumber,
        taxInvoiceDate: parsed.taxInvoiceDate ? dateFromISO(parsed.taxInvoiceDate) : null,
      },
      mode,
    );
    revalidateSales();
    return success(
      mode === "draft" ? `Draf faktur ${invoice.number} disimpan.` : `Faktur ${invoice.number} terposting.`,
      `/sales/${invoice.id}`,
    );
  } catch (error) {
    return actionError(error, "Gagal menyimpan faktur penjualan.");
  }
}

export async function postSalesInvoiceAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const invoiceId = idSchema("Faktur").parse(formData.get("invoiceId"));
    await postSalesInvoice(actor, invoiceId);
    revalidateSales();
    revalidatePath(`/sales/${invoiceId}`);
    return success("Faktur berhasil diposting.");
  } catch (error) {
    return actionError(error, "Gagal memposting faktur.");
  }
}

export async function voidSalesInvoiceAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const invoiceId = idSchema("Faktur").parse(formData.get("invoiceId"));
    await voidSalesInvoice(actor, invoiceId);
    revalidateSales();
    revalidatePath(`/sales/${invoiceId}`);
    return success("Faktur dibatalkan.");
  } catch (error) {
    return actionError(error, "Gagal membatalkan faktur.");
  }
}

export async function recordSalesPaymentAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = salesPaymentSchema.parse(Object.fromEntries(formData));
    const payment = await recordSalesPayment(actor, {
      invoiceId: parsed.invoiceId,
      bankAccountId: parsed.bankAccountId,
      date: dateFromISO(parsed.date),
      amount: parsed.amount,
      reference: parsed.reference,
      note: parsed.note,
    });
    revalidateSales();
    revalidatePath(`/sales/${parsed.invoiceId}`);
    return success(`Pembayaran tercatat pada jurnal ${payment.number}.`);
  } catch (error) {
    return actionError(error, "Gagal mencatat pembayaran.");
  }
}

export async function voidSalesPaymentAction(paymentId: string): Promise<ActionState> {
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    await voidSalesPayment(actor, paymentId);
    revalidateSales();
    return success("Pembayaran dibatalkan dan jurnal pembalik dibuat.");
  } catch (error) {
    return actionError(error, "Gagal membatalkan pembayaran.");
  }
}

export async function createCreditNoteAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = creditNoteSchema.parse(Object.fromEntries(formData));
    const items = parseCreditNoteItems(parsed.itemsJson);
    const note = await createSalesCreditNote(actor, {
      invoiceId: parsed.invoiceId,
      date: dateFromISO(parsed.date),
      reason: parsed.reason,
      items,
    });
    revalidateSales();
    revalidatePath(`/sales/${parsed.invoiceId}`);
    return success(`Nota kredit ${note.number} dibuat sebesar Rp ${note.total.toLocaleString("id-ID")}.`);
  } catch (error) {
    return actionError(error, "Gagal membuat nota kredit.");
  }
}

export async function updateTaxInvoiceAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  void prevState;
  try {
    const actor = await requireActorForAction(["ADMIN", "ACCOUNTANT"]);
    const parsed = taxInvoiceSchema.parse(Object.fromEntries(formData));
    await updateSalesTaxInvoice(actor, {
      invoiceId: parsed.invoiceId,
      status: parsed.status,
      number: parsed.number,
      date: parsed.date ? dateFromISO(parsed.date) : null,
    });
    revalidateSales();
    revalidatePath(`/sales/${parsed.invoiceId}`);
    return success("Status faktur pajak diperbarui.");
  } catch (error) {
    return actionError(error, "Gagal memperbarui faktur pajak.");
  }
}
