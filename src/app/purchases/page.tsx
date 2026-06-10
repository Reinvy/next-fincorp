'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { PurchaseInvoice, InvoiceItem } from '@/data/types';

export default function PurchasesPage() {
  const { purchaseInvoices, addPurchaseInvoice, vendors } = useApp();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [ppnRate, setPpnRate] = useState(11);
  const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    { description: 'Pembelian Bahan Baku A', quantity: 10, unitPrice: 1000000, discountPercent: 0, total: 10000000 }
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle item change
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

  // Calculate statistics dynamically
  const stats = {
    draftCount: purchaseInvoices.filter(p => p.status === 'DRAFT').length,
    draftVal: purchaseInvoices.filter(p => p.status === 'DRAFT').reduce((sum, p) => sum + p.grandTotal, 0),
    unpaidCount: purchaseInvoices.filter(p => p.status === 'UNPAID').length,
    unpaidVal: purchaseInvoices.filter(p => p.status === 'UNPAID').reduce((sum, p) => sum + p.grandTotal, 0),
    overdueCount: purchaseInvoices.filter(p => p.status === 'OVERDUE').length,
    overdueVal: purchaseInvoices.filter(p => p.status === 'OVERDUE').reduce((sum, p) => sum + p.grandTotal, 0),
    paidThisMonth: purchaseInvoices.filter(p => p.status === 'PAID').length,
    paidVal: purchaseInvoices.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.grandTotal, 0),
  };

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

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up">
        {/* Page Header */}
        <PageHeader
          title="Purchases"
          description="Kelola dan pantau faktur pembelian serta tagihan dari vendor/supplier."
          actions={
            <Button 
              icon="add" 
              className="bg-gradient-warning-premium hover:shadow-lg hover:shadow-warning-deadline/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              onClick={() => setIsModalOpen(true)}
            >
              Tambah Pembelian Baru
            </Button>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Draft Card */}
          <div className="glass-card p-5 flex flex-col gap-2 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary-container">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <span className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1.5 relative z-10">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: '16px' }}>pending_actions</span>
              Draft
            </span>
            <div className="font-display-lg text-display-lg text-on-background relative z-10 mt-1">{stats.draftCount}</div>
            <span className="font-body-sm text-body-sm text-on-surface-variant relative z-10 mt-auto">
              {formatCurrency(stats.draftVal)} Total
            </span>
          </div>

          {/* Unpaid Card - Amber/Orange Warm Gradient Accents */}
          <div className="glass-card p-5 flex flex-col gap-2 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-warning-deadline bg-gradient-to-br from-white/80 via-white/80 to-amber-500/5 dark:from-primary-container/20 dark:to-amber-500/5">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-warning-deadline/20 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <span className="font-label-md text-label-md text-warning-deadline flex items-center gap-1.5 relative z-10">
              <span className="material-symbols-outlined text-warning-deadline" style={{ fontSize: '16px' }}>schedule</span>
              Belum Dibayar
            </span>
            <div className="font-display-lg text-display-lg text-on-background relative z-10 mt-1">{stats.unpaidCount}</div>
            <span className="font-body-sm text-body-sm text-on-surface-variant relative z-10 mt-auto">
              {formatCurrency(stats.unpaidVal)} Total
            </span>
          </div>

          {/* Overdue Card - Hot Amber/Red Gradient Accent */}
          <div className="glass-card p-5 flex flex-col gap-2 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-danger-liability bg-gradient-to-br from-white/80 via-white/80 to-danger-liability/5 dark:from-primary-container/20 dark:to-danger-liability/5">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-danger-liability/25 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <span className="font-label-md text-label-md text-danger-liability flex items-center gap-1.5 relative z-10">
              <span className="material-symbols-outlined text-danger-liability" style={{ fontSize: '16px' }}>warning</span>
              Jatuh Tempo (Overdue)
            </span>
            <div className="font-display-lg text-display-lg text-danger-liability relative z-10 mt-1">{stats.overdueCount}</div>
            <span className="font-body-sm text-body-sm text-on-surface-variant relative z-10 mt-auto">
              {formatCurrency(stats.overdueVal)} Total
            </span>
          </div>

          {/* Paid Card */}
          <div className="glass-card p-5 flex flex-col gap-2 rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-success-positive">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success-positive/15 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <span className="font-label-md text-label-md text-success-positive flex items-center gap-1.5 relative z-10">
              <span className="material-symbols-outlined text-success-positive" style={{ fontSize: '16px' }}>check_circle</span>
              Lunas (Paid)
            </span>
            <div className="font-display-lg text-display-lg text-on-background relative z-10 mt-1">{stats.paidThisMonth}</div>
            <span className="font-body-sm text-body-sm text-success-positive flex items-center gap-1 relative z-10 mt-auto">
              {formatCurrency(stats.paidVal)} Total
            </span>
          </div>
        </div>

        {/* Filters & Table Area */}
        <div className="glass-card rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[400px]">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-border-subtle/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-muted/30">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '16px' }}>search</span>
                <input
                  className="pl-9 pr-4 py-1.5 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg text-body-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 w-full sm:w-64 transition-all duration-200"
                  placeholder="Search invoices, vendors..."
                  type="text"
                />
              </div>
              <div className="flex items-center gap-2 border border-border-subtle/70 rounded-lg bg-white/70 dark:bg-black/20 px-3 py-1.5 cursor-pointer hover:bg-surface-container-low transition-colors duration-200">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>calendar_today</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Last 30 Days</span>
                <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>arrow_drop_down</span>
              </div>
              <div className="flex items-center gap-2 border border-border-subtle/70 rounded-lg bg-white/70 dark:bg-black/20 px-3 py-1.5 cursor-pointer hover:bg-surface-container-low transition-colors duration-200">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: '16px' }}>filter_list</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Status: All</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-border-subtle/50" title="Export">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
              </button>
              <button className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-border-subtle/50" title="Print">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>print</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low/50 border-b border-border-subtle/50 font-label-md text-label-md text-on-surface-variant sticky top-0 z-10">
                <tr className="h-[40px]">
                  <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px]">Tanggal</th>
                  <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px]">No. Faktur</th>
                  <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px]">Nama Vendor</th>
                  <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px] text-right">Subtotal (Rp)</th>
                  <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px] text-right">PPN</th>
                  <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px] text-right">Grand Total (Rp)</th>
                  <th className="py-2 px-4 whitespace-nowrap font-semibold tracking-wider text-[11px] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="font-tabular-nums text-tabular-nums text-on-background divide-y divide-border-subtle/30">
                {purchaseInvoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    className={`hover:bg-primary/5 dark:hover:bg-white/5 transition-colors duration-150 h-[40px] ${inv.status === 'OVERDUE' ? 'bg-danger-liability/[0.03]' : ''}`}
                  >
                    <td className={`py-1 px-4 whitespace-nowrap ${inv.status === 'OVERDUE' ? 'text-danger-liability font-medium' : ''}`}>{inv.date}</td>
                    <td className="py-1 px-4 whitespace-nowrap text-secondary font-medium cursor-pointer hover:underline">{inv.invoiceNumber}</td>
                    <td className="py-1 px-4 whitespace-nowrap">{inv.vendorName}</td>
                    <td className="py-1 px-4 whitespace-nowrap text-right">{formatCurrency(inv.subtotal).replace('Rp ', '')}</td>
                    <td className="py-1 px-4 whitespace-nowrap text-right text-on-surface-variant">{formatCurrency(inv.ppnAmount).replace('Rp ', '')}</td>
                    <td className="py-1 px-4 whitespace-nowrap text-right font-semibold">{formatCurrency(inv.grandTotal).replace('Rp ', '')}</td>
                    <td className="py-1 px-4 whitespace-nowrap text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="p-3 border-t border-border-subtle/50 flex justify-between items-center bg-surface-muted/30 font-body-sm text-body-sm text-on-surface-variant">
            <div>Showing 1-{purchaseInvoices.length} of {purchaseInvoices.length} entries</div>
            <div className="flex items-center gap-1.5">
              <button className="px-2.5 py-1 rounded-lg border border-border-subtle/70 hover:bg-surface-container-low disabled:opacity-40 transition-colors cursor-pointer" disabled>Prev</button>
              <button className="px-3 py-1 rounded-lg border border-primary bg-primary text-on-primary font-medium">1</button>
              <button className="px-2.5 py-1 rounded-lg border border-border-subtle/70 hover:bg-surface-container-low disabled:opacity-40 transition-colors cursor-pointer" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Tambah Pembelian Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">shopping_cart</span>
                Catat Pembelian Baru
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
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
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all"
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
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Jatuh Tempo</label>
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Tarif PPN (%)</label>
                  <select 
                    value={ppnRate}
                    onChange={(e) => setPpnRate(Number(e.target.value))}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md transition-all"
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
                        className="absolute top-2 right-2 text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error-container/10"
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
                          className="h-9 px-3 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-body-sm focus:border-secondary outline-none transition-all"
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
                            className="h-9 px-3 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-right font-tabular-nums text-body-sm focus:border-secondary outline-none transition-all"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Harga Satuan (Rp)</label>
                          <input 
                            type="number"
                            required
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="h-9 px-3 bg-white dark:bg-black/40 border border-border-subtle/70 rounded-lg text-right font-tabular-nums text-body-sm focus:border-secondary outline-none transition-all"
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