'use client';

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { PurchaseInvoice, InvoiceItem } from '@/data/types';

// Date parser helper to handle both ISO and Indonesian locale dates
const parseInvoiceDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  let parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  let cleanStr = dateStr.trim();
  const indonesianMonths: { [key: string]: string } = {
    'mei': 'may',
    'agu': 'aug',
    'okt': 'oct',
    'des': 'dec'
  };
  
  Object.keys(indonesianMonths).forEach(ind => {
    const reg = new RegExp(ind, 'gi');
    cleanStr = cleanStr.replace(reg, indonesianMonths[ind]);
  });
  
  parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) return parsed;
  
  const parts = cleanStr.split(/[\s/-]+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(year)) {
      const monthStr = parts[1].toLowerCase();
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIdx = months.findIndex(m => monthStr.startsWith(m));
      if (monthIdx !== -1) {
        return new Date(year, monthIdx, day);
      }
    }
  }

  return new Date();
};

export default function PurchasesPage() {
  const { purchaseInvoices, addPurchaseInvoice, payPurchaseInvoice, vendors } = useApp();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID_OVERDUE' | 'PAID' | 'DRAFT'>('ALL');

  // Drill-down Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  // Tambah Pembelian Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [ppnRate, setPpnRate] = useState(11);
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    { description: 'Pembelian Bahan Baku A', quantity: 10, unitPrice: 1000000, discountPercent: 0, total: 10000000 }
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle item change inside "Tambah Pembelian Baru"
  const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: any) => {
    const updatedItems = items.map((item, idx) => {
      if (idx === index) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) : updated.quantity;
          const price = field === 'unitPrice' ? Number(value) : updated.unitPrice;
          updated.total = qty * price;
        }
        return updated;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, discountPercent: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Dynamic calculations for Bento Grid KPIs
  const stats = useMemo(() => {
    let totalPurchases = 0;
    let outstandingPayables = 0;
    let cashPaid = 0;
    let totalPpn = 0;
    
    let draftCount = 0;
    let draftVal = 0;
    let unpaidCount = 0;
    let unpaidVal = 0;
    let overdueCount = 0;
    let overdueVal = 0;
    let paidCount = 0;
    let paidVal = 0;

    purchaseInvoices.forEach(inv => {
      if (inv.status === 'DRAFT') {
        draftCount++;
        draftVal += inv.grandTotal;
      } else {
        totalPurchases += inv.grandTotal;
        totalPpn += inv.ppnAmount;
        if (inv.status === 'PAID') {
          paidCount++;
          paidVal += inv.grandTotal;
          cashPaid += inv.grandTotal;
        } else if (inv.status === 'UNPAID') {
          unpaidCount++;
          unpaidVal += inv.grandTotal;
          outstandingPayables += inv.grandTotal;
        } else if (inv.status === 'OVERDUE') {
          overdueCount++;
          overdueVal += inv.grandTotal;
          outstandingPayables += inv.grandTotal;
        }
      }
    });

    return {
      totalPurchases,
      outstandingPayables,
      cashPaid,
      totalPpn,
      draftCount,
      draftVal,
      unpaidCount,
      unpaidVal,
      overdueCount,
      overdueVal,
      paidCount,
      paidVal
    };
  }, [purchaseInvoices]);

  // Payables Aging Calculations (for UNPAID and OVERDUE invoices)
  const aging = useMemo(() => {
    const today = new Date();
    let current = 0;     // 0-30 days
    let warning = 0;     // 31-60 days
    let critical = 0;    // 60+ days

    purchaseInvoices.forEach(inv => {
      if (inv.status === 'UNPAID' || inv.status === 'OVERDUE') {
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
  }, [purchaseInvoices]);

  // Settle invoice payment trigger
  const handleRecordPayment = (invoice: PurchaseInvoice) => {
    if (confirm(`Apakah Anda yakin ingin mencatat pelunasan Faktur Pembelian ${invoice.invoiceNumber}? Saldo Kas/Bank akan berkurang sebesar Rp ${invoice.grandTotal.toLocaleString('id-ID')}.`)) {
      payPurchaseInvoice(invoice.id);
      setSelectedInvoice(null);
      alert(`Pembayaran Faktur Pembelian ${invoice.invoiceNumber} berhasil dicatat.`);
    }
  };

  // Filtered purchase invoices for display in the table
  const filteredInvoices = useMemo(() => {
    return purchaseInvoices.filter(inv => {
      const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === 'UNPAID_OVERDUE') {
        matchesStatus = inv.status === 'UNPAID' || inv.status === 'OVERDUE';
      } else if (statusFilter === 'PAID') {
        matchesStatus = inv.status === 'PAID';
      } else if (statusFilter === 'DRAFT') {
        matchesStatus = inv.status === 'DRAFT';
      }

      return matchesSearch && matchesStatus;
    });
  }, [purchaseInvoices, searchQuery, statusFilter]);

  // Save Purchase from form
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedVendorId || !invoiceDate) {
      setErrorMsg('Harap lengkapi vendor dan tanggal pembelian.');
      return;
    }

    const selectedVendor = vendors.find(v => v.id === selectedVendorId);
    if (!selectedVendor) return;

    // Map items to include a mock ID
    const formattedItems = items.map((item, idx) => ({
      id: `pitem-${Date.now()}-${idx}`,
      ...item,
    }));

    addPurchaseInvoice({
      date: new Date(invoiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      dueDate: dueDate 
        ? new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date(invoiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      vendorId: selectedVendorId,
      vendorName: selectedVendor.name,
      items: formattedItems,
      ppnRate,
      status: 'UNPAID',
    });

    // Reset & Close Modal
    setSelectedVendorId('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setPpnRate(11);
    setItems([{ description: 'Pembelian Bahan Baku A', quantity: 10, unitPrice: 1000000, discountPercent: 0, total: 10000000 }]);
    setIsModalOpen(false);
  };

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ['No. Faktur', 'Tanggal', 'Vendor', 'Subtotal', 'DPP', 'PPN', 'Grand Total', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.date,
      inv.vendorName,
      inv.subtotal.toString(),
      inv.dpp.toString(),
      inv.ppnAmount.toString(),
      inv.grandTotal.toString(),
      inv.status
    ]);

    const filename = `Laporan_Faktur_Pembelian_${new Date().toISOString().split('T')[0]}.csv`;
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
          title="Pembelian (Purchases)"
          description="Kelola faktur pembelian dari vendor, pantau jatuh tempo tagihan, dan catat pelunasan kas/bank."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="download"
                onClick={handleExportCSV}
              >
                Ekspor CSV
              </Button>
              <Button 
                icon="add" 
                className="bg-gradient-warning-premium hover:shadow-lg hover:shadow-warning-deadline/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                onClick={() => setIsModalOpen(true)}
              >
                Tambah Pembelian Baru
              </Button>
            </div>
          }
        />

        {/* Bento Grid KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Belanja */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-primary relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-primary/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">shopping_bag</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Nilai Pembelian</p>
            <p className="text-xl font-bold tracking-tight text-on-surface font-tabular-nums">
              {formatCurrency(stats.totalPurchases)}
            </p>
            <span className="text-[10px] text-on-surface-variant/65 block mt-1 font-medium">
              {stats.draftCount} Draft Faktur ({formatCurrency(stats.draftVal)})
            </span>
          </div>

          {/* Card 2: Utang Dagang */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-warning-deadline relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white/80 via-white/80 to-amber-500/5 dark:from-primary-container/20 dark:to-amber-500/5">
            <div className="absolute right-2 bottom-2 text-warning-deadline/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">pending_actions</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Utang Dagang (Outstanding)</p>
            <p className="text-xl font-bold tracking-tight text-warning-deadline font-tabular-nums">
              {formatCurrency(stats.outstandingPayables)}
            </p>
            <span className="text-[10px] text-warning-deadline flex items-center gap-1 mt-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-deadline animate-pulse"></span>
              {stats.unpaidCount + stats.overdueCount} Faktur Belum Lunas
            </span>
          </div>

          {/* Card 3: Total Kas Keluar */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-success-positive relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-success-positive/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">payments</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Kas Terbayar</p>
            <p className="text-xl font-bold tracking-tight text-success-positive font-tabular-nums">
              {formatCurrency(stats.cashPaid)}
            </p>
            <span className="text-[10px] text-success-positive font-medium block mt-1">
              {stats.paidCount} Faktur Telah Dilunasi
            </span>
          </div>

          {/* Card 4: PPN Masukan */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-secondary relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-secondary/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">gavel</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">PPN Masukan Terhitung</p>
            <p className="text-xl font-bold tracking-tight text-secondary font-tabular-nums">
              {formatCurrency(stats.totalPpn)}
            </p>
            <span className="text-[10px] text-secondary font-medium block mt-1">Dapat dikreditkan di SPT Masa</span>
          </div>
        </div>

        {/* Double Panel: Invoices Table vs Payables Aging */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Invoices List */}
          <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden flex flex-col hover:border-secondary-container/20 transition-colors duration-300">
            {/* Table Header Controls */}
            <div className="px-6 py-4 border-b border-border-subtle/50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-muted/20">
              <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold tracking-wider uppercase">
                Daftar Faktur Pembelian
              </h3>
              <div className="relative w-full sm:w-60">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]">search</span>
                <input
                  className="w-full pl-9 pr-4 py-1.5 border border-border-subtle focus:border-secondary/40 focus:ring-1 focus:ring-secondary/20 rounded-xl font-body-sm text-xs bg-surface-container-low text-on-surface outline-none"
                  placeholder="Cari faktur atau vendor..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Toggle Status Tabs */}
            <div className="px-6 py-2 bg-surface-muted/10 border-b border-border-subtle/30 flex flex-wrap gap-1.5">
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
                onClick={() => setStatusFilter('UNPAID_OVERDUE')}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  statusFilter === 'UNPAID_OVERDUE'
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                Belum Lunas
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
              <button
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                  statusFilter === 'DRAFT'
                    ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                    : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                }`}
              >
                Draft
              </button>
            </div>

            {/* Table content */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-muted/30 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">No. Faktur</th>
                    <th className="py-3 px-4 font-semibold">Tanggal</th>
                    <th className="py-3 px-4 font-semibold">Vendor / Supplier</th>
                    <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                    <th className="py-3 px-4 font-semibold text-right">PPN</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Tagihan</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle/30 font-tabular-nums">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-on-surface-variant italic">
                        Tidak ada faktur pembelian yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedInvoice(inv)}
                        className={`hover:bg-surface-container-low/60 transition-colors h-11 cursor-pointer group ${inv.status === 'OVERDUE' ? 'bg-danger-liability/[0.02]' : ''}`}
                      >
                        <td className="py-2 px-4 text-primary font-bold group-hover:text-secondary transition-colors">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2 px-4 text-on-surface-variant">{inv.date}</td>
                        <td className="py-2 px-4 font-semibold text-on-surface">{inv.vendorName}</td>
                        <td className="py-2 px-4 text-right text-on-surface-variant">{formatCurrency(inv.subtotal).replace('Rp ', '')}</td>
                        <td className="py-2 px-4 text-right text-on-surface-variant">{formatCurrency(inv.ppnAmount).replace('Rp ', '')}</td>
                        <td className="py-2 px-4 text-right font-bold text-on-surface">{formatCurrency(inv.grandTotal).replace('Rp ', '')}</td>
                        <td className="py-2 px-4 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-border-subtle/50 bg-surface-muted/30 text-center font-bold text-[11px] text-on-surface-variant">
              Menampilkan {filteredInvoices.length} Faktur Pembelian
            </div>
          </div>

          {/* Column 3: Payables Aging */}
          <div className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:border-secondary-container/30 transition-colors duration-300">
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-border-subtle/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">pending_actions</span>
                  <h3 className="font-bold text-primary dark:text-secondary-container">Analisis Umur Utang</h3>
                </div>
                <span className="text-[10.5px] font-bold text-on-surface-variant bg-surface-container/60 px-2 py-0.5 rounded uppercase tracking-wider">Des 2026</span>
              </div>
              
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Rincian sebaran umur utang usaha (faktur belum lunas) berdasarkan jumlah hari terhitung sejak tanggal faktur diterbitkan.
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
                    <span className="font-bold text-on-surface">Jatuh Tempo (&gt; 60 Hari)</span>
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
              <span>Total Utang Usaha</span>
              <span className="text-warning-deadline font-bold text-sm">
                {formatCurrency(aging.current + aging.warning + aging.critical)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Drill-down Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-surface border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-scale-up text-xs">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">receipt_long</span>
                <div>
                  <h3 className="font-bold text-primary dark:text-secondary-container">
                    Rincian Faktur Pembelian
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
                  <span className="text-on-surface-variant text-[10px] uppercase font-bold">Tanggal Tagihan / Jatuh Tempo</span>
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

              {/* Vendor Info */}
              <div className="space-y-1 bg-surface-container-low/50 p-3.5 rounded-xl border border-border-subtle/30">
                <span className="text-on-surface-variant text-[10px] uppercase font-bold">Vendor / Supplier</span>
                <p className="font-bold text-on-surface mt-0.5">{selectedInvoice.vendorName}</p>
                {vendors.find(v => v.id === selectedInvoice.vendorId) && (
                  <>
                    <p className="text-on-surface-variant font-tabular-nums mt-0.5">NPWP: {vendors.find(v => v.id === selectedInvoice.vendorId)?.npwp || '-'}</p>
                    <p className="text-on-surface-variant mt-0.5">Alamat: {vendors.find(v => v.id === selectedInvoice.vendorId)?.address || '-'}</p>
                  </>
                )}
              </div>

              {/* Invoice Items table */}
              <div className="space-y-2">
                <span className="font-bold text-primary">Daftar Barang / Jasa Pembelian</span>
                
                <div className="border border-border-subtle/40 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-surface-muted/30 px-3 py-1.5 font-bold text-on-surface-variant grid grid-cols-12 border-b border-border-subtle/45 uppercase text-[10px]">
                    <span className="col-span-6">Deskripsi Item</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-4 text-right">Total</span>
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
                <div className="flex justify-between font-medium text-on-surface-variant">
                  <span>Dasar Pengenaan Pajak (DPP)</span>
                  <span>{formatCurrency(selectedInvoice.dpp)}</span>
                </div>
                <div className="flex justify-between font-medium text-on-surface-variant">
                  <span>PPN ({selectedInvoice.ppnRate || 11}%)</span>
                  <span>{formatCurrency(selectedInvoice.ppnAmount)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-[13px] border-t border-border-subtle/40 pt-2 text-primary">
                  <span>Total Tagihan Vendor</span>
                  <span>{formatCurrency(selectedInvoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center border-t border-border-subtle/40 pt-4 mt-2">
              <div>
                {(selectedInvoice.status === 'UNPAID' || selectedInvoice.status === 'OVERDUE') && (
                  <button
                    type="button"
                    onClick={() => handleRecordPayment(selectedInvoice)}
                    className="px-3.5 py-2 text-xs font-bold bg-gradient-secondary-premium hover:shadow text-white rounded-xl shadow-sm border border-secondary/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">payments</span>
                    Catat Pelunasan Pembelian
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

      {/* Tambah Pembelian Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in animate-duration-200">
          <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">shopping_cart</span>
                Catat Pembelian Baru
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSavePurchase}>
              <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-medium border border-error/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Vendor / Supplier</label>
                  <select 
                    required
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all text-on-surface"
                  >
                    <option value="">Pilih Vendor...</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Pembelian</label>
                    <input 
                      type="date" 
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all text-on-surface"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Jatuh Tempo</label>
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all text-on-surface"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Tarif PPN (%)</label>
                  <select 
                    value={ppnRate}
                    onChange={(e) => setPpnRate(Number(e.target.value))}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all text-on-surface"
                  >
                    <option value={11}>11% (Standard)</option>
                    <option value={0}>0% (Bebas PPN)</option>
                  </select>
                </div>

                {/* Items list */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold">Rincian Barang/Jasa</label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon="add" 
                      type="button" 
                      className="text-secondary hover:bg-secondary/10"
                      onClick={handleAddItem}
                    >
                      Tambah Item
                    </Button>
                  </div>
                  
                  {items.map((item, idx) => (
                    <div key={idx} className="p-4 bg-white/40 dark:bg-black/10 border border-border-subtle/50 rounded-xl space-y-3 relative group transition-all">
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="absolute top-2 right-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error-container/10 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Deskripsi</label>
                        <input 
                          type="text"
                          required
                          value={item.description}
                          placeholder="Nama barang / deskripsi biaya..."
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="h-9 px-3 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Qty</label>
                          <input 
                            type="number"
                            required
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="h-9 px-3 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-right font-tabular-nums text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Harga Satuan (Rp)</label>
                          <input 
                            type="number"
                            required
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="h-9 px-3 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-right font-tabular-nums text-body-sm focus:border-secondary outline-none transition-all text-on-surface"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-3 shrink-0">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit" className="bg-gradient-warning-premium text-white hover:shadow-lg hover:shadow-warning-deadline/20">Simpan Pembelian</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}