'use client';

import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatPercent } from '@/data';
import type { Account, CashTransaction } from '@/data/types';

export default function AccountingPage() {
  const {
    accounts,
    recentTransactions,
    runDepreciation,
    postJournalEntry,
    fixedAssets
  } = useApp();

  // General States
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isPeriodClosed, setIsPeriodClosed] = useState(false);
  
  // Checklist States
  const [isReconciled, setIsReconciled] = useState(true); // Checked by default, typical starting state
  const [isDepreciated, setIsDepreciated] = useState(false);
  const [isAdjusted, setIsAdjusted] = useState(false);

  // Journal Entry Form State
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalRef, setJournalRef] = useState(`JV-2026-${(recentTransactions.filter(t => t.category === 'Jurnal Umum').length + 1).toString().padStart(4, '0')}`);
  const [journalMemo, setJournalMemo] = useState('');
  const [journalLines, setJournalLines] = useState<
    { accountId: string; debit: number; credit: number; description: string }[]
  >([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ]);
  const [formError, setFormError] = useState('');

  // Financial Health Calculations
  const metrics = useMemo(() => {
    // 1. Aset Lancar accounts starting with '11'
    const assetLancar = accounts
      .filter(a => a.code.startsWith('11') && a.level >= 3)
      .reduce((sum, a) => {
        const hasChildren = accounts.some(child => child.parentId === a.id);
        return hasChildren ? sum : sum + a.balance;
      }, 0);

    // 2. Liabilitas Jangka Pendek starting with '21'
    const liabilitasLancar = accounts
      .filter(a => a.code.startsWith('21') && a.level >= 3)
      .reduce((sum, a) => {
        const hasChildren = accounts.some(child => child.parentId === a.id);
        return hasChildren ? sum : sum + a.balance;
      }, 0);

    // 3. Total Liabilitas starting with '2'
    const totalLiabilitas = accounts
      .filter(a => a.code.startsWith('2') && a.level >= 3)
      .reduce((sum, a) => {
        const hasChildren = accounts.some(child => child.parentId === a.id);
        return hasChildren ? sum : sum + a.balance;
      }, 0);

    // 4. Total Ekuitas starting with '3'
    const totalEkuitas = accounts
      .filter(a => a.code.startsWith('3') && a.level >= 3)
      .reduce((sum, a) => {
        const hasChildren = accounts.some(child => child.parentId === a.id);
        return hasChildren ? sum : sum + a.balance;
      }, 0);

    // 5. Pendapatan starting with '4'
    const totalPendapatan = accounts
      .filter(a => a.code.startsWith('4') && a.level >= 3)
      .reduce((sum, a) => {
        const hasChildren = accounts.some(child => child.parentId === a.id);
        return hasChildren ? sum : sum + a.balance;
      }, 0);

    // 6. Beban starting with '5'
    const totalBeban = accounts
      .filter(a => a.code.startsWith('5') && a.level >= 3)
      .reduce((sum, a) => {
        const hasChildren = accounts.some(child => child.parentId === a.id);
        return hasChildren ? sum : sum + a.balance;
      }, 0);

    const labaBersih = totalPendapatan - totalBeban;
    
    // Ratios
    const currentRatio = liabilitasLancar > 0 ? (assetLancar / liabilitasLancar) : 0;
    const der = totalEkuitas > 0 ? (totalLiabilitas / totalEkuitas) : 0;
    const npm = totalPendapatan > 0 ? (labaBersih / totalPendapatan) : 0;

    return {
      currentRatio,
      der,
      npm,
      labaBersih,
      totalRevenue: totalPendapatan
    };
  }, [accounts]);

  // Compile JVs list from recentTransactions (both custom JV and automated depreciation)
  const recentJournals = useMemo(() => {
    return recentTransactions.filter(
      tx => tx.category === 'Jurnal Umum' || tx.category === 'Biaya Depresiasi'
    );
  }, [recentTransactions]);

  // Detail detail leaf accounts list for dropdown selection
  const leafAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const hasChildren = accounts.some(a => a.parentId === acc.id);
      return !hasChildren && acc.level >= 3;
    });
  }, [accounts]);

  // Handle Dynamic Journal Row Changes
  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...journalLines];
    if (field === 'accountId') {
      newLines[index].accountId = value;
    } else if (field === 'debit') {
      newLines[index].debit = parseFloat(value) || 0;
      if (parseFloat(value) > 0) newLines[index].credit = 0; // Double-entry helper
    } else if (field === 'credit') {
      newLines[index].credit = parseFloat(value) || 0;
      if (parseFloat(value) > 0) newLines[index].debit = 0; // Double-entry helper
    } else if (field === 'description') {
      newLines[index].description = value;
    }
    setJournalLines(newLines);
  };

  const addJournalRow = () => {
    setJournalLines([...journalLines, { accountId: '', debit: 0, credit: 0, description: '' }]);
  };

  const removeJournalRow = (index: number) => {
    if (journalLines.length <= 2) return;
    setJournalLines(journalLines.filter((_, i) => i !== index));
  };

  // Calculations for Journal Form validation
  const formTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    journalLines.forEach(l => {
      totalDebit += l.debit;
      totalCredit += l.credit;
    });
    return {
      totalDebit,
      totalCredit,
      difference: Math.abs(totalDebit - totalCredit)
    };
  }, [journalLines]);

  // Journal Posting Action
  const handlePostJournal = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const emptyAcc = journalLines.some(l => !l.accountId);
    if (emptyAcc) {
      setFormError('Harap tentukan akun perkiraan untuk semua baris.');
      return;
    }

    if (formTotals.difference !== 0) {
      setFormError(`Jurnal voucher tidak seimbang. Selisih: Rp ${formTotals.difference.toLocaleString('id-ID')}. Total Debit dan Kredit harus sama.`);
      return;
    }

    if (formTotals.totalDebit <= 0) {
      setFormError('Nominal jurnal harus lebih besar dari Rp 0.');
      return;
    }

    // Map rows
    const linesToPost = journalLines.map(line => {
      const acc = accounts.find(a => a.id === line.accountId)!;
      return {
        accountId: line.accountId,
        accountName: acc.name,
        debit: line.debit,
        credit: line.credit
      };
    });

    postJournalEntry({
      date: journalDate,
      referenceNumber: journalRef,
      description: journalMemo || 'Penyesuaian Jurnal Umum',
      lines: linesToPost
    });

    // Reset Form & Close Modal
    setJournalLines([
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' },
    ]);
    setJournalMemo('');
    setJournalDate(new Date().toISOString().split('T')[0]);
    // Generate next JV Ref
    const nextNum = recentTransactions.filter(t => t.category === 'Jurnal Umum').length + 2;
    setJournalRef(`JV-2026-${nextNum.toString().padStart(4, '0')}`);
    setIsJournalModalOpen(false);
    setIsAdjusted(true);
    alert('Jurnal Voucher berhasil di-posting ke Buku Besar.');
  };

  // Run Depreciation Trigger
  const handleRunDepreciation = () => {
    runDepreciation();
    setIsDepreciated(true);
    alert('Jurnal Penyesuaian Depresiasi Aset Bulan Ini Berhasil Dibuat!');
  };

  // Tutup Buku Trigger
  const handleClosePeriod = () => {
    if (!isReconciled || !isDepreciated || !isAdjusted) {
      if (!confirm('Beberapa langkah checklist penutupan belum selesai. Tutup buku sekarang?')) {
        return;
      }
    }
    setIsPeriodClosed(true);
    alert('Periode Keuangan Des 2026 Berhasil Ditutup & Kunci Transaksi Aktif!');
  };

  const accountingModules = [
    {
      id: 'coa',
      name: 'Chart of Accounts',
      description: 'Kelola struktur daftar akun umum (Level 1-5)',
      icon: 'account_tree',
      href: '/accounting/coa',
      color: 'bg-primary-fixed',
      iconColor: 'text-on-primary-fixed',
    },
    {
      id: 'ledger',
      name: 'Buku Besar',
      description: 'Lihat dan cetak buku besar per akun',
      icon: 'menu_book',
      href: '/accounting/ledger',
      color: 'bg-tertiary-fixed',
      iconColor: 'text-on-tertiary-fixed',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Page Header */}
        <PageHeader
          title="Akuntansi"
          description="Pusat pembukuan dan analisis laporan keuangan Nusantara Fiscal Standard."
          actions={
            <Button 
              icon="add"
              onClick={() => setIsJournalModalOpen(true)}
              disabled={isPeriodClosed}
            >
              Buat Jurnal Baru
            </Button>
          }
        />

        {/* Quick Stats Panel */}
        <div className="glass-card rounded-2xl p-6 hover:border-secondary-container/50 transition-all duration-300">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-5 font-semibold">Ringkasan Akuntansi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-border-subtle/50">
            <div className="pt-4 md:pt-0 md:pl-0">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Total Akun Perkiraan</p>
              <p className="text-2xl font-bold tracking-tight text-primary font-tabular-nums">{accounts.length}</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Rasio Lancar (CR)</p>
              <p className={`text-2xl font-bold tracking-tight font-tabular-nums ${metrics.currentRatio >= 1.5 ? 'text-success-positive' : 'text-warning-deadline'}`}>
                {metrics.currentRatio.toFixed(2)}x
              </p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Periode Pelaporan</p>
              <p className="text-2xl font-bold tracking-tight text-primary font-tabular-nums">Des 2026</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Status Buku Besar</p>
              <p className={`inline-flex items-center gap-1.5 text-xs font-bold mt-1 px-3 py-0.5 rounded-full w-fit ${
                isPeriodClosed 
                  ? 'bg-error-container/20 text-error-deadline border border-error-deadline/20' 
                  : 'bg-success-positive/5 text-success-positive border border-success-positive/20'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isPeriodClosed ? 'bg-error-deadline' : 'bg-success-positive animate-pulse'}`}></span>
                {isPeriodClosed ? 'TERKUNCI / TUTUP' : 'TERBUKA'}
              </p>
            </div>
          </div>
        </div>

        {/* Double Column: Modules + Financial Ratios vs Closing Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Modules & Financial Ratios */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Access Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {accountingModules.map((module) => (
                <a
                  key={module.id}
                  href={module.href}
                  className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-secondary-container/50 transition-all duration-300 group animate-slide-up"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl ${module.color} flex items-center justify-center mb-5 border border-border-subtle/30 shadow-sm transform group-hover:rotate-3 transition-transform duration-300`}>
                      <span className={`material-symbols-outlined ${module.iconColor} text-[24px]`}>{module.icon}</span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-primary group-hover:text-secondary transition-colors mb-1.5">
                      {module.name}
                    </h3>
                    <p className="font-body-sm text-[12.5px] text-on-surface-variant leading-relaxed">{module.description}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border-subtle/40 flex justify-end text-[11px] font-label-md text-secondary group-hover:text-primary transition-colors">
                    Buka Modul →
                  </div>
                </a>
              ))}
            </div>

            {/* Financial Health Indicators (Ratios) */}
            <div className="glass-card rounded-2xl p-6 hover:border-secondary-container/30 transition-colors duration-300">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">Kesehatan Fiskal Perusahaan</h3>
                <span className="text-[10px] bg-secondary/15 text-secondary border border-secondary/25 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Live COA Analysis</span>
              </div>
              
              <div className="space-y-5">
                {/* Ratio 1: Current Ratio */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-on-surface">Rasio Lancar (Current Ratio)</span>
                      <span className="text-[10px] text-on-surface-variant opacity-75">(Target: &gt; 1.5x)</span>
                    </div>
                    <span className="font-bold text-tabular-nums">{metrics.currentRatio.toFixed(2)}x</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden border border-border-subtle/45">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
                        metrics.currentRatio >= 1.5 ? 'from-emerald-500 to-teal-400' : 'from-amber-500 to-orange-400'
                      }`}
                      style={{ width: `${Math.min(100, (metrics.currentRatio / 2.5) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-on-surface-variant/70 font-semibold uppercase tracking-wider">
                    <span>Likuiditas Kritis</span>
                    <span>Aman</span>
                    <span>Optimal (2.5x+)</span>
                  </div>
                </div>

                {/* Ratio 2: Debt to Equity Ratio (DER) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-on-surface">Rasio Hutang Modal (DER)</span>
                      <span className="text-[10px] text-on-surface-variant opacity-75">(Target: &lt; 1.0x)</span>
                    </div>
                    <span className="font-bold text-tabular-nums">{metrics.der.toFixed(3)}x</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden border border-border-subtle/45">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
                        metrics.der <= 1.0 ? 'from-emerald-500 to-teal-400' : 'from-red-500 to-orange-400'
                      }`}
                      style={{ width: `${Math.min(100, (metrics.der / 1.5) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-on-surface-variant/70 font-semibold uppercase tracking-wider">
                    <span>Hutang Rendah</span>
                    <span>Batas Maksimum (1.0x)</span>
                    <span>Resiko Tinggi</span>
                  </div>
                </div>

                {/* Ratio 3: Net Profit Margin */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-on-surface">Marjin Laba Bersih (NPM)</span>
                      <span className="text-[10px] text-on-surface-variant opacity-75">(Rata-rata Industri: 15%)</span>
                    </div>
                    <span className="font-bold text-tabular-nums">{formatPercent(metrics.npm * 100)}</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden border border-border-subtle/45">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-blue-500 to-secondary"
                      style={{ width: `${Math.max(0, Math.min(100, metrics.npm * 100))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-on-surface-variant/70 font-semibold uppercase tracking-wider">
                    <span>Merugi</span>
                    <span>15% Avg</span>
                    <span>Profitabilitas Tinggi (30%+)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Column 3: Closing Cycle Checklist */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between hover:border-secondary-container/30 transition-colors duration-300">
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-border-subtle/40 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
                  <h3 className="font-bold text-primary dark:text-secondary-container">Tutup Buku Bulanan</h3>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant/80 font-tabular-nums">Des 2026</span>
              </div>
              
              <p className="text-xs text-on-surface-variant mb-5 leading-relaxed">
                 Checklist penutupan buku akhir bulan untuk memastikan seluruh mutasi tersinkron dengan benar sebelum mengunci laporan keuangan.
              </p>

              {/* Steps List */}
              <div className="space-y-4">
                
                {/* Step 1: Reconcile Bank */}
                <div className="flex gap-3 items-start">
                  <button 
                    onClick={() => setIsReconciled(!isReconciled)}
                    className={`mt-0.5 rounded w-5 h-5 flex items-center justify-center border cursor-pointer transition-all ${
                      isReconciled 
                        ? 'bg-success-positive/10 border-success-positive text-success-positive' 
                        : 'border-border-subtle hover:border-secondary'
                    }`}
                  >
                    {isReconciled && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                  </button>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-on-surface flex justify-between">
                      <span>Langkah 1: Rekonsiliasi Kas & Koran</span>
                      <a href="/cash-bank" className="text-[10px] text-secondary hover:underline">Kelola &rarr;</a>
                    </div>
                    <p className="text-[11px] text-on-surface-variant opacity-80 mt-0.5">Selesaikan perbandingan kas ledger vs bank.</p>
                  </div>
                </div>

                {/* Step 2: Asset Depreciation */}
                <div className="flex gap-3 items-start border-t border-border-subtle/20 pt-3">
                  <div className={`mt-0.5 rounded w-5 h-5 flex items-center justify-center border transition-all ${
                    isDepreciated 
                      ? 'bg-success-positive/10 border-success-positive text-success-positive' 
                      : 'border-border-subtle'
                  }`}>
                    {isDepreciated && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-on-surface flex justify-between items-center">
                      <span>Langkah 2: Depresiasi Bulanan Aset</span>
                      {!isDepreciated && !isPeriodClosed && (
                        <button
                          onClick={handleRunDepreciation}
                          className="px-2 py-0.5 text-[9.5px] font-bold bg-secondary hover:bg-secondary/85 text-white rounded border border-secondary/20 transition-all cursor-pointer shadow-sm"
                        >
                          Susutkan Aset
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant opacity-80 mt-0.5">Beban depresiasi otomatis aset tetap.</p>
                  </div>
                </div>

                {/* Step 3: Journal Adjustment */}
                <div className="flex gap-3 items-start border-t border-border-subtle/20 pt-3">
                  <button 
                    onClick={() => setIsAdjusted(!isAdjusted)}
                    className={`mt-0.5 rounded w-5 h-5 flex items-center justify-center border cursor-pointer transition-all ${
                      isAdjusted 
                        ? 'bg-success-positive/10 border-success-positive text-success-positive' 
                        : 'border-border-subtle hover:border-secondary'
                    }`}
                  >
                    {isAdjusted && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                  </button>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-on-surface flex justify-between items-center">
                      <span>Langkah 3: Jurnal Penyesuaian</span>
                      {!isAdjusted && !isPeriodClosed && (
                        <button
                          onClick={() => setIsJournalModalOpen(true)}
                          className="px-2 py-0.5 text-[9.5px] font-bold bg-surface-container-low hover:bg-surface border border-border-subtle rounded text-on-surface-variant cursor-pointer"
                        >
                          Input Jurnal
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant opacity-80 mt-0.5">Posting voucher penyesuaian akhir bulan.</p>
                  </div>
                </div>

                {/* Step 4: Closing */}
                <div className="flex gap-3 items-start border-t border-border-subtle/20 pt-3">
                  <div className={`mt-0.5 rounded w-5 h-5 flex items-center justify-center border transition-all ${
                    isPeriodClosed 
                      ? 'bg-error-container/20 border-error-deadline text-error-deadline' 
                      : 'border-border-subtle'
                  }`}>
                    {isPeriodClosed && <span className="material-symbols-outlined text-[14px] font-bold">lock</span>}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-on-surface">Langkah 4: Kunci Transaksi Periode</span>
                    <p className="text-[11px] text-on-surface-variant opacity-80 mt-0.5">Kunci periode untuk mencegah entri data susulan.</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Execute Closing Button */}
            <div className="pt-5 border-t border-border-subtle/40 mt-5">
              <Button
                variant={isPeriodClosed ? 'outline' : 'primary'}
                className="w-full text-xs font-bold py-2.5 cursor-pointer"
                disabled={isPeriodClosed}
                onClick={handleClosePeriod}
                icon={isPeriodClosed ? 'lock' : 'verified_user'}
              >
                {isPeriodClosed ? 'Periode Berhasil Ditutup' : 'Tutup Buku Sekarang'}
              </Button>
            </div>

          </div>

        </div>

        {/* Recent Journal Vouchers Table Section */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col hover:border-secondary-container/20 transition-colors duration-300">
          <div className="p-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">edit_note</span>
              <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold tracking-wider">
                Jurnal Umum & Penyesuaian Terakhir
              </h3>
            </div>
            <span className="text-xs text-on-surface-variant/75 font-semibold font-tabular-nums">
              Menampilkan {recentJournals.length} Entri Baris
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-surface-muted/30 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">No. Jurnal</th>
                  <th className="px-4 py-3 font-semibold">Akun Perkiraan</th>
                  <th className="px-4 py-3 font-semibold">Deskripsi / Memo</th>
                  <th className="px-4 py-3 font-semibold text-right">Debit</th>
                  <th className="px-4 py-3 font-semibold text-right">Kredit</th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle/40">
                {recentJournals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant italic">
                      Belum ada entri jurnal umum yang tercatat.
                    </td>
                  </tr>
                ) : (
                  recentJournals.map((line) => {
                    const isDebit = line.type === 'IN';
                    return (
                      <tr
                        key={line.id}
                        className="hover:bg-surface-container-low/50 transition-colors duration-150 h-10 font-medium"
                      >
                        <td className="px-4 py-2 text-[11px] font-tabular-nums text-on-surface-variant">{line.date}</td>
                        <td className="px-4 py-2 text-[11px] font-bold text-primary font-tabular-nums">
                          {line.id.startsWith('tx-jv-') ? 'JV-2026-' + line.id.split('-').pop()?.padStart(4, '0') : 'JV-DEP-' + line.id.split('-').pop()?.slice(-4)}
                        </td>
                        <td className="px-4 py-2 text-[11.5px] text-on-surface font-bold">
                          {line.accountName}
                        </td>
                        <td className="px-4 py-2 text-[12px] text-on-surface-variant max-w-[350px] truncate" title={line.description}>
                          {line.description}
                        </td>
                        <td className="px-4 py-2 text-right text-success-positive font-tabular-nums font-semibold">
                          {isDebit ? formatCurrency(line.amount) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right text-warning-deadline font-tabular-nums font-semibold">
                          {!isDebit ? formatCurrency(line.amount) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Jurnal Voucher Modal Form */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handlePostJournal}
            className="bg-surface backdrop-blur-md border border-border-subtle/80 dark:border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-scale-up"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border-subtle/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">edit_note</span>
                <div>
                  <h3 className="font-bold text-primary dark:text-secondary-container">
                    Pencatatan Jurnal Umum (Journal Voucher)
                  </h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">
                    Double-Entry Posting Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJournalModalOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-low p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="bg-error-container/20 border-l-4 border-error-deadline p-3 rounded text-xs text-error-deadline font-medium leading-relaxed">
                {formError}
              </div>
            )}

            {/* Form General Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-label-md text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">No. Voucher Jurnal</label>
                <input
                  type="text"
                  value={journalRef}
                  onChange={(e) => setJournalRef(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle focus:border-secondary/40 rounded-xl text-xs text-on-surface font-bold font-tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-label-md text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Tanggal Posting</label>
                <input
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle focus:border-secondary/40 rounded-xl text-xs text-on-surface"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-label-md text-on-surface-variant mb-1 uppercase tracking-widest opacity-80">Memo Jurnal (Deskripsi)</label>
                <input
                  type="text"
                  placeholder="Misal: Penyesuaian Sewa Bulanan"
                  value={journalMemo}
                  onChange={(e) => setJournalMemo(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle focus:border-secondary/40 rounded-xl text-xs text-on-surface"
                  required
                />
              </div>
            </div>

            {/* Journal Lines Table Input */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[11.5px] font-bold text-primary">Baris Entri Pembukuan</span>
                <button
                  type="button"
                  onClick={addJournalRow}
                  className="px-2.5 py-1 text-[10.5px] font-bold border border-border-subtle hover:border-secondary bg-surface-container-low rounded-lg text-secondary cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span> Tambah Baris
                </button>
              </div>

              {/* Ledger Input Grid */}
              <div className="border border-border-subtle/50 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-surface-muted/30 px-3 py-2 grid grid-cols-12 text-[10.5px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-border-subtle/50">
                  <span className="col-span-4">Akun Perkiraan</span>
                  <span className="col-span-3 text-right">Debit (Rp)</span>
                  <span className="col-span-3 text-right">Kredit (Rp)</span>
                  <span className="col-span-2 text-center">Aksi</span>
                </div>

                <div className="divide-y divide-border-subtle/30 bg-surface-container-lowest max-h-[260px] overflow-y-auto custom-scrollbar">
                  {journalLines.map((line, index) => (
                    <div key={index} className="px-3 py-2.5 grid grid-cols-12 gap-2.5 items-center">
                      
                      {/* Account Selector */}
                      <div className="col-span-4">
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                          className="w-full bg-surface-container-low border border-border-subtle focus:border-secondary/40 rounded-lg text-xs p-1.5 text-on-surface font-semibold"
                          required
                        >
                          <option value="">-- Pilih Akun --</option>
                          {leafAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Debit Input */}
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="0"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container-low border border-border-subtle focus:border-secondary/40 rounded-lg text-xs text-right font-tabular-nums text-success-positive font-bold"
                          min="0"
                        />
                      </div>

                      {/* Credit Input */}
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="0"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface-container-low border border-border-subtle focus:border-secondary/40 rounded-lg text-xs text-right font-tabular-nums text-warning-deadline font-bold"
                          min="0"
                        />
                      </div>

                      {/* Action */}
                      <div className="col-span-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeJournalRow(index)}
                          className={`text-on-surface-variant hover:text-error-deadline p-1 rounded hover:bg-surface-container-low transition-colors cursor-pointer ${
                            journalLines.length <= 2 ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          disabled={journalLines.length <= 2}
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Balancing Verification summary */}
            <div className="bg-surface-muted/30 p-3.5 rounded-xl border border-border-subtle/50 font-tabular-nums text-xs space-y-1.5 mt-2 shadow-inner">
              <div className="flex justify-between text-success-positive font-bold">
                <span>Total Debit</span>
                <span>{formatCurrency(formTotals.totalDebit)}</span>
              </div>
              <div className="flex justify-between text-warning-deadline font-bold">
                <span>Total Kredit</span>
                <span>{formatCurrency(formTotals.totalCredit)}</span>
              </div>
              
              <div className="flex justify-between border-t border-border-subtle/40 pt-1.5 font-bold text-[12.5px]">
                <span className="text-on-surface">Selisih (Unbalanced)</span>
                <span className={formTotals.difference === 0 ? 'text-success-positive' : 'text-error-deadline animate-pulse'}>
                  {formatCurrency(formTotals.difference)}
                </span>
              </div>

              {formTotals.difference !== 0 && (
                <p className="text-[10px] text-error-deadline/90 font-bold uppercase mt-1 tracking-wider text-right animate-pulse-slow">
                  &bull; JURNAL HARUS BALANCE TERLEBIH DAHULU SEBELUM DIPOSTING &bull;
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 border-t border-border-subtle/40 pt-4 mt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsJournalModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={formTotals.difference !== 0 || formTotals.totalDebit <= 0}
                className="bg-gradient-secondary-premium font-bold text-white shadow-md disabled:opacity-55 disabled:cursor-not-allowed"
              >
                Posting Jurnal
              </Button>
            </div>

          </form>
        </div>
      )}

    </Layout>
  );
}