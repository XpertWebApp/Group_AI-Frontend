'use client';

import Image from 'next/image';
import { GreenWaves } from '@/components/ui/GreenWaves';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { LanguageProvider, useLanguage } from '@/lib/i18n/LanguageContext';

/**
 * Auth shell — two-column brand split per SETT Brand Guidelines.
 *
 *  • Left (lg+):   navy hero with the SETT brand identity, tagline, and value props.
 *                  Uses §2 dark-page rules (navy bg + white text + green accents)
 *                  and §8.1 green wave decorations.
 *  • Right (lg+):  light-background form column. Uses §2 light-page rules
 *                  (white bg + navy text + green accents). Hosts whatever page
 *                  content the route renders.
 *  • Mobile:       hero collapses to a slim navy band at the top; form fills below.
 *  • Bottom:       §8.2 green anchor bar (full-width 8px).
 *  • Top-right:    language toggle (sits over the form column).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="relative min-h-screen w-full flex flex-col bg-white overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <BrandHeroColumn />
          <FormColumn>{children}</FormColumn>
        </div>
        {/* §8.2 Green Bottom Bar — the brand's visual anchor */}
        <div aria-hidden className="w-full h-[8px] bg-sett-primary shrink-0" />
      </div>
    </LanguageProvider>
  );
}

/* ─────────────────────────────────────────────────────────
 * Left column — brand hero (navy, white H1, green waves)
 * ───────────────────────────────────────────────────────── */
function BrandHeroColumn() {
  const { t } = useLanguage();
  return (
    <aside
      className="relative bg-sett-navy text-white overflow-hidden shrink-0
                 lg:w-[44%] lg:min-h-screen
                 px-6 py-8 lg:px-14 lg:py-12
                 flex flex-col justify-between"
    >
      {/* Layer 1 — gradient backdrop (z-0).
          Per §8.3, the navy hero uses a 135° gradient for depth. Pinned behind
          the wave decorations so they can read against it. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #071c42 0%, #0d2b5e 50%, #071c42 100%)',
        }}
      />

      {/* Layer 2 — radial spotlight (z-0).
          A soft green-tinted spotlight emanating from the top-right corner. Makes
          the logo + H1 feel "illuminated" rather than floating on a flat surface.
          Brand-correct because the tint comes from sett-primary at 8% alpha. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none hidden lg:block"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 85% 25%, rgba(170,199,55,0.10) 0%, rgba(170,199,55,0) 70%)',
        }}
      />

      {/* Layer 3 — Signature hero wave (z-[1]).
          The dominant brand gesture. Sweeps diagonally across the upper-right
          quadrant behind the H1 tagline. Uses the `bold` variant for heavier
          strokes that read clearly against the gradient backdrop. */}
      <GreenWaves
        variant="bold"
        className="absolute -top-20 -right-32 w-[680px] h-[340px] opacity-80 rotate-[18deg] pointer-events-none z-[1] hidden lg:block"
      />

      {/* Layer 4 — Mid-band wave (z-[1]).
          Fills the visual gap between the H1 block and the stats list. Pulled
          partly off the right edge so it reads as "the brand is flowing across,
          not contained inside." Counter-rotated to the signature wave so the
          two create rhythm instead of stacking. */}
      <GreenWaves
        className="absolute top-[45%] -right-40 w-[620px] h-[260px] opacity-55 -rotate-[8deg] pointer-events-none z-[1] hidden lg:block"
      />

      {/* Layer 5 — Lower-left whisper wave (z-[1]).
          Pulled mostly off-screen-left so it reads as "passing through" the hero.
          Anchors the stats list without crowding it. */}
      <GreenWaves
        className="absolute bottom-32 -left-48 w-[640px] h-[260px] opacity-50 -rotate-[6deg] pointer-events-none z-[1] hidden lg:block"
      />

      {/* Layer 6 — Bottom-edge horizontal whisper (z-[1]).
          Very low-opacity full-width band at the very bottom — visually links
          into the §8.2 green bar at the page base. "The brand keeps flowing." */}
      <GreenWaves
        className="absolute -bottom-8 left-0 w-full h-[180px] opacity-40 pointer-events-none z-[1] hidden lg:block"
      />

      {/* Logo (top) */}
      <div className="relative z-10 flex items-center gap-3 animate-sidebar-fade-up">
        <Image
          src="/icons/sett_logo.svg"
          alt="SETT Hub"
          width={120}
          height={40}
          className="h-10 w-auto lg:h-12 brightness-110"
          priority
        />
      </div>

      {/* Eyebrow — "Since 1989 · Privately Owned" establishes credibility before the manifesto */}
      <div
        className="relative z-10 hidden lg:flex items-center gap-3 mt-12 animate-sidebar-fade-up"
        style={{ animationDelay: '100ms' }}
      >
        <span aria-hidden className="block h-px w-10 bg-sett-primary/70" />
        <span className="font-montserrat text-[12px] font-semibold tracking-[0.18em] uppercase text-sett-primary">
          {t.login.eyebrow}
        </span>
      </div>

      {/* Hero manifesto — two-line statement, brand voice §1.
          Line 1 in white/85 sets up; line 2 in solid white delivers the punch. */}
      <div className="relative z-10 hidden lg:block mt-6 max-w-xl">
        <h1
          className="font-montserrat text-[34px] xl:text-[42px] font-extrabold leading-[1.1] tracking-tight animate-sidebar-fade-up"
          style={{ animationDelay: '180ms' }}
        >
          <span className="block text-white/80">{t.login.heroTitleLine1}</span>
          <span
            className="block text-white animate-sidebar-fade-up"
            style={{ animationDelay: '280ms' }}
          >
            {t.login.heroTitleLine2}
          </span>
        </h1>
        <p
          className="mt-6 font-montserrat text-[15px] font-normal leading-relaxed text-white/70 max-w-lg animate-sidebar-fade-up"
          style={{ animationDelay: '380ms' }}
        >
          {t.login.heroSubtitle}
        </p>

        {/* Headline stats — bigger, more concrete inventory numbers. */}
        <ul className="mt-10 grid grid-cols-3 gap-6 max-w-lg">
          {[
            { stat: '2.7M', label: t.login.statHotels, delay: 480 },
            { stat: '700+', label: t.login.statChannelManagers, delay: 560 },
            { stat: '360', label: t.login.statBedBanks, delay: 640 },
          ].map((row) => (
            <li
              key={row.stat}
              className="flex flex-col gap-1.5 animate-sidebar-fade-up"
              style={{ animationDelay: `${row.delay}ms` }}
            >
              <span className="font-montserrat text-[28px] xl:text-[32px] font-extrabold text-sett-primary leading-none tabular-nums">
                {row.stat}
              </span>
              <span className="font-montserrat text-[12px] font-medium text-white/70 leading-snug">
                {row.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom legal block — only visible on lg.
          The supplier ticker line sits above the confidentiality footer, in
          muted white with green dot-separators — adds depth without crowding. */}
      <div
        className="relative z-10 hidden lg:block mt-auto animate-sidebar-fade-up"
        style={{ animationDelay: '760ms' }}
      >
        <p className="font-montserrat text-[11px] font-medium text-white/55 leading-snug max-w-2xl">
          {t.login.heroTicker.split('  ·  ').map((part, i, arr) => (
            <span key={part} className="inline-block">
              {part}
              {i < arr.length - 1 && (
                <span aria-hidden className="inline-block mx-2 text-sett-primary/70">·</span>
              )}
            </span>
          ))}
        </p>
        <div className="mt-3 h-px w-16 bg-white/10" aria-hidden />
        <p className="mt-3 font-montserrat text-[11px] font-normal text-white/40">
          © 2026 S-E-T-T &nbsp;·&nbsp; {t.login.confidential}
        </p>
      </div>

      {/* Mobile: compact stacked logo only (tagline hidden) */}
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────
 * Right column — form area + language toggle (top right)
 * ───────────────────────────────────────────────────────── */
function FormColumn({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex-1 flex flex-col bg-white">
      {/* Language toggle — top right of form column */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageToggle variant="light" />
      </div>
      {/* Form content centered vertically + horizontally */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-md animate-card-rise-in">
          {children}
        </div>
      </div>
    </main>
  );
}
