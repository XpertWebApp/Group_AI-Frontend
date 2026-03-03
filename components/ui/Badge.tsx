'use client';

import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'pending' | 'draft' | 'sent' | 'approved' | 'declined' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: 'bg-sett-pending text-sett-text-primary',
  draft: 'bg-sett-draft text-sett-text-primary',
  sent: 'bg-sett-sent text-green-800',
  approved: 'bg-sett-sent text-green-800',
  declined: 'bg-sett-declined text-red-800',
  default: 'bg-sett-border text-sett-text-secondary',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-badge text-caption font-medium',
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
