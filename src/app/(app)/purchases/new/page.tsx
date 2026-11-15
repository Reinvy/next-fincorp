import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listVendors } from "@/server/purchases/vendors";
import { listLeafAccounts } from "@/server/accounting/accounts";
import { addDays, dateFromISO, isoFromDate, todayISO } from "@/lib/dates";
import { PurchaseTabs } from "@/components/layout/PurchaseTabs";
import { PurchaseInvoiceForm } from "@/components/forms/PurchaseInvoiceForm";
import { PageHeader } from "@/components/ui/paper";
import { D } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Faktur Pembelian Baru" };

const ALLOWED_GROUPS = ["INVENTORY", "COST_OF_GOODS_SOLD", "OPERATING_EXPENSE", "OTHER_EXPENSE"];

export default async function NewPurchaseInvoicePage() {
  const { actor, activeCompany } = await requireActorPage();
  const [vendors, accounts, company] = await Promise.all([
    listVendors(actor),
    listLeafAccounts(actor),
    prisma.company.findUnique({ where: { id: actor.companyId }, select: { ppnRate: true } }),
  ]);
  if (!company) return null;
  const itemAccounts = accounts.filter((account) => ALLOWED_GROUPS.includes(account.reportGroup));
  const today = dateFromISO(todayISO());
  const dueDate = addDays(today, 30);

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Faktur Pembelian Baru"
        description="Setiap baris memilih akun persediaan, HPP, atau beban. PPh dipotong saat pembayaran."
      />
      <PurchaseTabs />
      {vendors.length === 0 ? (
        <p className="mb-4 border-l-2 border-mustard bg-mustard-soft px-3 py-2 text-[13px] text-ink-soft">
          Belum ada vendor aktif. Tambahkan vendor di tab Vendor sebelum membuat faktur.
        </p>
      ) : null}
      <PurchaseInvoiceForm
        vendors={vendors}
        itemAccounts={itemAccounts}
        today={isoFromDate(today)}
        defaultDueDate={isoFromDate(dueDate)}
        ppnRate={D(company.ppnRate).toFixed(2)}
      />
    </>
  );
}
