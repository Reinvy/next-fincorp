'use client';

import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';

export default function LabaRugiPage() {
  const { salesInvoices, purchaseInvoices } = useApp();

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
    const isNegative = prev < 0;
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Laporan Laba Rugi (LAP-02)"
          description="Laporan Laba Rugi Komprehensif (Statement of Profit or Loss) sesuai standar PSAK."
          actions={
            <>
              <div className="bg-surface border border-border-subtle rounded px-3 py-1.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">calendar_month</span>
                <select className="bg-transparent border-none p-0 font-body-sm text-body-sm text-primary focus:ring-0 cursor-pointer outline-none">
                  <option>Jan - Des 2026</option>
                  <option>Jan - Des 2025</option>
                </select>
              </div>
              <Button variant="outline" icon="picture_as_pdf">PDF</Button>
              <Button variant="outline" icon="table_view">Excel</Button>
            </>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-[0_4px_4px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_8px_-4px_rgba(0,0,0,0.05)] transition-shadow">
            <p className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Total Pendapatan</p>
            <div className="flex items-end justify-between">
              <h3 className="font-headline-md text-headline-md text-primary font-tabular-nums text-tabular-nums">
                {formatCurrency(currentRevenueUsaha)}
              </h3>
              <div className="flex items-center gap-1 text-success-positive bg-success-positive/10 px-2 py-0.5 rounded-full font-label-md text-[10px]">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {calcVariance(currentRevenueUsaha, prevRevenueUsaha).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-[0_4px_4px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_8px_-4px_rgba(0,0,0,0.05)] transition-shadow">
            <p className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Laba Kotor</p>
            <div className="flex items-end justify-between">
              <h3 className="font-headline-md text-headline-md text-primary font-tabular-nums text-tabular-nums">
                {formatCurrency(currentGrossProfit)}
              </h3>
              <div className="flex items-center gap-1 text-success-positive bg-success-positive/10 px-2 py-0.5 rounded-full font-label-md text-[10px]">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {calcVariance(currentGrossProfit, prevGrossProfit).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="bg-surface border border-border-subtle rounded-xl p-4 shadow-[0_4px_4px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_8px_-4px_rgba(0,0,0,0.05)] transition-shadow relative overflow-hidden">
            <div className="absolute right-0 top-0 w-2 h-full bg-secondary"></div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">Laba Bersih</p>
            <div className="flex items-end justify-between">
              <h3 className="font-headline-md text-headline-md text-secondary font-tabular-nums text-tabular-nums">
                {formatCurrency(currentNetProfit)}
              </h3>
              <div className="flex items-center gap-1 text-success-positive bg-success-positive/10 px-2 py-0.5 rounded-full font-label-md text-[10px]">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {calcVariance(currentNetProfit, prevNetProfit).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Main Report Table */}
        <div className="bg-surface border border-border-subtle rounded-xl shadow-[0_4px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-border-subtle">
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant w-1/2">Keterangan</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant text-right">
                    Periode Berjalan<br />
                    <span className="font-normal text-outline text-[11px]">Jan - Des 2026</span>
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant text-right">
                    Periode Lalu<br />
                    <span className="font-normal text-outline text-[11px]">Jan - Des 2025</span>
                  </th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                {reportItems.map((item, index) => {
                  const isSectionHeader = item.isSectionHeader;
                  const isTotal = item.isTotal;
                  const indent = item.indent || (isSectionHeader ? 0 : isTotal ? 4 : 8);

                  if (isSectionHeader) {
                    return (
                      <tr key={index} className="bg-surface-container border-b border-border-subtle font-label-md">
                        <td className="py-2 px-4 text-primary uppercase" colSpan={4}>
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

                  return (
                    <tr
                      key={index}
                      className={`${isTotal ? 'bg-surface-muted border-b-2 border-border-subtle font-bold text-primary h-[40px]' : 'border-b border-border-subtle'} hover:bg-surface-container-low transition-colors`}
                    >
                      <td className="py-2 px-4" style={{ paddingLeft: `${indent + 16}px` }}>
                        {item.name}
                      </td>
                      <td className="py-2 px-4 text-right font-tabular-nums text-tabular-nums">
                        {valText(item.currentPeriod)}
                      </td>
                      <td className="py-2 px-4 text-right font-tabular-nums text-tabular-nums">
                        {valText(item.previousPeriod)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {item.variance !== undefined ? (
                          <span className={`font-tabular-nums text-tabular-nums font-semibold ${
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