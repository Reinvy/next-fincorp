'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';

export default function CashBankPage() {
  const { bankAccounts, recentTransactions, addBankTransfer, addBankAccount, addCashTransaction } = useApp();
  
  // Selectable account filter
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('ALL');
  
  // Card options menu
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferDesc, setTransferDesc] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');

  // Add Account Modal State
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccType, setNewAccType] = useState<'BANK' | 'CASH'>('BANK');
  const [newAccBalance, setNewAccBalance] = useState(0);
  const [newAccError, setNewAccError] = useState('');

  // Reconcile Modal State
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState('');
  const [bankStatementItems, setBankStatementItems] = useState([
    { id: 'bs-1', date: '30 Jun 2026', description: 'Bunga Tabungan Bank', amount: 12500, type: 'CR' as const, isMatched: false, isAdjustment: false },
    { id: 'bs-2', date: '30 Jun 2026', description: 'Biaya Adm Bulanan', amount: 25000, type: 'DR' as const, isMatched: false, isAdjustment: false },
    { id: 'bs-3', date: '28 Jun 2026', description: 'Pelunasan Faktur INV-2026-001', amount: 16650000, type: 'CR' as const, isMatched: false, isAdjustment: false },
    { id: 'bs-4', date: '29 Jun 2026', description: 'Tarik Tunai ATM', amount: 2000000, type: 'DR' as const, isMatched: false, isAdjustment: false },
  ]);

  const [ledgerStatementItems, setLedgerStatementItems] = useState([
    { id: 'lg-1', date: '28 Jun 2026', description: 'Pelunasan Faktur INV-2026-001', amount: 16650000, type: 'IN' as const, isMatched: false },
    { id: 'lg-2', date: '29 Jun 2026', description: 'Tarik Tunai ATM', amount: 2000000, type: 'OUT' as const, isMatched: false },
  ]);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fromAccountId || !toAccountId || transferAmount <= 0) {
      setErrorMsg('Harap lengkapi semua field transfer.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setErrorMsg('Rekening asal dan tujuan tidak boleh sama.');
      return;
    }

    const sourceAccount = bankAccounts.find(b => b.id === fromAccountId);
    if (!sourceAccount || sourceAccount.balance < transferAmount) {
      setErrorMsg('Saldo rekening asal tidak mencukupi untuk transfer.');
      return;
    }

    addBankTransfer({
      fromAccountId,
      toAccountId,
      amount: transferAmount,
      description: transferDesc || 'Transfer Internal Kas/Bank',
      date: new Date(transferDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    });

    // Reset Form & Close Modal
    setFromAccountId('');
    setToAccountId('');
    setTransferAmount(0);
    setTransferDesc('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setIsTransferModalOpen(false);
    alert('Transfer antar rekening berhasil diselesaikan.');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setNewAccError('');

    if (!newAccName || !newAccNumber) {
      setNewAccError('Harap lengkapi nama dan nomor rekening.');
      return;
    }

    addBankAccount({
      name: newAccName,
      accountNumber: newAccNumber,
      type: newAccType,
      balance: newAccBalance,
      currency: 'IDR',
      bankName: newAccType === 'BANK' ? newAccName.split(' ')[0] : 'KAS',
      lastTransactionDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    });

    // Reset & Close
    setNewAccName('');
    setNewAccNumber('');
    setNewAccType('BANK');
    setNewAccBalance(0);
    setIsAddAccountModalOpen(false);
    alert(`Rekening "${newAccName}" berhasil didaftarkan.`);
  };

  const handleAutoMatch = () => {
    let matchedCount = 0;
    const updatedBS = bankStatementItems.map(bs => {
      const match = ledgerStatementItems.find(lg => lg.amount === bs.amount && !lg.isMatched);
      if (match) {
        matchedCount++;
        return { ...bs, isMatched: true };
      }
      return bs;
    });

    const updatedLG = ledgerStatementItems.map(lg => {
      const match = bankStatementItems.find(bs => bs.amount === lg.amount && !bs.isMatched);
      if (match) {
        return { ...lg, isMatched: true };
      }
      return lg;
    });

    setBankStatementItems(updatedBS);
    setLedgerStatementItems(updatedLG);
    alert(`Cocokkan Otomatis Berhasil! ${matchedCount} transaksi identik berhasil dipadankan.`);
  };

  const handleCreateAdjustment = (item: typeof bankStatementItems[0]) => {
    if (!reconcileAccountId) {
      alert('Harap pilih rekening kas/bank untuk rekonsiliasi.');
      return;
    }
    
    addCashTransaction({
      accountId: reconcileAccountId,
      description: item.description,
      category: item.description.includes('Bunga') ? 'Pendapatan Bunga' : 'Biaya Administrasi Bank',
      amount: item.amount,
      type: item.type === 'CR' ? 'IN' : 'OUT',
      date: item.date,
    });

    setBankStatementItems(prev => prev.map(bs => {
      if (bs.id === item.id) {
        return { ...bs, isMatched: true, isAdjustment: true };
      }
      return bs;
    }));

    setLedgerStatementItems(prev => [
      ...prev,
      {
        id: `lg-adjust-${Date.now()}`,
        date: item.date,
        description: item.description,
        amount: item.amount,
        type: item.type === 'CR' ? 'IN' : 'OUT',
        isMatched: true
      }
    ]);

    alert(`Jurnal Penyesuaian Berhasil Dibuat! Transaksi "${item.description}" senilai Rp ${item.amount.toLocaleString('id-ID')} telah dibukukan.`);
  };

  const handleFinishReconciliation = () => {
    const allMatched = bankStatementItems.every(bs => bs.isMatched);
    if (!allMatched) {
      if (!confirm('Masih ada transaksi yang belum cocok/disesuaikan. Selesaikan rekonsiliasi sekarang?')) {
        return;
      }
    }
    setIsReconcileModalOpen(false);
    alert('Rekonsiliasi Bank Berhasil Diselesaikan! Saldo kas telah disamakan dengan rekening koran.');
  };

  const handleExportCSV = (accountId: string = 'ALL') => {
    const data = recentTransactions.filter(tx => accountId === 'ALL' || tx.accountId === accountId);
    const headers = ['Tanggal', 'Deskripsi', 'Akun', 'Kategori', 'Tipe', 'Nominal', 'Saldo Akhir'];
    const rows = data.map(tx => [
      tx.date,
      tx.description,
      tx.accountName,
      tx.category,
      tx.type,
      tx.amount.toString(),
      tx.balance.toString()
    ]);
    const filename = `Mutasi_Rekening_${accountId === 'ALL' ? 'Semua' : accountId}_${new Date().toISOString().split('T')[0]}.csv`;

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

  // Filtered transactions
  const filteredTransactions = recentTransactions.filter(tx => {
    if (selectedAccountFilter === 'ALL') return true;
    return tx.accountId === selectedAccountFilter;
  });

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <PageHeader
          title="Kas & Bank"
          description="Ringkasan saldo dan mutasi rekening perusahaan secara real-time."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                icon="sync"
                onClick={() => {
                  setReconcileAccountId(bankAccounts[0]?.id || '');
                  setIsReconcileModalOpen(true);
                }}
              >
                Rekonsiliasi Bank
              </Button>
              <Button 
                variant="outline"
                icon="add"
                onClick={() => setIsAddAccountModalOpen(true)}
              >
                Tambah Rekening
              </Button>
              <Button 
                icon="currency_exchange" 
                className="bg-gradient-secondary-premium hover:shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-white"
                onClick={() => setIsTransferModalOpen(true)}
              >
                Transfer Antar Bank
              </Button>
            </div>
          }
        />

        {/* Account Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bankAccounts.map((account) => {
            const cardGradient = account.name.includes('BCA')
              ? 'bg-gradient-to-br from-[#0a1e3f] via-[#0b2447] to-[#011b3e] text-white border-white/5 shadow-lg shadow-[#0a1e3f]/20'
              : account.name.includes('Mandiri')
              ? 'bg-gradient-to-br from-[#403010] via-[#5c4a24] to-[#281b04] text-white border-white/5 shadow-lg shadow-[#403010]/20'
              : 'bg-gradient-to-br from-[#0a2f1d] via-[#1a4d33] to-[#041a0e] text-white border-white/5 shadow-lg shadow-[#0a2f1d]/20';

            const isSelected = selectedAccountFilter === account.id;

            return (
              <div
                key={account.id}
                onClick={() => setSelectedAccountFilter(isSelected ? 'ALL' : account.id)}
                className={`rounded-2xl p-5 border relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 animate-slide-up cursor-pointer ${cardGradient} ${
                  isSelected 
                    ? 'ring-2 ring-primary dark:ring-inverse-primary shadow-[0_0_20px_rgba(33,150,243,0.3)] scale-[1.01] border-primary/50' 
                    : 'border-white/10'
                }`}
              >
                {/* EMV Chip & Card Icon */}
                <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none transform group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[90px] font-thin">
                    {account.type === 'CASH' ? 'payments' : 'account_balance'}
                  </span>
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    {/* Gold Chip */}
                    <div className="w-8 h-6 bg-gradient-to-r from-[#ffe07d] to-[#d4af37] rounded-md border border-white/10 flex flex-col gap-[3px] p-[3px] justify-between shadow-inner">
                      <div className="h-px bg-black/10 w-full"></div>
                      <div className="h-px bg-black/10 w-2/3"></div>
                      <div className="h-px bg-black/10 w-full"></div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">{account.name}</h3>
                      <p className="text-[11px] font-tabular-nums text-white/50">{account.accountNumber}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenCardMenuId(openCardMenuId === account.id ? null : account.id);
                      }}
                      className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                    {openCardMenuId === account.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-border-subtle/80 dark:border-white/10 rounded-xl shadow-xl z-20 py-1 overflow-hidden text-left text-on-surface">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAccountFilter(account.id);
                            setOpenCardMenuId(null);
                          }}
                          className="w-full text-left block px-4 py-2 text-xs hover:bg-primary/5 dark:hover:bg-white/5 font-semibold text-on-surface"
                        >
                          Lihat Mutasi Rekening
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportCSV(account.id);
                            setOpenCardMenuId(null);
                          }}
                          className="w-full text-left block px-4 py-2 text-xs hover:bg-primary/5 dark:hover:bg-white/5 font-semibold cursor-pointer border-t border-border-subtle/10 text-on-surface"
                        >
                          Unduh Rekening Koran
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-white/60 font-medium">Saldo Rekening</div>
                  <div className="font-tabular-nums text-2xl font-bold tracking-tight text-white">{formatCurrency(account.balance)}</div>
                  <div className="flex items-center gap-2 mt-2 text-[10.5px] text-white/65">
                    <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-full ${
                      (account.changePercent || 0) >= 0 ? 'bg-success-positive/20 text-[#6fe36f]' : 'bg-error-container/20 text-[#ff8e8e]'
                    }`}>
                      <span className="material-symbols-outlined text-[10px]">
                        {(account.changePercent || 0) >= 0 ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {Math.abs(account.changePercent || 0).toFixed(1)}%
                    </span>
                    <span>vs bulan lalu</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Transactions Table */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col hover:border-secondary-container/30 transition-colors duration-300">
          <div className="p-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/20">
            <div className="flex items-center gap-3">
              <h3 className="font-label-md text-label-md text-primary dark:text-secondary-container font-bold tracking-wider">Transaksi Terakhir</h3>
              {selectedAccountFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 dark:border-primary/30">
                  Terfilter: {bankAccounts.find(b => b.id === selectedAccountFilter)?.name}
                  <button 
                    onClick={() => setSelectedAccountFilter('ALL')}
                    className="hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold cursor-pointer ml-1 text-primary"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedAccountFilter('ALL')}
                className="text-on-surface-variant/60 hover:text-primary hover:bg-surface-container-low p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-border-subtle/40"
                title="Hapus Filter"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              </button>
              <button 
                onClick={() => handleExportCSV(selectedAccountFilter)}
                className="text-on-surface-variant/60 hover:text-primary hover:bg-surface-container-low p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-border-subtle/40"
                title="Unduh CSV Mutasi"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-muted/30 border-b border-border-subtle/50 font-label-md text-[10.5px] text-on-surface-variant uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Deskripsi</th>
                  <th className="px-4 py-3 font-semibold">Akun</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold text-right">Nominal (In/Out)</th>
                  <th className="px-4 py-3 font-semibold text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="font-tabular-nums text-tabular-nums text-on-surface divide-y divide-border-subtle/30 text-body-sm">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant text-body-sm">
                      Tidak ada mutasi transaksi untuk filter rekening ini.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-container-low/40 transition-colors group h-[40px]">
                      <td className="px-4 py-2">{tx.date}</td>
                      <td className="px-4 py-2 font-body-sm text-on-surface font-medium">{tx.description}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                          tx.accountName.includes('BCA') ? 'bg-secondary-container/10 border-secondary-container/30 text-secondary' :
                          tx.accountName.includes('Mandiri') ? 'bg-warning-deadline/10 border-warning-deadline/30 text-warning-deadline' : 'bg-success-positive/10 border-success-positive/30 text-success-positive'
                        }`}>
                          {tx.accountName}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-body-sm text-on-surface-variant">{tx.category}</td>
                      <td className={`px-4 py-2 text-right font-bold ${tx.type === 'IN' ? 'text-success-positive' : 'text-danger-liability'}`}>
                        {tx.type === 'IN' ? '+ ' : '- '}{formatCurrency(tx.amount).replace('Rp ', '')}
                      </td>
                      <td className="px-4 py-2 text-right text-on-surface-variant">{tx.balance > 0 ? formatCurrency(tx.balance).replace('Rp ', '') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border-subtle/50 flex justify-center bg-surface-muted/10">
            <button 
              onClick={() => setSelectedAccountFilter('ALL')}
              className="text-secondary hover:text-primary font-label-md text-label-md hover:underline transition-colors cursor-pointer"
            >
              Tampilkan Semua Transaksi
            </button>
          </div>
        </div>
      </div>

      {/* Transfer Bank Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">currency_exchange</span>
                Transfer Antar Rekening
              </h3>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-medium border border-error/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Dari Rekening Asal</label>
                  <select 
                    required
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Pilih Rekening Asal...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (Saldo: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Ke Rekening Tujuan</label>
                  <select 
                    required
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Pilih Rekening Tujuan...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (Saldo: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Nominal (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      required
                      min={1000}
                      value={transferAmount || ''}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Tanggal Transfer</label>
                    <input 
                      type="date" 
                      required
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Keterangan Transfer</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Pemindahan Saldo Operasional"
                    value={transferDesc}
                    onChange={(e) => setTransferDesc(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsTransferModalOpen(false)}>Batal</Button>
                <Button type="submit" className="bg-gradient-secondary-premium text-white hover:shadow-lg hover:shadow-secondary/20">Kirim Transfer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tambah Rekening Baru Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">add_card</span>
                Daftarkan Rekening Baru
              </h3>
              <button 
                onClick={() => setIsAddAccountModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="p-6 space-y-4">
                {newAccError && (
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm font-medium border border-error/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    {newAccError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Nama Rekening / Akun</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Bank BCA Operasional"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Nomor Rekening / Referensi</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 800-1234-567"
                    value={newAccNumber}
                    onChange={(e) => setNewAccNumber(e.target.value)}
                    className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Tipe Akun</label>
                    <select 
                      value={newAccType}
                      onChange={(e) => setNewAccType(e.target.value as 'BANK' | 'CASH')}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                    >
                      <option value="BANK">Bank</option>
                      <option value="CASH">Kas Tunai</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Saldo Awal (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={newAccBalance || ''}
                      onChange={(e) => setNewAccBalance(Number(e.target.value))}
                      className="h-10 px-3 bg-white/70 dark:bg-black/20 border border-border-subtle/70 rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsAddAccountModalOpen(false)}>Batal</Button>
                <Button type="submit" className="bg-gradient-secondary-premium text-white hover:shadow-lg hover:shadow-secondary/20">Daftarkan Rekening</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rekonsiliasi Bank Modal */}
      {isReconcileModalOpen && (
        <div className="fixed inset-0 bg-primary/40 dark:bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="glass-card max-w-4xl w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-border-subtle/60 dark:border-white/10 animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/30">
              <h3 className="font-headline-sm text-headline-sm text-primary dark:text-secondary-container font-bold flex items-center gap-2">
                <span className="material-symbols-outlined">sync</span>
                Rekonsiliasi Rekening Koran Bank
              </h3>
              <button 
                onClick={() => setIsReconcileModalOpen(false)}
                className="text-on-surface-variant hover:text-primary dark:hover:text-white transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
              
              {/* Select Reconcile Account */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-surface-container/30 border border-border-subtle/50 p-4 rounded-xl">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rekening Kas/Bank Sasaran</label>
                  <select 
                    value={reconcileAccountId}
                    onChange={(e) => setReconcileAccountId(e.target.value)}
                    className="h-10 px-3 bg-white dark:bg-black/20 border border-border-subtle/70 rounded-lg focus:ring-2 focus:ring-secondary/35 focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Pilih Rekening...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (Buku Besar: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <Button variant="outline" size="sm" icon="auto_awesome" onClick={handleAutoMatch}>
                    Cocokkan Otomatis (Auto-Match)
                  </Button>
                </div>
              </div>

              {/* Side-by-side reconciliation list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-body-sm font-tabular-nums">
                
                {/* Bank statement panel */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-secondary-container/10 border border-secondary/20 p-2.5 rounded-lg shrink-0">
                    <span className="font-bold text-secondary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">account_balance</span>
                      1. Rekening Koran Bank
                    </span>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Laporan Bank</span>
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {bankStatementItems.map((item) => (
                      <div 
                        key={item.id}
                        className={`p-3 bg-white/40 dark:bg-black/20 border rounded-xl flex justify-between items-start transition-all ${
                          item.isMatched 
                            ? 'border-success-positive/50 bg-success-positive/[0.02]' 
                            : 'border-border-subtle/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-on-surface">{item.description}</p>
                          <p className="text-[11px] text-on-surface-variant">{item.date} • Mutasi: <span className="font-bold">{item.type}</span></p>
                        </div>
                        <div className="text-right space-y-2">
                          <span className="font-bold block text-on-surface">{formatCurrency(item.amount).replace('Rp ', '')}</span>
                          
                          {item.isMatched ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success-positive bg-success-positive/10 px-2 py-0.5 rounded-full border border-success-positive/20">
                              <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                              Cocok
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCreateAdjustment(item)}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-warning-deadline hover:text-white bg-warning-deadline/10 hover:bg-warning-deadline px-2 py-0.5 rounded-full border border-warning-deadline/30 transition-all cursor-pointer"
                              title="Buat penyesuaian kas otomatis di FinCorp"
                            >
                              <span className="material-symbols-outlined text-[12px]">edit_note</span>
                              Sesuaikan
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Internal ledger statement panel */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-primary-container/10 border border-primary/20 p-2.5 rounded-lg shrink-0">
                    <span className="font-bold text-primary dark:text-inverse-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">menu_book</span>
                      2. Buku Kas FinCorp (Ledger)
                    </span>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant">Sistem</span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {ledgerStatementItems.map((item) => (
                      <div 
                        key={item.id}
                        className={`p-3 bg-white/40 dark:bg-black/20 border rounded-xl flex justify-between items-start transition-all ${
                          item.isMatched 
                            ? 'border-success-positive/50 bg-success-positive/[0.02]' 
                            : 'border-border-subtle/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-on-surface">{item.description}</p>
                          <p className="text-[11px] text-on-surface-variant">{item.date} • Tipe: <span className="font-bold">{item.type}</span></p>
                        </div>
                        <div className="text-right space-y-2">
                          <span className="font-bold block text-on-surface">{formatCurrency(item.amount).replace('Rp ', '')}</span>
                          
                          {item.isMatched ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success-positive bg-success-positive/10 px-2 py-0.5 rounded-full border border-success-positive/20">
                              <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                              Tercatat
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-outline bg-surface-container-high px-2 py-0.5 rounded-full border border-border-subtle/40">
                              Belum Cocok
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
            
            <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/30 flex justify-end gap-3 shrink-0">
              <Button variant="outline" type="button" onClick={() => setIsReconcileModalOpen(false)}>Batal</Button>
              <Button 
                onClick={handleFinishReconciliation}
                className="bg-gradient-success-premium text-white hover:shadow-lg"
              >
                Selesaikan Rekonsiliasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}