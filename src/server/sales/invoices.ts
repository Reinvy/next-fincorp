import { prisma, withFinancialTx, type Tx } from "@/lib/prisma";
import { DomainError } from "@/lib/db-errors";
import { writeAudit } from "@/lib/audit";
import { D } from "@/lib/money";
import { todayDate } from "@/lib/dates";
import { PAGE_SIZE } from "@/lib/constants";
import type { Actor, DocumentStatus, TaxInvoiceStatus } from "@/lib/types";
import type { SalesInvoiceDetail, SalesInvoiceListItem } from "@/lib/dto";
import { computeInvoiceTotals, outstandingAmount } from "@/server/accounting/calc";
import { DOCUMENT_KEYS, nextDocumentNumber } from "@/server/accounting/numbering";
import { postJournal, reverseDocumentJournal, type JournalLineInput } from "@/server/accounting/posting";
import { getAccountByCode } from "@/server/accounting/accounts";

export interface SalesInvoiceItemInput {
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
}

export interface SalesInvoiceInput {
  customerId: string;
  revenueAccountId: string;
  date: Date;
  dueDate: Date;
  ppnRate: string;
  items: SalesInvoiceItemInput[];
  notes?: string | null;
  paymentTerms?: string | null;
  taxInvoiceNumber?: string | null;
  taxInvoiceDate?: Date | null;
}

function validateInput(input: SalesInvoiceInput): void {
  if (input.items.length === 0) throw new DomainError("INVALID_INPUT", "Faktur memerlukan minimal satu baris.");
  if (input.dueDate.getTime() < input.date.getTime()) {
    throw new DomainError("INVALID_INPUT", "Jatuh tempo tidak boleh sebelum tanggal faktur.");
  }
  const rate = D(input.ppnRate);
  if (rate.isNegative() || rate.greaterThan(100)) {
    throw new DomainError("INVALID_INPUT", "Tarif PPN harus 0–100.");
  }
  for (const item of input.items) {
    if (item.description.trim().length === 0) throw new DomainError("INVALID_INPUT", "Deskripsi baris wajib diisi.");
    if (!D(item.quantity).greaterThan(0)) throw new DomainError("INVALID_INPUT", "Kuantitas harus lebih dari nol.");
    if (D(item.unitPrice).isNegative()) throw new DomainError("INVALID_INPUT", "Harga satuan tidak boleh negatif.");
    if (D(item.discountPercent).isNegative() || D(item.discountPercent).greaterThan(100)) {
      throw new DomainError("INVALID_INPUT", "Diskon harus 0–100%.");
    }
  }
}

async function resolveAccounts(tx: Tx, companyId: string, revenueAccountId: string) {
  const revenue = await tx.glAccount.findFirst({
    where: { id: revenueAccountId, companyId },
    select: { id: true, name: true, type: true, isActive: true, children: { select: { id: true } } },
  });
  if (!revenue) throw new DomainError("INVALID_INPUT", "Akun pendapatan tidak ditemukan.");
  if (!revenue.isActive) throw new DomainError("INVALID_INPUT", "Akun pendapatan tidak aktif.");
  if (revenue.type !== "REVENUE") throw new DomainError("INVALID_INPUT", "Akun pendapatan harus bertipe REVENUE.");
  if (revenue.children.length > 0) throw new DomainError("INVALID_INPUT", "Akun pendapatan harus akun daun.");
  const receivable = await getAccountByCode(tx, companyId, "1130");
  const vatOutput = await getAccountByCode(tx, companyId, "2120");
  return { revenue, receivable, vatOutput };
}

export async function createSalesInvoice(
  actor: Actor,
  input: SalesInvoiceInput,
  mode: "draft" | "post",
): Promise<{ id: string; number: string }> {
  validateInput(input);

  return withFinancialTx(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: actor.companyId }, select: { isPkp: true } });
    if (!company) throw new DomainError("NOT_FOUND", "Perusahaan tidak ditemukan.");
    const customer = await tx.customer.findFirst({
      where: { id: input.customerId, companyId: actor.companyId },
      select: { id: true, name: true, isActive: true },
    });
    if (!customer) throw new DomainError("INVALID_INPUT", "Pelanggan tidak ditemukan.");
    if (!customer.isActive) throw new DomainError("INVALID_INPUT", "Pelanggan tidak aktif.");
    await resolveAccounts(tx, actor.companyId, input.revenueAccountId);

    if (!company.isPkp && (D(input.ppnRate).greaterThan(0) || input.taxInvoiceNumber)) {
      throw new DomainError("INVALID_INPUT", "Perusahaan non-PKP tidak boleh memungut PPN atau mengisi faktur pajak.");
    }

    const totals = computeInvoiceTotals(input.items, input.ppnRate);
    if (!totals.grandTotal.greaterThan(0)) throw new DomainError("INVALID_INPUT", "Total faktur harus lebih dari nol.");
    const number = await nextDocumentNumber(tx, actor.companyId, DOCUMENT_KEYS.SALES_INVOICE.key, DOCUMENT_KEYS.SALES_INVOICE.prefix, input.date);

    const invoice = await tx.salesInvoice.create({
      data: {
        companyId: actor.companyId,
        customerId: customer.id,
        revenueAccountId: input.revenueAccountId,
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
        notes: input.notes?.trim() || null,
        paymentTerms: input.paymentTerms?.trim() || null,
        taxInvoiceNumber: input.taxInvoiceNumber?.trim() || null,
        taxInvoiceDate: input.taxInvoiceDate ?? null,
        taxInvoiceStatus: input.taxInvoiceNumber ? "DRAFT" : "NONE",
        createdById: actor.userId,
        items: {
          create: input.items.map((item, index) => ({
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

    let journalNumber: string | null = null;
    if (mode === "post") {
      const { receivable, revenue, vatOutput } = await resolveAccounts(tx, actor.companyId, input.revenueAccountId);
      const lines: JournalLineInput[] = [
        { accountId: receivable.id, debit: totals.grandTotal.toFixed(2), credit: "0", description: `Piutang ${number}` },
        { accountId: revenue.id, debit: "0", credit: totals.dpp.toFixed(2) },
      ];
      if (totals.ppnAmount.greaterThan(0)) {
        lines.push({ accountId: vatOutput.id, debit: "0", credit: totals.ppnAmount.toFixed(2) });
      }
      const journal = await postJournal(tx, actor, {
        date: input.date,
        description: `Faktur penjualan ${number} — ${customer.name}`,
        type: "SALES",
        sourceType: "SALES_INVOICE",
        sourceId: invoice.id,
        lines,
      });
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: "UNPAID", journalEntryId: journal.id },
      });
      journalNumber = journal.number;
    }

    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: mode === "post" ? "POST" : "CREATE_DRAFT",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      summary: `${mode === "post" ? "Memposting" : "Membuat draf"} faktur penjualan ${number} untuk ${customer.name}`,
      metadata: { grandTotal: totals.grandTotal.toFixed(2), journal: journalNumber, mode },
    });

    return invoice;
  });
}

export async function postSalesInvoice(actor: Actor, invoiceId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceId, companyId: actor.companyId },
      select: {
        id: true,
        number: true,
        status: true,
        date: true,
        grandTotal: true,
        dpp: true,
        ppnAmount: true,
        revenueAccountId: true,
      },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur tidak ditemukan.");
    if (invoice.status !== "DRAFT") throw new DomainError("INVALID_STATUS", "Faktur ini bukan draf.");
    const { receivable, revenue, vatOutput } = await resolveAccounts(tx, actor.companyId, invoice.revenueAccountId);
    const grand = D(invoice.grandTotal);
    const dpp = D(invoice.dpp);
    const ppn = D(invoice.ppnAmount);
    const lines: JournalLineInput[] = [
      { accountId: receivable.id, debit: grand.toFixed(2), credit: "0", description: `Piutang ${invoice.number}` },
      { accountId: revenue.id, debit: "0", credit: dpp.toFixed(2) },
    ];
    if (ppn.greaterThan(0)) {
      lines.push({ accountId: vatOutput.id, debit: "0", credit: ppn.toFixed(2) });
    }
    const journal = await postJournal(tx, actor, {
      date: invoice.date,
      description: `Faktur penjualan ${invoice.number}`,
      type: "SALES",
      sourceType: "SALES_INVOICE",
      sourceId: invoice.id,
      lines,
    });
    await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: { status: "UNPAID", journalEntryId: journal.id },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "POST",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      summary: `Memposting faktur penjualan ${invoice.number}`,
      metadata: { journal: journal.number },
    });
  });
}

export interface SalesInvoiceFilters {
  q?: string;
  status?: DocumentStatus;
  from?: Date;
  to?: Date;
  page?: number;
}

export async function listSalesInvoices(
  actor: Actor,
  filters: SalesInvoiceFilters = {},
): Promise<{ rows: SalesInvoiceListItem[]; total: number; page: number; totalPages: number }> {
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
            { customer: { name: { contains: filters.q.trim(), mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.salesInvoice.count({ where }),
    prisma.salesInvoice.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { name: true } } },
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
        customerName: invoice.customer.name,
        status: invoice.status,
        grandTotal: D(invoice.grandTotal).toNumber(),
        paidAmount: D(invoice.paidAmount).toNumber(),
        creditedAmount: D(invoice.creditedAmount).toNumber(),
        outstanding: outstanding.toNumber(),
        overdue:
          (invoice.status === "UNPAID" || invoice.status === "PARTIAL") && invoice.dueDate.getTime() < today.getTime(),
        taxInvoiceStatus: invoice.taxInvoiceStatus,
      };
    }),
  };
}

export interface SalesSummary {
  outstanding: number;
  overdueOutstanding: number;
  draftCount: number;
  openCount: number;
  paidThisMonth: number;
}

export async function getSalesSummary(actor: Actor, month: { start: Date; end: Date }): Promise<SalesSummary> {
  const today = todayDate();
  const [open, drafts, payments] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { companyId: actor.companyId, status: { in: ["UNPAID", "PARTIAL"] } },
      select: { grandTotal: true, paidAmount: true, creditedAmount: true, dueDate: true },
    }),
    prisma.salesInvoice.count({ where: { companyId: actor.companyId, status: "DRAFT" } }),
    prisma.salesPayment.aggregate({
      where: {
        companyId: actor.companyId,
        voidedAt: null,
        date: { gte: month.start, lte: month.end },
      },
      _sum: { amount: true },
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
    paidThisMonth: D(payments._sum.amount ?? 0).toNumber(),
  };
}

export async function getSalesInvoiceDetail(actor: Actor, invoiceId: string): Promise<SalesInvoiceDetail> {
  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: invoiceId, companyId: actor.companyId },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" }, include: { creditItems: { include: { creditNote: { select: { date: true } } } } } },
      payments: { orderBy: { date: "desc" }, include: { bankAccount: { select: { name: true } } } },
      creditNotes: { orderBy: { date: "desc" } },
      company: { select: { isPkp: true } },
    },
  });
  if (!invoice) throw new DomainError("NOT_FOUND", "Faktur tidak ditemukan.");
  const today = todayDate();
  const outstanding = outstandingAmount(invoice.grandTotal, invoice.paidAmount, invoice.creditedAmount);
  const overdue =
    (invoice.status === "UNPAID" || invoice.status === "PARTIAL") && invoice.dueDate.getTime() < today.getTime();
  const revenueAccount = await prisma.glAccount.findUnique({
    where: { id: invoice.revenueAccountId },
    select: { name: true },
  });

  return {
    id: invoice.id,
    number: invoice.number,
    date: invoice.date.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    customerName: invoice.customer.name,
    status: invoice.status,
    grandTotal: D(invoice.grandTotal).toNumber(),
    paidAmount: D(invoice.paidAmount).toNumber(),
    creditedAmount: D(invoice.creditedAmount).toNumber(),
    outstanding: outstanding.toNumber(),
    overdue,
    taxInvoiceStatus: invoice.taxInvoiceStatus,
    customerId: invoice.customerId,
    customerNpwp: invoice.customer.npwp,
    customerAddress: invoice.customer.address,
    revenueAccountId: invoice.revenueAccountId,
    revenueAccountName: revenueAccount?.name ?? "—",
    subtotal: D(invoice.subtotal).toNumber(),
    discountTotal: D(invoice.discountTotal).toNumber(),
    dpp: D(invoice.dpp).toNumber(),
    ppnRate: D(invoice.ppnRate).toNumber(),
    ppnAmount: D(invoice.ppnAmount).toNumber(),
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    taxInvoiceNumber: invoice.taxInvoiceNumber,
    taxInvoiceDate: invoice.taxInvoiceDate?.toISOString().slice(0, 10) ?? null,
    journalEntryId: invoice.journalEntryId,
    items: invoice.items.map((item) => {
      const creditedQuantity = item.creditItems.reduce((acc, creditItem) => acc.plus(D(creditItem.quantity)), D(0));
      return {
        id: item.id,
        description: item.description,
        quantity: D(item.quantity).toNumber(),
        unitPrice: D(item.unitPrice).toNumber(),
        discountPercent: D(item.discountPercent).toNumber(),
        amount: D(item.amount).toNumber(),
        creditedQuantity: creditedQuantity.toNumber(),
      };
    }),
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      date: payment.date.toISOString().slice(0, 10),
      amount: D(payment.amount).toNumber(),
      withheldAmount: 0,
      bankAmount: D(payment.amount).toNumber(),
      bankAccountName: payment.bankAccount.name,
      reference: payment.reference,
      note: payment.note,
      journalEntryId: payment.journalEntryId,
      voided: payment.voidedAt !== null,
      voidedAt: payment.voidedAt?.toISOString() ?? null,
    })),
    returns: invoice.creditNotes.map((note) => ({
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
    canReturn: invoice.status !== "DRAFT" && invoice.status !== "VOID" && outstanding.greaterThan(0),
    canUpdateTax:
      invoice.company.isPkp &&
      invoice.status !== "DRAFT" &&
      invoice.status !== "VOID" &&
      invoice.taxInvoiceStatus !== "CANCELLED",
  };
}

export async function voidSalesInvoice(actor: Actor, invoiceId: string): Promise<void> {
  await withFinancialTx(async (tx) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: invoiceId, companyId: actor.companyId },
      include: { payments: { where: { voidedAt: null }, select: { id: true } } },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur tidak ditemukan.");
    if (invoice.status === "VOID") throw new DomainError("INVALID_STATUS", "Faktur sudah dibatalkan.");
    if (invoice.status === "DRAFT") {
      await tx.salesInvoice.update({ where: { id: invoice.id }, data: { status: "VOID" } });
    } else {
      if (invoice.payments.length > 0) {
        throw new DomainError("INVALID_STATUS", "Batalkan pembayaran terlebih dahulu sebelum membatalkan faktur.");
      }
      if (!D(invoice.creditedAmount).isZero()) {
        throw new DomainError("INVALID_STATUS", "Faktur memiliki nota kredit dan tidak dapat dibatalkan.");
      }
      if (!invoice.journalEntryId) throw new DomainError("INVALID_STATUS", "Faktur tidak memiliki jurnal.");
      const reversal = await reverseDocumentJournal(
        tx,
        actor,
        invoice.journalEntryId,
        `Pembatalan faktur ${invoice.number}`,
      );
      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: { status: "VOID", voidJournalEntryId: reversal.id },
      });
    }
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "VOID",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      summary: `Membatalkan faktur penjualan ${invoice.number}`,
    });
  });
}

const TAX_TRANSITIONS: Record<TaxInvoiceStatus, TaxInvoiceStatus[]> = {
  NONE: ["DRAFT", "SUBMITTED"],
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  REJECTED: ["DRAFT", "SUBMITTED", "CANCELLED"],
  CANCELLED: [],
};

export async function updateSalesTaxInvoice(
  actor: Actor,
  input: { invoiceId: string; status: TaxInvoiceStatus; number?: string | null; date?: Date | null },
): Promise<void> {
  await withFinancialTx(async (tx) => {
    const invoice = await tx.salesInvoice.findFirst({
      where: { id: input.invoiceId, companyId: actor.companyId },
      include: { company: { select: { isPkp: true } } },
    });
    if (!invoice) throw new DomainError("NOT_FOUND", "Faktur tidak ditemukan.");
    if (!invoice.company.isPkp) throw new DomainError("INVALID_INPUT", "Perusahaan belum dikukuhkan sebagai PKP.");
    if (invoice.status === "DRAFT" || invoice.status === "VOID") {
      throw new DomainError("INVALID_STATUS", "Faktur pajak hanya untuk faktur yang sudah diposting.");
    }
    if (input.status !== invoice.taxInvoiceStatus) {
      const allowed = TAX_TRANSITIONS[invoice.taxInvoiceStatus];
      if (!allowed.includes(input.status)) {
        throw new DomainError(
          "INVALID_STATUS",
          `Status faktur pajak tidak dapat berubah dari ${invoice.taxInvoiceStatus} ke ${input.status}.`,
        );
      }
    }
    if ((input.status === "SUBMITTED" || input.status === "APPROVED") && !input.number?.trim() && !invoice.taxInvoiceNumber) {
      throw new DomainError("INVALID_INPUT", "Nomor faktur pajak wajib diisi sebelum dilaporkan.");
    }
    await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        taxInvoiceStatus: input.status,
        taxInvoiceNumber: input.number?.trim() || invoice.taxInvoiceNumber,
        taxInvoiceDate: input.date ?? invoice.taxInvoiceDate,
      },
    });
    await writeAudit(tx, {
      companyId: actor.companyId,
      userId: actor.userId,
      action: "UPDATE_TAX",
      entityType: "SalesInvoice",
      entityId: invoice.id,
      summary: `Status faktur pajak ${invoice.number}: ${invoice.taxInvoiceStatus} → ${input.status}`,
    });
  });
}
