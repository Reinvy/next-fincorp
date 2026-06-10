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
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Accounting"
          description="Modul akuntansi untuk mengelola jurnal, buku besar, dan penutup buku."
          actions={
            <Button icon="add">Buat Jurnal Baru</Button>
          }
        />

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accountingModules.map((module) => (
            <Link
              key={module.id}
              href={module.href}
              className="bg-surface border border-border-subtle rounded-xl p-6 shadow-sm hover:shadow-md hover:border-secondary/50 transition-all group"
            >
              <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center mb-4`}>
                <span className={`material-symbols-outlined ${module.iconColor}`}>{module.icon}</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-primary mb-1 group-hover:text-secondary transition-colors">
                {module.name}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{module.description}</p>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="bg-surface border border-border-subtle rounded-xl p-6 shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-4">Ringkasan Akuntansi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Total Akun</p>
              <p className="font-headline-md text-headline-md text-primary font-tabular-nums">{accounts.length}</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Jurnal Pending</p>
              <p className="font-headline-md text-headline-md text-warning-deadline font-tabular-nums">5</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Periode Aktif</p>
              <p className="font-headline-md text-headline-md text-primary font-tabular-nums">Okt 2023</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">Status Buku</p>
              <p className="font-headline-md text-headline-sm text-success-positive font-tabular-nums">TERBUKA</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}