'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button, StatusBadge, Alert } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';

interface Deadline {
  id: string;
  name: string;
  dueDate: string; // '2026-12-XX'
  category: 'TAX' | 'AP' | 'AR' | 'OPERATIONAL';
  amount: number;
  description: string;
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED';
  invoiceId?: string;
}

export default function DeadlinesPage() {
  const {
    salesInvoices,
    purchaseInvoices,
    bankAccounts,
    paySalesInvoice,
    payPurchaseInvoice,
    addCashTransaction
  } = useApp();

  // Working Date (Simulation Date: 15 December 2026)
  const workingDate = '2026-12-15';

  // Tax obligations local states (synced with localStorage)
  const [pph21Paid, setPph21Paid] = useState(false);
  const [pph23Paid, setPph23Paid] = useState(false);
  const [ppnPaid, setPpnPaid] = useState(false);

  // Operational checklists local states
  const [opsReconCompleted, setOpsReconCompleted] = useState(false);
  const [opsDeprCompleted, setOpsDeprCompleted] = useState(false);
  const [opsClosingCompleted, setOpsClosingCompleted] = useState(false);

  // Custom user-created deadlines
  const [customDeadlines, setCustomDeadlines] = useState<Deadline[]>([]);

  // Filter and selection states
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // '2026-12-XX'
  const [activeTab, setActiveTab] = useState<'ALL' | 'TAX' | 'AP' | 'AR' | 'OPERATIONAL'>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<Deadline | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  
  // Tax payment specific modal states
  const [billingCode, setBillingCode] = useState('');
  const [isGeneratingBilling, setIsGeneratingBilling] = useState(false);
  const [ntpn, setNtpn] = useState('');

  // Add deadline form fields
  const [newDeadlineName, setNewDeadlineName] = useState('');
  const [newDeadlineCategory, setNewDeadlineCategory] = useState<'TAX' | 'AP' | 'AR' | 'OPERATIONAL'>('OPERATIONAL');
  const [newDeadlineDay, setNewDeadlineDay] = useState(15);
  const [newDeadlineAmount, setNewDeadlineAmount] = useState('');
  const [newDeadlineNotes, setNewDeadlineNotes] = useState('');

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPph21Paid(localStorage.getItem('fincorp_tax_pph21_paid') === 'true');
      setPph23Paid(localStorage.getItem('fincorp_tax_pph23_paid') === 'true');
      setPpnPaid(localStorage.getItem('fincorp_ppn_paid_Des2026') === 'true');

      setOpsReconCompleted(localStorage.getItem('fincorp_ops_recon_completed') === 'true');
      setOpsDeprCompleted(localStorage.getItem('fincorp_ops_depr_completed') === 'true');
      setOpsClosingCompleted(localStorage.getItem('fincorp_ops_closing_completed') === 'true');

      const storedCustom = localStorage.getItem('fincorp_deadlines');
      if (storedCustom) {
        setCustomDeadlines(JSON.parse(storedCustom));
      }
    }
  }, []);

  // Update default selected bank account when bank accounts load
  useEffect(() => {
    if (bankAccounts.length > 0) {
      const bca = bankAccounts.find(b => b.name.includes('BCA')) || bankAccounts[0];
      setSelectedBankAccount(bca.id);
    }
  }, [bankAccounts]);

  // Helper: Get day from date string
  const getDayFromDate = (dateStr: string): number => {
    if (!dateStr) return 15;
    const parts = dateStr.split('-');
    const day = parseInt(parts[2] || '15', 10);
    return isNaN(day) ? 15 : day;
  };

  // Helper: Map dates to December 2026 calendar view
  const mapToDec2026 = (dateStr: string): string => {
    const day = getDayFromDate(dateStr);
    return `2026-12-${day.toString().padStart(2, '0')}`;
  };

  // Dynamic calculations of tax liability amount
  const ppnOutAmount = useMemo(() => {
    return salesInvoices
      .filter(inv => inv.hasTaxInvoice && (inv.status === 'PAID' || inv.status === 'UNPAID' || inv.status === 'OVERDUE'))
      .reduce((sum, inv) => sum + inv.ppnAmount, 0);
  }, [salesInvoices]);

  const ppnInAmount = useMemo(() => {
    return purchaseInvoices.reduce((sum, inv) => sum + inv.ppnAmount, 0);
  }, [purchaseInvoices]);

  const calculatedPpnPayable = useMemo(() => {
    return Math.max(0, ppnOutAmount - ppnInAmount);
  }, [ppnOutAmount, ppnInAmount]);

  // Compile all deadlines (predefined tax, purchase/sales invoices, checklist, and custom)
  const allDeadlines = useMemo((): Deadline[] => {
    const list: Deadline[] = [];

    // 1. Tax obligations
    list.push({
      id: 'tax-pph21',
      name: 'Penyetoran PPh 21 (Masa Nov 2026)',
      dueDate: '2026-12-10',
      category: 'TAX',
      amount: 12500000,
      description: 'Penyetoran PPh Pasal 21 atas Gaji & Upah Karyawan Bulan November 2026.',
      status: pph21Paid ? 'COMPLETED' : 'OVERDUE',
    });

    list.push({
      id: 'tax-pph23',
      name: 'Penyetoran PPh 23 (Masa Nov 2026)',
      dueDate: '2026-12-15',
      category: 'TAX',
      amount: 3250000,
      description: 'Penyetoran PPh Pasal 23 atas Jasa & Sewa Bulan November 2026.',
      status: pph23Paid ? 'COMPLETED' : 'PENDING',
    });

    list.push({
      id: 'tax-ppn',
      name: 'Lapor SPT Masa PPN (Masa Nov 2026)',
      dueDate: '2026-12-31',
      category: 'TAX',
      amount: ppnPaid ? 0 : calculatedPpnPayable,
      description: 'Pelaporan SPT Masa PPN & Setor PPN Kurang Bayar Masa November 2026.',
      status: ppnPaid ? 'COMPLETED' : 'PENDING',
    });

    // 2. Accounts Payable (Purchase Invoices)
    purchaseInvoices.forEach(inv => {
      const targetDate = mapToDec2026(inv.dueDate);
      const isCompleted = inv.status === 'PAID';
      
      let status: 'COMPLETED' | 'OVERDUE' | 'PENDING' = 'PENDING';
      if (isCompleted) {
        status = 'COMPLETED';
      } else if (targetDate < workingDate) {
        status = 'OVERDUE';
      }

      list.push({
        id: `ap-${inv.id}`,
        name: `Bayar Tagihan Vendor ${inv.invoiceNumber} - ${inv.vendorName}`,
        dueDate: targetDate,
        category: 'AP',
        amount: inv.grandTotal,
        description: `Melunasi tagihan vendor untuk pembelian barang/jasa.`,
        status,
        invoiceId: inv.id
      });
    });

    // 3. Accounts Receivable (Sales Invoices)
    salesInvoices.forEach(inv => {
      const targetDate = mapToDec2026(inv.dueDate);
      const isCompleted = inv.status === 'PAID';

      let status: 'COMPLETED' | 'OVERDUE' | 'PENDING' = 'PENDING';
      if (isCompleted) {
        status = 'COMPLETED';
      } else if (targetDate < workingDate) {
        status = 'OVERDUE';
      }

      list.push({
        id: `ar-${inv.id}`,
        name: `Terima Pelunasan Faktur ${inv.invoiceNumber} - ${inv.customerName}`,
        dueDate: targetDate,
        category: 'AR',
        amount: inv.grandTotal,
        description: `Mencatat pembayaran masuk piutang dari pelanggan.`,
        status,
        invoiceId: inv.id
      });
    });

    // 4. Operational closing checklist
    list.push({
      id: 'ops-recon',
      name: 'Rekonsiliasi Kas & Bank Bulanan',
      dueDate: '2026-12-28',
      category: 'OPERATIONAL',
      amount: 0,
      description: 'Mencocokkan buku ledger kas dengan rekening koran bank periode Desember 2026.',
      status: opsReconCompleted ? 'COMPLETED' : 'PENDING',
    });

    list.push({
      id: 'ops-depr',
      name: 'Jurnal Depresiasi Bulanan Aset',
      dueDate: '2026-12-30',
      category: 'OPERATIONAL',
      amount: 0,
      description: 'Melakukan posting depresiasi otomatis untuk seluruh aset tetap aktif.',
      status: opsDeprCompleted ? 'COMPLETED' : 'PENDING',
    });

    list.push({
      id: 'ops-closing',
      name: 'Closing Ledger Bulanan (Tutup Buku)',
      dueDate: '2026-12-31',
      category: 'OPERATIONAL',
      amount: 0,
      description: 'Mengunci pembukuan periode Desember 2026 dan memverifikasi laporan laba rugi.',
      status: opsClosingCompleted ? 'COMPLETED' : 'PENDING',
    });

    // 5. Custom user deadlines
    customDeadlines.forEach(item => {
      const isCompleted = item.status === 'COMPLETED';
      let status = item.status;
      if (!isCompleted && item.dueDate < workingDate) {
        status = 'OVERDUE';
      }
      list.push({
        ...item,
        status
      });
    });

    // Sort by due date chronologically
    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [
    purchaseInvoices,
    salesInvoices,
    pph21Paid,
    pph23Paid,
    ppnPaid,
    calculatedPpnPayable,
    opsReconCompleted,
    opsDeprCompleted,
    opsClosingCompleted,
    customDeadlines
  ]);

  // Calendar setup: December 2026
  const calendarCells = useMemo(() => {
    const cells = [];
    // December 2026 starts on Tuesday (Monday is index 0 in our grid, so Tuesday is index 1. Add 1 null cell for Monday)
    cells.push(null);
    for (let i = 1; i <= 31; i++) {
      cells.push(i);
    }
    return cells;
  }, []);

  // Map of date (day number) -> categories on that day
  const dayDeadlinesMap = useMemo(() => {
    const map: Record<number, { category: 'TAX' | 'AP' | 'AR' | 'OPERATIONAL'; isCompleted: boolean }[]> = {};
    allDeadlines.forEach(item => {
      const day = getDayFromDate(item.dueDate);
      if (!map[day]) {
        map[day] = [];
      }
      map[day].push({
        category: item.category,
        isCompleted: item.status === 'COMPLETED'
      });
    });
    return map;
  }, [allDeadlines]);

  // KPIs
  const urgentCount = useMemo(() => {
    return allDeadlines.filter(item => {
      if (item.status === 'COMPLETED') return false;
      const day = getDayFromDate(item.dueDate);
      return day >= 15 && day <= 18; // Next 3 days including today
    }).length;
  }, [allDeadlines]);

  const overdueCount = useMemo(() => {
    return allDeadlines.filter(item => item.status === 'OVERDUE').length;
  }, [allDeadlines]);

  const totalExposure = useMemo(() => {
    return allDeadlines
      .filter(item => item.status !== 'COMPLETED' && (item.category === 'AP' || item.category === 'TAX'))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [allDeadlines]);

  const completedCount = useMemo(() => {
    return allDeadlines.filter(item => item.status === 'COMPLETED').length;
  }, [allDeadlines]);

  // Filtered agenda list
  const filteredDeadlines = useMemo(() => {
    return allDeadlines.filter(item => {
      // Date filter
      if (selectedDate && item.dueDate !== selectedDate) {
        return false;
      }
      // Category filter
      if (activeTab !== 'ALL' && item.category !== activeTab) {
        return false;
      }
      return true;
    });
  }, [allDeadlines, selectedDate, activeTab]);

  // Relative remaining days calculator
  const getRelativeDateText = (dueDateStr: string, isCompleted: boolean) => {
    if (isCompleted) {
      return { text: 'Selesai (Lunas)', color: 'text-success-positive bg-success-positive/10 border-success-positive/20' };
    }
    
    const dueDay = getDayFromDate(dueDateStr);
    const diff = dueDay - 15; // working day is 15 Dec

    if (diff < 0) {
      return { text: `Terlambat ${Math.abs(diff)} hari`, color: 'text-error bg-error-container/10 border-error-container/20 font-bold' };
    } else if (diff === 0) {
      return { text: 'Hari Ini', color: 'text-warning-deadline bg-warning-deadline/10 border-warning-deadline/20 font-bold animate-pulse' };
    } else if (diff <= 3) {
      return { text: `Mendesak (${diff} hari lagi)`, color: 'text-warning-deadline bg-warning-deadline/10 border-warning-deadline/20 font-semibold' };
    } else {
      return { text: `${diff} hari lagi`, color: 'text-secondary bg-secondary/10 border-secondary/20' };
    }
  };

  // Actions
  const handleOpenPayment = (item: Deadline) => {
    setSelectedPaymentItem(item);
    setBillingCode('');
    setNtpn('');
    // Select default bank account
    if (bankAccounts.length > 0) {
      const bca = bankAccounts.find(b => b.name.includes('BCA')) || bankAccounts[0];
      setSelectedBankAccount(bca.id);
    }
  };

  const handleGenerateBillingCode = () => {
    setIsGeneratingBilling(true);
    setTimeout(() => {
      const randomCode = '82026' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
      setBillingCode(randomCode);
      const randomNtpn = Math.random().toString(36).substring(2, 10).toUpperCase() + Math.floor(1000 + Math.random() * 9000).toString();
      setNtpn(randomNtpn);
      setIsGeneratingBilling(false);
    }, 800);
  };

  const executePayment = () => {
    if (!selectedPaymentItem) return;

    const account = bankAccounts.find(b => b.id === selectedBankAccount);
    if (!account) {
      alert('Pilih rekening pembayaran.');
      return;
    }

    const amount = selectedPaymentItem.amount;

    // Validation
    if (selectedPaymentItem.category === 'AP' || selectedPaymentItem.category === 'TAX') {
      if (account.balance < amount) {
        alert('Saldo kas/bank tidak mencukupi untuk melakukan pembayaran.');
        return;
      }
    }

    // Process payment by category
    if (selectedPaymentItem.category === 'AP') {
      // Settle invoice
      if (selectedPaymentItem.invoiceId) {
        payPurchaseInvoice(selectedPaymentItem.invoiceId);
      }
    } else if (selectedPaymentItem.category === 'AR') {
      // Settle receivable
      if (selectedPaymentItem.invoiceId) {
        paySalesInvoice(selectedPaymentItem.invoiceId);
      }
    } else if (selectedPaymentItem.category === 'TAX') {
      // Record cash transaction out
      addCashTransaction({
        accountId: account.id,
        description: `${selectedPaymentItem.name} via NTPN ${ntpn}`,
        category: 'Biaya Operasional',
        amount: amount,
        type: 'OUT',
      });

      // Update local storage status
      if (selectedPaymentItem.id === 'tax-pph21') {
        setPph21Paid(true);
        localStorage.setItem('fincorp_tax_pph21_paid', 'true');
      } else if (selectedPaymentItem.id === 'tax-pph23') {
        setPph23Paid(true);
        localStorage.setItem('fincorp_tax_pph23_paid', 'true');
      } else if (selectedPaymentItem.id === 'tax-ppn') {
        setPpnPaid(true);
        localStorage.setItem('fincorp_ppn_paid_Des2026', 'true');
      } else if (selectedPaymentItem.id.startsWith('custom-')) {
        // Custom tax
        const updated = customDeadlines.map(item => {
          if (item.id === selectedPaymentItem.id) {
            return { ...item, status: 'COMPLETED' as const };
          }
          return item;
        });
        setCustomDeadlines(updated);
        localStorage.setItem('fincorp_deadlines', JSON.stringify(updated));
      }
    }

    alert(`Pelunasan berhasil diproses menggunakan rekening ${account.name}!`);
    setSelectedPaymentItem(null);
  };

  // Operational Checklist Toggle Action
  const toggleOperational = (id: string) => {
    if (id === 'ops-recon') {
      const next = !opsReconCompleted;
      setOpsReconCompleted(next);
      localStorage.setItem('fincorp_ops_recon_completed', next ? 'true' : 'false');
    } else if (id === 'ops-depr') {
      const next = !opsDeprCompleted;
      setOpsDeprCompleted(next);
      localStorage.setItem('fincorp_ops_depr_completed', next ? 'true' : 'false');
    } else if (id === 'ops-closing') {
      const next = !opsClosingCompleted;
      setOpsClosingCompleted(next);
      localStorage.setItem('fincorp_ops_closing_completed', next ? 'true' : 'false');
    }
  };

  // Toggle Custom Deadline
  const toggleCustomDeadline = (id: string) => {
    const updated = customDeadlines.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        return { ...item, status: nextStatus as any };
      }
      return item;
    });
    setCustomDeadlines(updated);
    localStorage.setItem('fincorp_deadlines', JSON.stringify(updated));
  };

  // Delete Custom Deadline
  const deleteCustomDeadline = (id: string) => {
    if (confirm('Hapus agenda ini?')) {
      const updated = customDeadlines.filter(item => item.id !== id);
      setCustomDeadlines(updated);
      localStorage.setItem('fincorp_deadlines', JSON.stringify(updated));
      if (selectedDate && getDayFromDate(selectedDate) === getDayFromDate(id)) {
        setSelectedDate(null);
      }
    }
  };

  // Add Custom Deadline handler
  const handleAddDeadlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineName) {
      alert('Masukkan nama agenda.');
      return;
    }

    const newItem: Deadline = {
      id: `custom-${Date.now()}`,
      name: newDeadlineName,
      dueDate: `2026-12-${newDeadlineDay.toString().padStart(2, '0')}`,
      category: newDeadlineCategory,
      amount: parseFloat(newDeadlineAmount) || 0,
      description: newDeadlineNotes,
      status: 'PENDING',
    };

    const updated = [...customDeadlines, newItem];
    setCustomDeadlines(updated);
    localStorage.setItem('fincorp_deadlines', JSON.stringify(updated));

    // Reset Form
    setNewDeadlineName('');
    setNewDeadlineCategory('OPERATIONAL');
    setNewDeadlineDay(15);
    setNewDeadlineAmount('');
    setNewDeadlineNotes('');
    setIsAddModalOpen(false);

    alert('Agenda tenggat waktu baru berhasil ditambahkan!');
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Working Date Banner */}
        <div className="glass-card border border-warning-deadline/20 bg-warning-deadline/5 rounded-2xl px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-warning-deadline animate-pulse">info</span>
            <div>
              <span className="text-xs font-semibold text-warning-deadline uppercase tracking-wider block">Mode Simulasi Buku</span>
              <span className="text-sm font-bold text-on-surface">Tanggal Kerja Sistem: <span className="underline decoration-warning-deadline font-black text-secondary">15 Desember 2026</span></span>
            </div>
          </div>
          <div className="text-[11px] text-on-surface-variant font-medium bg-surface-container/60 border border-border-subtle/30 px-3 py-1 rounded-xl">
            Tenggat dihitung relatif terhadap tanggal kerja ini
          </div>
        </div>

        {/* Page Header */}
        <PageHeader
          title="Tenggat Waktu & Kepatuhan"
          description="Pusat pemantauan kewajiban perpajakan (SPT/SSP), jatuh tempo utang-piutang dagang, dan checklist operasional tutup buku."
          actions={
            <Button
              variant="primary"
              icon="add"
              onClick={() => setIsAddModalOpen(true)}
            >
              Tambah Agenda Baru
            </Button>
          }
        />

        {/* Bento Grid KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Urgent */}
          <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-warning-deadline/40 transition-all duration-300 relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-warning-deadline`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning-deadline/10 text-warning-deadline flex items-center justify-center border border-warning-deadline/20 shadow-sm">
                <span className="material-symbols-outlined">notification_important</span>
              </div>
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] text-warning-deadline bg-warning-deadline/15 border border-warning-deadline/30 animate-pulse">
                  MENDESAK
                </span>
              )}
            </div>
            <div>
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">
                Tenggat Mendesak (3 Hari)
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-primary dark:text-inverse-primary">
                {urgentCount} <span className="text-sm font-semibold text-on-surface-variant">Agenda</span>
              </h3>
            </div>
            <div className="mt-4 pt-4 border-t border-border-subtle/50 flex justify-between items-center text-[11px] text-on-surface-variant font-medium">
              <span>Jatuh tempo 15 - 18 Des</span>
            </div>
          </div>

          {/* KPI 2: Overdue */}
          <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-error/40 transition-all duration-300 relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-error`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-error-container/20 text-error flex items-center justify-center border border-error-container/40 shadow-sm">
                <span className="material-symbols-outlined">warning</span>
              </div>
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] text-error bg-error-container/30 border border-error-container/50 animate-bounce">
                  TERLAMBAT
                </span>
              )}
            </div>
            <div>
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">
                Agenda Terlambat
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-primary dark:text-inverse-primary">
                {overdueCount} <span className="text-sm font-semibold text-on-surface-variant">Agenda</span>
              </h3>
            </div>
            <div className="mt-4 pt-4 border-t border-border-subtle/50 flex justify-between items-center text-[11px] text-on-surface-variant font-medium">
              <span>Sebelum 15 Des belum lunas</span>
            </div>
          </div>

          {/* KPI 3: Total Exposure */}
          <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-secondary-container/40 transition-all duration-300 relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-secondary`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/10 text-secondary flex items-center justify-center border border-secondary-container/20 shadow-sm">
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>
            <div>
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">
                Total Kewajiban Terutang
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-primary dark:text-inverse-primary">
                {formatCurrency(totalExposure)}
              </h3>
            </div>
            <div className="mt-4 pt-4 border-t border-border-subtle/50 flex justify-between items-center text-[11px] text-on-surface-variant font-medium">
              <span>Belanja Supplier & Pajak</span>
            </div>
          </div>

          {/* KPI 4: Completed YTD */}
          <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-success-positive/40 transition-all duration-300 relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-success-positive`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-xl bg-success-positive/10 text-success-positive flex items-center justify-center border border-success-positive/20 shadow-sm">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
            </div>
            <div>
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">
                Terselesaikan Bulan Ini
              </p>
              <h3 className="text-2xl font-bold tracking-tight text-primary dark:text-inverse-primary">
                {completedCount} <span className="text-sm font-semibold text-on-surface-variant">Selesai</span>
              </h3>
            </div>
            <div className="mt-4 pt-4 border-t border-border-subtle/50 flex justify-between items-center text-[11px] text-on-surface-variant font-medium">
              <span>Dari total {allDeadlines.length} agenda aktif</span>
            </div>
          </div>

        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Interactive Calendar (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-border-subtle/40 relative">
              
              {/* Calendar Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-primary dark:text-inverse-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">calendar_month</span>
                    Kalender Kepatuhan Desember 2026
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Pilih tanggal untuk memfilter daftar agenda di sebelah kanan</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-surface-container/60 border border-border-subtle/30 rounded-xl p-1 shrink-0">
                    <button className="p-1 text-on-surface-variant/40 cursor-not-allowed" disabled>
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <span className="text-xs font-bold text-on-surface px-2">Desember 2026</span>
                    <button className="p-1 text-on-surface-variant/40 cursor-not-allowed" disabled>
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                  {selectedDate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDate(null)}
                      icon="restart_alt"
                    >
                      Reset Filter
                    </Button>
                  )}
                </div>
              </div>

              {/* Day Name Headers */}
              <div className="grid grid-cols-7 gap-2 text-center border-b border-border-subtle/40 pb-2 mb-2 font-bold text-xs tracking-wider text-on-surface-variant">
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
                <span className="text-error">Min</span>
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-2.5">
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="aspect-square bg-surface-container/10 rounded-xl opacity-30 border border-border-subtle/10"></div>;
                  }

                  const dateStr = `2026-12-${day.toString().padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isToday = day === 15; // working simulation date is Dec 15
                  const categories = Array.from(new Set((dayDeadlinesMap[day] || []).map(i => i.category)));
                  const isAllDayCompleted = (dayDeadlinesMap[day] || []).every(i => i.isCompleted) && (dayDeadlinesMap[day] || []).length > 0;

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`
                        aspect-square relative rounded-xl p-1.5 flex flex-col justify-between border transition-all duration-200 group
                        ${isSelected 
                          ? 'bg-secondary text-white border-secondary ring-2 ring-secondary/20 shadow-lg shadow-secondary/15 scale-102 font-bold z-10' 
                          : isToday 
                            ? 'bg-warning-deadline/10 text-on-surface border-warning-deadline ring-1 ring-warning-deadline/40' 
                            : 'bg-surface-container-low hover:bg-surface-container hover:border-secondary-container/50 border-border-subtle/30 text-on-surface'
                        }
                      `}
                    >
                      {/* Day Number and Check icon if completed */}
                      <div className="w-full flex justify-between items-start">
                        <span className={`text-[12px] md:text-sm font-semibold tracking-tight ${day === 6 || day === 13 || day === 20 || day === 27 ? 'text-error group-hover:text-error' : ''} ${isSelected ? 'text-white' : ''}`}>
                          {day}
                        </span>
                        {isAllDayCompleted && (
                          <span className={`material-symbols-outlined text-[13px] font-bold ${isSelected ? 'text-white' : 'text-success-positive animate-pulse'}`}>
                            check_circle
                          </span>
                        )}
                      </div>

                      {/* Dot indicators */}
                      <div className="flex flex-wrap gap-0.5 justify-center w-full mt-1">
                        {categories.map(cat => {
                          let dotColor = 'bg-secondary';
                          if (cat === 'TAX') dotColor = 'bg-error';
                          if (cat === 'AP') dotColor = 'bg-warning-deadline';
                          if (cat === 'AR') dotColor = 'bg-secondary';
                          if (cat === 'OPERATIONAL') dotColor = 'bg-success-positive';

                          return (
                            <span
                              key={cat}
                              className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isSelected ? 'bg-white border border-secondary' : ''}`}
                              title={cat}
                            />
                          );
                        })}
                      </div>

                      {/* Selected Indicator Ring on today */}
                      {isToday && !isSelected && (
                        <span className="absolute inset-0 border border-warning-deadline rounded-xl animate-ping opacity-25"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 pt-5 border-t border-border-subtle/40 text-[11px] text-on-surface-variant font-medium">
                <span className="font-bold uppercase tracking-wider text-[10px] text-on-surface-variant/70">KATEGORI:</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-error"></span> Pajak (TAX)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warning-deadline"></span> Tagihan Vendor (AP)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary"></span> Piutang Customer (AR)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success-positive"></span> Checklist Operasional</span>
                <span className="flex items-center gap-1.5 ml-auto"><span className="material-symbols-outlined text-[13px] text-success-positive">check_circle</span> Hari Selesai</span>
              </div>
            </div>

            {/* Compliance Info Banner */}
            <div className="glass-card rounded-2xl p-6 border border-border-subtle/40 bg-surface-container-low">
              <h4 className="text-sm font-bold text-primary dark:text-inverse-primary flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-secondary text-[20px]">security</span>
                Kepatuhan Pajak & Operasional Perusahaan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-on-surface-variant">
                <div className="bg-surface-container/40 p-3.5 rounded-xl border border-border-subtle/20">
                  <span className="font-semibold text-primary block mb-1">Pajak Penghasilan (PPh 21 / 23)</span>
                  Batas penyetoran PPh Pasal 21 dan Pasal 23 ke kas negara adalah tanggal 10 dan 15 bulan berikutnya. Keterlambatan dikenakan denda administrasi sesuai UU KUP.
                </div>
                <div className="bg-surface-container/40 p-3.5 rounded-xl border border-border-subtle/20">
                  <span className="font-semibold text-primary block mb-1">Pajak Pertambahan Nilai (PPN)</span>
                  SPT Masa PPN wajib disetorkan dan dilaporkan paling lambat pada hari kerja terakhir bulan berikutnya. Faktur pajak keluaran wajib di-sync ke e-Faktur DJP.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Agenda List & Detail Panel (1/3 width) */}
          <div className="space-y-4">
            
            {/* Category Tab Filter */}
            <div className="bg-surface-container-high/60 border border-border-subtle/30 rounded-2xl p-1 flex w-full">
              {(['ALL', 'TAX', 'AP', 'AR', 'OPERATIONAL'] as const).map(tab => {
                const tabLabels = {
                  ALL: 'Semua',
                  TAX: 'Pajak',
                  AP: 'Utang',
                  AR: 'Piutang',
                  OPERATIONAL: 'Ops'
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      flex-1 py-2 text-[11px] font-bold rounded-xl transition-all duration-200 uppercase tracking-wider
                      ${activeTab === tab
                        ? 'bg-secondary text-white shadow-md'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/30'
                      }
                    `}
                  >
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Agenda Container Card */}
            <div className="glass-card rounded-2xl p-5 border border-border-subtle/40 flex flex-col h-[525px]">
              
              {/* Agenda List Header */}
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-border-subtle/30">
                <div>
                  <h4 className="text-sm font-bold text-primary dark:text-inverse-primary uppercase tracking-wide">
                    {selectedDate 
                      ? `Agenda: ${getDayFromDate(selectedDate)} Des 2026` 
                      : 'Semua Agenda Desember'
                    }
                  </h4>
                  <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                    Menampilkan {filteredDeadlines.length} agenda kepatuhan
                  </p>
                </div>
                {selectedDate && (
                  <span className="text-[10px] font-bold text-secondary-container bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">
                    Terfilter
                  </span>
                )}
              </div>

              {/* Agenda List Scroll Area */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
                {filteredDeadlines.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant opacity-75">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-2">event_busy</span>
                    <p className="text-xs font-semibold">Tidak ada agenda untuk filter ini.</p>
                    <p className="text-[10px] mt-1">Gunakan kalender atau filter kategori untuk melihat agenda lainnya.</p>
                  </div>
                ) : (
                  filteredDeadlines.map(item => {
                    const isCompleted = item.status === 'COMPLETED';
                    const rel = getRelativeDateText(item.dueDate, isCompleted);
                    
                    // Left indicator stripe color
                    let stripeColor = 'bg-secondary';
                    if (item.category === 'TAX') stripeColor = 'bg-error';
                    if (item.category === 'AP') stripeColor = 'bg-warning-deadline';
                    if (item.category === 'AR') stripeColor = 'bg-secondary';
                    if (item.category === 'OPERATIONAL') stripeColor = 'bg-success-positive';

                    return (
                      <div
                        key={item.id}
                        className={`
                          bg-surface-container-low hover:bg-surface-container border border-border-subtle/30 hover:border-border-subtle rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-inner relative overflow-hidden transition-all duration-200 hover:shadow-md
                          ${isCompleted ? 'opacity-75 border-dashed' : ''}
                        `}
                      >
                        {/* Category Left Stripe Accent */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripeColor}`}></div>

                        {/* Top Section */}
                        <div className="pl-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[12.5px] font-bold text-on-surface tracking-tight leading-snug hover:text-secondary transition-colors duration-150">
                              {item.name}
                            </span>
                            
                            {/* Delete custom button */}
                            {item.id.startsWith('custom-') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteCustomDeadline(item.id); }}
                                className="text-on-surface-variant/40 hover:text-error hover:bg-error/5 p-1 rounded-lg transition-all"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>
                          
                          <p className="text-[10.5px] text-on-surface-variant mt-1 leading-relaxed opacity-85">
                            {item.description}
                          </p>
                        </div>

                        {/* Middle Info Row */}
                        <div className="pl-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle/20 pt-2.5">
                          <div>
                            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">JATUH TEMPO</span>
                            <span className="text-xs font-bold text-on-surface flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px] text-on-surface-variant">schedule</span>
                              {getDayFromDate(item.dueDate)} Des 2026
                            </span>
                          </div>
                          
                          {item.amount > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">NOMINAL</span>
                              <span className="text-xs font-bold text-primary dark:text-inverse-primary tracking-tight block mt-0.5">
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions Row */}
                        <div className="pl-1.5 flex items-center justify-between gap-2 mt-1">
                          
                          {/* Relative Due Badge */}
                          <span className={`px-2 py-0.5 text-[9.5px] font-bold rounded-full border ${rel.color}`}>
                            {rel.text}
                          </span>

                          {/* Action Button */}
                          {isCompleted ? (
                            <span className="text-[11px] font-bold text-success-positive flex items-center gap-1 px-2.5 py-1">
                              <span className="material-symbols-outlined text-[15px]">verified</span>
                              Selesai
                            </span>
                          ) : (
                            <>
                              {/* AP Pay Button */}
                              {item.category === 'AP' && (
                                <button
                                  onClick={() => handleOpenPayment(item)}
                                  className="text-[11px] font-bold text-white bg-warning-deadline hover:bg-warning-deadline/90 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 duration-150"
                                >
                                  Bayar Tagihan
                                </button>
                              )}

                              {/* AR Recieve Button */}
                              {item.category === 'AR' && (
                                <button
                                  onClick={() => handleOpenPayment(item)}
                                  className="text-[11px] font-bold text-white bg-secondary hover:bg-secondary/90 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 duration-150"
                                >
                                  Catat Pelunasan
                                </button>
                              )}

                              {/* Tax Pay Button */}
                              {item.category === 'TAX' && (
                                <button
                                  onClick={() => handleOpenPayment(item)}
                                  className="text-[11px] font-bold text-white bg-error hover:bg-error/90 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 duration-150"
                                >
                                  Bayar Pajak
                                </button>
                              )}

                              {/* Operational Toggle */}
                              {item.category === 'OPERATIONAL' && (
                                <button
                                  onClick={() => toggleOperational(item.id)}
                                  className="text-[11px] font-bold text-secondary hover:bg-secondary/5 border border-secondary/20 hover:border-secondary/40 px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 duration-150"
                                >
                                  Selesaikan
                                </button>
                              )}

                              {/* Custom Deadline Toggle */}
                              {item.id.startsWith('custom-') && item.category !== 'TAX' && item.category !== 'AP' && item.category !== 'AR' && (
                                <button
                                  onClick={() => toggleCustomDeadline(item.id)}
                                  className="text-[11px] font-bold text-secondary hover:bg-secondary/5 border border-secondary/20 hover:border-secondary/40 px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 duration-150"
                                >
                                  Selesaikan
                                </button>
                              )}
                            </>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

        </div>

        {/* MODAL 1: Tambah Agenda Baru */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-border-subtle shadow-2xl relative animate-scale-up">
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-base font-bold text-primary dark:text-inverse-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">add_circle</span>
                    Tambah Agenda Tenggat Baru
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Tambahkan agenda pajak, utang, piutang, atau operasional baru.</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container/60 p-1.5 rounded-full transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleAddDeadlineSubmit} className="space-y-4">
                
                {/* Nama Agenda */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nama Kegiatan / Agenda</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pembayaran Pajak PPh 21 Final"
                    value={newDeadlineName}
                    onChange={(e) => setNewDeadlineName(e.target.value)}
                    className="w-full bg-surface-container/40 border border-border-subtle/50 focus:border-secondary focus:ring-1 focus:ring-secondary/35 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  />
                </div>

                {/* Kategori & Tanggal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Kategori</label>
                    <select
                      value={newDeadlineCategory}
                      onChange={(e) => setNewDeadlineCategory(e.target.value as any)}
                      className="w-full bg-surface-container/40 border border-border-subtle/50 focus:border-secondary focus:ring-1 focus:ring-secondary/35 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                    >
                      <option value="OPERATIONAL">Operasional</option>
                      <option value="TAX">Pajak</option>
                      <option value="AP">Utang Vendor (AP)</option>
                      <option value="AR">Piutang Customer (AR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Tanggal (Desember 2026)</label>
                    <select
                      value={newDeadlineDay}
                      onChange={(e) => setNewDeadlineDay(parseInt(e.target.value, 10))}
                      className="w-full bg-surface-container/40 border border-border-subtle/50 focus:border-secondary focus:ring-1 focus:ring-secondary/35 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day} Desember 2026</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nominal */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Nominal Uang (Opsional - Rp)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newDeadlineAmount}
                    onChange={(e) => setNewDeadlineAmount(e.target.value)}
                    className="w-full bg-surface-container/40 border border-border-subtle/50 focus:border-secondary focus:ring-1 focus:ring-secondary/35 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  />
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Deskripsi / Keterangan</label>
                  <textarea
                    placeholder="Tulis detail catatan agenda..."
                    value={newDeadlineNotes}
                    onChange={(e) => setNewDeadlineNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-surface-container/40 border border-border-subtle/50 focus:border-secondary focus:ring-1 focus:ring-secondary/35 rounded-xl px-4 py-2 text-sm outline-none transition-all resize-none"
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle/30">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    type="button"
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                  >
                    Simpan Agenda
                  </Button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* MODAL 2: Pelunasan & Tindakan Terintegrasi */}
        {selectedPaymentItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg glass-card rounded-3xl p-6 border border-border-subtle shadow-2xl relative animate-scale-up">
              
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-5 pb-3 border-b border-border-subtle/30">
                <div>
                  <h3 className="text-base font-bold text-primary dark:text-inverse-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">payments</span>
                    {selectedPaymentItem.category === 'TAX' && 'Surat Setoran Pajak (SSP)'}
                    {selectedPaymentItem.category === 'AP' && 'Bayar Tagihan Vendor (AP)'}
                    {selectedPaymentItem.category === 'AR' && 'Catat Pembayaran Masuk (AR)'}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">Konfirmasi dan proses transaksi keuangan secara riil.</p>
                </div>
                <button
                  onClick={() => setSelectedPaymentItem(null)}
                  className="text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container/60 p-1.5 rounded-full transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4">
                
                {/* SSP Specific Layout */}
                {selectedPaymentItem.category === 'TAX' ? (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 space-y-3.5">
                    <div className="border-b border-dashed border-border-subtle/30 pb-2 mb-2 text-center text-xs font-bold tracking-widest text-on-surface-variant">
                      KEMENTERIAN KEUANGAN RI - DIREKTORAT JENDERAL PAJAK
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-xs text-on-surface-variant pl-1">
                      <div><span className="font-semibold text-primary block">Wajib Pajak (WP):</span> PT FinCorp Indonesia</div>
                      <div><span className="font-semibold text-primary block">NPWP:</span> 01.234.567.8-901.000</div>
                      
                      <div className="mt-1">
                        <span className="font-semibold text-primary block">Masa Pajak:</span> 
                        Desember 2026 (Masa Pajak Nov 2026)
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold text-primary block">Jenis Setoran:</span> 
                        {selectedPaymentItem.id === 'tax-ppn' ? 'KAP 411211 / KJS 100 (PPN DN)' : 'KAP 411121 / KJS 100 (PPh Masa)'}
                      </div>

                      <div className="mt-1 col-span-2">
                        <span className="font-semibold text-primary block">Nama Agenda / Detail:</span> 
                        {selectedPaymentItem.name}
                      </div>
                    </div>

                    <div className="bg-surface-container-high/60 rounded-xl p-3 border border-border-subtle/20 mt-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-on-surface">Jumlah Setoran Pajak:</span>
                      <span className="text-sm font-black text-error font-tabular-nums">{formatCurrency(selectedPaymentItem.amount)}</span>
                    </div>

                    {/* ID Billing Generator */}
                    <div className="pt-3 border-t border-border-subtle/20 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Kode Billing DJP (15-digit)</label>
                          <input
                            type="text"
                            readOnly
                            placeholder="Kode Billing belum dibuat"
                            value={billingCode}
                            className="w-full bg-surface-container/60 border border-border-subtle/50 rounded-xl px-3 py-2 text-xs outline-none font-mono text-primary font-bold"
                          />
                        </div>
                        <div className="pt-4 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isGeneratingBilling || billingCode !== ''}
                            onClick={handleGenerateBillingCode}
                          >
                            {isGeneratingBilling ? 'Proses...' : billingCode ? 'Billing ID Ready' : 'Buat ID Billing'}
                          </Button>
                        </div>
                      </div>

                      {billingCode && (
                        <div className="animate-slide-up mt-1.5">
                          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Nomor Transaksi Penerimaan Negara (NTPN)</label>
                          <input
                            type="text"
                            readOnly
                            value={ntpn}
                            className="w-full bg-surface-container/60 border border-border-subtle/50 rounded-xl px-3 py-2 text-xs font-mono text-success-positive font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Invoice specific layout (AP / AR)
                  <div className="bg-surface-container-low border border-border-subtle/30 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs text-on-surface-variant">
                      <div>
                        <span className="font-semibold text-primary block">Kegiatan:</span>
                        {selectedPaymentItem.name}
                      </div>
                      <div>
                        <span className="font-semibold text-primary block">Tipe Kewajiban:</span>
                        {selectedPaymentItem.category === 'AP' ? 'Utang Dagang (Faktur Pembelian)' : 'Piutang Dagang (Faktur Penjualan)'}
                      </div>
                      <div>
                        <span className="font-semibold text-primary block">Batas Jatuh Tempo:</span>
                        {getDayFromDate(selectedPaymentItem.dueDate)} Desember 2026
                      </div>
                      <div>
                        <span className="font-semibold text-primary block">Detail Keterangan:</span>
                        {selectedPaymentItem.description}
                      </div>
                    </div>
                    <div className="bg-surface-container-high/60 rounded-xl p-3 border border-border-subtle/20 mt-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-on-surface">Total Nominal Pelunasan:</span>
                      <span className="text-sm font-black text-primary font-tabular-nums">{formatCurrency(selectedPaymentItem.amount)}</span>
                    </div>
                  </div>
                )}

                {/* Cash Account Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    {selectedPaymentItem.category === 'AR' ? 'Setor Kas Masuk Ke:' : 'Sumber Dana Kas / Bank:'}
                  </label>
                  <select
                    value={selectedBankAccount}
                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                    className="w-full bg-surface-container/40 border border-border-subtle/50 focus:border-secondary focus:ring-1 focus:ring-secondary/35 rounded-xl px-3 py-2.5 text-xs outline-none transition-all font-semibold"
                  >
                    {bankAccounts.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} (Saldo: {formatCurrency(bank.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action controls */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border-subtle/30 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPaymentItem(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    onClick={executePayment}
                    disabled={selectedPaymentItem.category === 'TAX' && !billingCode}
                    icon="task_alt"
                  >
                    {selectedPaymentItem.category === 'AR' ? 'Konfirmasi Terima Dana' : 'Konfirmasi Bayar'}
                  </Button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
