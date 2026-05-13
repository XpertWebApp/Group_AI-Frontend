'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { LogoutModal } from '@/components/ui/LogoutModal';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api/auth';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { logout as logoutAction } from '@/lib/store/slices/authSlice';
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
        openMobileSidebar: () => setMobileOpen(true),
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
            <main className="flex-1 bg-sett-background overflow-y-auto overflow-x-hidden min-h-0">
              {children}
            </main>
          </div>
        </div>
        <footer
          className={cn(
            'w-full shrink-0',
            'transition-[margin-left] duration-320 ease-sett-in-out sett-motion-collapse',
            sidebarMarginClass
          )}
        >
          {/* Copyright band (black) */}
          <div className="h-[32px] flex items-center px-[14px] bg-sett-black">
            <span className="font-montserrat text-[11px] font-medium text-sett-text-accent">
              © 2026 S-E-T-T &nbsp;|&nbsp; All Rights Reserved
            </span>
          </div>
          {/* §8.2 Green Bottom Bar — the brand's visual anchor */}
          <div aria-hidden className="h-[8px] bg-sett-primary" />
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
