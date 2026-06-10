'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';
import type { Account, SalesInvoice, PurchaseInvoice, CashTransaction } from '@/data/types';

// Robust Indonesian Date Parser
const parseTxDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  const months: Record<string, number> = {
    jan: 0, peb: 1, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, ags: 7, aug: 7, sep: 8, okt: 9, nov: 10, des: 11, dec: 11
  };
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase().slice(0, 3);
    const year = parseInt(parts[2], 10);
    const month = months[monthStr] !== undefined ? months[monthStr] : 0;
    if (!isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return new Date();
};

// Format Date to standard YYYY-MM-DD
const formatDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

// Format Date for Display (e.g., "24 Okt 2023")
const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d = parseTxDate(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Interface for complied ledger line items
interface LedgerLine {
  id: string;
  date: string;
  parsedDate: Date;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  sourceType: 'SALES' | 'PURCHASE' | 'CASH' | 'DEPRECIATION' | 'OTHER';
  sourceObj: any; // Raw object for detail drill-down modal
}

export default function LedgerPage() {
  const {
    accounts,
    recentTransactions,
    salesInvoices,
    purchaseInvoices,
    bankAccounts,
  } = useApp();

  // Selected State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-1-1-1-1-2'); // Default to Bank BCA Utama
  const [startDate, setStartDate] = useState<string>('2023-01-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');
  
  // Popover State
  const [isAccountPopoverOpen, setIsAccountPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Drill-down Modal State
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<LedgerLine | null>(null);

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsAccountPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected Account details
  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // Tree classification colors helper
  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ASSET: 'Aset',
      LIABILITY: 'Liabilitas',
      EQUITY: 'Ekuitas',
      REVENUE: 'Pendapatan',
      EXPENSE: 'Beban',
    };
    return labels[type] || type;
  };

  // Compile ALL possible transactions for the active account
  const allLedgerLines = useMemo((): LedgerLine[] => {
    if (!activeAccount) return [];

    const lines: LedgerLine[] = [];
    const code = activeAccount.code;
    const isAssetOrExpense = activeAccount.type === 'ASSET' || activeAccount.type === 'EXPENSE';

    // 1. CASH / BANK accounts mapping (code 111xxx)
    if (code.startsWith('111')) {
      const coaAccountId = activeAccount.id;
      recentTransactions.forEach(tx => {
        // Match bank id logic
        let isMatch = tx.accountId === coaAccountId;
        if (!isMatch) {
          if (coaAccountId === 'acc-1-1-1-1-1' && tx.accountId === 'bank-001') isMatch = true;
          if (coaAccountId === 'acc-1-1-1-1-2' && tx.accountId === 'bank-002') isMatch = true;
          if (coaAccountId === 'acc-1-1-1-1-3' && tx.accountId === 'bank-003') isMatch = true;
          if (coaAccountId === 'acc-1-1-1-1-4' && tx.accountId === 'bank-004') isMatch = true;
        }

        if (isMatch) {
          lines.push({
            id: tx.id,
            date: formatDateISO(parseTxDate(tx.date)),
            parsedDate: parseTxDate(tx.date),
            referenceNumber: tx.id.startsWith('tx-') ? tx.id.toUpperCase() : `TX-${tx.id.toUpperCase()}`,
            description: tx.description,
            debit: tx.type === 'IN' ? tx.amount : 0,
            credit: tx.type === 'OUT' ? tx.amount : 0,
            sourceType: 'CASH',
            sourceObj: tx
          });
        }
      });
    }

    // 2. RECEIVABLES (code starts with 112)
    else if (code.startsWith('112')) {
      // Debits from Sales Invoices (since they are created as receivable invoices)
      salesInvoices.forEach(inv => {
        lines.push({
          id: inv.id,
          date: inv.date,
          parsedDate: parseTxDate(inv.date),
          referenceNumber: inv.invoiceNumber,
          description: `Faktur Penjualan Kredit - ${inv.customerName}`,
          debit: inv.grandTotal,
          credit: 0,
          sourceType: 'SALES',
          sourceObj: inv
        });
      });

      // Credits from Cash Inflows allocated to Piutang Usaha
      recentTransactions.forEach(tx => {
        if (tx.category === 'Piutang Usaha' && tx.type === 'IN') {
          lines.push({
            id: tx.id,
            date: formatDateISO(parseTxDate(tx.date)),
            parsedDate: parseTxDate(tx.date),
            referenceNumber: tx.id.startsWith('tx-') ? tx.id.toUpperCase() : `TX-${tx.id.toUpperCase()}`,
            description: `Pelunasan Piutang: ${tx.description}`,
            debit: 0,
            credit: tx.amount,
            sourceType: 'CASH',
            sourceObj: tx
          });
        }
      });
    }

    // 3. PAYABLES (code starts with 211)
    else if (code.startsWith('211')) {
      // Credits from Purchase Invoices (since we owe suppliers upon invoice receipt)
      purchaseInvoices.forEach(inv => {
        lines.push({
          id: inv.id,
          date: inv.date,
          parsedDate: parseTxDate(inv.date),
          referenceNumber: inv.invoiceNumber,
          description: `Faktur Pembelian Kredit - ${inv.vendorName}`,
          debit: 0,
          credit: inv.grandTotal,
          sourceType: 'PURCHASE',
          sourceObj: inv
        });
      });

      // Debits from Cash Outflows allocated to Hutang Usaha
      recentTransactions.forEach(tx => {
        if (tx.category === 'Hutang Usaha' && tx.type === 'OUT') {
          lines.push({
            id: tx.id,
            date: formatDateISO(parseTxDate(tx.date)),
            parsedDate: parseTxDate(tx.date),
            referenceNumber: tx.id.startsWith('tx-') ? tx.id.toUpperCase() : `TX-${tx.id.toUpperCase()}`,
            description: `Pembayaran Hutang: ${tx.description}`,
            debit: tx.amount,
            credit: 0,
            sourceType: 'CASH',
            sourceObj: tx
          });
        }
      });
    }

    // 4. REVENUE accounts (code starts with 4)
    else if (code.startsWith('4')) {
      // Credits from Sales Invoices (DPP)
      salesInvoices.forEach(inv => {
        lines.push({
          id: inv.id,
          date: inv.date,
          parsedDate: parseTxDate(inv.date),
          referenceNumber: inv.invoiceNumber,
          description: `Pendapatan Penjualan: ${inv.items[0]?.description || 'Penjualan Barang/Jasa'}`,
          debit: 0,
          credit: inv.dpp,
          sourceType: 'SALES',
          sourceObj: inv
        });
      });

      // Credits from cash inflows for other revenue (e.g. Pendapatan Bunga)
      if (code === '420000') { // Pendapatan Lain-lain
        recentTransactions.forEach(tx => {
          if (tx.category === 'Pendapatan Bunga' && tx.type === 'IN') {
            lines.push({
              id: tx.id,
              date: formatDateISO(parseTxDate(tx.date)),
              parsedDate: parseTxDate(tx.date),
              referenceNumber: tx.id.startsWith('tx-') ? tx.id.toUpperCase() : `TX-${tx.id.toUpperCase()}`,
              description: `Penerimaan Pendapatan Bunga Bank`,
              debit: 0,
              credit: tx.amount,
              sourceType: 'CASH',
              sourceObj: tx
            });
          }
        });
      }
    }

    // 5. EXPENSE accounts (code starts with 5)
    else if (code.startsWith('5')) {
      // 5.1 Cost of Goods Sold (HPP - 510000)
      if (code === '510000') {
        purchaseInvoices.forEach(inv => {
          lines.push({
            id: inv.id,
            date: inv.date,
            parsedDate: parseTxDate(inv.date),
            referenceNumber: inv.invoiceNumber,
            description: `Harga Pokok Pembelian - ${inv.vendorName}`,
            debit: inv.dpp,
            credit: 0,
            sourceType: 'PURCHASE',
            sourceObj: inv
          });
        });
      }

      // 5.2 Operating Expense (Beban Operasional - 520000)
      else if (code === '520000') {
        // Direct cash expenses
        recentTransactions.forEach(tx => {
          if (
            (tx.category === 'Biaya Operasional' || 
             tx.category === 'Biaya Perlengkapan' || 
             tx.category === 'Biaya Internet & Telepon' || 
             tx.category === 'Biaya Administrasi Bank') && 
            tx.type === 'OUT'
          ) {
            lines.push({
              id: tx.id,
              date: formatDateISO(parseTxDate(tx.date)),
              parsedDate: parseTxDate(tx.date),
              referenceNumber: tx.id.startsWith('tx-') ? tx.id.toUpperCase() : `TX-${tx.id.toUpperCase()}`,
              description: tx.description,
              debit: tx.amount,
              credit: 0,
              sourceType: 'CASH',
              sourceObj: tx
            });
          }
        });

        // Depreciations
        recentTransactions.forEach(tx => {
          if (tx.category === 'Biaya Depresiasi' && tx.type === 'OUT') {
            lines.push({
              id: tx.id,
              date: formatDateISO(parseTxDate(tx.date)),
              parsedDate: parseTxDate(tx.date),
              referenceNumber: tx.id.toUpperCase(),
              description: tx.description,
              debit: tx.amount,
              credit: 0,
              sourceType: 'DEPRECIATION',
              sourceObj: tx
            });
          }
        });
      }

      // 5.3 Salary Expense (Beban Gaji - 530000)
      else if (code === '530000') {
        recentTransactions.forEach(tx => {
          if (tx.category === 'Gaji & Upah' && tx.type === 'OUT') {
            lines.push({
              id: tx.id,
              date: formatDateISO(parseTxDate(tx.date)),
              parsedDate: parseTxDate(tx.date),
              referenceNumber: tx.id.startsWith('tx-') ? tx.id.toUpperCase() : `TX-${tx.id.toUpperCase()}`,
              description: tx.description,
              debit: tx.amount,
              credit: 0,
              sourceType: 'CASH',
              sourceObj: tx
            });
          }
        });
      }
    }

    // 6. TAX LIABILITY (PPN - 212000)
    else if (code === '212000') {
      // PPN Keluaran from Sales Invoices (Credits)
      salesInvoices.forEach(inv => {
        if (inv.ppnAmount > 0) {
          lines.push({
            id: inv.id,
            date: inv.date,
            parsedDate: parseTxDate(inv.date),
            referenceNumber: inv.invoiceNumber,
            description: `PPN Keluaran atas Faktur ${inv.invoiceNumber} - ${inv.customerName}`,
            debit: 0,
            credit: inv.ppnAmount,
            sourceType: 'SALES',
            sourceObj: inv
          });
        }
      });

      // PPN Masukan from Purchase Invoices (Debits)
      purchaseInvoices.forEach(inv => {
        if (inv.ppnAmount > 0) {
          lines.push({
            id: inv.id,
            date: inv.date,
            parsedDate: parseTxDate(inv.date),
            referenceNumber: inv.invoiceNumber,
            description: `PPN Masukan atas Faktur ${inv.invoiceNumber} - ${inv.vendorName}`,
            debit: inv.ppnAmount,
            credit: 0,
            sourceType: 'PURCHASE',
            sourceObj: inv
          });
        }
      });
    }

    // Sort chronologically by Date, then by referenceNumber to guarantee consistent order
    return lines.sort((a, b) => {
      const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.referenceNumber.localeCompare(b.referenceNumber);
    });

  }, [activeAccount, recentTransactions, salesInvoices, purchaseInvoices]);

  // Base balance formula: Account.balance - Net Change of ALL compiled lines
  const baseBalance = useMemo(() => {
    if (!activeAccount) return 0;
    const isAssetOrExpense = activeAccount.type === 'ASSET' || activeAccount.type === 'EXPENSE';
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    allLedgerLines.forEach(line => {
      totalDebit += line.debit;
      totalCredit += line.credit;
    });

    const netChange = isAssetOrExpense ? (totalDebit - totalCredit) : (totalCredit - totalDebit);
    return activeAccount.balance - netChange;
  }, [activeAccount, allLedgerLines]);

  // Split ledger entries into Prior (for Starting Balance) and Current (for detail list)
  const ledgerCalculation = useMemo(() => {
    if (!activeAccount) return { startingBalance: 0, filteredLines: [], totalDebit: 0, totalCredit: 0, endingBalance: 0 };

    const start = new Date(startDate);
    const end = new Date(endDate);
    // End date set to end of day
    end.setHours(23, 59, 59, 999);

    const isAssetOrExpense = activeAccount.type === 'ASSET' || activeAccount.type === 'EXPENSE';

    let startingBalance = baseBalance;
    const filteredLines: (LedgerLine & { runningBalance: number })[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    // Running balance accumulator
    let currentAccumBalance = baseBalance;

    allLedgerLines.forEach(line => {
      const dateVal = line.parsedDate.getTime();
      const change = isAssetOrExpense ? (line.debit - line.credit) : (line.credit - line.debit);

      if (dateVal < start.getTime()) {
        startingBalance += change;
        currentAccumBalance += change;
      } else if (dateVal <= end.getTime()) {
        currentAccumBalance += change;
        filteredLines.push({
          ...line,
          runningBalance: currentAccumBalance
        });
        totalDebit += line.debit;
        totalCredit += line.credit;
      } else {
        // Do not add to filteredLines, but this keeps the logic clean
      }
    });

    const endingBalance = startingBalance + (isAssetOrExpense ? (totalDebit - totalCredit) : (totalCredit - totalDebit));

    return {
      startingBalance,
      filteredLines,
      totalDebit,
      totalCredit,
      endingBalance
    };
  }, [activeAccount, baseBalance, allLedgerLines, startDate, endDate]);

  // Account hierarchy builder for tree popover selector
  const filteredAccountsTree = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return accounts;
    
    // Filter accounts matching query, then include their ancestors to maintain tree structure
    const matched = new Set<string>();
    accounts.forEach(acc => {
      if (acc.name.toLowerCase().includes(query) || acc.code.includes(query)) {
        matched.add(acc.id);
        // Trace parent
        let parentId = acc.parentId;
        while (parentId) {
          matched.add(parentId);
          const parent = accounts.find(a => a.id === parentId);
          parentId = parent?.parentId;
        }
      }
    });

    return accounts.filter(acc => matched.has(acc.id));
  }, [accounts, searchQuery]);

  // Period preset selectors handler
  const setPeriodPreset = (preset: 'month' | 'quarter' | 'year' | 'all') => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    if (preset === 'month') {
      const firstDay = new Date(currentYear, today.getMonth(), 1);
      const lastDay = new Date(currentYear, today.getMonth() + 1, 0);
      setStartDate(formatDateISO(firstDay));
      setEndDate(formatDateISO(lastDay));
    } else if (preset === 'quarter') {
      const quarter = Math.floor(today.getMonth() / 3);
      const firstDay = new Date(currentYear, quarter * 3, 1);
      const lastDay = new Date(currentYear, (quarter + 1) * 3, 0);
      setStartDate(formatDateISO(firstDay));
      setEndDate(formatDateISO(lastDay));
    } else if (preset === 'year') {
      setStartDate(`${currentYear}-01-01`);
      setEndDate(`${currentYear}-12-31`);
    } else if (preset === 'all') {
      setStartDate('2023-01-01');
      setEndDate('2026-12-31');
    }
  };

  // CSV export handler
  const handleExportCSV = () => {
    if (!activeAccount) return;

    const headers = ['Tanggal', 'No. Jurnal', 'Keterangan', 'Debit', 'Kredit', 'Saldo'];
    const rows = [
      ['', '', 'SALDO AWAL', '', '', ledgerCalculation.startingBalance.toString()],
      ...ledgerCalculation.filteredLines.map(line => [
        formatDateDisplay(line.date),
        line.referenceNumber,
        line.description,
        line.debit > 0 ? line.debit.toString() : '0',
        line.credit > 0 ? line.credit.toString() : '0',
        line.runningBalance.toString()
      ]),
      ['', '', 'SALDO AKHIR', '', '', ledgerCalculation.endingBalance.toString()]
    ];

    const filename = `Buku_Besar_${activeAccount.code}_${activeAccount.name.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`;
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

  // Browser print trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      {/* Dynamic Printing Stylesheet inject */}
      <style jsx global>{`
        @media print {
          /* Hide app UI shells */
          header, 
          nav, 
          aside, 
          .page-header-actions,
          .filter-panel,
          .kpi-container,
          .no-print {
            display: none !important;
          }
          
          /* Full width layout for print */
          main, 
          .print-container {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          .print-card {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Digital Ledger Paper layout */
          .print-header {
            display: block !important;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 2px solid #000000;
          }

          .print-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }

          .print-table th, 
          .print-table td {
            border: 1px solid #dddddd !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
            color: #000000 !important;
          }

          .print-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
          }

          .print-kpi-summary {
            display: flex !important;
            justify-content: space-between;
            margin-bottom: 16px;
            border: 1px solid #ccc;
            padding: 10px;
            background-color: #fafafa;
          }

          .print-kpi-item {
            text-align: center;
          }

          .print-kpi-item p {
            font-size: 9px !important;
            margin: 0 0 4px 0 !important;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #666 !important;
          }

          .print-kpi-item h4 {
            font-size: 13px !important;
            margin: 0 !important;
            font-weight: bold;
            color: #000 !important;
          }
        }
      `}</style>

      <div className="space-y-6 animate-fade-in print-container">
        
        {/* Mock Letterhead for Prints */}
        <div className="hidden print-header text-center">
          <h1 className="text-xl font-bold tracking-tight text-black">FINCORP INDONESIA</h1>
          <p className="text-xs text-gray-500 font-medium">Buku Besar Pembukuan Fiskal Nusantara</p>
          <p className="text-xs text-gray-600 mt-1">
            Akun: <span className="font-bold">[{activeAccount?.code}] {activeAccount?.name}</span> &bull; 
            Periode: <span className="font-bold">{formatDateDisplay(startDate)} s/d {formatDateDisplay(endDate)}</span>
          </p>
        </div>

        {/* Page Header */}
        <div className="no-print">
          <PageHeader
            title="Buku Besar"
            description="Laporan mutasi terperinci dan saldo berjalan untuk setiap perkiraan akuntansi."
            actions={
              <div className="flex items-center gap-2 page-header-actions">
                <Button variant="outline" icon="print" onClick={handlePrint}>
                  Cetak Laporan
                </Button>
                <Button icon="download" onClick={handleExportCSV}>
                  Ekspor CSV
                </Button>
              </div>
            }
          />
        </div>

        {/* Filters Panel */}
        <div className="glass-card rounded-2xl p-5 space-y-4 filter-panel no-print hover:border-secondary-container/30 transition-colors duration-300">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            {/* Account Selector Input */}
            <div className="w-full lg:w-1/2 relative" ref={popoverRef}>
              <label className="block text-[11px] font-label-md text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Akun Perkiraan</label>
              
              <button
                type="button"
                onClick={() => setIsAccountPopoverOpen(!isAccountPopoverOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-container-low border border-border-subtle hover:border-secondary/40 rounded-xl transition-all duration-300 shadow-sm text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[20px]">menu_book</span>
                  <div>
                    <span className="font-tabular-nums text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 mr-2">
                      {activeAccount?.code}
                    </span>
                    <span className="text-xs font-bold text-on-surface">{activeAccount?.name}</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-300">
                  {isAccountPopoverOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
                </span>
              </button>

              {/* Tree Popover list container */}
              {isAccountPopoverOpen && (
                <div className="absolute left-0 mt-2 w-full bg-white dark:bg-slate-900 border border-border-subtle/85 dark:border-white/10 rounded-2xl shadow-2xl z-55 overflow-hidden flex flex-col max-h-[380px] animate-scale-up">
                  {/* Popover Search Bar */}
                  <div className="p-3 border-b border-border-subtle/50 flex items-center gap-2 bg-surface-muted/30">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
                    <input
                      type="text"
                      placeholder="Cari kode atau nama akun..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs focus:ring-0 outline-none text-on-surface"
                      autoFocus
                    />
                  </div>

                  {/* Popover Account Tree */}
                  <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                    {filteredAccountsTree.length === 0 ? (
                      <p className="text-center py-6 text-xs text-on-surface-variant">Akun tidak ditemukan</p>
                    ) : (
                      filteredAccountsTree.map((acc) => {
                        const isSelected = acc.id === selectedAccountId;
                        const hasChildren = accounts.some(a => a.parentId === acc.id);
                        
                        // Level-based indents
                        const indentLevel = acc.level - 1; 
                        const indentClass = `pl-${indentLevel * 4}`; // 0, 4, 8, 12, etc.

                        // Non-selectable category node
                        const isCategoryNode = acc.level <= 2;

                        return (
                          <div
                            key={acc.id}
                            style={{ paddingLeft: `${indentLevel * 14}px` }}
                            className={`
                              flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all
                              ${isCategoryNode 
                                ? 'font-bold text-primary border-b border-border-subtle/20 mt-1 cursor-default opacity-85' 
                                : 'cursor-pointer hover:bg-primary/5 dark:hover:bg-white/5 font-semibold text-on-surface'
                              }
                              ${isSelected ? 'bg-primary/10 border-l-4 border-primary shadow-sm !text-primary' : ''}
                            `}
                            onClick={() => {
                              if (!isCategoryNode) {
                                setSelectedAccountId(acc.id);
                                setIsAccountPopoverOpen(false);
                                setSearchQuery('');
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {/* Icon indicators */}
                              <span className="material-symbols-outlined text-[15px] opacity-65">
                                {isCategoryNode ? 'folder_open' : 'subdirectory_arrow_right'}
                              </span>
                              <span className="font-tabular-nums opacity-80">{acc.code}</span>
                              <span>{acc.name}</span>
                            </div>
                            <span className="text-[11px] font-tabular-nums text-on-surface-variant opacity-75">
                              {formatCurrency(acc.balance)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Date Filters & Presets */}
            <div className="w-full lg:w-1/2 flex flex-col sm:flex-row gap-3 items-end">
              <div className="grid grid-cols-2 gap-3 w-full sm:w-2/3">
                <div>
                  <label className="block text-[11px] font-label-md text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Mulai Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle focus:border-secondary/40 focus:ring-1 focus:ring-secondary/20 rounded-xl text-xs text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-label-md text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle focus:border-secondary/40 focus:ring-1 focus:ring-secondary/20 rounded-xl text-xs text-on-surface"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 w-full sm:w-1/3 justify-start sm:justify-end sm:pb-0.5">
                <button
                  onClick={() => setPeriodPreset('month')}
                  className="px-2.5 py-2 border border-border-subtle hover:border-secondary/30 rounded-lg text-[10.5px] font-bold bg-surface-container-low hover:bg-surface text-on-surface-variant cursor-pointer transition-colors"
                >
                  Bulan Ini
                </button>
                <button
                  onClick={() => setPeriodPreset('year')}
                  className="px-2.5 py-2 border border-border-subtle hover:border-secondary/30 rounded-lg text-[10.5px] font-bold bg-surface-container-low hover:bg-surface text-on-surface-variant cursor-pointer transition-colors"
                >
                  Tahun Ini
                </button>
                <button
                  onClick={() => setPeriodPreset('all')}
                  className="px-2.5 py-2 border border-border-subtle hover:border-secondary/30 rounded-lg text-[10.5px] font-bold bg-surface-container-low hover:bg-surface text-on-surface-variant cursor-pointer transition-colors"
                >
                  Semua
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Print Layout KPI Summary */}
        <div className="hidden print-kpi-summary">
          <div className="print-kpi-item">
            <p>Saldo Awal</p>
            <h4>{formatCurrency(ledgerCalculation.startingBalance)}</h4>
          </div>
          <div className="print-kpi-item">
            <p>Total Debit</p>
            <h4>{formatCurrency(ledgerCalculation.totalDebit)}</h4>
          </div>
          <div className="print-kpi-item">
            <p>Total Kredit</p>
            <h4>{formatCurrency(ledgerCalculation.totalCredit)}</h4>
          </div>
          <div className="print-kpi-item">
            <p>Saldo Akhir</p>
            <h4>{formatCurrency(ledgerCalculation.endingBalance)}</h4>
          </div>
        </div>

        {/* Dashboard KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 kpi-container no-print">
          {/* Card 1: Saldo Awal */}
          <div className="glass-card rounded-2xl p-5 border-b-4 border-b-surface-container-high hover:border-b-primary hover:-translate-y-0.5 transition-all duration-300">
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Saldo Awal</p>
            <p className="text-xl font-bold tracking-tight text-primary font-tabular-nums">
              {formatCurrency(ledgerCalculation.startingBalance)}
            </p>
            <span className="text-[10px] text-on-surface-variant/60 block mt-1 font-medium">Per tanggal {formatDateDisplay(startDate)}</span>
          </div>

          {/* Card 2: Total Debit */}
          <div className="glass-card rounded-2xl p-5 border-b-4 border-b-surface-container-high hover:border-b-success-positive hover:-translate-y-0.5 transition-all duration-300">
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Debit (+)</p>
            <p className="text-xl font-bold tracking-tight text-success-positive font-tabular-nums">
              {formatCurrency(ledgerCalculation.totalDebit)}
            </p>
            <span className="text-[10px] text-on-surface-variant/60 block mt-1 font-medium">Selama periode penyaringan</span>
          </div>

          {/* Card 3: Total Kredit */}
          <div className="glass-card rounded-2xl p-5 border-b-4 border-b-surface-container-high hover:border-b-warning-deadline hover:-translate-y-0.5 transition-all duration-300">
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Total Kredit (-)</p>
            <p className="text-xl font-bold tracking-tight text-warning-deadline font-tabular-nums">
              {formatCurrency(ledgerCalculation.totalCredit)}
            </p>
            <span className="text-[10px] text-on-surface-variant/60 block mt-1 font-medium">Selama periode penyaringan</span>
          </div>

          {/* Card 4: Saldo Akhir */}
          <div className="glass-card rounded-2xl p-5 border-b-4 border-b-surface-container-high hover:border-b-secondary hover:-translate-y-0.5 transition-all duration-300">
            <p className="font-label-md text-[10.5px] text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Saldo Akhir</p>
            <p className="text-xl font-bold tracking-tight text-secondary font-tabular-nums animate-pulse-slow">
              {formatCurrency(ledgerCalculation.endingBalance)}
            </p>
            <span className="text-[10px] text-on-surface-variant/60 block mt-1 font-medium">Per tanggal {formatDateDisplay(endDate)}</span>
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col hover:border-secondary-container/20 transition-colors duration-300 print-card">
          <div className="p-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/20 no-print">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold tracking-wider">
                Mutasi Buku Besar
              </h3>
            </div>
            <span className="text-xs text-on-surface-variant/75 font-semibold font-tabular-nums">
              Terpilih {ledgerCalculation.filteredLines.length} Transaksi
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[850px] print-table">
              <thead>
                <tr className="bg-surface-muted/30 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">No. Jurnal</th>
                  <th className="px-4 py-3 font-semibold">Keterangan</th>
                  <th className="px-4 py-3 font-semibold text-right">Debit</th>
                  <th className="px-4 py-3 font-semibold text-right">Kredit</th>
                  <th className="px-4 py-3 font-semibold text-right">Saldo Kumulatif</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle/40">
                {/* Saldo Awal Row */}
                <tr className="bg-surface-container-low/30 font-semibold italic text-on-surface-variant">
                  <td className="px-4 py-2 text-[11px] font-tabular-nums">{formatDateDisplay(startDate)}</td>
                  <td className="px-4 py-2 text-[11px]">-</td>
                  <td className="px-4 py-2">Saldo Awal Sebelum Periode</td>
                  <td className="px-4 py-2 text-right">-</td>
                  <td className="px-4 py-2 text-right">-</td>
                  <td className="px-4 py-2 text-right font-tabular-nums">
                    {formatCurrency(ledgerCalculation.startingBalance)}
                  </td>
                </tr>

                {/* Main Ledger Lines */}
                {ledgerCalculation.filteredLines.length === 0 ? (
                  <tr className="no-print">
                    <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant italic">
                      Tidak ada transaksi pada periode ini.
                    </td>
                  </tr>
                ) : (
                  ledgerCalculation.filteredLines.map((line) => (
                    <tr
                      key={line.id}
                      onClick={() => setSelectedLedgerItem(line)}
                      className="hover:bg-surface-container-low/70 transition-colors duration-200 cursor-pointer group h-10"
                    >
                      <td className="px-4 py-2 text-[11px] font-tabular-nums">{formatDateDisplay(line.date)}</td>
                      <td className="px-4 py-2 text-[11px] font-bold text-primary group-hover:text-secondary font-tabular-nums transition-colors">
                        {line.referenceNumber}
                      </td>
                      <td className="px-4 py-2 text-[12px] text-on-surface font-medium truncate max-w-[340px]" title={line.description}>
                        {line.description}
                      </td>
                      <td className="px-4 py-2 text-right text-success-positive font-tabular-nums font-semibold">
                        {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right text-warning-deadline font-tabular-nums font-semibold">
                        {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-tabular-nums font-bold text-on-surface">
                        {formatCurrency(line.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}

                {/* Saldo Akhir Row */}
                <tr className="bg-surface-container-low/30 font-semibold italic text-on-surface-variant">
                  <td className="px-4 py-2 text-[11px] font-tabular-nums">{formatDateDisplay(endDate)}</td>
                  <td className="px-4 py-2 text-[11px]">-</td>
                  <td className="px-4 py-2">Saldo Akhir Terakumulasi</td>
                  <td className="px-4 py-2 text-right text-success-positive">
                    {ledgerCalculation.totalDebit > 0 ? formatCurrency(ledgerCalculation.totalDebit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-warning-deadline">
                    {ledgerCalculation.totalCredit > 0 ? formatCurrency(ledgerCalculation.totalCredit) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-tabular-nums font-bold">
                    {formatCurrency(ledgerCalculation.endingBalance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drill-down detail modal (Slide-over / popup) */}
      {selectedLedgerItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-surface backdrop-blur-md border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">receipt_long</span>
                <div>
                  <h3 className="font-bold text-primary dark:text-secondary-container">
                    Rincian Transaksi Asal
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest font-tabular-nums">
                    Ref: {selectedLedgerItem.referenceNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedLedgerItem(null)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body depending on Source Type */}
            <div className="space-y-4 font-body-sm text-[12.5px] text-on-surface leading-relaxed">
              
              {/* Common Header Info */}
              <div className="grid grid-cols-2 gap-4 bg-surface-muted/40 p-4 rounded-xl border border-border-subtle/30">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Tanggal Pembukuan</p>
                  <p className="font-bold font-tabular-nums mt-0.5">{formatDateDisplay(selectedLedgerItem.date)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Tipe Akun Terpengaruh</p>
                  <span className="inline-flex mt-1 text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full">
                    {getAccountTypeLabel(activeAccount?.type)}
                  </span>
                </div>
              </div>

              {/* SALES INVOICE SOURCE DETAIL */}
              {selectedLedgerItem.sourceType === 'SALES' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Dokumen Faktur Penjualan</p>
                      <p className="font-bold text-primary text-sm mt-0.5">{selectedLedgerItem.sourceObj.invoiceNumber}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10.5px] font-bold ${
                      selectedLedgerItem.sourceObj.status === 'PAID' ? 'bg-success-positive/10 text-success-positive' : 'bg-warning-deadline/10 text-warning-deadline'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedLedgerItem.sourceObj.status === 'PAID' ? 'bg-success-positive' : 'bg-warning-deadline'}`}></span>
                      {selectedLedgerItem.sourceObj.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-xs border-b border-border-subtle/35 pb-1">Detail Pelanggan & Barang</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-on-surface-variant">Pelanggan:</span>
                        <p className="font-semibold">{selectedLedgerItem.sourceObj.customerName}</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant">NPWP:</span>
                        <p className="font-semibold font-tabular-nums">{selectedLedgerItem.sourceObj.customerNpwp || '-'}</p>
                      </div>
                    </div>
                    
                    {/* Invoice Items List */}
                    <div className="border border-border-subtle/40 rounded-xl overflow-hidden mt-3">
                      <div className="bg-surface-muted/30 px-3 py-1.5 font-bold text-[10.5px] text-on-surface-variant grid grid-cols-12 border-b border-border-subtle/45">
                        <span className="col-span-6">Keterangan Item</span>
                        <span className="col-span-2 text-center">Qty</span>
                        <span className="col-span-4 text-right">Subtotal</span>
                      </div>
                      <div className="divide-y divide-border-subtle/30 bg-surface-container-lowest">
                        {selectedLedgerItem.sourceObj.items.map((it: any) => (
                          <div key={it.id} className="px-3 py-2 text-[11px] grid grid-cols-12 items-center">
                            <span className="col-span-6 font-medium text-on-surface truncate">{it.description}</span>
                            <span className="col-span-2 text-center font-tabular-nums">{it.quantity}</span>
                            <span className="col-span-4 text-right font-tabular-nums">{formatCurrency(it.quantity * it.unitPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Invoice Calculations */}
                    <div className="bg-surface-muted/30 p-3 rounded-xl border border-border-subtle/35 mt-4 space-y-1.5 font-tabular-nums">
                      <div className="flex justify-between text-[11.5px] font-medium">
                        <span className="text-on-surface-variant">Subtotal</span>
                        <span>{formatCurrency(selectedLedgerItem.sourceObj.subtotal)}</span>
                      </div>
                      {selectedLedgerItem.sourceObj.discountTotal > 0 && (
                        <div className="flex justify-between text-[11.5px] font-medium text-warning-deadline">
                          <span>Potongan Diskon</span>
                          <span>-{formatCurrency(selectedLedgerItem.sourceObj.discountTotal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[11.5px] font-medium">
                        <span className="text-on-surface-variant">Dasar Pengenaan Pajak (DPP)</span>
                        <span>{formatCurrency(selectedLedgerItem.sourceObj.dpp)}</span>
                      </div>
                      <div className="flex justify-between text-[11.5px] font-medium">
                        <span className="text-on-surface-variant">PPN ({selectedLedgerItem.sourceObj.ppnRate || 11}%)</span>
                        <span>{formatCurrency(selectedLedgerItem.sourceObj.ppnAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[12.5px] font-bold border-t border-border-subtle/40 pt-1.5 text-primary">
                        <span>Total Faktur (Receivable)</span>
                        <span>{formatCurrency(selectedLedgerItem.sourceObj.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PURCHASE INVOICE SOURCE DETAIL */}
              {selectedLedgerItem.sourceType === 'PURCHASE' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-orange-500/5 border border-orange-500/10 p-3.5 rounded-xl">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Dokumen Faktur Pembelian</p>
                      <p className="font-bold text-secondary text-sm mt-0.5">{selectedLedgerItem.sourceObj.invoiceNumber}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10.5px] font-bold ${
                      selectedLedgerItem.sourceObj.status === 'PAID' ? 'bg-success-positive/10 text-success-positive' : 'bg-warning-deadline/10 text-warning-deadline'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedLedgerItem.sourceObj.status === 'PAID' ? 'bg-success-positive' : 'bg-warning-deadline'}`}></span>
                      {selectedLedgerItem.sourceObj.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-xs border-b border-border-subtle/35 pb-1">Detail Pemasok (Vendor) & Pembelian</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-on-surface-variant">Nama Vendor:</span>
                        <p className="font-semibold">{selectedLedgerItem.sourceObj.vendorName}</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant">Jatuh Tempo:</span>
                        <p className="font-semibold font-tabular-nums">{formatDateDisplay(selectedLedgerItem.sourceObj.dueDate)}</p>
                      </div>
                    </div>
                    
                    {/* Purchase Items List */}
                    <div className="border border-border-subtle/40 rounded-xl overflow-hidden mt-3">
                      <div className="bg-surface-muted/30 px-3 py-1.5 font-bold text-[10.5px] text-on-surface-variant grid grid-cols-12 border-b border-border-subtle/45">
                        <span className="col-span-6">Keterangan Item</span>
                        <span className="col-span-2 text-center">Qty</span>
                        <span className="col-span-4 text-right">Subtotal</span>
                      </div>
                      <div className="divide-y divide-border-subtle/30 bg-surface-container-lowest">
                        {selectedLedgerItem.sourceObj.items.map((it: any) => (
                          <div key={it.id} className="px-3 py-2 text-[11px] grid grid-cols-12 items-center">
                            <span className="col-span-6 font-medium text-on-surface truncate">{it.description}</span>
                            <span className="col-span-2 text-center font-tabular-nums">{it.quantity}</span>
                            <span className="col-span-4 text-right font-tabular-nums">{formatCurrency(it.quantity * it.unitPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Purchase Calculations */}
                    <div className="bg-surface-muted/30 p-3 rounded-xl border border-border-subtle/35 mt-4 space-y-1.5 font-tabular-nums">
                      <div className="flex justify-between text-[11.5px] font-medium">
                        <span className="text-on-surface-variant">Dasar Pengenaan Pajak (DPP)</span>
                        <span>{formatCurrency(selectedLedgerItem.sourceObj.dpp)}</span>
                      </div>
                      <div className="flex justify-between text-[11.5px] font-medium">
                        <span className="text-on-surface-variant">PPN ({selectedLedgerItem.sourceObj.ppnRate || 11}%)</span>
                        <span>{formatCurrency(selectedLedgerItem.sourceObj.ppnAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[12.5px] font-bold border-t border-border-subtle/40 pt-1.5 text-secondary">
                        <span>Total Tagihan (Payable)</span>
                        <span>{formatCurrency(selectedLedgerItem.sourceObj.grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CASH TRANSACTION DETAIL */}
              {selectedLedgerItem.sourceType === 'CASH' && (
                <div className="space-y-4">
                  <div className="bg-surface-muted/50 p-4 border border-border-subtle/40 rounded-xl space-y-3.5">
                    <div className="flex justify-between items-center border-b border-border-subtle/30 pb-2">
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Tipe Transaksi Kas</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 rounded-full mt-1 ${
                          selectedLedgerItem.sourceObj.type === 'IN' ? 'bg-success-positive/10 text-success-positive' : 'bg-warning-deadline/10 text-warning-deadline'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedLedgerItem.sourceObj.type === 'IN' ? 'bg-success-positive animate-pulse' : 'bg-warning-deadline'}`}></span>
                          {selectedLedgerItem.sourceObj.type === 'IN' ? 'Kas Masuk (Inflow)' : 'Kas Keluar (Outflow)'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Rekening Penjurnal</p>
                        <p className="font-bold text-on-surface mt-1">{selectedLedgerItem.sourceObj.accountName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      <div>
                        <span className="text-on-surface-variant">Kategori Keuangan:</span>
                        <p className="font-bold text-on-surface mt-0.5">{selectedLedgerItem.sourceObj.category}</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant">Nominal Transaksi:</span>
                        <p className="font-bold text-on-surface font-tabular-nums text-[13.5px] mt-0.5">
                          {formatCurrency(selectedLedgerItem.sourceObj.amount)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border-subtle/30 pt-3 text-xs">
                      <span className="text-on-surface-variant">Deskripsi Memo:</span>
                      <p className="font-semibold text-on-surface italic mt-0.5">&ldquo;{selectedLedgerItem.sourceObj.description}&rdquo;</p>
                    </div>
                  </div>
                </div>
              )}

              {/* DEPRECIATION DETAIL */}
              {selectedLedgerItem.sourceType === 'DEPRECIATION' && (
                <div className="space-y-4">
                  <div className="bg-surface-muted/50 p-4 border border-border-subtle/40 rounded-xl space-y-3">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Tipe Penyesuaian Akuntansi</p>
                    <div className="font-bold text-sm text-primary">Jurnal Penyesuaian Penyusutan Aset</div>
                    <div className="text-xs text-on-surface font-medium leading-relaxed">
                      Transaksi ini dihasilkan secara otomatis oleh sistem melalui simulasi penyusutan bulanan Aset Tetap (Fixed Assets) dengan metode garis lurus.
                    </div>
                    <div className="border-t border-border-subtle/30 pt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-on-surface-variant">Nilai Penyusutan:</span>
                        <p className="font-bold font-tabular-nums mt-0.5">{formatCurrency(selectedLedgerItem.sourceObj.amount)}</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant">Akun Kredit Penyeimbang:</span>
                        <p className="font-bold mt-0.5">Akumulasi Penyusutan Aset</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border-subtle/40 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLedgerItem(null)}
              >
                Tutup Rincian
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
