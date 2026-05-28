'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SelectOption {
  value: string;
  label: string;
  /** Optional custom content rendered inside the dropdown item and trigger */
  node?: ReactNode;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  variant?: 'default' | 'filter';
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  name?: string;
  /** Optional override for the trigger button's class — used when a form needs
   *  the trigger to follow the §5.5 input style (4px radius, #E0E0E0 border)
   *  instead of the default rounded-[14px] look. */
  triggerClassName?: string;
}

export function Select({
  className,
  style,
  label,
  error,
  options,
  placeholder,
  value,
  onChange,
  variant = 'default',
  disabled,
  name,
  triggerClassName,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({ position: 'absolute', visibility: 'hidden' });
  const [positionMode, setPositionMode] = useState<'fixed' | 'absolute'>('fixed');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isFilter = variant === 'filter';

  // Detect if we're inside a scrollable container (modal, etc.)
  useEffect(() => {
    let parent = containerRef.current?.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') {
        setPositionMode('absolute');
        return;
      }
      parent = parent.parentElement;
    }
    setPositionMode('fixed');
  }, []);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label || placeholder || '';
  const isPlaceholder = !selectedOption;

  // Close on outside click (exclude both trigger container and portal dropdown)
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = listRef.current?.contains(target);
      if (!inContainer && !inDropdown) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Compute dropdown position (flip up if not enough space below)
  // useLayoutEffect runs before the browser paints, so the dropdown is
  // never visible in an unpositioned state — prevents the right-side layout shift.
  const updateDropdownPosition = useCallback(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = 232; // max-h-[220px] + padding + border

    const baseStyle: React.CSSProperties = {
      position: positionMode,
      visibility: 'visible',
      width: rect.width + 'px',
      zIndex: 9999,
    };

    if (positionMode === 'absolute') {
      // For absolute positioning (inside scrollable containers like modals
      // or any page wrapper with overflow-y-auto, e.g. <main> in AppLayout).
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Position the dropdown just below the trigger button, relative to the
      // Select's own container (which is `position: relative`). Previously
      // this added `containerRect.height` instead of using the trigger's
      // bottom — that pushed the dropdown the full container height (label +
      // input) below the trigger, leaving a visible gap of ~label-height.
      const relativeTop = rect.bottom - containerRect.top;
      const relativeLeft = rect.left - containerRect.left;
      const spaceBelow = containerRect.bottom - rect.bottom;
      const spaceAbove = rect.top - containerRect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        // Open upward only if not enough space below AND enough space above
        setDropdownStyle({
          ...baseStyle,
          top: spaceAbove - dropdownHeight - 2 + 'px',
          left: relativeLeft + 'px',
        });
      } else {
        // Open downward
        setDropdownStyle({
          ...baseStyle,
          top: relativeTop - 2 + 'px',
          left: relativeLeft + 'px',
        });
      }
    } else {
      // For fixed positioning (normal page context)
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Open upward
        setDropdownStyle({
          ...baseStyle,
          top: rect.top - dropdownHeight - 2 + 'px',
          left: rect.left + 'px',
        });
      } else {
        // Open downward
        setDropdownStyle({
          ...baseStyle,
          top: rect.bottom - 2 + 'px',
          left: rect.left + 'px',
        });
      }
    }
  }, [open, positionMode]);

  useLayoutEffect(() => {
    updateDropdownPosition();
  }, [open, updateDropdownPosition, positionMode]);

  // Recalculate dropdown position on scroll (for modals with scrollable content)
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updateDropdownPosition();
    document.addEventListener('scroll', handleScroll, { capture: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, [open, updateDropdownPosition]);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }
  }, [open, value]);

  const handleSelect = useCallback((optValue: string) => {
    onChange?.({ target: { value: optValue } });
    setOpen(false);
    setDropdownStyle({ position: positionMode, visibility: 'hidden' });
  }, [onChange, positionMode]);

  return (
    <div
      ref={containerRef}
      // When the dropdown is open AND we're in absolute (inline) mode, the
      // container needs a high z-index so the dropdown's stacking context can
      // float above sibling form fields lower in the page. Without this, the
      // inline dropdown is trapped within the container's natural paint order
      // and renders behind later siblings.
      className={cn('relative', open && positionMode === 'absolute' && 'z-[9999]', className)}
      style={style}
    >
      {label && (
        // §5.5 brand-spec label: 12px Montserrat 600 uppercase, 0.05em
        // tracking, navy. Matches the labels used by the Create form's
        // Hotel Category trigger, the date inputs, and all §5.5 inputs —
        // so a Select sitting next to those fields aligns on the same
        // baseline. Previously this was 14px medium which left a vertical
        // offset between sibling fields.
        <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
          {label.endsWith('*') ? (
            <>
              {label.slice(0, -1).trimEnd()}{' '}
              <span className="text-sett-destructive">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}

      {/* Hidden input for form compatibility */}
      <input type="hidden" name={name} value={value || ''} />

      {/* Trigger button.
          Filter variant uses a tighter typographic scale (13px medium navy)
          and a slightly darker rest-state border (#D0D0D0) so it reads as a
          chrome control distinct from form inputs. Default variant keeps the
          14px form-input look. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between border bg-white font-montserrat leading-normal cursor-pointer',
          'transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isFilter
            ? 'h-[41px] px-3.5 rounded-[10px] text-[13px] font-medium'
            : 'p-3 pr-3 rounded-[14px] text-[14px] font-normal',
          isPlaceholder
            ? isFilter ? 'text-sett-navy/70' : 'text-sett-text-accent'
            : isFilter ? 'text-sett-navy' : 'text-sett-text-primary',
          open
            ? isFilter
              ? 'border-sett-primary shadow-[0_0_0_3px_rgba(170,199,55,0.18)]'
              // Default (form-context) Selects use the §5.5 input focus glow
              // — same soft green box-shadow as the Hotel Category multi-select
              // and the brand-spec date/text inputs. Previously this used a
              // Tailwind `ring-2` which rendered as a chunkier outline and
              // looked visually heavier than its siblings.
              : 'border-sett-primary shadow-input-focus'
            : error
              ? 'border-red-500'
              : isFilter
                ? 'border-sett-border hover:border-sett-primary/50'
                // Default (form-context) Selects use the §5.5 input border
                // (#E0E0E0) — same shade as the Hotel Category multi-select
                // and brand-spec text inputs. Previously this used the lighter
                // #E6EAF0 (border-light), which read as a different tint from
                // its siblings on the same form row.
                : 'border-sett-border hover:border-sett-primary/40',
          triggerClassName,
        )}
      >
        {selectedOption?.node
          ? <span className="flex items-center gap-2 truncate">{selectedOption.node}</span>
          : <span className="truncate">{displayLabel}</span>
        }
        <ChevronDown
          className={cn(
            'shrink-0 transition-transform duration-200',
            isFilter ? 'w-3.5 h-3.5 ml-2 text-sett-text-secondary' : 'w-4 h-4 ml-2 text-sett-text-muted',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown panel — rendered in a portal for fixed, or inline for absolute.
          Filter variant uses a tighter widget: more breathing room per item,
          taller max-height, navy text on green for the selected state (so the
          selected row is legible, not green-on-green), and a soft separator
          below the "All X" reset row. */}
      {open && positionMode === 'fixed' && typeof document !== 'undefined' && createPortal(
        <div
          ref={listRef}
          style={dropdownStyle}
          className={cn(
            'bg-white overflow-hidden',
            isFilter
              ? 'rounded-[10px] border border-sett-border shadow-[0_10px_28px_-4px_rgba(7,28,66,0.18)]'
              : 'rounded-[14px] border border-sett-border-light shadow-[0_8px_24px_0_rgba(0,0,0,0.12)]',
          )}
        >
          <div className={cn('overflow-y-auto', isFilter ? 'max-h-[280px] py-1.5' : 'max-h-[220px] py-1')}>
            {placeholder && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={cn(
                    'w-full flex items-center justify-between transition-colors duration-150',
                    isFilter
                      ? 'px-3.5 py-2.5 font-montserrat text-[13px]'
                      : 'px-3 py-1.5 font-montserrat text-[13px] leading-tight',
                    !value
                      ? isFilter
                        ? 'bg-sett-light-green-bg text-sett-navy font-semibold'
                        : 'text-sett-primary font-medium bg-sett-light-green-bg'
                      : isFilter
                        ? 'text-sett-text-secondary hover:bg-sett-fill'
                        : 'text-sett-text-accent hover:bg-[#F7F7F7]',
                  )}
                >
                  <span className="truncate">{placeholder}</span>
                  {!value && <Check className={cn('shrink-0 ml-2 text-sett-primary', isFilter ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5')} strokeWidth={isFilter ? 3 : 2} />}
                </button>
                {isFilter && <div className="h-px bg-sett-border-light mx-2 my-1" aria-hidden />}
              </>
            )}
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full flex items-center justify-between transition-colors duration-150',
                    isFilter
                      ? 'px-3.5 py-2.5 font-montserrat text-[13px]'
                      : 'px-3 py-1.5 font-montserrat text-[13px] leading-tight',
                    isSelected
                      ? isFilter
                        ? 'bg-sett-light-green-bg text-sett-navy font-semibold'
                        : 'text-sett-primary font-medium bg-sett-light-green-bg'
                      : isFilter
                        ? 'text-sett-navy hover:bg-sett-fill'
                        : 'text-sett-text-primary hover:bg-[#F7F7F7]',
                  )}
                >
                  {opt.node
                    ? <span className="flex items-center gap-2">{opt.node}</span>
                    : <span className="truncate">{opt.label}</span>
                  }
                  {isSelected && <Check className="w-3.5 h-3.5 text-sett-primary shrink-0 ml-2" strokeWidth={isFilter ? 3 : 2} />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* For absolute positioning inside modals, render inline */}
      {open && positionMode === 'absolute' && (
        <div
          ref={listRef}
          style={dropdownStyle}
          className={cn(
            'bg-white overflow-hidden',
            isFilter
              ? 'rounded-[10px] border border-sett-border shadow-[0_10px_28px_-4px_rgba(7,28,66,0.18)]'
              : 'rounded-[14px] border border-sett-border-light shadow-[0_8px_24px_0_rgba(0,0,0,0.12)]',
          )}
        >
          <div className={cn('overflow-y-auto', isFilter ? 'max-h-[280px] py-1.5' : 'max-h-[220px] py-1')}>
            {placeholder && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={cn(
                    'w-full flex items-center justify-between transition-colors duration-150',
                    isFilter
                      ? 'px-3.5 py-2.5 font-montserrat text-[13px]'
                      : 'px-3 py-1.5 font-montserrat text-[13px] leading-tight',
                    !value
                      ? isFilter
                        ? 'bg-sett-light-green-bg text-sett-navy font-semibold'
                        : 'text-sett-primary font-medium bg-sett-light-green-bg'
                      : isFilter
                        ? 'text-sett-text-secondary hover:bg-sett-fill'
                        : 'text-sett-text-accent hover:bg-[#F7F7F7]',
                  )}
                >
                  <span className="truncate">{placeholder}</span>
                  {!value && <Check className="w-3.5 h-3.5 text-sett-primary shrink-0 ml-2" strokeWidth={isFilter ? 3 : 2} />}
                </button>
                {isFilter && <div className="h-px bg-sett-border-light mx-2 my-1" aria-hidden />}
              </>
            )}
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full flex items-center justify-between transition-colors duration-150',
                    isFilter
                      ? 'px-3.5 py-2.5 font-montserrat text-[13px]'
                      : 'px-3 py-1.5 font-montserrat text-[13px] leading-tight',
                    isSelected
                      ? isFilter
                        ? 'bg-sett-light-green-bg text-sett-navy font-semibold'
                        : 'text-sett-primary font-medium bg-sett-light-green-bg'
                      : isFilter
                        ? 'text-sett-navy hover:bg-sett-fill'
                        : 'text-sett-text-primary hover:bg-[#F7F7F7]',
                  )}
                >
                  {opt.node
                    ? <span className="flex items-center gap-2">{opt.node}</span>
                    : <span className="truncate">{opt.label}</span>
                  }
                  {isSelected && <Check className="w-3.5 h-3.5 text-sett-primary shrink-0 ml-2" strokeWidth={isFilter ? 3 : 2} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
    </div>
  );
}

Select.displayName = 'Select';
