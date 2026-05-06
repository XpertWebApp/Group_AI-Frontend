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
}

export function HotelName({ hotel, className = '', showIcon = true }: HotelNameProps) {
  const { hotelName, sethubDetailsUrl } = hotel;

  if (!sethubDetailsUrl) {
    return <span className={className}>{hotelName}</span>;
  }

  return (
    <a
      href={sethubDetailsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center gap-2 rounded-md px-2 py-1 -mx-2 -my-1
        text-sett-primary hover:text-sett-primary-hover active:text-sett-primary-active
        hover:bg-sett-primary/5 active:bg-sett-primary/10
        transition-all duration-200 ease-out
        focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sett-primary
        group
        ${className}
      `}
      title={`Open ${hotelName} details in SETTHub (opens in new tab)`}
    >
      <span className="font-medium underline-offset-2 group-hover:underline">
        {hotelName}
      </span>
      {showIcon && (
        <ExternalLink className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
      )}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}
