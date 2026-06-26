'use client';

import { useEffect, useState } from 'react';
import { nationalitiesApi, type Nationality } from '@/lib/api/nationalities';

/**
 * Session-scoped cache for the nationalities list (~200 entries).
 *
 * Per BE handover (public/nationality-change-fe.md §2.1):
 *   "Cache this on the FE for the session. It's static reference data —
 *   no need to refetch on every page navigation. A single fetch on app
 *   boot (or first time the Create Request form is opened) is enough."
 *
 * Module-level cache so multiple mounts of the picker on the same page
 * share one network call. Same shape as useDefaultMarkup so the pattern
 * is consistent across the codebase.
 */

let cached: Nationality[] | null = null;
let inflight: Promise<Nationality[]> | null = null;
const subscribers = new Set<(list: Nationality[]) => void>();

async function loadOrCache(): Promise<Nationality[]> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = nationalitiesApi.list().then((list) => {
    cached = list;
    inflight = null;
    subscribers.forEach((cb) => cb(list));
    return list;
  }).catch((err) => {
    inflight = null;
    throw err;
  });
  return inflight;
}

/**
 * Returns the cached nationalities list, lazily fetching on first call.
 * `loading` flips to false after the first successful fetch.
 * `error` is true when the BE call fails — surface a "list unavailable"
 * banner per the handover's edge-case guidance.
 */
export function useNationalities(): {
  nationalities: Nationality[];
  loading: boolean;
  error: boolean;
} {
  const [nationalities, setNationalities] = useState<Nationality[]>(cached ?? []);
  const [loading, setLoading] = useState<boolean>(cached == null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const sub = (list: Nationality[]) => {
      if (!cancelled) {
        setNationalities(list);
        setLoading(false);
      }
    };
    subscribers.add(sub);
    loadOrCache()
      .then((list) => {
        if (!cancelled) {
          setNationalities(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      subscribers.delete(sub);
    };
  }, []);

  return { nationalities, loading, error };
}
