'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Shimmer placeholder used while an image is still loading. Two layers:
 *  1. A muted base fill so the slot is visible immediately at the right size
 *  2. A diagonal highlight that sweeps across via the existing `@keyframes shimmer`
 *     (defined in globals.css — same effect used by the search-result skeletons)
 * Sits behind the actual <img> via z-0; the img fades over it on load.
 */
function ImageShimmer({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-white/[0.06]', className)} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}

const PLACEHOLDER = '/icons/placeholder-hotel.svg';

interface ImageLightboxProps {
  /** Single URL. Use for one-off images where no fallback chain exists. */
  src?: string;
  /** Ordered image list. When length > 1, the lightbox renders as a full carousel
   *  (arrows, thumbnail strip, counter, keyboard nav). When length === 1, behaves
   *  like a single-image viewer.
   */
  srcs?: string[];
  /** Index to open at (defaults to 0). Useful when the user clicks a specific
   *  thumbnail elsewhere and wants the lightbox to land on that frame. */
  initialIndex?: number;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, srcs, initialIndex = 0, alt, onClose }: ImageLightboxProps) {
  // Resolve the chain. Prefer `srcs` if provided; otherwise wrap `src`.
  const chain: string[] = useMemo(
    () => (srcs && srcs.length > 0 ? srcs : src ? [src] : []),
    [srcs, src],
  );

  // Track which indices have failed to load. Skipped during next/prev navigation
  // so the user never lands on a broken image. If every index fails, fall back
  // to the placeholder.
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [idx, setIdx] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(chain.length - 1, 0)));
  const thumbScrollerRef = useRef<HTMLDivElement>(null);

  const total = chain.length;
  const showCarousel = total > 1;

  // Find the next non-failed index in a given direction.
  const advance = useCallback(
    (dir: 1 | -1) => {
      if (total === 0) return;
      let next = idx;
      for (let attempts = 0; attempts < total; attempts++) {
        next = (next + dir + total) % total;
        if (!failed.has(next)) {
          setIdx(next);
          return;
        }
      }
      // Every slide has failed — leave idx alone; render will fall back to placeholder.
    },
    [idx, failed, total],
  );

  // Keyboard: Esc closes, ← / → navigate
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (!showCarousel) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        advance(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        advance(-1);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, advance, showCarousel]);

  // Lock body scroll while open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Auto-scroll the active thumbnail into view when idx changes
  useEffect(() => {
    if (!thumbScrollerRef.current) return;
    const activeThumb = thumbScrollerRef.current.querySelector<HTMLElement>(`[data-thumb-idx="${idx}"]`);
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [idx]);

  const allFailed = total > 0 && failed.size >= total;
  const resolvedSrc = total === 0 || allFailed ? PLACEHOLDER : chain[idx];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Hotel image gallery"
    >
      {/* Top bar — counter + close */}
      <div className="flex items-center justify-between px-2 sm:px-4 pb-3 z-10">
        {showCarousel ? (
          <span className="font-montserrat text-[13px] font-semibold text-white/85 tabular-nums">
            {idx + 1} <span className="text-white/40">/</span> {total}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Image container */}
      <div
        className="flex-1 relative flex items-center justify-center min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prev arrow */}
        {showCarousel && (
          <button
            type="button"
            onClick={() => advance(-1)}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Active image — keyed by `idx` so the load-state + fade-in re-run on each navigation */}
        <HeroImage
          key={idx}
          src={resolvedSrc}
          alt={alt}
          onError={() => {
            // Mark this index as failed, then auto-skip to the next viable one.
            // Falls through to placeholder when every slide has failed.
            setFailed((prev) => {
              if (prev.has(idx)) return prev;
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            if (total > 1) advance(1);
          }}
        />

        {/* Next arrow */}
        {showCarousel && (
          <button
            type="button"
            onClick={() => advance(1)}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip — only when there's more than one image */}
      {showCarousel && (
        <div
          className="shrink-0 mt-3 pt-3 border-t border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={thumbScrollerRef}
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.25) transparent' }}
          >
            {chain.map((url, i) => (
              <Thumbnail
                key={i}
                url={url}
                index={i}
                isActive={i === idx}
                isFailed={failed.has(i)}
                onSelect={() => setIdx(i)}
                onFail={() =>
                  setFailed((prev) => {
                    if (prev.has(i)) return prev;
                    const next = new Set(prev);
                    next.add(i);
                    return next;
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Hero image — shimmer placeholder until the real image loads
 * ───────────────────────────────────────────────────────── */
function HeroImage({
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative max-w-full max-h-full inline-flex items-center justify-center">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[8px] overflow-hidden bg-white/[0.04]">
          <ImageShimmer className="rounded-[8px]" />
          <ImageIcon className="relative w-12 h-12 text-white/15" aria-hidden />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        decoding="async"
        className={cn(
          'max-w-full max-h-full object-contain rounded-[8px] shadow-2xl',
          'transition-opacity duration-300',
          loaded ? 'opacity-100 animate-modal-image-fade' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true); // hide the shimmer; parent will advance to next slide
          onError();
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 * Thumbnail — shimmer skeleton until the small image loads
 * ───────────────────────────────────────────────────────── */
function Thumbnail({
  url,
  index,
  isActive,
  isFailed,
  onSelect,
  onFail,
}: {
  url: string;
  index: number;
  isActive: boolean;
  isFailed: boolean;
  onSelect: () => void;
  onFail: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      data-thumb-idx={index}
      onClick={onSelect}
      disabled={isFailed}
      className={cn(
        'relative shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-[8px] overflow-hidden border-2 transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary',
        isActive
          ? 'border-sett-primary opacity-100 scale-105 shadow-[0_0_0_2px_rgba(170,199,55,0.25)]'
          : 'border-transparent opacity-60 hover:opacity-100 hover:border-white/40',
        isFailed && 'opacity-25 grayscale cursor-not-allowed pointer-events-none',
      )}
      aria-label={`Show image ${index + 1}`}
      aria-current={isActive ? 'true' : undefined}
    >
      {/* Shimmer placeholder until the thumb loads */}
      {!loaded && !isFailed && <ImageShimmer />}
      <img
        src={url}
        alt=""
        decoding="async"
        className={cn(
          'relative w-full h-full object-cover',
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true); // collapse the shimmer; parent marks this slot as failed
          onFail();
        }}
      />
    </button>
  );
}
