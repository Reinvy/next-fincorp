import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="paper-sheet mx-auto max-w-lg px-6 py-12 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Alamat ini tidak ada atau dokumen sudah dipindahkan. Gunakan navigasi di samping.
      </p>
      <Link href="/dashboard" className={buttonStyles({ variant: "secondary", className: "mt-6" })}>
        Kembali ke dashboard
      </Link>
    </div>
  );
}
