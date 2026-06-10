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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Aset Tetap"
          description="Kelola dan pantau penyusutan aset tetap perusahaan berdasarkan PSAK."
          actions={
            <>
              <Button variant="outline" icon="play_arrow" onClick={handleRunDepreciationClick}>Jalankan Penyusutan</Button>
              <Button icon="add" onClick={() => setIsModalOpen(true)}>Tambah Aset Baru</Button>
            </>
          }
        />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
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
          <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between">
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
          <div className="bg-primary-container text-on-primary-container border border-primary-container rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <p className="font-label-md text-label-md opacity-80 mb-2">Total Nilai Buku Bersih (Net Book Value)</p>
              <p className="font-headline-md text-headline-md font-tabular-nums text-on-primary">
                {formatCurrency(totalNetBookValue)}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <span className="font-label-md text-label-md text-inverse-primary flex items-center gap-1">
                Sesuai Neraca Keuangan
              </span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Daftar Aset</h3>
            <div className="flex gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  className="pl-9 pr-4 py-1.5 border border-outline-variant rounded font-body-sm text-body-sm bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 outline-none"
                  placeholder="Cari aset..."
                  type="text"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-border-subtle font-label-md text-label-md text-on-surface-variant">
                  <th className="px-6 py-3 font-medium">Nama Aset</th>
                  <th className="px-6 py-3 font-medium">Kategori</th>
                  <th className="px-6 py-3 font-medium">Tanggal Beli</th>
                  <th className="px-6 py-3 font-medium text-right">Harga Perolehan (Rp)</th>
                  <th className="px-6 py-3 font-medium text-center">Umur (Thn)</th>
                  <th className="px-6 py-3 font-medium text-right">Akumulasi Susut (Rp)</th>
                  <th className="px-6 py-3 font-medium text-right">Nilai Buku (Rp)</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface font-tabular-nums divide-y divide-border-subtle">
                {fixedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                      Tidak ada aset terdaftar.
                    </td>
                  </tr>
                ) : (
                  fixedAssets.map((asset, index) => (
                    <tr key={asset.id} className={`hover:bg-surface-container-low transition-colors ${index % 2 === 1 ? 'bg-surface-muted/30' : ''}`}>
                      <td className="px-6 py-3 h-[40px] flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${asset.status === 'ACTIVE' ? 'bg-success-positive' : 'bg-outline-variant'}`}></div>
                        {asset.name}
                      </td>
                      <td className="px-6 py-3">{asset.category}</td>
                      <td className="px-6 py-3 text-on-surface-variant">{asset.purchaseDate}</td>
                      <td className="px-6 py-3 text-right">{formatCurrency(asset.purchasePrice).replace('Rp ', '')}</td>
                      <td className="px-6 py-3 text-center">{asset.usefulLife}</td>
                      <td className="px-6 py-3 text-right text-warning-deadline">{formatCurrency(asset.accumulatedDepreciation).replace('Rp ', '')}</td>
                      <td className="px-6 py-3 text-right font-semibold">{formatCurrency(asset.netBookValue).replace('Rp ', '')}</td>
                    </tr>
                  )))
                }
              </tbody>
              <tfoot className="bg-surface border-t-2 border-border-subtle font-tabular-nums font-semibold text-body-sm">
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
          <div className="px-6 py-3 border-t border-border-subtle flex justify-between items-center bg-surface-muted">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan 1-{fixedAssets.length} dari {fixedAssets.length} aset
            </span>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center border border-primary bg-primary text-on-primary rounded font-tabular-nums text-body-sm">1</button>
              <button className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded text-on-surface-variant hover:bg-surface-variant" disabled>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tambah Aset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-border-subtle shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Registrasi Aset Baru</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveAsset}>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded bg-error-container text-on-error-container text-body-sm font-medium border border-error/20 flex items-center gap-2">
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
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Golongan / Kategori Aset</label>
                  <select 
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  >
                    <option value="Peralatan Kantor">Peralatan Kantor (Komputer, Printer, dll)</option>
                    <option value="Kendaraan">Kendaraan Operasional</option>
                    <option value="Bangunan">Gedung / Bangunan</option>
                    <option value="Mesin & Alat">Mesin Pabrik / Alat Berat</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Perolehan (Beli)</label>
                  <input 
                    type="date" 
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
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
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Umur Ekonomis (Tahun)</label>
                    <input 
                      type="number" 
                      placeholder="4"
                      required
                      min={1}
                      value={usefulLife}
                      onChange={(e) => setUsefulLife(Number(e.target.value))}
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle bg-surface-muted flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit">Daftarkan Aset</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}