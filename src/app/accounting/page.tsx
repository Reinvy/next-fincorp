'use client';

import { Layout } from '@/components/layout';
import { PageHeader, Button } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';

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
    id: 'journal',
    name: 'Jurnal Umum',
    description: 'Input dan kelola jurnal transaksi',
    icon: 'edit_note',
    href: '/accounting/journal',
    color: 'bg-secondary-fixed',
    iconColor: 'text-on-secondary-fixed',
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
  {
    id: 'closing',
    name: 'Penutup Buku',
    description: 'Prosedur penutup periode akuntansi',
    icon: 'lock_clock',
    href: '/accounting/closing',
    color: 'bg-surface-container-high',
    iconColor: 'text-primary',
  },
];

export default function AccountingPage() {
  const { accounts } = useApp();
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <PageHeader
          title="Accounting"
          description="Modul akuntansi untuk mengelola jurnal, buku besar, dan penutup buku."
          actions={
            <Button icon="add">Buat Jurnal Baru</Button>
          }
        />

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {accountingModules.map((module) => (
            <Link
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
              <div className="mt-4 pt-4 border-t border-border-subtle/40 flex justify-end text-[11px] font-label-md text-secondary group-hover:text-primary transition-colors">
                Buka Modul →
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="glass-card rounded-2xl p-6 hover:border-secondary-container/50 transition-all duration-300">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-5 font-semibold">Ringkasan Akuntansi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-border-subtle/50">
            <div className="pt-4 md:pt-0 md:pl-0">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Total Akun</p>
              <p className="text-2xl font-bold tracking-tight text-primary font-tabular-nums">{accounts.length}</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Jurnal Pending</p>
              <p className="text-2xl font-bold tracking-tight text-warning-deadline font-tabular-nums">5</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Periode Aktif</p>
              <p className="text-2xl font-bold tracking-tight text-primary font-tabular-nums">Des 2026</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <p className="font-label-md text-[11px] text-on-surface-variant mb-1.5 uppercase tracking-widest opacity-80">Status Buku</p>
              <p className="inline-flex items-center gap-1.5 text-lg font-bold text-success-positive mt-1 bg-success-positive/5 border border-success-positive/20 px-3 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-success-positive animate-pulse"></span>
                TERBUKA
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}