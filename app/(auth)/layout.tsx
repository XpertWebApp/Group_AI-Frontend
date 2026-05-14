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
      {/* Decorative waves — top corner accent + bottom flowing band.
          Sits behind the content via z-0; content is z-10. */}
      <GreenWaves
        className="absolute -top-10 -right-10 w-[480px] h-[260px] opacity-50 rotate-[12deg] pointer-events-none hidden lg:block"
      />
      <GreenWaves
        className="absolute bottom-0 left-0 w-full h-[340px] opacity-60 pointer-events-none hidden lg:block"
      />
      {/* Subtle background gradient per §8.3 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #071c42 0%, #0d2b5e 50%, #071c42 100%)',
        }}
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

      {/* Tagline + stats (centre/bottom on lg, hidden on small for compactness) */}
      <div className="relative z-10 hidden lg:block mt-auto">
        <h1
          className="font-montserrat text-[32px] xl:text-[36px] font-extrabold leading-[1.15] text-white max-w-md animate-sidebar-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          {t.login.heroTitle}
        </h1>
        <p
          className="mt-4 font-montserrat text-[15px] font-normal leading-relaxed text-white/75 max-w-md animate-sidebar-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          {t.login.heroSubtitle}
        </p>

        {/* Brand stats — confident B2B positioning per brand guide §1 */}
        <ul className="mt-10 space-y-3 max-w-md">
          {[
            { stat: '12,000+', label: t.login.statAgencies, delay: 320 },
            { stat: '195', label: t.login.statCountries, delay: 400 },
            { stat: '24H', label: t.login.statResponse, delay: 480 },
          ].map((row) => (
            <li
              key={row.stat}
              className="flex items-baseline gap-3 animate-sidebar-fade-up"
              style={{ animationDelay: `${row.delay}ms` }}
            >
              <span className="font-montserrat text-[20px] font-extrabold text-sett-primary tabular-nums shrink-0 min-w-[78px]">
                {row.stat}
              </span>
              <span className="font-montserrat text-[14px] font-normal text-white/85">
                {row.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom legal — only visible on lg */}
      <div
        className="relative z-10 hidden lg:block mt-8 animate-sidebar-fade-up"
        style={{ animationDelay: '600ms' }}
      >
        <p className="font-montserrat text-[11px] font-normal text-white/45">
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
