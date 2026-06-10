'use client';

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency, reportCategories } from '@/data';
import type { PurchaseInvoice, SalesInvoice, BankAccount, Account } from '@/data/types';

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

export default function ReportsListPage() {
  const { salesInvoices, purchaseInvoices, bankAccounts, accounts, fixedAssets, showToast } = useApp();

  // Search & Category States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'financial' | 'operational' | 'tax'>('ALL');

  // Interactive Report Viewer State
  const [activePreviewReport, setActivePreviewReport] = useState<{ id: string; name: string } | null>(null);

  // Dynamic calculations for Bento Grid KPIs
  const kpiData = useMemo(() => {
    // 1. Net Profit Margin (NPM) YTD
    const newSales = salesInvoices.filter(inv => inv.id.length > 7);
    const newPurchases = purchaseInvoices.filter(inv => inv.id.length > 8);
    const newRevenueAmount = newSales.reduce((sum, inv) => sum + inv.dpp, 0);
    const newPurchaseAmount = newPurchases.reduce((sum, inv) => sum + inv.dpp, 0);

    const baseRevenue = 24500000000;
    const currentRevenueUsaha = baseRevenue + newRevenueAmount;
    const currentSalesReturn = -500000000;
    const currentNetRevenue = currentRevenueUsaha + currentSalesReturn;

    const currentBeginningInventory = 2000000000;
    const basePurchases = 8500000000;
    const currentPurchases = basePurchases + newPurchaseAmount;
    const currentEndingInventory = -1700000000;
    const currentCogs = -(currentBeginningInventory + currentPurchases + currentEndingInventory);

    const currentGrossProfit = currentNetRevenue + currentCogs;
    const currentTotalOperatingExpenses = -4660000000; // Salary + Rent + Utility + Admin + Marketing + Depreciation
    const currentOperatingIncome = currentGrossProfit + currentTotalOperatingExpenses;

    const currentInterestIncome = 150000000;
    const currentForexGain = 80000000;
    const currentInterestExpense = -350000000;

    const currentNetProfitBeforeTax = currentOperatingIncome + currentInterestIncome + currentForexGain + currentInterestExpense;
    const currentTaxExpense = -Math.round(currentNetProfitBeforeTax * 0.18846);
    const currentNetProfit = currentNetProfitBeforeTax + currentTaxExpense;

    const npm = currentNetRevenue > 0 ? (currentNetProfit / currentNetRevenue) * 100 : 0;

    // 2. Liquid Assets (Total Kas & Setara Kas)
    const liquidAssets = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

    // 3. Tax Obligations (PPN + PPh Badan)
    let ppnKeluaran = salesInvoices.reduce((sum, s) => sum + s.ppnAmount, 0);
    let ppnMasukan = purchaseInvoices.reduce((sum, p) => sum + p.ppnAmount, 0);
    const ppnPayable = Math.max(0, ppnKeluaran - ppnMasukan);
    const taxObligations = ppnPayable + Math.abs(currentTaxExpense);

    return {
      npm,
      liquidAssets,
      taxObligations,
      netProfit: currentNetProfit
    };
  }, [salesInvoices, purchaseInvoices, bankAccounts]);

  // Dynamic Data Compiler for Reports Viewer
  // 1. Balance Sheet compiler
  const balanceSheetItems = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    const items = accounts.map(acc => {
      let debit = 0;
      let credit = 0;
      const isAssetOrExpense = acc.type === 'ASSET' || acc.type === 'EXPENSE';
      if (isAssetOrExpense) {
        if (acc.balance >= 0) {
          debit = acc.balance;
        } else {
          credit = Math.abs(acc.balance);
        }
      } else {
        if (acc.balance >= 0) {
          credit = acc.balance;
        } else {
          debit = Math.abs(acc.balance);
        }
      }
      totalDebit += debit;
      totalCredit += credit;
      return { code: acc.code, name: acc.name, type: acc.type, debit, credit };
    });
    return { items, totalDebit, totalCredit };
  }, [accounts]);

  // 2. Cash Flow compiler
  const cashFlowItems = useMemo(() => {
    let customerReceipts = 0;
    let supplierPayments = 0;
    let operatingPayments = 0;
    let assetPurchase = 0;

    salesInvoices.forEach(inv => {
      if (inv.status === 'PAID') {
        customerReceipts += inv.grandTotal;
      }
    });

    purchaseInvoices.forEach(inv => {
      if (inv.status === 'PAID') {
        supplierPayments += inv.grandTotal;
      }
    });

    fixedAssets.forEach(asset => {
      if (asset.status === 'ACTIVE') {
        assetPurchase += asset.purchasePrice * 0.1; // Estimate purchase installments/outflow
      }
    });

    // Fallbacks
    if (customerReceipts === 0) customerReceipts = 5400000000;
    if (supplierPayments === 0) supplierPayments = 3200000000;
    operatingPayments = 1200000000;
    if (assetPurchase === 0) assetPurchase = 850000000;

    const netOperating = customerReceipts - supplierPayments - operatingPayments;
    const netInvesting = -assetPurchase;
    const netFinancing = 150000000; // Mock loan/capital
    const netIncrease = netOperating + netInvesting + netFinancing;
    const beginningCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0) - netIncrease;
    const endingCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

    return {
      customerReceipts,
      supplierPayments,
      operatingPayments,
      netOperating,
      assetPurchase,
      netInvesting,
      netFinancing,
      netIncrease,
      beginningCash,
      endingCash
    };
  }, [salesInvoices, purchaseInvoices, fixedAssets, bankAccounts]);

  // 3. PPN Recap compiler
  const ppnRecap = useMemo(() => {
    let ppnKeluaran = 0;
    let ppnMasukan = 0;
    let dppKeluaran = 0;
    let dppMasukan = 0;

    salesInvoices.forEach(inv => {
      dppKeluaran += inv.dpp;
      ppnKeluaran += inv.ppnAmount;
    });

    purchaseInvoices.forEach(inv => {
      dppMasukan += inv.dpp;
      ppnMasukan += inv.ppnAmount;
    });

    const netPpn = ppnKeluaran - ppnMasukan;
    return { dppKeluaran, ppnKeluaran, dppMasukan, ppnMasukan, netPpn };
  }, [salesInvoices, purchaseInvoices]);

  // 4. AR Aging compiler
  const arAgingItems = useMemo(() => {
    const today = new Date();
    const customerAging: { [name: string]: { name: string; current: number; warning: number; critical: number; total: number } } = {};

    salesInvoices.forEach(inv => {
      if (inv.status !== 'PAID') {
        const name = inv.customerName;
        if (!customerAging[name]) {
          customerAging[name] = { name, current: 0, warning: 0, critical: 0, total: 0 };
        }
        const invDate = parseInvoiceDate(inv.date);
        const diffTime = Math.abs(today.getTime() - invDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          customerAging[name].current += inv.grandTotal;
        } else if (diffDays <= 60) {
          customerAging[name].warning += inv.grandTotal;
        } else {
          customerAging[name].critical += inv.grandTotal;
        }
        customerAging[name].total += inv.grandTotal;
      }
    });

    return Object.values(customerAging);
  }, [salesInvoices]);

  // 5. Sales Ledger compiler
  const salesLedgerItems = useMemo(() => {
    return salesInvoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      customerName: inv.customerName,
      subtotal: inv.subtotal,
      discount: inv.discountTotal,
      dpp: inv.dpp,
      ppn: inv.ppnAmount,
      total: inv.grandTotal,
      status: inv.status
    }));
  }, [salesInvoices]);

  // 6. PPh 23 compiler
  const pph23Items = useMemo(() => {
    const list: { id: string; invoiceNumber: string; date: string; partnerName: string; description: string; dpp: number; taxRate: number; taxAmount: number }[] = [];
    purchaseInvoices.forEach((inv, idx) => {
      if (idx % 2 === 0) {
        const desc = inv.items[0]?.description || 'Jasa Konsultasi Operasional';
        const dpp = inv.dpp;
        list.push({
          id: `pph23-p-${inv.id}`,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          partnerName: inv.vendorName,
          description: desc,
          dpp,
          taxRate: 2,
          taxAmount: Math.round(dpp * 0.02)
        });
      }
    });
    return list;
  }, [purchaseInvoices]);

  // 7. Equalisasi Pendapatan compiler
  const equalizationData = useMemo(() => {
    let ppnDpp = 0;
    let nonPpnDpp = 0;
    salesInvoices.forEach(inv => {
      if (inv.hasTaxInvoice) {
        ppnDpp += inv.dpp;
      } else {
        nonPpnDpp += inv.dpp;
      }
    });
    const glRevenue = ppnDpp + nonPpnDpp;
    const ppnOutDpp = ppnDpp;
    const difference = glRevenue - ppnOutDpp;
    return { glRevenue, ppnOutDpp, nonPpnDpp, difference };
  }, [salesInvoices]);

  // 8. Laporan Rekonsiliasi Pembelian compiler
  const purchaseReconciliationItems = useMemo(() => {
    return purchaseInvoices.map(inv => {
      const paidAmount = inv.status === 'PAID' ? inv.grandTotal : 0;
      const outstanding = inv.grandTotal - paidAmount;
      return {
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        vendorName: inv.vendorName,
        grandTotal: inv.grandTotal,
        paidAmount,
        outstanding,
        status: inv.status
      };
    });
  }, [purchaseInvoices]);

  // Dynamic Excel/CSV Exporter inside preview modal
  const handleExportPreviewCSV = (reportId: string, reportName: string) => {
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportId) {
      case 'balance-sheet':
        headers = ['Kode Akun', 'Nama Akun', 'Tipe', 'Debit (Rp)', 'Kredit (Rp)'];
        rows = balanceSheetItems.items.map(acc => [
          acc.code,
          acc.name,
          acc.type,
          acc.debit.toString(),
          acc.credit.toString()
        ]);
        rows.push(['TOTAL', '', '', balanceSheetItems.totalDebit.toString(), balanceSheetItems.totalCredit.toString()]);
        break;
      case 'cash-flow':
        headers = ['Keterangan', 'Jumlah (Rp)'];
        rows = [
          ['Arus Kas dari Aktivitas Operasi', ''],
          ['  Penerimaan Kas dari Pelanggan', cashFlowItems.customerReceipts.toString()],
          ['  Pembayaran Kas kepada Pemasok/Vendor', `-${cashFlowItems.supplierPayments.toString()}`],
          ['  Pembayaran Kas untuk Beban Operasional', `-${cashFlowItems.operatingPayments.toString()}`],
          ['Arus Kas Bersih dari Aktivitas Operasi', cashFlowItems.netOperating.toString()],
          ['', ''],
          ['Arus Kas dari Aktivitas Investasi', ''],
          ['  Perolehan Aset Tetap', `-${cashFlowItems.assetPurchase.toString()}`],
          ['Arus Kas Bersih dari Aktivitas Investasi', `-${cashFlowItems.assetPurchase.toString()}`],
          ['', ''],
          ['Arus Kas dari Aktivitas Pendanaan', ''],
          ['  Setoran Modal / Pinjaman', cashFlowItems.netFinancing.toString()],
          ['Arus Kas Bersih dari Aktivitas Pendanaan', cashFlowItems.netFinancing.toString()],
          ['', ''],
          ['Kenaikan (Penurunan) Bersih Kas', cashFlowItems.netIncrease.toString()],
          ['Kas pada Awal Periode', cashFlowItems.beginningCash.toString()],
          ['Kas pada Akhir Periode', cashFlowItems.endingCash.toString()]
        ];
        break;
      case 'ppn-recap':
        headers = ['Kategori Pajak', 'Dasar Pengenaan Pajak (DPP)', 'PPN Terutang'];
        rows = [
          ['PPN Keluaran (Penjualan)', ppnRecap.dppKeluaran.toString(), ppnRecap.ppnKeluaran.toString()],
          ['PPN Masukan (Pembelian)', ppnRecap.dppMasukan.toString(), ppnRecap.ppnMasukan.toString()],
          ['PPN Kurang/Lebih Bayar Neto', '', ppnRecap.netPpn.toString()]
        ];
        break;
      case 'ar-aging':
        headers = ['Nama Pelanggan', 'Lancar (0-30 Hari)', 'Peringatan (31-60 Hari)', 'Jatuh Tempo (>60 Hari)', 'Total Piutang'];
        rows = arAgingItems.map(c => [
          c.name,
          c.current.toString(),
          c.warning.toString(),
          c.critical.toString(),
          c.total.toString()
        ]);
        break;
      case 'sales-ledger':
        headers = ['No. Faktur', 'Tanggal', 'Pelanggan', 'Subtotal', 'Diskon', 'DPP', 'PPN', 'Total Tagihan', 'Status'];
        rows = salesLedgerItems.map(s => [
          s.invoiceNumber,
          s.date,
          s.customerName,
          s.subtotal.toString(),
          s.discount.toString(),
          s.dpp.toString(),
          s.ppn.toString(),
          s.total.toString(),
          s.status
        ]);
        break;
      case 'pph-23':
        headers = ['No. Faktur', 'Tanggal', 'Nama Rekanan', 'Deskripsi Jasa', 'DPP (Rp)', 'Tarif PPh 23', 'Potongan Pajak (Rp)'];
        rows = pph23Items.map(p => [
          p.invoiceNumber,
          p.date,
          p.partnerName,
          p.description,
          p.dpp.toString(),
          `${p.taxRate}%`,
          p.taxAmount.toString()
        ]);
        break;
      case 'equalization':
        headers = ['Keterangan', 'Nilai (Rp)'];
        rows = [
          ['Total Pendapatan Buku Besar (GL)', equalizationData.glRevenue.toString()],
          ['Dasar Pengenaan Pajak (DPP) PPN Keluaran', equalizationData.ppnOutDpp.toString()],
          ['Pendapatan Non-PPN (Bebas/Pending)', equalizationData.nonPpnDpp.toString()],
          ['Selisih Rekonsiliasi (Selisih GL vs PPN)', equalizationData.difference.toString()]
        ];
        break;
      case 'purchase-reconciliation':
        headers = ['No. Faktur', 'Tanggal', 'Vendor/Supplier', 'Total Tagihan (Rp)', 'Total Terbayar (Rp)', 'Sisa Utang (Rp)', 'Status'];
        rows = purchaseReconciliationItems.map(p => [
          p.invoiceNumber,
          p.date,
          p.vendorName,
          p.grandTotal.toString(),
          p.paidAmount.toString(),
          p.outstanding.toString(),
          p.status
        ]);
        break;
      default:
        showToast('Format ekspor belum didukung untuk laporan ini.', 'warning');
        return;
    }

    const filename = `${reportId.replace('-', '_')}_report_${new Date().toISOString().split('T')[0]}.csv`;
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

  // Filtered reports categories based on search input and tabs
  const filteredCategories = useMemo(() => {
    return reportCategories
      .map(cat => {
        const reports = cat.reports.filter(r => 
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return { ...cat, reports };
      })
      .filter(cat => {
        const matchesCategory = selectedCategory === 'ALL' || cat.id === selectedCategory;
        const hasReports = cat.reports.length > 0;
        return matchesCategory && hasReports;
      });
  }, [searchQuery, selectedCategory]);

  const getCategoryGradient = (color: string) => {
    switch (color) {
      case 'primary': // financial
        return 'bg-gradient-to-br from-indigo-500/5 via-white/70 to-transparent dark:from-indigo-500/15 dark:to-transparent';
      case 'secondary': // operational
        return 'bg-gradient-to-br from-teal-500/5 via-white/70 to-transparent dark:from-teal-500/15 dark:to-transparent';
      case 'danger': // tax
        return 'bg-gradient-to-br from-amber-500/5 via-white/70 to-transparent dark:from-amber-500/15 dark:to-transparent';
      default:
        return 'bg-surface-muted/30';
    }
  };

  const getIconContainerStyle = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30';
      case 'secondary':
        return 'bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-100 dark:border-teal-500/30';
      case 'danger':
        return 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-100 dark:border-amber-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Page Header */}
        <PageHeader
          title="Direktori Laporan Keuangan"
          description="Akses, tinjau, dan ekspor laporan performa fiskal, umur piutang/utang, serta kepatuhan perpajakan badan Anda."
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                icon="print"
                onClick={() => window.print()}
              >
                Cetak Halaman
              </Button>
              <Button 
                icon="calendar_today"
                className="bg-gradient-secondary-premium hover:shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-white"
              >
                Periode Fiskal: Des 2026
              </Button>
            </div>
          }
        />

        {/* Bento Grid KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: NPM */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-primary relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-primary/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">insights</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80 font-bold">Net Profit Margin (NPM) YTD</p>
            <p className="text-xl font-bold tracking-tight text-on-surface font-tabular-nums">
              {kpiData.npm.toFixed(2)}%
            </p>
            <span className="text-[10px] text-on-surface-variant/65 block mt-1 font-medium">
              Laba Bersih YTD: {formatCurrency(kpiData.netProfit)}
            </span>
          </div>

          {/* Card 2: Liquid Assets */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-success-positive relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-success-positive/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">account_balance_wallet</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80 font-bold">Total Aset Likuid (Kas/Bank)</p>
            <p className="text-xl font-bold tracking-tight text-success-positive font-tabular-nums">
              {formatCurrency(kpiData.liquidAssets)}
            </p>
            <span className="text-[10px] text-success-positive font-medium block mt-1">
              Dari {bankAccounts.length} akun bank & kas aktif
            </span>
          </div>

          {/* Card 3: Tax Obligations */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-danger-liability relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-danger-liability/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">gavel</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80 font-bold">Kewajiban Pajak YTD (Est.)</p>
            <p className="text-xl font-bold tracking-tight text-danger-liability font-tabular-nums">
              {formatCurrency(kpiData.taxObligations)}
            </p>
            <span className="text-[10px] text-danger-liability font-semibold block mt-1">
              Termasuk PPN & PPh Badan berjalan
            </span>
          </div>

          {/* Card 4: Current Ratio */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-secondary relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="absolute right-2 bottom-2 text-secondary/5 pointer-events-none transform group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[65px]">balance</span>
            </div>
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80 font-bold">Rasio Lancar (Liquidity)</p>
            <p className="text-xl font-bold tracking-tight text-secondary font-tabular-nums">
              2.48x
            </p>
            <span className="text-[10px] text-secondary font-medium block mt-1">
              Batas Aman Finansial Standard DJP (&gt; 1.5x)
            </span>
          </div>
        </div>

        {/* Double Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Reports Directory & Filters */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Table Header Controls */}
            <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-muted/20 border border-border-subtle/50">
              {/* Toggle Category Tabs */}
              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                    selectedCategory === 'ALL'
                      ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                      : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setSelectedCategory('financial')}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                    selectedCategory === 'financial'
                      ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                      : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                  }`}
                >
                  Keuangan
                </button>
                <button
                  onClick={() => setSelectedCategory('operational')}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                    selectedCategory === 'operational'
                      ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                      : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                  }`}
                >
                  Operasional
                </button>
                <button
                  onClick={() => setSelectedCategory('tax')}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all border ${
                    selectedCategory === 'tax'
                      ? 'bg-primary/10 border-primary/45 ring-1 ring-primary/15 text-primary'
                      : 'bg-surface-container-low hover:bg-surface border-border-subtle text-on-surface-variant'
                  }`}
                >
                  Perpajakan
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[16px]">search</span>
                <input
                  className="w-full pl-9 pr-4 py-1.5 border border-border-subtle focus:border-secondary/40 focus:ring-1 focus:ring-secondary/20 rounded-xl font-body-sm text-xs bg-surface-container-low text-on-surface outline-none"
                  placeholder="Cari laporan..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Reports List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col h-full shadow-sm hover:border-secondary-container/20 transition-all duration-300 border border-border-subtle/50"
                >
                  {/* Category Header */}
                  <div className={`p-5 border-b border-border-subtle/50 flex items-start gap-3.5 ${getCategoryGradient(category.color)}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${getIconContainerStyle(category.color)}`}>
                      <span className="material-symbols-outlined font-bold text-[20px]">
                        {category.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold mb-0.5">{category.name}</h3>
                      <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                        {category.id === 'financial' && 'Performa finansial komprehensif, neraca saldo, dan arus kas.'}
                        {category.id === 'operational' && 'Analisis komersial piutang berjalan & rekonsiliasi pembelian.'}
                        {category.id === 'tax' && 'Daftar rekapitulasi PPN & bukti potong standar DJP.'}
                      </p>
                    </div>
                  </div>

                  {/* Report Items */}
                  <div className="p-0 flex-1 flex flex-col divide-y divide-border-subtle/20 bg-white/20 dark:bg-black/5">
                    {category.reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-3.5 hover:bg-primary/[0.02] dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between group cursor-pointer"
                        onClick={() => {
                          if (report.id === 'laba-rugi') {
                            window.location.href = '/reports/laba-rugi';
                          } else {
                            setActivePreviewReport({ id: report.id, name: report.name });
                          }
                        }}
                      >
                        <div className="pr-3 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="text-[11.5px] text-primary dark:text-secondary-container font-bold group-hover:text-secondary group-hover:underline transition-all">
                              {report.name}
                            </h4>
                            {report.isPremium && (
                              <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary dark:text-secondary-container text-[8px] rounded-full uppercase font-bold tracking-wider">Premium</span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-on-surface-variant leading-relaxed line-clamp-2">{report.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              if (report.id === 'laba-rugi') {
                                window.location.href = '/reports/laba-rugi';
                              } else {
                                setActivePreviewReport({ id: report.id, name: report.name });
                              }
                            }}
                            className="w-7 h-7 rounded-lg border border-border-subtle/70 bg-white/95 dark:bg-black/35 flex items-center justify-center text-primary dark:text-secondary-container hover:bg-primary/10 dark:hover:bg-white/10 hover:shadow-sm cursor-pointer transition-all" 
                            title="Lihat Pratinjau Laporan"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </button>
                          <button 
                            onClick={() => handleExportPreviewCSV(report.id, report.name)}
                            className="w-7 h-7 rounded-lg bg-gradient-secondary-premium text-white flex items-center justify-center hover:shadow-lg hover:shadow-secondary/20 cursor-pointer transition-all" 
                            title="Ekspor CSV"
                          >
                            <span className="material-symbols-outlined text-[15px]">table_view</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Right Panel: Side Status & Activity Logs */}
          <div className="space-y-6">
            
            {/* Card 1: Status Tutup Buku & Fiskal */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-primary hover:border-primary-container/20 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3.5 border-b border-border-subtle/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                    <h3 className="font-bold text-primary dark:text-secondary-container text-xs uppercase tracking-wider">Status Tahun Buku</h3>
                  </div>
                  <span className="text-[10px] font-bold text-success-positive bg-success-positive/10 px-2 py-0.5 rounded uppercase tracking-wider">Aktif</span>
                </div>
                
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Tahun Fiskal</span>
                    <span className="font-bold text-on-surface">Desember 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Status Audit</span>
                    <span className="font-bold text-warning-deadline">Unaudited (Dalam Proses)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Batas SPT PPh Badan</span>
                    <span className="font-bold text-on-surface">30 April 2027</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border-subtle/30 space-y-2.5">
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Checklist Tutup Buku Bulanan</p>
                  
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-success-positive text-[16px]">check_circle</span>
                    <span>Depresiasi Aset Tetap: <strong className="text-on-surface">Selesai</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-success-positive text-[16px]">check_circle</span>
                    <span>Rekonsiliasi Bank: <strong className="text-on-surface">Selesai</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-success-positive text-[16px]">check_circle</span>
                    <span>Pencatatan PPN Terutang: <strong className="text-on-surface">Selesai</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Aktivitas Pelaporan Terakhir */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-l-secondary hover:border-secondary-container/20 transition-all">
              <div className="flex items-center gap-2 mb-3.5 border-b border-border-subtle/40 pb-2">
                <span className="material-symbols-outlined text-secondary">history</span>
                <h3 className="font-bold text-primary dark:text-secondary-container text-xs uppercase tracking-wider">Mutasi Pelaporan Terakhir</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3 text-xs leading-tight">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">download_done</span>
                  <div>
                    <p className="text-on-surface font-semibold">Heni (Admin) mengunduh Laba Rugi YTD</p>
                    <span className="text-[10px] text-outline">10 menit yang lalu &bull; PDF</span>
                  </div>
                </div>

                <div className="flex gap-3 text-xs leading-tight">
                  <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">visibility</span>
                  <div>
                    <p className="text-on-surface font-semibold">Reza (Akuntan) membuka Neraca Saldo</p>
                    <span className="text-[10px] text-outline">45 menit yang lalu &bull; Portal</span>
                  </div>
                </div>

                <div className="flex gap-3 text-xs leading-tight">
                  <span className="material-symbols-outlined text-success-positive text-[18px] mt-0.5">post_add</span>
                  <div>
                    <p className="text-on-surface font-semibold">Sistem membukukan beban depresiasi bulanan</p>
                    <span className="text-[10px] text-outline">2 jam yang lalu &bull; General Ledger</span>
                  </div>
                </div>

                <div className="flex gap-3 text-xs leading-tight">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">table_view</span>
                  <div>
                    <p className="text-on-surface font-semibold">Heni (Admin) mengekspor Rekap SPT PPN</p>
                    <span className="text-[10px] text-outline">4 jam yang lalu &bull; CSV/Excel</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Interactive Report Viewer Modal */}
      {activePreviewReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-surface border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-scale-up text-xs">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">analytics</span>
                <div>
                  <h3 className="font-bold text-primary dark:text-secondary-container">
                    Pratinjau Dokumen Keuangan
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest font-tabular-nums">
                    Laporan: {activePreviewReport.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActivePreviewReport(null)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body - Digital Paper Layout */}
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-border-subtle/50 rounded-xl relative shadow-inner">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
              
              {/* Official Letterhead */}
              <div className="text-center mb-6 border-b border-border-subtle/50 dark:border-white/10 pb-4">
                <h2 className="text-md font-bold tracking-widest text-primary dark:text-secondary-container uppercase">PT FinCorp Indonesia Tbk</h2>
                <h1 className="text-sm font-bold text-on-surface mt-0.5 uppercase tracking-wide">{activePreviewReport.name}</h1>
                <p className="text-[10px] text-on-surface-variant mt-1">Periode Akhir: 31 Desember 2026</p>
                <p className="text-[9px] text-outline mt-1 italic">(Disajikan dalam Rupiah - Live Data System)</p>
              </div>

              {/* Dynamic Report Table Rendering */}
              <div className="overflow-x-auto">
                
                {/* 1. Neraca Saldo (Balance Sheet) Table */}
                {activePreviewReport.id === 'balance-sheet' && (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold w-1/4">Kode Akun</th>
                        <th className="py-2 px-3 font-semibold w-2/5">Nama Akun</th>
                        <th className="py-2 px-3 font-semibold text-right w-1/6">Debit (Rp)</th>
                        <th className="py-2 px-3 font-semibold text-right w-1/6">Kredit (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="font-tabular-nums divide-y divide-border-subtle/10 text-on-surface">
                      {balanceSheetItems.items.map((acc) => (
                        <tr key={acc.code} className="hover:bg-primary/[0.01] transition-colors">
                          <td className="py-1.5 px-3 font-semibold">{acc.code}</td>
                          <td className="py-1.5 px-3">{acc.name}</td>
                          <td className="py-1.5 px-3 text-right">{acc.debit > 0 ? formatCurrency(acc.debit).replace('Rp ', '') : '-'}</td>
                          <td className="py-1.5 px-3 text-right">{acc.credit > 0 ? formatCurrency(acc.credit).replace('Rp ', '') : '-'}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-black/20 font-bold border-t-2 border-b-4 border-double border-t-on-surface/20 border-b-on-surface/30">
                        <td className="py-2 px-3" colSpan={2}>TOTAL NERACA</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(balanceSheetItems.totalDebit).replace('Rp ', '')}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(balanceSheetItems.totalCredit).replace('Rp ', '')}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* 2. Arus Kas (Cash Flow) Table */}
                {activePreviewReport.id === 'cash-flow' && (
                  <table className="w-full text-left border-collapse min-w-[450px]">
                    <tbody className="font-tabular-nums text-on-surface divide-y divide-border-subtle/10">
                      <tr className="font-bold text-primary dark:text-secondary-container uppercase text-[10px] bg-slate-50 dark:bg-black/15">
                        <td className="py-2 px-3" colSpan={2}>Arus Kas dari Aktivitas Operasi</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-6">Penerimaan Kas dari Pelanggan</td>
                        <td className="py-1.5 px-3 text-right text-success-positive font-semibold">+{formatCurrency(cashFlowItems.customerReceipts).replace('Rp ', '')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-6">Pembayaran Kas kepada Pemasok/Vendor</td>
                        <td className="py-1.5 px-3 text-right text-danger-liability">-{formatCurrency(cashFlowItems.supplierPayments).replace('Rp ', '')}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-6">Pembayaran Kas untuk Beban Operasional</td>
                        <td className="py-1.5 px-3 text-right text-danger-liability">-{formatCurrency(cashFlowItems.operatingPayments).replace('Rp ', '')}</td>
                      </tr>
                      <tr className="font-semibold bg-slate-50/50 dark:bg-black/5">
                        <td className="py-1.5 px-3 font-semibold">Arus Kas Bersih dari Aktivitas Operasi</td>
                        <td className="py-1.5 px-3 text-right font-bold">{formatCurrency(cashFlowItems.netOperating).replace('Rp ', '')}</td>
                      </tr>

                      <tr className="font-bold text-primary dark:text-secondary-container uppercase text-[10px] bg-slate-50 dark:bg-black/15 border-t">
                        <td className="py-2 px-3" colSpan={2}>Arus Kas dari Aktivitas Investasi</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-6">Perolehan Aset Tetap</td>
                        <td className="py-1.5 px-3 text-right text-danger-liability">-{formatCurrency(cashFlowItems.assetPurchase).replace('Rp ', '')}</td>
                      </tr>
                      <tr className="font-semibold bg-slate-50/50 dark:bg-black/5">
                        <td className="py-1.5 px-3 font-semibold">Arus Kas Bersih dari Aktivitas Investasi</td>
                        <td className="py-1.5 px-3 text-right font-bold text-danger-liability">-{formatCurrency(cashFlowItems.assetPurchase).replace('Rp ', '')}</td>
                      </tr>

                      <tr className="font-bold text-primary dark:text-secondary-container uppercase text-[10px] bg-slate-50 dark:bg-black/15 border-t">
                        <td className="py-2 px-3" colSpan={2}>Arus Kas dari Aktivitas Pendanaan</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-6">Setoran Modal / Penerimaan Pinjaman</td>
                        <td className="py-1.5 px-3 text-right text-success-positive font-semibold">+{formatCurrency(cashFlowItems.netFinancing).replace('Rp ', '')}</td>
                      </tr>
                      <tr className="font-semibold bg-slate-50/50 dark:bg-black/5">
                        <td className="py-1.5 px-3 font-semibold">Arus Kas Bersih dari Aktivitas Pendanaan</td>
                        <td className="py-1.5 px-3 text-right font-bold">{formatCurrency(cashFlowItems.netFinancing).replace('Rp ', '')}</td>
                      </tr>

                      <tr className="bg-slate-50 dark:bg-black/20 font-bold border-t-2 border-b-4 border-double border-t-on-surface/20 border-b-on-surface/30">
                        <td className="py-2 px-3 text-primary dark:text-secondary-container">Kenaikan (Penurunan) Bersih Kas</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(cashFlowItems.netIncrease).replace('Rp ', '')}</td>
                      </tr>
                      <tr className="font-medium">
                        <td className="py-1.5 px-3">Kas pada Awal Periode</td>
                        <td className="py-1.5 px-3 text-right text-on-surface-variant font-bold">{formatCurrency(cashFlowItems.beginningCash).replace('Rp ', '')}</td>
                      </tr>
                      <tr className="font-bold bg-success-positive/10 text-success-positive h-[35px] border-b-2">
                        <td className="py-1.5 px-3">KAS PADA AKHIR PERIODE</td>
                        <td className="py-1.5 px-3 text-right text-success-positive font-bold">{formatCurrency(cashFlowItems.endingCash).replace('Rp ', '')}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* 3. PPN Recap Table */}
                {activePreviewReport.id === 'ppn-recap' && (
                  <table className="w-full text-left border-collapse min-w-[400px]">
                    <thead>
                      <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold">Kategori Faktur Pajak</th>
                        <th className="py-2 px-3 font-semibold text-right">Dasar Pengenaan Pajak (DPP)</th>
                        <th className="py-2 px-3 font-semibold text-right">PPN Terutang (11%)</th>
                      </tr>
                    </thead>
                    <tbody className="font-tabular-nums text-on-surface divide-y divide-border-subtle/10">
                      <tr>
                        <td className="py-2 px-3 font-semibold text-primary">PPN Keluaran (Penjualan Faktur Pajak)</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(ppnRecap.dppKeluaran).replace('Rp ', '')}</td>
                        <td className="py-2 px-3 text-right font-bold text-primary">{formatCurrency(ppnRecap.ppnKeluaran).replace('Rp ', '')}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold text-secondary">PPN Masukan (Pembelian yang dapat dikreditkan)</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(ppnRecap.dppMasukan).replace('Rp ', '')}</td>
                        <td className="py-2 px-3 text-right font-bold text-secondary">{formatCurrency(ppnRecap.ppnMasukan).replace('Rp ', '')}</td>
                      </tr>
                      <tr className={`font-bold h-10 border-t-2 border-b-4 border-double ${
                        ppnRecap.netPpn >= 0 ? 'bg-danger-liability/10 text-danger-liability' : 'bg-success-positive/10 text-success-positive'
                      }`}>
                        <td className="py-2 px-3">PPN KURANG/(LEBIH) BAYAR NETO</td>
                        <td className="py-2 px-3 text-right">-</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(ppnRecap.netPpn).replace('Rp ', '')}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* 4. AR Aging Table */}
                {activePreviewReport.id === 'ar-aging' && (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold">Nama Pelanggan</th>
                        <th className="py-2 px-3 font-semibold text-right">Lancar (0-30 Hari)</th>
                        <th className="py-2 px-3 font-semibold text-right">Peringatan (31-60 Hari)</th>
                        <th className="py-2 px-3 font-semibold text-right">Jatuh Tempo (&gt;60 Hari)</th>
                        <th className="py-2 px-3 font-semibold text-right">Total Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="font-tabular-nums text-on-surface divide-y divide-border-subtle/10">
                      {arAgingItems.map((c) => (
                        <tr key={c.name} className="hover:bg-primary/[0.01] transition-colors">
                          <td className="py-2 px-3 font-semibold">{c.name}</td>
                          <td className="py-2 px-3 text-right text-success-positive">{formatCurrency(c.current).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-right text-warning-deadline">{formatCurrency(c.warning).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-right text-danger-liability">{formatCurrency(c.critical).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-right font-bold">{formatCurrency(c.total).replace('Rp ', '')}</td>
                        </tr>
                      ))}
                      {arAgingItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center italic text-on-surface-variant">Tidak ada piutang outstanding.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* 5. Sales Ledger Table */}
                {activePreviewReport.id === 'sales-ledger' && (
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold">No. Faktur</th>
                        <th className="py-2 px-3 font-semibold">Tanggal</th>
                        <th className="py-2 px-3 font-semibold">Pelanggan</th>
                        <th className="py-2 px-3 font-semibold text-right">DPP (Rp)</th>
                        <th className="py-2 px-3 font-semibold text-right">PPN (Rp)</th>
                        <th className="py-2 px-3 font-semibold text-right">Grand Total</th>
                        <th className="py-2 px-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="font-tabular-nums text-on-surface divide-y divide-border-subtle/10">
                      {salesLedgerItems.map((s) => (
                        <tr key={s.invoiceNumber} className="hover:bg-primary/[0.01] transition-colors">
                          <td className="py-2 px-3 font-semibold text-primary">{s.invoiceNumber}</td>
                          <td className="py-2 px-3 text-on-surface-variant">{s.date}</td>
                          <td className="py-2 px-3 font-semibold">{s.customerName}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(s.dpp).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-right text-on-surface-variant">{formatCurrency(s.ppn).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-right font-bold">{formatCurrency(s.total).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.status === 'PAID' ? 'bg-success-positive/10 text-success-positive' : 'bg-warning-deadline/10 text-warning-deadline'
                            }`}>{s.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 6. PPh 23 Table */}
                {activePreviewReport.id === 'pph-23' && (
                  <table className="w-full text-left border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold">No. Invoice</th>
                        <th className="py-2 px-3 font-semibold">Tanggal</th>
                        <th className="py-2 px-3 font-semibold">Nama Rekanan</th>
                        <th className="py-2 px-3 font-semibold">Objek Jasa / Sewa</th>
                        <th className="py-2 px-3 font-semibold text-right">DPP (Rp)</th>
                        <th className="py-2 px-3 font-semibold text-center">Tarif</th>
                        <th className="py-2 px-3 font-semibold text-right">Potongan PPh 23</th>
                      </tr>
                    </thead>
                    <tbody className="font-tabular-nums text-on-surface divide-y divide-border-subtle/10">
                      {pph23Items.map((p) => (
                        <tr key={p.id} className="hover:bg-primary/[0.01] transition-colors">
                          <td className="py-2 px-3 font-semibold text-primary">{p.invoiceNumber}</td>
                          <td className="py-2 px-3 text-on-surface-variant">{p.date}</td>
                          <td className="py-2 px-3 font-semibold">{p.partnerName}</td>
                          <td className="py-2 px-3 text-on-surface-variant">{p.description}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(p.dpp).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-center font-bold">{p.taxRate}%</td>
                          <td className="py-2 px-3 text-right font-bold text-danger-liability">{formatCurrency(p.taxAmount).replace('Rp ', '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 7. Equalisasi Pendapatan Table */}
                {activePreviewReport.id === 'equalization' && (
                  <table className="w-full text-left border-collapse min-w-[450px]">
                    <thead>
                      <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold w-3/5">Indikator Komparasi Fiskal</th>
                        <th className="py-2 px-3 font-semibold text-right w-2/5">Nilai Buku (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="font-tabular-nums text-on-surface divide-y divide-border-subtle/10">
                      <tr>
                        <td className="py-2 px-3 font-semibold">Total Pendapatan pada Buku Besar (GL)</td>
                        <td className="py-2 px-3 text-right font-bold text-primary">{formatCurrency(equalizationData.glRevenue).replace('Rp ', '')}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Dasar Pengenaan Pajak (DPP) PPN Keluaran (e-Faktur)</td>
                        <td className="py-2 px-3 text-right font-bold text-secondary">{formatCurrency(equalizationData.ppnOutDpp).replace('Rp ', '')}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Pendapatan Non-PPN / Dibebaskan Pajak / Pending Faktur</td>
                        <td className="py-2 px-3 text-right text-on-surface-variant">{formatCurrency(equalizationData.nonPpnDpp).replace('Rp ', '')}</td>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-black/20 font-bold border-t-2 border-b-4 border-double border-t-on-surface/20 border-b-on-surface/30 h-10">
                        <td className="py-2 px-3">SELISIH REKONSILIASI EQUALISASI (GL vs PPN)</td>
                        <td className="py-2 px-3 text-right text-success-positive">{formatCurrency(equalizationData.difference).replace('Rp ', '')}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* 8. Laporan Rekonsiliasi Pembelian Table */}
                {activePreviewReport.id === 'purchase-reconciliation' && (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-on-surface/20 text-on-surface-variant font-label-md text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold">No. Faktur</th>
                        <th className="py-2 px-3 font-semibold">Tanggal</th>
                        <th className="py-2 px-3 font-semibold">Vendor / Supplier</th>
                        <th className="py-2 px-3 font-semibold text-right">Nilai Tagihan (Rp)</th>
                        <th className="py-2 px-3 font-semibold text-right">Terbayar Kas (Rp)</th>
                        <th className="py-2 px-3 font-semibold text-right">Sisa Utang (Rp)</th>
                        <th className="py-2 px-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="font-tabular-nums text-on-surface divide-y divide-border-subtle/10">
                      {purchaseReconciliationItems.map((p) => (
                        <tr key={p.invoiceNumber} className="hover:bg-primary/[0.01] transition-colors">
                          <td className="py-2 px-3 font-semibold text-primary">{p.invoiceNumber}</td>
                          <td className="py-2 px-3 text-on-surface-variant">{p.date}</td>
                          <td className="py-2 px-3 font-semibold">{p.vendorName}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(p.grandTotal).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-right text-success-positive">{formatCurrency(p.paidAmount).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-right text-danger-liability font-semibold">{formatCurrency(p.outstanding).replace('Rp ', '')}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'PAID' ? 'bg-success-positive/10 text-success-positive' : 'bg-warning-deadline/10 text-warning-deadline'
                            }`}>{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center border-t border-border-subtle/40 pt-4 mt-2 shrink-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon="table_view"
                  onClick={() => handleExportPreviewCSV(activePreviewReport.id, activePreviewReport.name)}
                >
                  Ekspor Excel / CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon="print"
                  onClick={() => window.print()}
                >
                  Cetak PDF
                </Button>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActivePreviewReport(null)}
              >
                Tutup Pratinjau
              </Button>
            </div>

          </div>
        </div>
      )}

    </Layout>
  );
}