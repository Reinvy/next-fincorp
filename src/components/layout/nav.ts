import {
  BookOpen,
  BookText,
  Building,
  Building2,
  CalendarClock,
  FileBarChart,
  FileCheck2,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  ListTree,
  LockKeyhole,
  ReceiptText,
  Rows3,
  Scale,
  Settings,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
      { label: "Tenggat Waktu", href: "/deadlines", icon: CalendarClock },
    ],
  },
  {
    label: "Buku",
    items: [
      { label: "Akuntansi", href: "/accounting", icon: BookOpen, exact: true },
      { label: "Bagan Akun", href: "/accounting/coa", icon: ListTree },
      { label: "Jurnal", href: "/accounting/journal", icon: BookText },
      { label: "Buku Besar", href: "/accounting/ledger", icon: Rows3 },
      { label: "Neraca Saldo", href: "/accounting/trial-balance", icon: Scale },
      { label: "Tutup Buku", href: "/accounting/closing", icon: LockKeyhole },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { label: "Penjualan", href: "/sales", icon: ReceiptText },
      { label: "Pembelian", href: "/purchases", icon: ShoppingCart },
      { label: "Kas & Bank", href: "/cash-bank", icon: Wallet },
      { label: "Aset Tetap", href: "/fixed-assets", icon: Building2 },
    ],
  },
  {
    label: "Pajak",
    items: [
      { label: "Pajak", href: "/tax", icon: Landmark, exact: true },
      { label: "e-Faktur", href: "/tax/efaktur", icon: FileCheck2 },
    ],
  },
  {
    label: "Laporan",
    items: [{ label: "Laporan", href: "/reports", icon: FileBarChart, exact: true }],
  },
  {
    label: "Sistem",
    items: [
      { label: "Perusahaan", href: "/companies", icon: Building },
      { label: "Pengaturan", href: "/settings/profile", icon: Settings },
      { label: "Bantuan", href: "/support", icon: LifeBuoy },
    ],
  },
];

export const QUICK_ACTIONS: Array<{ label: string; href: string; hint: string }> = [
  { label: "Faktur penjualan", href: "/sales/new", hint: "Buat invoice baru" },
  { label: "Faktur pembelian", href: "/purchases/new", hint: "Catat tagihan vendor" },
  { label: "Jurnal manual", href: "/accounting/journal/new", hint: "Entri debit-kredit" },
  { label: "Kas & bank", href: "/cash-bank", hint: "Rekening dan mutasi" },
];
