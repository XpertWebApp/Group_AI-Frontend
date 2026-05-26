'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  /** The target value to count up to. When this changes, the animation
   *  re-runs from the previous value to the new one. */
  value: number;
  /** Animation duration in ms. Defaults to 1200. */
  duration?: number;
  /** Optional ms delay before the count-up starts. Useful for staggering
   *  multiple counters in a cascade. */
  delay?: number;
  /** Number of decimal places to render. Defaults to 0 (integers). */
  decimals?: number;
  /** Optional className passed through to the wrapping span. */
  className?: string;
  /** Optional formatter override — receives the current animated number
   *  and returns the displayed string. Useful for "€1,234" style. */
  format?: (n: number) => string;
}

/**
 * Count-up animation for a numeric value.
 *
 * - Uses requestAnimationFrame with an `easeOutCubic` curve so the number
 *   decelerates as it approaches the target (lands cleanly instead of
 *   slamming).
 * - Respects `prefers-reduced-motion` — when reduced motion is on, the
 *   number snaps to its final value immediately.
 * - Re-runs smoothly if `value` changes mid-animation (e.g. live polling),
 *   starting from the current displayed value instead of resetting to 0.
 */
export function AnimatedNumber({
  value,
  duration = 1200,
  delay = 0,
  decimals = 0,
  className,
  format,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState<number>(value);
  const fromRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion → snap to final value.
    if (reduce) {
      setDisplayed(value);
      return;
    }

    // Set the animation's starting point from the currently displayed value
    // so back-to-back changes blend rather than restart from 0.
    fromRef.current = displayed;

    const run = () => {
      startRef.current = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        const t = Math.min(1, elapsed / duration);
        // easeOutCubic — fast start, gentle landing.
        const eased = 1 - Math.pow(1 - t, 3);
        const next = fromRef.current + (value - fromRef.current) * eased;
        setDisplayed(next);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      timeoutRef.current = setTimeout(run, delay);
    } else {
      run();
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
    };
    // We intentionally don't depend on `displayed` — that would loop the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, delay]);

  const rendered = format
    ? format(displayed)
    : displayed.toFixed(decimals);

  return <span className={className}>{rendered}</span>;
}
