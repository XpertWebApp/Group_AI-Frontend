'use client';

import { Bell, LogOut } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { NotificationsModal } from '@/components/ui/NotificationsModal';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useAppLayout } from '@/app/(dashboard)/AppLayoutContext';
import { dashboardApi } from '@/lib/api/dashboard';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, actions, onRefresh }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { onLogoutClick } = useAppLayout();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await dashboardApi.getNotifications({ limit: 1 });
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const handleNotificationsClose = () => {
    setNotificationsOpen(false);
    // Re-fetch unread count in case user marked notifications as read
    fetchUnreadCount();
  };

  return (
    <header className="sticky top-0 z-30 h-[68px] bg-white border-b-[0.8px] border-sett-border-light shadow-[0_1px_2px_0_rgba(7,28,66,0.04),0_1px_3px_0_rgba(7,28,66,0.06)]">
      <div className="flex items-center justify-between h-full px-5">
      <div>
        <h1 className="font-montserrat text-[18px] font-semibold leading-normal text-sett-text-primary">{title}</h1>
        {subtitle && (
          <p className="font-montserrat text-[13px] font-normal text-sett-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative group/tooltip-lang">
          <LanguageToggle />
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-[#1D1D1D] text-white font-montserrat text-[11px] whitespace-nowrap opacity-0 group-hover/tooltip-lang:opacity-100 transition-opacity duration-200 z-50">
            Switch Language
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-sett-border/50 transition-colors"
            aria-label="Refresh"
          />
        )}
        <div className="relative group/tooltip-bell">
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded-lg hover:bg-sett-border/50 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-sett-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sett-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sett-primary" />
              </span>
            )}
          </button>
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-[#1D1D1D] text-white font-montserrat text-[11px] whitespace-nowrap opacity-0 group-hover/tooltip-bell:opacity-100 transition-opacity duration-200 z-50">
            Notifications
          </span>
        </div>
        {onLogoutClick && (
          <div className="relative group/tooltip-logout">
            <button
              type="button"
              onClick={onLogoutClick}
              className="p-2 rounded-lg hover:bg-sett-border/50 transition-colors text-sett-text-secondary hover:text-sett-text-primary"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-[#1D1D1D] text-white font-montserrat text-[11px] whitespace-nowrap opacity-0 group-hover/tooltip-logout:opacity-100 transition-opacity duration-200 z-50">
              Logout
            </span>
          </div>
        )}
        {actions}
      </div>
      </div>
      <NotificationsModal
        open={notificationsOpen}
        onClose={handleNotificationsClose}
      />
    </header>
  );
}
