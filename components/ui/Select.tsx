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
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, value, ...props }, ref) => {
    const isPlaceholder = !value || value === '';
    return (
      <div>
        {label && (
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-[#1D1D1D] uppercase mb-1.5">
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
              'w-full p-3 rounded-[14px] border bg-white font-montserrat text-[14px] font-normal leading-normal appearance-none pr-9',
              isPlaceholder ? 'text-[#A3A3A3]' : 'text-sett-text-primary',
              'focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-red-500' : 'border-[#E6EAF0]',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-[#A3A3A3]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sett-text-muted pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
