'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isPassword?: boolean;
  labelClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, isPassword, labelClassName, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && (
          // §5.5 brand-spec label — 12px Montserrat 600 uppercase, 0.05em
          // tracking, navy. Matches the labels used by Select and Hotel
          // Category so siblings on the same row land at the same y-baseline.
          // Previously this was 14px medium which left a ~2px vertical offset
          // between an Input and an adjacent Select.
          <label className={cn("block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5", labelClassName)}>
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
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              // §5.5 brand-spec input — same border (#E0E0E0) and same soft
              // focus glow (shadow-input-focus) as the Hotel Category multi-
              // select and the Select component, so form-context inputs share
              // a single visual language when sitting next to each other.
              'w-full p-3 rounded-[14px] border bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent placeholder:font-montserrat placeholder:text-[14px] placeholder:font-normal placeholder:leading-normal',
              'focus:outline-none focus:border-sett-primary focus:shadow-input-focus transition-[border-color,box-shadow] duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-sett-destructive' : 'border-sett-border',
              isPassword && 'pr-10',
              isPassword && !showPassword && 'text-[20px] tracking-[0.2em] placeholder:text-[14px] placeholder:tracking-normal',
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sett-text-muted hover:text-sett-primary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
