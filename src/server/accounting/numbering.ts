import type { Tx } from "@/lib/prisma";

/**
 * Atomic per-company, per-key document counter. Must run inside the same
 * transaction that creates the document so numbers cannot be reused.
 */
export async function nextDocumentNumber(
  tx: Tx,
  companyId: string,
  key: string,
  prefix: string,
  date: Date,
): Promise<string> {
  const counter = await tx.documentCounter.upsert({
    where: { companyId_key: { companyId, key } },
    create: { companyId, key, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });
  const year = date.getUTCFullYear();
  return `${prefix}/${year}/${String(counter.value).padStart(4, "0")}`;
}

export const DOCUMENT_KEYS = {
  SALES_INVOICE: { key: "SALES_INVOICE", prefix: "INV" },
  PURCHASE_INVOICE: { key: "PURCHASE_INVOICE", prefix: "PUR" },
  JOURNAL: { key: "JOURNAL", prefix: "JV" },
  SALES_CREDIT_NOTE: { key: "SALES_CREDIT_NOTE", prefix: "CN" },
  PURCHASE_DEBIT_NOTE: { key: "PURCHASE_DEBIT_NOTE", prefix: "DN" },
  SUPPORT_TICKET: { key: "SUPPORT_TICKET", prefix: "TKT" },
  ASSET: { key: "ASSET", prefix: "AST" },
} as const;
