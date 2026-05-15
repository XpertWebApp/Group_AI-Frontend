'use client';

/**
 * Green Wave / Flow Lines — SETT Brand Guidelines §8.1
 *
 * Flowing green wave lines (SVG) as subtle background accents.
 * Use sparingly on hero sections for premium feel.
 *
 * Variants:
 *  - `subtle` (default) — thin strokes (1.5 / 1 / 0.8 px), low opacities.
 *    Use as background ambience under content.
 *  - `bold` — heavier strokes (3 / 2 / 1.5 px), brighter opacities. Use when
 *    the waves are the design's signature gesture rather than ambience
 *    (e.g. the login page's hero "brand mark sweep").
 *
 * Animation:
 *  1. On mount, each base path strokes itself in (left → right) over ~1.6s,
 *     with a 200ms cascade between paths. Feels like the brand mark is being drawn.
 *  2. Once drawn, a brighter "shimmer" path overlays each wave and travels
 *     along its curve on a slow loop (8s / 12s / 16s — varied so they never
 *     sync). The shimmer is implemented as a single short dash that animates
 *     its stroke-dashoffset, so the highlight follows the wave's natural curve.
 *  3. Honors `prefers-reduced-motion` (animations disabled, paths shown statically).
 */

interface GreenWavesProps {
  className?: string;
  variant?: 'subtle' | 'bold';
}

export function GreenWaves({ className, variant = 'subtle' }: GreenWavesProps) {
  // Approximate path length — slightly larger than the actual measured length so
  // the dash hides the stroke completely at offset = length. ~900 covers a
  // 400-wide viewBox path with comfortable headroom for any path roundness.
  const PATH_LENGTH = 900;
  const isBold = variant === 'bold';

  // Per-variant stroke + opacity tuning. The path geometry is identical between
  // variants so the animation timing stays consistent.
  const cfg = isBold
    ? {
        l1Stroke: 3,
        l1Opacity: 0.7,
        l1ShimmerStroke: 4,
        l1ShimmerOpacity: 0.95,
        l2Stroke: 2,
        l2Opacity: 0.55,
        l2ShimmerStroke: 3,
        l2ShimmerOpacity: 0.8,
        l3Stroke: 1.5,
        l3Opacity: 0.4,
        l3ShimmerStroke: 2.5,
        l3ShimmerOpacity: 0.7,
      }
    : {
        l1Stroke: 1.5,
        l1Opacity: 0.4,
        l1ShimmerStroke: 2.5,
        l1ShimmerOpacity: 0.7,
        l2Stroke: 1,
        l2Opacity: 0.3,
        l2ShimmerStroke: 2,
        l2ShimmerOpacity: 0.55,
        l3Stroke: 0.8,
        l3Opacity: 0.2,
        l3ShimmerStroke: 1.5,
        l3ShimmerOpacity: 0.45,
      };

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* ── Layer 1 — primary wave ── */}
      <path
        d="M0 150 Q100 50 200 150 T400 150"
        stroke="#AAC737"
        strokeWidth={cfg.l1Stroke}
        opacity={cfg.l1Opacity}
        className="sett-wave-draw"
        style={{
          strokeDasharray: PATH_LENGTH,
          strokeDashoffset: PATH_LENGTH,
          animationDelay: '0ms',
        }}
      />
      {/* Shimmer — a short bright dash that travels along the path */}
      <path
        d="M0 150 Q100 50 200 150 T400 150"
        stroke="#c8e050"
        strokeWidth={cfg.l1ShimmerStroke}
        strokeLinecap="round"
        opacity={cfg.l1ShimmerOpacity}
        className="sett-wave-shimmer sett-wave-shimmer--slow"
        style={{ animationDelay: '1800ms' }}
      />

      {/* ── Layer 2 — secondary wave ── */}
      <path
        d="M0 180 Q100 80 200 180 T400 180"
        stroke="#AAC737"
        strokeWidth={cfg.l2Stroke}
        opacity={cfg.l2Opacity}
        className="sett-wave-draw"
        style={{
          strokeDasharray: PATH_LENGTH,
          strokeDashoffset: PATH_LENGTH,
          animationDelay: '200ms',
        }}
      />
      <path
        d="M0 180 Q100 80 200 180 T400 180"
        stroke="#c8e050"
        strokeWidth={cfg.l2ShimmerStroke}
        strokeLinecap="round"
        opacity={cfg.l2ShimmerOpacity}
        className="sett-wave-shimmer sett-wave-shimmer--medium"
        style={{ animationDelay: '2400ms' }}
      />

      {/* ── Layer 3 — tertiary wave ── */}
      <path
        d="M0 210 Q100 110 200 210 T400 210"
        stroke="#c8e050"
        strokeWidth={cfg.l3Stroke}
        opacity={cfg.l3Opacity}
        className="sett-wave-draw"
        style={{
          strokeDasharray: PATH_LENGTH,
          strokeDashoffset: PATH_LENGTH,
          animationDelay: '400ms',
        }}
      />
      <path
        d="M0 210 Q100 110 200 210 T400 210"
        stroke="#AAC737"
        strokeWidth={cfg.l3ShimmerStroke}
        strokeLinecap="round"
        opacity={cfg.l3ShimmerOpacity}
        className="sett-wave-shimmer sett-wave-shimmer--fast"
        style={{ animationDelay: '3000ms' }}
      />
    </svg>
  );
}
