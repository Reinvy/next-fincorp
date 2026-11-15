import { requireActorPage } from "@/lib/access";
import { listLeafAccounts } from "@/server/accounting/accounts";
import { listBankAccounts } from "@/server/cash/accounts";
import { todayISO } from "@/lib/dates";
import { AssetForm } from "@/components/forms/AssetForm";
import { PageHeader } from "@/components/ui/paper";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aset Baru" };

export default async function NewFixedAssetPage() {
  const { actor, activeCompany } = await requireActorPage();
  const [accounts, bankAccounts] = await Promise.all([listLeafAccounts(actor), listBankAccounts(actor)]);
  const hasAssetAccounts = accounts.some((account) => account.systemRole === "FIXED_ASSET");

  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Aset Tetap Baru"
        description="Perolehan aset membentuk jurnal Dr aset / Cr rekening pembayar. Penyusutan dijalankan per periode."
      />
      {!hasAssetAccounts ? (
        <p className="mb-4 border-l-2 border-vermilion bg-vermilion-soft px-3 py-2 text-[13px] text-vermilion">
          Belum ada akun dengan peran FIXED_ASSET. Lengkapi bagan akun terlebih dahulu.
        </p>
      ) : null}
      <AssetForm accounts={accounts} bankAccounts={bankAccounts} today={todayISO()} />
    </>
  );
}
