'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  /** Compact filter variant — shorter height, tighter padding, subtle fill */
  variant?: 'default' | 'filter';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, value, variant = 'default', ...props }, ref) => {
    const isPlaceholder = !value || value === '';
    const isFilter = variant === 'filter';

    return (
      <div>
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
        <div className="relative">
          <select
            ref={ref}
            value={value}
            className={cn(
              'w-full rounded-[14px] border bg-white font-montserrat text-[14px] font-normal leading-normal appearance-none cursor-pointer',
              isFilter ? 'py-[10px] pl-3 pr-8' : 'p-3 pr-9',
              isPlaceholder ? 'text-sett-text-accent' : 'text-sett-text-primary',
              'focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-150',
              error
                ? 'border-red-500'
                : isFilter
                  ? 'border-sett-border hover:border-sett-primary/40'
                  : 'border-sett-border-light',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-sett-text-accent">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={cn(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none transition-colors',
              isFilter
                ? 'right-2.5 w-3.5 h-3.5 text-sett-text-secondary'
                : 'right-3 w-4 h-4 text-sett-text-muted'
            )}
          />
        </div>
        {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
