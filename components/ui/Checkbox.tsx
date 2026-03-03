'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? `checkbox-${Math.random().toString(36).slice(2)}`;
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cn(
            'w-4 h-4 rounded border-sett-border text-sett-primary focus:ring-sett-primary',
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={inputId} className="text-body text-sett-text-primary cursor-pointer">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
