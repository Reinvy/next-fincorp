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
    <header className="flex justify-between items-center w-full px-margin-edge h-[64px] bg-surface border-b border-border-subtle sticky top-0 z-10">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        {/* Mobile Logo */}
        <Link href="/dashboard" className="xl:hidden font-headline-md text-headline-md text-primary font-bold">
          FinCorp
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center h-full gap-6 border-l border-border-subtle pl-6">
          <Link
            href="/companies"
            className="h-full flex items-center text-on-surface-variant hover:text-primary transition-all duration-200 font-label-md text-label-md uppercase tracking-wider"
          >
            Companies
          </Link>
          <Link
            href="/deadlines"
            className="h-full flex items-center text-on-surface-variant hover:text-primary transition-all duration-200 font-label-md text-label-md uppercase tracking-wider"
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
              className="pl-9 pr-4 py-1.5 bg-surface-muted border border-border-subtle rounded-full text-body-sm font-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 transition-all"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-colors"
            title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
          >
            <span className="material-symbols-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          {showNotifications && (
            <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-colors relative" title="Notifikasi">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
            </button>
          )}

          <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-colors hidden sm:block" title="Bisnis">
            <span className="material-symbols-outlined">business_center</span>
          </button>

          <div className="h-6 w-px bg-border-subtle mx-1 hidden sm:block"></div>

          {/* Profile Button */}
          <button className="flex items-center gap-2 hover:bg-surface-container px-2 py-1 rounded-full transition-colors">
            <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden border border-border-subtle">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-on-secondary-container font-label-md text-[10px]">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
            <span className="hidden lg:block font-label-md text-label-md text-primary">
              {currentUser.name}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] hidden lg:block">
              expand_more
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}