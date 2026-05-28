'use client';

import { X } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { cn } from '@/lib/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Base Modal — brand-spec aligned shell used by ConfirmModal, SuccessModal,
 * NotificationsModal, and AddHotelModal. Applies SETT Hub Brand Guidelines
 * v2 tokens (§5.3 panels) consistently so every confirmation/info dialog in
 * the app has the same chrome.
 *
 * Key brand decisions baked in:
 *   - 8px radius (not 14) — §5.3 panels
 *   - 1px #E0E0E0 border (not 2px shadowy borders) — §5.3
 *   - Subtle 0 2px 8px shadow (not heavy modal shadow) — §5.3
 *   - 3px green top accent bar — §5.3 emphasis accent
 *   - Navy 700 title (was generic text-heading-sm) — §3 H3
 *   - Uppercase close-button hover bg from neutral #F8F9FA — §5
 */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <ModalOverlay open={open} onClose={onClose} labelledBy="modalTitle" className="p-4">
      <div
        className={cn(
          'bg-white w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]',
          className,
        )}
        style={{
          borderRadius: 8,
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* §5.3 emphasis accent — 3px green strip */}
        <div aria-hidden className="h-[3px] w-full bg-sett-primary" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0]">
          <h2
            id="modalTitle"
            className="font-montserrat text-[18px] font-bold leading-tight text-sett-navy"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F8F9FA] text-sett-grey hover:text-sett-navy transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </ModalOverlay>
  );
}
