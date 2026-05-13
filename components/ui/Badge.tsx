'use client';

import { cn } from '@/lib/utils/cn';

type BadgeVariant =
  | 'pending'
  | 'draft'
  | 'processing'
  | 'ai_generated'
  | 'completed'
  | 'sent'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'needs_manual_handling'
  | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-sett-light-green-bg border border-sett-primary text-sett-green-dark font-semibold',
  draft: 'bg-sett-fill border border-sett-border text-sett-text-secondary',
  processing: 'bg-transparent border border-sett-primary text-sett-primary font-semibold animate-badge-pulse',
  ai_generated: 'bg-sett-navy text-sett-primary border border-sett-navy',
  completed: 'bg-sett-light-green-bg border border-sett-primary/40 text-[#667f00]',
  sent: 'bg-sett-light-green-bg border border-sett-primary/40 text-[#667f00] opacity-60',
  approved: 'bg-sett-light-green-bg border border-sett-primary/40 text-[#667f00] opacity-60',
  declined: 'bg-[#ffeaeb] border border-[#feb1b5] text-[#fb2c36]',
  cancelled: 'bg-[#f7f7f7] border border-sett-border-light text-sett-text-secondary',
  needs_manual_handling: 'bg-sett-navy text-sett-primary border border-sett-primary font-semibold',
  default: 'bg-sett-border text-sett-text-secondary border border-sett-border',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-badge text-body font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): BadgeVariant {
  const s = status?.toLowerCase() ?? '';
  if (s === 'pending') return 'pending';
  if (s === 'draft') return 'draft';
  if (s === 'processing') return 'processing';
  if (s === 'ai_generated') return 'ai_generated';
  if (s === 'completed') return 'completed';
  if (s === 'sent' || s === 'accepted' || s === 'approved') return 'sent';
  if (s === 'declined') return 'declined';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'needs_manual_handling') return 'needs_manual_handling';
  return 'default';
}
