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
          <label className={cn("block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5", labelClassName)}>
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
          <input
            ref={ref}
            type={inputType}
            className={cn(
              'w-full p-3 rounded-[14px] border border-sett-border-light bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent placeholder:font-montserrat placeholder:text-[14px] placeholder:font-normal placeholder:leading-normal',
              'focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-red-500' : 'border-sett-border',
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
