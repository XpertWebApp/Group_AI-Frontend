'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { LogoutModal } from '@/components/ui/LogoutModal';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { logout as logoutAction } from '@/lib/store/slices/authSlice';
import { Menu } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useAppDispatch();
  const router = useRouter();

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
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar
        onLogoutClick={() => setLogoutOpen(true)}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col lg:ml-sidebar min-h-screen">
        <div className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3 bg-sett-card border-b border-sett-border lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-sett-border/50"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        <main className="flex-1 p-4 md:p-6 bg-sett-background">{children}</main>
      </div>
      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}
