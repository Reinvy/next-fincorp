import Link from "next/link";
import { requireActorPage } from "@/lib/access";
import { PageHeader, PaperCard, SectionRule } from "@/components/ui/paper";
import { buttonStyles } from "@/components/ui/button";
import { DownloadLink } from "@/components/ui/download-link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laporan" };

const REPORTS = [
  {
    href: "/reports/balance-sheet",
    title: "Neraca",
    description: "Posisi aset, liabilitas, dan ekuitas pada tanggal tertentu, termasuk laba tahun berjalan.",
    period: "Per tanggal",
  },
  {
    href: "/reports/income-statement",
    title: "Laba Rugi",
    description: "Pendapatan, beban pokok, beban operasional, pajak, dan laba bersih dibanding periode sebelumnya.",
    period: "Rentang tanggal",
  },
  {
    href: "/reports/cash-flow",
    title: "Arus Kas",
    description: "Arus kas operasi, investasi, dan pendanaan dengan rekonsiliasi saldo kas.",
    period: "Rentang tanggal",
  },
  {
    href: "/reports/equity",
    title: "Perubahan Ekuitas",
    description: "Modal awal, mutasi setoran/prive, dan laba periode terhadap ekuitas akhir.",
    period: "Rentang tanggal",
  },
  {
    href: "/reports/aging",
    title: "Aging Piutang & Utang",
    description: "Saldo terbuka per pelanggan/vendor dalam bucket jatuh tempo.",
    period: "Per tanggal · AR/AP",
  },
  {
    href: "/reports/tax",
    title: "Rekap Pajak",
    description: "PPN keluaran/masukan, kompensasi, PPh dipotong, liabilitas, dan pembayaran.",
    period: "Per bulan",
  },
  {
    href: "/accounting/trial-balance",
    title: "Neraca Saldo",
    description: "Saldo setiap akun daun sampai tanggal tertentu; dasar semua laporan.",
    period: "Per tanggal",
  },
  {
    href: "/accounting/ledger",
    title: "Buku Besar",
    description: "Mutasi dan saldo berjalan per akun dari jurnal terposting.",
    period: "Per akun · rentang",
  },
];

export default async function ReportsPage() {
  const { activeCompany } = await requireActorPage();
  return (
    <>
      <PageHeader
        eyebrow={activeCompany.companyName}
        title="Laporan"
        description="Semua laporan membaca jurnal terposting yang sama. Tidak ada saldo tersimpan terpisah."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report, index) => (
          <PaperCard key={report.href} className="flex flex-col p-4">
            <div className="flex items-start justify-between">
              <p className="eyebrow">{String(index + 1).padStart(2, "0")}</p>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">{report.period}</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold text-ink">{report.title}</h2>
            <p className="mt-1 flex-1 text-[13px] leading-5 text-ink-soft">{report.description}</p>
            <Link href={report.href} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4 self-start" })}>
              Buka laporan
            </Link>
          </PaperCard>
        ))}
      </div>
      <PaperCard className="mt-4 p-4">
        <SectionRule label="Ekspor" />
        <p className="mt-2 text-xs text-ink-soft">
          Setiap laporan memiliki tombol cetak dan CSV. Cadangan data perusahaan (JSON) tersedia melalui tautan
          berikut; tidak ada pemulihan otomatis.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <DownloadLink href="/api/export/backup" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Unduh cadangan JSON
          </DownloadLink>
          <Link href="/settings/company" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Pengaturan perusahaan
          </Link>
        </div>
      </PaperCard>
    </>
  );
}
