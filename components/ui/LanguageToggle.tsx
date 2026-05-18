'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils/cn';

interface LanguageToggleProps {
  /**
   * Background context the toggle sits on. Switches the track/border/inactive-label
   * colors so the toggle reads correctly against either surface.
   *  - `dark`  → translucent white track, white/75 inactive label (default, for the navy header)
   *  - `light` → palette-grey track, grey inactive label (for white-background surfaces like the auth pages)
   */
  variant?: 'dark' | 'light';
}

export function LanguageToggle({ variant = 'dark' }: LanguageToggleProps) {
  const { locale, setLocale } = useLanguage();
  const isDe = locale === 'de';

  const trackCls = variant === 'dark'
    ? 'border-white/15 bg-white/10 hover:bg-white/15'
    : 'border-sett-border bg-sett-fill hover:bg-sett-border/40';
  const inactiveLabelCls = variant === 'dark'
    ? 'text-white/75'
    : 'text-sett-text-secondary';

  return (
    <button
      type="button"
      onClick={() => setLocale(isDe ? 'en' : 'de')}
      className={cn(
        'relative flex items-center w-[72px] h-[32px] rounded-full p-0.5 border transition-colors cursor-pointer',
        trackCls,
      )}
      aria-label={isDe ? 'Switch to English' : 'Switch to German'}
    >
      {/* Sliding pill */}
      <span
        className={cn(
          'absolute top-0.5 w-[33px] h-[27px] rounded-full bg-sett-primary shadow-sm transition-all duration-400 ease-in-out',
          isDe ? 'left-[calc(100%-33px-2px)]' : 'left-0.5'
        )}
      />
      {/* Labels */}
      <span
        className={cn(
          'relative z-10 flex-1 text-center text-xs font-semibold transition-colors duration-400',
          !isDe ? 'text-sett-navy' : inactiveLabelCls
        )}
      >
        EN
      </span>
      <span
        className={cn(
          'relative z-10 flex-1 text-center text-xs font-semibold transition-colors duration-400',
          isDe ? 'text-sett-navy' : inactiveLabelCls
        )}
      >
        DE
      </span>
    </button>
  );
}
