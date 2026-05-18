'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import type { Notification } from '@/types';
import { showNotificationToast } from '@/components/ui/NotificationToast';
import { playNotificationChime, unlockAudio } from '@/lib/notifications/sound';

type NotificationListener = (fresh: Notification[]) => void;

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  /**
   * Subscribe to "new notifications detected" events. Fired when a poll finds
   * notifications the user hasn't seen this session. List pages use this to
   * auto-refresh their data without polling separately.
   * Returns an unsubscribe function.
   */
  onNewNotifications: (cb: NotificationListener) => () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;
const PAGE_LIMIT = 20;
const SEEN_IDS_STORAGE_KEY = 'sett:notifications:seenIds';
const DEBUG_KEY = 'sett:notifications:debug';

function debugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEBUG_KEY) === '1';
}
function dlog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  if (debugEnabled()) console.log('[notif]', ...args);
}

function loadSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(SEEN_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function persistSeenIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    // Cap to avoid unbounded storage growth.
    const capped = Array.from(ids).slice(-200);
    window.sessionStorage.setItem(SEEN_IDS_STORAGE_KEY, JSON.stringify(capped));
  } catch {
    // ignore
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const inFlightRef = useRef(false);
  const listenersRef = useRef<Set<NotificationListener>>(new Set());

  // Load persisted seen-ids once so a page refresh doesn't re-toast old items.
  useEffect(() => {
    seenIdsRef.current = loadSeenIds();
  }, []);

  // Unlock audio on the first user gesture — browsers block AudioContext
  // until then, so the first chime would otherwise be silent.
  useEffect(() => {
    const handler = () => unlockAudio();
    const opts = { once: true, capture: true } as const;
    window.addEventListener('pointerdown', handler, opts);
    window.addEventListener('keydown', handler, opts);
    return () => {
      window.removeEventListener('pointerdown', handler, opts);
      window.removeEventListener('keydown', handler, opts);
    };
  }, []);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setLoading(true);
    try {
      const data = await dashboardApi.getNotifications({ limit: PAGE_LIMIT });
      const incoming = data.notifications ?? [];

      dlog('poll done', { incoming: incoming.length, firstLoad: isFirstLoadRef.current, listeners: listenersRef.current.size });

      // Detect notifications that are new since the last poll. We skip toasting
      // on the very first load of the session (to avoid spamming on page open),
      // but we DO record their IDs so subsequent polls only toast truly new items.
      if (isFirstLoadRef.current) {
        incoming.forEach((n) => seenIdsRef.current.add(n.id));
        isFirstLoadRef.current = false;
      } else {
        const fresh = incoming.filter(
          (n) => !n.read && !seenIdsRef.current.has(n.id),
        );
        dlog('fresh', fresh.map((n) => ({ id: n.id, type: n.type, entityType: n.entityType })));
        // Toast newest-first, but keep the stack natural (oldest fires first so
        // newest sits at the top).
        fresh
          .slice()
          .reverse()
          .forEach((n) => showNotificationToast(n));
        // One chime per batch — even if 5 notifications arrived, we don't want
        // 5 overlapping rings.
        if (fresh.length > 0) playNotificationChime();
        fresh.forEach((n) => seenIdsRef.current.add(n.id));

        // Fan out to subscribers (list pages) so they can refresh their data.
        // Errors in one listener must not break the others.
        if (fresh.length > 0) {
          dlog('fanout to', listenersRef.current.size, 'listeners');
          listenersRef.current.forEach((cb) => {
            try { cb(fresh); } catch (e) { dlog('listener threw', e); }
          });
        }
      }

      persistSeenIds(seenIdsRef.current);
      setNotifications(incoming);
      setUnreadCount(data.unreadCount ?? incoming.filter((n) => !n.read).length);
    } catch {
      // ignore — keep previous state
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial fetch + polling. Poll only while the tab is visible to save bandwidth.
  useEffect(() => {
    fetchNotifications(false);
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(() => fetchNotifications(true), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Catch up immediately when the user returns, then resume polling.
        fetchNotifications(true);
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await dashboardApi.markNotificationRead(id);
    } catch {
      // Re-sync on failure.
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await dashboardApi.markAllNotificationsRead();
    } catch {
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  const refresh = useCallback(() => fetchNotifications(false), [fetchNotifications]);

  const onNewNotifications = useCallback((cb: NotificationListener) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, loading, refresh, markRead, markAllRead, onNewNotifications }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead, onNewNotifications],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationsProvider');
  }
  return ctx;
}
