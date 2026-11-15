import { randomUUID } from "node:crypto";
import { withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D, type Moneyish } from "@/lib/money";
import type { Actor, DocumentStatus } from "@/lib/types";
import { outstandingAmount } from "@/server/accounting/calc";
import { postJournal, reverseDocumentJournal } from "@/server/accounting/posting";
import { getAccountByCode } from "@/server/accounting/accounts";

export interface SalesPaymentInput {
  invoiceId: string;
  bankAccountId: string;
  date: Date;
  amount: string;
  reference?: string | null;
  note?: string | null;
}

function invoiceStatus(paid: Moneyish, credited: Moneyish, grand: Moneyish): DocumentStatus {
  const settled = D(paid).plus(D(credited));
  if (settled.greaterThanOrEqualTo(D(grand))) return "PAID";
  if (D(paid).isZero() && D(credited).isZero()) return "UNPAID";
  return "PARTIAL";
}

export async function recordSalesPayment(actor: Actor, input: SalesPaymentInput): Promise<{ id: string; number: string }> {
  const amount = D(input.amount);
  if (!amount.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Nominal pembayaran harus lebih dari nol.");
  if (!amount.equals(amount.toDecimalPlaces(0))) throw new DomainError("INVALID_INPUT", "Nominal pembayaran harus rupiah bulat.");

  return withFinancialTx(async (tx) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: input.invoiceId, companyId: actor.companyId },
      select: {
        id: true,
        number: true,
        status: true,
        grandTotal: true,
        paidAmount: true,
        creditedAmount: true,
      },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur tidak ditemukan.");
    if (invoice.status !== "UNPAID" && invoice.status !== "PARTIAL") {
      throw new DomainError("INVALID_STATUS", "Pembayaran hanya untuk faktur yang belum lunas.");
    }
    const outstanding = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount);
    if (amount.greaterThan(outstanding)) {
      throw new DomainError("INVALID_INPUT", `Nominal melebihi sisa tagihan ${outstanding.toFixed(0)}.`);
    }

    const bank = await tx.bankAccount.findFirst({
      where: { id: input.bankAccountId, companyId: actor.companyId },
      include: { coaAccount: { select: { id: true, name: true, isActive: true } } },
    });
    if (!bank) throw new DomainError("INVALID_INPUT", "Rekening tidak ditemukan.");
    if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening tidak aktif.");
    const receivable = await getAccountByCode(tx, actor.companyId, "1130");

    const paymentId = randomUUID();
    const journal = await postJournal(tx, actor, {
      date: input.date,
      description: `Pembayaran faktur ${invoice.number}`,
      reference: input.reference?.trim() || null,
      type: "PAYMENT_IN",
      sourceType: "SALES_PAYMENT",
      sourceId: paymentId,
      lines: [
        { accountId: bank.coaAccountId, debit: amount.toFixed(2), credit: "0" },
        { accountId: receivable.id, debit: "0", credit: amount.toFixed(2) },
      ],
    });

    await tx.salesPayment.create({
      data: {
        id: paymentId,
        companyId: actor.companyId,
        invoiceId: invoice.id,
        bankAccountId: bank.id,
        date: input.date,
        amount: amount.toFixed(2),
        reference: input.reference?.trim() || null,
        note: input.note?.trim() || null,
        journalEntryId: journal.id,
        createdById: actor.userId,
      },
    });

    const paidAmount = D(invoice.paidAmount).plus(amount);
    await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: paidAmount.toFixed(2),
        status: invoiceStatus(paidAmount, invoice.creditedAmount, invoice.grandTotal),
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "PAYMENT",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      summary: `Menerima pembayaran ${amount.toFixed(0)} untuk faktur ${invoice.number}`,
      metadata: { journal: journal.number, paymentId, bank: bank.name },
    });

    return { id: paymentId, number: journal.number };
  });
}

export async function voidSalesPayment(actor: Actor, paymentId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const payment = await tx.salesPayment.findFirst({
      where: { id: paymentId, companyId: actor.companyId },
      include: {
        invoice: {
          select: { id: true, number: true, grandTotal: true, paidAmount: true, creditedAmount: true, status: true },
        },
      },
    });
    if (!payment) throw new DomainError("NOT_FOUND", "Pembayaran tidak ditemukan.");
    if (payment.voidedAt) throw new DomainError("INVALID_STATUS", "Pembayaran sudah dibatalkan.");
    if (!payment.journalEntryId) throw new DomainError("INVALID_STATUS", "Pembayaran tidak memiliki jurnal.");

    const reversal = await reverseDocumentJournal(
      tx,
      actor,
      payment.journalEntryId,
      `Pembatalan pembayaran faktur ${payment.invoice.number}`,
    );
    await tx.salesPayment.update({
      where: { id: payment.id },
      data: { voidJournalEntryId: reversal.id, voidedAt: new Date() },
    });

    const paidAmount = D(payment.invoice.paidAmount).minus(D(payment.amount));
    const nextPaid = paidAmount.greaterThan(0) ? paidAmount : D(0);
    await tx.salesInvoice.update({
      where: { id: payment.invoice.id },
      data: {
        paidAmount: nextPaid.toFixed(2),
        status: invoiceStatus(nextPaid, payment.invoice.creditedAmount, payment.invoice.grandTotal),
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "VOID_PAYMENT",
      entityType: "SalesPayment",
      entityId: payment.id,
      summary: `Membatalkan pembayaran ${D(payment.amount).toFixed(0)} pada faktur ${payment.invoice.number}`,
      metadata: { reversal: reversal.number },
    });
  });
}
