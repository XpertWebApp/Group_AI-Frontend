'use client';

import { cn } from '@/lib/utils/cn';

/* ────────────────────────────────────────────
   Shared pulse animation bar used by skeletons
   ──────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded bg-sett-border animate-pulse',
        className,
      )}
    />
  );
}

/* ────────────────────────────────────────────
   1. Spinner — compact inline / centered spinner
   ──────────────────────────────────────────── */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeMap = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-[2.5px]', lg: 'w-10 h-10 border-[3px]' };
  return (
    <span
      className={cn(
        'inline-block rounded-full border-sett-primary border-t-transparent animate-spin',
        sizeMap[size],
        className,
      )}
    />
  );
}

/* ────────────────────────────────────────────
   2. PageLoader — full-area branded loader
      (centered spinner with optional message)
   ──────────────────────────────────────────── */
interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message, className }: PageLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-20 gap-4', className)}>
      <div className="relative">
        {/* Outer ring */}
        <span className="block w-12 h-12 rounded-full border-[3px] border-sett-border" />
        {/* Spinning arc */}
        <span className="absolute inset-0 block w-12 h-12 rounded-full border-[3px] border-transparent border-t-sett-primary animate-spin" />
      </div>
      {message && (
        <p className="text-body text-sett-text-muted animate-pulse">{message}</p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   3. TableSkeleton — mimics a data table
   ──────────────────────────────────────────── */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 8, className }: TableSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4 border-y border-sett-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer
            key={`head-${i}`}
            className="h-3 flex-1 max-w-[100px] rounded-full bg-sett-fill"
          />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex items-center gap-4 px-5 py-5 border-b border-sett-border last:border-0"
          style={{ animationDelay: `${rowIdx * 80}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => {
            // Vary widths for a more realistic look
            const widths = ['w-12', 'w-24', 'w-20', 'w-28', 'w-10', 'w-16', 'w-14', 'w-20', 'w-20', 'w-20'];
            return (
              <Shimmer
                key={`cell-${rowIdx}-${colIdx}`}
                className={cn('h-3.5 rounded-full', widths[colIdx % widths.length])}
                // stagger the pulse per row
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   4. CardSkeleton — mimics a mobile card list
   ──────────────────────────────────────────── */
interface CardSkeletonProps {
  cards?: number;
  className?: string;
}

export function CardSkeleton({ cards = 4, className }: CardSkeletonProps) {
  return (
    <div className={cn('divide-y divide-sett-border', className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={`card-${i}`} className="p-4 space-y-3">
          {/* Top row: ID + badge */}
          <div className="flex items-center justify-between">
            <Shimmer className="h-4 w-14 rounded-full" />
            <Shimmer className="h-5 w-16 rounded-badge" />
          </div>
          {/* Name */}
          <Shimmer className="h-3.5 w-36 rounded-full" />
          {/* Sub-text */}
          <Shimmer className="h-3 w-24 rounded-full" />
          {/* 2-col grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={`field-${i}-${j}`} className="space-y-1.5">
                <Shimmer className="h-2.5 w-16 rounded-full bg-sett-fill" />
                <Shimmer className="h-3 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────
   5. StatCardSkeleton — mimics dashboard stat cards
   ──────────────────────────────────────────── */
interface StatCardSkeletonProps {
  cards?: number;
  className?: string;
}

export function StatCardSkeleton({ cards = 4, className }: StatCardSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={`stat-${i}`}
          className="bg-sett-card rounded-card shadow-card p-4 border border-sett-border relative animate-pulse"
        >
          {/* Icon placeholder */}
          <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-sett-fill" />
          {/* Label */}
          <Shimmer className="h-2.5 w-24 rounded-full bg-sett-fill" />
          {/* Value */}
          <Shimmer className="h-7 w-14 rounded-lg mt-2" />
          {/* Trend row */}
          <div className="flex items-center gap-1.5 mt-2">
            <Shimmer className="h-3.5 w-3.5 rounded-full bg-sett-fill" />
            <Shimmer className="h-3 w-10 rounded-full bg-sett-fill" />
            <Shimmer className="h-3 w-16 rounded-full bg-sett-fill" />
          </div>
        </div>
      ))}
    </div>
  );
}
