'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils/cn';

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center bg-sett-fill rounded-full p-0.5 border border-sett-border">
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
          locale === 'en'
            ? 'bg-sett-primary text-white shadow-sm'
            : 'text-sett-text-secondary hover:text-sett-text-primary'
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale('de')}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
          locale === 'de'
            ? 'bg-sett-primary text-white shadow-sm'
            : 'text-sett-text-secondary hover:text-sett-text-primary'
        )}
      >
        DE
      </button>
    </div>
  );
}
