import { randomUUID } from "node:crypto";
import { withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D, type Moneyish } from "@/lib/money";
import type { Actor, DocumentStatus, WithholdingType } from "@/lib/types";
import { computeWithholding, outstandingAmount } from "@/server/accounting/calc";
import { postJournal, reverseDocumentJournal, type JournalLineInput } from "@/server/accounting/posting";
import { getAccountByCode } from "@/server/accounting/accounts";

const WITHHOLDING_ACCOUNT: Record<Exclude<WithholdingType, "NONE">, string> = {
  PPH21: "2130",
  PPH22: "2145",
  PPH23: "2140",
  PPH4_2: "2150",
};

export interface PurchasePaymentInput {
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

export async function recordPurchasePayment(
  actor: Actor,
  input: PurchasePaymentInput,
): Promise<{ id: string; number: string; withheld: number; bankAmount: number }> {
  const amount = D(input.amount);
  if (!amount.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Nominal pembayaran harus lebih dari nol.");
  if (!amount.equals(amount.toDecimalPlaces(0))) throw new DomainError("INVALID_INPUT", "Nominal pembayaran harus rupiah bulat.");

  return withFinancialTx(async (tx) => {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: input.invoiceId, companyId: actor.companyId },
      select: {
        id: true,
        number: true,
        status: true,
        grandTotal: true,
        paidAmount: true,
        creditedAmount: true,
        withholdingType: true,
        withholdingAmount: true,
      },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur pembelian tidak ditemukan.");
    if (invoice.status !== "UNPAID" && invoice.status !== "PARTIAL") {
      throw new DomainError("INVALID_STATUS", "Pembayaran hanya untuk faktur yang belum lunas.");
    }
    const outstanding = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount);
    if (amount.greaterThan(outstanding)) {
      throw new DomainError("INVALID_INPUT", `Nominal melebihi sisa utang ${outstanding.toFixed(0)}.`);
    }

    const bank = await tx.bankAccount.findFirst({
      where: { id: input.bankAccountId, companyId: actor.companyId },
      include: { coaAccount: { select: { id: true, name: true, isActive: true } } },
    });
    if (!bank) throw new DomainError("INVALID_INPUT", "Rekening tidak ditemukan.");
    if (!bank.isActive) throw new DomainError("INVALID_INPUT", "Rekening tidak aktif.");

    const paidSoFar = await tx.purchasePayment.aggregate({
      where: { invoiceId: invoice.id, voidedAt: null },
      _sum: { withheldAmount: true },
    });
    const withheldSoFar = D(paidSoFar._sum.withheldAmount ?? 0);
    const settlementTarget = D(invoice.grandTotal).minus(D(invoice.creditedAmount));
    const finalPayment = D(invoice.paidAmount).plus(amount).equals(settlementTarget);
    let withheld = computeWithholding({
      withholdingAmount: invoice.withholdingAmount,
      withheldSoFar,
      paymentAmount: amount,
      settlementTarget,
      finalPayment,
    });
    if (withheld.greaterThan(amount)) withheld = amount;
    if (withheld.isNegative()) withheld = D(0);
    const bankAmount = amount.minus(withheld);
    if (bankAmount.isNegative()) throw new DomainError("INVALID_INPUT", "Potongan pajak melebihi nominal pembayaran.");

    const payable = await getAccountByCode(tx, actor.companyId, "2110");
    const paymentId = randomUUID();
    const lines: JournalLineInput[] = [
      { accountId: payable.id, debit: amount.toFixed(2), credit: "0", description: `Utang ${invoice.number}` },
      { accountId: bank.coaAccountId, debit: "0", credit: bankAmount.toFixed(2) },
    ];
    if (withheld.greaterThan(0)) {
      if (invoice.withholdingType === "NONE") {
        throw new DomainError("INVALID_INPUT", "Faktur tidak memiliki jenis potongan pajak.");
      }
      const taxAccount = await getAccountByCode(tx, actor.companyId, WITHHOLDING_ACCOUNT[invoice.withholdingType]);
      lines.push({ accountId: taxAccount.id, debit: "0", credit: withheld.toFixed(2) });
    }

    const journal = await postJournal(tx, actor, {
      date: input.date,
      description: `Pembayaran pembelian ${invoice.number}`,
      reference: input.reference?.trim() || null,
      type: "PAYMENT_OUT",
      sourceType: "PURCHASE_PAYMENT",
      sourceId: paymentId,
      lines,
    });

    await tx.purchasePayment.create({
      data: {
        id: paymentId,
        companyId: actor.companyId,
        invoiceId: invoice.id,
        bankAccountId: bank.id,
        date: input.date,
        amount: amount.toFixed(2),
        withheldAmount: withheld.toFixed(2),
        bankAmount: bankAmount.toFixed(2),
        reference: input.reference?.trim() || null,
        note: input.note?.trim() || null,
        journalEntryId: journal.id,
        createdById: actor.userId,
      },
    });

    const paidAmount = D(invoice.paidAmount).plus(amount);
    await tx.purchaseInvoice.update({
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
      entityType: "PurchaseInvoice",
      entityId: invoice.id,
      summary: `Membayar ${amount.toFixed(0)} untuk ${invoice.number}, dipotong pajak ${withheld.toFixed(0)}`,
      metadata: { journal: journal.number, paymentId, withheld: withheld.toFixed(2) },
    });

    return { id: paymentId, number: journal.number, withheld: withheld.toNumber(), bankAmount: bankAmount.toNumber() };
  });
}

export async function voidPurchasePayment(actor: Actor, paymentId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const payment = await tx.purchasePayment.findFirst({
      where: { id: paymentId, companyId: actor.companyId },
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            grandTotal: true,
            paidAmount: true,
            creditedAmount: true,
            withholdingType: true,
          },
        },
      },
    });
    if (!payment) throw new DomainError("NOT_FOUND", "Pembayaran tidak ditemukan.");
    if (payment.voidedAt) throw new DomainError("INVALID_STATUS", "Pembayaran sudah dibatalkan.");
    if (!payment.journalEntryId) throw new DomainError("INVALID_STATUS", "Pembayaran tidak memiliki jurnal.");

    const withheld = D(payment.withheldAmount);
    if (withheld.greaterThan(0)) {
      if (payment.invoice.withholdingType === "NONE") {
        throw new DomainError("INVALID_INPUT", "Faktur tidak memiliki akun potongan pajak.");
      }
      const taxAccount = await getAccountByCode(
        tx,
        actor.companyId,
        WITHHOLDING_ACCOUNT[payment.invoice.withholdingType],
      );
      const aggregate = await tx.journalLine.aggregate({
        where: { accountId: taxAccount.id, journalEntry: { companyId: actor.companyId, status: "POSTED" } },
        _sum: { debit: true, credit: true },
      });
      const liability = D(aggregate._sum.credit ?? 0).minus(D(aggregate._sum.debit ?? 0));
      if (liability.lessThan(withheld)) {
        throw new DomainError(
          "INVALID_STATUS",
          `Saldo utang pajak ${taxAccount.code} hanya ${liability.toFixed(0)}. Batalkan pembayaran pajak terkait terlebih dahulu.`,
        );
      }
    }

    const reversal = await reverseDocumentJournal(
      tx,
      actor,
      payment.journalEntryId,
      `Pembatalan pembayaran pembelian ${payment.invoice.number}`,
    );
    await tx.purchasePayment.update({
      where: { id: payment.id },
      data: { voidJournalEntryId: reversal.id, voidedAt: new Date() },
    });

    const paidAmount = D(payment.invoice.paidAmount).minus(D(payment.amount));
    const nextPaid = paidAmount.greaterThan(0) ? paidAmount : D(0);
    await tx.purchaseInvoice.update({
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
      entityType: "PurchasePayment",
      entityId: payment.id,
      summary: `Membatalkan pembayaran ${D(payment.amount).toFixed(0)} pada ${payment.invoice.number}`,
      metadata: { reversal: reversal.number },
    });
  });
}
