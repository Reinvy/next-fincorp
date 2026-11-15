import type { AccountType, NormalBalance, ReportGroup, SystemRole } from "@/lib/types";

export interface TemplateAccount {
  code: string;
  name: string;
  type: AccountType;
  reportGroup: ReportGroup;
  systemRole: SystemRole;
  normalBalance: NormalBalance;
  parentCode: string | null;
}

/** Standard Indonesian trading-company chart of accounts seeded for every company. */
export const COA_TEMPLATE: TemplateAccount[] = [
  { code: "1000", name: "Aset Lancar", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "NONE", normalBalance: "DEBIT", parentCode: null },
  { code: "1100", name: "Kas & Setara Kas", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "1000" },
  { code: "1110", name: "Kas", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "1100" },
  { code: "1111", name: "Kas Kecil", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "CASH", normalBalance: "DEBIT", parentCode: "1110" },
  { code: "1112", name: "Kas Operasional", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "CASH", normalBalance: "DEBIT", parentCode: "1110" },
  { code: "1120", name: "Bank", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "1100" },
  { code: "1121", name: "Bank BCA", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "BANK", normalBalance: "DEBIT", parentCode: "1120" },
  { code: "1122", name: "Bank Mandiri", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "BANK", normalBalance: "DEBIT", parentCode: "1120" },
  { code: "1130", name: "Piutang Usaha", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "ACCOUNTS_RECEIVABLE", normalBalance: "DEBIT", parentCode: "1000" },
  { code: "1140", name: "PPN Masukan", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "VAT_INPUT", normalBalance: "DEBIT", parentCode: "1000" },
  { code: "1150", name: "Persediaan Barang Dagang", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "INVENTORY", normalBalance: "DEBIT", parentCode: "1000" },
  { code: "1160", name: "Sewa Dibayar di Muka", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "1000" },
  { code: "1170", name: "PPN Lebih Bayar", type: "ASSET", reportGroup: "CURRENT_ASSET", systemRole: "VAT_RECEIVABLE", normalBalance: "DEBIT", parentCode: "1000" },
  { code: "1200", name: "Aset Tetap", type: "ASSET", reportGroup: "FIXED_ASSET", systemRole: "NONE", normalBalance: "DEBIT", parentCode: null },
  { code: "1210", name: "Peralatan Kantor", type: "ASSET", reportGroup: "FIXED_ASSET", systemRole: "FIXED_ASSET", normalBalance: "DEBIT", parentCode: "1200" },
  { code: "1211", name: "Akumulasi Penyusutan Peralatan Kantor", type: "ASSET", reportGroup: "ACCUMULATED_DEPRECIATION", systemRole: "ACCUMULATED_DEPRECIATION", normalBalance: "CREDIT", parentCode: "1200" },
  { code: "1220", name: "Kendaraan", type: "ASSET", reportGroup: "FIXED_ASSET", systemRole: "FIXED_ASSET", normalBalance: "DEBIT", parentCode: "1200" },
  { code: "1221", name: "Akumulasi Penyusutan Kendaraan", type: "ASSET", reportGroup: "ACCUMULATED_DEPRECIATION", systemRole: "ACCUMULATED_DEPRECIATION", normalBalance: "CREDIT", parentCode: "1200" },
  { code: "1230", name: "Bangunan", type: "ASSET", reportGroup: "FIXED_ASSET", systemRole: "FIXED_ASSET", normalBalance: "DEBIT", parentCode: "1200" },
  { code: "1231", name: "Akumulasi Penyusutan Bangunan", type: "ASSET", reportGroup: "ACCUMULATED_DEPRECIATION", systemRole: "ACCUMULATED_DEPRECIATION", normalBalance: "CREDIT", parentCode: "1200" },
  { code: "2000", name: "Liabilitas Jangka Pendek", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "NONE", normalBalance: "CREDIT", parentCode: null },
  { code: "2110", name: "Utang Usaha", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "ACCOUNTS_PAYABLE", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2120", name: "PPN Keluaran", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "VAT_OUTPUT", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2130", name: "Utang PPh 21", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "WITHHOLDING_PAYABLE", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2140", name: "Utang PPh 23", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "WITHHOLDING_PAYABLE", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2145", name: "Utang PPh 22", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "WITHHOLDING_PAYABLE", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2150", name: "Utang PPh 4(2)", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "WITHHOLDING_PAYABLE", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2160", name: "Utang PPh 25/29", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "TAX_PAYABLE", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2170", name: "Utang PPN", type: "LIABILITY", reportGroup: "CURRENT_LIABILITY", systemRole: "VAT_PAYABLE", normalBalance: "CREDIT", parentCode: "2000" },
  { code: "2200", name: "Liabilitas Jangka Panjang", type: "LIABILITY", reportGroup: "LONG_TERM_LIABILITY", systemRole: "NONE", normalBalance: "CREDIT", parentCode: null },
  { code: "3000", name: "Ekuitas", type: "EQUITY", reportGroup: "EQUITY", systemRole: "NONE", normalBalance: "CREDIT", parentCode: null },
  { code: "3100", name: "Modal Disetor", type: "EQUITY", reportGroup: "EQUITY", systemRole: "EQUITY", normalBalance: "CREDIT", parentCode: "3000" },
  { code: "3200", name: "Saldo Awal", type: "EQUITY", reportGroup: "EQUITY", systemRole: "OPENING_BALANCE", normalBalance: "CREDIT", parentCode: "3000" },
  { code: "3900", name: "Laba Ditahan", type: "EQUITY", reportGroup: "EQUITY", systemRole: "RETAINED_EARNINGS", normalBalance: "CREDIT", parentCode: "3000" },
  { code: "4000", name: "Pendapatan", type: "REVENUE", reportGroup: "REVENUE", systemRole: "NONE", normalBalance: "CREDIT", parentCode: null },
  { code: "4110", name: "Pendapatan Jasa", type: "REVENUE", reportGroup: "REVENUE", systemRole: "SALES_REVENUE", normalBalance: "CREDIT", parentCode: "4000" },
  { code: "4120", name: "Pendapatan Barang", type: "REVENUE", reportGroup: "REVENUE", systemRole: "NONE", normalBalance: "CREDIT", parentCode: "4000" },
  { code: "4130", name: "Pendapatan Lain-lain", type: "REVENUE", reportGroup: "OTHER_INCOME", systemRole: "OTHER_INCOME", normalBalance: "CREDIT", parentCode: "4000" },
  { code: "4200", name: "Retur & Potongan Penjualan", type: "REVENUE", reportGroup: "CONTRA_REVENUE", systemRole: "SALES_RETURN", normalBalance: "DEBIT", parentCode: "4000" },
  { code: "5000", name: "Beban Pokok Penjualan", type: "EXPENSE", reportGroup: "COST_OF_GOODS_SOLD", systemRole: "COST_OF_GOODS_SOLD", normalBalance: "DEBIT", parentCode: null },
  { code: "5100", name: "Retur Pembelian", type: "EXPENSE", reportGroup: "CONTRA_COGS", systemRole: "PURCHASE_RETURN", normalBalance: "CREDIT", parentCode: null },
  { code: "6000", name: "Beban Operasional", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: null },
  { code: "6110", name: "Beban Gaji & Upah", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6120", name: "Beban Sewa", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6130", name: "Beban Listrik & Air", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6140", name: "Beban Internet & Telepon", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6150", name: "Beban Perlengkapan", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6160", name: "Beban Pemasaran", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6170", name: "Beban Penyusutan", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "DEPRECIATION_EXPENSE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6180", name: "Beban Administrasi Bank", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "BANK_FEE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6190", name: "Beban Operasional Lain", type: "EXPENSE", reportGroup: "OPERATING_EXPENSE", systemRole: "OTHER_EXPENSE", normalBalance: "DEBIT", parentCode: "6000" },
  { code: "6900", name: "Beban Lain-lain", type: "EXPENSE", reportGroup: "OTHER_EXPENSE", systemRole: "OTHER_EXPENSE", normalBalance: "DEBIT", parentCode: null },
  { code: "6910", name: "Kerugian Pelepasan Aset", type: "EXPENSE", reportGroup: "OTHER_EXPENSE", systemRole: "LOSS_ON_DISPOSAL", normalBalance: "DEBIT", parentCode: "6900" },
  { code: "6920", name: "Keuntungan Pelepasan Aset", type: "REVENUE", reportGroup: "OTHER_INCOME", systemRole: "GAIN_ON_DISPOSAL", normalBalance: "CREDIT", parentCode: "4000" },
  { code: "7000", name: "Beban Pajak Penghasilan", type: "EXPENSE", reportGroup: "TAX_EXPENSE", systemRole: "NONE", normalBalance: "DEBIT", parentCode: null },
];

export const TEMPLATE_BY_CODE = new Map(COA_TEMPLATE.map((account) => [account.code, account]));

export const DEFAULT_CHART_OF_ACCOUNTS = COA_TEMPLATE;
