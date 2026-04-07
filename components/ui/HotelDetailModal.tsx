'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Mail, Phone, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { hotelsApi } from '@/lib/api/hotels';
import type { HotelDetail } from '@/lib/api/hotels';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils/cn';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

// Module-level cache so the same hotel isn't re-fetched on re-renders
const detailCache = new Map<string, HotelDetail>();

function imageUrl(keyOrUrl: string): string {
  if (keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/api/')) return keyOrUrl;
  return `${API_BASE}/hotels/image?key=${keyOrUrl}`;
}

const PLACEHOLDER = '/icons/placeholder-hotel.svg';

/* ─── Skeleton shimmer ─── */
function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-gray-200', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

/* ─── Lazy image with shimmer + fade-in ─── */
function LazyImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  // Reset whenever the URL changes (e.g. navigating between hero images)
  useEffect(() => { setLoaded(false); }, [src]);

  return (
    <div className="relative w-full h-full">
      {!loaded && <ImageSkeleton className="absolute inset-0 rounded-inherit" />}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          className,
          'transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          (e.target as HTMLImageElement).src = PLACEHOLDER;
          setLoaded(true);
        }}
      />
    </div>
  );
}

interface HotelDetailModalProps {
  hotelCode: string;
  hotelName: string;
  onClose: () => void;
}

export function HotelDetailModal({ hotelCode, hotelName, onClose }: HotelDetailModalProps) {
  const { t } = useLanguage();
  const [detail, setDetail] = useState<HotelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Serve from cache if already fetched
    if (detailCache.has(hotelCode)) {
      setDetail(detailCache.get(hotelCode)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    hotelsApi
      .getDetails(hotelCode)
      .then((d) => {
        if (!cancelled) {
          detailCache.set(hotelCode, d);
          setDetail(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [hotelCode]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const images = detail?.images?.length ? detail.images : [];
  const heroSrc = images.length > 0 ? imageUrl(images[activeImage]) : PLACEHOLDER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-[14px] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sett-border-light shrink-0">
          <h2 className="font-montserrat text-[16px] font-semibold text-sett-text-primary truncate pr-4">
            {detail?.name ?? hotelName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F7F7F7] transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-sett-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div
          className="overflow-y-auto flex-1 px-6 py-5 space-y-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 font-montserrat text-[14px] text-sett-text-secondary">
                {t.addHotel.loadingDetails}
              </span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center py-16">
              <span className="font-montserrat text-[14px] text-sett-text-secondary">
                {t.addHotel.detailsError}
              </span>
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="space-y-2">
                  {/* Hero image */}
                  <div className="relative w-full h-[220px] sm:h-[300px] rounded-[14px] overflow-hidden bg-[#F7F7F7]">
                    <LazyImage
                      src={heroSrc}
                      alt={detail.name}
                      eager
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                        <span className="absolute bottom-2 right-3 bg-black/40 text-white text-[11px] font-medium px-2 py-0.5 rounded-full font-montserrat">
                          {activeImage + 1} / {images.length}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                      {images.map((key, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveImage(i)}
                          className={cn(
                            'shrink-0 w-16 h-16 rounded-[8px] overflow-hidden border-2 transition-colors',
                            i === activeImage ? 'border-sett-primary' : 'border-transparent hover:border-sett-border-light'
                          )}
                        >
                          <LazyImage
                            src={imageUrl(key)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Info row: stars + address + contact */}
              <div className="space-y-2">
                {/* Stars */}
                {detail.starRating && detail.starRating > 0 && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.round(detail.starRating) }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-sett-primary text-sett-primary" />
                    ))}
                  </div>
                )}

                {/* Short location summary */}
                {detail.location && (
                  <p className="font-montserrat text-[13px] text-sett-text-secondary italic">
                    {detail.location}
                  </p>
                )}

                {/* Address */}
                {(detail.address || detail.addressCity || detail.addressCountry) && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-sett-text-accent shrink-0 mt-0.5" />
                    <span className="font-montserrat text-[13px] text-sett-text-secondary">
                      {[detail.address, detail.addressCity, detail.addressCountry]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}

                {/* Contact */}
                {(detail.email || detail.phone) && (
                  <div className="flex flex-wrap gap-4">
                    {detail.email && (
                      <a
                        href={`mailto:${detail.email}`}
                        className="flex items-center gap-1.5 font-montserrat text-[13px] text-sett-primary hover:underline"
                      >
                        <Mail className="w-4 h-4" />
                        {detail.email}
                      </a>
                    )}
                    {detail.phone && (
                      <a
                        href={`tel:${detail.phone}`}
                        className="flex items-center gap-1.5 font-montserrat text-[13px] text-sett-primary hover:underline"
                      >
                        <Phone className="w-4 h-4" />
                        {detail.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              {(detail.description || detail.location) && (
                <div>
                  <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary uppercase tracking-wide mb-2">
                    {t.addHotel.hotelDescription}
                  </h3>
                  {detail.description ? (
                    <div
                      className="font-montserrat text-[14px] text-sett-text-secondary leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: detail.description }}
                    />
                  ) : (
                    <p className="font-montserrat text-[14px] text-sett-text-secondary leading-relaxed">
                      {detail.location}
                    </p>
                  )}
                </div>
              )}

              {/* Facilities grouped by category */}
              {detail.hotelFacilities && detail.hotelFacilities.length > 0 && (
                <div>
                  <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary uppercase tracking-wide mb-3">
                    {t.addHotel.hotelFacilities}
                  </h3>
                  <div className="space-y-4">
                    {detail.hotelFacilities.map((group) => (
                      <div key={group.Category}>
                        <p className="font-montserrat text-[12px] font-semibold text-sett-text-accent uppercase tracking-wide mb-1.5">
                          {group.Category}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.Facilities.map((f) => (
                            <span
                              key={f}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sett-light-green-bg text-sett-primary border border-sett-primary/20"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
