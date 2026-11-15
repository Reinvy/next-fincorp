import { requireActorPage } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listCustomers } from "@/server/sales/customers";
import { listLeafAccounts } from "@/server/accounting/accounts";
import { addDays, dateFromISO, isoFromDate, todayISO } from "@/lib/dates";
import { SalesTabs } from "@/components/layout/SalesTabs";
import { SalesInvoiceForm } from "@/components/forms/SalesInvoiceForm";
import { PageHeader } from "@/components/ui/paper";
import { D } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Faktur Penjualan Baru" };

export default async function NewSalesInvoicePage() {
  const { actor, activeCompany } = await requireActorPage();
  const [customers, accounts, company] = await Promise.all([
    listCustomers(actor),
    listLeafAccounts(actor),
    prisma.company.findUnique({ where: { id: actor.companyId }, select: { isPkp: true, ppnRate: true } }),
  ]);
  if (!company) return null;
  const revenueAccounts = accounts.filter((account) => account.type === "REVENUE");
  const today = dateFromISO(todayISO());
  const dueDate = addDays(today, 14);

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Faktur Penjualan Baru"
        description="Simpan sebagai draf untuk diperiksa, atau posting langsung untuk membuat jurnal piutang, pendapatan, dan PPN."
      />
      <SalesTabs />
      {customers.length === 0 ? (
        <p className="mb-4 border-l-2 border-mustard bg-mustard-soft px-3 py-2 text-[13px] text-ink-soft">
          Belum ada pelanggan aktif. Tambahkan pelanggan di tab Pelanggan sebelum membuat faktur.
        </p>
      ) : null}
      <SalesInvoiceForm
        customers={customers}
        revenueAccounts={revenueAccounts}
        today={isoFromDate(today)}
        defaultDueDate={isoFromDate(dueDate)}
        ppnRate={D(company.ppnRate).toFixed(2)}
        isPkp={company.isPkp}
      />
    </>
  );
}
