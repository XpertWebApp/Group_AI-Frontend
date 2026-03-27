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
    <header className="sticky top-0 z-30 h-[68px] bg-white border-b-[0.8px] border-sett-border-light">
      <div className="flex items-center justify-between h-full px-5">
      <div>
        <h1 className="font-montserrat text-[18px] font-semibold leading-normal text-sett-text-primary">{title}</h1>
        {subtitle && (
          <p className="font-montserrat text-[13px] font-normal text-sett-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <div className="relative group">
          <LanguageToggle />
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-sett-navy text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-50">
            Switch Language
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-sett-navy" />
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

        {/* Notifications */}
        <div className="relative group">
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
          <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-sett-navy text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-50">
            Notifications
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-sett-navy" />
          </span>
        </div>

        {/* Logout */}
        {onLogoutClick && (
          <div className="relative group">
            <button
              type="button"
              onClick={onLogoutClick}
              className="p-2 rounded-lg hover:bg-sett-border/50 transition-colors text-sett-text-secondary hover:text-sett-text-primary"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-sett-navy text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-50">
              Logout
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-sett-navy" />
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
