import { requireActorPage } from "@/lib/access";
import { KpiCard, PageHeader, PaperCard, SectionRule } from "@/components/ui/paper";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { activeCompany } = await requireActorPage();

  return (
    <>
      <PageHeader
        eyebrow="Ringkasan"
        title={activeCompany.companyName}
        description="Dashboard keuangan akan terisi setelah transaksi pertama dicatat."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Kas & Bank" value="Rp 0" note="Belum ada rekening" index="01" />
        <KpiCard label="Piutang Usaha" value="Rp 0" note="Tidak ada faktur terbuka" index="02" />
        <KpiCard label="Utang Usaha" value="Rp 0" note="Tidak ada tagihan terbuka" index="03" />
        <KpiCard label="Laba Bersih YTD" value="Rp 0" note="Belum ada pendapatan" index="04" />
      </div>
      <PaperCard className="mt-6 p-5">
        <SectionRule label="Langkah berikutnya" />
        <ol className="mt-4 space-y-2 text-sm text-ink-soft">
          <li>1. Tambahkan rekening kas atau bank beserta saldo awal.</li>
          <li>2. Buat bagan akun tambahan bila diperlukan.</li>
          <li>3. Catat faktur penjualan pertama dan lihat jurnalnya terbentuk otomatis.</li>
        </ol>
      </PaperCard>
    </>
  );
}
