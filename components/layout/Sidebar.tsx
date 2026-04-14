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
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { requestsApi } from '@/lib/api/requests';
import type { BookingRequest } from '@/types';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';

function GoogleIconWhite() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="white"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white"/>
    </svg>
  );
}

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

  const content = (
    <>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="h-[68px] flex items-center px-6 border-b border-sett-sidebar-border">
          <Link href="/dashboard" className="block" onClick={onMobileClose}>
            <Image
              src="/icons/sett_logo.svg"
              alt="SETT Logo"
              width={140}
              height={40}
              className="h-auto w-auto"
            />
          </Link>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-sett-sidebar-border">
          <div ref={searchWrapperRef} className="relative">
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
                              {/* Reference badge */}
                              <span className="shrink-0 mt-0.5 font-montserrat text-[12px] font-semibold text-sett-primary bg-sett-light-green-bg px-1.5 py-0.5 rounded-[6px]">
                                #{r.referenceNumber ?? r.id.slice(0, 4)}
                              </span>

                              {/* Details */}
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

                              {/* Status */}
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
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const matchingHref = navItems
              .filter(
                (n) => pathname === n.href || pathname.startsWith(n.href + '/')
              )
              .sort((a, b) => b.href.length - a.href.length)[0]?.href;
            const isActive = matchingHref === href;

            return (
              <div key={href}>
                <Link
                  href={href}
                  onClick={onMobileClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sett-sidebar-active text-white'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                </Link>

                {/* Connect Account */}
                {href === '/booking-requests/create' && (
                  <Link
                    href="/connect-account"
                    onClick={onMobileClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      pathname === '/connect-account'
                        ? 'bg-sett-sidebar-active text-white'
                        : 'text-white/90 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <GoogleIconWhite />
                    {t.dashboard.googleConnect.bannerTitle}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="px-5 pb-4 pt-4 border-t border-b border-sett-sidebar-border">
          <div className="rounded-[17px] bg-sett-sidebar-border px-[14px] py-[12px]">
            <div className="flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] shrink-0 rounded-[10px] bg-[#667F00] flex items-center justify-center text-white font-semibold text-[12px] font-montserrat">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 space-y-[2px]">
                <p className="font-montserrat text-[12px] font-semibold leading-normal text-white truncate">{displayName}</p>
                <p className="font-montserrat text-[10px] font-normal leading-normal text-white/60 truncate">{user?.role ?? 'Admin'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 w-sidebar h-screen bg-sett-sidebar flex flex-col transition-transform lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {content}
      </aside>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 lg:hidden',
          isMobileOpen ? 'block' : 'hidden'
        )}
        onClick={onMobileClose}
        aria-hidden
      />
    </>
  );
}
