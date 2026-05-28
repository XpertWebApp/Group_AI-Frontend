'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Settings,
  Search,
  MapPin,
  User,
  Building2,
  Loader2,
  Menu,
  Bell,
  Volume2,
  VolumeX,
  LogOut,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { requestsApi } from '@/lib/api/requests';
import type { BookingRequest } from '@/types';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { useAppLayout } from '@/app/(dashboard)/AppLayoutContext';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { NotificationsModal } from '@/components/ui/NotificationsModal';
import { useNotifications } from '@/lib/notifications/NotificationsContext';
import { isMuted, setMuted, playNotificationChime, unlockAudio } from '@/lib/notifications/sound';

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  children?: ReactNode;
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const { t } = useLanguage();
  const { sidebarCollapsed: rawSidebarCollapsed, toggleSidebar, setSidebarCollapsed, onLogoutClick } = useAppLayout();
  // When the mobile drawer is open, the sidebar takes its full width (via
  // max-lg:!w-sidebar on the <aside>), so the internal layout must also
  // render in expanded mode — otherwise users see the desktop's icon-only
  // chrome inside a wider drawer. Toggle handlers + persisted prefs still
  // use the raw state; only render-time logic uses this derived value.
  const sidebarCollapsed = rawSidebarCollapsed && !isMobileOpen;
  // Mobile-only chrome (notifications + mute) — these controls live in the
  // sidebar drawer on phones so the header has room for the page title.
  // On desktop the same controls live in the header; the sidebar versions
  // simply never render at lg+ (lg:hidden on the wrapper below).
  const { unreadCount } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [audioMuted, setAudioMutedState] = useState(false);
  useEffect(() => { setAudioMutedState(isMuted()); }, []);
  const toggleMuted = () => {
    const next = !audioMuted;
    setMuted(next);
    setAudioMutedState(next);
    if (!next) { unlockAudio(); playNotificationChime(); }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookingRequest[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/booking-requests', label: t.nav.groupRequests, icon: Users },
    { href: '/booking-requests/create', label: t.nav.createRequest, icon: PlusCircle },
    { href: '/settings', label: t.nav.settings, icon: Settings },
  ];

  const displayName =
    user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(' ')
      : user?.email ?? 'User';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut — press `[` anywhere to toggle the sidebar.
  // Skipped when focus is in an editable element so typing `[` into a field works normally.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== '[') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target.isContentEditable) return;
      e.preventDefault();
      toggleSidebar();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [toggleSidebar]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const result = await requestsApi.list({ search: q, limit: 7 });
        setSearchResults(result.requests);
        setSearchOpen(true);
        setActiveIndex(-1);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSelect = useCallback((request: BookingRequest) => {
    router.push(`/booking-requests/${request.id}`);
    setSearchQuery('');
    setSearchOpen(false);
    setSearchResults([]);
    setActiveIndex(-1);
    onMobileClose?.();
  }, [router, onMobileClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(searchResults[activeIndex]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const customerName = (r: BookingRequest) => {
    if (r.firstName || r.lastName) return [r.firstName, r.lastName].filter(Boolean).join(' ');
    if (r.contactName) return r.contactName;
    if (r.companyName) return r.companyName;
    return null;
  };

  // Click handler for the collapsed-state search button:
  // expand the sidebar then focus the input on the next frame.
  const expandAndFocusSearch = () => {
    setSidebarCollapsed(false);
    requestAnimationFrame(() => {
      setTimeout(() => inputRef.current?.focus(), 320);
    });
  };

  const content = (
    <>
      <div className="flex flex-col h-full">
        {/* Logo + collapse toggle.
            Height matches Header (64px) so the green strip below aligns across the top.
            When expanded, the toggle sits on the right edge of the row, next to the logo.
            When collapsed, the toggle stacks below a smaller logo so neither competes. */}
        <div
          className={cn(
            'h-[64px] flex items-center transition-[padding] duration-320 ease-sett-in-out',
            'animate-sidebar-fade-up',
            sidebarCollapsed ? 'px-1 justify-center' : 'px-6 justify-between gap-3'
          )}
          style={{ animationDelay: '120ms' }}
        >
          {/* The Link is the clipping container — its width animates between
              140px (expanded) and 64px (collapsed). The image inside scales
              to fill the Link's width so the WHOLE logo stays visible when
              the sidebar collapses; previously the image was pinned at 140px
              while the container shrank to 36px, which cropped the logo and
              only "S" was visible. 64px uses ~90% of the 72px collapsed
              sidebar so the wordmark stays readable at the smaller size. */}
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className={cn(
              'block transition-[width] duration-320 ease-sett-in-out',
              sidebarCollapsed ? 'w-[64px]' : 'w-[140px]'
            )}
            aria-label="SETT Home"
          >
            <Image
              src="/icons/sett_logo.svg"
              alt="SETT Logo"
              width={140}
              height={40}
              // w-full + h-auto = the logo scales down to whatever the Link
              // currently is, preserving its 14:4 aspect ratio.
              className="block w-full h-auto"
              priority
            />
          </Link>
          {/* Collapse/expand toggle — desktop only. Mobile uses a drawer.
              When expanded: visible here next to the logo.
              When collapsed: hidden here (moved to its own row below for centred alignment). */}
          {!sidebarCollapsed && (
            <SidebarCollapseToggle
              collapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
              expandLabel={t.nav.expandSidebar}
              collapseLabel={t.nav.collapseSidebar}
            />
          )}
        </div>

        {/* Collapsed-state toggle row — centred icon below the small logo */}
        {sidebarCollapsed && (
          <div className="hidden lg:flex justify-center px-3 pb-2">
            <SidebarCollapseToggle
              collapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
              expandLabel={t.nav.expandSidebar}
              collapseLabel={t.nav.collapseSidebar}
            />
          </div>
        )}

        {/* §8.2 green strip — runs continuously with the Header's underline across the top of the page */}
        <div aria-hidden className="h-[2px] bg-sett-primary shrink-0" />

        {/* Search */}
        <div
          className={cn(
            'border-b border-sett-sidebar-border transition-[padding] duration-320 ease-sett-in-out',
            'animate-sidebar-fade-up',
            sidebarCollapsed ? 'p-3' : 'p-3'
          )}
          style={{ animationDelay: '200ms' }}
        >
          {sidebarCollapsed ? (
            <SidebarIconButton
              label={t.nav.searchAnything}
              onClick={expandAndFocusSearch}
              icon={Search}
            />
          ) : (
            <div ref={searchWrapperRef} className="relative animate-fade-in-right">
              {searchLoading ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              )}
              <input
                ref={inputRef}
                type="search"
                placeholder={t.nav.searchAnything}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-sett-primary"
                autoComplete="off"
              />

              {/* Results dropdown */}
              {searchOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[9999] bg-white rounded-[14px] shadow-[0_8px_32px_0_rgba(0,0,0,0.18)] border border-sett-border-light overflow-hidden">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                      <p className="font-montserrat text-[13px] text-sett-text-secondary">No requests found</p>
                    </div>
                  ) : (
                    <>
                      <div className="px-3 pt-2.5 pb-1">
                        <p className="font-montserrat text-[11px] font-semibold uppercase tracking-wider text-sett-text-accent">
                          {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ul>
                        {searchResults.map((r, i) => {
                          const name = customerName(r);
                          return (
                            <li key={r.id}>
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                                onMouseEnter={() => setActiveIndex(i)}
                                className={cn(
                                  'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors',
                                  i === activeIndex ? 'bg-sett-fill' : 'hover:bg-sett-fill/60'
                                )}
                              >
                                <span className="shrink-0 mt-0.5 font-montserrat text-[12px] font-semibold text-sett-primary bg-sett-light-green-bg px-1.5 py-0.5 rounded-[6px]">
                                  #{r.referenceNumber ?? r.id.slice(0, 4)}
                                </span>

                                <div className="flex-1 min-w-0">
                                  {name && (
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <User className="w-3 h-3 text-sett-text-accent shrink-0" />
                                      <span className="font-montserrat text-[13px] font-semibold text-sett-text-primary truncate">{name}</span>
                                    </div>
                                  )}
                                  {r.companyName && name !== r.companyName && (
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <Building2 className="w-3 h-3 text-sett-text-accent shrink-0" />
                                      <span className="font-montserrat text-[12px] text-sett-text-secondary truncate">{r.companyName}</span>
                                    </div>
                                  )}
                                  {r.destinationName && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-sett-text-accent shrink-0" />
                                      <span className="font-montserrat text-[12px] text-sett-text-secondary truncate">{r.destinationName}</span>
                                    </div>
                                  )}
                                </div>

                                <Badge variant={getStatusBadgeVariant(r.status)} className="shrink-0 text-[11px] px-2 py-0.5">
                                  {formatStatus(r.status)}
                                </Badge>
                              </button>
                              {i < searchResults.length - 1 && (
                                <div className="mx-3 h-px bg-sett-border-light" />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <div className="px-3 py-2 border-t border-sett-border-light">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            router.push(`/booking-requests?search=${encodeURIComponent(searchQuery.trim())}`);
                            setSearchQuery('');
                            setSearchOpen(false);
                            onMobileClose?.();
                          }}
                          className="w-full font-montserrat text-[12px] font-semibold text-sett-primary hover:underline text-center py-0.5"
                        >
                          View all results for &ldquo;{searchQuery.trim()}&rdquo;
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }, idx) => {
            const matchingHref = navItems
              .filter(
                (n) => pathname === n.href || pathname.startsWith(n.href + '/')
              )
              .sort((a, b) => b.href.length - a.href.length)[0]?.href;
            const isActive = matchingHref === href;

            return (
              <SidebarNavItem
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                isActive={isActive}
                collapsed={sidebarCollapsed}
                onMobileClose={onMobileClose}
                index={idx}
              />
            );
          })}
        </nav>

        {/* Mobile-only chrome row — Language toggle, mute, notifications.
            These live in the Header on lg+ (where the sidebar can be
            collapsed to icons), but on phones the Header is title-only and
            this row carries the same controls. lg:hidden hides the whole
            row at 1024px+. */}
        <div className="lg:hidden px-4 py-3 border-t border-sett-sidebar-border">
          <div className="flex items-center justify-between gap-2">
            <LanguageToggle />
            <div className="flex items-center gap-1">
              {/* Mute toggle */}
              <button
                type="button"
                onClick={toggleMuted}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={audioMuted ? t.notifications.unmuteSound : t.notifications.muteSound}
                aria-pressed={audioMuted}
              >
                {audioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              {/* Notifications */}
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={unreadCount > 0 ? `${t.common.notifications} (${unreadCount})` : t.common.notifications}
              >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-bell-shake' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-sett-primary text-sett-navy text-[10px] font-bold leading-none font-montserrat shadow-[0_2px_6px_rgba(170,199,55,0.5)] ring-2 ring-sett-sidebar">
                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* User card */}
        <div
          className={cn(
            'pb-4 pt-4 border-t border-sett-sidebar-border transition-[padding] duration-320 ease-sett-in-out',
            'animate-sidebar-fade-up',
            sidebarCollapsed ? 'px-3' : 'px-5'
          )}
          style={{ animationDelay: '560ms' }}
        >
          <div
            className={cn(
              'rounded-[17px] bg-white/[0.06] border border-white/10 transition-all duration-320 ease-sett-in-out',
              sidebarCollapsed ? 'px-[7px] py-[7px]' : 'px-[14px] py-[12px]'
            )}
            title={sidebarCollapsed ? `${displayName} · ${user?.role ?? 'User'}` : undefined}
          >
            <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-[10px]')}>
              <div className="w-[30px] h-[30px] shrink-0 rounded-[10px] bg-sett-primary flex items-center justify-center text-sett-navy font-bold text-[12px] font-montserrat">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div
                className={cn(
                  'min-w-0 flex-1 space-y-[2px] overflow-hidden transition-all duration-280 ease-sett-out',
                  sidebarCollapsed
                    ? 'w-0 opacity-0 ml-0 pointer-events-none'
                    : 'w-auto opacity-100'
                )}
              >
                <p className="font-montserrat text-[12px] font-semibold leading-normal text-white truncate whitespace-nowrap">{displayName}</p>
                <p className="font-montserrat text-[10px] font-normal leading-normal text-white/60 truncate whitespace-nowrap">{user?.role ?? 'User'}</p>
              </div>
            </div>
          </div>

          {/* Logout — phones-only. Desktop users get this inside the
              header's user-menu dropdown; mobile users need an explicit
              entry point inside the drawer. */}
          {onLogoutClick && (
            <button
              type="button"
              onClick={() => {
                onLogoutClick();
                onMobileClose?.();
              }}
              className="lg:hidden mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] border border-white/15 bg-white/[0.04] text-white/85 font-montserrat text-[13px] font-medium hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.common.logout}
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          'sett-motion-collapse fixed top-0 left-0 z-40 h-screen bg-sett-sidebar flex flex-col',
          // Subtle vertical seam against the navy header — a tinted-white hairline so the
          // sidebar reads as a distinct column instead of one merged navy block.
          'border-r border-white/[0.06]',
          'transition-[width,transform] duration-320 ease-sett-in-out lg:translate-x-0',
          // One-time entrance — only on desktop where the sidebar is always visible.
          // (Mobile uses the existing translate-x drawer behavior.)
          'lg:animate-sidebar-slide-in',
          sidebarCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          // On mobile we always want the full width — collapse only applies on lg+
          'max-lg:!w-sidebar'
        )}
      >
        {content}
      </aside>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 lg:hidden transition-opacity duration-280 ease-sett-out',
          isMobileOpen ? 'opacity-100 block' : 'opacity-0 hidden'
        )}
        onClick={onMobileClose}
        aria-hidden
      />
      {/* Notifications modal — same component the Header mounts on desktop.
          On phones (where the Header doesn't render its bell), this is the
          only mount, opened from the bell button inside the mobile-chrome
          row above. */}
      <NotificationsModal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * Subcomponents
 * ──────────────────────────────────────────────────────────── */

interface SidebarNavItemProps {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed: boolean;
  onMobileClose?: () => void;
  index: number;
}

function SidebarNavItem({
  href,
  label,
  Icon,
  isActive,
  collapsed,
  onMobileClose,
  index,
}: SidebarNavItemProps) {
  // Cascading entrance — start after logo + search have begun appearing.
  const enterDelay = 280 + index * 60;

  return (
    <div
      className="relative group animate-sidebar-item-in"
      style={{ animationDelay: `${enterDelay}ms` }}
    >
      <Link
        href={href}
        onClick={onMobileClose}
        data-active={isActive || undefined}
        data-collapsed={collapsed || undefined}
        className={cn(
          // sett-nav-item drives the layered hover effect — green sweep,
          // icon halo, icon nudge, label slide. See globals.css.
          'sett-nav-item relative flex items-center rounded-lg text-sm font-medium overflow-hidden',
          'transition-[background-color,color,padding] duration-280 ease-sett-out',
          collapsed ? 'justify-center px-0 py-2.5 h-10' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-white/[0.04] text-white'
            : 'text-white/85 hover:text-white'
        )}
        aria-label={collapsed ? label : undefined}
      >
        {/* §5.4 Active item: 3px green left-border */}
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-r-full bg-sett-primary shadow-[0_0_8px_rgba(170,199,55,0.45)]"
          />
        )}
        <Icon className="sett-nav-icon w-5 h-5 shrink-0" />
        <span
          className={cn(
            'sett-nav-label whitespace-nowrap transition-all duration-280 ease-sett-out',
            collapsed
              ? 'w-0 opacity-0 -translate-x-1 pointer-events-none'
              : 'w-auto opacity-100 translate-x-0'
          )}
          style={{
            transitionDelay: collapsed ? '0ms' : `${index * 30}ms`,
          }}
        >
          {label}
        </span>
      </Link>

      {/* Tooltip — only visible when collapsed, on hover/focus */}
      {collapsed && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50',
            'whitespace-nowrap rounded-md bg-sett-navy text-white text-xs font-medium',
            'px-2.5 py-1.5 shadow-lg ring-1 ring-white/10',
            'opacity-0 -translate-x-1 transition-all duration-180 ease-sett-out',
            'group-hover:opacity-100 group-hover:translate-x-0',
            'group-focus-within:opacity-100 group-focus-within:translate-x-0'
          )}
        >
          {label}
          <span
            aria-hidden
            className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-sett-navy"
          />
        </span>
      )}
    </div>
  );
}

interface SidebarIconButtonProps {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}

function SidebarIconButton({ label, onClick, icon: Icon }: SidebarIconButtonProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'flex items-center justify-center w-full h-10 rounded-lg',
          'bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/15',
          'transition-colors duration-180 ease-sett-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary'
        )}
      >
        <Icon className="w-4 h-4" />
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50',
          'whitespace-nowrap rounded-md bg-sett-navy text-white text-xs font-medium',
          'px-2.5 py-1.5 shadow-lg ring-1 ring-white/10',
          'opacity-0 -translate-x-1 transition-all duration-180 ease-sett-out',
          'group-hover:opacity-100 group-hover:translate-x-0',
          'group-focus-within:opacity-100 group-focus-within:translate-x-0'
        )}
      >
        {label}
        <span
          aria-hidden
          className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-sett-navy"
        />
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Sidebar Collapse Toggle
 * ──────────────────────────────────────────────────────────── */

/**
 * Desktop-only toggle that collapses/expands the sidebar.
 * Uses Lucide's PanelLeftClose / PanelLeftOpen icons (semantic — they actually
 * depict what the action does). Renders a tooltip with the keyboard shortcut.
 */
function SidebarCollapseToggle({
  collapsed,
  onToggle,
  expandLabel,
  collapseLabel,
}: {
  collapsed: boolean;
  onToggle: () => void;
  /** Localized "Expand sidebar" tooltip — passed in so this component
   *  doesn't need its own useLanguage() hook. */
  expandLabel: string;
  /** Localized "Collapse sidebar" tooltip. */
  collapseLabel: string;
}) {
  const label = collapsed ? expandLabel : collapseLabel;
  return (
    <div className="relative group hidden lg:block">
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={!collapsed}
        aria-keyshortcuts="["
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg',
          'text-white/80 hover:text-sett-primary hover:bg-white/[0.06]',
          'transition-colors duration-180 ease-sett-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sett-sidebar'
        )}
      >
        {/* Bold three-line hamburger — heavy strokes read clearly on navy at this size */}
        <Menu className="w-5 h-5" strokeWidth={2.25} />
      </button>
      {/* Tooltip — points right when expanded (button on right edge) and
          right when collapsed (centred row, plenty of room to the right). */}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50',
          'whitespace-nowrap rounded-md bg-sett-navy text-white text-xs font-medium',
          'px-2.5 py-1.5 shadow-lg ring-1 ring-white/10',
          'opacity-0 -translate-x-1 transition-all duration-180 ease-sett-out',
          'group-hover:opacity-100 group-hover:translate-x-0',
          'group-focus-within:opacity-100 group-focus-within:translate-x-0'
        )}
      >
        <span className="flex items-center gap-2">
          {label}
          <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-white/15 text-white/90 font-mono text-[10px] font-semibold">
            [
          </kbd>
        </span>
        <span
          aria-hidden
          className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-sett-navy"
        />
      </span>
    </div>
  );
}
