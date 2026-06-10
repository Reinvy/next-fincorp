# 🛡️ FinCorp Indonesia - Premium Fiscal Suite

[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-blue?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Nusantara Fiscal Standard](https://img.shields.io/badge/Design_System-Nusantara_Fiscal-success?style=for-the-badge)](https://fincorp.co.id/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

**FinCorp Indonesia - Fiscal Suite** adalah platform ERP keuangan, akuntansi, dan kepatuhan perpajakan (_tax compliance_) tingkat korporasi yang dirancang khusus untuk memenuhi standar akuntansi Indonesia. Mengusung filosofi **Nusantara Fiscal Standard**, aplikasi ini menyajikan antarmuka _double-ledger_ yang presisi tinggi dengan visual **Glassmorphism Premium** yang interaktif, kontras warna yang nyaman, serta responsivitas penuh dari layar komputer hingga perangkat seluler.

---

## 🎨 Filosofi Identitas & Desain Sistem

FinCorp tidak hanya dibangun untuk menghitung angka, melainkan untuk melambangkan stabilitas keuangan. Identitas visual kami direpresentasikan oleh **Logo Maknawi** kustom:

- **Perisai Kepatuhan (Shield):** Melambangkan perlindungan aset, keamanan data audit, dan jaminan kepatuhan perpajakan (_tax compliance_).
- **Kurva Pertumbuhan (Ascending Trend Line):** Merepresentasikan arus kas (_cash flow_) yang menanjak, profitabilitas, serta pertumbuhan investasi.
- **Titik Keseimbangan (Balance Pulse):** Node hijau bercahaya berkedip yang melambangkan keakuratan jurnal pembukuan (_balance sheet_) dan status laporan pajak yang **NIHIL/LUNAS**.

### Karakteristik Estetika:

- **Glassmorphism Premium:** Penetrasi blur latar belakang halus (`backdrop-blur-md`) dipadukan dengan border transparan tipis HSL dan bayangan melayang untuk meminimalkan _cognitive load_.
- **High Contrast Dark Mode:** Skema warna gelap berbasis biru arang (`#0a0f1d`) dengan redefinisi variabel warna yang tegas demi keterbacaan (readability) 100%.
- **Sistem Notifikasi Toast Global:** Notifikasi toast melayang interaktif yang non-blocking dengan visual warna semantik (Success, Error, Warning, Info) serta tata letak responsif mobile.

---

## 🚀 Fitur Utama & Modul Bisnis

FinCorp Indonesia mengintegrasikan 12 modul operasional keuangan dalam satu kesatuan alur kerja:

1.  **Interactive Accounting Dashboard**
    - Pemantauan rasio kesehatan fiskal secara dinamis (_Current Ratio_, _DER_, dan _Net Profit Margin_).
    - _Checklist Cycle_ penutupan buku akhir periode akuntansi yang interaktif.
    - Entri Voucher Jurnal Umum (JV) multi-baris otomatis dengan deteksi saldo seimbang (_balancing validator_).
2.  **Buku Besar Dinamis (General Ledger)**
    - _Account selector tree_ hierarkis (Level 1 sampai 4) dilengkapi bar pencarian real-time.
    - Penyusunan urutan jurnal debit/kredit secara kronologis dari mutasi rekening kas, e-Faktur, dan penyusutan aset.
    - Pratinjau salinan dokumen transaksi asal (drill-down modal) dan cetak laporan ramah kertas (_print ledger layout_).
3.  **Kas & Bank Visual**
    - Visualisasi rekening tabungan berbentuk kartu debit fisik premium (Midnight Blue, Steel Gray, Emerald Green, Gold) lengkap dengan chip emas.
    - Mesin rekonsiliasi otomatis (_Auto-Match_) antara Rekening Koran Bank dengan Buku Kas FinCorp.
    - Pembuatan jurnal penyesuaian bunga bank dan biaya admin secara langsung.
4.  **Manajemen Piutang Usaha (Sales & AR)**
    - Pemantauan nominal bruto omset penjualan, piutang berjalan, dan PPN Keluaran.
    - Analisis umur piutang (_Receivables Aging_) terbagi atas kategori Lancar (0-30 Hari), Peringatan (31-60 Hari), dan Kritis (>60 Hari).
    - Pencatatan pelunasan faktur instan terhubung langsung ke rekening bank masuk.
5.  **Manajemen Utang Dagang (Purchases & AP)**
    - Dashboard pengeluaran belanja, utang outstanding, dan rekap PPN Masukan.
    - Analisis umur utang vendor (_Payables Aging_) dengan bar progres warna semantik.
    - Pemicu pelunasan tagihan supplier yang memotong saldo kas/bank secara real-time.
6.  **Modul Kepatuhan Pajak (Tax Compliance)**
    - Simulasi sinkronisasi API e-Faktur DJP lengkap dengan visual log konsol perpajakan.
    - Format Surat Setoran Pajak (SSP) resmi DJP untuk penyetoran pajak PPh 21, PPh 23, dan PPN.
    - Pembuatan ID Billing 15-digit otomatis dan pemicu pembayaran setoran pajak ke Kas Negara.
7.  **Manajemen Aset Tetap (Fixed Assets)**
    - Jadwal Proyeksi Penyusutan (_Depreciation Schedule_) tahunan selama umur ekonomis aset (Metode Garis Lurus).
    - Logika Penghapusan / Pelepasan (_Asset Disposal Write-Off_) yang menghitung kerugian sisa nilai buku secara otomatis.
8.  **Direktori Laporan Keuangan (Reports)**
    - Kompilasi Laporan Laba Rugi resmi dengan gaya kertas digital ledger, letterhead PT FinCorp Indonesia Tbk, double underlines total kalkulasi, dan komparasi YTD.
    - Unduhan berkas CSV asli rekapitulasi Neraca, Arus Kas, PPN DN, dan AR Aging.
9.  **Multi-Tenant Switcher (Daftar Perusahaan)**
    - Beralih profil kerja antar anak perusahaan, cabang regional, atau entitas legal.
    - Visualisasi pemuatan (_Loading Overlay_) premium selama proses pertukaran data context global.
10. **Pusat Bantuan & Tiket (Support Center)**
    - FAQ Accordion interaktif untuk pencarian FAQ seputar akuntansi dan pajak.
    - Formulir tiket kendala support dengan generator ID Tiket kustom dan monitoring tabel status.
    - Panel Diagnostik Latensi API e-Faktur dan Server Status.
11. **Konfigurasi Sistem (Settings)**
    - Pengunggah logo perusahaan dengan penyimpanan Base64 lokal.
    - Manajemen backup dan restore database JSON menyeluruh dari/ke `localStorage`.
    - Daftar hak akses pengguna (_User Authorization_) dengan peran ADMIN, ACCOUNTANT, dan VIEWER.

---

## 🛠️ Spesifikasi Teknologi

- **Framework:** Next.js (App Router) dengan kompilator Turbopack.
- **Bahasa Pemrograman:** TypeScript (Type-Safe).
- **Styling:** Tailwind CSS (Modern Utility-First Styles).
- **State Management:** React Context API (`AppContext.tsx`).
- **Penyimpanan Lokal:** `localStorage` persistence untuk menjaga status mutasi transaksi.
- **Font Ikon:** Material Symbols Outlined (Google Fonts).

---

## 🚦 Memulai Proyek

### Prasyarat

Pastikan Anda telah memasang [Node.js](https://nodejs.org/) (versi 18.x atau lebih baru) di perangkat Anda.

### 1. Kloning Repositori & Masuk ke Direktori

```bash
cd next-fincorp
```

### 2. Pemasangan Dependensi

```bash
npm install
```

### 3. Menjalankan Server Pengembangan (Lokal)

```bash
npm run dev
```

Buka peramban di [http://localhost:3000](http://localhost:3000) untuk melihat platform berjalan.

### 4. Membangun Bundel Produksi (Build & Typecheck)

```bash
npm run build
```

Perintah ini akan memicu pengecekan TypeScript dan kompilasi halaman statis Next.js.

---

## 📂 Struktur Direktori Utama

```text
next-fincorp/
├── src/
│   ├── app/                    # Next.js App Router (Rute Halaman & Modul)
│   ├── components/
│   │   ├── layout/             # Shell Shell (Sidebar, Header, Layout)
│   │   └── ui/                 # Reusable UI Tokens (Button, Alert, Toast, KPICard)
│   ├── context/
│   │   └── AppContext.tsx      # Global State Controller & Logic Akuntansi
│   ├── data/
│   │   ├── index.ts            # Mock Database & Helper Keuangan
│   │   └── types.ts            # TypeScript Interfaces
│   └── globals.css             # Desain Sistem CSS Variables & Animasi HSL
├── package.json
└── tsconfig.json
```
