import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { OfflineSyncBar } from './OfflineSyncBar';

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-full w-full gradient-mesh overflow-x-hidden">
      {/* Sidebar Component (Desktop fixed + Mobile drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col w-full min-w-0 md:ml-64 transition-all duration-300">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <OfflineSyncBar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
