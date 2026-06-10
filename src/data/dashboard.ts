// ============================================================================
// FinCorp Indonesia - Dashboard Mock Data
// ============================================================================

import type { KPICard, CashFlowData, AgingItem, AlertItem } from './types';

export const kpiCards: KPICard[] = [
  {
    id: 'kpi-cash',
    title: 'Total Kas/Bank',
    value: 1450230000,
    formattedValue: 'Rp 1.450.230.000',
    changePercent: 2.4,
    changeDirection: 'up',
    icon: 'account_balance_wallet',
    color: 'default',
    link: '/cash-bank',
  },
  {
    id: 'kpi-receivable',
    title: 'Piutang Usaha',
    value: 845500000,
    formattedValue: 'Rp 845.500.000',
    changePercent: 12.1,
    changeDirection: 'up',
    icon: 'arrow_downward',
    color: 'danger',
    extraInfo: '30% Overdue',
    link: '/reports/aging-receivable',
  },
  {
    id: 'kpi-payable',
    title: 'Hutang Usaha',
    value: 320100000,
    formattedValue: 'Rp 320.100.000',
    changePercent: 5.2,
    changeDirection: 'down',
    icon: 'arrow_upward',
    color: 'success',
    extraInfo: 'Jatuh tempo minggu ini: Rp 45jt',
  },
  {
    id: 'kpi-ppn',
    title: 'PPN Terutang (Kurang Bayar)',
    value: 125400000,
    formattedValue: 'Rp 125.400.000',
    changePercent: 0,
    changeDirection: 'up',
    icon: 'receipt',
    color: 'danger',
    link: '/tax',
  },
];

export const cashFlowData: CashFlowData[] = [
  { month: 'Jan', inflow: 3200000000, outflow: 2400000000 },
  { month: 'Feb', inflow: 4500000000, outflow: 3100000000 },
  { month: 'Mar', inflow: 2800000000, outflow: 3800000000 },
  { month: 'Apr', inflow: 5200000000, outflow: 3500000000 },
  { month: 'Mei', inflow: 3900000000, outflow: 2800000000 },
  { month: 'Jun', inflow: 4800000000, outflow: 3200000000 },
];

export const agingReceivables: AgingItem[] = [
  {
    name: 'PT Maju Mundur Sejahtera',
    amount: 45000000,
    days: 75,
    category: 'overdue',
  },
  {
    name: 'CV Sejahtera Abadi',
    amount: 21500000,
    days: 45,
    category: 'warning',
  },
  {
    name: 'Toko Budi Elektronik',
    amount: 12000000,
    days: 35,
    category: 'warning',
  },
  {
    name: 'PT Sinar Emas',
    amount: 85000000,
    days: 15,
    category: 'normal',
  },
  {
    name: 'Koperasi Unit Desa',
    amount: 5500000,
    days: 10,
    category: 'normal',
  },
];

export const incomeSummary = {
  revenue: {
    label: 'Pendapatan',
    value: 4200000000,
    percentage: 85,
    color: 'success',
  },
  expenses: {
    label: 'HPP & Biaya',
    value: 2800000000,
    percentage: 65,
    color: 'warning',
  },
  netProfit: 1400000000,
};

export const alerts: AlertItem[] = [
  {
    id: 'alert-1',
    type: 'warning',
    title: 'Peringatan Deadline Pelaporan',
    message: 'SPT Masa PPN untuk periode September harus dilaporkan paling lambat tanggal 31 Oktober. Terdapat 3 faktur masukan yang belum di-kreditkan.',
    link: '/tax',
  },
];

export const quickStats = {
  totalActiveAccounts: 342,
  pendingJournalEntries: 5,
  unreadNotifications: 3,
  upcomingDeadlines: 2,
};