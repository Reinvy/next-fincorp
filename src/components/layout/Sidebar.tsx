'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'MENU UTAMA',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
      { label: 'Kas & Bank', href: '/cash-bank', icon: 'account_balance_wallet' },
    ],
  },
  {
    title: 'PEMBUKUAN & PAJAK',
    items: [
      { label: 'Buku Besar', href: '/accounting', icon: 'account_balance' },
      { label: 'Aset Tetap', href: '/fixed-assets', icon: 'precision_manufacturing' },
      { label: 'Modul Pajak', href: '/tax', icon: 'gavel' },
    ],
  },
  {
    title: 'TRANSAKSI',
    items: [
      { label: 'Penjualan (Sales)', href: '/sales', icon: 'receipt_long' },
      { label: 'Pembelian (Purchases)', href: '/purchases', icon: 'shopping_cart' },
    ],
  },
  {
    title: 'ANALISIS & SISTEM',
    items: [
      { label: 'Laporan Keuangan', href: '/reports', icon: 'assessment' },
      { label: 'Pengaturan', href: '/settings', icon: 'settings' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { company } = useApp();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden xl:flex flex-col h-screen w-64 bg-gradient-premium text-on-primary pt-8 pb-6 fixed left-0 top-0 z-20 border-r border-primary-container/20 shadow-2xl overflow-hidden">
      {/* Brand Header */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-secondary to-secondary-container flex items-center justify-center text-white border border-white/10 shadow-[0_0_15px_rgba(67,93,149,0.35)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="material-symbols-outlined text-[22px] font-bold text-white">insights</span>
        </div>
        <div>
          <h1 className="text-sm font-black tracking-widest text-white uppercase">FINCORP</h1>
          <p className="text-[10px] font-bold text-secondary-container/80 uppercase tracking-widest">FISCAL SUITE</p>
        </div>
      </div>

      {/* Active Tenant Profile Badge */}
      <div className="px-4 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2.5 shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-positive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-positive"></span>
          </span>
          <span className="text-xs font-semibold text-on-primary/80 truncate" title={company.name}>
            {company.name}
          </span>
        </div>
      </div>

      {/* Main Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-4 custom-scrollbar pb-6">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="text-[9px] font-bold text-on-primary/40 tracking-widest px-3 uppercase">
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer
                    ${
                      active
                        ? 'bg-secondary text-on-primary font-bold shadow-md shadow-secondary/15 border-l-4 border-l-secondary-container pl-4'
                        : 'text-on-primary/60 hover:text-on-primary hover:bg-white/5 pl-3 hover:pl-4'
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="text-body-md text-[13px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Support Info */}
      <div className="px-6 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-on-primary/40 font-medium shrink-0">
        <span>Version 1.2.0</span>
        <Link href="/support" className="hover:text-white transition-colors flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[12px]">help</span>
          Bantuan
        </Link>
      </div>
    </aside>
  );
}