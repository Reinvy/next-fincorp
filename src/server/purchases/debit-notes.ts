import { randomUUID } from "node:crypto";
import { prisma, withFinancialTx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D, roundRp } from "@/lib/money";
import type { Actor } from "@/lib/types";
import type { CreditNoteView } from "@/lib/dto";
import { outstandingAmount } from "@/server/accounting/calc";
import { DOCUMENT_KEYS, nextDocumentNumber } from "@/server/accounting/numbering";
import { postJournal, type JournalLineInput } from "@/server/accounting/posting";
import { getAccountByCode } from "@/server/accounting/accounts";

export interface DebitNoteItemInput {
  invoiceItemId: string;
  quantity: string;
}

export interface PurchaseDebitNoteInput {
  invoiceId: string;
  date: Date;
  reason: string;
  items: DebitNoteItemInput[];
}

export async function createPurchaseDebitNote(
  actor: Actor,
  input: PurchaseDebitNoteInput,
): Promise<{ id: string; number: string; total: number }> {
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 240) {
    throw new DomainError("INVALID_INPUT", "Alasan nota debit harus 3–240 karakter.");
  }
  if (input.items.length === 0) throw new DomainError("INVALID_INPUT", "Nota debit memerlukan minimal satu baris.");

  return withFinancialTx(async (tx) => {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: input.invoiceId, companyId: actor.companyId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        vendor: { select: { name: true } },
      },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur pembelian tidak ditemukan.");
    if (invoice.status === "DRAFT" || invoice.status === "VOID") {
      throw new DomainError("INVALID_STATUS", "Nota debit hanya untuk faktur yang sudah diposting.");
    }
    if (!D(invoice.paidAmount).isZero()) {
      throw new DomainError(
        "INVALID_STATUS",
        "Nota debit hanya sebelum pembayaran. Batalkan pembayaran terlebih dahulu bila ingin meretur.",
      );
    }
    const outstanding = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount);
    if (!outstanding.greaterThan(0)) throw new DomainError("INVALID_STATUS", "Faktur tidak memiliki sisa utang.");

    const previous = await tx.purchaseDebitNoteItem.groupBy({
      by: ["invoiceItemId"],
      where: { invoiceItemId: { in: invoice.items.map((item) => item.id) } },
      _sum: { quantity: true },
    });
    const creditedByItem = new Map(previous.map((row) => [row.invoiceItemId, D(row._sum.quantity ?? 0)]));

    let dpp = D(0);
    const noteItems = input.items.map((entry) => {
      const invoiceItem = invoice.items.find((item) => item.id === entry.invoiceItemId);
      if (!invoiceItem) throw new DomainError("INVALID_INPUT", "Baris faktur tidak ditemukan.");
      const quantity = D(entry.quantity);
      if (!quantity.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Kuantitas retur harus lebih dari nol.");
      const remaining = D(invoiceItem.quantity).minus(creditedByItem.get(invoiceItem.id) ?? D(0));
      if (quantity.greaterThan(remaining)) {
        throw new DomainError("INVALID_INPUT", `Kuantitas retur melebihi sisa ${remaining.toFixed(4)} untuk ${invoiceItem.description}.`);
      }
      const gross = roundRp(quantity.times(D(invoiceItem.unitPrice)));
      const discount = roundRp(gross.times(D(invoiceItem.discountPercent)).dividedBy(100));
      const amount = gross.minus(discount);
      dpp = dpp.plus(amount);
      return {
        invoiceItemId: invoiceItem.id,
        accountId: invoiceItem.accountId,
        description: invoiceItem.description,
        quantity,
        unitPrice: D(invoiceItem.unitPrice),
        discountPercent: D(invoiceItem.discountPercent),
        amount,
      };
    });

    const ppnRate = D(invoice.ppnRate);
    const ppnAmount = roundRp(dpp.times(ppnRate).dividedBy(100));
    const total = dpp.plus(ppnAmount);
    if (!total.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Nilai nota debit harus lebih dari nol.");
    if (total.greaterThan(outstanding)) {
      throw new DomainError("INVALID_INPUT", `Nilai retur melebihi sisa utang ${outstanding.toFixed(0)}.`);
    }

    const number = await nextDocumentNumber(
      tx,
      actor.companyId,
      DOCUMENT_KEYS.PURCHASE_DEBIT_NOTE.key,
      DOCUMENT_KEYS.PURCHASE_DEBIT_NOTE.prefix,
      input.date,
    );
    const noteId = randomUUID();
    const payable = await getAccountByCode(tx, actor.companyId, "2110");
    const vatInput = await getAccountByCode(tx, actor.companyId, "1140");

    const byAccount = new Map<string, ReturnType<typeof D>>();
    for (const item of noteItems) {
      byAccount.set(item.accountId, (byAccount.get(item.accountId) ?? D(0)).plus(item.amount));
    }
    const lines: JournalLineInput[] = [
      { accountId: payable.id, debit: total.toFixed(2), credit: "0", description: `Retur ${invoice.number}` },
    ];
    for (const [accountId, amount] of byAccount) {
      if (amount.greaterThan(0)) lines.push({ accountId, debit: "0", credit: amount.toFixed(2) });
    }
    if (ppnAmount.greaterThan(0)) {
      lines.push({ accountId: vatInput.id, debit: "0", credit: ppnAmount.toFixed(2) });
    }

    const journal = await postJournal(tx, actor, {
      date: input.date,
      description: `Nota debit ${number} untuk ${invoice.vendor.name}`,
      reference: invoice.number,
      type: "DEBIT_NOTE",
      sourceType: "PURCHASE_DEBIT_NOTE",
      sourceId: noteId,
      lines,
    });

    await tx.purchaseDebitNote.create({
      data: {
        id: noteId,
        companyId: actor.companyId,
        invoiceId: invoice.id,
        number,
        date: input.date,
        reason,
        subtotal: dpp.plus(ppnAmount).toFixed(2),
        dpp: dpp.toFixed(2),
        ppnRate: ppnRate.toFixed(2),
        ppnAmount: ppnAmount.toFixed(2),
        total: total.toFixed(2),
        journalEntryId: journal.id,
        createdById: actor.userId,
        items: {
          create: noteItems.map((item) => ({
            invoiceItemId: item.invoiceItemId,
            accountId: item.accountId,
            description: item.description,
            quantity: item.quantity.toFixed(4),
            unitPrice: item.unitPrice.toFixed(2),
            discountPercent: item.discountPercent.toFixed(2),
            amount: item.amount.toFixed(2),
          })),
        },
      },
    });

    const creditedAmount = D(invoice.creditedAmount).plus(total);
    const withholdingReduction = roundRp(dpp.times(D(invoice.withholdingRate)).dividedBy(100));
    const nextWithholding = D(invoice.withholdingAmount).minus(withholdingReduction);
    await tx.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        creditedAmount: creditedAmount.toFixed(2),
        withholdingAmount: (nextWithholding.greaterThan(0) ? nextWithholding : D(0)).toFixed(2),
        status: D(invoice.paidAmount).plus(creditedAmount).greaterThanOrEqualTo(D(invoice.grandTotal))
          ? "PAID"
          : "PARTIAL",
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "DEBIT_NOTE",
      entityType: "PurchaseDebitNote",
      entityId: noteId,
      summary: `Nota debit ${number} sebesar ${total.toFixed(0)} untuk ${invoice.number}`,
      metadata: { journal: journal.number, withholdingReduction: withholdingReduction.toFixed(2) },
    });

    return { id: noteId, number, total: total.toNumber() };
  });
}

export async function listPurchaseDebitNotes(
  actor: Actor,
  filters: { q?: string; page?: number } = {},
): Promise<{ rows: CreditNoteView[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;
  const where = {
    companyId: actor.companyId,
    ...(filters.q?.trim()
      ? {
          OR: [
            { number: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { invoice: { number: { contains: filters.q.trim(), mode: "insensitive" as const } } },
            { invoice: { vendor: { name: { contains: filters.q.trim(), mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.purchaseDebitNote.count({ where }),
    prisma.purchaseDebitNote.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { invoice: { include: { vendor: { select: { name: true } } } } },
    }),
  ]);
  return {
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: rows.map((note) => ({
      id: note.id,
      number: note.number,
      date: note.date.toISOString().slice(0, 10),
      invoiceId: note.invoiceId,
      invoiceNumber: note.invoice.number,
      partyName: note.invoice.vendor.name,
      reason: note.reason,
      dpp: D(note.dpp).toNumber(),
      ppnAmount: D(note.ppnAmount).toNumber(),
      total: D(note.total).toNumber(),
    })),
  };
}
