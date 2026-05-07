'use client';

import { Bell, LogOut, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NotificationsModal } from '@/components/ui/NotificationsModal';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useAppLayout } from '@/app/(dashboard)/AppLayoutContext';
import { useNotifications } from '@/lib/notifications/NotificationsContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { isMuted, setMuted, playNotificationChime, unlockAudio } from '@/lib/notifications/sound';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
}

const ORIGINAL_TITLE = 'SETT - Sport & Events Tours & Travel';

export function Header({ title, subtitle, actions, onRefresh }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [muted, setMutedState] = useState(false);
  const { onLogoutClick } = useAppLayout();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();

  // Read persisted mute pref on mount (avoids SSR/client mismatch).
  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    // When un-muting, play a quick preview so the user hears what they enabled.
    if (!next) {
      unlockAudio();
      playNotificationChime();
    }
  };

  // Reflect unread count in the browser tab title — users notice it even when
  // they're on another tab.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = unreadCount > 0
      ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${ORIGINAL_TITLE}`
      : ORIGINAL_TITLE;
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [unreadCount]);

  const handleNotificationsClose = () => {
    setNotificationsOpen(false);
  };

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

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

          {/* Notification sound toggle */}
          <div className="relative group">
            <button
              type="button"
              onClick={toggleMuted}
              className="p-2 rounded-lg hover:bg-sett-border/50 transition-colors"
              aria-label={muted ? t.notifications.unmuteSound : t.notifications.muteSound}
              aria-pressed={muted}
            >
              {muted ? (
                <VolumeX className="w-5 h-5 text-sett-text-accent" />
              ) : (
                <Volume2 className="w-5 h-5 text-sett-text-secondary" />
              )}
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-sett-navy text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-50">
              {muted ? t.notifications.unmuteSound : t.notifications.muteSound}
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-sett-navy" />
            </span>
          </div>

          {/* Notifications */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-lg hover:bg-sett-border/50 transition-colors"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            >
              <Bell className={`w-5 h-5 text-sett-text-secondary ${unreadCount > 0 ? 'animate-bell-shake' : ''}`} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-sett-primary text-white text-[10px] font-bold leading-none font-montserrat shadow-[0_2px_6px_rgba(170,199,55,0.5)] ring-2 ring-white">
                    {badgeLabel}
                  </span>
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-sett-primary opacity-50 animate-ping" aria-hidden />
                </>
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
