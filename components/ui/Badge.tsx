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
  | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-[#f7f7f7] border border-sett-border-light text-sett-text-primary',
  draft: 'bg-[#f7f7f7] border border-sett-border-light text-sett-text-primary',
  processing: 'bg-blue-50 border border-blue-200 text-blue-700',
  ai_generated: 'bg-purple-50 border border-purple-200 text-purple-700',
  completed: 'bg-sett-light-green-bg border border-sett-primary/40 text-[#667f00]',
  sent: 'bg-sett-light-green-bg border border-sett-primary/40 text-[#667f00] opacity-60',
  approved: 'bg-sett-light-green-bg border border-sett-primary/40 text-[#667f00] opacity-60',
  declined: 'bg-[#ffeaeb] border border-[#feb1b5] text-[#fb2c36]',
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
  if (s === 'declined' || s === 'cancelled') return 'declined';
  return 'default';
}
