'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils/cn';

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();
  const isDe = locale === 'de';

  return (
    <button
      type="button"
      onClick={() => setLocale(isDe ? 'en' : 'de')}
      className="relative flex items-center w-[72px] h-[32px] rounded-full p-0.5 border border-white/15 bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
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
          !isDe ? 'text-sett-navy' : 'text-white/75'
        )}
      >
        EN
      </span>
      <span
        className={cn(
          'relative z-10 flex-1 text-center text-xs font-semibold transition-colors duration-400',
          isDe ? 'text-sett-navy' : 'text-white/75'
        )}
      >
        DE
      </span>
    </button>
  );
}
