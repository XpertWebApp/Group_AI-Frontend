'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from './NotificationsContext';
import type { Notification } from '@/types';

type EntityMatcher = string | RegExp | ((n: Notification) => boolean);

interface Options {
  /**
   * Restrict refresh to notifications matching this entity type or predicate.
   * Pass a string for a substring match (case-insensitive) on `entityType`,
   * a RegExp for pattern matching, or a function for full control.
   * Omit to refresh on every new notification.
   */
  match?: EntityMatcher;
  /**
   * Debounce window in ms. If multiple matching notifications arrive in quick
   * succession (e.g. one poll surfaces 3 new offers), refresh runs once.
   */
  debounceMs?: number;
}

function matches(n: Notification, m: EntityMatcher): boolean {
  if (typeof m === 'function') return m(n);
  if (m instanceof RegExp) return m.test(n.entityType ?? '') || m.test(n.type ?? '');
  const needle = m.toLowerCase();
  return (n.entityType ?? '').toLowerCase().includes(needle)
      || (n.type ?? '').toLowerCase().includes(needle);
}

/**
 * Subscribe a refresh callback to "new notification" events. Used by list
 * pages so they auto-update when new offers/requests arrive without the user
 * needing to hit the refresh button.
 *
 * Critical: the subscription must persist across parent re-renders. Callers
 * typically pass an inline regex (`{ match: /foo/i }`) which would otherwise
 * cause the effect to tear down on every render — losing any pending
 * debounced refresh. We hold options in refs so the effect runs exactly once.
 */
export function useRefreshOnNotification(
  refresh: () => void | Promise<void>,
  { match, debounceMs = 400 }: Options = {},
): void {
  const { onNewNotifications } = useNotifications();

  // Keep the latest values in refs so the subscription effect can stay mounted
  // across re-renders even when callers pass inline regexes / arrow fns.
  const refreshRef = useRef(refresh);
  const matchRef = useRef<EntityMatcher | undefined>(match);
  const debounceRef = useRef(debounceMs);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  useEffect(() => { matchRef.current = match; }, [match]);
  useEffect(() => { debounceRef.current = debounceMs; }, [debounceMs]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onNewNotifications((fresh) => {
      const m = matchRef.current;
      const relevant = m ? fresh.filter((n) => matches(n, m)) : fresh;
      if (relevant.length === 0) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { refreshRef.current(); }, debounceRef.current);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [onNewNotifications]);
}
