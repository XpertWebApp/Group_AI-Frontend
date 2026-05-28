'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ModalOverlay } from './ModalOverlay';


interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function LogoutModal({ open, onClose, onConfirm }: LogoutModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay open={open} onClose={onClose} className="p-4">
      <div
        className="w-[448px] bg-white overflow-hidden flex flex-col"
        style={{
          borderRadius: 8, // §5.3 panel
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* §5.3 emphasis accent — green stripe at top, identifies the brand */}
        <div aria-hidden className="h-[3px] w-full bg-sett-primary" />
        <div className="px-5 py-5">
          <h2 className="font-montserrat text-[20px] font-bold leading-tight text-sett-navy mb-2">
            {t.logoutModal.title}
          </h2>
          <p className="font-montserrat text-[14px] font-normal leading-relaxed text-sett-grey">
            {t.logoutModal.message}
          </p>
        </div>
        <div className="h-px bg-[#E0E0E0] mx-5" />
        {/* §5.1 buttons — secondary (transparent + green border) for cancel,
            destructive (#CC3333 — brand-spec red) for confirm. */}
        <div className="flex gap-3 justify-end px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] border-2 border-sett-primary bg-transparent font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-primary hover:bg-sett-primary/5 active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
          >
            {t.logoutModal.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] bg-sett-destructive hover:bg-sett-destructive-hover font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-white active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              t.logoutModal.confirm
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
