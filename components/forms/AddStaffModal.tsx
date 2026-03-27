'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface AddStaffModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: { fullName: string; email: string }) => Promise<void>;
  isLoading?: boolean;
}

export function AddStaffModal({ open, onClose, onAdd, isLoading }: AddStaffModalProps) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setFullName('');
      setEmail('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const canSubmit = fullName.trim() !== '' && email.trim() !== '';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onAdd({ fullName: fullName.trim(), email: email.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[525px] rounded-[14px] border-2 border-sett-border-light bg-white shadow-[0_4px_10px_720px_rgba(0,0,0,0.60)]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-0">
          <div>
            <h2 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D] mb-1.5">
              {t.staffManagement.addStaffTitle}
            </h2>
            <p className="font-montserrat text-[14px] font-normal text-[#4A4A4A]">
              {t.staffManagement.addStaffDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-sett-border/50 text-sett-text-secondary transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 mt-4 border-t border-sett-border-light" />

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="font-montserrat text-[12px] font-semibold uppercase tracking-wider text-sett-text-primary">
              {t.staffManagement.fullName}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t.staffManagement.fullNamePlaceholder}
              className="w-full h-[41px] px-3 rounded-[14px] border border-sett-border-light font-montserrat text-[14px] text-sett-text-primary placeholder:text-[#A3A3A3] focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="font-montserrat text-[12px] font-semibold uppercase tracking-wider text-sett-text-primary">
              {t.staffManagement.emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.staffManagement.emailPlaceholder}
              className="w-full h-[41px] px-3 rounded-[14px] border border-sett-border-light font-montserrat text-[14px] text-sett-text-primary placeholder:text-[#A3A3A3] focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-[44px] rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[16px] font-semibold text-sett-text-primary disabled:opacity-50 transition-transform duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms]"
          >
            {t.common.cancel}
          </button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isLoading}
            className="flex-1 h-[44px] !rounded-[14px] !text-[16px]"
          >
            {t.staffManagement.addStaffBtn}
          </Button>
        </div>
      </div>
    </div>
  );
}
