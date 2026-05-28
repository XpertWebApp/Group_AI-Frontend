'use client';

import { Clock, Info, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { daysUntilCheckin, freeCancellationRisk } from '@/lib/utils/freeCancellation';
import { cn } from '@/lib/utils/cn';

/**
 * Contextual banner that appears when the user picks a check-in date within
 * the next 14 days. Tells them the backend search filters to free-cancellation
 * rates only, so a near date will return fewer hotels.
 *
 * Three severity tiers (≤3 days / 4–7 / 8–14) drive the copy + accent
 * intensity. ≥15 days renders nothing.
 *
 * Brand-fidelity: uses §10-allowed colors only (navy + green for low/medium,
 * sett-destructive for high). No amber.
 */
export function FreeCancellationDateBanner({
  checkInDate,
}: {
  checkInDate: string | null | undefined;
}) {
  const { t } = useLanguage();
  const days = daysUntilCheckin(checkInDate);
  const risk = freeCancellationRisk(days);

  if (risk === 'none' || days === null || days <= 0) return null;

  // Risk-tier visual + copy. High = red accent (matches the destructive
  // attention palette). Medium/low = brand navy/green (system info).
  const config: Record<
    'low' | 'medium' | 'high',
    {
      wrapperCls: string;
      iconCircleCls: string;
      iconColorCls: string;
      titleCls: string;
      Icon: typeof Info;
      message: string;
    }
  > = {
    low: {
      wrapperCls: 'bg-sett-navy/5 border border-sett-primary/20 border-l-4 border-l-sett-primary',
      iconCircleCls: 'bg-sett-primary',
      iconColorCls: 'text-sett-navy',
      titleCls: 'text-sett-text-primary',
      Icon: Info,
      message: t.createForm.freeCancellationLowRisk,
    },
    medium: {
      wrapperCls: 'bg-sett-navy/5 border border-sett-navy/20 border-l-4 border-l-sett-navy',
      iconCircleCls: 'bg-sett-navy',
      iconColorCls: 'text-white',
      titleCls: 'text-sett-text-primary',
      Icon: Clock,
      message: t.createForm.freeCancellationMediumRisk,
    },
    high: {
      wrapperCls: 'bg-sett-destructive/10 border border-sett-destructive/30 border-l-4 border-l-sett-destructive',
      iconCircleCls: 'bg-sett-destructive',
      iconColorCls: 'text-white',
      titleCls: 'text-sett-destructive',
      Icon: AlertTriangle,
      message: t.createForm.freeCancellationHighRisk,
    },
  };

  const cfg = config[risk];
  const daysLine = t.createForm.freeCancellationDaysAway
    .replace('{days}', String(days))
    .replace('{plural}', days === 1 ? '' : 's');

  return (
    <div
      className={cn('flex items-start gap-3 rounded-[14px] px-4 py-3.5 mt-2 animate-card-rise-in', cfg.wrapperCls)}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          cfg.iconCircleCls,
        )}
      >
        <cfg.Icon className={cn('w-4 h-4', cfg.iconColorCls)} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('font-montserrat text-[13px] font-semibold leading-snug', cfg.titleCls)}>
          {t.createForm.freeCancellationBannerTitle}
        </p>
        <p className="font-montserrat text-[12px] font-medium text-sett-text-secondary leading-snug mt-0.5">
          {daysLine}
        </p>
        <p className="font-montserrat text-[13px] font-normal text-sett-text-secondary leading-snug mt-1">
          {cfg.message}
        </p>
      </div>
    </div>
  );
}
