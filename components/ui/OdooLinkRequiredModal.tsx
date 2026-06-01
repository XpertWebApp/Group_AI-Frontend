'use client';

import { Link2 } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when staff click "Open Request" — should focus the Company field. */
  onOpenRequest: () => void;
  /** Optional override of the body copy (the BE returns a complete user-facing
   *  sentence — pass it through verbatim when handling a 400 response). */
  bodyOverride?: string;
}

export function OdooLinkRequiredModal({ open, onClose, onOpenRequest, bodyOverride }: Props) {
  const { t } = useLanguage();
  return (
    <ModalOverlay open={open} onClose={onClose} className="p-4">
      <div
        className="w-[448px] bg-white overflow-hidden flex flex-col"
        style={{
          borderRadius: 8,
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <div aria-hidden className="h-[3px] w-full bg-sett-primary" />
        <div className="px-5 py-5 flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-sett-light-green-bg border border-sett-primary/40 shrink-0">
            <Link2 className="w-4 h-4 text-sett-primary" />
          </span>
          <div className="flex-1">
            <h2 className="font-montserrat text-[18px] font-bold leading-tight text-sett-navy mb-2">
              {t.odooPicker.sendBlockedTitle}
            </h2>
            <p className="font-montserrat text-[14px] font-normal leading-relaxed text-sett-grey">
              {bodyOverride ?? t.odooPicker.sendBlockedBody}
            </p>
          </div>
        </div>
        <div className="h-px bg-[#E0E0E0] mx-5" />
        <div className="flex gap-3 px-5 py-4 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] border-2 border-sett-primary bg-transparent font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-primary hover:bg-sett-primary/5 active:scale-[0.98] transition-colors duration-200"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenRequest();
              onClose();
            }}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] bg-sett-primary hover:bg-sett-green-dark font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-navy active:scale-[0.98] transition-colors duration-200"
          >
            {t.odooPicker.sendBlockedCta}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
