'use client';

import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api/settings';

/**
 * Live default markup percentage from Settings → General.
 *
 * The value is fetched once per process and cached in module-level state
 * for a short TTL — every consumer (hotel search, proposal slider, Add
 * Hotel modal, etc.) reads the same blob without making a fresh API
 * call. When the admin saves a new value in Settings → General, call
 * `invalidateDefaultMarkup()` to force a re-fetch on the next mount.
 *
 * Fallback: 18 (the historic hardcoded value). Used only if the API
 * call fails — never as a "default before fetch", because that would
 * cause a visual flicker from 18 → real value on every consumer.
 */

const FALLBACK_MARKUP = 18;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — admin edits propagate at this rate

let cachedMarkup: number | null = null;
let cachedAt = 0;
let inflight: Promise<number> | null = null;
const subscribers = new Set<(n: number) => void>();

async function fetchDefaultMarkup(): Promise<number> {
  try {
    const data = await settingsApi.getGeneral();
    const parsed = Number(data.defaultMarkupPercentage);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : FALLBACK_MARKUP;
  } catch {
    return FALLBACK_MARKUP;
  }
}

async function loadOrCache(): Promise<number> {
  const now = Date.now();
  if (cachedMarkup != null && now - cachedAt < CACHE_TTL_MS) {
    return cachedMarkup;
  }
  if (inflight) return inflight;
  inflight = fetchDefaultMarkup().then((value) => {
    cachedMarkup = value;
    cachedAt = now;
    inflight = null;
    subscribers.forEach((cb) => cb(value));
    return value;
  });
  return inflight;
}

/**
 * Force the next consumer to re-fetch from the API. Call this from the
 * Settings → General page right after a successful save so the new
 * default propagates to other open surfaces without a page reload.
 */
export function invalidateDefaultMarkup(): void {
  cachedMarkup = null;
  cachedAt = 0;
}

/**
 * Returns the live default markup % from Settings → General.
 *
 * - `markup` is `null` until the first fetch resolves. Consumers should
 *   guard for null and either show a small skeleton or fall back to a
 *   reasonable behaviour (e.g. don't seed the slider yet).
 * - `loading` is true on the first fetch; subsequent reads from cache
 *   set it false immediately.
 *
 * Returning null-before-loaded (instead of FALLBACK_MARKUP) is deliberate:
 * a brief skeleton is better than the slider jumping from 18 → 22 once
 * the real value arrives.
 */
export function useDefaultMarkup(): { markup: number | null; loading: boolean } {
  const [markup, setMarkup] = useState<number | null>(cachedMarkup);
  const [loading, setLoading] = useState<boolean>(cachedMarkup == null);

  useEffect(() => {
    let cancelled = false;
    const sub = (n: number) => {
      if (!cancelled) {
        setMarkup(n);
        setLoading(false);
      }
    };
    subscribers.add(sub);
    loadOrCache().then((n) => {
      if (!cancelled) {
        setMarkup(n);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      subscribers.delete(sub);
    };
  }, []);

  return { markup, loading };
}
