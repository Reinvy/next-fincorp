'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { currentUser } from '@/data';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data';

interface HeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
  onMenuClick?: () => void;
}

export default function Header({
  showSearch = true,
  showNotifications = true,
  onMenuClick,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const {
    theme,
    toggleTheme,
    alerts,
    dismissAlert,
    salesInvoices,
    purchaseInvoices,
    bankAccounts,
    showToast
  } = useApp();

  // Search through sales invoices, purchase invoices, and bank accounts
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const results: { type: 'sales' | 'purchases' | 'bank'; title: string; subtitle: string; link: string }[] = [];

    // Search Sales Invoices (AR)
    salesInvoices.forEach(inv => {
      if (
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customerName.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'sales',
          title: inv.invoiceNumber,
          subtitle: `Pelanggan: ${inv.customerName} - ${formatCurrency(inv.grandTotal)}`,
          link: `/sales`,
        });
      }
    });

    // Search Purchase Invoices (AP)
    purchaseInvoices.forEach(inv => {
      if (
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.vendorName.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'purchases',
          title: inv.invoiceNumber,
          subtitle: `Vendor: ${inv.vendorName} - ${formatCurrency(inv.grandTotal)}`,
          link: `/purchases`,
        });
      }
    });

    // Search Bank Accounts
    bankAccounts.forEach(bank => {
      if (
        bank.name.toLowerCase().includes(query) ||
        bank.bankName.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'bank',
          title: bank.name,
          subtitle: `Rekening: ${bank.accountNumber} - Saldo: ${formatCurrency(bank.balance)}`,
          link: `/cash-bank`,
        });
      }
    });

    return results.slice(0, 5); // Return top 5 matches
  }, [searchQuery, salesInvoices, purchaseInvoices, bankAccounts]);

  const handleDismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissAlert(id);
  };

  const handleMarkAllAsRead = () => {
    alerts.forEach(alert => dismissAlert(alert.id));
  };

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      showToast('Simulasi Logout Berhasil. Sesi Anda telah diakhiri.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  const isAnyDropdownOpen = isNotificationsOpen || isProfileOpen || (isSearchFocused && searchQuery.length > 0);

  return (
    <header className="flex justify-between items-center w-full px-4 sm:px-margin-edge h-[64px] glass-header sticky top-0 z-30 shadow-sm">
      {/* Click Away Overlay */}
      {isAnyDropdownOpen && (
        <div
          className="fixed inset-0 z-10 bg-transparent"
          onClick={() => {
            setIsNotificationsOpen(false);
            setIsProfileOpen(false);
            setIsSearchFocused(false);
          }}
        />
      )}

      {/* Left Section */}
      <div className="flex items-center gap-3 z-20">
        {/* Menu Toggle Button (Mobile/Tablet only) */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="xl:hidden p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Open Sidebar"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        )}

        {/* Mobile Logo & Brand */}
        <Link href="/dashboard" className="xl:hidden flex items-center gap-2">
          {/* A miniature modern logo like in sidebar */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-secondary to-secondary-container flex items-center justify-center border border-white/10 shadow-[0_0_10px_rgba(67,93,149,0.35)] relative overflow-hidden shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="shield-glow-header" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#8AB4F8" />
                </linearGradient>
              </defs>
              <path
                d="M12 2L4 5V11C4 16.52 7.42 21.68 12 23C16.58 21.68 20 16.52 20 11V5L12 2Z"
                stroke="url(#shield-glow-header)"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M8 15.5L11 12.5L13.5 15L17 11.5"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.5 11.5H17V14"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="7.5" r="1.2" fill="#34A853" />
            </svg>
          </div>
          <div>
            <h1 className="text-xs font-black tracking-[0.15em] text-primary uppercase leading-none">
              FIN<span className="text-secondary font-medium">CORP</span>
            </h1>
            <p className="text-[6.5px] font-black text-on-surface-variant/50 uppercase tracking-[0.18em] mt-0.5 leading-none">FISCAL SUITE</p>
          </div>
        </Link>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 z-20">
        {/* Functional Global Search */}
        {showSearch && (
          <div className="hidden lg:flex items-center relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Cari invoice, pelanggan, rekening..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="pl-9 pr-4 py-1.5 bg-surface/50 border border-border-subtle/70 rounded-full text-body-sm font-body-sm focus:outline-none focus:bg-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 w-64 focus:w-80 transition-all duration-300 shadow-inner outline-none"
            />

            {/* Search Results Popover */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 mt-2.5 w-80 bg-surface/95 backdrop-blur-md border border-border-subtle rounded-2xl shadow-xl overflow-hidden animate-scale-up max-h-72 overflow-y-auto custom-scrollbar">
                <div className="px-4 py-2 border-b border-border-subtle/40 bg-surface-container/60 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Hasil Pencarian
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-on-surface-variant/70">
                    Tidak ada hasil untuk "{searchQuery}"
                  </div>
                ) : (
                  <div className="p-1.5 space-y-1">
                    {searchResults.map((result, idx) => (
                      <Link
                        key={`${result.type}-${idx}`}
                        href={result.link}
                        onClick={() => setIsSearchFocused(false)}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                      >
                        <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">
                          {result.type === 'sales' && 'receipt_long'}
                          {result.type === 'purchases' && 'shopping_cart'}
                          {result.type === 'bank' && 'account_balance_wallet'}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11.5px] font-bold text-on-surface block truncate">
                            {result.title}
                          </span>
                          <span className="text-[9.5px] text-on-surface-variant block truncate">
                            {result.subtitle}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all duration-300 transform active:scale-90"
            title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
          >
            <span className="material-symbols-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {/* Notifications Trigger */}
          {showNotifications && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className={`p-2 rounded-full transition-all duration-300 transform active:scale-90 relative ${
                  isNotificationsOpen ? 'bg-surface-container text-primary' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                }`}
                title="Notifikasi"
              >
                <span className="material-symbols-outlined">notifications</span>
                {alerts.length > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full animate-ping"></span>
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full border border-surface"></span>
                  </>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-80 bg-surface/95 backdrop-blur-md border border-border-subtle rounded-2xl shadow-xl overflow-hidden animate-scale-up">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-border-subtle/40 bg-surface-container/60">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      Notifikasi ({alerts.length})
                    </span>
                    {alerts.length > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-secondary hover:underline uppercase"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                    {alerts.length === 0 ? (
                      <div className="py-8 text-center text-xs text-on-surface-variant/60">
                        <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40 mb-1.5 block">notifications_off</span>
                        Tidak ada notifikasi baru
                      </div>
                    ) : (
                      alerts.map(alert => (
                        <div
                          key={alert.id}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors relative pl-4 overflow-hidden border border-border-subtle/20"
                        >
                          {/* semantic color indicator bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            alert.type === 'error' ? 'bg-error' :
                            alert.type === 'warning' ? 'bg-warning-deadline' : 'bg-secondary'
                          }`}></div>

                          <span className={`material-symbols-outlined text-[16px] mt-0.5 ${
                            alert.type === 'error' ? 'text-error' :
                            alert.type === 'warning' ? 'text-warning-deadline' : 'text-secondary'
                          }`}>
                            {alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                          </span>

                          <div className="flex-1 min-w-0">
                            <span className="text-[11.5px] font-bold text-on-surface block truncate">
                              {alert.title}
                            </span>
                            <span className="text-[10px] text-on-surface-variant block mt-0.5 leading-relaxed">
                              {alert.message}
                            </span>
                            {alert.link && (
                              <Link
                                href={alert.link}
                                onClick={() => setIsNotificationsOpen(false)}
                                className="inline-block text-[10px] font-bold text-secondary mt-1 hover:underline"
                              >
                                Lihat Tindakan &rarr;
                              </Link>
                            )}
                          </div>

                          <button
                            onClick={(e) => handleDismissAlert(alert.id, e)}
                            className="text-on-surface-variant/40 hover:text-on-surface p-0.5 rounded-full"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Business switcher / Redirect to companies */}
          <Link
            href="/companies"
            className="hidden sm:inline-flex p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all duration-300 transform active:scale-90"
            title="Daftar Perusahaan & Cabang"
          >
            <span className="material-symbols-outlined">business_center</span>
          </Link>

          <div className="h-6 w-px bg-border-subtle/50 mx-1 hidden sm:block"></div>

          {/* Profile Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-all duration-300 transform active:scale-95 group ${
                isProfileOpen ? 'bg-surface-container shadow-inner' : 'hover:bg-surface-container/60 hover:shadow-sm'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-secondary-premium flex items-center justify-center overflow-hidden border border-white/20 shadow-md transform group-hover:rotate-6 transition-transform duration-300">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-label-md text-[10px]">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>
              <span className="hidden lg:block font-label-md text-label-md text-primary font-semibold">
                {currentUser.name}
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px] hidden lg:block group-hover:translate-y-0.5 transition-transform">
                expand_more
              </span>
            </button>

            {/* Profile Dropdown Panel */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2.5 w-64 bg-surface/95 backdrop-blur-md border border-border-subtle rounded-2xl shadow-xl overflow-hidden animate-scale-up p-1.5 z-30">
                
                {/* Profile Header */}
                <div className="px-3 py-3 border-b border-border-subtle/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-secondary-premium flex items-center justify-center overflow-hidden border border-white/10 shadow">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-xs">{currentUser.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-on-surface block truncate">{currentUser.name}</span>
                    <span className="text-[9.5px] text-on-surface-variant block truncate">{currentUser.email}</span>
                    <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-black text-secondary bg-secondary/10 border border-secondary/20 rounded-md mt-1">
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Profile Menus */}
                <div className="py-1.5 space-y-0.5">
                  <Link
                    href="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Pengaturan
                  </Link>
                  <Link
                    href="/companies"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
                    Daftar Perusahaan
                  </Link>
                  <Link
                    href="/deadlines"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">event_upcoming</span>
                    Tenggat Waktu
                  </Link>
                  <Link
                    href="/support"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">help</span>
                    Pusat Bantuan
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="border-t border-border-subtle/30 pt-1.5 mt-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-error hover:bg-error-container/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Keluar / Sign Out
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}