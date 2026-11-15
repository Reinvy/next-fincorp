/**
 * Plain string unions shared by services, seed scripts and client components.
 * Deliberately free of Prisma/Next imports so Client Components can use them.
 */
export type Role = "ADMIN" | "ACCOUNTANT" | "VIEWER";
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type ReportGroup =
  | "CURRENT_ASSET"
  | "FIXED_ASSET"
  | "ACCUMULATED_DEPRECIATION"
  | "OTHER_ASSET"
  | "CURRENT_LIABILITY"
  | "LONG_TERM_LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "CONTRA_REVENUE"
  | "COST_OF_GOODS_SOLD"
  | "CONTRA_COGS"
  | "OPERATING_EXPENSE"
  | "OTHER_INCOME"
  | "OTHER_EXPENSE"
  | "TAX_EXPENSE";
export type SystemRole =
  | "NONE"
  | "CASH"
  | "BANK"
  | "ACCOUNTS_RECEIVABLE"
  | "VAT_INPUT"
  | "INVENTORY"
  | "FIXED_ASSET"
  | "ACCUMULATED_DEPRECIATION"
  | "ACCOUNTS_PAYABLE"
  | "VAT_OUTPUT"
  | "VAT_PAYABLE"
  | "VAT_RECEIVABLE"
  | "WITHHOLDING_PAYABLE"
  | "TAX_PAYABLE"
  | "SALES_REVENUE"
  | "SALES_RETURN"
  | "PURCHASE_RETURN"
  | "OTHER_INCOME"
  | "COST_OF_GOODS_SOLD"
  | "DEPRECIATION_EXPENSE"
  | "BANK_FEE"
  | "LOSS_ON_DISPOSAL"
  | "GAIN_ON_DISPOSAL"
  | "RETAINED_EARNINGS"
  | "OPENING_BALANCE"
  | "EQUITY";
export type JournalType =
  | "SALES"
  | "PURCHASE"
  | "PAYMENT_IN"
  | "PAYMENT_OUT"
  | "CASH_IN"
  | "CASH_OUT"
  | "TRANSFER"
  | "DEPRECIATION"
  | "DISPOSAL"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "TAX"
  | "OPENING"
  | "MANUAL"
  | "REVERSAL";
export type JournalStatus = "DRAFT" | "POSTED";
export type SourceType =
  | "SALES_INVOICE"
  | "PURCHASE_INVOICE"
  | "SALES_PAYMENT"
  | "PURCHASE_PAYMENT"
  | "SALES_CREDIT_NOTE"
  | "PURCHASE_DEBIT_NOTE"
  | "CASH_TRANSACTION"
  | "BANK_TRANSFER"
  | "DEPRECIATION_RUN"
  | "ASSET_ACQUISITION"
  | "ASSET_DISPOSAL"
  | "TAX_PAYMENT"
  | "OPENING_BALANCE"
  | "MANUAL"
  | "REVERSAL";
export type DocumentStatus = "DRAFT" | "UNPAID" | "PARTIAL" | "PAID" | "VOID";
export type TaxInvoiceStatus = "NONE" | "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
export type WithholdingType = "NONE" | "PPH21" | "PPH22" | "PPH23" | "PPH4_2";
export type TaxType = "PPN" | "PPH21" | "PPH22" | "PPH23" | "PPH4_2" | "PPH25" | "PPH29";
export type BankAccountType = "CASH" | "BANK";
export type BankCardTheme = "FOREST" | "MUSTARD" | "SKY" | "VERMILION" | "INK";
export type CashDirection = "IN" | "OUT";
export type BankStatementStatus = "UNMATCHED" | "MATCHED" | "IGNORED";
export type DepreciationMethod = "STRAIGHT_LINE" | "DECLINING_BALANCE";
export type AssetStatus = "ACTIVE" | "FULLY_DEPRECIATED" | "DISPOSED";
export type AssetFundingType = "CASH" | "BANK";
export type PeriodStatus = "OPEN" | "CLOSED";
export type DeadlineCategory = "TAX" | "INVOICE" | "PAYMENT" | "CLOSING" | "OTHER";
export type TicketCategory = "ACCOUNTING" | "TAX" | "TECHNICAL" | "BILLING" | "OTHER";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

/** Authenticated user scoped to one company. Every service call takes one. */
export interface Actor {
  userId: string;
  companyId: string;
  role: Role;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string; redirectTo?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

export const IDLE_STATE: ActionState = { status: "idle" };
