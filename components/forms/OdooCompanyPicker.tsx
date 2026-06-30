'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { odooApi, OdooSearchError, type OdooCustomer } from '@/lib/api/odoo';

/**
 * State machine for the autocomplete dropdown. Mirrors the BE handover §3.5
 * but adds an explicit `rate_limited` state so we can render Neha's "slow
 * down a moment" copy instead of a generic error.
 */
type PickerState = 'idle' | 'loading' | 'results' | 'empty' | 'unavailable' | 'rate_limited' | 'error';

export interface OdooCompanyPickerValue {
  /** The free-text Company Name. Always set — either typed or auto-filled when
   *  a match is picked. Persists as `companyName` on the booking request. */
  companyName: string;
  /** The Odoo `res.partner` id, or `null` when nothing is linked.
   *  Persists as `odooContactId` on the booking request. */
  odooContactId: number | null;
}

interface Props {
  value: OdooCompanyPickerValue;
  onChange: (next: OdooCompanyPickerValue) => void;
  label?: string;
  required?: boolean;
  error?: string;
  /** Optional className for the outer wrapper. Useful for animation delays. */
  className?: string;
  style?: React.CSSProperties;
  /** Override input style — defaults to the §5.5 brand spec. Pass an empty
   *  string if a host form needs a different look. */
  inputClassName?: string;
  /** Auto-focus the input on mount (used in form steps that just became active). */
  autoFocus?: boolean;
  /** Fires once when staff pick a row from the dropdown. Receives the full
   *  picked Odoo customer so the host form can autofill sibling fields
   *  (Email Address, Phone Number) without re-querying. Host is expected to
   *  only autofill if its own field is empty — never overwrite typed input. */
  onPicked?: (row: OdooCustomer) => void;
}

/**
 * Live Odoo Company Name autocomplete.
 *
 * - Debounced 300 ms (§3.5), aborts in-flight on each keystroke
 * - Min 2 chars before firing (BE returns 400 below that)
 * - Keyboard navigation: ↓ ↑ Enter Esc
 * - role="combobox" + aria-expanded + aria-activedescendant
 * - Picked state renders a green chip + "Linked to Odoo · ID …" subline
 * - Differentiated states for empty / unavailable / rate-limited / unknown
 */
export function OdooCompanyPicker({
  value,
  onChange,
  label,
  required,
  error,
  className,
  style,
  inputClassName,
  autoFocus,
  onPicked,
}: Props) {
  const { t } = useLanguage();

  const [query, setQuery] = useState(value.companyName);
  const [results, setResults] = useState<OdooCustomer[]>([]);
  const [state, setState] = useState<PickerState>('idle');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  // Pickable when the user has typed something AND no link exists yet. If
  // odooContactId is set we render the chip view instead.
  const linked = value.odooContactId != null;

  // Sync external value changes (e.g. parent re-hydrating from a fetched
  // request). Only the free-text part — when `linked` flips we want to
  // surface the company name as-is.
  useEffect(() => {
    if (value.companyName !== query && (linked || query === '')) {
      setQuery(value.companyName);
    }
    // We intentionally don't depend on `query` here — that would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.companyName, linked]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Debounced live search. Per §3.3: 300 ms, 2-char minimum, abort previous.
  // We never fire when a company is already linked — that means the user has
  // committed, and re-searching would be wasteful (they can hit Change first).
  useEffect(() => {
    if (linked) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setState('idle');
      return;
    }

    setState('loading');
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await odooApi.searchCustomers(trimmed, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setResults(rows);
        setState(rows.length === 0 ? 'empty' : 'results');
        setActiveIdx(rows.length > 0 ? 0 : -1);
      } catch (err: unknown) {
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') return;
        if (err instanceof OdooSearchError) {
          if (err.kind === 'unavailable') setState('unavailable');
          else if (err.kind === 'rate_limited') setState('rate_limited');
          else setState('error');
        } else {
          setState('error');
        }
        setResults([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      ctrl.abort();
    };
  }, [query, linked]);

  const handlePick = useCallback(
    (row: OdooCustomer) => {
      onChange({ companyName: row.name, odooContactId: row.id });
      onPicked?.(row);
      setQuery(row.name);
      setOpen(false);
      setResults([]);
      setState('idle');
    },
    [onChange, onPicked],
  );

  const handleClearLink = useCallback(() => {
    // Clear BOTH the Odoo link AND the company name. Earlier behaviour
    // only nulled the contact id but kept the name — the input then
    // re-rendered the unlinked name as a stale "search query" (the
    // useEffect at L90 syncs `value.companyName` → `query` once linked
    // flips), so QA reported the cross button didn't actually clear
    // the field. A real clear nulls both and resets the local query.
    onChange({ companyName: '', odooContactId: null });
    setQuery('');
    // Re-focus the input so staff can immediately type a new search.
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && results[activeIdx]) {
        e.preventDefault();
        handlePick(results[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Whether to render the dropdown right now.
  const showDropdown = open && !linked && state !== 'idle' && query.trim().length >= 2;

  const labelText = label ?? t.odooPicker.label;

  // Brand §5.5 input — same shape as the rest of the Create form's recently
  // standardised fields (rounded-input, sett-border, focus shadow).
  const fieldCls = inputClassName ?? cn(
    'w-full p-3 rounded-input border bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary',
    'placeholder:text-sett-text-accent placeholder:font-montserrat placeholder:text-[14px] placeholder:font-normal placeholder:leading-normal',
    'focus:outline-none focus:border-sett-primary focus:shadow-input-focus transition-[border-color,box-shadow] duration-150',
    error ? 'border-sett-destructive' : 'border-sett-border',
  );

  return (
    <div className={className} style={style} ref={wrapperRef}>
      <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
        {labelText} {required && <span className="text-sett-destructive">*</span>}
      </label>

      {linked ? (
        <LinkedChip value={value} onClear={handleClearLink} />
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined}
            aria-label={t.odooPicker.ariaCombobox}
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              // Persist the typed string immediately so a "save as draft"
              // without picking still keeps the free text. odooContactId
              // stays null until the user picks a match.
              onChange({ companyName: e.target.value, odooContactId: null });
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t.odooPicker.placeholder}
            className={cn(fieldCls, 'pr-10')}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sett-text-muted pointer-events-none">
            <Search className="w-4 h-4" />
          </span>

          {showDropdown && (
            <DropdownPanel
              id={listboxId}
              state={state}
              results={results}
              activeIdx={activeIdx}
              setActiveIdx={setActiveIdx}
              onPick={handlePick}
            />
          )}
        </div>
      )}

      {/* Helper text — only shown when the dropdown is closed and no link
          exists. Keeps the "create in Odoo first" guidance visible without
          cluttering the dropdown chrome. */}
      {!linked && !showDropdown && (
        <p className="mt-1.5 font-montserrat text-[11px] italic text-sett-text-secondary leading-snug">
          {t.odooPicker.notInList} {t.odooPicker.createInOdooHint}
        </p>
      )}

      {error && (
        <p className="mt-1 font-montserrat text-[12px] text-sett-destructive">{error}</p>
      )}
    </div>
  );
}

/* ─── Linked chip ─── */
function LinkedChip({
  value,
  onClear,
}: {
  value: OdooCompanyPickerValue;
  onClear: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <div
        className="inline-flex items-center gap-2 max-w-full px-3 py-2 rounded-input border bg-sett-light-green-bg"
        style={{ borderColor: '#C8E050' }}
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sett-primary shrink-0">
          <Check className="w-3 h-3 text-sett-navy" strokeWidth={3} />
        </span>
        <span className="font-montserrat text-[14px] font-semibold text-sett-navy truncate">
          {value.companyName}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded-full text-sett-text-secondary hover:bg-white hover:text-sett-destructive transition-colors shrink-0"
          aria-label={t.odooPicker.remove}
          title={t.odooPicker.remove}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="mt-1.5 font-montserrat text-[11px] text-sett-text-secondary">
        {t.odooPicker.linkedToOdoo} · {t.odooPicker.odooId} {value.odooContactId}
      </p>
    </div>
  );
}

/* ─── Dropdown panel ─── */
function DropdownPanel({
  id,
  state,
  results,
  activeIdx,
  setActiveIdx,
  onPick,
}: {
  id: string;
  state: PickerState;
  results: OdooCustomer[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  onPick: (row: OdooCustomer) => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      id={id}
      role="listbox"
      className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-sett-border rounded-input shadow-[0_8px_24px_0_rgba(0,0,0,0.12)] overflow-hidden"
    >
      {state === 'loading' && (
        <StatusRow tone="muted">
          <Spinner /> <span>{t.odooPicker.searching}</span>
        </StatusRow>
      )}

      {state === 'empty' && <StatusRow tone="muted">{t.odooPicker.noMatches}</StatusRow>}

      {state === 'unavailable' && (
        <StatusRow tone="warning">{t.odooPicker.unavailable}</StatusRow>
      )}

      {state === 'rate_limited' && (
        <StatusRow tone="warning">{t.odooPicker.rateLimited}</StatusRow>
      )}

      {state === 'error' && (
        <StatusRow tone="warning">{t.odooPicker.genericError}</StatusRow>
      )}

      {state === 'results' && (
        <ul
          className="max-h-[280px] overflow-y-auto py-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >
          {results.map((row, i) => {
            const active = i === activeIdx;
            return (
              <li
                key={row.id}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  // mouseDown so we beat the input's blur which would close
                  // the dropdown before onClick fires.
                  e.preventDefault();
                  onPick(row);
                }}
                className={cn(
                  'px-3.5 py-2.5 cursor-pointer transition-colors',
                  active ? 'bg-sett-light-green-bg' : 'hover:bg-sett-fill',
                )}
              >
                <div className="font-montserrat text-[14px] font-semibold text-sett-navy truncate">
                  {row.name}
                </div>
                {(row.email || row.phone) && (
                  <div className="font-montserrat text-[12px] text-sett-text-secondary truncate">
                    {row.email ?? ''}
                    {row.email && row.phone ? ' · ' : ''}
                    {row.phone ?? ''}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusRow({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'muted' | 'warning';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3.5 py-3 font-montserrat text-[13px] leading-snug',
        tone === 'warning' ? 'text-sett-destructive bg-[#FCEBEB]' : 'text-sett-text-secondary',
      )}
    >
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin"
      aria-hidden
    />
  );
}
