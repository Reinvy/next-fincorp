// ============================================================================
// FinCorp Indonesia - Tax Module Mock Data
// ============================================================================

import type { TaxInvoice, TaxSummary, PPhSummary } from './types';

export const taxInvoices: TaxInvoice[] = [
  {
    id: 'tax-001',
    invoiceNumber: '010.000-23.98765432',
    date: '2023-09-12',
    customerName: 'PT Maju Bersama Abadi',
    dpp: 50000000,
    ppn: 5500000,
    status: 'APPROVED',
  },
  {
    id: 'tax-002',
    invoiceNumber: '010.000-23.98765433',
    date: '2023-09-14',
    customerName: 'CV Karya Nusa',
    dpp: 12500000,
    ppn: 1375000,
    status: 'PENDING',
  },
  {
    id: 'tax-003',
    invoiceNumber: '010.000-23.98765434',
    date: '2023-09-15',
    customerName: 'PT Teknologi Solusi',
    dpp: 85000000,
    ppn: 9350000,
    status: 'REJECTED',
  },
  {
    id: 'tax-004',
    invoiceNumber: '010.000-23.98765435',
    date: '2023-09-18',
    customerName: 'PT Indah Sentosa',
    dpp: 25000000,
    ppn: 2750000,
    status: 'APPROVED',
  },
  {
    id: 'tax-005',
    invoiceNumber: '010.000-23.98765436',
    date: '2023-09-20',
    customerName: 'Toko Elektronik Jaya',
    dpp: 15000000,
    ppn: 1650000,
    status: 'APPROVED',
  },
  {
    id: 'tax-006',
    invoiceNumber: '010.000-23.98765437',
    date: '2023-09-22',
    customerName: 'CV Maju Mundur',
    dpp: 32000000,
    ppn: 3520000,
    status: 'PENDING',
  },
];

export const taxSummary: TaxSummary = {
  ppnOut: 450250000,
  ppnOutCount: 124,
  ppnOutDpp: 4093181818,
  ppnIn: 310100000,
  ppnInCount: 86,
  ppnInDpp: 2819090909,
  ppnPayable: 140150000,
  dueDate: '2023-10-31',
};

export const pphSummary: PPhSummary[] = [
  {
    type: 'PPh Pasal 21',
    description: 'Gaji & Upah',
    amount: 12500000,
  },
  {
    type: 'PPh Pasal 23',
    description: 'Jasa & Sewa',
    amount: 3250000,
  },
  {
    type: 'PPh Pasal 4(2)',
    description: 'Final',
    amount: 1100000,
  },
];

export const sptTimeline = [
  {
    id: 'step-1',
    label: 'Posting Data',
    completedAt: '2023-10-15',
    status: 'completed',
  },
  {
    id: 'step-2',
    label: 'Bayar SSP',
    dueDate: '2023-10-31',
    status: 'current',
  },
  {
    id: 'step-3',
    label: 'Lapor SPT (Web e-Faktur)',
    status: 'pending',
  },
];

export const taxStats = {
  pendingApproval: 8,
  approvedThisMonth: 45,
  rejectedCount: 3,
  totalPpnPayable: 140150000,
};