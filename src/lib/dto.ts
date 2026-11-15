import type {
  AccountType,
  AssetStatus,
  BankAccountType,
  BankCardTheme,
  CashDirection,
  DeadlineCategory,
  DepreciationMethod,
  DocumentStatus,
  JournalStatus,
  JournalType,
  NormalBalance,
  ReportGroup,
  Role,
  SourceType,
  SystemRole,
  TaxInvoiceStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  WithholdingType,
} from "@/lib/types";

/**
 * Client-facing DTOs: money as number, dates as ISO strings, no Decimal/Date/Prisma
 * objects ever cross into a Client Component.
 */
export type MoneyNumber = number;
export type DateString = string;
export type MonthString = string;

export interface SelectOption {
  value: string;
  label: string;
}

export interface AccountOption extends SelectOption {
  name: string;
  code: string;
  type: AccountType;
  reportGroup: ReportGroup;
  systemRole: SystemRole;
  normalBalance: NormalBalance;
  isActive: boolean;
}

export interface AccountNode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: AccountType;
  reportGroup: ReportGroup;
  normalBalance: NormalBalance;
  systemRole: SystemRole;
  parentId: string | null;
  level: number;
  isActive: boolean;
  hasChildren: boolean;
  balance: MoneyNumber;
  children: AccountNode[];
}

export interface JournalLineView {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  debit: MoneyNumber;
  credit: MoneyNumber;
}

export interface JournalListItem {
  id: string;
  number: string;
  date: DateString;
  description: string;
  reference: string | null;
  type: JournalType;
  status: JournalStatus;
  sourceType: SourceType | null;
  total: MoneyNumber;
  createdAt: DateString;
}

export interface JournalDetail extends JournalListItem {
  lines: JournalLineView[];
  totalDebit: MoneyNumber;
  totalCredit: MoneyNumber;
  sourceKind: string | null;
  sourceId: string | null;
  voided: boolean;
  reversalOfId: string | null;
  postedAt: DateString | null;
  canVoid: boolean;
}

export interface BankAccountSummary {
  id: string;
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  type: BankAccountType;
  coaAccountId: string;
  coaCode: string;
  openingBalance: MoneyNumber;
  openingDate: DateString;
  cardTheme: BankCardTheme;
  isActive: boolean;
  balance: MoneyNumber;
}

export interface CashTransactionView {
  id: string;
  date: DateString;
  description: string;
  category: string;
  amount: MoneyNumber;
  direction: CashDirection;
  counterAccountName: string;
  bankAccountId: string;
  bankAccountName: string;
}

export interface TransferView {
  id: string;
  date: DateString;
  description: string;
  amount: MoneyNumber;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
}

export interface CustomerView {
  id: string;
  name: string;
  npwp: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  isActive: boolean;
  invoiceCount?: number;
}

export interface VendorView {
  id: string;
  name: string;
  npwp: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  isActive: boolean;
  invoiceCount?: number;
}

export interface InvoiceItemView {
  id: string;
  accountId?: string;
  accountName?: string;
  description: string;
  quantity: MoneyNumber;
  unitPrice: MoneyNumber;
  discountPercent: MoneyNumber;
  amount: MoneyNumber;
  creditedQuantity?: MoneyNumber;
}

export interface PaymentView {
  id: string;
  date: DateString;
  amount: MoneyNumber;
  withheldAmount: MoneyNumber;
  bankAmount: MoneyNumber;
  bankAccountName: string;
  reference: string | null;
  note: string | null;
  journalEntryId: string;
  voided: boolean;
  voidedAt: DateString | null;
}

export interface SalesInvoiceListItem {
  id: string;
  number: string;
  date: DateString;
  dueDate: DateString;
  customerName: string;
  status: DocumentStatus;
  grandTotal: MoneyNumber;
  paidAmount: MoneyNumber;
  creditedAmount: MoneyNumber;
  outstanding: MoneyNumber;
  overdue: boolean;
  taxInvoiceStatus: TaxInvoiceStatus;
}

export interface SalesInvoiceDetail extends SalesInvoiceListItem {
  customerId: string;
  customerName: string;
  customerNpwp: string | null;
  customerAddress: string | null;
  revenueAccountId: string;
  revenueAccountName: string;
  subtotal: MoneyNumber;
  discountTotal: MoneyNumber;
  dpp: MoneyNumber;
  ppnRate: MoneyNumber;
  ppnAmount: MoneyNumber;
  notes: string | null;
  paymentTerms: string | null;
  taxInvoiceNumber: string | null;
  taxInvoiceDate: DateString | null;
  journalEntryId: string | null;
  items: InvoiceItemView[];
  payments: PaymentView[];
  returns: Array<{
    id: string;
    number: string;
    date: DateString;
    total: MoneyNumber;
    reason: string;
  }>;
  canVoid: boolean;
  canPay: boolean;
  canReturn: boolean;
  canUpdateTax: boolean;
}

export interface PurchaseInvoiceListItem {
  id: string;
  number: string;
  date: DateString;
  dueDate: DateString;
  vendorName: string;
  status: DocumentStatus;
  grandTotal: MoneyNumber;
  paidAmount: MoneyNumber;
  creditedAmount: MoneyNumber;
  outstanding: MoneyNumber;
  overdue: boolean;
  withholdingType: WithholdingType;
  withholdingAmount: MoneyNumber;
}

export interface PurchaseInvoiceDetail extends PurchaseInvoiceListItem {
  vendorId: string;
  vendorNpwp: string | null;
  vendorAddress: string | null;
  subtotal: MoneyNumber;
  discountTotal: MoneyNumber;
  dpp: MoneyNumber;
  ppnRate: MoneyNumber;
  ppnAmount: MoneyNumber;
  withholdingRate: MoneyNumber;
  notes: string | null;
  journalEntryId: string | null;
  items: InvoiceItemView[];
  payments: PaymentView[];
  returns: Array<{
    id: string;
    number: string;
    date: DateString;
    total: MoneyNumber;
    reason: string;
  }>;
  canVoid: boolean;
  canPay: boolean;
  canReturn: boolean;
}

export interface CreditNoteView {
  id: string;
  number: string;
  date: DateString;
  invoiceId: string;
  invoiceNumber: string;
  partyName: string;
  reason: string;
  dpp: MoneyNumber;
  ppnAmount: MoneyNumber;
  total: MoneyNumber;
}

export interface FixedAssetView {
  id: string;
  code: string;
  name: string;
  category: string;
  purchaseDate: DateString;
  purchasePrice: MoneyNumber;
  residualValue: MoneyNumber;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  annualRate: MoneyNumber | null;
  accumulatedDepreciation: MoneyNumber;
  bookValue: MoneyNumber;
  status: AssetStatus;
  disposalDate: DateString | null;
  disposalProceeds: MoneyNumber | null;
  disposalGainLoss: MoneyNumber | null;
  assetAccountName: string;
  accumulatedAccountName: string;
  depreciationExpenseAccountName: string;
  fundingType: string;
  location: string | null;
  responsible: string | null;
  monthlyDepreciation: MoneyNumber;
}

export interface DeadlineView {
  id: string;
  title: string;
  dueDate: DateString;
  category: DeadlineCategory;
  amount: MoneyNumber | null;
  notes: string | null;
  completedAt: DateString | null;
  derived: boolean;
  href?: string;
  status: "done" | "overdue" | "soon" | "upcoming";
}

export interface SupportTicketView {
  id: string;
  number: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  createdAt: DateString;
  updatedAt: DateString;
  userName: string;
  messageCount: number;
}

export interface TeamMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: DateString;
}

export interface CompanyView {
  id: string;
  name: string;
  slug: string;
  role: Role;
  isActive: boolean;
  isPkp: boolean;
  npwp: string | null;
  city: string | null;
}

export interface AuditLogView {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  userName: string;
  createdAt: DateString;
}
