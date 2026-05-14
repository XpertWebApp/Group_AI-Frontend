'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const PLACEHOLDER = '/icons/placeholder-hotel.svg';

interface ImageLightboxProps {
  /** Single URL. Use for one-off images where no fallback chain exists. */
  src?: string;
  /** Ordered fallback chain (best → worst). Tried in order on <img> error. */
  srcs?: string[];
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, srcs, alt, onClose }: ImageLightboxProps) {
  // Resolve the active chain. Prefer `srcs` if provided; otherwise wrap `src`.
  const chain: string[] = srcs && srcs.length > 0 ? srcs : (src ? [src] : []);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // Prevent body scroll when lightbox is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const resolvedSrc = idx < chain.length ? chain[idx] : PLACEHOLDER;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full image view"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-70 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image container */}
      <div
        className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={resolvedSrc}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-[8px] shadow-2xl animate-in fade-in duration-300"
          onError={() => {
            // Try next URL in the chain. Final fallback is PLACEHOLDER (shown when idx >= chain.length).
            if (idx < chain.length) setIdx(idx + 1);
          }}
        />
      </div>
    </div>
  );
}
