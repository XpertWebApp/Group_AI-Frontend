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

/*
 * Button variants per SETT Brand Guidelines §5.1
 * PRIMARY CTA: bg #AAC737, text #071c42, uppercase, letter-spacing 0.08em
 * SECONDARY:   transparent bg, 2px solid #AAC737, text #AAC737
 * HOVER:       bg #7a9420, transition 0.2s ease
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-sett-primary text-sett-navy uppercase tracking-[0.08em] font-bold transition-colors duration-200 hover:bg-sett-primary-hover active:bg-sett-primary-hover disabled:opacity-50 disabled:pointer-events-none',
  secondary:
    'bg-transparent border-2 border-sett-primary text-sett-primary uppercase tracking-[0.08em] font-bold transition-colors duration-200 hover:bg-sett-primary hover:text-sett-navy disabled:opacity-50 disabled:pointer-events-none',
  outline:
    'bg-transparent border-2 border-sett-primary text-sett-primary uppercase tracking-[0.08em] font-bold transition-colors duration-200 hover:bg-sett-light-green-bg disabled:opacity-50 disabled:pointer-events-none',
  destructive:
    'bg-sett-destructive text-white uppercase tracking-[0.08em] font-bold transition-colors duration-200 hover:bg-sett-destructive-hover disabled:opacity-50 disabled:pointer-events-none',
  ghost:
    'bg-transparent text-sett-text-primary transition-colors duration-200 hover:bg-sett-border/50 disabled:opacity-50 disabled:pointer-events-none',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px] rounded-button',
  md: 'px-8 py-3.5 text-[14px] rounded-button',
  lg: 'px-10 py-4 text-[14px] rounded-button',
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
          'inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-button focus:outline-none focus:ring-2 focus:ring-sett-primary focus:ring-offset-2 transition-transform duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms]',
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
