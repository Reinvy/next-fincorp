import { LedgerMark } from "@/components/brand/LedgerMark";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="paper-sheet grid w-full max-w-4xl overflow-hidden md:grid-cols-[0.92fr_1.08fr]">
        <aside className="hidden flex-col justify-between bg-forest-deep p-8 text-paper md:flex">
          <div>
            <div className="flex items-center gap-2.5">
              <LedgerMark size={38} className="text-paper" />
              <div>
                <p className="font-display text-xl font-semibold leading-none tracking-tight">FinCorp</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-gold">Buku Kas</p>
              </div>
            </div>
            <p className="mt-8 font-display text-[26px] font-semibold leading-[1.2]">
              Satu buku besar untuk seluruh perusahaan.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-paper/65">
              Faktur, pembayaran, kas &amp; bank, aset tetap, dan pajak menulis ke jurnal double-entry yang sama.
            </p>
            <ul className="mt-6 space-y-2 text-[12px] text-paper/70">
              <li className="flex gap-2"><span className="text-gold">—</span>Neraca saldo selalu seimbang</li>
              <li className="flex gap-2"><span className="text-gold">—</span>PPN dan PPh terhitung dari jurnal</li>
              <li className="flex gap-2"><span className="text-gold">—</span>Periode tertutup tidak bisa diubah</li>
            </ul>
          </div>
          <p className="mt-10 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">
            PT FinCorp Nusantara · Rupiah
          </p>
        </aside>
        <div className="p-6 sm:p-10">{children}</div>
      </div>
    </main>
  );
}
