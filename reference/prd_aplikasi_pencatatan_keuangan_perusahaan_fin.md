# PRD - Aplikasi Pencatatan Keuangan Perusahaan (FinCorp Indonesia)

## 1. Executive Summary

**Nama Produk:** FinCorp Indonesia  
**Tipe:** Aplikasi Desktop & Web-based untuk Pencatatan Keuangan Perusahaan  
**Versi:** 1.0.0  
**Tanggal:** Juni 2026

FinCorp Indonesia adalah aplikasi pencatatan keuangan perusahaan yang dirancang khusus untuk memenuhi standar akuntansi Indonesia berdasarkan PSAK (Pernyataan Standar Akuntansi Keuangan) dan UU Perpajakan Indonesia. Aplikasi ini menyediakan solusi lengkap untuk UMKM dan perusahaan menengah di Indonesia dalam mengelola keuangan bisnis, mulai dari pencatatan transaksi, faktur pajak, jurnal otomatis, hingga pelaporan keuangan yang sesuai regulasi.

**Target Peluncuran:** Q1 2027  
**Estimasi Timeline:** 8 bulan pengembangan

---

## 2. Background & Objectives

### 2.1 Problem Statement

| Pain Point | Dampak |
|------------|--------|
| UMKM Indonesia masih menggunakan Excel/manual untuk pencatatan keuangan | Risiko kesalahan tinggi, tidak terstandarisasi |
| Kesulitan dalam membuat laporan sesuai PSAK | Non-compliance terhadap regulasi perpajakan |
| Proses faktur pajak PPN masih manual | Terlambatnya pelaporan SPT dan risiko denda |
| Tidak ada integrasi dengan e-Faktur DJP | Duplikasi pekerjaan dan inkonsistensi data |
| Sistem akuntansi internasional tidak cocok untuk regulasi Indonesia | Fitur perpajakan lokal terbatas atau tidak ada |

### 2.2 Goals & Objectives

**Tujuan Utama:**
1. Menyediakan sistem akuntansi yang 100% compliant dengan Standar Akuntansi Keuangan Indonesia (SAK) berbasis PSAK
2. Mempermudah pembuatan dan pengelolaan Faktur Pajak sesuai regulasi DJP (Direktorat Jenderal Pajak)
3. Mengautomasi proses jurnal berdasarkan transaksi bisnis
4. Menghasilkan laporan keuangan yang siap audit sesuai format perpajakan Indonesia

**Objectives SMART:**
- ✅ Mencapai 500 perusahaan terdaftar dalam 6 bulan setelah launching
- ✅ Mendukung minimal 3 jenis laporan keuangan sesuai PSAK (Neraca, Laba Rugi, Arus Kas)
- ✅ Integrasi penuh dengan sistem e-Faktur DJP untuk validasi NPWP dan NIK
- ✅ Memangkas waktu proses penutup buku dari 5 hari menjadi 1 hari

### 2.3 Success Metrics

| Metrik | Baseline (Manual) | Target |
|--------|-------------------|--------|
| Waktu pencatatan transaksi | 15 menit/transaksi | 3 menit/transaksi |
| Waktu pembuatan laporan bulanan | 5 hari kerja | 2 jam |
| Tingkat akurasi jurnal otomatis | N/A | >98% |
| Compliance pelaporan pajak | 60% | 100% |

---

## 3. User Personas

### 3.1 Persona 1: Owner UMKM

```
┌─────────────────────────────────────────────────────────────┐
│  PERSONA 1: PEMILIK USAHA                                    │
├─────────────────────────────────────────────────────────────┤
│  Nama        : Budi Santoso (48 tahun)                      │
│  Pendidikan  : S1 Manajemen                                  │
│  Usaha       : Toko Elektronik, omzet Rp 500 juta/bulan     │
│  Lokasi      : Surabaya, Jawa Timur                          │
├─────────────────────────────────────────────────────────────┤
│  PAIN POINTS:                                                │
│  • Tidak punya latar belakang akuntansi                     │
│  • Kesulitan baca laporan keuangan                           │
│  • Khawatir salah hitung pajak                              │
│  •butuh laporan cepat untuk ajukan kredit bank              │
├─────────────────────────────────────────────────────────────┤
│  GOALS:                                                      │
│  • Paham kondisi keuangan perusahaan dengan mudah            │
│  • Tepat waktu dalam bayar pajak                            │
│  • Dapat laporan yang bisa dipahami banker                  │
├─────────────────────────────────────────────────────────────┤
│  BEHAVIOR:                                                   │
│  • Lebih nyaman dengan bahasa Indonesia                     │
│  • Gunakan HP lebih sering daripada laptop                   │
│  • Suka hal praktis dan simpel                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Persona 2: Akuntan Perusahaan

```
┌─────────────────────────────────────────────────────────────┐
│  PERSONA 2: AKUNTAN PERUSAHAAN                               │
├─────────────────────────────────────────────────────────────┤
│  Nama        : Siti Rahayu (32 tahun)                       │
│  Pendidikan  : S1 Akuntansi, Brevet Pajak A & B             │
│  Pengalaman  : 8 tahun di perusahaan manufacturing          │
│  Lokasi      : Jakarta                                       │
├─────────────────────────────────────────────────────────────┤
│  PAIN POINTS:                                                │
│  • Input data dobel antara sistem lama dan DJP              │
│  • Kesalahan mapping akun saat proses closing               │
│  •butuh generate jurnal penyesuaian yang kompleks            │
│  •butuh audit trail untuk keperluan pajak                    │
├─────────────────────────────────────────────────────────────┤
│  GOALS:                                                      │
│  • Efisiensi waktu input transaksi                           │
│  • Automatic reconciliation dengan e-Faktur                  │
│  • Laporan sesuai format SPT Tahunan                         │
│  • Single source of truth untuk audit trail                 │
├─────────────────────────────────────────────────────────────┤
│  BEHAVIOR:                                                   │
│  • Proficient dengan Excel dan software akuntansi           │
│  • Membaca banyak data dalam sehari                          │
│  •butuh fitur export ke Excel/PDF                           │
│  •butuh dashboard real-time                                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Persona 3: Konsultan Pajak

```
┌─────────────────────────────────────────────────────────────┐
│  PERSONA 3: KONSULTAN PAJAK                                  │
├─────────────────────────────────────────────────────────────┤
│  Nama        : Ahmad Wijaya (40 tahun)                      │
│  Pendidikan  : S2 Akuntansi, CPA Indonesia                   │
│  Klien       : 15 perusahaan (UMKM - Corporate)              │
│  Lokasi      : Bandung, dengan klien di Jawa Barat           │
├─────────────────────────────────────────────────────────────┤
│  PAIN POINTS:                                                │
│  • Setiap klien punya format laporan berbeda                │
│  •butuh akses ke data klien tanpa harus datang              │
│  • Kesulitan konsolidasi laporan multi-perusahaan           │
├─────────────────────────────────────────────────────────────┤
│  GOALS:                                                      │
│  • Standarisasi laporan dari semua klien                   │
│  • Akses remote ke data klien (read-only)                   │
│  • Konsolidasi laporan untuk grup perusahaan                │
│  • Generate file e-SPT dengan cepat                          │
├─────────────────────────────────────────────────────────────┤
│  BEHAVIOR:                                                   │
│  • Mobile-first, sering bekerja dari berbagai lokasi         │
│  •butuh kolaborasi dengan tim klien                         │
│  •butuh notifikasi deadline pelaporan pajak                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Functional Requirements

### 4.1 Dashboard & Overview

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| D-01 | Dashboard Utama | Tampilan ringkasan keuangan real-time dengan grafik neraca, laba rugi, dan arus kas | P0 |
| D-02 | Widget Kas/Bank | Monitoring saldo kas dan rekening bank terkini | P0 |
| D-03 | Widget Piutang | Daftar piutang jatuh tempo dan aging analysis | P0 |
| D-04 | Widget Hutang | Daftar hutang jatuh tempo dan aging analysis | P0 |
| D-05 | Widget Pajak | Ringkasan PPN keluar/masuk, PPh terutang | P0 |
| D-06 | Widget Arus Kas | Grafik inflow vs outflow bulanan | P1 |
| D-07 | Alert System | Notifikasi deadline pembayaran, faktur jatuh tempo | P0 |
| D-08 | Quick Actions | Shortcut untuk buat transaksi, faktur, jurnal | P1 |

### 4.2 Modul Akuntansi

#### 4.2.1 Chart of Accounts (COA)

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| ACC-01 | Struktur COA | Mendukung minimal 5 level hierarki (Jenis → Golongan → Akun → Sub-Akun → Detail) | P0 |
| ACC-02 | Template COA | Template standar PSAK untuk berbagai jenis usaha (dagang, jasa, manufaktur) | P0 |
| ACC-03 | COA Kategori | Klasifikasi: Aset, Liabilitas, Ekuitas, Pendapatan, Beban, Pendapatan Lain, Beban Lain | P0 |
| ACC-04 | Akun Pajak | Mapping otomatis untuk PPN Masukan, PPN Keluaran, PPh Pasal 21/22/23/25 | P0 |
| ACC-05 | Multi Currency | support pencatatan dalam USD, EUR, SGD dengan conversion rate BI | P1 |
| ACC-06 | Import COA | Import dari file Excel dengan template standar | P1 |

#### 4.2.2 Jurnal Umum

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| JUR-01 | Input Jurnal | Form input jurnal umum dengan validasi double-entry (debit = kredit) | P0 |
| JUR-02 | Jurnal Otomatis | Generate jurnal otomatis dari modul lain (penjualan, pembelian, kas) | P0 |
| JUR-03 | Jurnal Penyesuaian | Template jurnal penyesuaian akhir bulan (depresiasi, amortisasi, akrual) | P0 |
| JUR-04 | Jurnal Penutup | Prosedur penutup tahun dengan Jurnal Penutup otomatis | P0 |
| JUR-05 | Jurnal Pembalik | Opsi jurnal pembalik untuk akrual di awal periode berikutnya | P1 |
| JUR-06 | Edit Jurnal | Kemampuan edit/hapus jurnal dengan audit trail | P0 |
| JUR-07 | Approval Jurnal | Workflow approval untuk jurnal manual (role-based) | P1 |

#### 4.2.3 Buku Besar

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| BG-01 | Buku Besar | Tampilan buku besar per akun dengan filter periode | P0 |
| BG-02 | Buku Besar Bantu | Buku besar pembantu untuk piutang, hutang, aset tetap | P0 |
| BG-03 | Historians | Riwayat lengkap setiap transaksi per akun | P0 |
| BG-04 | Subsidiary Ledger | Detail transaksi per customer/supplier | P0 |

### 4.3 Modul Penjualan

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| JUAL-01 | Faktur Penjualan | Create invoice dengan/menunggu PPN, termasuk Faktur Pajak | P0 |
| JUAL-02 | Faktur Pajak | Generate Faktur Pajak elektronik sesuai format DJP (FT-010) | P0 |
| JUAL-03 | Integrasi e-Faktur | Koneksi ke portal e-Faktur DJP untuk validation dan upload | P0 |
| JUAL-04 | Retur Penjualan | dengan credit note | P0 |
| JUAL-05 | Pelunasan Piutang | Pencatatan pembayaran piutang dengan kemampuan partial payment | P0 |
| JUAL-06 | Termin/SO | Sales Order untuk pipeline penjualan | P1 |
| JUAL-07 | DKN (Dokumen Kontrak) | Untuk transaksi yang memerlukan kontrak (sesuai DJP) | P1 |

### 4.4 Modul Pembelian

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| BELI-01 | Faktur Pembelian | Input invoice supplier dengan PPN | P0 |
| BELI-02 | Bukti Potong PPh | Pencatatan bukti potong PPh 21/22/23/26 | P0 |
| BELI-03 | Retur Pembelian | dengan debitnote | P0 |
| BELI-04 | Pelunasan Hutang | Pencatatan pembayaran hutang dengan diskon | P0 || BELI-05 | Import e-Faktur | Import data Faktur Pajak dari e-Faktur DJP | P1 |

### 4.5 Modul Kas & Bank

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| KB-01 | Transaksi Kas Masuk/Keluar | Pencatatan non-invoice (biaya operasional, setoran bank) | P0 |
| KB-02 | Multi Bank | Dukungan multiple rekening bank dengan saldo terpisah | P0 |
| KB-03 | Rekonsiliasi Bank | Matching otomatis dengan statement bank | P0 |
| KB-04 | Transfer Antar Kas | Transfer antar kas/bank dengan jurnal otomatis | P0 |
| KB-05 | Bank Feeds | Import transaksi dari file bank statement (CSV/OFX) | P1 |

### 4.6 Modul Aset Tetap

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| AT-01 | Registrasi Aset | Input data aset tetap dengan detail (harga perolehan, umur ekonomis) | P0 |
| AT-02 | Depresiasi | Kalkulasi depresiasi otomatis (garis lurus, saldo menurun) sesuai PSAK | P0 |
| AT-03 | Jurnal Depresiasi | Generate jurnal penyesuaian depresiasi bulanan | P0 |
| AT-04 | Penjualan/Disposal Aset | aset yang dijual/dibuang dengan calculate gain/loss | P0 |
| AT-05 | Revaluasi Aset | Dukungan revaluasi sesuai standar yang berlaku | P1 |
| AT-06 | Asset Tracking | Pelacakan lokasi dan penanggung jawab aset | P1 |

### 4.7 Modul Pajak

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| PAJAK-01 | PPN Menu | Dashboard untuk monitoring PPN Masukan dan Keluaran | P0 |
| PAJAK-02 | SPT Masa PPN | Generate SPT Masa PPN 1111 ABC | P0 |
| PAJAK-03 | PPh Badan | Kalkulasi PPh Pasal 25 (angsuran bulanan) dan PPh Final | P0 |
| PAJAK-04 | PPh Pasal 21 | Perhitungan PPh 21 karyawan (gross, net, gross-up) | P0 |
| PAJAK-05 | PPh Pasal 23 | Pemotongan PPh 23 atas jasa/komoditi | P0 |
| PAJAK-06 | PPh Pasal 4 ayat 2 | PPh Final atas sewa, jasa konstruksi, dll | P0 |
| PAJAK-07 | e-SPT Integration | Export data ke format e-SPT DJP | P1 |
| PAJAK-08 | PPN DTP | Dukungan untuk PPN Ditanggung Pemerintah (PPN DTP) | P1 |

### 4.8 Modul Laporan Keuangan

Sesuai PSAK 1 tentang Penyajian Laporan Keuangan:

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|--------|
| LAP-01 | Neraca | Laporan Posisi Keuangan (neraca) sesuai format PSAK | P0 |
| LAP-02 | Laba Rugi | Laporan Laba Rugi (metode single-step dan multi-step) | P0 |
| LAP-03 | Laporan Arus Kas | Cash Flow Statement (direct & indirect method) sesuai PSAK 2 | P0 |
| LAP-04 | Laporan Perubahan Ekuitas | Perubahan modal sesuai PSAK | P0 |
| LAP-05 | Catatan atas Laporan Keuangan | Auto-generate CALK dengan template standar | P1 |
| LAP-06 | Laporan Perpajakan | SPT Tahunan Badan (1770/1770S/1770SS) | P0 |
| LAP-07 | Laporan Manajemen |aging piutang, hutang, rasio keuangan | P1 |
| LAP-08 | Konsolidasi | Laporan konsolidasi untuk grup perusahaan | P1 |

### 4.9 Modul Penutup Buku

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| PB-01 | Tahapan Penutup | Panduan step-by-step untuk closing bulanan/tahunan | P0 |
| PB-02 | Jurnal Penutup | Membuat jurnal penutup otomatis (pendapatan, beban → ikhtisar) | P0 |
| PB-03 | Locking Period | Mencegah edit transaksi di periode yang sudah ditutup | P0 |
| PB-04 | Pembukaan Tahun Baru | Setup saldo awal tahun dari neraca saldo akhir tahun sebelumnya | P0 |

### 4.10 Modul User Management & Settings

| ID | Fitur | Deskripsi | Prioritas |
|----|-------|-----------|-----------|
| USER-01 | Multi User | Role-based access control (Admin, Akuntan, Viewer) | P0 |
| USER-02 | Audit Log | Pencatatan semua aktivitas user dengan timestamp | P0 |
| USER-03 | Data Company | Setup profil perusahaan sesuai NPWP, alamat, PKP | P0 |
| USER-04 | Fiscal Year | Konfigurasi tahun fiskal (Jan-Des atau custom) | P0 |
| USER-05 | Backup & Restore | Backup data otomatis dan restore | P0 |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Parameter | Target |
|-----------|--------|
| Page Load Time | < 3 detik |
| Transaction Processing | < 2 detik per transaksi |
| Report Generation | < 30 detik untuk laporan bulanan |
| Concurrent Users | Minimal 50 users simultan |
| Database Capacity | support minimal 100,000 transaksi per company |

### 5.2 Security

| Requirement | Spesifikasi |
|-------------|-------------|
| Enkripsi Data | AES-256 untuk data at-rest, TLS 1.3 untuk data in-transit |
| Authentication | OAuth 2.0 + MFA (Multi-Factor Authentication) |
| Password Policy | Minimal 8 karakter, kombinasi huruf, angka, simbol |
| Session Timeout | 30 menit inactive → auto logout |
| Data Privacy | sesuai UU PDP (Perlindungan Data Pribadi) No. 27/2022 |
| Audit Trail | Logging semua create/update/delete dengan user ID & timestamp |
| Role-Based Access | Granular permission per modul dan fitur |

### 5.3 Scalability

| Aspek | Requirement |
|-------|-------------|
| Multi-Company | support multiple perusahaan dalam 1 tenant |
| Multi-Branch | support multiplecabang dengan konsolidasi |
| Cloud-Ready | Arsitektur microservices untuk deployment cloud |
| API | RESTful API untuk integrasi pihak ketiga |

### 5.4 Compliance & Regulation

| Standar | Description |
|---------|-------------|
| PSAK | Sesuai Standar Akuntansi Keuangan Indonesia (IAI) |
| UU PPh | UU Perpajakan Indonesia No. 36 Tahun 2008 dan perubahannya |
| UU PPN | UU PPN No. 42 Tahun 2009 dan PMK terbaru |
| e-Faktur DJP | Integrasi dengan sistem e-Faktur DJP |
| e-SPT | Kompatibel dengan format e-SPT DJP |
| PSAK 73 | Standar Akuntansi untuk Leases |
| PSAK 76 | Pengukuran Nilai Wajar |
| IFRS Alignment | 최대한 alignment dengan IFRS untuk transparansi internasional |

### 5.5 Availability

| Parameter | Target |
|-----------|--------|
| Uptime | 99.5% (downtime maksimal 3.6 jam/bulan) |
| Backup Frequency | Real-time replication + daily full backup |
| Disaster Recovery | RTO < 4 jam, RPO < 1 jam |
| Support | Helpdesk 24/7 untuk critical issues |

---

## 6. Tech Stack Recommendations

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Web App (SPA)  │  │  Desktop App     │  │   Mobile App     │  │
│  │   React + TS     │  │  Electron + Tauri │  │   React Native   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │ HTTPS/WSS
┌─────────────────────────────────┴───────────────────────────────────┐
│                          API GATEWAY                                 │
│                    Kong / AWS API Gateway                            │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                       BACKEND SERVICES                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │   Auth Svc   │ │  Company Svc │ │ Transaction  │ │  Report Svc│  │
│  │   (Node.js)  │ │   (Node.js)  │ │  (Node.js)   │ │  (Node.js) │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │   Tax Svc    │ │   PDF Svc   │ │   Email Svc  │ │  Audit Svc │  │
│  │   (Node.js)  │ │   (Node.js) │ │   (Node.js)  │ │  (Node.js) │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                          DATA LAYER                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   PostgreSQL     │  │     Redis        │  │    MongoDB       │   │
│  │   (Primary DB)   │  │   (Cache/Queue)  │  │  (Audit Logs)    │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Tech Stack Detail

| Layer | Teknologi | Justifikasi |
|-------|-----------|-------------|
| **Frontend Web** | React 18+ + TypeScript + Vite | Ecosystem besar, performance tinggi, type safety |
| **State Management** | Zustand / Redux Toolkit | Lightweight dan scalable untuk aplikasi kompleks |
| **UI Framework** | Ant Design / Shadcn UI | Komponen siap pakai, accessible, customizable |
| **Charts** | Recharts / Apache ECharts | Visualisasi data keuangan yang interaktif |
| **Desktop App** | Tauri 2.0 (Rust) | Lebih ringan dari Electron, native performance |
| **Mobile App** | React Native | Share codebase dengan web, ekosistem mature |
| **Backend** | Node.js + Fastify / NestJS | High performance, async I/O, cocok untuk real-time |
| **Database** | PostgreSQL 15+ | ACID compliance, relational integrity, PSAK-compliant |
| **Cache** | Redis 7+ | Session management, caching query, real-time features |
| **Document DB** | MongoDB | Audit logs, flexible schema untuk konfigurasi |
| **Message Queue** | RabbitMQ / BullMQ | Async processing untuk report generation |
| **Search** | Elasticsearch | Full-text search untuk chart of accounts, transactions |
| **File Storage** | S3-compatible (MinIO) | Store dokumen, faktur pajak, backups |
| **PDF Generation** | Puppeteer / Playwright | Generate laporan dalam format PDF |
| **Authentication** | Keycloak / Auth0 | SSO, MFA, OAuth 2.0 integration |
| **Monitoring** | Grafana + Prometheus | System monitoring dan alerting |
| **Logging** | ELK Stack (Elasticsearch, Logstash, Kibana) | Centralized logging |
| **CI/CD** | GitHub Actions / GitLab CI | Automated testing dan deployment |
| **Container** | Docker + Kubernetes | Scalable microservices deployment |

### 6.3 Database Schema Design (Simplified)

```sql
-- Companies / Entitas
CREATE TABLE companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    npwp VARCHAR(20) UNIQUE,
    pkp_number VARCHAR(20),
    address TEXT,
    email VARCHAR(255),
    phone VARCHAR(20),
    fiscal_year_start DATE DEFAULT '01-01',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chart of Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    parent_id UUID REFERENCES accounts(id),
    tax_mapping VARCHAR(50), -- PPN_MASUKAN, PPN_KELUARAN, etc.
    is_active BOOLEAN DEFAULT TRUE,
    level INTEGER DEFAULT 1,
    FOREIGN KEY (company_id, account_code) UNIQUE
);

-- Transactions Header
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- SALES, PURCHASE, CASH_IN, CASH_OUT, JOURNAL
    reference_number VARCHAR(50),
    description TEXT,
    total_amount DECIMAL(18,2),
    tax_amount DECIMAL(18,2),
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, POSTED, CANCELLED
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Transaction Lines (Double-Entry)
CREATE TABLE transaction_lines (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    account_id UUID REFERENCES accounts(id),
    debit DECIMAL(18,2) DEFAULT 0,
    credit DECIMAL(18,2) DEFAULT 0,
    description VARCHAR(255),
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(18,2)
);

-- Fiscal Years / Periods
CREATE TABLE fiscal_periods (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED, LOCKED
    closed_at TIMESTAMP,
    closed_by UUID REFERENCES users(id)
);
```

---

## 7. Timeline & Milestones

### 7.1 Development Phases

```
═══════════════════════════════════════════════════════════════════════════════
                           FINCORP INDONESIA - PROJECT TIMELINE
═══════════════════════════════════════════════════════════════════════════════

║  PHASE          ║  DURASI   ║  MINGGU 1-4   MINGGU 5-8   MINGGU 9-12  MINGGU 13-16  MINGGU 17-20  MINGGU 21-24  MINGGU 25-28  MINGGU 29-32  ║
╠═════════════════╬═══════════╬═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Phase 0        ║           ║                                                                                                            ║
║  Foundation     ║  4 mg     ║  ████                                                                                                     ║
║  (Setup + Auth) ║           ║                                                                                                            ║
╠═════════════════╬═══════════╬═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Phase 1        ║           ║           ████                                                                                            ║
║  Core Modules   ║  8 mg     ║           [Akuntansi Dasar + Kas Bank + Jurnal]                                                            ║
╠═════════════════╬═══════════╬═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Phase 2        ║           ║                       ████                                                                                 ║
║  Sales &        ║  8 mg     ║                       [Penjualan + Pembelian + Faktur Pajak + e-Faktur Integration]                        ║
║  Procurement    ║           ║                                                                                                            ║
╠═════════════════╬═══════════╬═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Phase 3        ║           ║                                               ████                                                       ║
║  Advanced       ║  8 mg     ║                                               [Aset Tetap + Depresiasi + Pajak + Penutup Buku]        ║
║  Modules        ║           ║                                                                                                            ║
╠═════════════════╬═══════════╬═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Phase 4        ║           ║                                                                   ████                                      ║
║  Reporting &    ║  8 mg     ║                                                                   [Laporan Keuangan + Dashboard + Export]     ║
║  Analytics      ║           ║                                                                                                            ║
╠═════════════════╬═══════════╬═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Phase 5        ║           ║                                                                                           ████               ║
║  Integration &  ║  8 mg     ║                                                                                           [e-Faktur API +    ║
║  Testing        ║           ║                                                                                           e-SPT + UAT]       ║
╠═════════════════╬═══════════╬═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣
║  Launch Prep    ║           ║                                                                                                             ████   ║
║  & Go-Live      ║  4 mg     ║                                                                                                             [Deployment +    ║
║                 ║           ║                                                                                                             Migration]     ║
╚═════════════════╩═══════════╩═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝

Total Duration: 32 weeks (8 months)
```

### 7.2 Milestone Detail

| Milestone | Target Date | Deliverables | Acceptance Criteria |
|-----------|-------------|--------------|---------------------|
| M0: Foundation | Week 4 | Auth system, Company setup, User management, Base infrastructure | Login, user CRUD, company config working |
| M1: Core Accounting | Week 8 | COA, Jurnal Umum, Buku Besar, Kas/Bank, Rekonsiliasi | Can create journal entries, generate sub-ledger |
| M2: Sales & Purchase | Week 16 | Invoice, Faktur Pajak, Purchase, e-Faktur import | Full sales cycle working |
| M3: Advanced Modules | Week 24 | Aset Tetap, Depresiasi, Pajak, Penutup Buku | Calculate depreciation, close period |
| M4: Reporting | Week 28 | Neraca, Laba Rugi, Arus Kas, Dashboard | All 3 statements generate correctly |
| M5: Integration | Week 32 | e-Faktur API, e-SPT export, API docs | Successful upload to DJP sandbox |
| M6: Go-Live | Week 36 | Production deployment, Migration, Support | System live with first 10 customers |

---

## 8. Success Metrics & KPIs

### 8.1 Product KPIs

| KPI | Definition | Target (6 months) |
|-----|------------|-------------------|
| DAU (Daily Active Users) | Unique users who log in and perform transaction daily | 500 users |
| MAU (Monthly Active Users) | Unique users who log in at least once/month | 2,000 users |
| Transaction Volume | Number of transactions recorded monthly | 50,000 transactions |
| Report Generation Success | % reports generated without error | >99% |
| System Uptime | Availability SLA compliance | 99.5% |

### 8.2 Customer Success KPIs

| KPI | Target |
|-----|--------|
| Time to First Transaction | < 4 hours after signup |
| Customer Retention Rate | >85% (monthly) |
| NPS (Net Promoter Score) | >50 |
| Customer Satisfaction Score | >4.5/5 |
| Average Support Response Time | < 4 hours |

### 8.3 Financial KPIs

| KPI | Target |
|-----|--------|
| Monthly Recurring Revenue (MRR) | Rp 150 juta (6 months post-launch) |
| Customer Acquisition Cost (CAC) | < Rp 500,000 |
| Customer Lifetime Value (CLV) | > Rp 6,000,000 |
| CLV:CAC Ratio | > 12:1 |

### 8.4 Technical KPIs

| KPI | Target |
|-----|--------|
| API Response Time (p95) | < 500ms |
| Page Load Time (p95) | < 3 seconds |
| Error Rate | < 0.1% |
| Deployment Frequency | Weekly |
| Lead Time for Changes | < 2 days |

---

## 9. Risks & Mitigations

### 9.1 Risk Matrix

```
SEVERITY →
         │  Low (1)    │  Medium (2)   │  High (3)     │  Critical (4)
─────────┼─────────────┼──────────────┼───────────────┼────────────────
Likely  │  Minor       │  Moderate    │  Major        │  Catastrophic
  (3)   │  Delays      │  Budget Over │  Compliance   │  Data Breach
─────────┼─────────────┼──────────────┼───────────────┼────────────────
Possible│  Low Impact  │  Manageable  │  Significant  │  Severe
  (2)   │  Issues      │  Risks       │  Delays       │  Reputation
─────────┼─────────────┼──────────────┼───────────────┼────────────────
Unlikely│  Negligible  │  Minor       │  Moderate     │  Major
  (1)   │  Concerns    │  Concerns    │  Concerns     │  Concerns
```

### 9.2 Identified Risks & Mitigation Strategies

| Risk ID | Risk Description | Impact | Likelihood | Risk Score | Mitigation Strategy | Contingency Plan |
|---------|------------------|--------|------------|------------|---------------------|------------------|
| R-01 | Perubahan regulasi pajak (PMK/PP/UU baru) | High | High | 9 | Partnership dengan konsultan pajak; modular design untuk update cepat; monitoring regulasi bulanan | Rapid response team; hotfix deployment dalam 48 jam |
| R-02 | e-Faktur DJP API change/breaking changes | Critical | Medium | 8 | Abstraction layer untuk integrasi DJP; versioned API integration; sandbox testing environment | Fallback ke manual upload; partner dengan pihak yang punya akses API |
| R-03 | Data security breach | Critical | Low | 4 | Security audit quarterly; penetration testing; SOC 2 compliance preparation; encrypted DB | Incident response plan; cyber insurance; customer notification protocol |
| R-04 | Key developer attrition | High | Medium | 6 | Knowledge documentation; code review culture; competitive compensation; cross-training | Contractor agreements; documentation handover; recruitment pipeline |
| R-05 | Low user adoption | High | Medium | 6 | Onboarding flow optimization; in-app guidance; customer success team; video tutorials | Freemium model; feature simplification; focus groups |
| R-06 | Database performance degradation | High | Low | 3 | Query optimization; indexing strategy; caching layer; horizontal scaling plan | Database partitioning; read replicas; performance audit |
| R-07 | Compliance with UU PDP | High | Medium | 6 | Data privacy impact assessment; consent management; data retention policy; encryption at rest | Legal counsel on standby; rapid policy updates |
| R-08 | Integration failures with third-party banks | Medium | Medium | 4 | Multiple bank integrations; error handling; retry mechanisms; fallback to manual | Manual reconciliation mode; priority bug fixing |
| R-09 | Scalability issues with concurrent users | Medium | Low | 2 | Load testing; auto-scaling; microservices architecture; cloud-native design | Rate limiting; graceful degradation; horizontal scaling |
| R-10 | Currency/exchange rate complexity | Medium | Medium | 4 | Multi-currency module with BI rate integration; real-time conversion; historical rate tracking | Manual override option; consultant support |

### 9.3 Compliance Checklist

| Regulation | Requirement | Implementation Status |
|------------|-------------|----------------------|
| UU No. 27/2022 tentang PDP | Perlindungan data pribadi | Planned (Phase 5) |
| PSAK 1 - Penyajian LK | Format laporan keuangan | In Scope |
| PSAK 2 - Laporan Arus Kas | Metode langsung & tidak langsung | In Scope |
| PSAK 73 - Sewa | Recognition lease | Planned (Phase 3) |
| UU PPN No. 42/2009 | Faktur Pajak elektronik | In Scope |
| UU PPh No. 36/2008 | Perhitungan pajak badan & karyawan | In Scope |
| PMK-231/2019 | SPT Masa PPN | In Scope |
| SE-50/PJ/2015 | Upload Faktur Pajak | In Scope |

---

## 10. Appendix

### 10.1 Glossary

| Term | Definition |
|------|------------|
| PSAK | Pernyataan Standar Akuntansi Keuangan - Standar akuntansi yang diterbitkan IAI |
| SAK | Standar Akuntansi Keuangan |
| PPN | Pajak Pertambahan Nilai |
| PPh | Pajak Penghasilan |
| NPWP | Nomor Pokok Wajib Pajak |
| PKP | Pengusaha Kena Pajak |
| DJP | Direktorat Jenderal Pajak |
| e-Faktur | Sistem Faktur Pajak Elektronik DJP |
| e-SPT | Sistem SPT Elektronik DJP |
| COA | Chart of Accounts - Daftar akun akuntansi |
| SPT | Surat Pemberitahuan Pajak |
| Neraca | Laporan Posisi Keuangan |
| Laba Rugi | Laporan Laba Rugi |
| Arus Kas | Cash Flow Statement |
| Depresiasi | Penyusutan aset tetap |
| Amortisasi | Penyusutan aset tidak berwujud |
| PSAK 73 | Standar akuntansi untuk Sewa (setara IFRS 16) |

### 10.2 Reference Standards

1. **IAI (Ikatan Akuntan Indonesia)**: www.iaiglobal.or.id
2. **DJP (Direktorat Jenderal Pajak)**: www.pajak.go.id
3. **UU Perpajakan Indonesia**: Kompilasi peraturan perpajakan terbaru
4. **PSAK Revisi 2024-2025**: Berdasarkan update terbaru IAI

### 10.3 Future Roadmap (Post v1.0)

| Quarter | Feature |
|---------|---------|
| Q3 2027 | API Marketplace untuk integrasi pihak ketiga |
| Q4 2027 | AI-powered anomaly detection untuk transaksi mencurigakan |
| Q1 2028 | Multi-currency advanced dengan hedging |
| Q2 2028 | Expense management mobile app |
| Q3 2028 | Payroll module integration |
| Q4 2028 | Business intelligence & predictive analytics |

---

**Document Version:** 1.0  
**Last Updated:** Juni 2026  
**Author:** Product Management Team  
**Status:** Draft for Review