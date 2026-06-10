'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency, pphSummary, sptTimeline } from '@/data';

export default function TaxPage() {
  const { salesInvoices, purchaseInvoices, addCashTransaction, bankAccounts, company, showToast } = useApp();

  // General States
  const [tableTab, setTableTab] = useState<'KELUARAN' | 'MASUKAN'>('KELUARAN');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPpnPaid, setIsPpnPaid] = useState(false);

  // e-Faktur Sync Modal States
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  // Billing ID Modal States
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingCode, setBillingCode] = useState('');
  const [isGeneratingBilling, setIsGeneratingBilling] = useState(false);

  // Load persistent PPN payment status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPaid = localStorage.getItem('fincorp_ppn_paid_Des2026');
      if (storedPaid) {
        setIsPpnPaid(JSON.parse(storedPaid));
      }
    }
  }, []);

  // e-Faktur DJP Sync Simulator
  const handleSyncEFaktur = () => {
    setIsSyncModalOpen(true);
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncLog(['Membuka koneksi ke Gateway DJP e-Faktur...']);

    const steps = [
      { progress: 20, msg: 'Melakukan handshake SSL sertifikat elektronik...' },
      { progress: 45, msg: 'Memvalidasi Nomor Seri Faktur Pajak (NSFP) Jatah 2026...' },
      { progress: 70, msg: 'Mengunduh 4 faktur PPN Masukan baru dari portal e-Faktur...' },
      { progress: 90, msg: 'Mengunggah (upload) draft PPN Keluaran Pelanggan Lokal...' },
      { progress: 100, msg: 'Sinkronisasi Selesai! 10 Dokumen PPN diselaraskan.' }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setSyncProgress(step.progress);
        setSyncLog(prev => [...prev, step.msg]);
        if (step.progress === 100) {
          setIsSyncing(false);
        }
      }, (idx + 1) * 600);
    });
  };

  // Generate 15-digit Kode Billing
  const handleGenerateBilling = () => {
    setIsGeneratingBilling(true);
    setTimeout(() => {
      const randomCode = '82026' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      setBillingCode(randomCode);
      setIsGeneratingBilling(false);
    }, 800);
  };

  // Dynamic calculations
  const ppnOutInvoices = useMemo(() => salesInvoices.filter(inv => inv.ppnAmount > 0), [salesInvoices]);
  const ppnOutDpp = useMemo(() => ppnOutInvoices.reduce((sum, inv) => sum + inv.dpp, 0), [ppnOutInvoices]);
  const ppnOut = useMemo(() => ppnOutInvoices.reduce((sum, inv) => sum + inv.ppnAmount, 0), [ppnOutInvoices]);
  const ppnOutCount = ppnOutInvoices.length;

  const ppnInInvoices = useMemo(() => purchaseInvoices.filter(inv => inv.ppnAmount > 0), [purchaseInvoices]);
  const ppnInDpp = useMemo(() => ppnInInvoices.reduce((sum, inv) => sum + inv.dpp, 0), [ppnInInvoices]);
  const ppnIn = useMemo(() => ppnInInvoices.reduce((sum, inv) => sum + inv.ppnAmount, 0), [ppnInInvoices]);
  const ppnInCount = ppnInInvoices.length;

  // Payable PPN PPN = PPN Keluaran - PPN Masukan (Nihil/0 if paid)
  const ppnPayable = useMemo(() => {
    if (isPpnPaid) return 0;
    return Math.max(0, ppnOut - ppnIn);
  }, [ppnOut, ppnIn, isPpnPaid]);

  // Settle VAT Liability
  const handlePayPpn = () => {
    if (!billingCode) return;

    const bcaAccount = bankAccounts.find(b => b.name.includes('BCA')) || bankAccounts[0];
    if (!bcaAccount) {
      showToast('Rekening Kas & Bank tidak tersedia untuk pembayaran.', 'error');
      return;
    }

    const rawPayable = Math.max(0, ppnOut - ppnIn);

    if (bcaAccount.balance < rawPayable) {
      showToast('Saldo Bank BCA tidak mencukupi untuk membayar PPN Kurang Bayar.', 'error');
      return;
    }

    // Record bank Cash Out
    addCashTransaction({
      accountId: bcaAccount.id,
      description: `Penyetoran PPN Kurang Bayar Masa Des 2026 via Billing ID: ${billingCode}`,
      category: 'Biaya Operasional',
      amount: rawPayable,
      type: 'OUT',
    });

    // Settle in state
    setIsPpnPaid(true);
    localStorage.setItem('fincorp_ppn_paid_Des2026', 'true');
    setIsBillingModalOpen(false);
    showToast(`Pembayaran PPN sebesar Rp ${rawPayable.toLocaleString('id-ID')} berhasil disetorkan ke Kas Negara. Status SPT Masa PPN berubah menjadi NIHIL.`, 'success');
  };

  // Relative progress bars percentages
  const maxPpn = Math.max(ppnOut, ppnIn, 1);
  const ppnOutPct = (ppnOut / maxPpn) * 100;
  const ppnInPct = (ppnIn / maxPpn) * 100;

  // Filtered invoices for active table tab
  const filteredTableData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (tableTab === 'KELUARAN') {
      return ppnOutInvoices.filter(inv => {
        return inv.invoiceNumber.toLowerCase().includes(query) ||
               (inv.taxInvoiceNumber && inv.taxInvoiceNumber.includes(query)) ||
               inv.customerName.toLowerCase().includes(query);
      });
    } else {
      return ppnInInvoices.filter(inv => {
        return inv.invoiceNumber.toLowerCase().includes(query) ||
               inv.vendorName.toLowerCase().includes(query);
      });
    }
  }, [tableTab, ppnOutInvoices, ppnInInvoices, searchQuery]);

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ['Tipe PPN', 'No. Faktur Pajak', 'No. Invoice', 'Tanggal', 'Lawan Transaksi', 'DPP', 'PPN'];
    const rows: string[][] = [];

    ppnOutInvoices.forEach(inv => {
      rows.push([
        'PPN KELUARAN (OUT)',
        inv.taxInvoiceNumber || 'BELUM SYNC',
        inv.invoiceNumber,
        inv.date,
        inv.customerName,
        inv.dpp.toString(),
        inv.ppnAmount.toString()
      ]);
    });

    ppnInInvoices.forEach(inv => {
      rows.push([
        'PPN MASUKAN (IN)',
        'FAKTUR-IN',
        inv.invoiceNumber,
        inv.date,
        inv.vendorName,
        inv.dpp.toString(),
        inv.ppnAmount.toString()
      ]);
    });

    const filename = `Rekapitulasi_PPN_${new Date().toISOString().split('T')[0]}.csv`;
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Page Header */}
        <PageHeader
          title="Modul Pajak (Tax)"
          description="Laporan kepatuhan PPN Masukan, Keluaran, dan monitoring kepatuhan e-Faktur & SPT Masa Indonesia."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="sync"
                onClick={handleSyncEFaktur}
              >
                Sync e-Faktur
              </Button>
              <Button 
                icon="file_download"
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
            </div>
          }
        />

        {/* PPN Summary Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* PPN Keluaran */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 border-t-4 border-t-secondary min-h-[140px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary">upload</span>
                <span className="font-label-md text-label-md">PPN KELUARAN (OUT)</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface-container-high/60 text-primary">
                {ppnOutCount} FAKTUR
              </span>
            </div>
            <div className="relative z-10">
              <div className="font-tabular-nums text-2xl font-bold text-on-surface">{formatCurrency(ppnOut)}</div>
              <div className="font-body-sm text-[11.5px] text-on-surface-variant mt-1">DPP: {formatCurrency(ppnOutDpp)}</div>
            </div>
          </div>

          {/* PPN Masukan */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 border-t-4 border-t-success-positive min-h-[140px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success-positive/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-success-positive">download</span>
                <span className="font-label-md text-label-md">PPN MASUKAN (IN)</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface-container-high/60 text-primary">
                {ppnInCount} FAKTUR
              </span>
            </div>
            <div className="relative z-10">
              <div className="font-tabular-nums text-2xl font-bold text-on-surface">{formatCurrency(ppnIn)}</div>
              <div className="font-body-sm text-[11.5px] text-on-surface-variant mt-1">DPP: {formatCurrency(ppnInDpp)}</div>
            </div>
          </div>

          {/* Diagram Perbandingan PPN (Out vs In) */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 border-t-4 border-t-secondary-container min-h-[140px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: '16px' }}>bar_chart</span>
                KOMPARASI PPN
              </span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Proporsi</span>
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {/* PPN Out Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-tabular-nums text-on-surface-variant">
                  <span>Keluaran (Out)</span>
                  <span className="font-bold">{formatCurrency(ppnOut).replace('Rp ', '')}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-black/30 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-secondary-container to-secondary h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(67,93,149,0.3)]" 
                    style={{ width: `${ppnOutPct}%` }}
                  ></div>
                </div>
              </div>
              {/* PPN In Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-tabular-nums text-on-surface-variant">
                  <span>Masukan (In)</span>
                  <span className="font-bold">{formatCurrency(ppnIn).replace('Rp ', '')}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-black/30 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-success-positive/40 to-success-positive h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(26,93,26,0.3)]" 
                    style={{ width: `${ppnInPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Kurang Bayar */}
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 border-t-4 border-t-danger-liability bg-gradient-to-br from-white/80 via-white/80 to-danger-liability/[0.02] dark:from-primary-container/20 dark:to-danger-liability/[0.02] min-h-[140px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-danger-liability/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2 text-danger-liability">
                <span className="material-symbols-outlined">warning</span>
                <span className="font-label-md text-label-md">KURANG BAYAR PPN</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${ppnPayable > 0 ? 'bg-error-container text-on-error-container' : 'bg-success-positive/10 text-success-positive'} border border-border-subtle/50`}>
                {ppnPayable > 0 ? 'BELUM BAYAR' : 'NIHIL / LUNAS'}
              </span>
            </div>
            <div className="relative z-10">
              <div className="font-tabular-nums text-2xl font-bold text-danger-liability">{formatCurrency(ppnPayable)}</div>
              <div className="flex items-center justify-between mt-2">
                <div className="font-body-sm text-[11.5px] text-on-surface-variant">Batas Setor: 31 Des 2026</div>
                {ppnPayable > 0 && (
                  <button 
                    onClick={() => setIsBillingModalOpen(true)}
                    className="text-secondary font-label-md text-[11.5px] hover:underline font-bold transition-all duration-200 cursor-pointer"
                  >
                    Buat ID Billing
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Data Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area: Daftar Faktur Pajak */}
          <div className="lg:col-span-2 glass-card rounded-2xl flex flex-col overflow-hidden">
            
            {/* Table Header and Search */}
            <div className="p-4 border-b border-border-subtle/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-muted/30">
              <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold tracking-wider uppercase">
                Rekapitulasi Faktur Pajak
              </h3>
              <div className="relative w-full sm:w-60">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]">search</span>
                <input
                  className="w-full pl-9 pr-4 py-1.5 border border-border-subtle focus:border-secondary/40 focus:ring-1 focus:ring-secondary/20 rounded-xl font-body-sm text-xs bg-surface-container-low text-on-surface outline-none"
                  placeholder="Cari faktur atau lawan..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Table Toggle Tabs */}
            <div className="px-4 py-2 border-b border-border-subtle/30 flex gap-2 bg-surface-muted/10">
              <button
                onClick={() => setTableTab('KELUARAN')}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  tableTab === 'KELUARAN'
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                PPN Keluaran (Penjualan)
              </button>
              <button
                onClick={() => setTableTab('MASUKAN')}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  tableTab === 'MASUKAN'
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                PPN Masukan (Pembelian)
              </button>
            </div>

            {/* Table content */}
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-border-subtle/50 font-label-md text-[10px] text-on-surface-variant uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-semibold">No. Faktur Pajak</th>
                    <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                    <th className="py-2.5 px-4 font-semibold">Lawan Transaksi</th>
                    <th className="py-2.5 px-4 text-right font-semibold">DPP</th>
                    <th className="py-2.5 px-4 text-right font-semibold">PPN</th>
                    <th className="py-2.5 px-4 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface font-tabular-nums divide-y divide-border-subtle/30">
                  {filteredTableData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant italic">
                        Tidak ada faktur pajak yang terdaftar atau cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredTableData.map((inv, index) => (
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-surface-container-low/70 transition-colors h-10 ${
                          index % 2 === 1 ? 'bg-surface-muted/10' : ''
                        }`}
                      >
                        <td className="py-1.5 px-4 font-bold text-secondary text-[11px]">
                          {tableTab === 'KELUARAN' 
                            ? (((inv as any).taxInvoiceNumber) || 'NSFP-WAITING') 
                            : `FP-MASUKAN-${inv.invoiceNumber.split('-').pop()}`
                          }
                        </td>
                        <td className="py-1.5 px-4 text-on-surface-variant">{inv.date}</td>
                        <td className="py-1.5 px-4 truncate max-w-[170px] font-medium">
                          {tableTab === 'KELUARAN' ? (inv as any).customerName : (inv as any).vendorName}
                        </td>
                        <td className="py-1.5 px-4 text-right font-medium">{formatCurrency(inv.dpp)}</td>
                        <td className="py-1.5 px-4 text-right font-bold text-primary">{formatCurrency(inv.ppnAmount)}</td>
                        <td className="py-1.5 px-4 text-center">
                          <StatusBadge status={inv.status === 'PAID' ? 'POSTED' : 'PENDING'} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-border-subtle/50 bg-surface-muted/30 text-center font-semibold text-[11px] text-on-surface-variant">
              Menampilkan {filteredTableData.length} Faktur PPN {tableTab}
            </div>

          </div>

          {/* Side Panel: Status SPT & PPh */}
          <div className="flex flex-col gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            
            {/* Status SPT Masa PPN */}
            <div className="glass-card p-5 rounded-2xl">
              <h3 className="font-headline-sm text-headline-sm font-bold text-primary dark:text-secondary-container mb-4">Status SPT Masa PPN</h3>
              <div className="relative pl-1">
                {/* Glowing Dashed Vertical Line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-[2px] border-l-2 border-dashed border-secondary/40 dark:border-secondary-container/40"></div>
                {sptTimeline.map((step, idx) => {
                  const isCompleted = step.status === 'completed' || (step.id === 'spt-3' && isPpnPaid);
                  const isCurrent = step.status === 'current' && !isPpnPaid;
                  
                  return (
                    <div key={step.id} className="flex gap-4 mb-5 relative z-10 group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 relative ${
                        isCompleted
                          ? 'border-2 border-success-positive/50 bg-success-positive/10 text-success-positive shadow-[0_0_8px_rgba(26,93,26,0.15)]'
                          : isCurrent
                          ? 'border-4 border-secondary/40 bg-white dark:bg-primary-container text-secondary font-bold shadow-[0_0_12px_rgba(67,93,149,0.3)]'
                          : 'border-2 border-border-subtle/70 bg-surface-container-lowest text-outline'
                      }`}>
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                        ) : (
                          <span className="text-[11px] font-bold text-on-surface-variant/75">{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                          {step.label}
                          {isCurrent && (
                            <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                          )}
                        </div>
                        {isCompleted ? (
                          <div className="font-body-sm text-[11px] text-success-positive font-semibold mt-0.5">Selesai</div>
                        ) : step.dueDate ? (
                          <div className="font-body-sm text-[11px] text-danger-liability font-semibold mt-0.5">Batas: {step.dueDate}</div>
                        ) : (
                          <div className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Menunggu Penyelesaian</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ringkasan PPh */}
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary">PPh Pot/Put</h3>
                <span className="text-secondary font-label-md text-[10.5px] font-bold uppercase tracking-wider">e-Bupot Unifikasi</span>
              </div>
              <div className="space-y-3 font-tabular-nums text-xs">
                {pphSummary.map((pph, index) => (
                  <div key={index} className={`flex justify-between items-end ${index < pphSummary.length - 1 ? 'border-b border-border-subtle/20 pb-2.5' : 'pb-1'}`}>
                    <div>
                      <div className="font-label-md text-label-md text-on-surface font-bold">{pph.type}</div>
                      <div className="font-body-sm text-[11px] text-on-surface-variant/80 mt-0.5">{pph.description}</div>
                    </div>
                    <div className="font-semibold text-on-surface text-right font-tabular-nums">
                      {formatCurrency(pph.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* DJP e-Faktur Sync Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border-subtle/80 rounded-2xl w-full max-w-md shadow-2xl p-6 relative flex flex-col gap-4 animate-scale-up">
            
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">sync</span>
                <h3 className="font-bold text-primary">DJP e-Faktur Web API Sync</h3>
              </div>
              {!isSyncing && (
                <button
                  onClick={() => setIsSyncModalOpen(false)}
                  className="text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Sync progress bar */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-on-surface-variant">Progres Sinkronisasi</span>
                  <span className="font-tabular-nums text-primary">{syncProgress}%</span>
                </div>
                <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden border border-border-subtle/50 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-secondary-container to-secondary h-full rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Sync logs */}
              <div className="bg-surface-container-lowest border border-border-subtle/60 rounded-xl p-3.5 h-[180px] overflow-y-auto custom-scrollbar font-mono text-[10.5px] text-on-surface-variant space-y-1.5 leading-relaxed">
                {syncLog.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-primary font-bold">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-border-subtle/40 pt-3.5">
              <Button
                variant={isSyncing ? 'outline' : 'primary'}
                disabled={isSyncing}
                onClick={() => setIsSyncModalOpen(false)}
                className="text-xs font-bold"
              >
                {isSyncing ? 'Sinkronisasi...' : 'Tutup & Simpan'}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* SSP Billing ID Generator Modal */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border-subtle/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col gap-4 animate-scale-up text-xs">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">gavel</span>
                <div>
                  <h3 className="font-bold text-primary">Surat Setoran Pajak (SSP) PPN</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">
                    Modul Billing & Penyetoran Negara
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* SSP Mock Sheet Form */}
            <div className="border border-border-subtle/70 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-surface-muted/40 p-3 font-bold text-on-surface border-b border-border-subtle/45 text-center uppercase tracking-wider">
                Formulir Setoran SSP
              </div>
              
              <div className="p-4 space-y-3.5 bg-surface-container-lowest divide-y divide-border-subtle/25">
                
                {/* Wajib Pajak Detail */}
                <div className="grid grid-cols-2 gap-4 pb-3">
                  <div>
                    <span className="text-on-surface-variant text-[10px] uppercase font-bold">NPWP Badan</span>
                    <p className="font-bold font-tabular-nums text-on-surface mt-0.5">{company.npwp}</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[10px] uppercase font-bold">Nama Wajib Pajak</span>
                    <p className="font-bold text-on-surface mt-0.5">{company.name}</p>
                  </div>
                </div>

                {/* Tax codes */}
                <div className="grid grid-cols-3 gap-4 pt-3.5 pb-3">
                  <div>
                    <span className="text-on-surface-variant text-[10px] uppercase font-bold">KAP (Kode Pajak)</span>
                    <p className="font-bold text-on-surface mt-0.5">411211</p>
                    <span className="text-[9.5px] text-on-surface-variant opacity-75">PPN Dalam Negeri</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[10px] uppercase font-bold">KJS (Jenis Setoran)</span>
                    <p className="font-bold text-on-surface mt-0.5">100</p>
                    <span className="text-[9.5px] text-on-surface-variant opacity-75">Masa PPN</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-[10px] uppercase font-bold">Masa Pajak</span>
                    <p className="font-bold text-on-surface mt-0.5">Desember 2026</p>
                  </div>
                </div>

                {/* Payment Amount */}
                <div className="pt-3.5 pb-3 grid grid-cols-2 gap-4 items-center">
                  <div>
                    <span className="text-on-surface-variant text-[10px] uppercase font-bold">Jumlah Pajak Disetor</span>
                    <p className="font-bold text-danger-liability text-sm font-tabular-nums mt-0.5">
                      {formatCurrency(Math.max(0, ppnOut - ppnIn))}
                    </p>
                  </div>
                  <div className="text-right">
                    {/* Billing ID display */}
                    {billingCode ? (
                      <div>
                        <span className="text-on-surface-variant text-[10px] uppercase font-bold">ID Billing Pajak</span>
                        <p className="font-bold text-success-positive text-[13.5px] font-tabular-nums mt-0.5 tracking-wider">
                          {billingCode}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateBilling}
                        disabled={isGeneratingBilling}
                        className="px-3.5 py-2 text-xs font-bold bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-sm border border-secondary/25 transition-all cursor-pointer"
                      >
                        {isGeneratingBilling ? 'Generating...' : 'Generate Kode Billing'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Settle message */}
            {billingCode && (
              <div className="bg-success-positive/5 border-l-4 border-success-positive p-3 rounded-xl text-[11.5px] text-on-surface leading-relaxed">
                Kode Billing <span className="font-bold">{billingCode}</span> berhasil diterbitkan oleh portal MPN G-3 DJP. Anda dapat menyetorkan pembayaran PPN Kurang Bayar ini secara langsung menggunakan saldo Rekening BCA Utama FinCorp.
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-between items-center border-t border-border-subtle/40 pt-4 mt-2">
              <span className="text-[10px] text-on-surface-variant font-medium">SSP Kode MAP: 411211 KJS: 100</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                >
                  Batal
                </Button>
                {billingCode && (
                  <Button
                    onClick={handlePayPpn}
                    className="bg-gradient-secondary-premium font-bold text-white shadow-md"
                  >
                    Bayar & Setor PPN
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}