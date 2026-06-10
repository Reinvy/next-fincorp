'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { InvoiceItem } from '@/data/types';

export default function SalesInvoicePage() {
  const router = useRouter();
  const { customers, addSalesInvoice } = useApp();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('2026-10-27');
  const [dueDate, setDueDate] = useState('2026-11-26');
  const [hasTaxInvoice, setHasTaxInvoice] = useState(true);
  const [customerNpwp, setCustomerNpwp] = useState('01.234.567.8-901.000');
  const [ppnRate, setPpnRate] = useState(11);
  const [paymentTerms, setPaymentTerms] = useState('net30');
  const [notes, setNotes] = useState('');

  // Line items state
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: 'Konsultasi IT Bulan Oktober',
      quantity: 1,
      unitPrice: 15000000,
      discountPercent: 0,
      total: 15000000,
    },
    {
      id: '2',
      description: 'Lisensi Server (Tahunan)',
      quantity: 2,
      unitPrice: 5500000,
      discountPercent: 10,
      total: 9900000,
    },
  ]);

  // Autofill customer NPWP when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        setCustomerNpwp(cust.npwp || '');
      }
    }
  }, [selectedCustomerId, customers]);

  // Handle item change
  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate row total
        if (field === 'quantity' || field === 'unitPrice' || field === 'discountPercent') {
          const qty = field === 'quantity' ? Number(value) : updated.quantity;
          const price = field === 'unitPrice' ? Number(value) : updated.unitPrice;
          const disc = field === 'discountPercent' ? Number(value) : updated.discountPercent;
          updated.total = Math.round(qty * price * (1 - disc / 100));
        }
        return updated;
      }
      return item;
    });
    setItems(updatedItems);
  };

  // Add blank item row
  const handleAddItem = () => {
    const newId = String(Date.now());
    setItems([
      ...items,
      {
        id: newId,
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        total: 0,
      },
    ]);
  };

  // Remove item row
  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return; // Keep at least one row
    setItems(items.filter(item => item.id !== id));
  };

  // Format NPWP on type
  const formatNpwp = (value: string) => {
    const clean = value.replace(/\D/g, '');
    let formatted = '';
    if (clean.length > 0) formatted += clean.substring(0, 2);
    if (clean.length > 2) formatted += '.' + clean.substring(2, 5);
    if (clean.length > 5) formatted += '.' + clean.substring(5, 8);
    if (clean.length > 8) formatted += '.' + clean.substring(8, 9);
    if (clean.length > 9) formatted += '-' + clean.substring(9, 12);
    if (clean.length > 12) formatted += '.' + clean.substring(12, 15);
    return formatted;
  };

  const handleNpwpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNpwp(e.target.value);
    setCustomerNpwp(formatted);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = items.reduce((sum, item) => sum + Math.round((item.quantity * item.unitPrice * item.discountPercent) / 100), 0);
  const dpp = subtotal - discountTotal;
  const ppnAmount = hasTaxInvoice ? Math.round((dpp * ppnRate) / 100) : 0;
  const grandTotal = dpp + ppnAmount;

  // Submit invoice
  const handleSubmit = (status: 'PAID' | 'UNPAID' | 'DRAFT') => {
    if (!selectedCustomerId) {
      alert('Harap pilih pelanggan terlebih dahulu.');
      return;
    }

    const selectedCust = customers.find(c => c.id === selectedCustomerId);
    if (!selectedCust) return;

    addSalesInvoice({
      date: new Date(invoiceDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      dueDate: new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      customerId: selectedCustomerId,
      customerName: selectedCust.name,
      customerNpwp: hasTaxInvoice ? customerNpwp : '',
      items,
      ppnRate: hasTaxInvoice ? ppnRate : 0,
      hasTaxInvoice,
      paymentTerms,
      notes,
      status,
    });

    router.push('/sales');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Buat Faktur Penjualan"
          description="Buat faktur komersial dan faktur pajak PPN secara bersamaan."
          badge={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-surface-container-high text-primary">DRAFT</span>
              <span className="font-label-md text-label-md text-outline">JUAL-2026-NEW</span>
            </div>
          }
          actions={
            <>
              <Button variant="outline" onClick={() => handleSubmit('DRAFT')}>Simpan Draft</Button>
              <Button icon="check_circle" onClick={() => handleSubmit('UNPAID')}>Proses Faktur</Button>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Details */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Customer Details Section */}
            <section className="bg-surface-container-lowest rounded-xl border border-border-subtle p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
              <h3 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">domain</span>
                Detail Pelanggan & Tanggal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">Pelanggan</label>
                  <select
                    className="w-full h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none appearance-none cursor-pointer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">Pilih Pelanggan...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Faktur</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums text-tabular-nums text-on-surface focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Jatuh Tempo</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums text-tabular-nums text-on-surface focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Line Items Section */}
            <section className="bg-surface-container-lowest rounded-xl border border-border-subtle overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
              <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted/50">
                <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">list_alt</span>
                  Rincian Barang / Jasa
                </h3>
                <Button variant="ghost" size="sm" icon="add" onClick={handleAddItem}>Tambah Baris</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-surface border-b border-border-subtle font-label-md text-label-md text-on-surface-variant">
                    <tr>
                      <th className="py-2 px-4 w-10">No</th>
                      <th className="py-2 px-4">Deskripsi Produk/Jasa</th>
                      <th className="py-2 px-4 w-24 text-right">Kuantitas</th>
                      <th className="py-2 px-4 w-36 text-right">Harga Satuan (Rp)</th>
                      <th className="py-2 px-4 w-24 text-right">Diskon %</th>
                      <th className="py-2 px-4 w-36 text-right">Total</th>
                      <th className="py-2 px-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm align-top">
                    {items.map((item, index) => (
                      <tr key={item.id} className="border-b border-border-subtle/50 hover:bg-surface-muted transition-colors group">
                        <td className="py-3 px-4 text-outline pt-5 font-tabular-nums">{index + 1}</td>
                        <td className="py-3 px-4">
                          <input
                            className="w-full h-8 px-2 bg-transparent border border-transparent hover:border-border-subtle focus:border-secondary focus:bg-white rounded outline-none"
                            type="text"
                            value={item.description}
                            placeholder="Ketik deskripsi produk/jasa..."
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            className="w-full h-8 px-2 text-right bg-transparent border border-transparent hover:border-border-subtle focus:border-secondary focus:bg-white rounded font-tabular-nums text-tabular-nums outline-none"
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            className="w-full h-8 px-2 text-right bg-transparent border border-transparent hover:border-border-subtle focus:border-secondary focus:bg-white rounded font-tabular-nums text-tabular-nums outline-none"
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            className="w-full h-8 px-2 text-right bg-transparent border border-transparent hover:border-border-subtle focus:border-secondary focus:bg-white rounded font-tabular-nums text-tabular-nums outline-none"
                            type="number"
                            min={0}
                            max={100}
                            value={item.discountPercent}
                            onChange={(e) => handleItemChange(item.id, 'discountPercent', Number(e.target.value))}
                          />
                        </td>
                        <td className="py-3 px-4 text-right pt-4 font-tabular-nums text-tabular-nums font-semibold text-primary">
                          {formatCurrency(item.total).replace('Rp ', '')}
                        </td>
                        <td className="py-3 px-4 text-right pt-4">
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-6 h-6 rounded hover:bg-surface-container"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Totals Area */}
              <div className="bg-surface-muted p-5 border-t border-border-subtle flex flex-col items-end gap-2">
                <div className="flex justify-between w-full max-w-sm text-on-surface-variant font-body-sm text-body-sm">
                  <span>Subtotal</span>
                  <span className="font-tabular-nums text-tabular-nums">{formatCurrency(subtotal).replace('Rp ', '')}</span>
                </div>
                <div className="flex justify-between w-full max-w-sm text-on-surface-variant font-body-sm text-body-sm">
                  <span>Diskon Total</span>
                  <span className="font-tabular-nums text-tabular-nums">{formatCurrency(discountTotal).replace('Rp ', '')}</span>
                </div>
                <div className="flex justify-between w-full max-w-sm text-on-surface-variant font-body-sm text-body-sm">
                  <span>Dasar Pengenaan Pajak (DPP)</span>
                  <span className="font-tabular-nums text-tabular-nums font-medium text-on-surface">{formatCurrency(dpp).replace('Rp ', '')}</span>
                </div>
                <div className="flex justify-between w-full max-w-sm text-on-surface-variant font-body-sm text-body-sm">
                  <span className="flex items-center gap-2">
                    PPN
                    <select 
                      disabled={!hasTaxInvoice}
                      value={ppnRate}
                      onChange={(e) => setPpnRate(Number(e.target.value))}
                      className="h-6 text-[11px] bg-white border border-border-subtle rounded px-1 cursor-pointer outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value={11}>11%</option>
                      <option value={0}>0%</option>
                    </select>
                  </span>
                  <span className="font-tabular-nums text-tabular-nums">{formatCurrency(ppnAmount).replace('Rp ', '')}</span>
                </div>
                <div className="w-full max-w-sm h-px bg-border-subtle my-2"></div>
                <div className="flex justify-between w-full max-w-sm text-primary font-headline-sm text-headline-sm">
                  <span>Grand Total</span>
                  <span className="font-tabular-nums text-tabular-nums font-bold text-secondary">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Tax & Settings */}
          <div className="flex flex-col gap-6">
            {/* Tax Section (e-Faktur) */}
            <section className="bg-surface-container-low rounded-xl border border-secondary-container p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="flex items-start justify-between mb-5 relative z-10">
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-secondary-container flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">account_balance</span>
                    Faktur Pajak
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-secondary-container/80 mt-1">Integrasi e-Faktur DJP</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={hasTaxInvoice}
                    onChange={(e) => setHasTaxInvoice(e.target.checked)}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>
              
              {hasTaxInvoice && (
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-secondary-fixed">NPWP Pelanggan</label>
                    <input
                      className="w-full h-10 px-3 bg-white border border-border-subtle rounded-lg font-tabular-nums text-tabular-nums text-on-surface focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none"
                      placeholder="00.000.000.0-000.000"
                      type="text"
                      maxLength={20}
                      value={customerNpwp}
                      onChange={handleNpwpChange}
                    />
                    {customerNpwp.length >= 15 ? (
                      <span className="text-[11px] text-success-positive flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Format Valid DJP
                      </span>
                    ) : (
                      <span className="text-[11px] text-warning-deadline flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Masukkan NPWP Lengkap
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-white/60 border border-secondary-container/50 rounded-lg mt-2 text-body-sm font-body-sm text-on-surface-variant flex gap-2">
                    <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">info</span>
                    <span>NSFP akan ditarik secara otomatis saat faktur disimpan.</span>
                  </div>
                </div>
              )}
              
              {!hasTaxInvoice && (
                <div className="p-4 bg-surface-muted/80 rounded-lg text-body-sm font-body-sm text-on-surface-variant/70 border border-border-subtle relative z-10">
                  Faktur pajak dinonaktifkan. Transaksi ini tidak akan dilaporkan ke DJP e-Faktur.
                </div>
              )}
            </section>

            {/* Additional Info */}
            <section className="bg-surface-container-lowest rounded-xl border border-border-subtle p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
              <h3 className="font-headline-sm text-headline-sm text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">description</span>
                Catatan & Syarat
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Catatan Faktur</label>
                  <textarea
                    className="w-full p-3 bg-surface-muted border border-border-subtle rounded-lg font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-secondary/30 focus:border-secondary resize-none outline-none"
                    placeholder="Tambahkan catatan untuk pelanggan..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Syarat Pembayaran</label>
                  <select 
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-secondary/30 focus:border-secondary appearance-none cursor-pointer outline-none"
                  >
                    <option value="net30">Net 30</option>
                    <option value="net15">Net 15</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}