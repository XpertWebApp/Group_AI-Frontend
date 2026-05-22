'use client';

import toast, { type Toast } from 'react-hot-toast';
import {
  Bell,
  CheckCircle2,
  XCircle,
  FileText,
  MailCheck,
  AlertTriangle,
  Sparkles,
  X,
} from 'lucide-react';
import type { Notification } from '@/types';
import { translations, type Locale } from '@/lib/i18n/translations';
import { formatNotification } from '@/lib/notifications/formatNotification';

function currentLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem('sett-locale');
  return saved === 'de' ? 'de' : 'en';
}

type IconKind = 'success' | 'danger' | 'info' | 'warning' | 'sparkle' | 'mail' | 'doc' | 'bell';

const ICON_MAP: Record<IconKind, { Icon: typeof Bell; bg: string; fg: string }> = {
  success: { Icon: CheckCircle2, bg: '#EAF3D6', fg: '#5A7A12' },
  danger:  { Icon: XCircle,      bg: '#FDECEC', fg: '#B42318' },
  warning: { Icon: AlertTriangle,bg: '#FFF4E5', fg: '#B54708' },
  mail:    { Icon: MailCheck,    bg: '#E8EEFC', fg: '#1849A9' },
  doc:     { Icon: FileText,     bg: '#EAF3D6', fg: '#5A7A12' },
  sparkle: { Icon: Sparkles,     bg: '#F3EBFE', fg: '#6927DA' },
  info:    { Icon: Bell,         bg: '#EAF3D6', fg: '#5A7A12' },
  bell:    { Icon: Bell,         bg: '#EAF3D6', fg: '#5A7A12' },
};

function pickIconKind(type: string): IconKind {
  const t = (type || '').toLowerCase();
  if (t.includes('approve') || t.includes('accept') || t.includes('success') || t.includes('confirm')) return 'success';
  if (t.includes('decline') || t.includes('reject') || t.includes('fail') || t.includes('error') || t.includes('cancel')) return 'danger';
  if (t.includes('warn') || t.includes('expir') || t.includes('overdue')) return 'warning';
  if (t.includes('email') || t.includes('mail') || t.includes('sent')) return 'mail';
  if (t.includes('proposal') || t.includes('offer') || t.includes('contract') || t.includes('document')) return 'doc';
  if (t.includes('new') || t.includes('created') || t.includes('request')) return 'sparkle';
  return 'info';
}

function pickHref(n: Notification): string | null {
  if (!n.entityType || !n.entityId) return null;
  const type = n.entityType.toLowerCase();
  if (type.includes('proposal') || type.includes('offer')) return `/proposals/${n.entityId}`;
  if (type.includes('booking') || type.includes('request')) return `/booking-requests/${n.entityId}`;
  return null;
}

function timeAgo(iso: string, locale: Locale): string {
  const tt = translations[locale].notifications;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return tt.timeJustNow;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} ${tt.timeMinutesShort}`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ${tt.timeHoursShort}`;
  return `${Math.floor(diffSec / 86400)} ${tt.timeDaysShort}`;
}

function NotificationToastBody({ t, n, locale }: { t: Toast; n: Notification; locale: Locale }) {
  const tt = translations[locale].notifications;
  const kind = pickIconKind(n.type);
  const { Icon, bg, fg } = ICON_MAP[kind];
  const href = pickHref(n);
  // Localized title/body — falls back to BE-provided strings for unknown types.
  const { title: localTitle, body: localBody } = formatNotification(n, tt);

  const handleClick = () => {
    toast.dismiss(t.id);
    if (href) {
      // Use full navigation so it works regardless of which page mounted the toast.
      window.location.href = href;
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.dismiss(t.id);
  };

  return (
    <div
      role="alert"
      onClick={href ? handleClick : undefined}
      className={`pointer-events-auto w-[380px] max-w-[calc(100vw-32px)] bg-white rounded-[14px] shadow-[0_12px_32px_-8px_rgba(7,28,66,0.18),0_4px_12px_-2px_rgba(7,28,66,0.08)] border border-sett-border-light overflow-hidden ${
        t.visible ? 'animate-toast-in' : 'animate-toast-out'
      } ${href ? 'cursor-pointer hover:shadow-[0_16px_40px_-8px_rgba(7,28,66,0.24)] transition-shadow' : ''}`}
    >
      {/* Brand accent stripe */}
      <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg,#AAC737 0%,#8DAF1A 100%)' }} />

      <div className="flex items-start gap-3 p-4">
        {/* Icon medallion */}
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: bg }}
        >
          <Icon className="w-5 h-5" style={{ color: fg }} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary leading-snug">
              {localTitle}
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={tt.dismiss}
              className="shrink-0 -mt-0.5 -mr-1 p-1 rounded-md text-sett-text-accent hover:text-sett-text-primary hover:bg-sett-fill transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {localBody && (
            <p className="font-montserrat text-[13px] text-sett-text-secondary mt-0.5 leading-relaxed line-clamp-2">
              {localBody}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-montserrat text-[11px] font-medium text-sett-text-accent">
              {timeAgo(n.createdAt, locale)}
            </span>
            {href && (
              <span className="font-montserrat text-[11px] font-semibold text-sett-primary uppercase tracking-wider">
                {tt.view} →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function showNotificationToast(n: Notification) {
  const locale = currentLocale();
  toast.custom((t) => <NotificationToastBody t={t} n={n} locale={locale} />, {
    duration: 6000,
    position: 'top-right',
    id: `notif-${n.id}`,
  });
}
