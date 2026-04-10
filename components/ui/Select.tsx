'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  disabled?: boolean;
  name?: string;
}

export function Select({
  className,
  label,
  error,
  options,
  placeholder,
  value,
  onChange,
  variant = 'default',
  disabled,
  name,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isFilter = variant === 'filter';

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
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 260; // max-h-[240px] + padding
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      // Open upward
      setDropdownStyle({
        position: 'fixed',
        top: rect.top - dropdownHeight + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        zIndex: 9999,
      });
    } else {
      // Open downward
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6 + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        zIndex: 9999,
      });
    }
  }, [open]);

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
  }, [onChange]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
          {label.endsWith('*') ? (
            <>
              {label.slice(0, -1).trimEnd()}{' '}
              <span className="font-montserrat text-[14px] font-medium leading-normal uppercase text-[#FB2C36]">*</span>
            </>
          ) : (
            label
          )}
        </label>
      )}

      {/* Hidden input for form compatibility */}
      <input type="hidden" name={name} value={value || ''} />

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between rounded-[14px] border bg-white font-montserrat text-[14px] font-normal leading-normal cursor-pointer',
          isFilter ? 'h-[41px] p-3' : 'p-3 pr-3',
          isPlaceholder ? 'text-sett-text-accent' : 'text-sett-text-primary',
          'transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open
            ? 'border-sett-primary ring-2 ring-sett-primary/20'
            : error
              ? 'border-red-500'
              : isFilter
                ? 'border-[#68686833] hover:border-sett-primary/40'
                : 'border-sett-border-light hover:border-sett-primary/40',
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

      {/* Dropdown panel — rendered in a portal to escape overflow:hidden parents */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={listRef}
          style={dropdownStyle}
          className="rounded-[14px] border border-sett-border-light bg-white shadow-[0_8px_24px_0_rgba(0,0,0,0.12)] overflow-hidden"
        >
          <div className="max-h-[240px] overflow-y-auto py-1.5">
            {placeholder && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 font-montserrat text-[14px] transition-colors',
                  !value ? 'text-sett-primary font-medium bg-sett-light-green-bg' : 'text-sett-text-accent hover:bg-[#F7F7F7]'
                )}
              >
                <span>{placeholder}</span>
                {!value && <Check className="w-4 h-4 text-sett-primary shrink-0" />}
              </button>
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
                    'w-full flex items-center justify-between px-3.5 py-2.5 font-montserrat text-[14px] transition-colors',
                    isSelected
                      ? 'text-sett-primary font-medium bg-sett-light-green-bg'
                      : 'text-sett-text-primary hover:bg-[#F7F7F7]'
                  )}
                >
                  {opt.node
                    ? <span className="flex items-center gap-2">{opt.node}</span>
                    : <span className="truncate">{opt.label}</span>
                  }
                  {isSelected && <Check className="w-4 h-4 text-sett-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
    </div>
  );
}

Select.displayName = 'Select';
