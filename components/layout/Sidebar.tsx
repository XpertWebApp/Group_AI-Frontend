'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Settings,
  Search,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  children?: ReactNode;
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

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

  const content = (
    <>
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-white/10">
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
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="search"
              placeholder={t.nav.searchAnything}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-sett-primary"
            />
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const matchingHref = navItems
              .filter(
                (n) => pathname === n.href || pathname.startsWith(n.href + '/')
              )
              .sort((a, b) => b.href.length - a.href.length)[0]?.href;
            const isActive = matchingHref === href;
            return (
              <Link
                key={href}
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
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sett-primary flex items-center justify-center text-white font-semibold text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-white/70 truncate">{user?.email ?? '—'}</p>
            </div>
          </div>
        </div>
        <p className="px-4 pb-4 text-xs text-white/50">{t.common.footer}</p>
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
