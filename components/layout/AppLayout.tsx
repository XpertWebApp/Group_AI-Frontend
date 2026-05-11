'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { LogoutModal } from '@/components/ui/LogoutModal';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/auth';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { logout as logoutAction } from '@/lib/store/slices/authSlice';
import { Menu } from 'lucide-react';
import { AppLayoutProvider } from '@/app/(dashboard)/AppLayoutContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils/cn';

interface AppLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = 'sett:sidebar:collapsed';

export function AppLayout({ children }: AppLayoutProps) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Start expanded to match SSR; sync from localStorage after mount.
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t } = useLanguage();

  // Hydrate persisted collapse preference (post-mount to avoid SSR mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === '1') setSidebarCollapsedState(true);
    } catch {
      // ignore — localStorage may be unavailable in some environments
    }
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleLogoutConfirm = async () => {
    try {
      await authApi.logout();
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      dispatch(logoutAction());
      setLogoutOpen(false);
      toast.success(t.toasts.logoutSuccess);
      router.push('/login');
    }
  };

  // Tailwind needs full class names at build time, so we switch between two
  // pre-declared margin utilities rather than constructing one dynamically.
  const sidebarMarginClass = sidebarCollapsed ? 'lg:ml-sidebar-collapsed' : 'lg:ml-sidebar';

  return (
    <AppLayoutProvider
      value={{
        onLogoutClick: () => setLogoutOpen(true),
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
      }}
    >
      <div className="w-screen h-screen flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            isMobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <div
            className={cn(
              'flex-1 flex flex-col min-w-0',
              'transition-[margin-left] duration-320 ease-sett-in-out sett-motion-collapse',
              sidebarMarginClass
            )}
          >
            <div className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3 bg-sett-card border-b border-sett-border lg:hidden shrink-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-lg hover:bg-sett-border/50"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
            <main className="flex-1 bg-sett-background overflow-y-auto overflow-x-hidden min-h-0">
              {children}
            </main>
          </div>
        </div>
        <footer
          className={cn(
            'w-full h-[39px] flex items-center px-[14px] shrink-0',
            'transition-[margin-left] duration-320 ease-sett-in-out sett-motion-collapse',
            sidebarMarginClass
          )}
          style={{ background: '#0A0A0A', borderTop: '1px solid #E6EAF0' }}
        >
          <span className="font-montserrat text-[12px] font-medium" style={{ color: '#A3A3A3' }}>
            2026 S-E-T-T &nbsp;|&nbsp; All Rights Reserved
          </span>
        </footer>
      </div>
      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </AppLayoutProvider>
  );
}
