'use client';

import { ExternalLink } from 'lucide-react';

interface HotelData {
  hotelName: string;
  sethubDetailsUrl?: string | null;
}

interface HotelNameProps {
  hotel: HotelData;
  className?: string;
  showIcon?: boolean;
  /** When true, the name renders on a single line with ellipsis on overflow
   *  instead of wrapping (break-words). Use in tight chrome — e.g. the
   *  hotel-card navy header on the Request Summary page where break-words
   *  caused character-per-line wrapping at narrow widths. The full name is
   *  surfaced via the existing native `title` attribute on hover. */
  truncate?: boolean;
}

export function HotelName({ hotel, className = '', showIcon = true, truncate = false }: HotelNameProps) {
  const { hotelName, sethubDetailsUrl } = hotel;
  // Width-overflow behaviour: by default the name wraps at word boundaries
  // (good for long descriptions in a result card). When `truncate` is set
  // it renders on a single line with ellipsis — used inside tight chrome
  // like the request-summary card's navy header.
  const wrapBehavior = truncate
    ? 'whitespace-nowrap overflow-hidden text-ellipsis'
    : 'break-words';

  if (!sethubDetailsUrl) {
    return (
      <span
        className={`${wrapBehavior} block max-w-full ${className}`}
        title={truncate ? hotelName : undefined}
      >
        {hotelName}
      </span>
    );
  }

  return (
    <a
      href={sethubDetailsUrl}
      target="_blank"
      rel="noopener noreferrer"
      // inline-flex without min-w-0 + negative margins used to push the bounding
      // box past the parent on narrow viewports, causing long DE CTA labels to
      // overlap the title. Switched to a regular inline flow + max-w-full so the
      // anchor honors the parent's clip region and the title text wraps cleanly.
      className={`
        inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5
        max-w-full min-w-0 align-baseline ${wrapBehavior}
        text-sett-primary hover:text-sett-primary-hover active:text-sett-primary-active
        hover:bg-sett-primary/5 active:bg-sett-primary/10
        transition-all duration-200 ease-out
        focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sett-primary
        group
        ${className}
      `}
      title={`Open ${hotelName} details in SETTHub (opens in new tab)`}
    >
      <span className={`font-medium underline-offset-2 group-hover:underline min-w-0 ${wrapBehavior}`}>
        {hotelName}
      </span>
      {showIcon && (
        <ExternalLink className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
      )}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}
