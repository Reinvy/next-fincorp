# FinCorp — Pembukuan Perusahaan

Monolith Next.js 16 untuk pembukuan double-entry perusahaan Indonesia: bagan akun, jurnal, penjualan, pembelian, kas & bank, aset tetap, pajak, laporan keuangan, dan audit — semuanya membaca satu buku besar di PostgreSQL.

## Stack

- Next.js 16.4.6 App Router, React 19, Server Components & Server Actions
- Prisma 7.10.1 + PostgreSQL 17 (`@prisma/adapter-pg`)
- Better Auth email/password, multi-company membership (ADMIN / ACCOUNTANT / VIEWER)
- Zod 4, Decimal.js, Tailwind CSS v4
- Vitest (unit) dan Playwright (end-to-end)

## Menjalankan lokal

```bash
podman-compose up -d db
cp .env.example .env
# isi BETTER_AUTH_SECRET dengan minimal 32 karakter acak
npm ci
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run db:verify
npm run dev
```

Buka `http://localhost:3000`.

### Akun demo

| Peran | Email | Kata sandi |
|---|---|---|
| Admin | `admin@fincorp.id` | `FinCorp#2026` |
| Akuntan | `akuntan@fincorp.id` | `Akuntan#2026` |
| Pengamat | `viewer@fincorp.id` | `Viewer#2026` |

Seed membuat PT FinCorp Nusantara dengan data Januari–November 2026: 18 faktur penjualan, 10 faktur pembelian, pembayaran, retur, rekonsiliasi bank, 4 aset tetap, 10 run penyusutan, PPN/PPh, dan periode Januari–September ditutup.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run typecheck` | `next typegen` + TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit test Vitest |
| `npm run db:migrate` | Migrasi pengembangan |
| `npm run db:seed` | Seed demo (ditolak bila `NODE_ENV=production`) |
| `npm run db:verify` | Verifikasi invarian buku besar |
| `npm run e2e` | Playwright (database `fincorp_test` di-reset lebih dulu; memakai Chrome terpasang) |

## Invarian utama

1. **Satu buku besar.** Semua layar keuangan membaca `JournalLine` yang berstatus `POSTED`. Faktur, pembayaran, kas, aset, dan pajak menulis jurnal dalam transaksi database yang sama. Tidak ada saldo akun tersimpan dan tidak ada `localStorage` untuk data keuangan.
2. **Uang adalah Decimal.** Kolom uang `Decimal(18,2)`, kuantitas `Decimal(18,4)`; pembulatan rupiah `HALF_UP`. Form mengirim string digit, bukan float.
3. **Tanggal tanpa waktu.** Tanggal akuntansi `@db.Date` diperlakukan sebagai tengah malam UTC; “hari ini” dihitung di zona `Asia/Jakarta`.
4. **Tenant terisolasi.** Setiap query/mutasi memakai `Actor { userId, companyId, role }` dari sesi dan keanggotaan yang divalidasi; `companyId` dari form/URL tidak pernah dipercaya.
5. **Aksi adalah satu-satunya pintu mutasi.** Setiap Server Action mengautentikasi, mengotorisasi, memvalidasi Zod, lalu memanggil service. Service memiliki transaksi dan audit log.
6. **Mutasi finansial serializable.** `withFinancialTx()` memakai isolasi `Serializable` dan mengulang sekali pada `P2034`.
7. **Periode ditegakkan.** Posting ke periode `CLOSED` ditolak; pembalik memakai tanggal hari ini. Tidak ada jurnal penutup otomatis.
8. **Kas tidak boleh negatif.** Posting yang menyentuh akun `CASH`/`BANK` memeriksa saldo all-time setelah entri.
9. **Tidak ada aksi palsu.** Setiap tombol mengubah data atau bernavigasi. Tidak ada `alert()`/`confirm()` untuk alur bisnis, tidak ada progres palsu.
10. **Zona server-only.** `src/server/**`, `src/lib/prisma.ts`, dan `src/lib/access.ts` tidak boleh diimpor komponen klien; DTO di `src/lib/dto.ts` hanya berisi angka, string, dan objek polos.

## Peta direktori

```
prisma/               schema, migrasi, seed demo
src/app/              route App Router: (auth), onboarding, (app)
src/actions/          Server Actions (auth, akuntansi, penjualan, pembelian, kas, aset, pajak, tim, dukungan)
src/server/           service domain + transaksi + laporan
  accounting/         posting, numbering, jurnal, periode, laporan, dashboard, alert
  sales/ purchases/   faktur, pembayaran, retur
  cash/               rekening, transaksi, transfer, rekonsiliasi
  assets/             register, penyusutan, pelepasan
  tax/                PPN, PPh, e-Faktur lokal
  companies/          template COA, pembuatan perusahaan, tim
  support/            tiket bantuan
src/components/       UI kit “Buku Kas”, form, dokumen cetak
scripts/              verifikasi ledger, reset database test
e2e/                  spesifikasi Playwright
```

## Laporan & ekspor

Neraca, laba rugi (dengan pembanding periode), arus kas langsung, perubahan ekuitas, aging AR/AP, rekap pajak, neraca saldo, dan buku besar tersedia dengan cetak serta CSV. Cadangan perusahaan berupa JSON tersedia di `/api/export/backup`; tidak ada pemulihan otomatis.

## Pengujian

- Unit: `npm test` (tidak memerlukan database; modul murni).
- E2E: `npm run e2e`. Global setup membuat/mengosongkan `fincorp_test`, menerapkan migrasi, menjalankan seed, lalu menjalankan seluruh skenario dengan satu worker. Konfigurasi memakai `channel: "chrome"` sehingga Google Chrome harus tersedia; alternatifnya jalankan `npx playwright install chromium` dan hapus `channel` di `playwright.config.ts`.

## Batasan yang disengaja

Tidak ada multi-currency/FX, integrasi langsung DJP/e-Faktur, kalkulasi PPh 21 progresif, jurnal penutup tahunan otomatis, revaluasi aset, reset kata sandi via email, atau restore JSON. Backup database dilakukan dengan `pg_dump`.
