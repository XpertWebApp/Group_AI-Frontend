'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatPriceEU } from '@/lib/numberFormatter';

/**
 * MarginToggle — collapsible staff-only margin breakdown for hotel cards.
 *
 * Per BE handover (public/staff-margin-toggle.md):
 *  - Collapsed by default on every render; never persisted to localStorage
 *    or URL so a forgotten screenshare can't leak margin
 *  - Shows: net, markup %, sell, margin/night, total margin (× rooms × nights)
 *  - "Staff view — not shown to customer" banner inside the expanded block
 *  - Hidden entirely when markup % is unknown OR card isn't bookable
 *
 * Markup % is back-calculated client-side from (sell - net) / net per the
 * design decision in our chat with the user: reflects what was actually
 * applied to THIS hotel (could differ from the Settings default due to
 * supplier-specific overrides or cent rounding), more honest than showing
 * the configured default.
 */
interface MarginToggleProps {
  /** Sell price per room per night, currency-native. */
  sellPrice: number;
  /** Net (buying) price per room per night, currency-native. */
  netPrice: number;
  /** Number of rooms allocated to this hotel for the trip. */
  roomsAllocated: number;
  /** Trip-length nights — multiplies into the total margin. */
  nights: number;
  /** Currency code (e.g. "EUR"). Renders € for EUR, code as-is otherwise. */
  currency: string;
  /** Hide the toggle entirely (omitted card, can't add to offer). */
  disabled?: boolean;
  /** Optional className passthrough on the outer wrapper. */
  className?: string;
}

const currencySymbol = (code: string): string => (code === 'EUR' ? '€' : code);

export function MarginToggle({
  sellPrice,
  netPrice,
  roomsAllocated,
  nights,
  currency,
  disabled,
  className,
}: MarginToggleProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  // Don't render anything if the card isn't actionable or the math
  // can't be done. Per handover §3.4 — silently hide.
  if (disabled) return null;
  if (!Number.isFinite(sellPrice) || !Number.isFinite(netPrice)) return null;

  // Guard against /0 in the markup calc — defensive even though
  // net should always be > 0 for a valid hotel result.
  const canComputeMarkup = netPrice > 0;
  if (!canComputeMarkup) {
    // Diagnostic — surfaces if we ever ship with bad data so QA can spot.
    // eslint-disable-next-line no-console
    if (typeof window !== 'undefined') {
      console.warn('[MarginToggle] netPrice <= 0, hiding toggle', { sellPrice, netPrice });
    }
    return null;
  }

  // Margin math — all client-side per handover §3.3
  const marginPerNight = sellPrice - netPrice;
  const markupPct = ((sellPrice - netPrice) / netPrice) * 100;
  const totalMargin = marginPerNight * roomsAllocated * nights;
  const isNegative = marginPerNight < 0;
  const symbol = currencySymbol(currency);

  return (
    <div className={cn('w-full', className)}>
      {/* Toggle link — small, muted, paired position to "View Details" */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 font-montserrat text-[12px] font-medium text-sett-text-accent hover:text-sett-text-primary transition-colors"
        aria-expanded={open}
        aria-controls="margin-block"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" aria-hidden />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        )}
        {open ? t.marginToggle.hide : t.marginToggle.show}
      </button>

      {/* Expanded panel — light grey bg, staff banner, math rows.
          Inline display so it doesn't displace flow when collapsed. */}
      {open && (
        <div
          id="margin-block"
          className="mt-2 rounded-[8px] border border-sett-border-light bg-[#F8F9FA] p-3 animate-field-fade-in"
        >
          {/* Staff banner — most important UX cue per handover §3.2 */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <Lock className="w-3 h-3 text-sett-text-accent shrink-0" aria-hidden />
            <span className="font-montserrat text-[10px] font-semibold uppercase tracking-[0.05em] text-sett-text-accent">
              {t.marginToggle.staffBanner}
            </span>
          </div>

          {/* Rows — Net / Markup / Sell, divider, Margin/night / Total margin */}
          <div className="space-y-1.5">
            <MarginRow
              label={t.marginToggle.netRate}
              value={`${symbol}${formatPriceEU(netPrice)}`}
            />
            <MarginRow
              label={t.marginToggle.markup}
              value={`+${formatPriceEU(markupPct)}%`}
              hint={t.marginToggle.markupHint}
            />
            <MarginRow
              label={t.marginToggle.sellRate}
              value={`${symbol}${formatPriceEU(sellPrice)}`}
            />
          </div>

          <div className="h-px bg-sett-border-light my-2.5" aria-hidden />

          <div className="space-y-1.5">
            <MarginRow
              label={t.marginToggle.marginPerNight}
              value={`${symbol}${formatPriceEU(marginPerNight)}`}
              emphasis
              warning={isNegative ? t.marginToggle.negativeMarginWarning : undefined}
            />
            <MarginRow
              label={t.marginToggle.totalMargin}
              sublabel={t.marginToggle.totalMarginBreakdown
                .replace('{rooms}', String(roomsAllocated))
                .replace('{nights}', String(nights))}
              value={`${symbol}${formatPriceEU(totalMargin)}`}
              emphasis
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable label/value row inside the panel ─── */
function MarginRow({
  label,
  sublabel,
  value,
  hint,
  emphasis,
  warning,
}: {
  label: string;
  sublabel?: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  warning?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <div className={cn(
          'font-montserrat text-[12px]',
          emphasis ? 'font-semibold text-sett-text-primary' : 'text-sett-text-secondary',
        )}>
          {label}
        </div>
        {sublabel && (
          <div className="font-montserrat text-[10px] text-sett-text-accent leading-tight">
            {sublabel}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {warning && (
          <span title={warning} aria-label={warning}>
            <AlertTriangle className="w-3.5 h-3.5 text-sett-destructive" aria-hidden />
          </span>
        )}
        <span className={cn(
          'font-montserrat text-[12px] whitespace-nowrap',
          emphasis ? 'font-bold text-sett-text-primary' : 'text-sett-text-primary',
        )}>
          {value}
        </span>
        {hint && (
          <span className="font-montserrat text-[10px] text-sett-text-accent">
            ({hint})
          </span>
        )}
      </div>
    </div>
  );
}
