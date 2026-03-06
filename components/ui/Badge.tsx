'use client';

import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'pending' | 'draft' | 'sent' | 'approved' | 'declined' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-[#f7f7f7] border border-[#e6eaf0] text-sett-text-primary',
  draft: 'bg-[#f7f7f7] border border-[#e6eaf0] text-sett-text-primary',
  sent: 'bg-[#f7faeb] border border-[#d5e39b] text-[#667f00] opacity-60',
  approved: 'bg-[#f7faeb] border border-[#d5e39b] text-[#667f00] opacity-60',
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

export function getStatusBadgeVariant(
  status: string
): BadgeVariant {
  const s = status?.toLowerCase() ?? '';
  if (s === 'pending') return 'pending';
  if (s === 'draft') return 'draft';
  if (s === 'sent' || s === 'accepted' || s === 'approved') return 'sent';
  if (s === 'declined' || s === 'cancelled') return 'declined';
  return 'default';
}
