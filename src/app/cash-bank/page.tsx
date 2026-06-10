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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-surface-container-lowest border border-border-subtle rounded-xl p-5 hover:shadow-sm transition-shadow relative overflow-hidden group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-surface-container-high rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    account.type === 'CASH' ? 'bg-surface-container-high text-primary' : 'bg-secondary-fixed text-on-secondary-fixed'
                  }`}>
                    <span className="material-symbols-outlined">
                      {account.type === 'CASH' ? 'payments' : 'account_balance'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface-variant">{account.name}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface">{account.accountNumber}</p>
                  </div>
                </div>
                <button className="text-outline hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
              <div className="relative z-10">
                <div className="font-tabular-nums text-headline-md font-bold text-on-surface">{formatCurrency(account.balance)}</div>
                <div className="flex items-center gap-2 mt-2 font-body-sm text-body-sm text-on-surface-variant">
                  <span className={`flex items-center ${account.changePercent >= 0 ? 'text-success-positive' : 'text-error'}`}>
                    <span className="material-symbols-outlined text-xs">
                      {account.changePercent >= 0 ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    {Math.abs(account.changePercent).toFixed(1)}%
                  </span>
                  <span>dari bulan lalu</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted">
            <h3 className="font-label-md text-label-md text-on-surface">Transaksi Terakhir</h3>
            <div className="flex gap-2">
              <button className="text-on-surface-variant hover:text-primary transition-colors px-2">
                <span className="material-symbols-outlined text-sm">filter_list</span>
              </button>
              <button className="text-on-surface-variant hover:text-primary transition-colors px-2">
                <span className="material-symbols-outlined text-sm">download</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted border-b border-border-subtle font-label-md text-label-md text-on-surface-variant">
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Deskripsi</th>
                  <th className="px-4 py-3 font-medium">Akun</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium text-right">Nominal (In/Out)</th>
                  <th className="px-4 py-3 font-medium text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="font-tabular-nums text-tabular-nums text-on-surface divide-y divide-border-subtle">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-container-low transition-colors group h-[40px]">
                    <td className="px-4 py-2">{tx.date}</td>
                    <td className="px-4 py-2 font-body-sm">{tx.description}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        tx.accountName.includes('BCA') ? 'bg-surface-variant text-on-surface' :
                        tx.accountName.includes('Mandiri') ? 'bg-surface-container-high text-on-surface' : 'bg-surface-container text-on-surface'
                      }`}>
                        {tx.accountName}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-body-sm text-on-surface-variant">{tx.category}</td>
                    <td className={`px-4 py-2 text-right ${tx.type === 'IN' ? 'text-success-positive' : 'text-error'}`}>
                      {tx.type === 'IN' ? '+ ' : '- '}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-2 text-right">{tx.balance > 0 ? formatCurrency(tx.balance) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border-subtle flex justify-center bg-surface-muted">
            <button className="text-primary font-label-md text-label-md hover:underline">Lihat Semua Transaksi</button>
          </div>
        </div>
      </div>

      {/* Transfer Bank Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-border-subtle shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Transfer Antar Bank</h3>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded bg-error-container text-on-error-container text-body-sm font-medium border border-error/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Dari Rekening</label>
                  <select 
                    required
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Pilih Rekening Asal...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (Saldo: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Ke Rekening</label>
                  <select 
                    required
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Pilih Rekening Tujuan...</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (Saldo: {formatCurrency(b.balance)})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Nominal Transfer (Rp)</label>
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
                    <label className="font-label-md text-label-md text-on-surface-variant">Tanggal</label>
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
                  <label className="font-label-md text-label-md text-on-surface-variant">Keterangan</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Pemindahan Saldo Operasional"
                    value={transferDesc}
                    onChange={(e) => setTransferDesc(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle bg-surface-muted flex justify-end gap-3">
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