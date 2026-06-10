'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';

type SettingsTab = 'company' | 'fiscal' | 'users' | 'backup';

export default function SettingsPage() {
  const { company, updateCompany } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [companyNpwp, setCompanyNpwp] = useState('');
  const [companyNib, setCompanyNib] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [pkpDate, setPkpDate] = useState('');
  const [kpp, setKpp] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState(1);

  // Sync form states with context when company changes
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setCompanyNpwp(company.npwp || '');
      setCompanyNib(company.nib || '');
      setCompanyAddress(company.address || '');
      setPkpDate(company.pkpDate || '');
      setKpp(company.kpp || '');
      setFiscalMonth(company.fiscalYearStart || 1);
    }
  }, [company]);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany({
      name: companyName,
      npwp: companyNpwp,
      nib: companyNib,
      address: companyAddress,
      pkpDate,
      kpp,
    });
    alert('Profil perusahaan berhasil diperbarui.');
  };

  const handleSaveFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany({
      fiscalYearStart: Number(fiscalMonth),
    });
    alert('Konfigurasi tahun fiskal berhasil diperbarui.');
  };

  const tabs = [
    { id: 'company' as const, label: 'Profil Perusahaan', icon: 'domain' },
    { id: 'fiscal' as const, label: 'Tahun Fiskal', icon: 'calendar_month' },
    { id: 'users' as const, label: 'Hak Akses', icon: 'shield_person' },
    { id: 'backup' as const, label: 'Backup Data', icon: 'cloud_download' },
  ];

  return (
    <Layout showSearch={false}>
      <div className="space-y-6 animate-slide-up">
        {/* Page Header */}
        <div className="p-margin-edge py-6 border border-border-subtle/50 bg-gradient-secondary-premium text-white rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-2 text-white/85 mb-2 relative z-10">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
            <span className="font-label-md text-label-md">Pengaturan</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-white font-bold relative z-10">Konfigurasi Sistem</h2>
          <p className="text-white/80 mt-1 text-body-sm relative z-10 leading-relaxed max-w-xl">
            Kelola profil legal perusahaan, perpajakan, tahun fiskal, hak akses pengguna, serta preferensi operasional sistem.
          </p>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Settings Navigation Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="glass-card p-3 rounded-2xl border border-border-subtle/50 w-full">
              <nav className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 custom-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap lg:whitespace-normal text-left transition-all cursor-pointer w-full ${
                      activeTab === tab.id
                        ? 'bg-secondary text-white font-bold shadow-md shadow-secondary/15'
                        : 'text-on-surface-variant hover:bg-primary/5 dark:hover:bg-white/5 font-medium text-body-md'
                    }`}
                  >
                    <span 
                      className="material-symbols-outlined text-[20px]" 
                      style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {tab.icon}
                    </span>
                    <span className="text-body-md">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Active Settings Panel */}
          <div className="flex-1 w-full pb-20">
            {activeTab === 'company' && (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                {/* Card: Identitas Utama */}
                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-6 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">badge</span>
                    Identitas Perusahaan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nama Perusahaan Lengkap</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Nama legal resmi perusahaan yang tertera di Akta Pendirian, NIB, atau TDP.
                          </div>
                        </div>
                      </div>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nomor Pokok Wajib Pajak (NPWP)</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Format NPWP 15 atau 16 digit sesuai ketentuan format kartu NPWP terbaru DJP.
                          </div>
                        </div>
                      </div>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md font-tabular-nums focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
                        type="text"
                        required
                        placeholder="e.g. 01.234.567.8-901.000"
                        value={companyNpwp}
                        onChange={(e) => setCompanyNpwp(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nomor Induk Berusaha (NIB)</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Nomor identitas usaha resmi yang dikeluarkan melalui portal OSS Republik Indonesia.
                          </div>
                        </div>
                      </div>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md font-tabular-nums focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
                        type="text"
                        required
                        placeholder="e.g. 1234567890123"
                        value={companyNib}
                        onChange={(e) => setCompanyNib(e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Alamat Terdaftar</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Alamat domisili legal perusahaan sesuai dengan dokumen Keterangan Domisili atau Akta.
                          </div>
                        </div>
                      </div>
                      <textarea
                        className="w-full p-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all resize-none outline-none"
                        rows={3}
                        required
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Card: Status Pajak */}
                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <div className="flex justify-between items-center mb-6 border-b border-border-subtle/40 pb-4">
                    <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined">receipt_long</span>
                      Status Perpajakan
                    </h3>
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-label-md font-label-md bg-success-positive/10 text-success-positive border border-success-positive/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-success-positive mr-2 animate-pulse"></span>
                      PKP AKTIF
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Tanggal Pengukuhan PKP</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Tanggal saat perusahaan dikukuhkan sebagai Pengusaha Kena Pajak oleh DJP.
                          </div>
                        </div>
                      </div>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
                        type="date"
                        value={pkpDate}
                        onChange={(e) => setPkpDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Kantor Pelayanan Pajak (KPP)</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Kantor Pelayanan Pajak tempat NPWP perusahaan terdaftar (e.g. KPP Pratama Jakarta Palmerah).
                          </div>
                        </div>
                      </div>
                      <input 
                        type="text"
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none"
                        value={kpp}
                        onChange={(e) => setKpp(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Floating Save Actions Bar */}
                <div className="fixed bottom-6 right-6 lg:right-10 bg-white/80 dark:bg-black/60 backdrop-blur-md border border-border-subtle/70 dark:border-white/15 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 z-30 animate-slide-up">
                  <span className="text-body-sm text-on-surface-variant font-medium hidden md:inline">Perubahan Belum Disimpan</span>
                  <Button type="submit" className="bg-gradient-secondary-premium text-white hover:shadow-lg hover:shadow-secondary/25 transition-all">Simpan Profil</Button>
                </div>
              </form>
            )}

            {activeTab === 'fiscal' && (
              <form onSubmit={handleSaveFiscal}>
                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-6 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">calendar_today</span>
                    Konfigurasi Tahun Fiskal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Bulan Awal Tahun Fiskal</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Bulan mulainya siklus pembukuan tahunan baru (Standar Indonesia: Januari).
                          </div>
                        </div>
                      </div>
                      <select 
                        value={fiscalMonth}
                        onChange={(e) => setFiscalMonth(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none cursor-pointer"
                      >
                        <option value={1}>Januari</option>
                        <option value={4}>April</option>
                        <option value={7}>Juli</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="font-label-md text-label-md text-on-surface-variant font-bold">Periode Akuntansi</label>
                        <div className="relative group/tooltip inline-block cursor-help text-outline hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-primary text-white text-[10px] p-2.5 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none z-30 leading-normal font-normal normal-case">
                            Metode pembagian periode pelaporan akuntansi internal perusahaan.
                          </div>
                        </div>
                      </div>
                      <select className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none cursor-pointer">
                        <option>12 Bulan (Januari - Desember)</option>
                        <option>13 Periode (4-4-4 Mingguan)</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Floating Save Actions Bar */}
                <div className="fixed bottom-6 right-6 lg:right-10 bg-white/80 dark:bg-black/60 backdrop-blur-md border border-border-subtle/70 dark:border-white/15 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 z-30 animate-slide-up">
                  <span className="text-body-sm text-on-surface-variant font-medium hidden md:inline">Perubahan Belum Disimpan</span>
                  <Button type="submit" className="bg-gradient-secondary-premium text-white hover:shadow-lg hover:shadow-secondary/25 transition-all">Simpan Fiskal</Button>
                </div>
              </form>
            )}

            {activeTab === 'users' && (
              <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-6 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">shield_person</span>
                  Manajemen Hak Akses
                </h3>
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <span className="material-symbols-outlined text-[64px] text-outline/30 animate-pulse">lock_person</span>
                  <div className="font-headline-sm text-on-surface font-semibold">Modul Hak Akses Dikunci</div>
                  <p className="text-on-surface-variant text-body-sm max-w-sm">
                    Modul manajemen pengguna &amp; hak akses saat ini dikontrol oleh Kantor Pusat. Hubungi administrator IT untuk menambah pengguna.
                  </p>
                </div>
              </section>
            )}

            {activeTab === 'backup' && (
              <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-6 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">backup</span>
                  Backup &amp; Restore Data
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/10 rounded-xl border border-border-subtle/50">
                    <div>
                      <p className="font-body-md text-body-md text-on-surface font-semibold">Backup Otomatis Harian</p>
                      <p className="text-body-sm text-on-surface-variant mt-0.5">Sistem membackup basis data setiap pukul 02:00 WIB</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-positive/10 text-success-positive border border-success-positive/20">AKTIF</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/10 rounded-xl border border-border-subtle/50">
                    <div>
                      <p className="font-body-md text-body-md text-on-surface font-semibold">Backup Manual Sekarang</p>
                      <p className="text-body-sm text-on-surface-variant mt-0.5">Unduh arsip sql/json terbaru untuk disimpan offline</p>
                    </div>
                    <Button 
                      variant="outline" 
                      icon="download"
                      onClick={() => alert('Menyiapkan berkas backup... Unduhan akan dimulai otomatis.')}
                    >
                      Download Backup
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}