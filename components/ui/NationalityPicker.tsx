'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useNationalities } from '@/hooks/useNationalities';
import type { Nationality } from '@/lib/api/nationalities';

/**
 * NationalityPicker — searchable combobox for the WBE nationality list.
 *
 * Per BE handover (public/nationality-change-fe.md §3.2):
 *  - Type-ahead filters on both `name` (primary) AND `code` (secondary)
 *  - Display: "Germany (DE)" — name with muted code suffix
 *  - Placeholder: "Select nationality…"
 *  - No silent default — caller must handle the empty state
 *
 * Used in three surfaces:
 *  - Create Request Step 1 (required, blocks Submit)
 *  - Edit Request modal (pre-populated)
 *  - Future: NATIONALITY_REQUIRED 400 retry flow (Edit modal focused)
 */
interface NationalityPickerProps {
  /** Currently selected ISO code (e.g. 'DE'). Null = nothing picked. */
  value: string | null;
  /** Fires with the picked code, or null when the user clears the field. */
  onChange: (code: string | null) => void;
  /** Disable interaction entirely (e.g. while submitting the form). */
  disabled?: boolean;
  /** Show as an error state (red border) — caller manages validation. */
  hasError?: boolean;
  /** Optional className passthrough on the outer wrapper. */
  className?: string;
  /** Override the placeholder. Defaults to t.nationality.placeholder. */
  placeholder?: string;
  /** Optional: disable the X clear button (e.g. on Create where required). */
  allowClear?: boolean;
}

export function NationalityPicker({
  value,
  onChange,
  disabled,
  hasError,
  className,
  placeholder,
  allowClear = true,
}: NationalityPickerProps) {
  const { t } = useLanguage();
  const { nationalities, loading, error } = useNationalities();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve the selected code into a Nationality row for display.
  const selected = useMemo(
    () => nationalities.find((n) => n.code === value) ?? null,
    [nationalities, value],
  );

  // Type-ahead filter: matches name (primary, case-insensitive) AND code
  // (secondary, exact prefix). When query is empty, show all so the user
  // can scroll through if preferred. Capped at 50 visible to keep DOM
  // small — 50 is generous since most searches narrow within a few chars.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nationalities.slice(0, 50);
    const matches = nationalities.filter((n) => {
      const nameMatch = (n.name ?? '').toLowerCase().includes(q);
      const codeMatch = n.code.toLowerCase().startsWith(q);
      return nameMatch || codeMatch;
    });
    return matches.slice(0, 50);
  }, [nationalities, query]);

  // Outside-click + Escape close. Same pattern as OdooCompanyPicker.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Auto-focus the search input the moment we open. Keyboard users get
  // type-ahead immediately; mouse users don't notice.
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Display label resolver — name primary, falls back to code if name
  // is null (BE handover §2.1 says some entries may have null names).
  const displayLabel = (n: Nationality): string => n.name ?? n.code;

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {/* Trigger button — looks like an input field but opens the panel.
          When a value is selected, shows "Name (code)"; otherwise the
          placeholder. */}
      <button
        type="button"
        onClick={() => !disabled && !loading && !error && setOpen((o) => !o)}
        disabled={disabled || loading || error}
        className={cn(
          'w-full h-[44px] flex items-center justify-between gap-2 px-3 rounded-[14px] border bg-white font-montserrat text-[14px] focus:outline-none transition-[border-color,box-shadow] duration-150',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          hasError
            ? 'border-sett-destructive focus:border-sett-destructive focus:shadow-[0_0_0_3px_rgba(251,44,54,0.15)]'
            : 'border-sett-border hover:border-sett-primary/40 focus:border-sett-primary focus:shadow-input-focus',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn('truncate text-left flex-1', selected ? 'text-sett-text-primary' : 'text-sett-text-accent')}>
          {loading
            ? t.nationality.loading
            : error
              ? t.nationality.unavailable
              : selected
                ? (
                  <>
                    {displayLabel(selected)}
                    {selected.name && (
                      <span className="ml-1.5 text-sett-text-accent text-[12px] font-medium">
                        ({selected.code})
                      </span>
                    )}
                  </>
                )
                : (placeholder ?? t.nationality.placeholder)}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange(null);
                }
              }}
              className="p-0.5 rounded hover:bg-sett-border/40 text-sett-text-secondary"
              aria-label={t.nationality.clear}
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-sett-text-secondary transition-transform duration-150',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          className="absolute z-[9999] top-full left-0 right-0 mt-1 max-h-[320px] rounded-[10px] border border-sett-border bg-white shadow-[0_10px_28px_-4px_rgba(7,28,66,0.18)] overflow-hidden flex flex-col"
        >
          {/* Search input — sticky top of the panel */}
          <div className="relative p-2 border-b border-sett-border-light">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sett-text-accent pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.nationality.searchPlaceholder}
              className="w-full h-[36px] pl-9 pr-3 rounded-[8px] border border-sett-border bg-white font-montserrat text-[13px] text-sett-text-primary placeholder:text-sett-text-accent focus:outline-none focus:border-sett-primary"
              autoFocus
            />
          </div>

          {/* Results list */}
          <div className="overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center font-montserrat text-[13px] text-sett-text-accent">
                {t.nationality.noResults}
              </div>
            ) : (
              filtered.map((n) => {
                const isSelected = n.code === value;
                return (
                  <button
                    key={n.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(n.code);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-150',
                      isSelected
                        ? 'bg-sett-light-green-bg text-sett-navy font-semibold'
                        : 'text-sett-text-primary hover:bg-sett-fill',
                    )}
                  >
                    <span className="truncate font-montserrat text-[13px]">
                      {displayLabel(n)}
                    </span>
                    {n.name && (
                      <span className="font-montserrat text-[11px] text-sett-text-accent shrink-0">
                        {n.code}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Error state — surfaces under the trigger when the BE call failed.
          The handover (§5 edge cases) says "Nationality list unavailable,
          please refresh." */}
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 font-montserrat text-[12px] text-sett-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {t.nationality.unavailableHint}
        </p>
      )}
    </div>
  );
}
