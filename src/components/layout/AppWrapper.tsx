"use client";

import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import OutletFloatingButton from '@/components/layout/OutletFloatingButton';
import { OutletProvider } from '@/contexts/OutletContext';
import { PanelLeft } from 'lucide-react';
import { createContext, useContext, useState } from 'react';

// Create context for sidebar collapse state
const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const isLoginPage = pathname === '/login';
  const isPOSPage = pathname.startsWith('/pos/') || pathname.match(/^\/table-ordering\/\d+$/) || pathname === '/purchase' || pathname === '/barcodes';

  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isLoginPage) {
    return <main className="bg-background min-h-screen">{children}</main>;
  }

  if (!user && !isLoginPage) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // Only wrap with OutletProvider after user is authenticated. For cashier: show outlet icon only if assigned to more than one outlet.
  const isCashier = user?.role === 'cashier';
  const hasMultipleOutlets = (user?.outlets?.length ?? 0) > 1;
  const showOutletFloating = pathname !== '/dashboard' && (!isCashier || hasMultipleOutlets);

  return (
    <OutletProvider>
      <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar />
          {isPOSPage ? (
            <main className="flex-1 overflow-hidden relative">
              {children}
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-8 relative">
              <div className="max-w-6xl mx-auto">
                {children}
              </div>
            </main>
          )}
        </div>
        {showOutletFloating && <OutletFloatingButton />}
      </SidebarContext.Provider>
    </OutletProvider>
  );
}
