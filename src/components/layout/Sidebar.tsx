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
      { label: 'Akuntansi', href: '/accounting', icon: 'account_balance' },
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
      { label: 'Tenggat Waktu', href: '/deadlines', icon: 'event_upcoming' },
      { label: 'Daftar Perusahaan', href: '/companies', icon: 'corporate_fare' },
      { label: 'Pengaturan', href: '/settings', icon: 'settings' },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { company } = useApp();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[35] xl:hidden transition-opacity duration-300 cursor-pointer"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 flex flex-col h-screen bg-gradient-premium text-on-primary pt-8 pb-6 border-r border-primary-container/20 shadow-2xl overflow-hidden transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          xl:translate-x-0 xl:z-20
        `}
      >
        {/* Brand Header */}
        <div className="px-6 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-secondary to-secondary-container flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(67,93,149,0.35)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            {/* Logo Perisai Fiskal & Kurva Pertumbuhan */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="shield-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#8AB4F8" />
                </linearGradient>
              </defs>
              {/* Perisai Kepatuhan Fiskal */}
              <path
                d="M12 2L4 5V11C4 16.52 7.42 21.68 12 23C16.58 21.68 20 16.52 20 11V5L12 2Z"
                stroke="url(#shield-glow)"
                strokeWidth="2"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]"
              />
              {/* Tren Finansial Naik (Growth) */}
              <path
                d="M8 15.5L11 12.5L13.5 15L17 11.5"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Panah Pertumbuhan */}
              <path
                d="M14.5 11.5H17V14"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Pilar Akurasi Fiskal (Titik Keseimbangan) */}
              <circle cx="12" cy="7.5" r="1.5" fill="#34A853" className="animate-pulse" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-[0.18em] text-white uppercase">
              FIN<span className="text-secondary font-medium">CORP</span>
            </h1>
            <p className="text-[8px] font-black text-secondary-container/70 uppercase tracking-[0.22em] mt-0.5">FISCAL SUITE</p>
          </div>
        </div>

        {/* Active Tenant Profile Badge */}
        <div className="px-4 mb-4">
          <Link href="/companies" onClick={onClose} className="block w-full">
            <div className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-inner transition-all duration-300 hover:border-white/20 cursor-pointer group">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-positive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success-positive"></span>
                </span>
                <span className="text-xs font-bold text-white tracking-wide truncate min-w-0 block" title={company.name}>
                  {company.name}
                </span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-on-primary/40 group-hover:text-on-primary group-hover:rotate-180 transition-all duration-300 shrink-0 ml-1">swap_horiz</span>
            </div>
          </Link>
        </div>

        {/* Main Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-4 custom-scrollbar pb-6">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="text-[10px] font-black text-on-primary/35 tracking-[0.2em] px-3 uppercase mb-1">
                {group.title}
              </div>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 cursor-pointer text-xs font-semibold tracking-wide
                      ${
                        active
                          ? 'bg-secondary text-on-primary shadow-md shadow-secondary/15 border-l-4 border-l-secondary-container pl-4'
                          : 'text-on-primary/60 hover:text-on-primary hover:bg-white/5 pl-3 hover:pl-4'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span className="text-[12.5px]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Support Info */}
        <div className="px-6 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-on-primary/40 font-medium shrink-0">
          <span>Version 1.2.0</span>
          <Link href="/support" onClick={onClose} className="hover:text-white transition-colors flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[12px]">help</span>
            Bantuan
          </Link>
        </div>
      </aside>
    </>
  );
}