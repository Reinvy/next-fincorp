// ============================================================================
// FinCorp Indonesia - Type Definitions
// ============================================================================

// Common Types
export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD';
export type TransactionStatus = 'DRAFT' | 'POSTED' | 'CANCELLED' | 'PAID' | 'OVERDUE' | 'UNPAID';
export type TaxStatus = 'APPROVED' | 'PENDING' | 'REJECTED';
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

// ============================================================================
// Company & User Types
// ============================================================================

export interface Company {
  id: string;
  name: string;
  npwp: string;
  nib: string;
  pkpNumber: string;
  pkpDate: string;
  address: string;
  email: string;
  phone: string;
  kpp: string;
  isPkpActive: boolean;
  fiscalYearStart: number; // Month (1-12)
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  avatar?: string;
}

// ============================================================================
// Chart of Accounts Types
// ============================================================================

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  level: number;
  currency: Currency;
  isActive: boolean;
  taxMapping?: string;
  balance: number;
  children?: Account[];
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface TransactionLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface Transaction {
  id: string;
  type: 'SALES' | 'PURCHASE' | 'CASH_IN' | 'CASH_OUT' | 'JOURNAL';
  date: string;
  dueDate: string;
  referenceNumber: string;
  description: string;
  totalAmount: number;
  taxAmount: number;
  status: TransactionStatus;
  lines: TransactionLine[];
  customerId?: string;
  customerName?: string;
  vendorId?: string;
  vendorName?: string;
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// Sales Types
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  npwp: string;
  email: string;
  phone: string;
  address: string;
}

export interface Vendor {
  id: string;
  name: string;
  npwp: string;
  email: string;
  phone: string;
  address: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerNpwp: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  dpp: number; // Dasar Pengenaan Pajak
  ppnRate: number;
  ppnAmount: number;
  grandTotal: number;
  status: TransactionStatus;
  hasTaxInvoice: boolean;
  taxInvoiceNumber?: string;
  notes?: string;
  paymentTerms?: string;
}

// ============================================================================
// Purchase Types
// ============================================================================

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  vendorId: string;
  vendorName: string;
  items: InvoiceItem[];
  subtotal: number;
  dpp: number;
  ppnRate: number;
  ppnAmount: number;
  grandTotal: number;
  status: TransactionStatus;
}

// ============================================================================
// Cash & Bank Types
// ============================================================================

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  type: 'CASH' | 'BANK';
  currency: Currency;
  balance: number;
  lastTransactionDate: string;
  changePercent: number;
}

export interface CashTransaction {
  id: string;
  date: string;
  description: string;
  accountId: string;
  accountName: string;
  category: string;
  amount: number;
  type: 'IN' | 'OUT';
  balance: number;
}

// ============================================================================
// Fixed Assets Types
// ============================================================================

export interface FixedAsset {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  usefulLife: number; // in years
  accumulatedDepreciation: number;
  netBookValue: number;
  status: 'ACTIVE' | 'DISPOSED' | 'REVALUED';
  depreciationMethod: 'STRAIGHT_LINE' | 'DECLINING_BALANCE';
}

// ============================================================================
// Tax Types
// ============================================================================

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  dpp: number;
  ppn: number;
  status: TaxStatus;
}

export interface TaxSummary {
  ppnOut: number;
  ppnOutCount: number;
  ppnOutDpp: number;
  ppnIn: number;
  ppnInCount: number;
  ppnInDpp: number;
  ppnPayable: number;
  dueDate: string;
}

export interface PPhSummary {
  type: string;
  description: string;
  amount: number;
}

// ============================================================================
// Reports Types
// ============================================================================

export interface ReportItem {
  name: string;
  description?: string;
  currentPeriod?: number;
  previousPeriod?: number;
  variance?: number;
  isSectionHeader?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface FinancialReport {
  title: string;
  period: string;
  previousPeriod: string;
  items: ReportItem[];
  totals: {
    totalRevenue?: number;
    totalExpenses?: number;
    grossProfit?: number;
    netProfit?: number;
  };
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface KPICard {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  changePercent: number;
  changeDirection: 'up' | 'down';
  icon: string;
  color: 'default' | 'success' | 'danger' | 'warning';
  link?: string;
  extraInfo?: string;
}

export interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
}

export interface AgingItem {
  name: string;
  amount: number;
  days: number;
  category: 'overdue' | 'warning' | 'normal';
}

export interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  link?: string;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface CompanySettings {
  company: Company;
  fiscalYear: {
    startMonth: number;
    startDay: number;
  };
  taxSettings: {
    ppnRate: number;
    defaultTaxAccount: string;
  };
}