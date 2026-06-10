'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { Company } from '@/data/types';

const defaultCompanies: Company[] = [
  {
    id: 'comp-001',
    name: 'PT FinCorp Indonesia Makmur Jaya',
    npwp: '01.234.567.8-901.000',
    nib: '9120391283091',
    pkpNumber: '01.234.567.8-901.000',
    pkpDate: '2015-08-15',
    address: 'Gedung Keuangan Tower Lt. 14, Jl. Jend. Sudirman Kav. 50, Jakarta Pusat, DKI Jakarta 10220',
    email: 'finance@fincorp.co.id',
    phone: '(021) 555-1234',
    kpp: 'KPP Pratama Jakarta Setiabudi Dua',
    isPkpActive: true,
    fiscalYearStart: 1
  },
  {
    id: 'comp-002',
    name: 'PT FinCorp Surabaya Branch Office',
    npwp: '01.234.567.8-901.002',
    nib: '9120391283092',
    pkpNumber: '01.234.567.8-901.002',
    pkpDate: '2018-11-20',
    address: 'Pakuwon Center Lt. 22, Jl. Embong Malang No. 4, Surabaya, Jawa Timur 60261',
    email: 'surabaya@fincorp.co.id',
    phone: '(031) 555-7890',
    kpp: 'KPP Pratama Surabaya Genteng',
    isPkpActive: true,
    fiscalYearStart: 1
  },
  {
    id: 'comp-003',
    name: 'CV FinCorp Digital Solusindo',
    npwp: '02.345.678.9-901.000',
    nib: '9120391283095',
    pkpNumber: '02.345.678.9-901.000',
    pkpDate: '2021-04-10',
    address: 'Jl. Ngagel Jaya Selatan No. 12, Surabaya, Jawa Timur 60284',
    email: 'info@fincorpdigital.co.id',
    phone: '(031) 555-4321',
    kpp: 'KPP Pratama Surabaya Gubeng',
    isPkpActive: false,
    fiscalYearStart: 1
  }
];

export default function CompaniesPage() {
  const { company, updateCompany, showToast } = useApp();

  // Companies List state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState('');

  // Switch transition state
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchingToName, setSwitchingToName] = useState('');

  // Add Company Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNpwp, setNewNpwp] = useState('');
  const [newNib, setNewNib] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newKpp, setNewKpp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPkpNumber, setNewPkpNumber] = useState('');
  const [newPkpDate, setNewPkpDate] = useState('');
  const [newIsPkpActive, setNewIsPkpActive] = useState(true);
  const [newFiscalStart, setNewFiscalStart] = useState(1);

  // Edit Company Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState('');
  const [editName, setEditName] = useState('');
  const [editNpwp, setEditNpwp] = useState('');
  const [editNib, setEditNib] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editKpp, setEditKpp] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPkpNumber, setEditPkpNumber] = useState('');
  const [editPkpDate, setEditPkpDate] = useState('');
  const [editIsPkpActive, setEditIsPkpActive] = useState(true);
  const [editFiscalStart, setEditFiscalStart] = useState(1);

  // Load companies from localStorage on mount
  useEffect(() => {
    const storedCompanies = localStorage.getItem('fincorp_companies');
    if (storedCompanies) {
      setCompanies(JSON.parse(storedCompanies));
    } else {
      setCompanies(defaultCompanies);
      localStorage.setItem('fincorp_companies', JSON.stringify(defaultCompanies));
    }

    if (company) {
      setActiveCompanyId(company.id || 'comp-001');
    }
  }, [company]);

  // Switch Active Company Flow
  const handleSwitchCompany = (target: Company) => {
    setIsSwitching(true);
    setSwitchingToName(target.name);

    setTimeout(() => {
      // 1. Update global context
      updateCompany(target);

      // 2. Save active ID to localStorage
      setActiveCompanyId(target.id);
      
      setIsSwitching(false);
      // Redirect to dashboard to refresh view
      window.location.href = '/dashboard';
    }, 1200);
  };

  // Add New Subsidiary / Cabang
  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newNpwp || !newAddress) {
      showToast('Nama, NPWP, dan Alamat wajib diisi.', 'warning');
      return;
    }

    const newCompany: Company = {
      id: `comp-${Date.now()}`,
      name: newName,
      npwp: newNpwp,
      nib: newNib,
      pkpNumber: newPkpNumber || newNpwp,
      pkpDate: newPkpDate || new Date().toISOString().split('T')[0],
      address: newAddress,
      email: newEmail || 'office@fincorp.co.id',
      phone: newPhone || '(021) 555-0000',
      kpp: newKpp || 'KPP Setempat',
      isPkpActive: newIsPkpActive,
      fiscalYearStart: Number(newFiscalStart)
    };

    const updated = [...companies, newCompany];
    setCompanies(updated);
    localStorage.setItem('fincorp_companies', JSON.stringify(updated));

    // Reset Form & Close
    setNewName('');
    setNewNpwp('');
    setNewNib('');
    setNewAddress('');
    setNewKpp('');
    setNewEmail('');
    setNewPhone('');
    setNewPkpNumber('');
    setNewPkpDate('');
    setNewIsPkpActive(true);
    setNewFiscalStart(1);
    setIsAddModalOpen(false);

    showToast(`Perusahaan / Cabang baru "${newCompany.name}" berhasil didaftarkan.`, 'success');
  };

  // Edit Company Details
  const handleEditClick = (target: Company) => {
    setEditingCompanyId(target.id);
    setEditName(target.name);
    setEditNpwp(target.npwp);
    setEditNib(target.nib);
    setEditAddress(target.address);
    setEditKpp(target.kpp);
    setEditEmail(target.email);
    setEditPhone(target.phone);
    setEditPkpNumber(target.pkpNumber);
    setEditPkpDate(target.pkpDate);
    setEditIsPkpActive(target.isPkpActive);
    setEditFiscalStart(target.fiscalYearStart);
    setIsEditModalOpen(true);
  };

  const handleSaveEditCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editNpwp || !editAddress) {
      showToast('Nama, NPWP, dan Alamat wajib diisi.', 'warning');
      return;
    }

    const updated = companies.map(c => {
      if (c.id === editingCompanyId) {
        const updatedCompany: Company = {
          id: c.id,
          name: editName,
          npwp: editNpwp,
          nib: editNib,
          pkpNumber: editPkpNumber || editNpwp,
          pkpDate: editPkpDate || c.pkpDate,
          address: editAddress,
          email: editEmail,
          phone: editPhone,
          kpp: editKpp,
          isPkpActive: editIsPkpActive,
          fiscalYearStart: Number(editFiscalStart)
        };

        // If this is currently the active company, sync it to the global context context immediately
        if (c.id === activeCompanyId) {
          updateCompany(updatedCompany);
        }
        return updatedCompany;
      }
      return c;
    });

    setCompanies(updated);
    localStorage.setItem('fincorp_companies', JSON.stringify(updated));
    setIsEditModalOpen(false);
    showToast('Detail data perusahaan berhasil diperbarui.', 'success');
  };

  return (
    <Layout showSearch={false}>
      <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Page Header */}
        <PageHeader
          title="Daftar Perusahaan & Cabang"
          description="Kelola multi-entity, registrasi anak perusahaan (subsidiary), kantor cabang regional, dan beralih profil kerja."
          actions={
            <Button
              icon="add"
              className="bg-gradient-secondary-premium text-white hover:shadow-lg"
              onClick={() => setIsAddModalOpen(true)}
            >
              Tambah Entitas Baru
            </Button>
          }
        />

        {/* Double Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Companies Grid */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {companies.map((c) => {
                const isActive = c.id === activeCompanyId;
                return (
                  <div
                    key={c.id}
                    className={`glass-card p-5 rounded-2xl flex flex-col justify-between border-2 transition-all duration-300 relative group overflow-hidden ${
                      isActive 
                        ? 'border-secondary bg-gradient-to-br from-white/90 via-white/80 to-secondary/5 dark:from-primary-container/30 dark:to-secondary/5 ring-4 ring-secondary/10' 
                        : 'border-border-subtle hover:-translate-y-1 hover:border-secondary-container/30 hover:shadow-md'
                    }`}
                  >
                    {/* Active Glow Accent */}
                    {isActive && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-secondary font-bold text-[24px] rotate-45 -translate-y-2 translate-x-2">bookmark</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Name & Badge */}
                      <div className="pr-10 min-w-0">
                        <h4 className="font-headline-sm text-headline-sm font-bold text-primary dark:text-secondary-container truncate" title={c.name}>
                          {c.name}
                        </h4>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8.5px] font-bold mt-1.5 border uppercase ${
                          isActive 
                            ? 'bg-secondary/15 border-secondary/25 text-secondary dark:text-secondary-container' 
                            : 'bg-surface-container-low border-border-subtle text-on-surface-variant'
                        }`}>
                          {isActive && <span className="w-1 h-1 rounded-full bg-secondary animate-pulse"></span>}
                          {isActive ? 'Entitas Aktif' : 'Subsidiari / Cabang'}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs text-on-surface-variant font-medium">
                        <div className="flex gap-2">
                          <span className="material-symbols-outlined text-[15px] text-outline">fingerprint</span>
                          <span className="font-tabular-nums">NPWP: {c.npwp}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="material-symbols-outlined text-[15px] text-outline">badge</span>
                          <span className="font-tabular-nums">NIB: {c.nib || '-'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="material-symbols-outlined text-[15px] text-outline">domain</span>
                          <span className="line-clamp-2 leading-relaxed">Alamat: {c.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border-subtle/30 justify-between shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="edit"
                        className="text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
                        onClick={() => handleEditClick(c)}
                      >
                        Edit Detail
                      </Button>
                      
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleSwitchCompany(c)}
                          className="px-3.5 py-1.5 text-[11px] font-bold bg-secondary hover:bg-secondary-container text-white rounded-xl shadow-sm border border-secondary/20 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                          Aktifkan Entitas
                        </button>
                      )}
                      
                      {isActive && (
                        <span className="text-[10px] text-secondary font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Sedang Bekerja
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Consolidated Overview */}
          <div className="space-y-6">
            {/* Overview Widget */}
            <div className="glass-card p-5 rounded-2xl border border-border-subtle/50 space-y-4">
              <h3 className="font-bold text-primary dark:text-secondary-container text-xs uppercase tracking-wider border-b border-border-subtle/40 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">analytics</span>
                Ringkasan Konsolidasi
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Total Entitas Legal</span>
                  <span className="font-bold text-on-surface font-tabular-nums">{companies.length} Entitas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Pengusaha Kena Pajak (PKP)</span>
                  <span className="font-bold text-on-surface font-tabular-nums">
                    {companies.filter(c => c.isPkpActive).length} Entitas Aktif
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">KPP Koordinator</span>
                  <span className="font-bold text-on-surface text-right max-w-[150px] truncate" title="KPP Wajib Pajak Besar">KPP Wajib Pajak Besar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant font-medium">Mata Uang Pembukuan</span>
                  <span className="font-bold text-secondary">Multicurrency (IDR Utama)</span>
                </div>
              </div>
            </div>

            {/* Quick Helper */}
            <div className="glass-card p-5 rounded-2xl border border-border-subtle/50 space-y-3 bg-gradient-to-br from-white/70 to-secondary/5 dark:from-primary-container/20 dark:to-secondary/5">
              <h4 className="font-bold text-primary dark:text-secondary-container text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Tentang Multi-Tenant
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Fitur multi-tenant memungkinkan Anda mengelola pembukuan beberapa cabang bisnis, kantor regional, atau subsidiari hukum secara terpisah. Mengaktifkan entitas tertentu akan memuat profile legal, perpajakan, COA, dan pembukuan entitas tersebut di seluruh dashboard sistem.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Switching Loader Overlay */}
      {isSwitching && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-150 flex flex-col items-center justify-center gap-4 text-white animate-fade-in animate-duration-200">
          <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-secondary animate-spin"></div>
          <div className="text-center space-y-1">
            <h4 className="font-headline-sm text-headline-sm font-bold animate-pulse">Sedang beralih entitas...</h4>
            <p className="text-xs text-white/70 max-w-xs">{switchingToName}</p>
          </div>
        </div>
      )}

      {/* TAMBAH ENTITAS MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-surface border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-scale-up text-xs">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">add_business</span>
                <h3 className="font-bold text-primary dark:text-secondary-container text-body-lg">
                  Registrasi Entitas Baru
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nama Perusahaan Resmi</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PT FinCorp Medan Branch"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">NPWP Perusahaan</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01.234.567.8-901.003"
                    value={newNpwp}
                    onChange={(e) => setNewNpwp(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">NIB</label>
                  <input
                    type="text"
                    placeholder="e.g. 9120391283099"
                    value={newNib}
                    onChange={(e) => setNewNib(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Email Kantor</label>
                  <input
                    type="email"
                    placeholder="e.g. medan@fincorp.co.id"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nomor Telepon</label>
                  <input
                    type="text"
                    placeholder="e.g. (061) 555-9999"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Alamat Terdaftar</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Gedung Grand Central Lt. 3, Jl. Pemuda No. 12, Medan, Sumatera Utara"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-2.5 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">KPP Terdaftar</label>
                  <input
                    type="text"
                    placeholder="e.g. KPP Pratama Medan Barat"
                    value={newKpp}
                    onChange={(e) => setNewKpp(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Bulan Awal Fiskal</label>
                  <select
                    value={newFiscalStart}
                    onChange={(e) => setNewFiscalStart(Number(e.target.value))}
                    className="w-full h-9 px-2 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface cursor-pointer font-semibold"
                  >
                    <option value={1}>Januari</option>
                    <option value={4}>April</option>
                    <option value={7}>Juli</option>
                    <option value={10}>Oktober</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-white/40 dark:bg-black/15 border border-border-subtle/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Status Pengukuhan PKP</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newIsPkpActive}
                      onChange={(e) => setNewIsPkpActive(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                {newIsPkpActive && (
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">No. Pengukuhan PKP</label>
                      <input
                        type="text"
                        placeholder="e.g. PKP-2026-015"
                        value={newPkpNumber}
                        onChange={(e) => setNewPkpNumber(e.target.value)}
                        className="w-full h-8 px-2 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-body-xs focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Tgl Pengukuhan PKP</label>
                      <input
                        type="date"
                        value={newPkpDate}
                        onChange={(e) => setNewPkpDate(e.target.value)}
                        className="w-full h-8 px-2 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-body-xs focus:border-secondary outline-none transition-all text-on-surface"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle/40 mt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>Batal</Button>
                <Button size="sm" type="submit" className="bg-gradient-secondary-premium text-white">Daftarkan Entitas</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ENTITAS MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-surface border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-scale-up text-xs">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">edit_document</span>
                <h3 className="font-bold text-primary dark:text-secondary-container text-body-lg">
                  Edit Detail Entitas
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditCompany} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nama Perusahaan Resmi</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">NPWP Perusahaan</label>
                  <input
                    type="text"
                    required
                    value={editNpwp}
                    onChange={(e) => setEditNpwp(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">NIB</label>
                  <input
                    type="text"
                    value={editNib}
                    onChange={(e) => setEditNib(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Email Kantor</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Nomor Telepon</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md text-label-md text-on-surface-variant font-bold">Alamat Terdaftar</label>
                <textarea
                  rows={2}
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">KPP Terdaftar</label>
                  <input
                    type="text"
                    value={editKpp}
                    onChange={(e) => setEditKpp(e.target.value)}
                    className="w-full h-9 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Bulan Awal Fiskal</label>
                  <select
                    value={editFiscalStart}
                    onChange={(e) => setEditFiscalStart(Number(e.target.value))}
                    className="w-full h-9 px-2 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface cursor-pointer font-semibold"
                  >
                    <option value={1}>Januari</option>
                    <option value={4}>April</option>
                    <option value={7}>Juli</option>
                    <option value={10}>Oktober</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-white/40 dark:bg-black/15 border border-border-subtle/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface-variant font-bold">Status Pengukuhan PKP</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editIsPkpActive}
                      onChange={(e) => setEditIsPkpActive(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                {editIsPkpActive && (
                  <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">No. Pengukuhan PKP</label>
                      <input
                        type="text"
                        value={editPkpNumber}
                        onChange={(e) => setEditPkpNumber(e.target.value)}
                        className="w-full h-8 px-2 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-body-xs focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Tgl Pengukuhan PKP</label>
                      <input
                        type="date"
                        value={editPkpDate}
                        onChange={(e) => setEditPkpDate(e.target.value)}
                        className="w-full h-8 px-2 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-body-xs focus:border-secondary outline-none transition-all text-on-surface font-tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle/40 mt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                <Button size="sm" type="submit" className="bg-gradient-secondary-premium text-white">Simpan Perubahan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
