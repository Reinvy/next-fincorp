'use client';

import { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';

export default function CashBankPage() {
  const { bankAccounts, recentTransactions, addBankTransfer } = useApp();
  
  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferDesc, setTransferDesc] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');

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
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Kas & Bank"
          description="Ringkasan saldo dan mutasi rekening perusahaan secara real-time."
          actions={
            <>
              <Button variant="outline" icon="sync">Rekonsiliasi</Button>
              <Button icon="currency_exchange" onClick={() => setIsTransferModalOpen(true)}>Transfer Antar Bank</Button>
            </>
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

            return (
              <div
                key={account.id}
                className={`rounded-2xl p-5 border relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 animate-slide-up ${cardGradient}`}
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
                  <button className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">more_vert</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-white/60 font-medium">Saldo Rekening</div>
                  <div className="font-tabular-nums text-2xl font-bold tracking-tight text-white">{formatCurrency(account.balance)}</div>
                  <div className="flex items-center gap-2 mt-2 text-[10.5px] text-white/65">
                    <span className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-full ${
                      account.changePercent >= 0 ? 'bg-success-positive/20 text-[#6fe36f]' : 'bg-error-container/20 text-[#ff8e8e]'
                    }`}>
                      <span className="material-symbols-outlined text-[10px]">
                        {account.changePercent >= 0 ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {Math.abs(account.changePercent).toFixed(1)}%
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
            <h3 className="font-label-md text-label-md text-primary font-bold tracking-wider">Transaksi Terakhir</h3>
            <div className="flex gap-2">
              <button className="text-on-surface-variant/60 hover:text-primary hover:bg-surface-container-low p-1.5 rounded-lg transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
              </button>
              <button className="text-on-surface-variant/60 hover:text-primary hover:bg-surface-container-low p-1.5 rounded-lg transition-colors cursor-pointer">
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
                {recentTransactions.map((tx) => (
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
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border-subtle/50 flex justify-center bg-surface-muted/10">
            <button className="text-secondary font-label-md text-label-md hover:text-primary hover:underline transition-colors cursor-pointer">Lihat Semua Transaksi</button>
          </div>
        </div>
      </div>

      {/* Transfer Bank Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-primary/45 flex items-center justify-center z-50 p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl border border-border-subtle shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-slide-up">
            <div className="px-6 py-4 border-b border-border-subtle/50 flex justify-between items-center bg-surface-muted/20">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Transfer Antar Bank</h3>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="text-on-surface-variant/60 hover:text-primary hover:bg-surface-container/60 transition-colors w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-error-container/15 text-on-error-container text-body-sm font-semibold border border-error-container/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-error">warning</span>
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant">Dari Rekening</label>
                  <select 
                    required
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md cursor-pointer"
                  >
                    <option value="">Pilih Rekening Asal...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (Saldo: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant">Ke Rekening</label>
                  <select 
                    required
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md cursor-pointer"
                  >
                    <option value="">Pilih Rekening Tujuan...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (Saldo: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant">Nominal Transfer (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      required
                      min={1000}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(Number(e.target.value))}
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant">Tanggal</label>
                    <input 
                      type="date" 
                      required
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant">Keterangan</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Pemindahan Saldo Operasional"
                    value={transferDesc}
                    onChange={(e) => setTransferDesc(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle/50 bg-surface-muted/20 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>Batal</Button>
                <Button type="submit">Kirim Transfer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}