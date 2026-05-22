'use client';

/**
 * Shared overlay container for every modal in the app.
 *
 * Why this exists: any modal whose root element lives inside the React tree
 * (i.e. mounted from a page or another component) can have its `position:
 * fixed inset-0` clipped by an ancestor stacking context (transform, filter,
 * sticky header, etc). The visible symptom is the dark backdrop "missing"
 * over the page header / sidebar — the modal renders, but the overlay
 * doesn't actually cover the viewport.
 *
 * This component handles the cross-cutting concerns for every modal:
 *  - Portals the entire overlay into `document.body` so it escapes any
 *    ancestor stacking context.
 *  - Locks a consistent z-index above the sidebar (z-40) and page header
 *    (z-30).
 *  - Provides the dark `bg-black/60` backdrop with optional click-to-close.
 *  - Centers the panel and applies the standard overlay fade-in animation.
 *  - Locks `document.body` scroll while open.
 *  - Closes on Escape (toggleable).
 *
 * Every modal in the app should wrap its panel in this. If you need an
 * exception, justify it in a comment.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

interface ModalOverlayProps {
  /** Whether the modal is open. Returns null when false. */
  open: boolean;
  /** Called when the user clicks the backdrop or presses Escape (if enabled). */
  onClose?: () => void;
  /** The modal panel and its children. Centered inside the overlay. */
  children: React.ReactNode;
  /** Additional class names on the outermost overlay element (rare). */
  className?: string;
  /** Disable closing via backdrop click. Default: closes on backdrop click. */
  closeOnBackdropClick?: boolean;
  /** Disable closing via Escape key. Default: closes on Escape. */
  closeOnEscape?: boolean;
  /** ARIA labelledby for the dialog. Set to your modal's title element id. */
  labelledBy?: string;
  /** Higher z-index for nested modals over other modals (rare). */
  z?: 'default' | 'high';
}

export function ModalOverlay({
  open,
  onClose,
  children,
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  labelledBy,
  z = 'default',
}: ModalOverlayProps) {
  // Body-scroll lock while the overlay is mounted.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape-to-close.
  useEffect(() => {
    if (!open || !closeOnEscape || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const zClass = z === 'high' ? 'z-[110]' : 'z-[100]';

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-black/60 animate-modal-overlay-in',
        zClass,
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={(e) => {
        // Only close when the click hit the backdrop itself, not bubbled
        // from inside the panel.
        if (!closeOnBackdropClick || !onClose) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
