'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { useNotifications } from '@/lib/notifications/NotificationsContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateTimeEU } from '@/lib/dateFormatter';
import type { Notification } from '@/types';
import {
  Bell,
  CheckCircle2,
  XCircle,
  FileText,
  MailCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

type IconKind = 'success' | 'danger' | 'info' | 'warning' | 'sparkle' | 'mail' | 'doc';

const ICON_MAP: Record<IconKind, { Icon: typeof Bell; bg: string; fg: string }> = {
  success: { Icon: CheckCircle2,  bg: '#EAF3D6', fg: '#5A7A12' },
  danger:  { Icon: XCircle,       bg: '#FDECEC', fg: '#B42318' },
  warning: { Icon: AlertTriangle, bg: '#FFF4E5', fg: '#B54708' },
  mail:    { Icon: MailCheck,     bg: '#E8EEFC', fg: '#1849A9' },
  doc:     { Icon: FileText,      bg: '#EAF3D6', fg: '#5A7A12' },
  sparkle: { Icon: Sparkles,      bg: '#F3EBFE', fg: '#6927DA' },
  info:    { Icon: Bell,          bg: '#EAF3D6', fg: '#5A7A12' },
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

export function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { notifications, loading, refresh, markRead, markAllRead } = useNotifications();

  // Refresh once on open so the user sees the freshest list — context is the
  // source of truth, but the user just clicked the bell so a single re-poll is
  // worth it.
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleItemClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    const href = pickHref(n);
    if (href) {
      onClose();
      router.push(href);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.notifications.title}>
      {loading && notifications.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-montserrat text-[13px] text-sett-text-accent">{t.notifications.loading}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-sett-fill flex items-center justify-center">
            <Bell className="w-6 h-6 text-sett-text-accent" />
          </div>
          <p className="font-montserrat text-[14px] text-sett-text-secondary text-center">
            {t.notifications.empty}
          </p>
        </div>
      ) : (
        <>
          {unreadCount > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="font-montserrat text-[12px] font-semibold text-sett-text-accent uppercase tracking-wider">
                {unreadCount} {t.notifications.newCount}
              </span>
              <button
                type="button"
                onClick={markAllRead}
                className="font-montserrat text-[12px] font-semibold text-sett-primary hover:underline"
              >
                {t.notifications.markAllRead}
              </button>
            </div>
          )}
          <ul className="space-y-2 max-h-[420px] overflow-y-auto -mx-1 px-1">
            {notifications.map((n) => {
              const kind = pickIconKind(n.type);
              const { Icon, bg, fg } = ICON_MAP[kind];
              const clickable = pickHref(n) !== null;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    disabled={!clickable && n.read}
                    className={`group w-full text-left px-3 py-3 rounded-[12px] border transition-all flex items-start gap-3 ${
                      n.read
                        ? 'border-sett-border-light bg-white hover:bg-sett-fill/40'
                        : 'border-sett-primary/30 bg-sett-primary/[0.04] hover:bg-sett-primary/[0.08]'
                    } ${clickable ? 'cursor-pointer' : 'cursor-default'} disabled:cursor-default`}
                  >
                    <div
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: bg }}
                    >
                      <Icon className="w-[18px] h-[18px]" style={{ color: fg }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className={`flex-1 font-montserrat text-[13px] leading-snug ${n.read ? 'font-medium text-sett-text-primary' : 'font-semibold text-sett-text-primary'}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span
                            className="shrink-0 mt-1 w-2 h-2 rounded-full bg-sett-primary"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      {n.body && (
                        <p className="font-montserrat text-[12px] text-sett-text-secondary mt-0.5 leading-relaxed line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="font-montserrat text-[11px] text-sett-text-accent mt-1.5">
                        {formatDateTimeEU(n.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}
