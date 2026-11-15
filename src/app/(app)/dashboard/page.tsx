import { requireActorPage } from "@/lib/access";
import { logoutAction } from "@/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user, activeCompany, memberships } = await requireActorPage();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm uppercase tracking-widest text-neutral-500">Ringkasan</p>
      <h1 className="mt-2 text-3xl font-semibold">{activeCompany.companyName}</h1>
      <p className="mt-2 text-neutral-600">
        Halo, {user.name}. Anda masuk sebagai {activeCompany.role.toLowerCase()} pada {memberships.length} perusahaan.
      </p>
      <p className="mt-6 rounded border border-dashed border-neutral-300 p-4 text-sm">
        Setup selesai — modul akuntansi, penjualan, pembelian, kas &amp; bank, aset tetap, pajak, dan laporan dibangun
        pada tahap berikutnya.
      </p>
      <form action={logoutAction} className="mt-6">
        <button type="submit" className="rounded border border-neutral-400 px-4 py-2">
          Keluar
        </button>
      </form>
    </main>
  );
}
