'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Layout } from '@/components/layout';
import { KPICard, CashFlowChart, Alert, Button } from '@/components/ui';
import { formatCurrency, cashFlowData } from '@/data';
import Link from 'next/link';

export default function DashboardPage() {
  const {
    salesInvoices,
    purchaseInvoices,
    bankAccounts,
    recentTransactions,
    alerts,
    dismissAlert,
    paySalesInvoice,
    payPurchaseInvoice,
    company,
    showToast
  } = useApp();

  // States
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables' | 'transactions'>('receivables');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate KPIs dynamically
  const totalCashBalance = bankAccounts.reduce((sum, b) => sum + b.balance, 0);
  
  const totalReceivables = salesInvoices
    .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalPayables = purchaseInvoices
    .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const ppnOut = salesInvoices
    .filter(inv => inv.hasTaxInvoice && (inv.status === 'PAID' || inv.status === 'UNPAID' || inv.status === 'OVERDUE'))
    .reduce((sum, inv) => sum + inv.ppnAmount, 0);
  
  const ppnIn = purchaseInvoices
    .reduce((sum, inv) => sum + inv.ppnAmount, 0);

  const ppnPayable = Math.max(0, ppnOut - ppnIn);

  // Dynamic KPI Card structures
  const dynamicKpis = [
    {
      id: 'kpi-cash',
      title: 'Total Kas/Bank',
      value: totalCashBalance,
      formattedValue: formatCurrency(totalCashBalance),
      changePercent: 2.4,
      changeDirection: 'up' as const,
      icon: 'account_balance_wallet',
      color: 'default' as const,
      link: '/cash-bank',
    },
    {
      id: 'kpi-receivable',
      title: 'Piutang Usaha',
      value: totalReceivables,
      formattedValue: formatCurrency(totalReceivables),
      changePercent: 12.1,
      changeDirection: 'up' as const,
      icon: 'arrow_downward',
      color: 'danger' as const,
      extraInfo: 'Termasuk PPN Masukan/Keluaran',
      link: '/sales',
    },
    {
      id: 'kpi-payable',
      title: 'Hutang Usaha',
      value: totalPayables,
      formattedValue: formatCurrency(totalPayables),
      changePercent: 5.2,
      changeDirection: 'down' as const,
      icon: 'arrow_upward',
      color: 'success' as const,
      extraInfo: `Menunggu Pembayaran`,
      link: '/purchases',
    },
    {
      id: 'kpi-ppn',
      title: 'PPN Terutang (Kurang Bayar)',
      value: ppnPayable,
      formattedValue: formatCurrency(ppnPayable),
      changePercent: 0,
      changeDirection: 'up' as const,
      icon: 'receipt',
      color: ppnPayable > 0 ? ('danger' as const) : ('success' as const),
      link: '/tax',
    },
  ];

  // Dynamic Laba Rugi calculations
  const totalRevenue = salesInvoices.reduce((sum, inv) => sum + inv.dpp, 0);
  const totalExpenses = purchaseInvoices.reduce((sum, inv) => sum + inv.dpp, 0);
  const netProfit = totalRevenue - totalExpenses;

  const revenuePercent = totalRevenue > 0 ? 100 : 0;
  const expensePercent = totalRevenue > 0 ? Math.min(100, Math.round((totalExpenses / totalRevenue) * 100)) : 0;

  // Unpaid invoices for aging receivables table
  const unpaidInvoices = salesInvoices
    .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
    .slice(0, 5);

  // Unpaid purchases for aging payables table
  const unpaidPurchases = purchaseInvoices
    .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
    .slice(0, 5);

  // Top transactions
  const topTransactions = recentTransactions.slice(0, 5);

  const handleExportCSV = (type: 'receivables' | 'payables' | 'transactions') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'receivables') {
      const data = salesInvoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE');
      headers = ['No. Faktur', 'Nama Pelanggan', 'Tanggal', 'Jatuh Tempo', 'Jumlah Total', 'Status'];
      rows = data.map(inv => [
        inv.invoiceNumber,
        inv.customerName,
        inv.date,
        inv.dueDate,
        inv.grandTotal.toString(),
        inv.status
      ]);
      filename = `Daftar_Piutang_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'payables') {
      const data = purchaseInvoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE');
      headers = ['No. Faktur', 'Nama Vendor', 'Tanggal', 'Jatuh Tempo', 'Jumlah Total', 'Status'];
      rows = data.map(inv => [
        inv.invoiceNumber,
        inv.vendorName,
        inv.date,
        inv.dueDate,
        inv.grandTotal.toString(),
        inv.status
      ]);
      filename = `Daftar_Hutang_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Akun', 'Tipe', 'Jumlah'];
      rows = recentTransactions.map(tx => [
        tx.date,
        tx.description,
        tx.category,
        tx.accountName,
        tx.type,
        tx.amount.toString()
      ]);
      filename = `Aktivitas_Kas_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add UTF-8 BOM
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAgingBadge = (status: string, dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (status === 'OVERDUE' || diffDays > 30) {
      return (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-error-container text-on-error-container">
          &gt;30 Hari
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-surface-container text-on-surface-variant">
        &lt;30 Hari
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-border-subtle/40">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary dark:text-inverse-primary font-headline-md">
              Selamat Datang, Admin {company.name.split(' ')[0]}
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">
              Ringkasan posisi keuangan per hari ini, {today}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon="print" onClick={() => setIsPrintModalOpen(true)}>
              Cetak / Ekspor Laporan
            </Button>
            <Link href="/sales/invoice">
              <Button icon="add">
                Faktur Baru
              </Button>
            </Link>
          </div>
        </div>

        {/* Alert Section */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} data={alert} onDismiss={() => dismissAlert(alert.id)} />
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {dynamicKpis.map((kpi) => (
            <KPICard key={kpi.id} data={kpi} />
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Charts */}
          <div className="xl:col-span-2 space-y-6">
            {/* Cash Flow Chart */}
            <div className="glass-card rounded-2xl p-5 hover:border-secondary-container/50 transition-all duration-300">
              <CashFlowChart data={cashFlowData} height={280} />
            </div>

            {/* Income Summary */}
            <div className="glass-card rounded-2xl p-5 hover:border-secondary-container/50 transition-all duration-300">
              <h3 className="font-headline-sm text-headline-sm text-on-background mb-4 font-semibold">Laba Rugi (YTD)</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-body-sm mb-1.5 font-medium">
                    <span className="text-on-surface-variant">Pendapatan (DPP)</span>
                    <span className="font-tabular-nums text-on-background font-semibold">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="bg-gradient-success-premium h-full rounded-full shadow-[0_0_8px_rgba(26,93,26,0.3)] transition-all duration-500" style={{ width: `${revenuePercent}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-body-sm mb-1.5 font-medium">
                    <span className="text-on-surface-variant">HPP &amp; Biaya Pembelian</span>
                    <span className="font-tabular-nums text-on-background font-semibold">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="bg-gradient-warning-premium h-full rounded-full shadow-[0_0_8px_rgba(180,83,9,0.3)] transition-all duration-500" style={{ width: `${expensePercent}%` }}></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border-subtle/50 flex justify-between items-center">
                  <span className="font-label-md text-label-md text-on-surface font-bold">Laba Bersih</span>
                  <span className="text-2xl font-bold tracking-tight font-tabular-nums text-secondary">
                    {formatCurrency(netProfit)}
                  </span>
                </div>
                <div className="pt-2 flex justify-end">
                  <Link
                    href="/reports/laba-rugi"
                    className="font-label-md text-label-md text-secondary hover:text-primary transition-colors flex items-center gap-1 hover:translate-x-0.5 duration-200 font-bold text-xs"
                  >
                    Analisis Laba Rugi Lengkap
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Tables */}
          <div className="xl:col-span-1 space-y-6">
            <div className="glass-card rounded-2xl flex flex-col min-h-[400px] max-h-[400px] hover:border-secondary-container/50 transition-all duration-300">
              
              {/* Tabs Header */}
              <div className="border-b border-border-subtle/40 bg-surface-muted/10 shrink-0 relative rounded-t-2xl">
                <div className="px-4 pt-4 pb-3 flex justify-between items-center">
                  <div className="flex gap-1 p-0.5 bg-surface-container-high/40 dark:bg-black/20 rounded-xl border border-border-subtle/30 backdrop-blur-sm">
                    <button
                      onClick={() => setActiveTab('receivables')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                        activeTab === 'receivables'
                          ? 'bg-white dark:bg-slate-800 text-primary dark:text-inverse-primary shadow-sm border border-border-subtle/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-white/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      Piutang
                    </button>
                    <button
                      onClick={() => setActiveTab('payables')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                        activeTab === 'payables'
                          ? 'bg-white dark:bg-slate-800 text-primary dark:text-inverse-primary shadow-sm border border-border-subtle/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-white/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      Hutang
                    </button>
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                        activeTab === 'transactions'
                          ? 'bg-white dark:bg-slate-800 text-primary dark:text-inverse-primary shadow-sm border border-border-subtle/20'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-white/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      Kas Terbaru
                    </button>
                  </div>
                  
                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                      className="text-on-surface-variant/60 hover:text-primary transition-colors p-1 rounded-lg hover:bg-surface-container-low cursor-pointer flex items-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                    {isMoreMenuOpen && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-border-subtle/80 dark:border-white/10 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-slide-up text-left">
                        {activeTab === 'receivables' && (
                          <>
                            <Link
                              href="/sales"
                              className="block px-4 py-2 text-xs text-on-surface hover:bg-primary/5 dark:hover:bg-white/5 font-semibold"
                              onClick={() => setIsMoreMenuOpen(false)}
                            >
                              Lihat Semua Penjualan
                            </Link>
                            <div
                              onClick={() => {
                                handleExportCSV('receivables');
                                setIsMoreMenuOpen(false);
                              }}
                              className="block px-4 py-2 text-xs text-on-surface hover:bg-primary/5 dark:hover:bg-white/5 font-semibold cursor-pointer border-t border-border-subtle/20"
                            >
                              Ekspor CSV Piutang
                            </div>
                          </>
                        )}
                        {activeTab === 'payables' && (
                          <>
                            <Link
                              href="/purchases"
                              className="block px-4 py-2 text-xs text-on-surface hover:bg-primary/5 dark:hover:bg-white/5 font-semibold"
                              onClick={() => setIsMoreMenuOpen(false)}
                            >
                              Lihat Semua Pembelian
                            </Link>
                            <div
                              onClick={() => {
                                handleExportCSV('payables');
                                setIsMoreMenuOpen(false);
                              }}
                              className="block px-4 py-2 text-xs text-on-surface hover:bg-primary/5 dark:hover:bg-white/5 font-semibold cursor-pointer border-t border-border-subtle/20"
                            >
                              Ekspor CSV Hutang
                            </div>
                          </>
                        )}
                        {activeTab === 'transactions' && (
                          <>
                            <Link
                              href="/cash-bank"
                              className="block px-4 py-2 text-xs text-on-surface hover:bg-primary/5 dark:hover:bg-white/5 font-semibold"
                              onClick={() => setIsMoreMenuOpen(false)}
                            >
                              Lihat Buku Kas &amp; Bank
                            </Link>
                            <div
                              onClick={() => {
                                handleExportCSV('transactions');
                                setIsMoreMenuOpen(false);
                              }}
                              className="block px-4 py-2 text-xs text-on-surface hover:bg-primary/5 dark:hover:bg-white/5 font-semibold cursor-pointer border-t border-border-subtle/20"
                            >
                              Ekspor CSV Aktivitas Kas
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Content Tables */}
              <div className="overflow-y-auto custom-scrollbar p-0 flex-1">
                {activeTab === 'receivables' && (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface/90 backdrop-blur-sm z-10 border-b border-border-subtle/50">
                      <tr>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider">No. Faktur</th>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-right">Jumlah</th>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-body-sm font-tabular-nums divide-y divide-border-subtle/30">
                      {unpaidInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-on-surface-variant text-body-sm">
                            Tidak ada piutang jatuh tempo.
                          </td>
                        </tr>
                      ) : (
                        unpaidInvoices.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedInvoice(item)}
                            className="hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer group h-[40px]"
                          >
                            <td className="py-1 px-4 text-on-background whitespace-nowrap">
                              <div className="font-semibold text-secondary hover:underline">{item.invoiceNumber}</div>
                              <div className="text-[11px] text-on-surface-variant truncate max-w-[120px]">{item.customerName}</div>
                            </td>
                            <td className="py-1 px-4 text-right text-danger-liability font-bold">{formatCurrency(item.grandTotal)}</td>
                            <td className="py-1 px-4 text-center">
                              {getAgingBadge(item.status, item.dueDate)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === 'payables' && (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface/90 backdrop-blur-sm z-10 border-b border-border-subtle/50">
                      <tr>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider">No. Faktur</th>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-right">Jumlah</th>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-body-sm font-tabular-nums divide-y divide-border-subtle/30">
                      {unpaidPurchases.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-on-surface-variant text-body-sm">
                            Tidak ada hutang jatuh tempo.
                          </td>
                        </tr>
                      ) : (
                        unpaidPurchases.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedPurchase(item)}
                            className="hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer group h-[40px]"
                          >
                            <td className="py-1 px-4 text-on-background whitespace-nowrap">
                              <div className="font-semibold text-warning-deadline hover:underline">{item.invoiceNumber}</div>
                              <div className="text-[11px] text-on-surface-variant truncate max-w-[120px]">{item.vendorName}</div>
                            </td>
                            <td className="py-1 px-4 text-right text-warning-deadline font-bold">{formatCurrency(item.grandTotal)}</td>
                            <td className="py-1 px-4 text-center">
                              {getAgingBadge(item.status, item.dueDate)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {activeTab === 'transactions' && (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-surface/90 backdrop-blur-sm z-10 border-b border-border-subtle/50">
                      <tr>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider">Transaksi</th>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-right">Jumlah</th>
                        <th className="py-2.5 px-4 font-label-md text-[10.5px] text-on-surface-variant font-semibold tracking-wider text-center">Tipe</th>
                      </tr>
                    </thead>
                    <tbody className="text-body-sm font-tabular-nums divide-y divide-border-subtle/30">
                      {topTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-on-surface-variant text-body-sm">
                            Tidak ada transaksi terbaru.
                          </td>
                        </tr>
                      ) : (
                        topTransactions.map((tx) => (
                          <tr
                            key={tx.id}
                            onClick={() => setSelectedTransaction(tx)}
                            className="hover:bg-primary/5 dark:hover:bg-white/5 transition-colors cursor-pointer group h-[40px]"
                          >
                            <td className="py-1 px-4 text-on-background whitespace-nowrap">
                              <div className="font-semibold text-on-background truncate max-w-[150px] group-hover:text-secondary">{tx.description}</div>
                              <div className="text-[11px] text-on-surface-variant">{tx.date} • {tx.accountName}</div>
                            </td>
                            <td className={`py-1 px-4 text-right font-bold ${tx.type === 'IN' ? 'text-success-positive' : 'text-danger-liability'}`}>
                              {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount).replace('Rp ', '')}
                            </td>
                            <td className="py-1 px-4 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] ${
                                tx.type === 'IN' ? 'bg-success-positive/10 text-success-positive' : 'bg-danger-liability/10 text-danger-liability'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Tab Footer Link */}
              <div className="px-5 py-3 border-t border-border-subtle/50 mt-auto bg-surface-muted/10 shrink-0 text-center">
                {activeTab === 'receivables' && (
                  <Link
                    href="/sales"
                    className="font-label-md text-label-md text-secondary hover:text-primary transition-colors text-center block w-full hover:-translate-y-0.5 duration-200 font-bold text-xs"
                  >
                    Lihat Semua Penjualan →
                  </Link>
                )}
                {activeTab === 'payables' && (
                  <Link
                    href="/purchases"
                    className="font-label-md text-label-md text-secondary hover:text-primary transition-colors text-center block w-full hover:-translate-y-0.5 duration-200 font-bold text-xs"
                  >
                    Lihat Semua Pembelian →
                  </Link>
                )}
                {activeTab === 'transactions' && (
                  <Link
                    href="/cash-bank"
                    className="font-label-md text-label-md text-secondary hover:text-primary transition-colors text-center block w-full hover:-translate-y-0.5 duration-200 font-bold text-xs"
                  >
                    Lihat Buku Kas &amp; Bank →
                  </Link>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">description</span>
                Faktur {selectedInvoice.invoiceNumber}
              </h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar text-on-surface">
              <div className="grid grid-cols-2 gap-4 border-b border-border-subtle/30 pb-4 text-body-sm">
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Lawan Transaksi</span>
                  <p className="font-semibold mt-0.5 text-body-md">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Status Faktur</span>
                  <p className="mt-0.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-error-container text-on-error-container">
                      {selectedInvoice.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Faktur</span>
                  <p className="mt-0.5 font-tabular-nums">{selectedInvoice.date}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Jatuh Tempo</span>
                  <p className="mt-0.5 font-tabular-nums text-danger-liability font-semibold">{selectedInvoice.dueDate}</p>
                </div>
              </div>

              {/* Rincian Barang */}
              <div>
                <h4 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold mb-2">Rincian Barang / Jasa</h4>
                <div className="space-y-2">
                  {selectedInvoice.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white/40 dark:bg-black/10 border border-border-subtle/50 rounded-xl flex justify-between items-center text-body-sm">
                      <div>
                        <p className="font-semibold text-on-surface">{item.description}</p>
                        <p className="text-xs text-on-surface-variant font-tabular-nums">{item.quantity} x {formatCurrency(item.unitPrice)} (Disc {item.discountPercent}%)</p>
                      </div>
                      <span className="font-semibold font-tabular-nums text-on-surface">{formatCurrency(item.total).replace('Rp ', '')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kalkulasi Ringkasan */}
              <div className="bg-surface-muted/30 border border-border-subtle/50 p-4 rounded-xl space-y-2 text-body-sm font-tabular-nums">
                <div className="flex justify-between text-on-surface-variant">
                  <span>DPP (Dasar Pengenaan Pajak)</span>
                  <span>{formatCurrency(selectedInvoice.dpp)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>PPN ({selectedInvoice.ppnRate}%)</span>
                  <span>{formatCurrency(selectedInvoice.ppnAmount)}</span>
                </div>
                <div className="flex justify-between text-primary font-bold border-t border-border-subtle/40 pt-2 text-body-md">
                  <span>Grand Total</span>
                  <span>{formatCurrency(selectedInvoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex flex-wrap justify-between gap-3 shrink-0">
              <Button 
                variant="outline" 
                icon="mail" 
                onClick={() => {
                  showToast(`Pengingat tagihan berhasil terkirim via Email & WhatsApp ke ${selectedInvoice.customerName}!`, 'success');
                }}
              >
                Kirim Pengingat
              </Button>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    paySalesInvoice(selectedInvoice.id);
                    showToast('Faktur berhasil dilunasi! Saldo bank dan transaksi kas diperbarui otomatis.', 'success');
                    setSelectedInvoice(null);
                  }}
                  className="bg-gradient-success-premium text-white"
                  icon="check"
                >
                  Tandai Lunas
                </Button>
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Tutup</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Invoice Detail Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">receipt_long</span>
                Faktur Pembelian {selectedPurchase.invoiceNumber}
              </h3>
              <button 
                onClick={() => setSelectedPurchase(null)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar text-on-surface">
              <div className="grid grid-cols-2 gap-4 border-b border-border-subtle/30 pb-4 text-body-sm">
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Vendor / Supplier</span>
                  <p className="font-semibold mt-0.5 text-body-md">{selectedPurchase.vendorName}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Status Faktur</span>
                  <p className="mt-0.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning-deadline/20 text-warning-deadline">
                      {selectedPurchase.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Tanggal Faktur</span>
                  <p className="mt-0.5 font-tabular-nums">{selectedPurchase.date}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Jatuh Tempo</span>
                  <p className="mt-0.5 font-tabular-nums text-danger-liability font-semibold">{selectedPurchase.dueDate}</p>
                </div>
              </div>

              {/* Rincian Barang */}
              <div>
                <h4 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold mb-2">Rincian Barang / Jasa</h4>
                <div className="space-y-2">
                  {selectedPurchase.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white/40 dark:bg-black/10 border border-border-subtle/50 rounded-xl flex justify-between items-center text-body-sm">
                      <div>
                        <p className="font-semibold text-on-surface">{item.description}</p>
                        <p className="text-xs text-on-surface-variant font-tabular-nums">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <span className="font-semibold font-tabular-nums text-on-surface">{formatCurrency(item.total).replace('Rp ', '')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kalkulasi Ringkasan */}
              <div className="bg-surface-muted/30 border border-border-subtle/50 p-4 rounded-xl space-y-2 text-body-sm font-tabular-nums">
                <div className="flex justify-between text-on-surface-variant">
                  <span>DPP (Dasar Pengenaan Pajak)</span>
                  <span>{formatCurrency(selectedPurchase.dpp)}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>PPN ({selectedPurchase.ppnRate || 11}%)</span>
                  <span>{formatCurrency(selectedPurchase.ppnAmount)}</span>
                </div>
                <div className="flex justify-between text-primary font-bold border-t border-border-subtle/40 pt-2 text-body-md">
                  <span>Grand Total</span>
                  <span>{formatCurrency(selectedPurchase.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setSelectedPurchase(null)}>Tutup</Button>
              <Button 
                onClick={() => {
                  payPurchaseInvoice(selectedPurchase.id);
                  showToast('Tagihan pembelian berhasil dilunasi! Saldo bank dikurangi dan transaksi pengeluaran kas dicatat.', 'success');
                  setSelectedPurchase(null);
                }}
                className="bg-gradient-warning-premium text-white"
                icon="check"
              >
                Tandai Lunas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">payments</span>
                Detail Transaksi Kas
              </h3>
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-on-surface text-body-sm font-tabular-nums">
              <div className="bg-surface-container/20 border border-border-subtle/50 p-5 rounded-2xl text-center space-y-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">Nominal Transaksi</span>
                <p className={`text-3xl font-bold ${selectedTransaction.type === 'IN' ? 'text-success-positive' : 'text-danger-liability'}`}>
                  {selectedTransaction.type === 'IN' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                </p>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                  selectedTransaction.type === 'IN'
                    ? 'bg-success-positive/10 text-success-positive border-success-positive/20'
                    : 'bg-danger-liability/10 text-danger-liability border-danger-liability/20'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {selectedTransaction.type === 'IN' ? 'arrow_downward' : 'arrow_upward'}
                  </span>
                  {selectedTransaction.type === 'IN' ? 'Pemasukan Kas' : 'Pengeluaran Kas'}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between border-b border-border-subtle/25 pb-2">
                  <span className="text-on-surface-variant">Deskripsi</span>
                  <span className="font-semibold text-right">{selectedTransaction.description}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle/25 pb-2">
                  <span className="text-on-surface-variant">Tanggal</span>
                  <span className="font-semibold">{selectedTransaction.date}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle/25 pb-2">
                  <span className="text-on-surface-variant">Akun Kas/Bank</span>
                  <span className="font-semibold">{selectedTransaction.accountName}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle/25 pb-2">
                  <span className="text-on-surface-variant">Kategori Akuntansi</span>
                  <span className="font-semibold text-secondary">{selectedTransaction.category}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end shrink-0">
              <Button variant="outline" onClick={() => setSelectedTransaction(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-2xl w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">picture_as_pdf</span>
                Ekspor Laporan Keuangan
              </h3>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto max-h-[450px] custom-scrollbar bg-white dark:bg-slate-900 text-on-surface">
              {/* Report Header */}
              <div className="text-center border-b border-border-subtle/50 pb-4">
                <h2 className="text-lg font-bold text-primary dark:text-secondary-container uppercase tracking-wider">{company.name}</h2>
                <h1 className="text-base font-bold text-on-surface mt-0.5">RINGKASAN EKSEKUTIF POSISI KEUANGAN</h1>
                <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Per tanggal {today}</p>
              </div>

              {/* Grid Values */}
              <div className="grid grid-cols-2 gap-4 font-tabular-nums text-body-sm">
                <div className="p-4 bg-slate-50 dark:bg-black/10 border border-border-subtle/50 rounded-xl">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase">Kas &amp; Bank</span>
                  <p className="text-base font-bold text-primary dark:text-secondary-container mt-1">{formatCurrency(totalCashBalance)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-black/10 border border-border-subtle/50 rounded-xl">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase">Piutang Usaha</span>
                  <p className="text-base font-bold text-danger-liability mt-1">{formatCurrency(totalReceivables)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-black/10 border border-border-subtle/50 rounded-xl">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase">Hutang Usaha</span>
                  <p className="text-base font-bold text-success-positive mt-1">{formatCurrency(totalPayables)}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-black/10 border border-border-subtle/50 rounded-xl">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase">PPN Terutang</span>
                  <p className="text-base font-bold text-on-surface mt-1">{formatCurrency(ppnPayable)}</p>
                </div>
              </div>

              {/* Laba Rugi summary */}
              <div className="border-t border-border-subtle/40 pt-4">
                <h4 className="font-label-md text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Estimasi Laba Rugi YTD</h4>
                <div className="space-y-2 text-body-sm font-tabular-nums">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Total Pendapatan (Revenue)</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Total Pengeluaran (Expenses)</span>
                    <span className="font-semibold text-on-surface">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-primary font-bold border-t border-border-subtle/40 pt-2 text-body-md">
                    <span>Estimasi Laba Bersih</span>
                    <span className="text-secondary">{formatCurrency(netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>Batal</Button>
              <Button 
                onClick={() => {
                  setIsPrintModalOpen(false);
                  setTimeout(() => window.print(), 100);
                }}
                className="bg-gradient-secondary-premium text-white"
                icon="print"
              >
                Cetak Laporan
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}