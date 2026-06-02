'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { PdfLanguage } from '@/hooks/usePdfLanguage';

/**
 * Compact segmented EN/DE control surfaced next to PDF actions
 * (Preview PDF, Send Offer, Download). Brand-aligned (§5.1 + §3 labels).
 *
 * Includes an info-tooltip explaining the BE caveat that switching
 * language re-renders the PDF on the server with CURRENT proposal data
 * rather than the snapshot taken at send-time.
 */
interface PdfLanguagePickerProps {
  /** Currently selected language. */
  value: PdfLanguage;
  /** Called when the user picks a different language. */
  onChange: (next: PdfLanguage) => void;
  /** Disable while a PDF action is in-flight so the user can't change
   *  language mid-generate. */
  disabled?: boolean;
  /** Optional className override on the outer wrapper. */
  className?: string;
  /** Size variant — `sm` for tight chrome (Offer History rows),
   *  `md` (default) for primary action toolbars. */
  size?: 'sm' | 'md';
  /** Skin variant: `light` for white/grey contexts, `dark` for navy
   *  surfaces (e.g. the navy header of the contract preview modal). */
  variant?: 'light' | 'dark';
}

export function PdfLanguagePicker({
  value,
  onChange,
  disabled,
  className,
  size = 'md',
  variant = 'light',
}: PdfLanguagePickerProps) {
  const { t } = useLanguage();
  const isDark = variant === 'dark';

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'font-montserrat font-semibold uppercase tracking-[0.05em]',
          size === 'sm' ? 'text-[10px]' : 'text-[11px]',
          isDark ? 'text-white/70' : 'text-sett-text-secondary',
        )}
      >
        {t.offer.pdfLanguageLabel}
      </span>

      {/* Segmented pill: two buttons sharing one rounded container so the
          selected one fills with brand-green and the other stays muted. */}
      <div
        role="radiogroup"
        aria-label={t.offer.pdfLanguageLabel}
        className={cn(
          'inline-flex items-center rounded-full p-0.5 border',
          isDark
            ? 'bg-white/10 border-white/15'
            : 'bg-sett-fill border-sett-border',
          disabled && 'opacity-60 pointer-events-none',
        )}
      >
        <LangButton
          code="en"
          label={t.offer.pdfLanguageEN}
          selected={value === 'en'}
          onSelect={() => onChange('en')}
          size={size}
          isDark={isDark}
        />
        <LangButton
          code="de"
          label={t.offer.pdfLanguageDE}
          selected={value === 'de'}
          onSelect={() => onChange('de')}
          size={size}
          isDark={isDark}
        />
      </div>

      {/* Info tooltip — explains the BE caveat about re-render vs snapshot.
          Portalled to <body> so it can never be trapped by a sibling
          stacking context (transform-animated buttons below, button
          hover-scale transforms inside the same group, etc). */}
      <InfoTooltip text={t.offer.pdfLanguageInfoTooltip} size={size} isDark={isDark} />
    </div>
  );
}

/* ─── Portal-rendered tooltip ───
 *
 * The anchor `<Info>` icon stays inline so layout is unchanged. The
 * tooltip itself is mounted to `document.body` via createPortal so it
 * escapes every ancestor stacking context (button hover transforms,
 * animate-sidebar-fade-up wrappers, etc).
 *
 * Positioning is computed from the anchor's bounding rect on each
 * hover/focus open. We re-measure on window scroll/resize while open
 * so a sidebar scroll doesn't leave the tooltip dangling.
 */
function InfoTooltip({
  text,
  size,
  isDark,
}: {
  text: string;
  size: 'sm' | 'md';
  isDark: boolean;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const measure = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Right-align the tooltip to the icon's right edge, mt-1.5 (6px) below.
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  };

  useEffect(() => {
    if (!open) return;
    measure();
    const onScroll = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  return (
    <>
      {/* Wrapper carries focus + the a11y label so the visible icon can
          stay purely presentational. Putting tabIndex/aria-label on the
          <svg> while also marking it aria-hidden is a contradiction —
          assistive tech is told to ignore it, but keyboard focus still
          lands on it. Chrome's a11y engine logs the warning we saw on
          group-ai.s-e-t-t.com. */}
      <span
        ref={anchorRef}
        className="inline-flex items-center cursor-help"
        role="button"
        tabIndex={0}
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info
          className={cn(
            'shrink-0',
            size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4',
            isDark ? 'text-white/55 hover:text-white/85' : 'text-sett-text-accent hover:text-sett-text-primary',
            'transition-colors duration-150',
          )}
          aria-hidden
        />
      </span>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[9999] w-64 px-3 py-2 rounded-md bg-sett-navy text-white font-montserrat text-[11px] font-medium leading-snug shadow-[0_8px_20px_rgba(0,0,0,0.18)] ring-1 ring-white/10"
          style={{ top: pos.top, right: pos.right }}
        >
          {text}
        </span>,
        document.body,
      )}
    </>
  );
}

function LangButton({
  code,
  label,
  selected,
  onSelect,
  size,
  isDark,
}: {
  code: PdfLanguage;
  label: string;
  selected: boolean;
  onSelect: () => void;
  size: 'sm' | 'md';
  isDark: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      data-lang={code}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-montserrat font-bold uppercase tracking-[0.05em] transition-colors duration-150',
        size === 'sm' ? 'px-2 py-0.5 text-[10px] min-w-[26px]' : 'px-2.5 py-1 text-[11px] min-w-[30px]',
        selected
          ? 'bg-sett-primary text-sett-navy shadow-[0_1px_3px_rgba(7,28,66,0.18)]'
          : isDark
            ? 'text-white/75 hover:text-white hover:bg-white/10'
            : 'text-sett-text-secondary hover:text-sett-text-primary hover:bg-white',
      )}
    >
      {label}
    </button>
  );
}
