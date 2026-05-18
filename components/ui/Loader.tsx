'use client';

import { cn } from '@/lib/utils/cn';

/* ────────────────────────────────────────────
   Shared shimmer placeholder used by skeletons.
   A pale base + a diagonal highlight that travels left→right gives the
   "data is loading" hint without strobing like a raw opacity pulse.
   ──────────────────────────────────────────── */
export function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded bg-sett-fill',
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent"
      />
    </div>
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
   5. RequestSummarySkeleton — mimics the Request Summary page layout
      (hero strip + summary card with trip stats, rooms, customer details, policies)
   ──────────────────────────────────────────── */
export function RequestSummarySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 md:p-6 space-y-6', className)}>
      {/* ── Hero / breadcrumb strip ── */}
      <div className="flex items-center gap-3 animate-card-rise-in">
        <Shimmer className="h-4 w-16 rounded-full" />
        <Shimmer className="h-4 w-4 rounded-full" />
        <Shimmer className="h-4 w-24 rounded-full" />
        <Shimmer className="h-4 w-4 rounded-full" />
        <Shimmer className="h-5 w-40 rounded-full bg-sett-border" />
      </div>

      {/* ── Request Summary card ── */}
      <div
        className="relative bg-white rounded-[14px] border border-sett-border p-5 animate-card-rise-in"
        style={{ animationDelay: '80ms' }}
      >
        {/* Section header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-1 h-10 bg-sett-primary/40 rounded-full mt-0.5" />
          <div className="space-y-2">
            <Shimmer className="h-5 w-44 rounded-full bg-sett-border" />
            <Shimmer className="h-3.5 w-28 rounded-full" />
          </div>
        </div>

        {/* Trip details row */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
          {/* Left: heading + location + date */}
          <div className="space-y-3">
            <Shimmer className="h-4 w-28 rounded-full bg-sett-border" />
            <div className="flex flex-wrap items-center gap-3">
              <Shimmer className="h-4 w-32 rounded-full" />
              <span className="w-1 h-1 rounded-full bg-sett-border-light" />
              <Shimmer className="h-4 w-44 rounded-full" />
            </div>
          </div>
          {/* Right: 4 stat columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 xl:gap-5 xl:flex xl:items-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-start xl:items-center gap-2">
                <Shimmer className="h-3 w-20 rounded-full" />
                <Shimmer className="h-4 w-24 rounded-full bg-sett-border" />
              </div>
            ))}
          </div>
        </div>

        <hr className="border-sett-border-light mb-6" />

        {/* Room & Accommodations */}
        <div className="space-y-5 mb-6">
          <Shimmer className="h-5 w-56 rounded-full bg-sett-border" />
          {/* Room types row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-3 border border-sett-border rounded-[14px] py-5"
              >
                <Shimmer className="h-6 w-12 rounded-full bg-sett-border" />
                <Shimmer className="h-3 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <hr className="border-sett-border-light mb-6" />

        {/* Customer Details */}
        <div className="space-y-5 mb-6">
          <Shimmer className="h-5 w-44 rounded-full bg-sett-border" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Shimmer className="h-3 w-20 rounded-full" />
                <Shimmer className="h-4 w-32 rounded-full bg-sett-border" />
              </div>
            ))}
          </div>
        </div>

        <hr className="border-sett-border-light mb-6" />

        {/* Policies */}
        <div className="space-y-3">
          <Shimmer className="h-5 w-28 rounded-full bg-sett-border" />
          <div className="bg-sett-fill rounded-card p-4 space-y-2">
            <Shimmer className="h-3 w-32 rounded-full" />
            <Shimmer className="h-3.5 w-full rounded-full" />
            <Shimmer className="h-3.5 w-4/5 rounded-full" />
          </div>
          <div className="bg-sett-fill rounded-card p-4 space-y-2">
            <Shimmer className="h-3 w-32 rounded-full" />
            <Shimmer className="h-3.5 w-full rounded-full" />
            <Shimmer className="h-3.5 w-3/5 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Side-by-side: Hotels list + Pricing card ── */}
      <div
        className="flex flex-col lg:flex-row gap-6 animate-card-rise-in"
        style={{ animationDelay: '180ms' }}
      >
        {/* Left: 2 hotel cards */}
        <div className="flex-1 space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[14px] border border-sett-border overflow-hidden flex flex-col sm:flex-row"
            >
              <Shimmer className="sm:w-[220px] h-[160px] sm:h-auto rounded-none" />
              <div className="flex-1 p-5 space-y-3">
                <Shimmer className="h-5 w-2/3 rounded-full bg-sett-border" />
                <Shimmer className="h-3.5 w-1/2 rounded-full" />
                <div className="flex flex-wrap gap-2 pt-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Shimmer key={j} className="h-6 w-20 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Pricing sidebar */}
        <div className="lg:w-[320px] shrink-0 space-y-4">
          <div className="bg-white rounded-[14px] border border-sett-border p-5 space-y-4">
            <Shimmer className="h-5 w-32 rounded-full bg-sett-border" />
            <div className="space-y-2.5 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Shimmer className="h-3.5 w-24 rounded-full" />
                  <Shimmer className="h-3.5 w-16 rounded-full bg-sett-border" />
                </div>
              ))}
            </div>
            <hr className="border-sett-border-light" />
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-20 rounded-full bg-sett-border" />
              <Shimmer className="h-5 w-24 rounded-full bg-sett-primary/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   6. StatCardSkeleton — mimics dashboard stat cards
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
