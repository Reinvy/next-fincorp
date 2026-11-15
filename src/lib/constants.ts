import type { Role } from "@/lib/types";

export const APP_NAME = "FinCorp";
export const PAGE_SIZE = 20;
export const LEDGER_PAGE_SIZE = 50;
export const MAX_CSV_ROWS = 2000;
export const MAX_LOGO_BYTES = 512 * 1024;
export const COMPANY_COOKIE = "fincorp_company";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  ACCOUNTANT: "Akuntan",
  VIEWER: "Pengamat",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  UNPAID: "Belum Dibayar",
  PARTIAL: "Dibayar Sebagian",
  PAID: "Lunas",
  VOID: "Dibatalkan",
};

export const JOURNAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draf",
  POSTED: "Terposting",
};

export const TAX_INVOICE_STATUS_LABELS: Record<string, string> = {
  NONE: "Belum Ada",
  DRAFT: "Draf",
  SUBMITTED: "Dilaporkan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  FULLY_DEPRECIATED: "Habis Susut",
  DISPOSED: "Dilepas",
};

export const PERIOD_STATUS_LABELS: Record<string, string> = {
  OPEN: "Terbuka",
  CLOSED: "Ditutup",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: "Baru",
  IN_PROGRESS: "Diproses",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
};

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  ACCOUNTING: "Akuntansi",
  TAX: "Pajak",
  TECHNICAL: "Teknis",
  BILLING: "Tagihan",
  OTHER: "Lainnya",
};

export const TAX_TYPE_LABELS: Record<string, string> = {
  PPN: "PPN",
  PPH21: "PPh 21",
  PPH22: "PPh 22",
  PPH23: "PPh 23",
  PPH4_2: "PPh 4(2)",
  PPH25: "PPh 25",
  PPH29: "PPh 29",
};

export const WITHHOLDING_LABELS: Record<string, string> = {
  NONE: "Tanpa potongan",
  PPH21: "PPh 21",
  PPH22: "PPh 22",
  PPH23: "PPh 23",
  PPH4_2: "PPh 4(2)",
};

export const REPORT_GROUP_LABELS: Record<string, string> = {
  CURRENT_ASSET: "Aset Lancar",
  FIXED_ASSET: "Aset Tetap",
  ACCUMULATED_DEPRECIATION: "Akumulasi Penyusutan",
  OTHER_ASSET: "Aset Lainnya",
  CURRENT_LIABILITY: "Liabilitas Jangka Pendek",
  LONG_TERM_LIABILITY: "Liabilitas Jangka Panjang",
  EQUITY: "Ekuitas",
  REVENUE: "Pendapatan",
  CONTRA_REVENUE: "Retur & Potongan Penjualan",
  COST_OF_GOODS_SOLD: "Beban Pokok Penjualan",
  CONTRA_COGS: "Retur Pembelian",
  OPERATING_EXPENSE: "Beban Operasional",
  OTHER_INCOME: "Pendapatan Lain-lain",
  OTHER_EXPENSE: "Beban Lain-lain",
  TAX_EXPENSE: "Beban Pajak Penghasilan",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: "Aset",
  LIABILITY: "Liabilitas",
  EQUITY: "Ekuitas",
  REVENUE: "Pendapatan",
  EXPENSE: "Beban",
};

export const JOURNAL_TYPE_LABELS: Record<string, string> = {
  SALES: "Penjualan",
  PURCHASE: "Pembelian",
  PAYMENT_IN: "Penerimaan",
  PAYMENT_OUT: "Pembayaran",
  CASH_IN: "Kas Masuk",
  CASH_OUT: "Kas Keluar",
  TRANSFER: "Transfer",
  DEPRECIATION: "Penyusutan",
  DISPOSAL: "Pelepasan",
  CREDIT_NOTE: "Nota Kredit",
  DEBIT_NOTE: "Nota Debit",
  TAX: "Pajak",
  OPENING: "Saldo Awal",
  MANUAL: "Manual",
  REVERSAL: "Pembalik",
};

export const DEADLINE_CATEGORY_LABELS: Record<string, string> = {
  TAX: "Pajak",
  INVOICE: "Faktur",
  PAYMENT: "Pembayaran",
  CLOSING: "Tutup Buku",
  OTHER: "Lainnya",
};

export const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];
