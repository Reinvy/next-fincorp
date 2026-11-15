export const DEMO_USERS = [
  { name: "Admin FinCorp", email: "admin@fincorp.id", password: "FinCorp#2026", role: "ADMIN" as const },
  { name: "Akuntan FinCorp", email: "akuntan@fincorp.id", password: "Akuntan#2026", role: "ACCOUNTANT" as const },
  { name: "Pengamat FinCorp", email: "viewer@fincorp.id", password: "Viewer#2026", role: "VIEWER" as const },
];

export const DEMO_COMPANY = {
  name: "PT FinCorp Nusantara",
  slug: "pt-fincorp-nusantara",
  npwp: "01.234.567.8-901.000",
  nib: "8120012345678",
  pkpNumber: "01.234.567.8-901.000",
  pkpDate: "2024-01-15",
  address: "Jl. Jenderal Sudirman Kav. 21",
  city: "Jakarta Selatan",
  province: "DKI Jakarta",
  postalCode: "12190",
  email: "keuangan@fincorp.id",
  phone: "021-555-0123",
  kpp: "KPP Pratama Jakarta Selatan",
  isPkp: true,
  ppnRate: "11",
  fiscalYearStartMonth: 1,
};

export const DEMO_BANKS = [
  {
    name: "Bank BCA",
    bankName: "BCA",
    accountNumber: "1234567890",
    type: "BANK" as const,
    coaCode: "1121",
    openingBalance: "900000000",
    cardTheme: "FOREST" as const,
  },
  {
    name: "Bank Mandiri",
    bankName: "Mandiri",
    accountNumber: "9876543210",
    type: "BANK" as const,
    coaCode: "1122",
    openingBalance: "75000000",
    cardTheme: "SKY" as const,
  },
  {
    name: "Kas Kecil",
    bankName: null,
    accountNumber: null,
    type: "CASH" as const,
    coaCode: "1111",
    openingBalance: "5000000",
    cardTheme: "MUSTARD" as const,
  },
];

export const DEMO_CUSTOMERS = [
  { name: "PT Sinar Abadi", npwp: "02.111.222.3-401.000", contactPerson: "Rina", email: "rina@sinar.test", phone: "021-700001" },
  { name: "CV Karya Mandiri", npwp: "02.222.333.4-402.000", contactPerson: "Budi", email: "budi@karya.test", phone: "022-700002" },
  { name: "PT Global Niaga", npwp: "02.333.444.5-403.000", contactPerson: "Sari", email: "sari@global.test", phone: "021-700003" },
  { name: "Toko Sumber Rejeki", npwp: "02.444.555.6-404.000", contactPerson: "Tono", email: "tono@sumber.test", phone: "031-700004" },
  { name: "PT Cakrawala Data", npwp: "02.555.666.7-405.000", contactPerson: "Dewi", email: "dewi@cakrawala.test", phone: "021-700005" },
];

export const DEMO_VENDORS = [
  { name: "PT Data Nusantara", npwp: "03.111.222.3-411.000", contactPerson: "Andi", email: "andi@data.test" },
  { name: "CV Office Supply", npwp: "03.222.333.4-412.000", contactPerson: "Lina", email: "lina@office.test" },
  { name: "PT Listrik Mandiri", npwp: "03.333.444.5-413.000", contactPerson: "Joko", email: "joko@listrik.test" },
  { name: "PT Sewa Properti", npwp: "03.444.555.6-414.000", contactPerson: "Maya", email: "maya@sewa.test" },
  { name: "CV Kreatif Media", npwp: "03.555.666.7-415.000", contactPerson: "Fajar", email: "fajar@kreatif.test" },
];

export interface InvoiceSpec {
  date: string;
  customer: string;
  revenueCode: string;
  items: Array<{ description: string; quantity: string; unitPrice: string; discountPercent: string }>;
  paid: "full" | "none" | string;
  draft?: boolean;
  taxStatus?: "APPROVED" | "SUBMITTED";
  taxNumber?: string;
}

export const DEMO_SALES: InvoiceSpec[] = [
  {
    date: "2026-01-12",
    customer: "PT Sinar Abadi",
    revenueCode: "4110",
    items: [{ description: "Konsultasi implementasi ERP", quantity: "1", unitPrice: "45000000", discountPercent: "0" }],
    paid: "full",
    taxStatus: "APPROVED",
    taxNumber: "010.000-26.00000001",
  },
  {
    date: "2026-01-25",
    customer: "CV Karya Mandiri",
    revenueCode: "4110",
    items: [{ description: "Lisensi tahunan", quantity: "2", unitPrice: "12000000", discountPercent: "5" }],
    paid: "full",
  },
  {
    date: "2026-02-08",
    customer: "PT Global Niaga",
    revenueCode: "4110",
    items: [{ description: "Jasa pelatihan", quantity: "1", unitPrice: "18500000", discountPercent: "0" }],
    paid: "full",
  },
  {
    date: "2026-02-20",
    customer: "Toko Sumber Rejeki",
    revenueCode: "4120",
    items: [{ description: "Paket hardware", quantity: "3", unitPrice: "7500000", discountPercent: "0" }],
    paid: "10000000",
  },
  {
    date: "2026-03-05",
    customer: "PT Sinar Abadi",
    revenueCode: "4110",
    items: [{ description: "Maintenance Q1", quantity: "1", unitPrice: "22000000", discountPercent: "0" }],
    paid: "full",
    taxStatus: "SUBMITTED",
    taxNumber: "010.000-26.00000005",
  },
  {
    date: "2026-03-18",
    customer: "PT Cakrawala Data",
    revenueCode: "4110",
    items: [{ description: "Konsultasi pajak", quantity: "1", unitPrice: "9000000", discountPercent: "0" }],
    paid: "full",
  },
  {
    date: "2026-04-02",
    customer: "CV Karya Mandiri",
    revenueCode: "4110",
    items: [{ description: "Modul inventori", quantity: "1", unitPrice: "35000000", discountPercent: "0" }],
    paid: "none",
  },
  {
    date: "2026-04-22",
    customer: "PT Global Niaga",
    revenueCode: "4110",
    items: [
      { description: "Jasa integrasi", quantity: "1", unitPrice: "28000000", discountPercent: "10" },
      { description: "Biaya dokumentasi", quantity: "1", unitPrice: "2000000", discountPercent: "0" },
    ],
    paid: "15000000",
  },
  {
    date: "2026-05-10",
    customer: "Toko Sumber Rejeki",
    revenueCode: "4120",
    items: [{ description: "Paket POS", quantity: "2", unitPrice: "9750000", discountPercent: "0" }],
    paid: "full",
  },
  {
    date: "2026-06-06",
    customer: "PT Sinar Abadi",
    revenueCode: "4110",
    items: [{ description: "Support premium", quantity: "1", unitPrice: "16000000", discountPercent: "0" }],
    paid: "full",
  },
  {
    date: "2026-07-14",
    customer: "PT Cakrawala Data",
    revenueCode: "4110",
    items: [{ description: "Pelatihan staf", quantity: "1", unitPrice: "12500000", discountPercent: "0" }],
    paid: "full",
  },
  {
    date: "2026-08-03",
    customer: "CV Karya Mandiri",
    revenueCode: "4110",
    items: [{ description: "Konsultasi lanjutan", quantity: "1", unitPrice: "20000000", discountPercent: "0" }],
    paid: "none",
  },
  {
    date: "2026-09-09",
    customer: "PT Global Niaga",
    revenueCode: "4110",
    items: [{ description: "Lisensi tambahan", quantity: "1", unitPrice: "14000000", discountPercent: "0" }],
    paid: "full",
    taxStatus: "APPROVED",
    taxNumber: "010.000-26.00000013",
  },
  {
    date: "2026-09-28",
    customer: "Toko Sumber Rejeki",
    revenueCode: "4110",
    items: [{ description: "Implementasi", quantity: "1", unitPrice: "31000000", discountPercent: "0" }],
    paid: "20000000",
  },
  {
    date: "2026-10-12",
    customer: "PT Sinar Abadi",
    revenueCode: "4110",
    items: [{ description: "Maintenance Q4", quantity: "1", unitPrice: "24000000", discountPercent: "0" }],
    paid: "full",
  },
  {
    date: "2026-10-30",
    customer: "PT Cakrawala Data",
    revenueCode: "4110",
    items: [{ description: "Jasa audit sistem", quantity: "1", unitPrice: "27500000", discountPercent: "0" }],
    paid: "none",
  },
  {
    date: "2026-11-05",
    customer: "CV Karya Mandiri",
    revenueCode: "4110",
    items: [{ description: "Draf proposal", quantity: "1", unitPrice: "8000000", discountPercent: "0" }],
    paid: "none",
    draft: true,
  },
  {
    date: "2026-11-10",
    customer: "PT Global Niaga",
    revenueCode: "4120",
    items: [{ description: "Paket hardware", quantity: "2", unitPrice: "6500000", discountPercent: "0" }],
    paid: "full",
  },
];

export interface PurchaseSpec {
  date: string;
  vendor: string;
  items: Array<{ accountCode: string; description: string; quantity: string; unitPrice: string; discountPercent: string }>;
  withholdingType: "NONE" | "PPH21" | "PPH22" | "PPH23" | "PPH4_2";
  withholdingRate: string;
  paid: "full" | "none" | string;
  draft?: boolean;
  dueDays?: number;
}

export const DEMO_PURCHASES: PurchaseSpec[] = [
  {
    date: "2026-01-10",
    vendor: "PT Data Nusantara",
    items: [{ accountCode: "5000", description: "Server cloud", quantity: "2", unitPrice: "18000000", discountPercent: "0" }],
    withholdingType: "NONE",
    withholdingRate: "0",
    paid: "full",
  },
  {
    date: "2026-02-05",
    vendor: "CV Office Supply",
    items: [{ accountCode: "6150", description: "Perlengkapan kantor", quantity: "1", unitPrice: "4500000", discountPercent: "0" }],
    withholdingType: "PPH23",
    withholdingRate: "2",
    paid: "full",
  },
  {
    date: "2026-03-15",
    vendor: "PT Listrik Mandiri",
    items: [{ accountCode: "6130", description: "Listrik pabrik", quantity: "1", unitPrice: "3200000", discountPercent: "0" }],
    withholdingType: "NONE",
    withholdingRate: "0",
    paid: "full",
  },
  {
    date: "2026-04-10",
    vendor: "PT Sewa Properti",
    items: [{ accountCode: "6120", description: "Sewa kantor Q2", quantity: "1", unitPrice: "30000000", discountPercent: "0" }],
    withholdingType: "PPH4_2",
    withholdingRate: "10",
    paid: "full",
  },
  {
    date: "2026-05-20",
    vendor: "PT Data Nusantara",
    items: [{ accountCode: "5000", description: "Storage array", quantity: "1", unitPrice: "42000000", discountPercent: "0" }],
    withholdingType: "NONE",
    withholdingRate: "0",
    paid: "20000000",
  },
  {
    date: "2026-07-01",
    vendor: "CV Kreatif Media",
    items: [{ accountCode: "6160", description: "Kampanye Q3", quantity: "1", unitPrice: "12000000", discountPercent: "0" }],
    withholdingType: "PPH23",
    withholdingRate: "2",
    paid: "full",
  },
  {
    date: "2026-08-18",
    vendor: "PT Data Nusantara",
    items: [{ accountCode: "5000", description: "Server cabang", quantity: "3", unitPrice: "9500000", discountPercent: "0" }],
    withholdingType: "NONE",
    withholdingRate: "0",
    paid: "none",
  },
  {
    date: "2026-09-22",
    vendor: "PT Sewa Properti",
    items: [{ accountCode: "6120", description: "Sewa kantor 6 bulan", quantity: "6", unitPrice: "5000000", discountPercent: "0" }],
    withholdingType: "PPH4_2",
    withholdingRate: "10",
    paid: "none",
  },
  {
    date: "2026-10-15",
    vendor: "CV Office Supply",
    items: [{ accountCode: "6150", description: "Perlengkapan Q4", quantity: "1", unitPrice: "5750000", discountPercent: "0" }],
    withholdingType: "PPH23",
    withholdingRate: "2",
    paid: "full",
  },
  {
    date: "2026-11-03",
    vendor: "PT Data Nusantara",
    items: [{ accountCode: "5000", description: "Upgrade memory", quantity: "1", unitPrice: "16000000", discountPercent: "0" }],
    withholdingType: "NONE",
    withholdingRate: "0",
    paid: "none",
    draft: true,
  },
];

export const DEMO_ASSETS = [
  {
    code: "AST/2026/0001",
    name: "Server produksi",
    category: "Peralatan",
    purchaseDate: "2026-01-05",
    purchasePrice: "60000000",
    residualValue: "0",
    usefulLifeMonths: 48,
    method: "STRAIGHT_LINE" as const,
    annualRate: null,
    assetCode: "1210",
    accumulatedCode: "1211",
    expenseCode: "6170",
  },
  {
    code: "AST/2026/0002",
    name: "Kendaraan operasional",
    category: "Kendaraan",
    purchaseDate: "2026-02-10",
    purchasePrice: "240000000",
    residualValue: "24000000",
    usefulLifeMonths: 60,
    method: "STRAIGHT_LINE" as const,
    annualRate: null,
    assetCode: "1220",
    accumulatedCode: "1221",
    expenseCode: "6170",
  },
  {
    code: "AST/2026/0003",
    name: "Peralatan kantor",
    category: "Peralatan",
    purchaseDate: "2026-03-15",
    purchasePrice: "45000000",
    residualValue: "0",
    usefulLifeMonths: 36,
    method: "STRAIGHT_LINE" as const,
    annualRate: null,
    assetCode: "1210",
    accumulatedCode: "1211",
    expenseCode: "6170",
  },
  {
    code: "AST/2026/0004",
    name: "Laptop tim",
    category: "Peralatan",
    purchaseDate: "2026-04-01",
    purchasePrice: "36000000",
    residualValue: "0",
    usefulLifeMonths: 36,
    method: "DECLINING_BALANCE" as const,
    annualRate: "66.67",
    assetCode: "1210",
    accumulatedCode: "1211",
    expenseCode: "6170",
  },
];

export const DEMO_MONTHLY_CASH = [
  { description: "Gaji karyawan", category: "Gaji", amount: "12000000", direction: "OUT" as const, counterCode: "6110", day: 25 },
  { description: "Internet dan telepon", category: "Utilitas", amount: "1500000", direction: "OUT" as const, counterCode: "6140", day: 5 },
  { description: "Administrasi bank", category: "Bank", amount: "150000", direction: "OUT" as const, counterCode: "6180", day: 28 },
];
