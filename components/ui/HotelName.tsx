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
      className={`inline-flex items-center gap-1.5 hover:underline transition-colors ${className}`}
      title={`Open ${hotelName} details in SETTHub`}
    >
      {hotelName}
      {showIcon && <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity" />}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}
