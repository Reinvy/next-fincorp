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
    { id: 'users' as const, label: 'Manajemen Pengguna', icon: 'group' },
    { id: 'backup' as const, label: 'Backup Data', icon: 'cloud_download' },
  ];

  return (
    <Layout showSearch={false}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="px-margin-edge py-6 border-b border-border-subtle bg-surface-container-lowest rounded-xl">
          <div className="flex items-center gap-2 text-on-surface-variant mb-2">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
            <span className="font-label-md text-label-md">Pengaturan</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Pengaturan Perusahaan</h2>
          <p className="text-on-surface-variant mt-1 text-body-sm">
            Kelola profil, perpajakan, tahun fiskal, dan preferensi operasional sistem.
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Settings Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg whitespace-nowrap lg:whitespace-normal text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-surface-container-high text-on-surface font-semibold text-body-md shadow-sm border border-border-subtle/50'
                      : 'text-on-surface-variant hover:bg-surface-container-low text-body-md'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Active Section */}
          <div className="flex-1 space-y-6">
            {activeTab === 'company' && (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                {/* Card: Identitas Utama */}
                <section className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 shadow-sm">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 border-b border-border-subtle pb-4">
                    Identitas Perusahaan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Nama Perusahaan Lengkap</label>
                      <input
                        className="w-full h-10 px-3 bg-surface-bright border border-border-subtle rounded text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Nomor Pokok Wajib Pajak (NPWP)</label>
                      <input
                        className="w-full h-10 px-3 bg-surface-bright border border-border-subtle rounded text-body-md font-tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none"
                        type="text"
                        value={companyNpwp}
                        onChange={(e) => setCompanyNpwp(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Nomor Induk Berusaha (NIB)</label>
                      <input
                        className="w-full h-10 px-3 bg-surface-bright border border-border-subtle rounded text-body-md font-tabular-nums focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none"
                        type="text"
                        value={companyNib}
                        onChange={(e) => setCompanyNib(e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Alamat Terdaftar</label>
                      <textarea
                        className="w-full p-3 bg-surface-bright border border-border-subtle rounded text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none outline-none"
                        rows={3}
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Card: Status Pajak */}
                <section className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6 border-b border-border-subtle pb-4">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Status Perpajakan</h3>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-md font-label-md bg-success-positive/10 text-success-positive border border-success-positive/20">
                      <span className="w-2 h-2 rounded-full bg-success-positive mr-2 animate-pulse"></span>
                      PKP AKTIF
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Tanggal Pengukuhan PKP</label>
                      <input
                        className="w-full h-10 px-3 bg-surface-bright border border-border-subtle rounded text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none"
                        type="date"
                        value={pkpDate}
                        onChange={(e) => setPkpDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Kantor Pelayanan Pajak (KPP)</label>
                      <input 
                        type="text"
                        className="w-full h-10 px-3 bg-surface-bright border border-border-subtle rounded text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none"
                        value={kpp}
                        onChange={(e) => setKpp(e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                {/* Action Bar */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="submit">Simpan Perubahan</Button>
                </div>
              </form>
            )}

            {activeTab === 'fiscal' && (
              <form onSubmit={handleSaveFiscal}>
                <section className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 shadow-sm">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 border-b border-border-subtle pb-4">
                    Konfigurasi Tahun Fiskal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Bulan Awal Tahun Fiskal</label>
                      <select 
                        value={fiscalMonth}
                        onChange={(e) => setFiscalMonth(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-surface-bright border border-border-subtle rounded text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none cursor-pointer"
                      >
                        <option value={1}>Januari</option>
                        <option value={4}>April</option>
                        <option value={7}>Juli</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Periode Akuntansi</label>
                      <select className="w-full h-10 px-3 bg-surface-bright border border-border-subtle rounded text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none cursor-pointer">
                        <option>12 Bulan (Januari - Desember)</option>
                        <option>13 Periode (4-4-4 Mingguan)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6">
                    <Button type="submit">Simpan Perubahan</Button>
                  </div>
                </section>
              </form>
            )}

            {activeTab === 'users' && (
              <section className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 shadow-sm">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 border-b border-border-subtle pb-4">
                  Manajemen Pengguna
                </h3>
                <p className="text-on-surface-variant text-body-sm">
                  Fitur manajemen pengguna akan segera hadir. Untuk saat ini, Anda dapat menghubungi administrator sistem.
                </p>
              </section>
            )}

            {activeTab === 'backup' && (
              <section className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 shadow-sm">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 border-b border-border-subtle pb-4">
                  Backup & Restore Data
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border-subtle">
                    <div>
                      <p className="font-body-md text-body-md text-on-surface">Backup Otomatis</p>
                      <p className="text-body-sm text-on-surface-variant">Dijadwalkan setiap hari Minggu pukul 02:00</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-success-positive/10 text-success-positive border border-success-positive/20">AKTIF</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border-subtle">
                    <div>
                      <p className="font-body-md text-body-md text-on-surface">Backup Manual</p>
                      <p className="text-body-sm text-on-surface-variant">Unduh salinan data terbaru</p>
                    </div>
                    <Button variant="outline" icon="download">Download Backup</Button>
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