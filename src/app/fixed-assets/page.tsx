'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { FixedAsset } from '@/data/types';

export default function FixedAssetsPage() {
  const { fixedAssets, addFixedAsset, runDepreciation } = useApp();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('Peralatan Kantor');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [usefulLife, setUsefulLife] = useState(4);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate stats dynamically
  const totalPurchasePrice = fixedAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
  const totalAccumulatedDepreciation = fixedAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
  const totalNetBookValue = fixedAssets.reduce((sum, a) => sum + a.netBookValue, 0);

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
  };

  const handleRunDepreciationClick = () => {
    runDepreciation();
    alert('Proses penyusutan bulanan selesai dijalankan dan dicatat ke jurnal.');
  };

  const categories = [
    { id: 'Peralatan Kantor', label: 'Peralatan', icon: 'desktop_windows' },
    { id: 'Kendaraan', label: 'Kendaraan', icon: 'directions_car' },
    { id: 'Bangunan', label: 'Bangunan', icon: 'apartment' },
    { id: 'Mesin & Alat', label: 'Mesin & Alat', icon: 'precision_manufacturing' }
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up">
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
          description="Kelola dan pantau penyusutan aset tetap perusahaan berdasarkan PSAK."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="play_arrow" 
                onClick={handleRunDepreciationClick}
                className="hover:bg-primary/5 transition-all"
              >
                Jalankan Penyusutan
              </Button>
              <Button 
                icon="add" 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-secondary-premium hover:shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                Tambah Aset Baru
              </Button>
            </div>
          }
        />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary flex flex-col justify-between min-h-[120px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-2">Total Nilai Perolehan</p>
              <p className="font-headline-md text-headline-md text-on-surface font-tabular-nums">
                {formatCurrency(totalPurchasePrice)}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-success-positive font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>Aktif terdaftar</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-warning-deadline flex flex-col justify-between min-h-[120px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning-deadline/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-2">Total Akumulasi Penyusutan</p>
              <p className="font-headline-md text-headline-md text-warning-deadline font-tabular-nums">
                {formatCurrency(totalAccumulatedDepreciation)}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[16px]">update</span>
              <span>Metode Garis Lurus (Straight Line)</span>
            </div>
          </div>

          <div className="bg-gradient-premium text-white border-none p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="absolute -right-4 -top-4 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div>
              <p className="font-label-md text-label-md text-white/80 mb-2">Total Nilai Buku Bersih (Net Book Value)</p>
              <p className="font-headline-md text-headline-md font-tabular-nums text-white">
                {formatCurrency(totalNetBookValue)}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <span className="font-label-md text-label-md text-white/90 flex items-center gap-1">
                Sesuai Neraca Keuangan
              </span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-card rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Daftar Aset</h3>
            <div className="flex gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  className="pl-9 pr-4 py-1.5 border border-border-subtle/70 rounded-lg font-body-sm text-body-sm bg-white/70 dark:bg-black/20 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-64 outline-none"
                  placeholder="Cari aset..."
                  type="text"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-border-subtle/50 font-label-md text-label-md text-on-surface-variant">
                  <th className="px-6 py-3 font-semibold tracking-wider text-[11px] uppercase">Nama Aset</th>
                  <th className="px-6 py-3 font-semibold tracking-wider text-[11px] uppercase">Kategori</th>
                  <th className="px-6 py-3 font-semibold tracking-wider text-[11px] uppercase">Tanggal Beli</th>
                  <th className="px-6 py-3 font-semibold tracking-wider text-[11px] uppercase text-right">Harga Perolehan (Rp)</th>
                  <th className="px-6 py-3 font-semibold tracking-wider text-[11px] uppercase text-center">Umur (Thn)</th>
                  <th className="px-6 py-3 font-semibold tracking-wider text-[11px] uppercase text-right">Akumulasi Susut &amp; %</th>
                  <th className="px-6 py-3 font-semibold tracking-wider text-[11px] uppercase text-right">Nilai Buku (Rp)</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface font-tabular-nums divide-y divide-border-subtle/30">
                {fixedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                      Tidak ada aset terdaftar.
                    </td>
                  </tr>
                ) : (
                  fixedAssets.map((asset, index) => {
                    const depPercent = asset.purchasePrice > 0 
                      ? Math.min((asset.accumulatedDepreciation / asset.purchasePrice) * 100, 100) 
                      : 0;

                    return (
                      <tr 
                        key={asset.id} 
                        className={`hover:bg-primary/5 dark:hover:bg-white/5 transition-colors h-[50px] ${index % 2 === 1 ? 'bg-surface-muted/10' : ''}`}
                      >
                        <td className="px-6 py-2">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${asset.status === 'ACTIVE' ? 'bg-success-positive' : 'bg-outline-variant'}`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${asset.status === 'ACTIVE' ? 'bg-success-positive' : 'bg-outline-variant'}`}></span>
                            </span>
                            <span className="font-medium">{asset.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-on-surface-variant">{asset.category}</td>
                        <td className="px-6 py-2 text-on-surface-variant">{asset.purchaseDate}</td>
                        <td className="px-6 py-2 text-right">{formatCurrency(asset.purchasePrice).replace('Rp ', '')}</td>
                        <td className="px-6 py-2 text-center">{asset.usefulLife}</td>
                        <td className="px-6 py-2 text-right">
                          <div className="flex flex-col items-end">
                            <span>{formatCurrency(asset.accumulatedDepreciation).replace('Rp ', '')}</span>
                            <div className="w-24 bg-gray-200 dark:bg-black/40 rounded-full h-1 mt-1 overflow-hidden">
                              <div 
                                className="bg-warning-deadline h-1 rounded-full transition-all duration-500" 
                                style={{ width: `${depPercent}%` }}
                                title={`${depPercent.toFixed(1)}% Terdepresiasi`}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-2 text-right font-semibold">{formatCurrency(asset.netBookValue).replace('Rp ', '')}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-surface-muted/20 border-t-2 border-border-subtle/50 font-tabular-nums font-semibold text-body-sm">
                <tr>
                  <td className="px-6 py-3 text-right" colSpan={3}>Total</td>
                  <td className="px-6 py-3 text-right">{formatCurrency(totalPurchasePrice).replace('Rp ', '')}</td>
                  <td></td>
                  <td className="px-6 py-3 text-right text-warning-deadline">{formatCurrency(totalAccumulatedDepreciation).replace('Rp ', '')}</td>
                  <td className="px-6 py-3 text-right text-secondary">{formatCurrency(totalNetBookValue).replace('Rp ', '')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan 1-{fixedAssets.length} dari {fixedAssets.length} aset
            </span>
            <div className="flex items-center gap-1.5">
              <button className="w-8 h-8 flex items-center justify-center border border-border-subtle/70 rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center border border-primary bg-primary text-on-primary rounded-lg font-tabular-nums text-body-sm font-medium">1</button>
              <button className="w-8 h-8 flex items-center justify-center border border-border-subtle/70 rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tambah Aset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">domain</span>
                Registrasi Aset Baru
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveAsset}>
              <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-medium border border-error/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Nama Aset Tetap</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Laptop Macbook Pro 16"
                    required
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">Golongan / Kategori Aset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAssetCategory(cat.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                          assetCategory === cat.id
                            ? 'border-secondary bg-secondary/10 text-secondary dark:text-secondary-container font-medium shadow-sm'
                            : 'border-border-subtle/70 hover:bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                        <span className="text-body-sm">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Perolehan (Beli)</label>
                  <input 
                    type="date" 
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Harga Perolehan (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      required
                      min={1000}
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all text-right"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Umur Ekonomis (Thn)</label>
                    <input 
                      type="number" 
                      placeholder="4"
                      required
                      min={1}
                      value={usefulLife}
                      onChange={(e) => setUsefulLife(Number(e.target.value))}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all text-center"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" className="bg-gradient-secondary-premium text-white hover:shadow-lg hover:shadow-secondary/20">Daftarkan Aset</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}