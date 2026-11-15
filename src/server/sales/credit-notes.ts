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

export interface CreditNoteItemInput {
  invoiceItemId: string;
  quantity: string;
}

export interface SalesCreditNoteInput {
  invoiceId: string;
  date: Date;
  reason: string;
  items: CreditNoteItemInput[];
}

export async function createSalesCreditNote(
  actor: Actor,
  input: SalesCreditNoteInput,
): Promise<{ id: string; number: string; total: number }> {
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 240) {
    throw new DomainError("INVALID_INPUT", "Alasan nota kredit harus 3–240 karakter.");
  }
  if (input.items.length === 0) throw new DomainError("INVALID_INPUT", "Nota kredit memerlukan minimal satu baris.");

  return withFinancialTx(async (tx) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: input.invoiceId, companyId: actor.companyId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        customer: { select: { name: true } },
      },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur tidak ditemukan.");
    if (invoice.status === "DRAFT" || invoice.status === "VOID") {
      throw new DomainError("INVALID_STATUS", "Nota kredit hanya untuk faktur yang sudah diposting.");
    }
    const outstanding = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount);
    if (!outstanding.greaterThan(0)) {
      throw new DomainError("INVALID_STATUS", "Faktur sudah lunas. Batalkan pembayaran terlebih dahulu untuk membuat retur.");
    }

    const credited = await tx.salesCreditNoteItem.groupBy({
      by: ["invoiceItemId"],
      where: { invoiceItemId: { in: invoice.items.map((item) => item.id) } },
      _sum: { quantity: true },
    });
    const creditedByItem = new Map(credited.map((row) => [row.invoiceItemId, D(row._sum.quantity ?? 0)]));

    let dpp = D(0);
    const noteItems = input.items.map((entry) => {
      const invoiceItem = invoice.items.find((item) => item.id === entry.invoiceItemId);
      if (!invoiceItem) throw new DomainError("INVALID_INPUT", "Baris faktur tidak ditemukan.");
      const quantity = D(entry.quantity);
      if (!quantity.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Kuantitas retur harus lebih dari nol.");
      const already = creditedByItem.get(invoiceItem.id) ?? D(0);
      const remaining = D(invoiceItem.quantity).minus(already);
      if (quantity.greaterThan(remaining)) {
        throw new DomainError("INVALID_INPUT", `Kuantitas retur melebihi sisa ${remaining.toFixed(4)} untuk ${invoiceItem.description}.`);
      }
      const gross = roundRp(quantity.times(D(invoiceItem.unitPrice)));
      const discount = roundRp(gross.times(D(invoiceItem.discountPercent)).dividedBy(100));
      const amount = gross.minus(discount);
      dpp = dpp.plus(amount);
      return {
        invoiceItemId: invoiceItem.id,
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
    if (!total.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Nilai nota kredit harus lebih dari nol.");
    if (total.greaterThan(outstanding)) {
      throw new DomainError("INVALID_INPUT", `Nilai retur melebihi sisa tagihan ${outstanding.toFixed(0)}.`);
    }

    const number = await nextDocumentNumber(
      tx,
      actor.companyId,
      DOCUMENT_KEYS.SALES_CREDIT_NOTE.key,
      DOCUMENT_KEYS.SALES_CREDIT_NOTE.prefix,
      input.date,
    );
    const noteId = randomUUID();
    const receivable = await getAccountByCode(tx, actor.companyId, "1130");
    const salesReturn = await getAccountByCode(tx, actor.companyId, "4200");
    const vatOutput = await getAccountByCode(tx, actor.companyId, "2120");

    const lines: JournalLineInput[] = [
      { accountId: salesReturn.id, debit: dpp.toFixed(2), credit: "0", description: `Retur ${invoice.number}` },
    ];
    if (ppnAmount.greaterThan(0)) {
      lines.push({ accountId: vatOutput.id, debit: ppnAmount.toFixed(2), credit: "0" });
    }
    lines.push({ accountId: receivable.id, debit: "0", credit: total.toFixed(2), description: `Retur ${invoice.number}` });

    const journal = await postJournal(tx, actor, {
      date: input.date,
      description: `Nota kredit ${number} untuk ${invoice.customer.name}`,
      reference: invoice.number,
      type: "CREDIT_NOTE",
      sourceType: "SALES_CREDIT_NOTE",
      sourceId: noteId,
      lines,
    });

    await tx.salesCreditNote.create({
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
    const settled = D(invoice.paidAmount).plus(creditedAmount);
    await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        creditedAmount: creditedAmount.toFixed(2),
        status: settled.greaterThanOrEqualTo(D(invoice.grandTotal)) ? "PAID" : "PARTIAL",
      },
    });

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "CREDIT_NOTE",
      entityType: "SalesCreditNote",
      entityId: noteId,
      summary: `Nota kredit ${number} sebesar ${total.toFixed(0)} untuk faktur ${invoice.number}`,
      metadata: { journal: journal.number, invoiceId: invoice.id },
    });

    return { id: noteId, number, total: total.toNumber() };
  });
}

export async function listSalesCreditNotes(
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
            { invoice: { customer: { name: { contains: filters.q.trim(), mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.salesCreditNote.count({ where }),
    prisma.salesCreditNote.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { invoice: { include: { customer: { select: { name: true } } } } },
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
      partyName: note.invoice.customer.name,
      reason: note.reason,
      dpp: D(note.dpp).toNumber(),
      ppnAmount: D(note.ppnAmount).toNumber(),
      total: D(note.total).toNumber(),
    })),
  };
}
