'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';

export default function LabaRugiPage() {
  const { salesInvoices, purchaseInvoices } = useApp();

  // Dropdown Period State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Jan - Des 2026');
  const periods = ['Jan - Des 2026', 'Jan - Des 2025', 'Semester II 2026', 'Kuartal IV 2026'];

  // Filter new transactions added via forms (ID length > 7 for new sales, > 8 for new purchases)
  const newSales = salesInvoices.filter(inv => inv.id.length > 7);
  const newPurchases = purchaseInvoices.filter(inv => inv.id.length > 8);

  const newRevenueAmount = newSales.reduce((sum, inv) => sum + inv.dpp, 0);
  const newPurchaseAmount = newPurchases.reduce((sum, inv) => sum + inv.dpp, 0);

  // Dynamic calculations for the report
  const baseRevenue = 24500000000;
  const currentRevenueUsaha = baseRevenue + newRevenueAmount;
  const currentSalesReturn = -500000000;
  const currentNetRevenue = currentRevenueUsaha + currentSalesReturn;

  const currentBeginningInventory = 2000000000;
  const basePurchases = 8500000000;
  const currentPurchases = basePurchases + newPurchaseAmount;
  const currentEndingInventory = -1700000000;
  const currentCogs = -(currentBeginningInventory + currentPurchases + currentEndingInventory);

  const currentGrossProfit = currentNetRevenue + currentCogs; // currentCogs is negative

  const currentSalaryExpense = -1800000000;
  const currentRentExpense = -480000000;
  const currentUtilityExpense = -320000000;
  const currentAdminExpense = -890000000;
  const currentMarketingExpense = -650000000;
  const currentDepreciationExpense = -520000000;
  const currentTotalOperatingExpenses = 
    currentSalaryExpense + 
    currentRentExpense + 
    currentUtilityExpense + 
    currentAdminExpense + 
    currentMarketingExpense + 
    currentDepreciationExpense;

  const currentOperatingIncome = currentGrossProfit + currentTotalOperatingExpenses;

  const currentInterestIncome = 150000000;
  const currentForexGain = 80000000;
  const currentInterestExpense = -350000000;

  const currentNetProfitBeforeTax = 
    currentOperatingIncome + 
    currentInterestIncome + 
    currentForexGain + 
    currentInterestExpense;

  const currentTaxExpense = -Math.round(currentNetProfitBeforeTax * 0.18846);
  const currentNetProfit = currentNetProfitBeforeTax + currentTaxExpense;

  // Previous periods from mock data
  const prevRevenueUsaha = 21777000000;
  const prevSalesReturn = -450000000;
  const prevNetRevenue = 21327000000;

  const prevBeginningInventory = 1800000000;
  const prevPurchases = 7500000000;
  const prevEndingInventory = -2000000000;
  const prevCogs = -7300000000;
  const prevGrossProfit = 14027000000;

  const prevTotalOperatingExpenses = -4310000000;
  const prevOperatingIncome = 9717000000;
  const prevNetProfitBeforeTax = 9567000000;
  const prevTaxExpense = -1810000000;
  const prevNetProfit = 7757000000;

  // Calculate Variance Percentage helper
  const calcVariance = (curr: number, prev: number) => {
    if (prev === 0) return 0;
    const diff = curr - prev;
    const pct = (diff / Math.abs(prev)) * 100;
    return pct;
  };

  interface ReportItem {
    name: string;
    isSectionHeader?: boolean;
    isTotal?: boolean;
    currentPeriod?: number;
    previousPeriod?: number;
    variance?: number;
    indent?: number;
  }

  // Re-generate list items
  const reportItems: ReportItem[] = [
    { name: 'Pendapatan (Revenue)', isSectionHeader: true },
    { name: 'Pendapatan Usaha', currentPeriod: currentRevenueUsaha, previousPeriod: prevRevenueUsaha, variance: calcVariance(currentRevenueUsaha, prevRevenueUsaha) },
    { name: 'Retur Penjualan', currentPeriod: currentSalesReturn, previousPeriod: prevSalesReturn, variance: calcVariance(currentSalesReturn, prevSalesReturn) },
    { name: 'Total Pendapatan Bersih', isTotal: true, currentPeriod: currentNetRevenue, previousPeriod: prevNetRevenue, variance: calcVariance(currentNetRevenue, prevNetRevenue) },

    { name: 'Harga Pokok Penjualan (HPP)', isSectionHeader: true },
    { name: 'Persediaan Awal', currentPeriod: currentBeginningInventory, previousPeriod: prevBeginningInventory, variance: calcVariance(currentBeginningInventory, prevBeginningInventory) },
    { name: 'Pembelian', currentPeriod: currentPurchases, previousPeriod: prevPurchases, variance: calcVariance(currentPurchases, prevPurchases) },
    { name: 'Persediaan Akhir', currentPeriod: currentEndingInventory, previousPeriod: prevEndingInventory, variance: calcVariance(currentEndingInventory, prevEndingInventory) },
    { name: 'Total Harga Pokok Penjualan', isTotal: true, currentPeriod: currentCogs, previousPeriod: prevCogs, variance: calcVariance(currentCogs, prevCogs) },

    { name: 'Laba Kotor (Gross Profit)', isTotal: true, currentPeriod: currentGrossProfit, previousPeriod: prevGrossProfit, variance: calcVariance(currentGrossProfit, prevGrossProfit) },

    { name: 'Beban Operasional', isSectionHeader: true },
    { name: 'Beban Gaji & Tunjangan', currentPeriod: -currentSalaryExpense, previousPeriod: 1650000000, variance: calcVariance(-currentSalaryExpense, 1650000000) },
    { name: 'Beban Sewa', currentPeriod: -currentRentExpense, previousPeriod: 450000000, variance: calcVariance(-currentRentExpense, 450000000) },
    { name: 'Beban Utilitas', currentPeriod: -currentUtilityExpense, previousPeriod: 300000000, variance: calcVariance(-currentUtilityExpense, 300000000) },
    { name: 'Beban Administrasi', currentPeriod: -currentAdminExpense, previousPeriod: 850000000, variance: calcVariance(-currentAdminExpense, 850000000) },
    { name: 'Beban Marketing', currentPeriod: -currentMarketingExpense, previousPeriod: 580000000, variance: calcVariance(-currentMarketingExpense, 580000000) },
    { name: 'Beban Penyusutan', currentPeriod: -currentDepreciationExpense, previousPeriod: 480000000, variance: calcVariance(-currentDepreciationExpense, 480000000) },
    { name: 'Total Beban Operasional', isTotal: true, currentPeriod: currentTotalOperatingExpenses, previousPeriod: prevTotalOperatingExpenses, variance: calcVariance(currentTotalOperatingExpenses, prevTotalOperatingExpenses) },

    { name: 'Laba Operasional', isTotal: true, currentPeriod: currentOperatingIncome, previousPeriod: prevOperatingIncome, variance: calcVariance(currentOperatingIncome, prevOperatingIncome) },

    { name: 'Pendapatan Lain-lain', isSectionHeader: true },
    { name: 'Pendapatan Bunga', currentPeriod: currentInterestIncome, previousPeriod: 120000000, variance: calcVariance(currentInterestIncome, 120000000) },
    { name: 'Keuntungan Valuta Asing', currentPeriod: currentForexGain, previousPeriod: 50000000, variance: calcVariance(currentForexGain, 50000000) },
    { name: 'Beban Bunga', currentPeriod: currentInterestExpense, previousPeriod: -320000000, variance: calcVariance(currentInterestExpense, -320000000) },

    { name: 'Laba Bersih Sebelum Pajak', isTotal: true, currentPeriod: currentNetProfitBeforeTax, previousPeriod: prevNetProfitBeforeTax, variance: calcVariance(currentNetProfitBeforeTax, prevNetProfitBeforeTax) },
    { name: 'Beban Pajak Penghasilan', currentPeriod: currentTaxExpense, previousPeriod: prevTaxExpense, variance: calcVariance(currentTaxExpense, prevTaxExpense) },
    { name: 'LABA BERSIH', isTotal: true, currentPeriod: currentNetProfit, previousPeriod: prevNetProfit, variance: calcVariance(currentNetProfit, prevNetProfit) },
  ];

  // Export P&L Report to CSV
  const handleExportCSV = () => {
    const headers = ['Keterangan', '2026 (Berjalan)', '2025 (Lalu)', 'Variance'];
    const rows = reportItems.map(item => {
      const valText = (val: number | undefined) => {
        if (val === undefined) return '';
        const formatted = formatCurrency(Math.abs(val)).replace('Rp ', '');
        return val < 0 ? `(${formatted})` : formatted;
      };
      return [
        item.name,
        valText(item.currentPeriod),
        valText(item.previousPeriod),
        item.variance !== undefined ? `${item.variance >= 0 ? '+' : ''}${item.variance.toFixed(1)}%` : ''
      ];
    });

    const filename = `Laporan_Laba_Rugi_${new Date().toISOString().split('T')[0]}.csv`;
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
      <div className="space-y-6 animate-slide-up">
        {/* Page Header */}
        <PageHeader
          title="Laporan Laba Rugi (LAP-02)"
          description="Laporan Laba Rugi Komprehensif (Statement of Profit or Loss) sesuai standar PSAK."
          actions={
            <div className="flex items-center gap-2">
              {/* Interactive Custom Select Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="bg-white/80 dark:bg-black/40 border border-border-subtle/70 rounded-xl px-4 py-2 flex items-center gap-2 font-body-sm text-body-sm text-primary dark:text-secondary-container hover:bg-surface-container-low transition-all cursor-pointer font-semibold shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">calendar_month</span>
                  <span>{selectedPeriod}</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>arrow_drop_down</span>
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-border-subtle/80 dark:border-white/10 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-slide-up">
                    {periods.map((p) => (
                      <div
                        key={p}
                        onClick={() => {
                          setSelectedPeriod(p);
                          setIsDropdownOpen(false);
                        }}
                        className={`px-4 py-2 text-body-sm text-on-surface hover:bg-primary/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${selectedPeriod === p ? 'bg-secondary/10 text-secondary dark:text-secondary-container font-semibold' : ''}`}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline" icon="print" onClick={() => window.print()}>Cetak / PDF</Button>
              <Button variant="outline" icon="table_view" onClick={handleExportCSV}>Ekspor Excel</Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-secondary">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider relative z-10">Total Pendapatan</p>
            <div className="flex items-end justify-between relative z-10">
              <h3 className="font-headline-md text-headline-md text-primary dark:text-secondary-container font-bold font-tabular-nums">
                {formatCurrency(currentRevenueUsaha)}
              </h3>
              <div className="flex items-center gap-1 text-success-positive bg-success-positive/10 px-2.5 py-0.5 rounded-full font-label-md text-[10px] font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {calcVariance(currentRevenueUsaha, prevRevenueUsaha).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="glass-card p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 border-l-success-positive">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-success-positive/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider relative z-10">Laba Kotor</p>
            <div className="flex items-end justify-between relative z-10">
              <h3 className="font-headline-md text-headline-md text-primary dark:text-secondary-container font-bold font-tabular-nums">
                {formatCurrency(currentGrossProfit)}
              </h3>
              <div className="flex items-center gap-1 text-success-positive bg-success-positive/10 px-2.5 py-0.5 rounded-full font-label-md text-[10px] font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {calcVariance(currentGrossProfit, prevGrossProfit).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="bg-gradient-premium border-none text-white p-5 flex flex-col justify-between rounded-2xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <p className="font-label-md text-label-md text-white/80 mb-2 uppercase tracking-wider relative z-10">Laba Bersih</p>
            <div className="flex items-end justify-between relative z-10">
              <h3 className="font-headline-md text-headline-md text-white font-bold font-tabular-nums">
                {formatCurrency(currentNetProfit)}
              </h3>
              <div className="flex items-center gap-1 text-white bg-white/10 px-2.5 py-0.5 rounded-full font-label-md text-[10px] font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {calcVariance(currentNetProfit, prevNetProfit).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Main Report Table - Digital Paper Layout */}
        <div className="bg-white dark:bg-slate-900 border border-border-subtle/80 dark:border-white/10 rounded-2xl shadow-xl p-8 max-w-4xl mx-auto border-t-[8px] border-t-primary dark:border-t-secondary relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent"></div>
          
          {/* Official Letterhead Details */}
          <div className="text-center mb-8 border-b border-border-subtle/50 dark:border-white/10 pb-6">
            <h2 className="text-xl font-bold tracking-widest text-primary dark:text-secondary-container uppercase">PT FinCorp Indonesia Tbk</h2>
            <h1 className="text-lg font-bold text-on-surface mt-1 tracking-wide">LAPORAN LABA RUGI DAN PENDAPATAN KOMPREHENSIF LAIN</h1>
            <p className="text-xs text-on-surface-variant mt-1.5 font-medium">Untuk Periode-Periode yang Berakhir pada 31 Desember 2026 dan 2025</p>
            <p className="text-[11px] text-outline mt-2 italic">(Disajikan dalam Rupiah, kecuali dinyatakan lain)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[11px]">
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider w-1/2">Keterangan</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">2026 (Berjalan)</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">2025 (Lalu)</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-border-subtle/10">
                {reportItems.map((item, index) => {
                  const isSectionHeader = item.isSectionHeader;
                  const isTotal = item.isTotal;
                  const isLabaBersih = item.name === 'LABA BERSIH';
                  const indent = item.indent || (isSectionHeader ? 0 : isTotal ? 4 : 8);

                  if (isSectionHeader) {
                    return (
                      <tr key={index} className="bg-slate-50/50 dark:bg-black/10 border-t border-b border-border-subtle/50 font-label-md font-semibold text-[11px] tracking-wider text-primary dark:text-secondary-container uppercase">
                        <td className="py-2.5 px-4" colSpan={4}>
                          {item.name}
                        </td>
                      </tr>
                    );
                  }

                  const valText = (val: number | undefined) => {
                    if (val === undefined) return '';
                    const formatted = formatCurrency(Math.abs(val)).replace('Rp ', '');
                    return val < 0 ? `(${formatted})` : formatted;
                  };

                  let rowStyle = "hover:bg-primary/[0.01] dark:hover:bg-white/[0.01] transition-colors";
                  if (isLabaBersih) {
                    rowStyle = "bg-success-positive/10 text-success-positive font-bold border-t-2 border-b-4 border-double border-success-positive/30 shadow-[0_0_12px_rgba(26,93,26,0.12)] h-[44px]";
                  } else if (isTotal) {
                    rowStyle = "bg-slate-50/35 dark:bg-black/5 font-semibold text-primary dark:text-secondary-container border-t border-b-4 border-double border-t-on-surface/20 border-b-on-surface/30 h-[40px]";
                  }

                  return (
                    <tr key={index} className={rowStyle}>
                      <td className="py-2 px-4" style={{ paddingLeft: `${indent + 16}px` }}>
                        {item.name}
                      </td>
                      <td className="py-2 px-4 text-right font-tabular-nums">
                        {valText(item.currentPeriod)}
                      </td>
                      <td className="py-2 px-4 text-right font-tabular-nums text-on-surface-variant">
                        {valText(item.previousPeriod)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {item.variance !== undefined ? (
                          <span className={`font-tabular-nums font-semibold text-xs ${
                            item.variance >= 0 ? 'text-success-positive' : 'text-danger-liability'
                          }`}>
                            {item.variance >= 0 ? '+' : ''}{item.variance.toFixed(1)}%
                          </span>
                        ) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}