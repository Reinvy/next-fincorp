import { TabNav } from "@/components/ui/tab-nav";

const items = [
  { href: "/accounting", label: "Ringkasan", exact: true },
  { href: "/accounting/coa", label: "Bagan Akun" },
  { href: "/accounting/journal", label: "Jurnal" },
  { href: "/accounting/ledger", label: "Buku Besar" },
  { href: "/accounting/trial-balance", label: "Neraca Saldo" },
  { href: "/accounting/closing", label: "Tutup Buku" },
];

export function AccountingTabs() {
  return <TabNav items={items} className="mb-6" />;
}
