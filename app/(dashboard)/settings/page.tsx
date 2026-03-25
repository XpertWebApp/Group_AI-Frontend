'use client';

import { Header } from '@/components/layout/Header';
import { Settings } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <>
      <Header title={t.nav.settings} />
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-sett-light-green-bg flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-sett-primary" />
          </div>
          <h2 className="font-montserrat text-[22px] font-semibold text-sett-text-primary mb-2">
            {t.nav.comingSoon}
          </h2>
          <p className="font-montserrat text-[14px] text-sett-text-accent max-w-sm">
            {t.nav.settingsComingSoon}
          </p>
        </div>
      </div>
    </>
  );
}
