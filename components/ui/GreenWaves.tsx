/**
 * Green Wave / Flow Lines — SETT Brand Guidelines §8.1
 *
 * Flowing green wave lines (SVG) as subtle background accents.
 * Use sparingly on hero sections for premium feel.
 */
export function GreenWaves({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 150 Q100 50 200 150 T400 150"
        stroke="#AAC737"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M0 180 Q100 80 200 180 T400 180"
        stroke="#AAC737"
        strokeWidth="1"
        opacity="0.3"
      />
      <path
        d="M0 210 Q100 110 200 210 T400 210"
        stroke="#c8e050"
        strokeWidth="0.8"
        opacity="0.2"
      />
    </svg>
  );
}
