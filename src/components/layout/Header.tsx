'use client';

import { useState } from 'react';
import Link from 'next/link';
import { currentUser } from '@/data';
import { useApp } from '@/context/AppContext';

interface HeaderProps {
  showSearch?: boolean;
  showNotifications?: boolean;
}

export default function Header({ showSearch = true, showNotifications = true }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useApp();

  return (
    <header className="flex justify-between items-center w-full px-margin-edge h-[64px] glass-header sticky top-0 z-10 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        {/* Mobile Logo */}
        <Link href="/dashboard" className="xl:hidden font-headline-md text-headline-md text-primary font-bold">
          FinCorp
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center h-full gap-6 border-l border-border-subtle/50 pl-6">
          <Link
            href="/companies"
            className="h-full flex items-center text-on-surface-variant hover:text-primary transition-all duration-300 font-label-md text-label-md uppercase tracking-wider hover:-translate-y-0.5"
          >
            Companies
          </Link>
          <Link
            href="/deadlines"
            className="h-full flex items-center text-on-surface-variant hover:text-primary transition-all duration-300 font-label-md text-label-md uppercase tracking-wider hover:-translate-y-0.5"
          >
            Deadlines
          </Link>
        </nav>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        {showSearch && (
          <div className="hidden lg:flex items-center relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-surface/50 border border-border-subtle/70 rounded-full text-body-sm font-body-sm focus:outline-none focus:bg-surface focus:border-secondary focus:ring-4 focus:ring-secondary/10 w-64 focus:w-72 transition-all duration-300 shadow-inner outline-none"
            />
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

          {showNotifications && (
            <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all duration-300 transform active:scale-90 relative" title="Notifikasi">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full animate-ping"></span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
            </button>
          )}

          <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-all duration-300 transform active:scale-90 hidden sm:block" title="Bisnis">
            <span className="material-symbols-outlined">business_center</span>
          </button>

          <div className="h-6 w-px bg-border-subtle/50 mx-1 hidden sm:block"></div>

          {/* Profile Button */}
          <button className="flex items-center gap-2 hover:bg-surface-container/60 hover:shadow-sm px-2.5 py-1.5 rounded-full transition-all duration-300 transform active:scale-95 group">
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
        </div>
      </div>
    </header>
  );
}