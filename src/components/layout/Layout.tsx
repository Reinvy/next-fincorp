'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMobileHeader?: boolean;
}

export default function Layout({
  children,
  showSearch = true,
  showNotifications = true,
  showMobileHeader = true,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar with responsive drawer props */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden xl:pl-64">
        {/* Top Header with Menu Click callback */}
        {showMobileHeader && (
          <Header
            showSearch={showSearch}
            showNotifications={showNotifications}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-margin-edge bg-surface-muted custom-scrollbar">
          <div className="max-w-container-max mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}