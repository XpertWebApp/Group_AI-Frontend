'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Mail, Phone, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { hotelsApi } from '@/lib/api/hotels';
import type { HotelDetail } from '@/lib/api/hotels';
import { StarRating } from './StarRating';
import { HotelName } from './HotelName';
import { ModalOverlay } from './ModalOverlay';
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
  sethubDetailsUrl?: string | null;
  onClose: () => void;
}

export function HotelDetailModal({ hotelCode, hotelName, sethubDetailsUrl, onClose }: HotelDetailModalProps) {
  const { t, locale } = useLanguage();
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

  // Escape + body-scroll lock are handled by ModalOverlay; this effect now
  // just covers any extra key bindings (arrow keys etc) if added later.
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const images = detail?.images?.length ? detail.images : [];
  const heroSrc = images.length > 0 ? imageUrl(images[activeImage]) : PLACEHOLDER;

  // Locale-aware description pick (same shape as hotel cards). Falls back to
  // the other language, then the legacy single `description` field.
  const localizedDescription = detail?.descriptions?.[locale]
    ?? detail?.descriptions?.[locale === 'de' ? 'en' : 'de']
    ?? null;
  const descriptionText = localizedDescription?.text ?? detail?.description ?? null;
  const translationStale = localizedDescription?.isFallback === true;

  return (
    <ModalOverlay open onClose={onClose} className="p-4">
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-modal-pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: 8, // §5.3 panel
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* §5.3 emphasis accent — 3px green strip at top */}
        <div aria-hidden className="h-[3px] w-full bg-sett-primary shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0] shrink-0">
          {/* §3 H3 — navy bold 18–20px */}
          <h2 className="font-montserrat text-[18px] font-bold leading-tight text-sett-navy truncate pr-4">
            {sethubDetailsUrl ? (
              <HotelName
                hotel={{ hotelName: detail?.name ?? hotelName, sethubDetailsUrl }}
                className="text-sett-navy"
              />
            ) : (
              detail?.name ?? hotelName
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F8F9FA] text-sett-grey hover:text-sett-navy transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="overflow-y-auto flex-1 px-6 py-5 space-y-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >
          {loading && (
            <div className="flex items-center justify-center py-16 animate-card-rise-in">
              <div className="relative inline-flex items-center justify-center">
                <span className="absolute w-10 h-10 rounded-full border border-sett-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative w-6 h-6 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="ml-3 font-montserrat text-[14px] text-sett-text-secondary">
                {t.addHotel.loadingDetails}
              </span>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center py-16 animate-card-rise-in">
              <span className="font-montserrat text-[14px] text-sett-text-secondary">
                {t.addHotel.detailsError}
              </span>
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="space-y-2 animate-card-rise-in" style={{ animationDelay: '60ms' }}>
                  {/* Hero image */}
                  <div className="relative w-full h-[220px] sm:h-[300px] rounded-[14px] overflow-hidden bg-[#F7F7F7]">
                    <div key={activeImage} className="absolute inset-0 animate-modal-image-fade">
                      <LazyImage
                        src={heroSrc}
                        alt={detail.name}
                        eager
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
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
                            'shrink-0 w-16 h-16 rounded-[8px] overflow-hidden border-2 transition-all duration-200 animate-sidebar-fade-up',
                            i === activeImage
                              ? 'border-sett-primary scale-105'
                              : 'border-transparent hover:border-sett-border-light hover:scale-105'
                          )}
                          style={{ animationDelay: `${120 + i * 40}ms` }}
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
              <div className="space-y-2 animate-card-rise-in" style={{ animationDelay: '140ms' }}>
                {/* Stars */}
                {detail.starRating && detail.starRating > 0 && (
                  <StarRating rating={detail.starRating} />
                )}

                {/* `detail.location` is intentionally NOT rendered here:
                    the backend often populates it with the full English
                    description text, which then showed up duplicated above
                    the localized "Description" block below. The proper
                    description (with EN ↔ DE switching) is rendered in its
                    own section further down via `descriptionText`. */}

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

              {/* Description — reads descriptions[locale] from the multi-lang
                  payload. Switching EN↔DE re-renders this without a new API
                  call. Falls back to the legacy single `detail.description`
                  field for hotels synced before the multi-lang payload landed. */}
              {descriptionText && (
                <div className="animate-card-rise-in" style={{ animationDelay: '220ms' }}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary uppercase tracking-wide">
                      {t.addHotel.hotelDescription}
                    </h3>
                    {translationStale && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-sett-fill text-sett-text-accent border border-sett-border-light"
                        title={t.addHotel.translationUnavailableTooltip}
                      >
                        {t.addHotel.translationUnavailable}
                      </span>
                    )}
                  </div>
                  <div
                    className="font-montserrat text-[14px] text-sett-text-secondary leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: descriptionText }}
                  />
                </div>
              )}

              {/* Facilities grouped by category — category labels and chip
                  labels both run through the i18n dictionaries so EN ↔ DE
                  toggles instantly without re-calling the backend. Unknown
                  GIATA strings fall back to the original text. */}
              {detail.hotelFacilities && detail.hotelFacilities.length > 0 && (
                <div className="animate-card-rise-in" style={{ animationDelay: '300ms' }}>
                  <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary uppercase tracking-wide mb-3">
                    {t.addHotel.hotelFacilities}
                  </h3>
                  <div className="space-y-4">
                    {detail.hotelFacilities.map((group, groupIdx) => {
                      const categoryLabel =
                        t.addHotel.facilityCategoryNames?.[group.Category.toLowerCase().trim()]
                          ?? group.Category;
                      return (
                        <div key={group.Category}>
                          <p className="font-montserrat text-[12px] font-semibold text-sett-text-accent uppercase tracking-wide mb-1.5">
                            {categoryLabel}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.Facilities.map((f, fIdx) => {
                              const facilityLabel =
                                t.addHotel.facilityNames?.[f.toLowerCase().trim()] ?? f;
                              return (
                                <span
                                  key={f}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sett-light-green-bg text-sett-primary border border-sett-primary/20 animate-badge-pop-in transition-transform hover:scale-105"
                                  style={{ animationDelay: `${340 + groupIdx * 60 + fIdx * 20}ms` }}
                                >
                                  {facilityLabel}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
