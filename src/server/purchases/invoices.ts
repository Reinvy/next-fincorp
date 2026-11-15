import { prisma, withFinancialTx, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D, roundRp, type Moneyish } from "@/lib/money";
import { todayDate } from "@/lib/dates";
import { PAGE_SIZE } from "@/lib/constants";
import type { Actor, DocumentStatus, WithholdingType } from "@/lib/types";
import type { PurchaseInvoiceDetail, PurchaseInvoiceListItem } from "@/lib/dto";
import { computeInvoiceTotals, outstandingAmount } from "@/server/accounting/calc";
import { DOCUMENT_KEYS, nextDocumentNumber } from "@/server/accounting/numbering";
import { postJournal, reverseDocumentJournal, type JournalLineInput } from "@/server/accounting/posting";
import { getAccountByCode } from "@/server/accounting/accounts";

export interface PurchaseItemInput {
  accountId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
}

export interface PurchaseInvoiceInput {
  vendorId: string;
  date: Date;
  dueDate: Date;
  ppnRate: string;
  withholdingType: WithholdingType;
  withholdingRate: string;
  notes?: string | null;
  items: PurchaseItemInput[];
}

const ALLOWED_ITEM_GROUPS = ["INVENTORY", "COST_OF_GOODS_SOLD", "OPERATING_EXPENSE", "OTHER_EXPENSE"];

function validateInput(input: PurchaseInvoiceInput): void {
  if (input.items.length === 0) throw new DomainError("INVALID_INPUT", "Faktur pembelian memerlukan minimal satu baris.");
  if (input.dueDate.getTime() < input.date.getTime()) {
    throw new DomainError("INVALID_INPUT", "Jatuh tempo tidak boleh sebelum tanggal faktur.");
  }
  for (const value of [D(input.ppnRate), D(input.withholdingRate)]) {
    if (value.isNegative() || value.greaterThan(100)) {
      throw new DomainError("INVALID_INPUT", "Tarif pajak harus 0–100.");
    }
  }
  for (const item of input.items) {
    if (!item.description.trim()) throw new DomainError("INVALID_INPUT", "Deskripsi baris wajib diisi.");
    if (!D(item.quantity).greaterThan(0)) throw new DomainError("INVALID_INPUT", "Kuantitas harus lebih dari nol.");
    if (D(item.unitPrice).isNegative()) throw new DomainError("INVALID_INPUT", "Harga satuan tidak boleh negatif.");
    if (D(item.discountPercent).isNegative() || D(item.discountPercent).greaterThan(100)) {
      throw new DomainError("INVALID_INPUT", "Diskon harus 0–100%.");
    }
  }
}

async function validateItemAccounts(tx: Tx, companyId: string, items: PurchaseItemInput[]) {
  const ids = Array.from(new Set(items.map((item) => item.accountId)));
  const accounts = await tx.glAccount.findMany({
    where: { id: { in: ids }, companyId },
    select: {
      id: true,
      code: true,
      name: true,
      reportGroup: true,
      isActive: true,
      children: { select: { id: true } },
    },
  });
  if (accounts.length !== ids.length) throw new DomainError("INVALID_INPUT", "Ada akun baris pembelian yang tidak ditemukan.");
  for (const account of accounts) {
    if (!account.isActive) throw new DomainError("INVALID_INPUT", `Akun ${account.code} tidak aktif.`);
    if (account.children.length > 0) throw new DomainError("INVALID_INPUT", `Akun ${account.code} adalah akun induk.`);
    if (!ALLOWED_ITEM_GROUPS.includes(account.reportGroup)) {
      throw new DomainError(
        "INVALID_INPUT",
        `Akun ${account.code} tidak boleh dipakai untuk item pembelian (gunakan persediaan, HPP, atau beban).`,
      );
    }
  }
  return new Map(accounts.map((account) => [account.id, account]));
}

async function postInvoiceTx(
  tx: Tx,
  actor: Actor,
  invoice: {
    id: string;
    number: string;
    date: Date;
    status: DocumentStatus;
    grandTotal: Moneyish;
    ppnAmount: Moneyish;
    items: Array<{ accountId: string; amount: Moneyish }>;
  },
): Promise<void> {
  if (invoice.status !== "DRAFT") throw new DomainError("INVALID_STATUS", "Hanya faktur draf yang dapat diposting.");
  const payable = await getAccountByCode(tx, actor.companyId, "2110");
  const vatInput = await getAccountByCode(tx, actor.companyId, "1140");
  const byAccount = new Map<string, ReturnType<typeof D>>();
  for (const item of invoice.items) {
    byAccount.set(item.accountId, (byAccount.get(item.accountId) ?? D(0)).plus(D(item.amount)));
  }
  const lines: JournalLineInput[] = [];
  for (const [accountId, amount] of byAccount) {
    if (amount.greaterThan(0)) lines.push({ accountId, debit: amount.toFixed(2), credit: "0" });
  }
  const ppn = D(invoice.ppnAmount);
  if (ppn.greaterThan(0)) lines.push({ accountId: vatInput.id, debit: ppn.toFixed(2), credit: "0" });
  lines.push({
    accountId: payable.id,
    debit: "0",
    credit: D(invoice.grandTotal).toFixed(2),
    description: `Utang ${invoice.number}`,
  });

  const journal = await postJournal(tx, actor, {
    date: invoice.date,
    description: `Faktur pembelian ${invoice.number}`,
    type: "PURCHASE",
    sourceType: "PURCHASE_INVOICE",
    sourceId: invoice.id,
    lines,
  });
  await tx.purchaseInvoice.update({
    where: { id: invoice.id },
    data: { status: "UNPAID", journalEntryId: journal.id },
  });
  await writeAudit(tx, {
    companyId: actor.companyId,
    userId: actor.userId,
    action: "POST",
    entityType: "PurchaseInvoice",
    entityId: invoice.id,
    summary: `Memposting faktur pembelian ${invoice.number}`,
    metadata: { journal: journal.number },
  });
}

export async function createPurchaseInvoice(
  actor: Actor,
  input: PurchaseInvoiceInput,
  mode: "draft" | "post",
): Promise<{ id: string; number: string }> {
  validateInput(input);
  return withFinancialTx(async (tx) => {
    const vendor = await tx.vendor.findFirst({
      where: { id: input.vendorId, companyId: actor.companyId },
      select: { id: true, name: true, isActive: true },
    });
    if (!vendor) throw new DomainError("INVALID_INPUT", "Vendor tidak ditemukan.");
    if (!vendor.isActive) throw new DomainError("INVALID_INPUT", "Vendor tidak aktif.");
    await validateItemAccounts(tx, actor.companyId, input.items);

    const effectiveRate = input.withholdingType === "NONE" ? "0" : input.withholdingRate;
    const totals = computeInvoiceTotals(input.items, input.ppnRate);
    const withholdingAmount = roundRp(totals.dpp.times(D(effectiveRate)).dividedBy(100));
    const number = await nextDocumentNumber(tx, actor.companyId, DOCUMENT_KEYS.PURCHASE_INVOICE.key, DOCUMENT_KEYS.PURCHASE_INVOICE.prefix, input.date);

    const invoice = await tx.purchaseInvoice.create({
      data: {
        companyId: actor.companyId,
        vendorId: vendor.id,
        number,
        date: input.date,
        dueDate: input.dueDate,
        status: "DRAFT",
        subtotal: totals.subtotal.toFixed(2),
        discountTotal: totals.discountTotal.toFixed(2),
        dpp: totals.dpp.toFixed(2),
        ppnRate: D(input.ppnRate).toFixed(2),
        ppnAmount: totals.ppnAmount.toFixed(2),
        grandTotal: totals.grandTotal.toFixed(2),
        withholdingType: input.withholdingType,
        withholdingRate: D(effectiveRate).toFixed(2),
        withholdingAmount: withholdingAmount.toFixed(2),
        notes: input.notes?.trim() || null,
        createdById: actor.userId,
        items: {
          create: input.items.map((item, index) => ({
            accountId: item.accountId,
            description: item.description.trim(),
            quantity: D(item.quantity).toFixed(4),
            unitPrice: D(item.unitPrice).toFixed(2),
            discountPercent: D(item.discountPercent).toFixed(2),
            amount: totals.lines[index].amount.toFixed(2),
            sortOrder: index,
          })),
        },
      },
      select: { id: true, number: true },
    });

    if (mode === "post") {
      const created = await tx.purchaseInvoice.findUniqueOrThrow({
        where: { id: invoice.id },
        include: { items: true },
      });
      await postInvoiceTx(tx, actor, created);
    } else {
      await writeAudit(tx, {
        companyId: actor.companyId,
        userId: actor.userId,
        action: "CREATE_DRAFT",
        entityType: "PurchaseInvoice",
        entityId: invoice.id,
        summary: `Membuat draf faktur pembelian ${number} untuk ${vendor.name}`,
      });
    }
    return invoice;
  });
}

export async function postPurchaseInvoice(actor: Actor, invoiceId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: invoiceId, companyId: actor.companyId },
      include: { items: true },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur pembelian tidak ditemukan.");
    await postInvoiceTx(tx, actor, invoice);
  });
}

export interface PurchaseFilters {
  q?: string;
  status?: DocumentStatus;
  from?: Date;
  to?: Date;
  page?: number;
}

export async function listPurchaseInvoices(
  actor: Actor,
  filters: PurchaseFilters = {},
): Promise<{ rows: PurchaseInvoiceListItem[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const where = {
    companyId: actor.companyId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? { date: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
    ...(filters.q?.trim()
      ? {
          OR: [
            { number: { contains: filters.q.trim(), mode: "insensitive" as const } },
            { vendor: { name: { contains: filters.q.trim(), mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.purchaseInvoice.count({ where }),
    prisma.purchaseInvoice.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { vendor: { select: { name: true } } },
    }),
  ]);
  const today = todayDate();
  return {
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: rows.map((invoice) => {
      const outstanding = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount);
      return {
        id: invoice.id,
        number: invoice.number,
        date: invoice.date.toISOString().slice(0, 10),
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        vendorName: invoice.vendor.name,
        status: invoice.status,
        grandTotal: D(invoice.grandTotal).toNumber(),
        paidAmount: D(invoice.paidAmount).toNumber(),
        creditedAmount: D(invoice.creditedAmount).toNumber(),
        outstanding: outstanding.toNumber(),
        overdue: (invoice.status === "UNPAID" || invoice.status === "PARTIAL") && invoice.dueDate.getTime() < today.getTime(),
        withholdingType: invoice.withholdingType,
        withholdingAmount: D(invoice.withholdingAmount).toNumber(),
      };
    }),
  };
}

export interface PurchaseSummary {
  outstanding: number;
  overdueOutstanding: number;
  draftCount: number;
  openCount: number;
  paidThisMonth: number;
}

export async function getPurchaseSummary(
  actor: Actor,
  month: { start: Date; end: Date },
): Promise<PurchaseSummary> {
  const today = todayDate();
  const [open, drafts, payments] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] } },
      select: { grandTotal: true, paidAmount: true, creditedAmount: true, dueDate: true },
    }),
    prisma.purchaseInvoice.count({ where: { companyId: actor.companyId, status: "DRAFT" } }),
    prisma.purchasePayment.aggregate({
      where: { companyId: actor.companyId, voidedAt: null, date: { gte: month.start, lte: month.end } },
      _sum: { bankAmount: true },
    }),
  ]);
  let outstanding = 0;
  let overdueOutstanding = 0;
  for (const invoice of open) {
    const value = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount).toNumber();
    outstanding += value;
    if (invoice.dueDate.getTime() < today.getTime()) overdueOutstanding += value;
  }
  return {
    outstanding,
    overdueOutstanding,
    draftCount: drafts,
    openCount: open.length,
    paidThisMonth: D(payments._sum.bankAmount ?? 0).toNumber(),
  };
}

export async function getPurchaseInvoiceDetail(actor: Actor, invoiceId: string): Promise<PurchaseInvoiceDetail> {
  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id: invoiceId, companyId: actor.companyId },
    include: {
      vendor: true,
      items: { orderBy: { sortOrder: "asc" }, include: { account: { select: { code: true, name: true } }, debitItems: true } },
      payments: { orderBy: { date: "desc" }, include: { bankAccount: { select: { name: true } } } },
      debitNotes: { orderBy: { date: "desc" } },
    },
  });
  if (!invoice) throw new DomainError("NOT_FOUND", "Faktur pembelian tidak ditemukan.");
  const today = todayDate();
  const outstanding = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount);
  const overdue = (invoice.status === "UNPAID" || invoice.status === "PARTIAL") && invoice.dueDate.getTime() < today.getTime();

  return {
    id: invoice.id,
    number: invoice.number,
    date: invoice.date.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    vendorName: invoice.vendor.name,
    status: invoice.status,
    grandTotal: D(invoice.grandTotal).toNumber(),
    paidAmount: D(invoice.paidAmount).toNumber(),
    creditedAmount: D(invoice.creditedAmount).toNumber(),
    outstanding: outstanding.toNumber(),
    overdue,
    withholdingType: invoice.withholdingType,
    withholdingAmount: D(invoice.withholdingAmount).toNumber(),
    vendorId: invoice.vendorId,
    vendorNpwp: invoice.vendor.npwp,
    vendorAddress: invoice.vendor.address,
    subtotal: D(invoice.subtotal).toNumber(),
    discountTotal: D(invoice.discountTotal).toNumber(),
    dpp: D(invoice.dpp).toNumber(),
    ppnRate: D(invoice.ppnRate).toNumber(),
    ppnAmount: D(invoice.ppnAmount).toNumber(),
    withholdingRate: D(invoice.withholdingRate).toNumber(),
    notes: invoice.notes,
    journalEntryId: invoice.journalEntryId,
    items: invoice.items.map((item) => ({
      id: item.id,
      accountId: item.accountId,
      accountName: `${item.account.code} · ${item.account.name}`,
      description: item.description,
      quantity: D(item.quantity).toNumber(),
      unitPrice: D(item.unitPrice).toNumber(),
      discountPercent: D(item.discountPercent).toNumber(),
      amount: D(item.amount).toNumber(),
      creditedQuantity: item.debitItems.reduce((acc, entry) => acc.plus(D(entry.quantity)), D(0)).toNumber(),
    })),
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      date: payment.date.toISOString().slice(0, 10),
      amount: D(payment.amount).toNumber(),
      withheldAmount: D(payment.withheldAmount).toNumber(),
      bankAmount: D(payment.bankAmount).toNumber(),
      bankAccountName: payment.bankAccount.name,
      reference: payment.reference,
      note: payment.note,
      journalEntryId: payment.journalEntryId,
      voided: payment.voidedAt !== null,
      voidedAt: payment.voidedAt?.toISOString() ?? null,
    })),
    returns: invoice.debitNotes.map((note) => ({
      id: note.id,
      number: note.number,
      date: note.date.toISOString().slice(0, 10),
      total: D(note.total).toNumber(),
      reason: note.reason,
    })),
    canVoid:
      invoice.status === "DRAFT" ||
      (invoice.status === "UNPAID" &&
        invoice.payments.every((payment) => payment.voidedAt !== null) &&
        D(invoice.creditedAmount).isZero()),
    canPay: (invoice.status === "UNPAID" || invoice.status === "PARTIAL") && outstanding.greaterThan(0),
    canReturn:
      (invoice.status === "UNPAID" || invoice.status === "PARTIAL") &&
      D(invoice.paidAmount).isZero() &&
      outstanding.greaterThan(0),
  };
}

export async function voidPurchaseInvoice(actor: Actor, invoiceId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const invoice = await tx.purchaseInvoice.findFirst({
      where: { id: invoiceId, companyId: actor.companyId },
      include: { payments: { where: { voidedAt: null }, select: { id: true } } },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur pembelian tidak ditemukan.");
    if (invoice.status === "VOID") throw new DomainError("INVALID_STATUS", "Faktur sudah dibatalkan.");
    if (invoice.status === "DRAFT") {
      await tx.purchaseInvoice.update({ where: { id: invoice.id }, data: { status: "VOID" } });
    } else {
      if (invoice.payments.length > 0) {
        throw new DomainError("INVALID_STATUS", "Batalkan pembayaran terlebih dahulu sebelum membatalkan faktur.");
      }
      if (!D(invoice.creditedAmount).isZero()) {
        throw new DomainError("INVALID_STATUS", "Faktur memiliki nota debit dan tidak dapat dibatalkan.");
      }
      if (!invoice.journalEntryId) throw new DomainError("INVALID_STATUS", "Faktur tidak memiliki jurnal.");
      const reversal = await reverseDocumentJournal(tx, actor, invoice.journalEntryId, `Pembatalan pembelian ${invoice.number}`);
      await tx.purchaseInvoice.update({
        where: { id: invoice.id },
        data: { status: "VOID", voidJournalEntryId: reversal.id },
      });
    }
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "VOID",
      entityType: "PurchaseInvoice",
      entityId: invoice.id,
      summary: `Membatalkan faktur pembelian ${invoice.number}`,
    });
  });
}
