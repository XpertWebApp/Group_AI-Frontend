'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Supported PDF languages. Mirrors the BE handover: 'en' / 'de'.
 * Kept narrow so call sites can switch on it exhaustively.
 */
export type PdfLanguage = 'en' | 'de';

const STORAGE_KEY_PREFIX = 'sett:proposal-pdf-lang:';
const DEFAULT_LANGUAGE: PdfLanguage = 'en';

/** Per-proposal localStorage key. Scoped by proposalId so each request can
 *  remember its own preferred PDF language independently. */
function storageKey(proposalId: string | undefined | null): string | null {
  if (!proposalId) return null;
  return `${STORAGE_KEY_PREFIX}${proposalId}`;
}

function isValidLang(value: string | null): value is PdfLanguage {
  return value === 'en' || value === 'de';
}

/**
 * Per-proposal PDF language preference, persisted to localStorage.
 *
 * Defaults to 'en' on first use; whatever the user picks for a given
 * proposal is remembered for that proposal across visits. Used by every
 * PDF action (preview / send / approve / download) so a single picker
 * drives them all consistently.
 *
 * Implementation note: starts at the default during SSR to avoid hydration
 * mismatches, then syncs the persisted value on mount.
 */
export function usePdfLanguage(proposalId: string | undefined | null): {
  language: PdfLanguage;
  setLanguage: (next: PdfLanguage) => void;
} {
  const [language, setLanguageState] = useState<PdfLanguage>(DEFAULT_LANGUAGE);

  // Hydrate the persisted choice on mount / proposalId change.
  useEffect(() => {
    const key = storageKey(proposalId);
    if (!key) return;
    try {
      const stored = window.localStorage.getItem(key);
      if (isValidLang(stored)) {
        setLanguageState(stored);
      } else {
        setLanguageState(DEFAULT_LANGUAGE);
      }
    } catch {
      // localStorage unavailable — keep default. Not fatal.
    }
  }, [proposalId]);

  const setLanguage = useCallback(
    (next: PdfLanguage) => {
      setLanguageState(next);
      const key = storageKey(proposalId);
      if (!key) return;
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // ignore — state still updated, just won't persist
      }
    },
    [proposalId],
  );

  return { language, setLanguage };
}
