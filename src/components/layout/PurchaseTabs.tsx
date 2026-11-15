import { TabNav } from "@/components/ui/tab-nav";

const items = [
  { href: "/purchases", label: "Faktur", exact: true },
  { href: "/purchases/vendors", label: "Vendor" },
  { href: "/purchases/debit-notes", label: "Nota Debit" },
];

export function PurchaseTabs() {
  return <TabNav items={items} className="mb-6" />;
}
