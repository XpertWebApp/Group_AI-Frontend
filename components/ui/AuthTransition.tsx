'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { GreenWaves } from '@/components/ui/GreenWaves';

/**
 * Full-screen navy curtain transition between the login page and the dashboard.
 *
 * Choreography (~1.4s total):
 *   1. Curtain slides in from the left (400ms), covering the form column.
 *   2. SETT logo + green check + "Welcome back, {name}" rises in (320ms).
 *   3. Pause for ~700ms so the brand moment lands.
 *   4. Curtain fades out (300ms) revealing the dashboard underneath.
 *
 * The component is purely visual. The parent owns the lifecycle:
 *   - mount when login succeeds (right after `dispatch(setUser(...))`)
 *   - call `onComplete` ~1.4s later — that's when the parent should `router.push('/dashboard')`
 *   - parent unmounts the transition once it's no longer needed
 *
 * Honors `prefers-reduced-motion`: animations are gated globally in globals.css.
 * With reduced motion the curtain still appears full-screen but without the
 * slide/rise/fade motion, so the user gets a static "you're being signed in"
 * card instead of a brittle animation.
 */
interface AuthTransitionProps {
  userName?: string | null;
  welcomeText: string;       // e.g. "Welcome back" — localised by parent
  signingInText: string;     // e.g. "Signing you in…" — localised by parent
  onComplete?: () => void;
  /** Total duration before onComplete fires. Default 1400ms. */
  durationMs?: number;
  /**
   * Scope of the curtain:
   *  - `'form'`  → absolutely positioned, fills the nearest positioned ancestor
   *               (the auth form column). The brand navy hero remains visible
   *               on the left. Recommended for the auth-form context.
   *  - `'full'`  → fixed full-viewport overlay. Use for cases where the curtain
   *               needs to cover the entire screen (e.g. logout transitions).
   */
  cover?: 'form' | 'full';
}

export function AuthTransition({
  userName,
  welcomeText,
  signingInText,
  onComplete,
  durationMs = 1400,
  cover = 'form',
}: AuthTransitionProps) {
  useEffect(() => {
    if (!onComplete) return;
    const t = setTimeout(onComplete, durationMs);
    return () => clearTimeout(t);
  }, [onComplete, durationMs]);

  const positioning =
    cover === 'full'
      ? 'fixed inset-0 z-[100]'
      // Form-scoped: absolutely fills the nearest positioned ancestor.
      // FormColumn's <main> is `relative`, so the curtain naturally covers the
      // entire right column without spilling over the brand hero on the left.
      : 'absolute inset-0 z-[100]';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${positioning} flex items-center justify-center bg-sett-navy overflow-hidden animate-curtain-slide-in`}
    >
      {/* §8.3 brand gradient under the curtain — same one used on the login hero
          so the visual language carries through. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, #071c42 0%, #0d2b5e 50%, #071c42 100%)',
        }}
      />

      {/* Brand decoration — single subtle wave behind the centre block */}
      <GreenWaves
        variant="bold"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[420px] opacity-60 pointer-events-none rotate-[-6deg] hidden sm:block"
      />

      {/* Centre block — logo + welcome */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6 animate-welcome-rise"
        style={{ animationDelay: '320ms' }}
      >
        <Image
          src="/icons/sett_logo.svg"
          alt="SETT Hub"
          width={160}
          height={56}
          className="h-14 w-auto brightness-110 mb-6"
          priority
        />

        {/* Green check + welcome line */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sett-primary text-sett-navy">
            <Check className="w-4 h-4" strokeWidth={3} />
          </span>
          <p className="font-montserrat text-[18px] sm:text-[20px] font-extrabold text-white tracking-tight">
            {welcomeText}
            {userName ? `, ${userName}` : ''}
          </p>
        </div>

        <p className="mt-3 font-montserrat text-[13px] font-medium text-white/65 tracking-wide">
          {signingInText}
        </p>

        {/* Subtle brand-green dot pulse — signals "we're working" */}
        <div className="mt-5 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-sett-primary/70 animate-pulse"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>

      {/* §8.2 green anchor strip — matches the brand's signature 8px bar */}
      <div aria-hidden className="absolute bottom-0 left-0 w-full h-[8px] bg-sett-primary" />
    </div>
  );
}
