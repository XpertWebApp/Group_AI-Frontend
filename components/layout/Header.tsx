'use client';

import { LogOut } from 'lucide-react';
// import { Bell } from 'lucide-react'; // M4 — disabled for milestone1_2
// import { useState } from 'react'; // M4 — disabled for milestone1_2
// import { NotificationsModal } from '@/components/ui/NotificationsModal'; // M4 — disabled for milestone1_2
// import { LanguageToggle } from '@/components/ui/LanguageToggle'; // M5 — disabled for milestone1_2
import { useAppLayout } from '@/app/(dashboard)/AppLayoutContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, actions, onRefresh }: HeaderProps) {
  // const [notificationsOpen, setNotificationsOpen] = useState(false); // M4 — disabled for milestone1_2
  const { onLogoutClick } = useAppLayout();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-sett-border">
      <div>
        <h1 className="text-heading-sm font-bold text-sett-text-primary tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-body text-sett-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* <LanguageToggle /> */}{/* M5 — disabled for milestone1_2 */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-lg hover:bg-sett-border/50 transition-colors"
            aria-label="Refresh"
          />
        )}
        {/* M4 — notification bell disabled for milestone1_2
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className="p-2 rounded-lg hover:bg-sett-border/50 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-sett-text-secondary" />
        </button>
        */}
        {onLogoutClick && (
          <button
            type="button"
            onClick={onLogoutClick}
            className="p-2 rounded-lg hover:bg-sett-border/50 transition-colors text-sett-text-secondary hover:text-sett-text-primary"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
        {actions}
      </div>
      {/* M4 — notifications modal disabled for milestone1_2
      <NotificationsModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
      */}
    </header>
  );
}
