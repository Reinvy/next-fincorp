'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { users as mockUsers } from '@/data';
import type { User } from '@/data/types';

type SettingsTab = 'company' | 'fiscal' | 'users' | 'backup';

export default function SettingsPage() {
  const { company, updateCompany } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  // Company Profile states
  const [companyName, setCompanyName] = useState('');
  const [companyNpwp, setCompanyNpwp] = useState('');
  const [companyNib, setCompanyNib] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [pkpDate, setPkpDate] = useState('');
  const [kpp, setKpp] = useState('');
  const [pkpNumber, setPkpNumber] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');

  // Fiscal & Operations states
  const [fiscalMonth, setFiscalMonth] = useState(1);
  const [baseCurrency, setBaseCurrency] = useState('IDR');
  const [accountingPeriod, setAccountingPeriod] = useState('12 Bulan (Januari - Desember)');
  const [isClosingLocked, setIsClosingLocked] = useState(false);

  // Users Management states
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'ACCOUNTANT' | 'VIEWER'>('ACCOUNTANT');

  // Backup & Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  // Load configuration & states on mount
  useEffect(() => {
    // 1. Sync company states with context
    if (company) {
      setCompanyName(company.name || '');
      setCompanyNpwp(company.npwp || '');
      setCompanyNib(company.nib || '');
      setCompanyAddress(company.address || '');
      setPkpDate(company.pkpDate || '');
      setKpp(company.kpp || '');
      setPkpNumber(company.pkpNumber || '');
      setCompanyEmail(company.email || '');
      setCompanyPhone(company.phone || '');
      setFiscalMonth(company.fiscalYearStart || 1);
    }

    // 2. Load company logo
    const storedLogo = localStorage.getItem('fincorp_company_logo');
    if (storedLogo) {
      setCompanyLogo(storedLogo);
    }

    // 3. Load users list
    const storedUsers = localStorage.getItem('fincorp_users');
    if (storedUsers) {
      setUsersList(JSON.parse(storedUsers));
    } else {
      setUsersList(mockUsers);
      localStorage.setItem('fincorp_users', JSON.stringify(mockUsers));
    }

    // 4. Load fiscal & operational settings
    const storedSettings = localStorage.getItem('fincorp_settings');
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      setBaseCurrency(settings.baseCurrency || 'IDR');
      setAccountingPeriod(settings.accountingPeriod || '12 Bulan (Januari - Desember)');
      setIsClosingLocked(settings.isClosingLocked || false);
    }
  }, [company]);

  // Handle Logo Upload
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran berkas melebihi batas 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCompanyLogo(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Saving Company Profile
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany({
      name: companyName,
      npwp: companyNpwp,
      nib: companyNib,
      address: companyAddress,
      pkpDate,
      kpp,
      pkpNumber,
      email: companyEmail,
      phone: companyPhone,
    });
    if (companyLogo) {
      localStorage.setItem('fincorp_company_logo', companyLogo);
    } else {
      localStorage.removeItem('fincorp_company_logo');
    }
    alert('Profil legalitas dan kontak perusahaan berhasil diperbarui.');
  };

  // Handle Saving Fiscal Preferences
  const handleSaveFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany({
      fiscalYearStart: Number(fiscalMonth),
    });
    const settings = {
      baseCurrency,
      accountingPeriod,
      isClosingLocked
    };
    localStorage.setItem('fincorp_settings', JSON.stringify(settings));
    alert('Konfigurasi tahun fiskal dan preferensi operasional berhasil diperbarui.');
  };

  // Handle Users Management
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      alert('Mohon lengkapi nama dan email pengguna.');
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      avatar: undefined
    };

    const updatedUsers = [...usersList, newUser];
    setUsersList(updatedUsers);
    localStorage.setItem('fincorp_users', JSON.stringify(updatedUsers));

    // Reset Form
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('ACCOUNTANT');
    setIsUserModalOpen(false);
    alert(`Pengguna baru "${newUserName}" berhasil didaftarkan.`);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus hak akses pengguna "${userName}"?`)) {
      const updatedUsers = usersList.filter(u => u.id !== userId);
      setUsersList(updatedUsers);
      localStorage.setItem('fincorp_users', JSON.stringify(updatedUsers));
      alert(`Hak akses pengguna "${userName}" berhasil dihapus.`);
    }
  };

  // Handle Data Backup (JSON Export)
  const handleExportBackup = () => {
    const backupData: { [key: string]: string | null } = {};
    const keys = [
      'fincorp_company',
      'fincorp_accounts',
      'fincorp_sales',
      'fincorp_purchases',
      'fincorp_assets',
      'fincorp_banks',
      'fincorp_txs',
      'fincorp_alerts',
      'fincorp_users',
      'fincorp_company_logo',
      'fincorp_settings'
    ];

    keys.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        backupData[key] = val;
      }
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const filename = `fincorp_backup_${new Date().toISOString().split('T')[0]}.json`;
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Data Restore (JSON Import)
  const handleImportRestore = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError('');
    setRestoreSuccess('');

    if (!restoreFile) {
      setRestoreError('Silakan pilih berkas backup JSON terlebih dahulu.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);

        // Simple validation check: must contain key settings like fincorp_company or fincorp_accounts
        const hasCompany = 'fincorp_company' in backupData;
        const hasAccounts = 'fincorp_accounts' in backupData;

        if (!hasCompany && !hasAccounts) {
          setRestoreError('Berkas backup tidak valid atau tidak dikenali oleh FinCorp.');
          return;
        }

        // Apply backup keys to localStorage
        Object.keys(backupData).forEach(key => {
          if (key.startsWith('fincorp_')) {
            localStorage.setItem(key, backupData[key]);
          }
        });

        setRestoreSuccess('Data berhasil dipulihkan! Memuat ulang sistem...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (err) {
        setRestoreError('Gagal memproses berkas backup. Pastikan berkas berformat JSON.');
      }
    };
    reader.readAsText(restoreFile);
  };

  const tabs = [
    { id: 'company' as const, label: 'Profil Perusahaan', icon: 'domain' },
    { id: 'fiscal' as const, label: 'Tahun Fiskal & Preferensi', icon: 'calendar_month' },
    { id: 'users' as const, label: 'Hak Akses & Pengguna', icon: 'shield_person' },
    { id: 'backup' as const, label: 'Backup & Restore Data', icon: 'cloud_download' },
  ];

  return (
    <Layout showSearch={false}>
      <div className="space-y-6 animate-slide-up pb-10">
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
          <div className="flex-1 w-full">
            
            {/* TAB 1: Company Profile */}
            {activeTab === 'company' && (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                
                {/* Logo & Identitas */}
                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-6 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">badge</span>
                    Identitas Perusahaan
                  </h3>

                  {/* Logo Uploader */}
                  <div className="flex flex-col sm:flex-row gap-5 items-center bg-white/40 dark:bg-black/10 p-5 rounded-2xl border border-border-subtle/50 mb-6">
                    <div className="relative w-20 h-20 rounded-full border border-border-subtle overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner shrink-0 group">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[36px] text-outline">domain</span>
                      )}
                      <label className="absolute inset-0 bg-black/40 text-white text-[10px] font-bold flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="material-symbols-outlined text-[16px] mb-0.5">photo_camera</span>
                        Ubah Logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      </label>
                    </div>
                    <div>
                      <h4 className="font-bold text-primary dark:text-secondary-container text-body-md mb-0.5">Logo Perusahaan</h4>
                      <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">Format yang didukung: PNG, JPG, GIF. Maksimal ukuran 2MB. Logo ini akan digunakan pada kop surat resmi laporan keuangan.</p>
                      {companyLogo && (
                        <button 
                          type="button" 
                          onClick={() => setCompanyLogo('')} 
                          className="text-error hover:underline text-[11px] font-semibold mt-1.5 flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          Hapus Logo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="col-span-1 md:col-span-2">
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Nama Perusahaan Lengkap</label>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Nomor Pokok Wajib Pajak (NPWP)</label>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md font-tabular-nums focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        type="text"
                        required
                        placeholder="e.g. 01.234.567.8-901.000"
                        value={companyNpwp}
                        onChange={(e) => setCompanyNpwp(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Nomor Induk Berusaha (NIB)</label>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md font-tabular-nums focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        type="text"
                        required
                        placeholder="e.g. 1234567890123"
                        value={companyNib}
                        onChange={(e) => setCompanyNib(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Email Kantor Utama</label>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        type="email"
                        required
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Nomor Telepon</label>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md font-tabular-nums focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        type="text"
                        required
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Alamat Terdaftar Resmi</label>
                      <textarea
                        className="w-full p-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all resize-none outline-none text-on-surface"
                        rows={3}
                        required
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Status Pajak */}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Nomor Seri Pengukuhan PKP</label>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md font-tabular-nums focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        type="text"
                        placeholder="e.g. PKP-2023-999"
                        value={pkpNumber}
                        onChange={(e) => setPkpNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Tanggal Pengukuhan PKP</label>
                      <input
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        type="date"
                        value={pkpDate}
                        onChange={(e) => setPkpDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Kantor Pelayanan Pajak (KPP)</label>
                      <input 
                        type="text"
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
                        value={kpp}
                        onChange={(e) => setKpp(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Floating Save Actions Bar */}
                <div className="fixed bottom-6 right-6 lg:right-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-border-subtle/70 dark:border-white/15 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 z-30 animate-slide-up">
                  <span className="text-body-sm text-on-surface-variant font-medium hidden md:inline">Perubahan Belum Disimpan</span>
                  <Button type="submit" className="bg-gradient-secondary-premium text-white hover:shadow-lg hover:shadow-secondary/25 transition-all">Simpan Profil</Button>
                </div>
              </form>
            )}

            {/* TAB 2: Fiscal & Preferences */}
            {activeTab === 'fiscal' && (
              <form onSubmit={handleSaveFiscal} className="space-y-6">
                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-6 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">calendar_today</span>
                    Konfigurasi Tahun Fiskal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Bulan Awal Tahun Fiskal</label>
                      <select 
                        value={fiscalMonth}
                        onChange={(e) => setFiscalMonth(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none cursor-pointer text-on-surface"
                      >
                        <option value={1}>Januari (Standar Indonesia)</option>
                        <option value={4}>April</option>
                        <option value={7}>Juli</option>
                        <option value={10}>Oktober</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Periode Pelaporan Akuntansi</label>
                      <select 
                        value={accountingPeriod}
                        onChange={(e) => setAccountingPeriod(e.target.value)}
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none cursor-pointer text-on-surface"
                      >
                        <option value="12 Bulan (Januari - Desember)">12 Bulan (Januari - Desember)</option>
                        <option value="13 Periode (4-4-4 Mingguan)">13 Periode (4-4-4 Mingguan)</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-6 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">settings_accessibility</span>
                    Preferensi Operasional & Mata Uang
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold block mb-1.5">Mata Uang Dasar Pembukuan (Base Currency)</label>
                      <select 
                        value={baseCurrency}
                        onChange={(e) => setBaseCurrency(e.target.value)}
                        className="w-full h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-md focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none cursor-pointer text-on-surface"
                      >
                        <option value="IDR">Rupiah Indonesia (IDR)</option>
                        <option value="USD">Dolar Amerika Serikat (USD)</option>
                        <option value="EUR">Euro Uni Eropa (EUR)</option>
                        <option value="SGD">Dolar Singapura (SGD)</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center justify-between p-3.5 bg-white/40 dark:bg-black/10 rounded-xl border border-border-subtle/50">
                        <div>
                          <p className="text-xs font-bold text-on-surface">Kunci Transaksi Bulanan (Closing Lock)</p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Mencegah modifikasi jurnal voucher pada periode tutup buku.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isClosingLocked}
                            onChange={(e) => setIsClosingLocked(e.target.checked)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Floating Save Actions Bar */}
                <div className="fixed bottom-6 right-6 lg:right-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-border-subtle/70 dark:border-white/15 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 z-30 animate-slide-up">
                  <span className="text-body-sm text-on-surface-variant font-medium hidden md:inline">Perubahan Belum Disimpan</span>
                  <Button type="submit" className="bg-gradient-secondary-premium text-white hover:shadow-lg hover:shadow-secondary/25 transition-all">Simpan Konfigurasi</Button>
                </div>
              </form>
            )}

            {/* TAB 3: Users & Access Control */}
            {activeTab === 'users' && (
              <section className="glass-card rounded-2xl p-6 border border-border-subtle/50 space-y-6">
                <div className="flex justify-between items-center border-b border-border-subtle/40 pb-4">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined">shield_person</span>
                    Manajemen Hak Akses & Pengguna
                  </h3>
                  <Button 
                    icon="add"
                    size="sm"
                    className="bg-gradient-secondary-premium text-white"
                    onClick={() => setIsUserModalOpen(true)}
                  >
                    Tambah Pengguna
                  </Button>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto border border-border-subtle/50 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-surface-container-low/50 border-b border-border-subtle/50 font-label-md text-label-md text-on-surface-variant">
                      <tr className="h-10">
                        <th className="py-2 px-4 font-semibold">Nama Pengguna</th>
                        <th className="py-2 px-4 font-semibold">Alamat Email</th>
                        <th className="py-2 px-4 font-semibold">Peran Sistem</th>
                        <th className="py-2 px-4 font-semibold text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/30 text-on-surface font-body-sm">
                      {usersList.map((usr) => (
                        <tr key={usr.id} className="hover:bg-primary/[0.01] transition-colors h-11">
                          <td className="py-2 px-4 font-bold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                              {usr.name.slice(0, 2)}
                            </div>
                            {usr.name}
                          </td>
                          <td className="py-2 px-4 font-tabular-nums text-on-surface-variant">{usr.email}</td>
                          <td className="py-2 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              usr.role === 'ADMIN' 
                                ? 'bg-danger-liability/10 text-danger-liability' 
                                : usr.role === 'ACCOUNTANT' 
                                ? 'bg-primary/10 text-primary' 
                                : 'bg-success-positive/10 text-success-positive'
                            }`}>{usr.role}</span>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(usr.id, usr.name)}
                              className="p-1 rounded-md text-outline hover:text-error hover:bg-error-container/10 transition-colors cursor-pointer"
                              title="Hapus Hak Akses"
                              disabled={usersList.length === 1}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* TAB 4: Backup & Restore */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                {/* Backup Module */}
                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-4 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">cloud_download</span>
                    Cadangkan Data (Backup)
                  </h3>
                  <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                    Unduh cadangan data terenkripsi yang berisi seluruh transaksi keuangan, bagan akun (COA), aset tetap, mutasi bank, dan konfigurasi profil perusahaan. Berkas ini dapat digunakan sewaktu-waktu untuk memulihkan sistem jika terjadi kendala.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/10 rounded-xl border border-border-subtle/50">
                      <div>
                        <p className="font-body-md text-body-md text-on-surface font-semibold">Backup Otomatis Harian</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">Sistem membackup basis data setiap pukul 02:00 WIB ke server pusat.</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-positive/10 text-success-positive border border-success-positive/20">AKTIF</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/10 rounded-xl border border-border-subtle/50">
                      <div>
                        <p className="font-body-md text-body-md text-on-surface font-semibold">Ekspor Berkas Backup Manual (.json)</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">Unduh berkas arsip database terbaru secara manual ke komputer Anda.</p>
                      </div>
                      <Button 
                        variant="secondary" 
                        icon="download"
                        className="bg-gradient-secondary-premium text-white hover:shadow-lg"
                        onClick={handleExportBackup}
                      >
                        Download Backup
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Restore Module */}
                <section className="glass-card rounded-2xl p-6 border border-border-subtle/50">
                  <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold mb-4 border-b border-border-subtle/40 pb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">settings_backup_restore</span>
                    Pulihkan Data (Restore)
                  </h3>
                  <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                    Unggah berkas JSON hasil backup FinCorp sebelumnya untuk memulihkan seluruh basis data akuntansi. 
                    <strong className="text-danger-liability block mt-1">PERINGATAN: Tindakan ini akan menggantikan seluruh data transaksi yang ada saat ini secara permanen.</strong>
                  </p>

                  <form onSubmit={handleImportRestore} className="space-y-4">
                    {restoreError && (
                      <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs font-bold border border-error/20 flex items-center gap-2 animate-shake">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        {restoreError}
                      </div>
                    )}
                    {restoreSuccess && (
                      <div className="p-3 rounded-xl bg-success-positive/10 text-success-positive text-xs font-bold border border-success-positive/20 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        {restoreSuccess}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-on-surface-variant font-bold">Pilih Berkas Backup (.json)</label>
                      <div className="border-2 border-dashed border-border-subtle/70 rounded-xl p-6 bg-white/30 dark:bg-black/10 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-low/40 transition-colors relative group">
                        <span className="material-symbols-outlined text-[36px] text-outline">upload_file</span>
                        <span className="text-xs text-on-surface font-semibold text-center">
                          {restoreFile ? restoreFile.name : 'Pilih berkas backup atau seret ke sini'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">Berkas harus dalam format JSON hasil ekspor FinCorp</span>
                        <input 
                          type="file" 
                          accept=".json" 
                          required
                          onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button 
                        type="submit" 
                        icon="restore" 
                        className="bg-gradient-warning-premium text-white hover:shadow-lg hover:shadow-warning-deadline/20"
                        disabled={!restoreFile}
                      >
                        Pulihkan Data Sekarang
                      </Button>
                    </div>
                  </form>
                </section>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Tambah Pengguna Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-surface border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 relative flex flex-col gap-4 animate-scale-up text-xs">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">person_add</span>
                <h3 className="font-bold text-primary dark:text-secondary-container text-body-lg">
                  Daftarkan Pengguna Baru
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nama Lengkap Pengguna</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Heni Novia"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Alamat Email Pengguna</label>
                <input 
                  type="email"
                  required
                  placeholder="e.g. heni.novia@fincorp.co.id"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Peran Hak Akses (Role)</label>
                <select 
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all cursor-pointer text-on-surface font-semibold"
                >
                  <option value="ACCOUNTANT">Akuntan (Akses Transaksi &amp; Pembukuan)</option>
                  <option value="ADMIN">Administrator (Akses Sistem Penuh)</option>
                  <option value="VIEWER">Auditor / Viewer (Akses Baca Laporan)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle/40 mt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsUserModalOpen(false)}>Batal</Button>
                <Button size="sm" type="submit" className="bg-gradient-secondary-premium text-white">Simpan Pengguna</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}