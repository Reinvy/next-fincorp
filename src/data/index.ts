// ============================================================================
// FinCorp Indonesia - Data Index
// Centralized export of all mock data
// ============================================================================

// Types
export * from './types';

// Company & User
export { company, currentUser, users } from './company';

// Chart of Accounts
export { accounts, accountCategories } from './accounts';

// Dashboard
export {
  kpiCards,
  cashFlowData,
  agingReceivables,
  incomeSummary,
  alerts,
  quickStats,
} from './dashboard';

// Sales
export { customers, salesInvoices, salesStats } from './sales';

// Purchases
export { vendors, purchaseInvoices, purchaseStats } from './purchases';

// Cash & Bank
export { bankAccounts, recentTransactions, cashSummary } from './cashbank';

// Fixed Assets
export { fixedAssets, assetSummary, assetCategories } from './assets';

// Tax
export {
  taxInvoices,
  taxSummary,
  pphSummary,
  sptTimeline,
  taxStats,
} from './tax';

// Reports
export { profitLossReport, reportCategories } from './reports';

// Utility functions for formatting
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted.replace('Rp', 'Rp ').trim();
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}