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
    <aside className="hidden xl:flex flex-col h-screen w-64 bg-primary text-on-primary py-margin-edge fixed left-0 top-0 z-20">
      {/* Brand Header */}
      <div className="px-margin-edge mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <span className="material-symbols-outlined">domain</span>
        </div>
        <div>
          <h1 className="font-headline-sm text-on-primary font-bold truncate max-w-[150px]">{company.name}</h1>
          <p className="font-label-md text-on-primary/70">Corporate Accounting</p>
        </div>
      </div>

      {/* New Transaction Button */}
      <div className="px-margin-edge mb-6">
        <Link
          href="/sales/invoice"
          className="w-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed hover:text-on-secondary py-2 px-4 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Transaction
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-200
              ${
                isActive(item.href)
                  ? 'bg-secondary/20 border-r-4 border-secondary-container text-on-primary font-medium'
                  : 'text-on-primary/70 hover:text-on-primary hover:bg-secondary/10'
              }
            `}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body-md">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 pt-4 border-t border-primary-container/30 space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200
              ${
                isActive(item.href)
                  ? 'bg-secondary/20 border-r-4 border-secondary-container text-on-primary'
                  : 'text-on-primary/70 hover:text-on-primary hover:bg-secondary/10'
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