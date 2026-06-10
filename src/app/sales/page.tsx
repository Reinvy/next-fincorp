'use client';

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { SalesInvoice } from '@/data/types';
import Link from 'next/link';

// Date parser helper
const parseInvoiceDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return new Date();
};

export default function SalesPage() {
  const { salesInvoices, paySalesInvoice, showToast } = useApp();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  
  // Drill-down Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);

  // Dynamic calculations for Bento Grid KPIs
  const stats = useMemo(() => {
    let totalSales = 0;
    let outstandingReceivables = 0;
    let cashReceipts = 0;
    let totalPpn = 0;

    salesInvoices.forEach(inv => {
      totalSales += inv.grandTotal;
      totalPpn += inv.ppnAmount;
      if (inv.status === 'PAID') {
        cashReceipts += inv.grandTotal;
      } else {
        outstandingReceivables += inv.grandTotal;
      }
    });

    return {
      totalSales,
      outstandingReceivables,
      cashReceipts,
      totalPpn
    };
  }, [salesInvoices]);

  // Receivables Aging Calculations (for UNPAID invoices)
  const aging = useMemo(() => {
    const today = new Date();
    let current = 0;     // 0-30 days
    let warning = 0;     // 31-60 days
    let critical = 0;    // 60+ days

    salesInvoices.forEach(inv => {
      if (inv.status !== 'PAID') {
        const invDate = parseInvoiceDate(inv.date);
        const diffTime = Math.abs(today.getTime() - invDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          current += inv.grandTotal;
        } else if (diffDays <= 60) {
          warning += inv.grandTotal;
        } else {
          critical += inv.grandTotal;
        }
      }
    });

    const totalUnpaid = current + warning + critical || 1;
    return {
      current,
      warning,
      critical,
      currentPct: (current / totalUnpaid) * 100,
      warningPct: (warning / totalUnpaid) * 100,
      criticalPct: (critical / totalUnpaid) * 100
    };
  }, [salesInvoices]);

  // Settle invoice payment trigger
  const handleRecordPayment = (invoice: SalesInvoice) => {
    if (confirm(`Apakah Anda yakin ingin mencatat pelunasan Faktur ${invoice.invoiceNumber}? Saldo Bank BCA Utama akan bertambah sebesar Rp ${invoice.grandTotal.toLocaleString('id-ID')}.`)) {
      paySalesInvoice(invoice.id);
      setSelectedInvoice(null);
      showToast(`Faktur ${invoice.invoiceNumber} berhasil dilunasi.`, 'success');
    }
  };

  // Filtered sales invoices for display in the table
  const filteredInvoices = useMemo(() => {
    return salesInvoices.filter(inv => {
      const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (inv.taxInvoiceNumber && inv.taxInvoiceNumber.includes(searchQuery));
      
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [salesInvoices, searchQuery, statusFilter]);

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ['No. Faktur', 'Tanggal', 'Pelanggan', 'Subtotal', 'Diskon', 'DPP', 'PPN', 'Grand Total', 'Status', 'No. Faktur Pajak'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.date,
      inv.customerName,
      inv.subtotal.toString(),
      inv.discountTotal.toString(),
      inv.dpp.toString(),
      inv.ppnAmount.toString(),
      inv.grandTotal.toString(),
      inv.status,
      inv.taxInvoiceNumber || '-'
    ]);

    const filename = `Laporan_Faktur_Penjualan_${new Date().toISOString().split('T')[0]}.csv`;
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
          title="Penjualan (Sales)"
          description="Ringkasan faktur, monitoring piutang berjalan, dan pencatatan pembayaran dari pelanggan."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="download"
                onClick={handleExportCSV}
              >
                Ekspor CSV
              </Button>
              <Link href="/sales/invoice">
                <Button icon="add">Buat Faktur Baru</Button>
              </Link>
            </div>
          }
        />

        {/* Bento Grid KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Total Omset */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-primary relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-primary/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">bar_chart</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Nilai Penjualan</p>
            <p className="text-xl font-bold tracking-tight text-on-surface font-tabular-nums">
              {formatCurrency(stats.totalSales)}
            </p>
            <span className="text-[10px] text-on-surface-variant/65 block mt-1 font-medium">Berdasarkan total faktur terbit</span>
          </div>

          {/* Card 2: Piutang Berjalan */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-warning-deadline relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-warning-deadline/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">pending_actions</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Piutang Berjalan (Outstanding)</p>
            <p className="text-xl font-bold tracking-tight text-warning-deadline font-tabular-nums">
              {formatCurrency(stats.outstandingReceivables)}
            </p>
            <span className="text-[10px] text-warning-deadline flex items-center gap-1 mt-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-deadline animate-pulse"></span>
              Menunggu pembayaran customer
            </span>
          </div>

          {/* Card 3: Total Kas Masuk */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-success-positive relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-success-positive/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">payments</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Kas Diterima</p>
            <p className="text-xl font-bold tracking-tight text-success-positive font-tabular-nums">
              {formatCurrency(stats.cashReceipts)}
            </p>
            <span className="text-[10px] text-success-positive font-medium block mt-1">Faktur berhasil dilunasi</span>
          </div>

          {/* Card 4: PPN Keluaran Terutang */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-secondary relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-secondary/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">gavel</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">PPN Keluaran Terutang</p>
            <p className="text-xl font-bold tracking-tight text-secondary font-tabular-nums">
              {formatCurrency(stats.totalPpn)}
            </p>
            <span className="text-[10px] text-secondary font-medium block mt-1">Sertifikat e-Faktur terbit</span>
          </div>

        </div>

        {/* Double Panel: Invoices Table vs Receivables Aging */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Invoices List */}
          <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col hover:border-secondary-container/20 transition-colors duration-300">
            
            {/* Table Header Controls */}
            <div className="px-6 py-4 border-b border-border-subtle/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-muted/20">
              <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold tracking-wider uppercase">
                Daftar Faktur Penjualan
              </h3>
              <div className="relative w-full sm:w-60">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]">search</span>
                <input
                  className="w-full pl-9 pr-4 py-1.5 border border-border-subtle focus:border-secondary/40 focus:ring-1 focus:ring-secondary/20 rounded-xl font-body-sm text-xs bg-surface-container-low text-on-surface outline-none"
                  placeholder="Cari faktur atau customer..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Toggle Status Tabs */}
            <div className="px-6 py-2 bg-surface-muted/10 border-b border-border-subtle/30 flex gap-1.5">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  statusFilter === 'ALL'
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                Semua Faktur
              </button>
              <button
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  statusFilter === 'UNPAID'
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                Belum Lunas (Unpaid)
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  statusFilter === 'PAID'
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                Lunas (Paid)
              </button>
            </div>

            {/* Table content */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-muted/30 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">No. Faktur</th>
                    <th className="py-3 px-4 font-semibold">Tanggal</th>
                    <th className="py-3 px-4 font-semibold">Pelanggan</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Tagihan</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-center">Faktur Pajak PPN</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle/30 font-tabular-nums">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-on-surface-variant italic">
                        Tidak ada faktur penjualan yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedInvoice(inv)}
                        className="hover:bg-surface-container-low/60 transition-colors h-11 cursor-pointer group"
                      >
                        <td className="py-2 px-4 text-primary font-bold group-hover:text-secondary transition-colors">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2 px-4 text-on-surface-variant">{inv.date}</td>
                        <td className="py-2 px-4 font-semibold text-on-surface">{inv.customerName}</td>
                        <td className="py-2 px-4 text-right font-bold text-on-surface">{formatCurrency(inv.grandTotal)}</td>
                        <td className="py-2 px-4 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-2 px-4 text-center">
                          {inv.hasTaxInvoice ? (
                            <span className="inline-flex items-center gap-1 bg-success-positive/10 border border-success-positive/20 px-2 py-0.5 rounded text-[10px] text-success-positive font-bold">
                              {inv.taxInvoiceNumber}
                            </span>
                          ) : (
                            <span className="text-outline text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-border-subtle/50 bg-surface-muted/30 text-center font-bold text-[11px] text-on-surface-variant">
              Menampilkan {filteredInvoices.length} Faktur Penjualan
            </div>

          </div>

          {/* Column 3: Receivables Aging */}
          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:border-secondary-container/30 transition-colors duration-300">
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-border-subtle/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">pending_actions</span>
                  <h3 className="font-bold text-primary dark:text-secondary-container">Analisis Umur Piutang</h3>
                </div>
                <span className="text-[10.5px] font-bold text-on-surface-variant bg-surface-container/60 px-2 py-0.5 rounded uppercase tracking-wider">Des 2026</span>
              </div>
              
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Rincian sebaran umur piutang dagang (faktur belum lunas) berdasarkan jumlah hari terhitung sejak tanggal faktur terbit.
              </p>

              {/* Progress items */}
              <div className="space-y-6">
                
                {/* 0-30 Days */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-on-surface">Lancar (0 - 30 Hari)</span>
                    <span className="font-bold text-tabular-nums">{formatCurrency(aging.current)}</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full border border-border-subtle/45 overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      style={{ width: `${aging.currentPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* 31-60 Days */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-on-surface">Peringatan (31 - 60 Hari)</span>
                    <span className="font-bold text-tabular-nums">{formatCurrency(aging.warning)}</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full border border-border-subtle/45 overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                      style={{ width: `${aging.warningPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* 60+ Days */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-on-surface">Kritis (&gt; 60 Hari)</span>
                    <span className="font-bold text-tabular-nums">{formatCurrency(aging.critical)}</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full border border-border-subtle/45 overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400"
                      style={{ width: `${aging.criticalPct}%` }}
                    ></div>
                  </div>
                </div>

              </div>
            </div>

            {/* Total Summary */}
            <div className="pt-4 border-t border-border-subtle/40 mt-6 bg-surface-muted/20 p-3 rounded-xl border border-border-subtle/30 text-xs font-semibold text-on-surface-variant flex justify-between items-center font-tabular-nums">
              <span>Total Piutang (Des 2026)</span>
              <span className="text-warning-deadline font-bold text-sm">
                {formatCurrency(aging.current + aging.warning + aging.critical)}
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* Drill-down Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface backdrop-blur-md border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-scale-up text-xs">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">receipt_long</span>
                <div>
                  <h3 className="font-bold text-primary dark:text-secondary-container">
                    Rincian Faktur Penjualan
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest font-tabular-nums">
                    No. Faktur: {selectedInvoice.invoiceNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              
              {/* Status & Date */}
              <div className="grid grid-cols-2 gap-4 bg-surface-muted/40 p-4 rounded-xl border border-border-subtle/30">
                <div>
                  <span className="text-on-surface-variant text-[10px] uppercase font-bold">Tanggal Faktur / Jatuh Tempo</span>
                  <p className="font-bold font-tabular-nums mt-0.5">
                    {selectedInvoice.date} &bull; <span className="text-danger-liability">{selectedInvoice.dueDate}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-on-surface-variant text-[10px] uppercase font-bold">Status Pembayaran</span>
                  <div className="mt-1 flex justify-end">
                    <StatusBadge status={selectedInvoice.status} />
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-1 bg-surface-container-low/50 p-3.5 rounded-xl border border-border-subtle/30">
                <span className="text-on-surface-variant text-[10px] uppercase font-bold">Pelanggan Penerima</span>
                <p className="font-bold text-on-surface mt-0.5">{selectedInvoice.customerName}</p>
                <p className="text-on-surface-variant font-tabular-nums mt-0.5">NPWP: {selectedInvoice.customerNpwp || '-'}</p>
              </div>

              {/* Invoice Items table */}
              <div className="space-y-2">
                <span className="font-bold text-primary">Daftar Barang / Jasa Penjualan</span>
                
                <div className="border border-border-subtle/40 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-surface-muted/30 px-3 py-1.5 font-bold text-on-surface-variant grid grid-cols-12 border-b border-border-subtle/45 uppercase text-[10px]">
                    <span className="col-span-6">Deskripsi Item</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-4 text-right">Subtotal</span>
                  </div>
                  
                  <div className="divide-y divide-border-subtle/30 bg-surface-container-lowest font-tabular-nums">
                    {selectedInvoice.items.map((it) => (
                      <div key={it.id} className="px-3 py-2 text-[11px] grid grid-cols-12 items-center">
                        <span className="col-span-6 font-bold text-on-surface truncate">{it.description}</span>
                        <span className="col-span-2 text-center font-semibold text-on-surface-variant">{it.quantity}</span>
                        <span className="col-span-4 text-right font-bold">{formatCurrency(it.quantity * it.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Invoice Calculations */}
              <div className="bg-surface-muted/30 p-3.5 rounded-xl border border-border-subtle/35 space-y-1.5 font-tabular-nums">
                <div className="flex justify-between font-medium text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discountTotal > 0 && (
                  <div className="flex justify-between font-medium text-warning-deadline">
                    <span>Diskon Penjualan</span>
                    <span>-{formatCurrency(selectedInvoice.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-on-surface-variant">
                  <span>Dasar Pengenaan Pajak (DPP)</span>
                  <span>{formatCurrency(selectedInvoice.dpp)}</span>
                </div>
                <div className="flex justify-between font-medium text-on-surface-variant">
                  <span>PPN ({selectedInvoice.ppnRate || 11}%)</span>
                  <span>{formatCurrency(selectedInvoice.ppnAmount)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-[13px] border-t border-border-subtle/40 pt-2 text-primary">
                  <span>Total Tagihan Pelanggan</span>
                  <span>{formatCurrency(selectedInvoice.grandTotal)}</span>
                </div>
              </div>

              {/* e-Faktur tax number */}
              {selectedInvoice.hasTaxInvoice && (
                <div className="bg-success-positive/5 border-l-4 border-success-positive p-3 rounded-xl font-medium leading-relaxed">
                  Faktur Pajak e-Faktur telah disetujui DJP dengan Nomor Seri Faktur Pajak (NSFP): <span className="font-bold font-tabular-nums text-success-positive">{selectedInvoice.taxInvoiceNumber}</span>.
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center border-t border-border-subtle/40 pt-4 mt-2">
              <div>
                {selectedInvoice.status === 'UNPAID' && (
                  <button
                    type="button"
                    onClick={() => handleRecordPayment(selectedInvoice)}
                    className="px-3.5 py-2 text-xs font-bold bg-gradient-secondary-premium hover:shadow text-white rounded-xl shadow-sm border border-secondary/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Catat Pelunasan Faktur
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}