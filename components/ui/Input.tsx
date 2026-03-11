'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, isPassword, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {label.endsWith('*') ? (
              <>
                {label.slice(0, -1).trimEnd()}{' '}
                <span className="text-red-500">*</span>
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
              'w-full px-3 py-2.5 rounded-input border bg-white text-sett-text-primary placeholder:text-sett-text-muted text-body',
              'focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-red-500' : 'border-sett-border',
              isPassword && 'pr-10',
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
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
