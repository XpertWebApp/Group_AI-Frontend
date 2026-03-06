'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-sett-primary text-white shadow-[0px_8px_20px_0px_rgba(0,0,0,0.13)] hover:bg-sett-primary-hover active:bg-sett-primary-active disabled:opacity-50 disabled:pointer-events-none',
  secondary:
    'bg-white border border-sett-border text-sett-text-primary hover:bg-sett-background active:bg-sett-border disabled:opacity-50 disabled:pointer-events-none',
  outline:
    'bg-transparent border border-sett-primary text-sett-primary hover:bg-sett-light-green-bg disabled:opacity-50 disabled:pointer-events-none',
  destructive:
    'bg-sett-destructive text-white hover:bg-sett-destructive-hover disabled:opacity-50 disabled:pointer-events-none',
  ghost:
    'bg-transparent text-sett-text-primary hover:bg-sett-border/50 disabled:opacity-50 disabled:pointer-events-none',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-input',
  md: 'px-4 py-2.5 text-body rounded-button',
  lg: 'px-6 py-3 text-body rounded-button',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
        disabled,
        children,
        type = 'button',
        ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-colors rounded-button focus:outline-none focus:ring-2 focus:ring-sett-primary focus:ring-offset-2',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
