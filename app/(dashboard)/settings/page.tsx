'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import {
  Settings, DollarSign, Mail, Building2, FileText, Users, Clock, AlertCircle,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi, type SettingsOverview } from '@/lib/api/settings';

type OverviewKey = keyof SettingsOverview;

const SETTINGS_CARDS: { key: string; overviewKey: OverviewKey; icon: typeof Settings; href: string }[] = [
  { key: 'generalConfig', overviewKey: 'general', icon: Settings, href: '/settings/general' },
  { key: 'supplierLimits', overviewKey: 'supplierLimits', icon: DollarSign, href: '/settings/suppliers' },
  { key: 'emailConfig', overviewKey: 'email', icon: Mail, href: '/settings/email' },
  { key: 'companyDetails', overviewKey: 'company', icon: Building2, href: '/settings/company' },
  { key: 'policies', overviewKey: 'policies', icon: FileText, href: '/settings/policies' },
  { key: 'staffManagement', overviewKey: 'staff', icon: Users, href: '/settings/staff' },
];

function formatRelativeTime(dateStr: string | null, locale: string): string | null {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (locale === 'de') {
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHrs < 24) return `vor ${diffHrs} Std.`;
    if (diffDays < 7) return `vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`;
    return `vor ${diffWeeks} ${diffWeeks === 1 ? 'Woche' : 'Wochen'}`;
  }
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
}

export default function SettingsPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [overview, setOverview] = useState<SettingsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    settingsApi.getOverview()
      .then((data) => { if (!cancelled) setOverview(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Header title={t.settings.title} />
      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {SETTINGS_CARDS.map((card) => {
            const Icon = card.icon;
            const title = t.settings[card.key as keyof typeof t.settings];
            const desc = t.settings[`${card.key}Desc` as keyof typeof t.settings];

            const isStaffCard = card.key === 'staffManagement';
            const staffCount = overview?.staff?.totalStaff ?? 0;
            const updatedAt = !isStaffCard ? (overview?.[card.overviewKey] as { updatedAt?: string | null })?.updatedAt ?? null : null;
            const relativeTime = formatRelativeTime(updatedAt, locale);
            const isNotConfigured = overview && updatedAt === null && !isStaffCard;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => router.push(card.href)}
                className="group w-full rounded-[14px] border border-sett-border-light bg-white p-5 text-left shadow-[0_4px_20px_0_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_8px_30px_0_rgba(0,0,0,0.12)] hover:border-sett-primary/40 focus:outline-none focus:ring-2 focus:ring-sett-primary focus:ring-offset-2"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-[10px] border border-sett-border-light bg-sett-light-green-bg flex items-center justify-center mb-5">
                  <Icon className="w-4 h-4 text-sett-primary" />
                </div>

                {/* Title */}
                <h3 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D] mb-3">
                  {title}
                </h3>

                {/* Description */}
                <p className="font-montserrat text-[14px] font-normal leading-[1.2] text-[#4A4A4A] mb-5 min-h-[34px]">
                  {desc}
                </p>

                {/* Updated / Not configured / Staff count */}
                <div className="flex items-center gap-1.5">
                  {loading ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
                  ) : isStaffCard ? (
                    <>
                      <Users className="w-3.5 h-3.5 text-sett-text-accent" />
                      <span className="font-montserrat text-[12px] text-sett-text-accent">
                        {staffCount} {t.settings.members}
                      </span>
                    </>
                  ) : isNotConfigured ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-montserrat text-[12px] text-amber-500 font-medium">
                        {t.settings.notConfigured}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-sett-text-accent" />
                      <span className="font-montserrat text-[12px] text-sett-text-accent">
                        {t.settings.updated} {relativeTime}
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
