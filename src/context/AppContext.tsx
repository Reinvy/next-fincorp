'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  company as mockCompany,
  accounts as mockAccounts,
  salesInvoices as mockSalesInvoices,
  purchaseInvoices as mockPurchaseInvoices,
  fixedAssets as mockFixedAssets,
  bankAccounts as mockBankAccounts,
  recentTransactions as mockTransactions,
  alerts as mockAlerts,
  customers as mockCustomers,
  vendors as mockVendors
} from '@/data';
import type {
  Company,
  Account,
  SalesInvoice,
  PurchaseInvoice,
  FixedAsset,
  BankAccount,
  CashTransaction,
  AlertItem,
  Customer,
  Vendor,
  InvoiceItem
} from '@/data/types';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  company: Company;
  updateCompany: (newCompany: Partial<Company>) => void;
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id' | 'balance'> & { balance: number }) => void;
  salesInvoices: SalesInvoice[];
  addSalesInvoice: (invoice: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'subtotal' | 'discountTotal' | 'dpp' | 'ppnAmount' | 'grandTotal' | 'status' | 'taxInvoiceNumber'> & { status?: string }) => void;
  purchaseInvoices: PurchaseInvoice[];
  addPurchaseInvoice: (invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'subtotal' | 'dpp' | 'ppnAmount' | 'grandTotal' | 'status'> & { status?: string }) => void;
  fixedAssets: FixedAsset[];
  addFixedAsset: (asset: Omit<FixedAsset, 'id' | 'accumulatedDepreciation' | 'netBookValue' | 'status'>) => void;
  runDepreciation: () => void;
  bankAccounts: BankAccount[];
  recentTransactions: CashTransaction[];
  addBankTransfer: (transfer: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string }) => void;
  alerts: AlertItem[];
  dismissAlert: (id: string) => void;
  paySalesInvoice: (id: string) => void;
  payPurchaseInvoice: (id: string) => void;
  addBankAccount: (bank: Omit<BankAccount, 'id' | 'balance' | 'changePercent'> & { balance: number }) => void;
  addCashTransaction: (tx: { accountId: string; description: string; category: string; amount: number; type: 'IN' | 'OUT'; date?: string }) => void;
  postJournalEntry: (entry: { date: string; referenceNumber: string; description: string; lines: { accountId: string; accountName: string; debit: number; credit: number }[] }) => void;
  customers: Customer[];
  vendors: Vendor[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [company, setCompany] = useState<Company>(mockCompany);
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(mockSalesInvoices);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(mockPurchaseInvoices);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(mockFixedAssets);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(mockBankAccounts);
  const [recentTransactions, setRecentTransactions] = useState<CashTransaction[]>(mockTransactions);
  const [alerts, setAlerts] = useState<AlertItem[]>(mockAlerts);
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [vendors, setVendors] = useState<Vendor[]>(mockVendors);

  // Initialize state from localStorage on client-side mount
  useEffect(() => {
    setIsClient(true);
    const storedTheme = localStorage.getItem('fincorp_theme') as 'light' | 'dark';
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', prefersDark);
    }

    const storedCompany = localStorage.getItem('fincorp_company');
    if (storedCompany) setCompany(JSON.parse(storedCompany));

    const storedAccounts = localStorage.getItem('fincorp_accounts');
    if (storedAccounts) setAccounts(JSON.parse(storedAccounts));

    const storedSales = localStorage.getItem('fincorp_sales');
    if (storedSales) setSalesInvoices(JSON.parse(storedSales));

    const storedPurchases = localStorage.getItem('fincorp_purchases');
    if (storedPurchases) setPurchaseInvoices(JSON.parse(storedPurchases));

    const storedAssets = localStorage.getItem('fincorp_assets');
    if (storedAssets) setFixedAssets(JSON.parse(storedAssets));

    const storedBanks = localStorage.getItem('fincorp_banks');
    if (storedBanks) setBankAccounts(JSON.parse(storedBanks));

    const storedTxs = localStorage.getItem('fincorp_txs');
    if (storedTxs) setRecentTransactions(JSON.parse(storedTxs));

    const storedAlerts = localStorage.getItem('fincorp_alerts');
    if (storedAlerts) setAlerts(JSON.parse(storedAlerts));
  }, []);

  // Save updates to localStorage
  const save = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('fincorp_theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const updateCompany = (newCompany: Partial<Company>) => {
    const updated = { ...company, ...newCompany } as Company;
    setCompany(updated);
    save('fincorp_company', updated);
  };

  const addAccount = (account: Omit<Account, 'id' | 'balance'> & { balance: number }) => {
    const newId = `acc-${Date.now()}`;
    const newAcc: Account = {
      id: newId,
      ...account,
      isActive: true,
    };
    const updated = [...accounts, newAcc];
    setAccounts(updated);
    save('fincorp_accounts', updated);

    // If initial balance > 0, we can add a mock transaction for it
    if (account.balance > 0) {
      const tx: CashTransaction = {
        id: `tx-${Date.now()}`,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: `Saldo awal untuk akun ${account.name}`,
        accountId: newId,
        accountName: account.name,
        category: 'Saldo Awal',
        amount: account.balance,
        type: 'IN',
        balance: account.balance,
      };
      const updatedTxs = [tx, ...recentTransactions];
      setRecentTransactions(updatedTxs);
      save('fincorp_txs', updatedTxs);
    }
  };

  const addSalesInvoice = (invoice: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'subtotal' | 'discountTotal' | 'dpp' | 'ppnAmount' | 'grandTotal' | 'status' | 'taxInvoiceNumber'> & { status?: string }) => {
    // Calculate values
    const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountTotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.discountPercent) / 100, 0);
    const dpp = subtotal - discountTotal;
    const ppnAmount = invoice.hasTaxInvoice ? Math.round((dpp * invoice.ppnRate) / 100) : 0;
    const grandTotal = dpp + ppnAmount;
    
    // Generate Invoice Number
    const count = salesInvoices.length + 1;
    const invoiceNumber = `INV-2026-${count.toString().padStart(3, '0')}`;
    const taxInvoiceNumber = invoice.hasTaxInvoice 
      ? `010.000-26.${(12345678 + count).toString().padStart(8, '0')}`
      : undefined;

    const newInvoice: SalesInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      subtotal,
      discountTotal,
      dpp,
      ppnAmount,
      grandTotal,
      status: (invoice.status as any) || 'UNPAID',
      taxInvoiceNumber,
      ...invoice,
    };

    const updated = [newInvoice, ...salesInvoices];
    setSalesInvoices(updated);
    save('fincorp_sales', updated);

    // Update Cash/Bank account and add transactions if it's PAID immediately
    if (newInvoice.status === 'PAID') {
      // Add to operational bank account (usually first bank account)
      const targetBank = bankAccounts.find(b => b.type === 'BANK') || bankAccounts[0];
      if (targetBank) {
        const updatedBanks = bankAccounts.map(b => {
          if (b.id === targetBank.id) {
            return { ...b, balance: b.balance + grandTotal };
          }
          return b;
        });
        setBankAccounts(updatedBanks);
        save('fincorp_banks', updatedBanks);

        const tx: CashTransaction = {
          id: `tx-${Date.now()}`,
          date: newInvoice.date,
          description: `Pelunasan Faktur ${invoiceNumber} - ${newInvoice.customerName}`,
          accountId: targetBank.id,
          accountName: targetBank.name,
          category: 'Piutang Usaha',
          amount: grandTotal,
          type: 'IN',
          balance: targetBank.balance + grandTotal,
        };
        const updatedTxs = [tx, ...recentTransactions];
        setRecentTransactions(updatedTxs);
        save('fincorp_txs', updatedTxs);
      }
    }
  };

  const addPurchaseInvoice = (invoice: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'subtotal' | 'dpp' | 'ppnAmount' | 'grandTotal' | 'status'> & { status?: string }) => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const dpp = subtotal; // Assuming no item-level discount for simplicity
    const ppnAmount = Math.round((dpp * invoice.ppnRate) / 100);
    const grandTotal = dpp + ppnAmount;

    const count = purchaseInvoices.length + 1;
    const invoiceNumber = `FB-2026-${count.toString().padStart(3, '0')}`;

    const newInvoice: PurchaseInvoice = {
      id: `pinv-${Date.now()}`,
      invoiceNumber,
      subtotal,
      dpp,
      ppnAmount,
      grandTotal,
      status: (invoice.status as any) || 'UNPAID',
      ...invoice,
    };

    const updated = [newInvoice, ...purchaseInvoices];
    setPurchaseInvoices(updated);
    save('fincorp_purchases', updated);

    // If PAID, reduce bank balance and record cash out transaction
    if (newInvoice.status === 'PAID') {
      const targetBank = bankAccounts.find(b => b.type === 'BANK') || bankAccounts[0];
      if (targetBank) {
        const updatedBanks = bankAccounts.map(b => {
          if (b.id === targetBank.id) {
            return { ...b, balance: b.balance - grandTotal };
          }
          return b;
        });
        setBankAccounts(updatedBanks);
        save('fincorp_banks', updatedBanks);

        const tx: CashTransaction = {
          id: `tx-${Date.now()}`,
          date: newInvoice.date,
          description: `Pembayaran Pembelian ${invoiceNumber} - ${newInvoice.vendorName}`,
          accountId: targetBank.id,
          accountName: targetBank.name,
          category: 'Hutang Usaha',
          amount: grandTotal,
          type: 'OUT',
          balance: targetBank.balance - grandTotal,
        };
        const updatedTxs = [tx, ...recentTransactions];
        setRecentTransactions(updatedTxs);
        save('fincorp_txs', updatedTxs);
      }
    }
  };

  const addFixedAsset = (asset: Omit<FixedAsset, 'id' | 'accumulatedDepreciation' | 'netBookValue' | 'status'>) => {
    const newAsset: FixedAsset = {
      id: `asset-${Date.now()}`,
      accumulatedDepreciation: 0,
      netBookValue: asset.purchasePrice,
      status: 'ACTIVE',
      ...asset,
    };

    const updated = [newAsset, ...fixedAssets];
    setFixedAssets(updated);
    save('fincorp_assets', updated);
  };

  const runDepreciation = () => {
    const updated = fixedAssets.map(asset => {
      if (asset.status !== 'ACTIVE') return asset;

      // Simple Straight Line Depreciation: Purchase Price / Useful Life / 12 (monthly depreciation)
      const yearlyDep = asset.purchasePrice / asset.usefulLife;
      const monthlyDep = Math.round(yearlyDep / 12);

      const nextAccum = Math.min(asset.accumulatedDepreciation + monthlyDep, asset.purchasePrice);
      const nextNetValue = asset.purchasePrice - nextAccum;

      return {
        ...asset,
        accumulatedDepreciation: nextAccum,
        netBookValue: nextNetValue,
        status: nextNetValue <= 0 ? ('DISPOSED' as const) : asset.status,
      };
    });

    setFixedAssets(updated);
    save('fincorp_assets', updated);

    // Calculate total depreciation run this month
    const totalDepRun = updated.reduce((sum, current, i) => {
      const prev = fixedAssets[i];
      if (current.status === 'ACTIVE' || (prev && prev.status === 'ACTIVE' && current.status === 'DISPOSED')) {
        return sum + (current.accumulatedDepreciation - prev.accumulatedDepreciation);
      }
      return sum;
    }, 0);

    if (totalDepRun > 0) {
      // Record in recent transactions as non-invoice cash transaction
      const targetAcc = accounts.find(a => a.code.startsWith('5')) || accounts[0]; // Expense account
      const tx: CashTransaction = {
        id: `tx-dep-${Date.now()}`,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: `Pencatatan Depresiasi Bulanan Aset Tetap`,
        accountId: targetAcc.id,
        accountName: targetAcc.name,
        category: 'Biaya Depresiasi',
        amount: totalDepRun,
        type: 'OUT',
        balance: 0, // Not bank related, general ledger adjustment
      };
      const updatedTxs = [tx, ...recentTransactions];
      setRecentTransactions(updatedTxs);
      save('fincorp_txs', updatedTxs);
    }
  };

  const addBankTransfer = (transfer: { fromAccountId: string; toAccountId: string; amount: number; description: string; date: string }) => {
    const fromAcc = bankAccounts.find(b => b.id === transfer.fromAccountId);
    const toAcc = bankAccounts.find(b => b.id === transfer.toAccountId);

    if (!fromAcc || !toAcc || fromAcc.balance < transfer.amount) return;

    const updatedBanks = bankAccounts.map(b => {
      if (b.id === transfer.fromAccountId) {
        return { ...b, balance: b.balance - transfer.amount };
      }
      if (b.id === transfer.toAccountId) {
        return { ...b, balance: b.balance + transfer.amount };
      }
      return b;
    });

    setBankAccounts(updatedBanks);
    save('fincorp_banks', updatedBanks);

    // Record two transactions or a single combined transfer transaction
    const txOut: CashTransaction = {
      id: `tx-out-${Date.now()}`,
      date: transfer.date,
      description: `Transfer ke ${toAcc.name}: ${transfer.description}`,
      accountId: fromAcc.id,
      accountName: fromAcc.name,
      category: 'Transfer Internal',
      amount: transfer.amount,
      type: 'OUT',
      balance: fromAcc.balance - transfer.amount,
    };

    const txIn: CashTransaction = {
      id: `tx-in-${Date.now()}`,
      date: transfer.date,
      description: `Terima dari ${fromAcc.name}: ${transfer.description}`,
      accountId: toAcc.id,
      accountName: toAcc.name,
      category: 'Transfer Internal',
      amount: transfer.amount,
      type: 'IN',
      balance: toAcc.balance + transfer.amount,
    };

    const updatedTxs = [txOut, txIn, ...recentTransactions];
    setRecentTransactions(updatedTxs);
    save('fincorp_txs', updatedTxs);
  };

  const dismissAlert = (id: string) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    save('fincorp_alerts', updated);
  };

  const paySalesInvoice = (id: string) => {
    const updated = salesInvoices.map(inv => {
      if (inv.id === id) {
        return { ...inv, status: 'PAID' as const };
      }
      return inv;
    });
    setSalesInvoices(updated);
    save('fincorp_sales', updated);
    
    // Update Bank Account balance
    const targetInvoice = salesInvoices.find(inv => inv.id === id);
    if (targetInvoice && targetInvoice.status !== 'PAID') {
      const targetBank = bankAccounts.find(b => b.type === 'BANK') || bankAccounts[0];
      if (targetBank) {
        const updatedBanks = bankAccounts.map(b => {
          if (b.id === targetBank.id) {
            return { ...b, balance: b.balance + targetInvoice.grandTotal };
          }
          return b;
        });
        setBankAccounts(updatedBanks);
        save('fincorp_banks', updatedBanks);
        
        // Add transaction
        const tx: CashTransaction = {
          id: `tx-${Date.now()}`,
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          description: `Pelunasan Faktur ${targetInvoice.invoiceNumber} - ${targetInvoice.customerName}`,
          accountId: targetBank.id,
          accountName: targetBank.name,
          category: 'Piutang Usaha',
          amount: targetInvoice.grandTotal,
          type: 'IN',
          balance: targetBank.balance + targetInvoice.grandTotal,
        };
        const updatedTxs = [tx, ...recentTransactions];
        setRecentTransactions(updatedTxs);
        save('fincorp_txs', updatedTxs);
      }
    }
  };

  const payPurchaseInvoice = (id: string) => {
    const updated = purchaseInvoices.map(inv => {
      if (inv.id === id) {
        return { ...inv, status: 'PAID' as const };
      }
      return inv;
    });
    setPurchaseInvoices(updated);
    save('fincorp_purchases', updated);
    
    // Update Bank Account balance
    const targetInvoice = purchaseInvoices.find(inv => inv.id === id);
    if (targetInvoice && targetInvoice.status !== 'PAID') {
      const targetBank = bankAccounts.find(b => b.type === 'BANK') || bankAccounts[0];
      if (targetBank) {
        const updatedBanks = bankAccounts.map(b => {
          if (b.id === targetBank.id) {
            return { ...b, balance: b.balance - targetInvoice.grandTotal };
          }
          return b;
        });
        setBankAccounts(updatedBanks);
        save('fincorp_banks', updatedBanks);
        
        // Add transaction
        const tx: CashTransaction = {
          id: `tx-${Date.now()}`,
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          description: `Pembayaran Pembelian ${targetInvoice.invoiceNumber} - ${targetInvoice.vendorName}`,
          accountId: targetBank.id,
          accountName: targetBank.name,
          category: 'Hutang Usaha',
          amount: targetInvoice.grandTotal,
          type: 'OUT',
          balance: targetBank.balance - targetInvoice.grandTotal,
        };
        const updatedTxs = [tx, ...recentTransactions];
        setRecentTransactions(updatedTxs);
        save('fincorp_txs', updatedTxs);
      }
    }
  };

  const addBankAccount = (bank: Omit<BankAccount, 'id' | 'balance' | 'changePercent'> & { balance: number }) => {
    const newId = `bank-${Date.now()}`;
    const newBank: BankAccount = {
      id: newId,
      changePercent: 0,
      ...bank,
    };
    const updatedBanks = [...bankAccounts, newBank];
    setBankAccounts(updatedBanks);
    save('fincorp_banks', updatedBanks);

    if (bank.balance > 0) {
      const tx: CashTransaction = {
        id: `tx-init-${Date.now()}`,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: `Saldo Awal Rekening ${bank.name}`,
        accountId: newId,
        accountName: bank.name,
        category: 'Saldo Awal',
        amount: bank.balance,
        type: 'IN',
        balance: bank.balance,
      };
      const updatedTxs = [tx, ...recentTransactions];
      setRecentTransactions(updatedTxs);
      save('fincorp_txs', updatedTxs);
    }
  };

  const addCashTransaction = (tx: { accountId: string; description: string; category: string; amount: number; type: 'IN' | 'OUT'; date?: string }) => {
    const targetBank = bankAccounts.find(b => b.id === tx.accountId);
    if (!targetBank) return;

    const change = tx.type === 'IN' ? tx.amount : -tx.amount;
    const updatedBanks = bankAccounts.map(b => {
      if (b.id === tx.accountId) {
        return { ...b, balance: b.balance + change };
      }
      return b;
    });
    setBankAccounts(updatedBanks);
    save('fincorp_banks', updatedBanks);

    const newTx: CashTransaction = {
      id: `tx-adjust-${Date.now()}`,
      date: tx.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      description: tx.description,
      accountId: tx.accountId,
      accountName: targetBank.name,
      category: tx.category,
      amount: tx.amount,
      type: tx.type,
      balance: targetBank.balance + change,
    };
    const updatedTxs = [newTx, ...recentTransactions];
    setRecentTransactions(updatedTxs);
    save('fincorp_txs', updatedTxs);
  };

  const postJournalEntry = (entry: {
    date: string;
    referenceNumber: string;
    description: string;
    lines: {
      accountId: string;
      accountName: string;
      debit: number;
      credit: number;
    }[];
  }) => {
    const updatedAccounts = accounts.map(acc => {
      let balanceChange = 0;
      entry.lines.forEach(line => {
        if (line.accountId === acc.id) {
          const isAssetOrExpense = acc.type === 'ASSET' || acc.type === 'EXPENSE';
          if (isAssetOrExpense) {
            balanceChange += (line.debit - line.credit);
          } else {
            balanceChange += (line.credit - line.debit);
          }
        }
      });
      if (balanceChange !== 0) {
        return { ...acc, balance: acc.balance + balanceChange };
      }
      return acc;
    });

    setAccounts(updatedAccounts);
    save('fincorp_accounts', updatedAccounts);

    const newTransactions: CashTransaction[] = entry.lines.map((line, idx) => ({
      id: `tx-jv-${Date.now()}-${idx}`,
      date: new Date(entry.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      description: `${entry.description} (Jurnal: ${line.accountName})`,
      accountId: line.accountId,
      accountName: line.accountName,
      category: 'Jurnal Umum',
      amount: line.debit > 0 ? line.debit : line.credit,
      type: line.debit > 0 ? 'IN' as const : 'OUT' as const,
      balance: 0,
    }));

    const updatedTxs = [...newTransactions, ...recentTransactions];
    setRecentTransactions(updatedTxs);
    save('fincorp_txs', updatedTxs);
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        company,
        updateCompany,
        accounts,
        addAccount,
        salesInvoices,
        addSalesInvoice,
        purchaseInvoices,
        addPurchaseInvoice,
        fixedAssets,
        addFixedAsset,
        runDepreciation,
        bankAccounts,
        recentTransactions,
        addBankTransfer,
        alerts,
        dismissAlert,
        paySalesInvoice,
        payPurchaseInvoice,
        addBankAccount,
        addCashTransaction,
        postJournalEntry,
        customers,
        vendors
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
}
