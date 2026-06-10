'use client';

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { FixedAsset } from '@/data/types';

// Parsing helper for Indonesian dates
const parsePurchaseYear = (dateStr: string): number => {
  if (!dateStr) return new Date().getFullYear();
  // e.g. "24 Okt 2023" or "2023-10-24"
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const year = parseInt(parts[2], 10);
    if (!isNaN(year)) return year;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getFullYear();
  return new Date().getFullYear();
};

export default function FixedAssetsPage() {
  const { fixedAssets, addFixedAsset, runDepreciation, disposeFixedAsset, showToast } = useApp();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Drill-down Modal State
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  // Add Asset Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('Peralatan Kantor');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [usefulLife, setUsefulLife] = useState(4);
  const [errorMsg, setErrorMsg] = useState('');

  // Categories definition
  const categories = [
    { id: 'Peralatan Kantor', label: 'Peralatan', icon: 'desktop_windows' },
    { id: 'Kendaraan', label: 'Kendaraan', icon: 'directions_car' },
    { id: 'Bangunan', label: 'Bangunan', icon: 'apartment' },
    { id: 'Mesin & Alat', label: 'Mesin & Alat', icon: 'precision_manufacturing' }
  ];

  // Dynamically Filtered Fixed Assets
  const filteredAssets = useMemo(() => {
    return fixedAssets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            asset.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryFilter === 'ALL' || asset.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [fixedAssets, searchQuery, selectedCategoryFilter]);

  // Calculate dynamic stats based on filtered list
  const totalPurchasePrice = useMemo(() => fixedAssets.reduce((sum, a) => sum + a.purchasePrice, 0), [fixedAssets]);
  const totalAccumulatedDepreciation = useMemo(() => fixedAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0), [fixedAssets]);
  const totalNetBookValue = useMemo(() => fixedAssets.reduce((sum, a) => sum + a.netBookValue, 0), [fixedAssets]);

  // Register New Asset
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!assetName || purchasePrice <= 0 || usefulLife <= 0) {
      setErrorMsg('Harap lengkapi semua field aset dengan benar.');
      return;
    }

    addFixedAsset({
      name: assetName,
      category: assetCategory,
      purchaseDate: new Date(purchaseDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      purchasePrice,
      usefulLife,
      depreciationMethod: 'STRAIGHT_LINE',
    });

    // Reset & Close Modal
    setAssetName('');
    setAssetCategory('Peralatan Kantor');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchasePrice(0);
    setUsefulLife(4);
    setIsModalOpen(false);
    showToast(`Aset "${assetName}" berhasil didaftarkan ke sistem.`, 'success');
  };

  // Run Depreciation Action
  const handleRunDepreciationClick = () => {
    runDepreciation();
    showToast('Proses penyusutan bulanan selesai dijalankan dan dicatat ke jurnal akuntansi.', 'success');
  };

  // Asset Disposal Action (Write-off)
  const handleDisposeClick = (asset: FixedAsset) => {
    const confirmMsg = asset.netBookValue > 0
      ? `Apakah Anda yakin ingin melepas aset "${asset.name}"? Aset ini memiliki sisa Nilai Buku sebesar Rp ${asset.netBookValue.toLocaleString('id-ID')}. Pelepasan akan memicu pencatatan biaya kerugian penghapusan aset ke jurnal.`
      : `Apakah Anda yakin ingin melepas aset "${asset.name}" dari operasi perusahaan?`;

    if (confirm(confirmMsg)) {
      disposeFixedAsset(asset.id);
      setSelectedAsset(null);
      showToast(`Aset "${asset.name}" berhasil dihapuskan.`, 'success');
    }
  };

  // Projection schedule calculator for drill-down modal
  const depreciationSchedule = useMemo(() => {
    if (!selectedAsset) return [];
    
    const schedule = [];
    const cost = selectedAsset.purchasePrice;
    const life = selectedAsset.usefulLife;
    const annualDep = Math.round(cost / life);
    const purchaseYear = parsePurchaseYear(selectedAsset.purchaseDate);

    let accumDep = 0;
    
    for (let i = 1; i <= life; i++) {
      const begValue = cost - accumDep;
      let depExpense = annualDep;
      
      // Adjust final year rounding
      if (i === life) {
        depExpense = cost - accumDep;
      }
      
      accumDep += depExpense;
      const endValue = cost - accumDep;

      schedule.push({
        yearLabel: `Tahun ${i} (${purchaseYear + i - 1})`,
        begValue,
        depExpense,
        accumDep,
        endValue
      });
    }

    return schedule;
  }, [selectedAsset]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Page Header */}
        <PageHeader
          title={
            <div className="flex flex-wrap items-center gap-3">
              <span>Aset Tetap</span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase bg-success-positive/10 text-success-positive border border-success-positive/20 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-success-positive rounded-full animate-pulse"></span>
                PSAK Aktif
              </span>
            </div>
          }
          description="Kelola, pantau depresiasi, dan rekam pelepasan aset tetap perusahaan secara real-time."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="sync" 
                onClick={handleRunDepreciationClick}
              >
                Jalankan Penyusutan
              </Button>
              <Button 
                icon="add" 
                onClick={() => setIsModalOpen(true)}
              >
                Tambah Aset Baru
              </Button>
            </div>
          }
        />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Total Perolehan */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-secondary relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-on-surface-variant/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">shopping_cart</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Nilai Perolehan</p>
            <p className="text-xl font-bold tracking-tight text-on-surface font-tabular-nums">
              {formatCurrency(totalPurchasePrice)}
            </p>
            <span className="text-[10px] text-success-positive flex items-center gap-1 mt-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success-positive animate-pulse"></span>
              Aset aktif terdaftar
            </span>
          </div>

          {/* Card 2: Total Akumulasi */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-warning-deadline relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-on-surface-variant/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">update</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Akumulasi Penyusutan</p>
            <p className="text-xl font-bold tracking-tight text-warning-deadline font-tabular-nums">
              {formatCurrency(totalAccumulatedDepreciation)}
            </p>
            <span className="text-[10px] text-on-surface-variant/60 block mt-1 font-medium">Metode Garis Lurus (Straight Line)</span>
          </div>

          {/* Card 3: Net Book Value */}
          <div className="bg-gradient-premium border-none p-5 rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="absolute right-2 bottom-2 text-white/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">account_balance</span>
            </div>
            <div>
              <p className="font-label-md text-[10.5px] text-white/80 mb-1 uppercase tracking-widest">Total Nilai Buku Bersih (NBV)</p>
              <p className="text-xl font-bold tracking-tight text-white font-tabular-nums">
                {formatCurrency(totalNetBookValue)}
              </p>
            </div>
            <span className="text-[10px] text-white/70 block mt-1 font-medium">Nilai Aktiva Neto Neraca</span>
          </div>

        </div>

        {/* Assets Main Panel */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col hover:border-secondary-container/20 transition-colors duration-300">
          
          {/* Table Header and Search */}
          <div className="px-6 py-4 border-b border-border-subtle/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-muted/20">
            <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold tracking-wider uppercase">
              Inventaris Aset Tetap Perusahaan
            </h3>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/65 text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-4 py-1.5 border border-border-subtle focus:border-secondary/40 focus:ring-1 focus:ring-secondary/20 rounded-xl font-body-sm text-xs bg-surface-container-low text-on-surface focus:outline-none outline-none"
                placeholder="Cari nama atau kategori..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Tabs Filter */}
          <div className="px-6 py-2 bg-surface-muted/10 border-b border-border-subtle/30 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                  : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
              }`}
            >
              Semua Aset
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  selectedCategoryFilter === cat.id
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-surface-muted/30 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Nama Aset</th>
                  <th className="px-6 py-3 font-semibold">Kategori</th>
                  <th className="px-6 py-3 font-semibold">Tanggal Beli</th>
                  <th className="px-6 py-3 font-semibold text-right">Harga Perolehan</th>
                  <th className="px-6 py-3 font-semibold text-center">Umur (Thn)</th>
                  <th className="px-6 py-3 font-semibold text-right">Akumulasi Susut</th>
                  <th className="px-6 py-3 font-semibold text-right">Nilai Buku Bersih</th>
                  <th className="px-6 py-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle/40 font-tabular-nums">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-on-surface-variant italic">
                      Tidak ada aset yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset, index) => {
                    const depPercent = asset.purchasePrice > 0 
                      ? Math.min((asset.accumulatedDepreciation / asset.purchasePrice) * 100, 100) 
                      : 0;

                    return (
                      <tr 
                        key={asset.id} 
                        onClick={() => setSelectedAsset(asset)}
                        className={`hover:bg-surface-container-low/70 transition-colors duration-200 cursor-pointer h-11 ${
                          index % 2 === 1 ? 'bg-surface-muted/10' : ''
                        }`}
                      >
                        <td className="px-6 py-2">
                          <span className="font-bold text-on-surface group-hover:text-primary transition-colors">
                            {asset.name}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-on-surface-variant/80 font-medium">{asset.category}</td>
                        <td className="px-6 py-2 text-on-surface-variant/80">{asset.purchaseDate}</td>
                        <td className="px-6 py-2 text-right font-medium">{formatCurrency(asset.purchasePrice)}</td>
                        <td className="px-6 py-2 text-center">{asset.usefulLife}</td>
                        <td className="px-6 py-2 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-medium text-warning-deadline">{formatCurrency(asset.accumulatedDepreciation)}</span>
                            <div className="w-20 bg-gray-200 dark:bg-black/30 rounded-full h-1 overflow-hidden">
                              <div 
                                className="bg-warning-deadline h-full rounded-full" 
                                style={{ width: `${depPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-right font-bold text-secondary">{formatCurrency(asset.netBookValue)}</td>
                        <td className="px-6 py-2 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            asset.status === 'ACTIVE' 
                              ? 'bg-success-positive/10 text-success-positive' 
                              : 'bg-error-container/20 text-error-deadline'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              asset.status === 'ACTIVE' ? 'bg-success-positive animate-pulse' : 'bg-error-deadline'
                            }`}></span>
                            {asset.status === 'ACTIVE' ? 'AKTIF' : 'DILEPAS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Drill-down Asset Details Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface backdrop-blur-md border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">domain</span>
                <div>
                  <h3 className="font-bold text-primary dark:text-secondary-container">
                    Spesifikasi & Depresiasi Aset
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest">
                    ID: {selectedAsset.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5">
              
              {/* Asset Header Info */}
              <div className="flex justify-between items-start bg-surface-muted/30 p-4 rounded-xl border border-border-subtle/30">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">{selectedAsset.name}</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Kategori: {selectedAsset.category}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedAsset.status === 'ACTIVE' 
                    ? 'bg-success-positive/10 text-success-positive border border-success-positive/20' 
                    : 'bg-error-container/20 text-error-deadline border border-error-deadline/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    selectedAsset.status === 'ACTIVE' ? 'bg-success-positive animate-pulse' : 'bg-error-deadline'
                  }`}></span>
                  {selectedAsset.status === 'ACTIVE' ? 'PSAK AKTIF' : 'DILEPAS (DISPOSED)'}
                </span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-surface-container-low/50 p-3 rounded-lg border border-border-subtle/30">
                  <span className="text-on-surface-variant">Tanggal Beli</span>
                  <p className="font-bold text-on-surface mt-0.5">{selectedAsset.purchaseDate}</p>
                </div>
                <div className="bg-surface-container-low/50 p-3 rounded-lg border border-border-subtle/30 font-tabular-nums">
                  <span className="text-on-surface-variant">Harga Perolehan</span>
                  <p className="font-bold text-on-surface mt-0.5">{formatCurrency(selectedAsset.purchasePrice)}</p>
                </div>
                <div className="bg-surface-container-low/50 p-3 rounded-lg border border-border-subtle/30">
                  <span className="text-on-surface-variant">Umur Ekonomis</span>
                  <p className="font-bold text-on-surface mt-0.5">{selectedAsset.usefulLife} Tahun</p>
                </div>
                <div className="bg-surface-container-low/50 p-3 rounded-lg border border-border-subtle/30 font-tabular-nums">
                  <span className="text-on-surface-variant">Nilai Buku Bersih</span>
                  <p className="font-bold text-secondary mt-0.5">{formatCurrency(selectedAsset.netBookValue)}</p>
                </div>
              </div>

              {/* Depreciation Progress Ring/Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-on-surface-variant">Tingkat Akumulasi Depresiasi</span>
                  <span className="font-tabular-nums text-warning-deadline">
                    {((selectedAsset.accumulatedDepreciation / selectedAsset.purchasePrice) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden border border-border-subtle/50 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-warning-deadline to-orange-400 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${(selectedAsset.accumulatedDepreciation / selectedAsset.purchasePrice) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Yearly Depreciation Schedule Projection */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-primary">Proyeksi Jadwal Penyusutan Tahunan</span>
                
                <div className="border border-border-subtle/40 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-surface-muted/30 px-3 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider grid grid-cols-10 border-b border-border-subtle/40">
                    <span className="col-span-2">Periode</span>
                    <span className="col-span-2 text-right">Nilai Buku Awal</span>
                    <span className="col-span-2 text-right">Penyusutan</span>
                    <span className="col-span-2 text-right">Akumulasi</span>
                    <span className="col-span-2 text-right">Nilai Akhir</span>
                  </div>

                  <div className="divide-y divide-border-subtle/25 bg-surface-container-lowest max-h-[170px] overflow-y-auto custom-scrollbar font-tabular-nums text-[11px]">
                    {depreciationSchedule.map((row, idx) => {
                      // Highlight the row representing where we currently are
                      const isCurrentYear = selectedAsset.accumulatedDepreciation >= row.accumDep - row.depExpense &&
                                            selectedAsset.accumulatedDepreciation < row.accumDep + 500; // Small tolerance

                      return (
                        <div 
                          key={idx} 
                          className={`px-3 py-1.5 grid grid-cols-10 items-center transition-colors ${
                            isCurrentYear ? 'bg-primary/5 text-primary font-bold border-l-4 border-l-primary' : 'text-on-surface-variant'
                          }`}
                        >
                          <span className="col-span-2">{row.yearLabel}</span>
                          <span className="col-span-2 text-right">{formatCurrency(row.begValue).replace('Rp ', '')}</span>
                          <span className="col-span-2 text-right text-warning-deadline">{formatCurrency(row.depExpense).replace('Rp ', '')}</span>
                          <span className="col-span-2 text-right">{formatCurrency(row.accumDep).replace('Rp ', '')}</span>
                          <span className="col-span-2 text-right font-semibold text-on-surface">{formatCurrency(row.endValue).replace('Rp ', '')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center border-t border-border-subtle/40 pt-4 mt-2">
              <div>
                {selectedAsset.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => handleDisposeClick(selectedAsset)}
                    className="px-3.5 py-2 text-xs font-bold border border-error-deadline/40 hover:bg-error-container/15 text-error-deadline rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Pelepasan / Write-Off Aset
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAsset(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tambah Aset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border-subtle/80 dark:border-white/10 max-w-md w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-scale-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">domain</span>
                Registrasi Aset Baru
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveAsset}>
              <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar text-xs">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-medium border border-error/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Nama Aset Tetap</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Laptop Macbook Pro 16"
                    required
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="h-10 px-3 bg-surface-container-low border border-border-subtle rounded-xl focus:border-secondary/40 outline-none text-xs text-on-surface transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Golongan / Kategori Aset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAssetCategory(cat.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                          assetCategory === cat.id
                            ? 'border-secondary bg-secondary/10 text-secondary dark:text-secondary-container font-bold shadow-sm'
                            : 'border-border-subtle hover:bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                        <span className="text-[11px] font-semibold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Tanggal Perolehan (Beli)</label>
                  <input 
                    type="date" 
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-10 px-3 bg-surface-container-low border border-border-subtle rounded-xl font-tabular-nums focus:border-secondary/40 outline-none text-xs text-on-surface transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Harga Perolehan (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      required
                      min={1000}
                      value={purchasePrice || ''}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="h-10 px-3 bg-surface-container-low border border-border-subtle rounded-xl font-tabular-nums focus:border-secondary/40 outline-none text-xs text-right text-on-surface transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Umur Ekonomis (Thn)</label>
                    <input 
                      type="number" 
                      placeholder="4"
                      required
                      min={1}
                      value={usefulLife || ''}
                      onChange={(e) => setUsefulLife(Number(e.target.value))}
                      className="h-10 px-3 bg-surface-container-low border border-border-subtle rounded-xl font-tabular-nums focus:border-secondary/40 outline-none text-xs text-center text-on-surface transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-2.5">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" className="bg-gradient-secondary-premium text-white">Daftarkan Aset</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}