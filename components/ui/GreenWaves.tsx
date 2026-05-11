'use client';

/**
 * Green Wave / Flow Lines — SETT Brand Guidelines §8.1
 *
 * Flowing green wave lines (SVG) as subtle background accents.
 * Use sparingly on hero sections for premium feel.
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
export function GreenWaves({ className }: { className?: string }) {
  // Approximate path length — slightly larger than the actual measured length so
  // the dash hides the stroke completely at offset = length. ~900 covers a
  // 400-wide viewBox path with comfortable headroom for any path roundness.
  const PATH_LENGTH = 900;

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
        strokeWidth="1.5"
        opacity="0.4"
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
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
        className="sett-wave-shimmer sett-wave-shimmer--slow"
        style={{ animationDelay: '1800ms' }}
      />

      {/* ── Layer 2 — secondary wave ── */}
      <path
        d="M0 180 Q100 80 200 180 T400 180"
        stroke="#AAC737"
        strokeWidth="1"
        opacity="0.3"
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
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
        className="sett-wave-shimmer sett-wave-shimmer--medium"
        style={{ animationDelay: '2400ms' }}
      />

      {/* ── Layer 3 — tertiary wave ── */}
      <path
        d="M0 210 Q100 110 200 210 T400 210"
        stroke="#c8e050"
        strokeWidth="0.8"
        opacity="0.2"
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
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
        className="sett-wave-shimmer sett-wave-shimmer--fast"
        style={{ animationDelay: '3000ms' }}
      />
    </svg>
  );
}
