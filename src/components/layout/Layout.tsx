'use client';

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
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden xl:pl-64">
        {/* Top Header */}
        {showMobileHeader && <Header showSearch={showSearch} showNotifications={showNotifications} />}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-margin-edge bg-surface-muted custom-scrollbar">
          <div className="max-w-container-max mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}