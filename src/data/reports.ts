// ============================================================================
// FinCorp Indonesia - Reports Mock Data
// ============================================================================

import type { FinancialReport, ReportItem } from './types';

export const profitLossReport: FinancialReport = {
  title: 'Laporan Laba Rugi',
  period: 'Jan - Dec 2026',
  previousPeriod: 'Jan - Dec 2025',
  items: [
    // Revenue Section
    { name: 'Pendapatan (Revenue)', isSectionHeader: true },
    { name: 'Pendapatan Usaha', currentPeriod: 24500000000, previousPeriod: 21777000000, variance: 12.5 },
    { name: 'Retur Penjualan', currentPeriod: -500000000, previousPeriod: -450000000, variance: 11.1 },
    { name: 'Total Pendapatan Bersih', isTotal: true, currentPeriod: 24000000000, previousPeriod: 21327000000, variance: 12.5 },

    // COGS Section
    { name: 'Harga Pokok Penjualan (HPP)', isSectionHeader: true },
    { name: 'Persediaan Awal', currentPeriod: 2000000000, previousPeriod: 1800000000, variance: 11.1 },
    { name: 'Pembelian', currentPeriod: 8500000000, previousPeriod: 7500000000, variance: 13.3 },
    { name: 'Persediaan Akhir', currentPeriod: -1700000000, previousPeriod: -2000000000, variance: -15.0 },
    { name: 'Total Harga Pokok Penjualan', isTotal: true, currentPeriod: -8800000000, previousPeriod: -7300000000, variance: 20.5 },

    // Gross Profit
    { name: 'Laba Kotor (Gross Profit)', isTotal: true, currentPeriod: 15200000000, previousPeriod: 14027000000, variance: 8.4 },

    // Operating Expenses
    { name: 'Beban Operasional', isSectionHeader: true },
    { name: 'Beban Gaji & Tunjangan', currentPeriod: 1800000000, previousPeriod: 1650000000, variance: 9.1 },
    { name: 'Beban Sewa', currentPeriod: 480000000, previousPeriod: 450000000, variance: 6.7 },
    { name: 'Beban Utilitas', currentPeriod: 320000000, previousPeriod: 300000000, variance: 6.7 },
    { name: 'Beban Administrasi', currentPeriod: 890000000, previousPeriod: 850000000, variance: 4.7 },
    { name: 'Beban Marketing', currentPeriod: 650000000, previousPeriod: 580000000, variance: 12.1 },
    { name: 'Beban Penyusutan', currentPeriod: 520000000, previousPeriod: 480000000, variance: 8.3 },
    { name: 'Total Beban Operasional', isTotal: true, currentPeriod: -4660000000, previousPeriod: -4310000000, variance: 8.1 },

    // Operating Income
    { name: 'Laba Operasional', isTotal: true, currentPeriod: 10540000000, previousPeriod: 9717000000, variance: 8.5 },

    // Other Income/Expenses
    { name: 'Pendapatan Lain-lain', isSectionHeader: true },
    { name: 'Pendapatan Bunga', currentPeriod: 150000000, previousPeriod: 120000000, variance: 25.0 },
    { name: 'Keuntungan Valuta Asing', currentPeriod: 80000000, previousPeriod: 50000000, variance: 60.0 },
    { name: 'Beban Bunga', currentPeriod: -350000000, previousPeriod: -320000000, variance: 9.4 },

    // Net Profit
    { name: 'Laba Bersih Sebelum Pajak', isTotal: true, currentPeriod: 10400000000, previousPeriod: 9567000000, variance: 8.7 },
    { name: 'Beban Pajak Penghasilan', currentPeriod: -1960000000, previousPeriod: -1810000000, variance: 8.3 },
    { name: 'LABA BERSIH', isTotal: true, currentPeriod: 8450000000, previousPeriod: 7757000000, variance: 8.9 },
  ],
  totals: {
    totalRevenue: 24500000000,
    totalExpenses: 8800000000,
    grossProfit: 15200000000,
    netProfit: 8450000000,
  },
};

export const reportCategories = [
  {
    id: 'financial',
    name: 'Laporan Keuangan',
    icon: 'account_balance',
    color: 'primary',
    reports: [
      {
        id: 'balance-sheet',
        name: 'Neraca Saldo (Balance Sheet)',
        description: 'Posisi aset, kewajiban, dan ekuitas per tanggal tertentu.',
      },
      {
        id: 'profit-loss',
        name: 'Laba Rugi (Profit & Loss)',
        description: 'Rincian pendapatan, HPP, dan beban operasional.',
      },
      {
        id: 'cash-flow',
        name: 'Arus Kas (Cash Flow)',
        description: 'Aktivitas operasi, investasi, dan pendanaan.',
      },
    ],
  },
  {
    id: 'operational',
    name: 'Penjualan & Pembelian',
    icon: 'inventory_2',
    color: 'secondary',
    reports: [
      {
        id: 'sales-ledger',
        name: 'Buku Besar Penjualan',
        description: 'Rincian faktur per pelanggan dan item.',
      },
      {
        id: 'ar-aging',
        name: 'Umur Piutang (AR Aging)',
        description: 'Monitoring tagihan jatuh tempo.',
      },
      {
        id: 'purchase-reconciliation',
        name: 'Laporan Rekonsiliasi Pembelian',
        description: 'Pencocokan PO, Penerimaan Barang, dan Tagihan.',
      },
    ],
  },
  {
    id: 'tax',
    name: 'Laporan Pajak',
    icon: 'account_balance_wallet',
    color: 'danger',
    reports: [
      {
        id: 'ppn-recap',
        name: 'Rekap PPN Masukan/Keluaran',
        description: 'Basis SPT Masa PPN.',
      },
      {
        id: 'pph-23',
        name: 'Bukti Potong PPh 23',
        description: 'Daftar pemotongan pajak atas jasa.',
      },
      {
        id: 'equalization',
        name: 'Equalisasi Pendapatan',
        description: 'Komparasi GL vs SPT PPN.',
        isPremium: true,
      },
    ],
  },
];