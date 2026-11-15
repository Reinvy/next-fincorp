import { PaperCard, SectionRule } from "@/components/ui/paper";

const FAQ = [
  {
    question: "Bagaimana cara mencatat faktur penjualan?",
    answer:
      "Buka Penjualan → Faktur baru, pilih pelanggan dan akun pendapatan, isi baris, lalu posting. Sistem membuat jurnal Dr Piutang / Cr Pendapatan / Cr PPN Keluaran.",
  },
  {
    question: "Mengapa saldo kas tidak berubah setelah membayar utang?",
    answer:
      "Pembayaran utang mendebit Utang Usaha dan mengkredit rekening bank. Jika potongan PPh aktif, sebagian nilai masuk ke Utang PPh, bukan kas keluar.",
  },
  {
    question: "Bagaimana mengoreksi jurnal yang sudah diposting?",
    answer:
      "Jurnal terposting tidak dapat diedit. Buat jurnal pembalik melalui tombol Batalkan pada jurnal manual, atau batalkan dokumen sumbernya (pembayaran/retur) agar jurnal pembalik otomatis dibuat.",
  },
  {
    question: "Mengapa periode tidak bisa ditutup?",
    answer:
      "Tutup buku menolak periode yang masih memiliki draf jurnal, draf faktur penjualan, atau draf pembelian. Posting atau hapus draf terlebih dahulu.",
  },
  {
    question: "Apakah faktur pajak terhubung ke DJP?",
    answer:
      "Tidak. Status e-Faktur dicatat lokal untuk pemantauan. Nomor faktur pajak diisi manual dan tidak dikirim ke DJP.",
  },
  {
    question: "Bagaimana menambah anggota tim?",
    answer:
      "Admin membuka Pengaturan → Tim lalu menambah anggota dengan email, kata sandi sementara, dan peran. Kata sandi sementara ditampilkan sekali.",
  },
];

export function SupportFaq() {
  return (
    <PaperCard className="overflow-hidden">
      <div className="border-b border-rule px-4 py-3">
        <SectionRule label="Pertanyaan umum" />
      </div>
      <div className="divide-y divide-rule">
        {FAQ.map((item) => (
          <details key={item.question} className="group px-4 py-3">
            <summary className="cursor-pointer list-none text-[13px] font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-gold group-open:rotate-90 inline-block">›</span>
              {item.question}
            </summary>
            <p className="mt-2 pl-5 text-[13px] leading-5 text-ink-soft">{item.answer}</p>
          </details>
        ))}
      </div>
    </PaperCard>
  );
}
