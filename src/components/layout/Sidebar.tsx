'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Accounting', href: '/accounting', icon: 'account_balance' },
  { label: 'Sales', href: '/sales', icon: 'receipt_long' },
  { label: 'Purchases', href: '/purchases', icon: 'shopping_cart' },
  { label: 'Cash & Bank', href: '/cash-bank', icon: 'account_balance_wallet' },
  { label: 'Fixed Assets', href: '/fixed-assets', icon: 'precision_manufacturing' },
  { label: 'Tax Module', href: '/tax', icon: 'gavel' },
  { label: 'Reports', href: '/reports', icon: 'assessment' },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: 'settings' },
  { label: 'Support', href: '/support', icon: 'help_outline' },
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
    <aside className="hidden xl:flex flex-col h-screen w-64 bg-gradient-premium text-on-primary py-margin-edge fixed left-0 top-0 z-20 border-r border-primary-container/20 shadow-2xl">
      {/* Brand Header */}
      <div className="px-margin-edge mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-on-primary border border-white/10 shadow-lg shadow-black/10">
          <span className="material-symbols-outlined text-secondary-container">domain</span>
        </div>
        <div>
          <h1 className="font-headline-sm text-on-primary font-bold tracking-tight truncate max-w-[150px]">{company.name}</h1>
          <p className="font-label-md text-secondary-container/70 text-[10px]">Corporate Accounting</p>
        </div>
      </div>

      {/* New Transaction Button */}
      <div className="px-margin-edge mb-6">
        <Link
          href="/sales/invoice"
          className="w-full bg-gradient-accent-premium text-on-primary hover:shadow-lg hover:shadow-secondary/20 hover:-translate-y-0.5 active:translate-y-0 py-2.5 px-4 rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 transition-all transform duration-300"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Transaction
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 custom-scrollbar">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all transform duration-300
              ${
                isActive(item.href)
                  ? 'bg-secondary/30 text-on-primary font-semibold shadow-md border-l-4 border-secondary-container translate-x-1'
                  : 'text-on-primary/60 hover:text-on-primary hover:bg-secondary/10 hover:translate-x-1'
              }
            `}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body-md text-[13.5px]">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 pt-4 border-t border-white/5 space-y-1.5">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all transform duration-300
              ${
                isActive(item.href)
                  ? 'bg-secondary/30 text-on-primary font-semibold shadow-md border-l-4 border-secondary-container translate-x-1'
                  : 'text-on-primary/60 hover:text-on-primary hover:bg-secondary/10 hover:translate-x-1'
              }
            `}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body-sm">{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}