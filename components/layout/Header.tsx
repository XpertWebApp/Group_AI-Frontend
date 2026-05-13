'use client';

import { Bell, ChevronDown, LogOut, Menu, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { NotificationsModal } from '@/components/ui/NotificationsModal';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useAppLayout } from '@/app/(dashboard)/AppLayoutContext';
import { useNotifications } from '@/lib/notifications/NotificationsContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAppSelector } from '@/hooks/useAppSelector';
import { isMuted, setMuted, playNotificationChime, unlockAudio } from '@/lib/notifications/sound';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onRefresh?: () => void;
}

const ORIGINAL_TITLE = 'SETT - Sport & Events Tours & Travel';

function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  const first = firstName?.trim()?.[0] ?? '';
  const last = lastName?.trim()?.[0] ?? '';
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return email.slice(0, 2).toUpperCase();
}

export function Header({ title, subtitle, actions, onRefresh }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { onLogoutClick, openMobileSidebar } = useAppLayout();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const user = useAppSelector((s) => s.auth.user);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const toggleMuted = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) {
      unlockAudio();
      playNotificationChime();
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = unreadCount > 0
      ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${ORIGINAL_TITLE}`
      : ORIGINAL_TITLE;
    return () => {
      document.title = ORIGINAL_TITLE;
    };
  }, [unreadCount]);

  // Close user menu on outside click or Escape.
  useEffect(() => {
    if (!userMenuOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [userMenuOpen]);

  const handleNotificationsClose = () => setNotificationsOpen(false);

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  const initials = user ? getInitials(user.firstName, user.lastName, user.email) : '';
  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : '';

  return (
    <header className="sticky top-0 z-30 bg-sett-navy">
      <div className="flex items-center justify-between h-[64px] px-4 sm:px-5">
        {/* ─── Left: Mobile menu + Logo (mobile-only) + Title ─── */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Mobile-only: hamburger to open the sidebar */}
          <button
            type="button"
            onClick={openMobileSidebar}
            className="lg:hidden p-2 -ml-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo: shown on screens where the sidebar is hidden (< lg) */}
          <div className="lg:hidden shrink-0">
            <Image
              src="/icons/sett_logo.svg"
              alt="SETT Hub"
              width={36}
              height={36}
              className="h-9 w-auto"
              priority
            />
          </div>

          <div className="hidden sm:block w-px h-7 bg-white/10 lg:hidden" />

          <div className="min-w-0">
            <h1 className="font-montserrat text-[18px] sm:text-[20px] font-extrabold leading-tight text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="font-montserrat text-[12px] sm:text-[13px] font-normal text-white/65 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* ─── Right: Actions ─── */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Language toggle — prominent per §7.4 */}
          <div className="relative group">
            <LanguageToggle />
            <Tooltip>Switch Language</Tooltip>
          </div>

          {/* Vertical divider */}
          <div className="hidden sm:block w-px h-6 bg-white/10 mx-1" />

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Refresh"
            />
          )}

          {/* Sound toggle */}
          <div className="relative group">
            <button
              type="button"
              onClick={toggleMuted}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={muted ? t.notifications.unmuteSound : t.notifications.muteSound}
              aria-pressed={muted}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <Tooltip>{muted ? t.notifications.unmuteSound : t.notifications.muteSound}</Tooltip>
          </div>

          {/* Notifications */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            >
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bell-shake' : ''}`} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-sett-primary text-sett-navy text-[10px] font-bold leading-none font-montserrat shadow-[0_2px_6px_rgba(170,199,55,0.5)] ring-2 ring-sett-navy">
                    {badgeLabel}
                  </span>
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-sett-primary opacity-50 animate-ping" aria-hidden />
                </>
              )}
            </button>
            <Tooltip>Notifications</Tooltip>
          </div>

          {/* Divider before user */}
          {user && <div className="hidden sm:block w-px h-6 bg-white/10 mx-1" />}

          {/* User identity + menu */}
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 sm:gap-2.5 pl-1 pr-1 sm:pr-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label={`Account menu for ${displayName}`}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sett-primary text-sett-navy font-montserrat font-bold text-[12px] ring-2 ring-white/15">
                  {initials}
                </span>
                <span className="hidden lg:flex flex-col items-start leading-tight max-w-[140px]">
                  <span className="font-montserrat text-[13px] font-semibold text-white truncate w-full text-left">
                    {displayName}
                  </span>
                  {roleLabel && (
                    <span className="font-montserrat text-[11px] font-medium text-white/60 truncate w-full text-left">
                      {roleLabel}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`hidden sm:block w-4 h-4 text-white/70 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 min-w-[220px] bg-white rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-sett-border-light overflow-hidden animate-sidebar-fade-up"
                >
                  {/* Header band — identity confirmation */}
                  <div className="px-4 py-3 border-b border-sett-border-light bg-sett-background">
                    <p className="font-montserrat text-[13px] font-semibold text-sett-text-primary truncate">
                      {displayName}
                    </p>
                    <p className="font-montserrat text-[11px] text-sett-text-accent truncate mt-0.5">
                      {user.email}
                    </p>
                    {roleLabel && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-sett-primary/15 text-sett-primary font-montserrat text-[10px] font-bold uppercase tracking-wide">
                        {roleLabel}
                      </span>
                    )}
                  </div>

                  {/* Logout action */}
                  {onLogoutClick && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogoutClick();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 font-montserrat text-[13px] font-medium text-sett-text-primary hover:bg-sett-background transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-sett-text-accent" />
                      Logout
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {actions}
        </div>
      </div>

      {/* Thin green accent line — echoes brand "Green Bottom Bar" idiom (§8.2) */}
      <div className="h-[2px] bg-sett-primary" />

      <NotificationsModal open={notificationsOpen} onClose={handleNotificationsClose} />
    </header>
  );
}

/* ─── Tooltip helper — white pill so it reads against the navy header ─── */
function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-white text-sett-navy text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-50">
      {children}
      <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-white" />
    </span>
  );
}
