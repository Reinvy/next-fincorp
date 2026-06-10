'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { formatCurrency, accountCategories } from '@/data';
import type { Account, AccountType, Currency } from '@/data/types';

export default function COAPage() {
  const { accounts, addAccount } = useApp();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['acc-1-1', 'acc-1-1-1']));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccountCode, setNewAccountCode] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('ASSET');
  const [newAccountCurrency, setNewAccountCurrency] = useState<Currency>('IDR');
  const [newAccountParent, setNewAccountParent] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState(0);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const expandAll = () => {
    setExpandedIds(new Set(accounts.map(a => a.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const filterAccounts = (accountsList: Account[], parentId?: string): Account[] => {
    return accountsList.filter(account => {
      const matchesParent = account.parentId === parentId;
      const matchesCategory = selectedCategories.includes(account.type);
      return matchesParent && matchesCategory;
    });
  };

  const getChildren = (parentId: string): Account[] => {
    return accounts.filter(a => a.parentId === parentId);
  };

  const hasChildren = (id: string): boolean => {
    return accounts.some(a => a.parentId === id);
  };

  const getAccountTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      ASSET: { bg: 'bg-surface-container-high text-on-surface', text: 'text-xs' },
      LIABILITY: { bg: 'bg-error-container text-on-error-container', text: 'text-xs' },
      EQUITY: { bg: 'bg-secondary-fixed text-on-secondary-fixed', text: 'text-xs' },
      REVENUE: { bg: 'bg-success-positive/10 text-success-positive', text: 'text-xs' },
      EXPENSE: { bg: 'bg-warning-deadline/10 text-warning-deadline', text: 'text-xs' },
    };
    const badge = badges[type] || badges.ASSET;
    return (
      <span className={`px-2 py-0.5 rounded ${badge.bg} ${badge.text} font-medium`}>
        {type === 'ASSET' ? 'Aset' :
         type === 'LIABILITY' ? 'Liabilitas' :
         type === 'EQUITY' ? 'Ekuitas' :
         type === 'REVENUE' ? 'Pendapatan' : 'Beban'}
      </span>
    );
  };

  const getIndent = (level: number) => {
    return level * 4;
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountCode || !newAccountName) return;

    // Determine level based on parent
    let level = 1;
    if (newAccountParent) {
      const parentAcc = accounts.find(a => a.id === newAccountParent);
      if (parentAcc) {
        level = parentAcc.level + 1;
      }
    }

    addAccount({
      code: newAccountCode,
      name: newAccountName,
      type: newAccountType,
      currency: newAccountCurrency,
      parentId: newAccountParent || undefined,
      level,
      isActive: true,
      balance: newAccountBalance
    });

    // Reset Form & Close Modal
    setNewAccountCode('');
    setNewAccountName('');
    setNewAccountType('ASSET');
    setNewAccountCurrency('IDR');
    setNewAccountParent('');
    setNewAccountBalance(0);
    setIsModalOpen(false);
  };

  const renderAccountRow = (account: Account) => {
    const isExpanded = expandedIds.has(account.id);
    const children = getChildren(account.id);
    const hasKids = children.length > 0;
    const indent = getIndent(account.level);

    return (
      <tr key={account.id} className="hover:bg-surface-container-low transition-colors group">
        <td className="py-2 px-4" style={{ paddingLeft: `${indent + 16}px` }}>
          <div className="flex items-center gap-2">
            {hasKids && (
              <button
                onClick={() => toggleExpand(account.id)}
                className="text-outline hover:text-primary transition-colors flex items-center justify-center w-5 h-5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isExpanded ? 'expand_more' : 'chevron_right'}
                </span>
              </button>
            )}
            {!hasKids && account.level > 1 && (
              <div className="w-5 h-5 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-border-subtle"></span>
              </div>
            )}
            <span className={`font-tabular-nums ${account.level <= 2 ? 'font-bold text-primary' : 'font-medium text-on-surface'}`}>
              {account.code}
            </span>
            <span className={`${account.level <= 2 ? 'font-bold text-primary' : 'font-medium text-on-surface'}`}>
              {account.name}
            </span>
          </div>
        </td>
        <td className="py-2 px-4">
          {account.level === 1 ? (
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-xs font-medium text-on-surface">Header</span>
          ) : (
            getAccountTypeBadge(account.type)
          )}
        </td>
        <td className="py-2 px-4 text-on-surface-variant">{account.currency}</td>
        <td className="py-2 px-4 text-right font-tabular-nums font-semibold">
          {formatCurrency(Math.abs(account.balance))}
        </td>
        <td className="py-2 px-4 text-center">
          <button className="text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </td>
      </tr>
    );
  };

  const renderAccounts = (parentId?: string, level = 1): React.ReactNode[] => {
    const filtered = filterAccounts(accounts, parentId);
    const rows: React.ReactNode[] = [];

    filtered.forEach(account => {
      rows.push(renderAccountRow(account));
      if (expandedIds.has(account.id)) {
        rows.push(...renderAccounts(account.id, account.level + 1));
      }
    });

    return rows;
  };

  const totalActiveAssets = accounts
    .filter(a => a.type === 'ASSET' && a.level === 1)
    .reduce((sum, a) => sum + a.balance, 0);

  // Filter accounts suitable as parents (e.g. level < 5 and not transaction level if nested)
  const parentCandidates = accounts.filter(a => a.level < 4);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Chart of Accounts"
          description="Kelola struktur daftar akun umum akuntansi Anda (Level 1-5)"
          actions={
            <>
              <Button variant="outline" icon="upload_file">Import Excel</Button>
              <Button variant="outline" icon="account_tree">Mapping Pajak</Button>
              <Button icon="add" onClick={() => setIsModalOpen(true)}>Tambah Akun Baru</Button>
            </>
          }
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Filter */}
            <div className="bg-surface border border-border-subtle rounded-lg p-4 shadow-sm">
              <h3 className="font-label-md text-label-md text-primary uppercase mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                Kategori Akun
              </h3>
              <div className="space-y-1">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container cursor-pointer transition-colors text-body-sm">
                  <input
                    type="checkbox"
                    checked={selectedCategories.length === 5}
                    onChange={() => setSelectedCategories(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'])}
                    className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="font-medium">Semua Kategori</span>
                </label>
                {accountCategories.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container cursor-pointer transition-colors text-body-sm border-l-2 ${
                      selectedCategories.includes(cat.id) ? 'border-primary bg-primary-fixed-dim/20 font-medium' : 'border-transparent'
                    }`}
                    style={{ paddingLeft: '24px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-surface border border-border-subtle rounded-lg p-4 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed-dim/20 to-transparent pointer-events-none"></div>
              <h3 className="font-label-md text-label-md text-on-surface-variant mb-1">Total Aset Aktif</h3>
              <div className="font-tabular-nums text-headline-sm font-bold text-primary mb-2">
                {formatCurrency(Math.abs(totalActiveAssets))}
              </div>
              <div className="flex items-center gap-1 text-success-positive text-body-sm">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>+2.4% vs bulan lalu</span>
              </div>
            </div>
          </div>

          {/* Main Table Area */}
          <div className="lg:col-span-3 bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden flex flex-col">
            {/* Table Header Controls */}
            <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row justify-between gap-3 bg-surface-muted">
              <div className="flex items-center gap-2">
                <span className="text-body-sm text-on-surface-variant">Menampilkan</span>
                <select className="border border-border-subtle rounded px-2 py-1 text-body-sm bg-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none">
                  <option>Semua</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <span className="text-body-sm text-on-surface-variant">baris</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={expandAll}
                  className="p-1.5 border border-border-subtle rounded text-on-surface-variant hover:bg-surface-container transition-colors" 
                  title="Expand All"
                >
                  <span className="material-symbols-outlined text-[18px]">unfold_more</span>
                </button>
                <button 
                  onClick={collapseAll}
                  className="p-1.5 border border-border-subtle rounded text-on-surface-variant hover:bg-surface-container transition-colors" 
                  title="Collapse All"
                >
                  <span className="material-symbols-outlined text-[18px]">unfold_less</span>
                </button>
                <div className="w-px h-6 bg-border-subtle mx-1"></div>
                <button className="p-1.5 border border-border-subtle rounded text-on-surface-variant hover:bg-surface-container transition-colors" title="Print">
                  <span className="material-symbols-outlined text-[18px]">print</span>
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-muted border-b border-border-subtle text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold w-2/5">Kode & Nama Akun</th>
                    <th className="py-3 px-4 font-semibold">Tipe</th>
                    <th className="py-3 px-4 font-semibold">Mata Uang</th>
                    <th className="py-3 px-4 font-semibold text-right">Saldo Saat Ini</th>
                    <th className="py-3 px-4 font-semibold text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm font-body-sm divide-y divide-border-subtle/50">
                  {renderAccounts()}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-border-subtle bg-surface-muted flex justify-between items-center text-body-sm text-on-surface-variant">
              <div>Menampilkan 1-{accounts.length} dari {accounts.length} Akun</div>
              <div className="flex gap-1">
                <button className="px-2 py-1 border border-border-subtle rounded bg-surface hover:bg-surface-container disabled:opacity-50" disabled>
                  &lt;
                </button>
                <button className="px-2 py-1 border border-primary rounded bg-primary-container text-primary font-medium">1</button>
                <button className="px-2 py-1 border border-border-subtle rounded bg-surface hover:bg-surface-container" disabled>&gt;</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tambah Akun Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-border-subtle shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-surface-muted">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Tambah Akun Baru</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-primary transition-colors w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Kode Akun</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1110-02" 
                      required
                      value={newAccountCode}
                      onChange={(e) => setNewAccountCode(e.target.value)}
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Tipe Akun</label>
                    <select 
                      value={newAccountType}
                      onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    >
                      <option value="ASSET">Aset</option>
                      <option value="LIABILITY">Liabilitas</option>
                      <option value="EQUITY">Ekuitas</option>
                      <option value="REVENUE">Pendapatan</option>
                      <option value="EXPENSE">Beban</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">Nama Akun</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Kas Kecil Cabang" 
                    required
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Mata Uang</label>
                    <select 
                      value={newAccountCurrency}
                      onChange={(e) => setNewAccountCurrency(e.target.value as Currency)}
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    >
                      <option value="IDR">IDR (Rupiah)</option>
                      <option value="USD">USD (Dolar AS)</option>
                      <option value="SGD">SGD (Dolar Singapura)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant">Saldo Awal</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={newAccountBalance}
                      onChange={(e) => setNewAccountBalance(Number(e.target.value))}
                      className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg font-tabular-nums focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant flex justify-between">
                    Akun Induk (Parent Account)
                    <span className="text-outline font-normal text-[10px]">Opsional</span>
                  </label>
                  <select 
                    value={newAccountParent}
                    onChange={(e) => setNewAccountParent(e.target.value)}
                    className="h-10 px-3 bg-surface-muted border border-border-subtle rounded-lg focus:ring-2 focus:ring-secondary/30 focus:border-secondary outline-none text-body-md"
                  >
                    <option value="">Tidak Ada (Header Level 1)</option>
                    {parentCandidates.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle bg-surface-muted flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}