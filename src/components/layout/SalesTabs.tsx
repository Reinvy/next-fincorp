import { TabNav } from "@/components/ui/tab-nav";

const items = [
  { href: "/sales", label: "Faktur", exact: true },
  { href: "/sales/customers", label: "Pelanggan" },
  { href: "/sales/credit-notes", label: "Nota Kredit" },
];

export function SalesTabs() {
  return <TabNav items={items} className="mb-6" />;
}
