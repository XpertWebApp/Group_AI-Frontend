'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils/cn';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id: idProp, ...props }, ref) => {
    const generatedId = useId();
    const inputId = idProp ?? `checkbox-${generatedId.replace(/:/g, '')}`;
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
