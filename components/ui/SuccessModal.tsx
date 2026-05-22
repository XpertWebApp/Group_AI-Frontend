'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonLabel?: string;
  autoRedirectSeconds?: number;
}

export function SuccessModal({
  open,
  onClose,
  title,
  message,
  buttonLabel,
  autoRedirectSeconds,
}: SuccessModalProps) {
  const { t } = useLanguage();
  const resolvedButtonLabel = buttonLabel ?? t.modals.ok;
  const [countdown, setCountdown] = useState(autoRedirectSeconds ?? 0);

  useEffect(() => {
    if (!open || !autoRedirectSeconds) return;
    setCountdown(autoRedirectSeconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, autoRedirectSeconds, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="">
      {/* §3 H3 title + §3 body, centered with a brand-green success icon. */}
      <div className="flex flex-col items-center text-center py-2">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{
            background: '#F5F9E8', // §5.2 active-row tint = soft brand green
            border: '1px solid #C8E050',
          }}
        >
          <CheckCircle className="w-8 h-8 text-sett-primary" strokeWidth={2.25} />
        </div>
        <h3 className="font-montserrat text-[20px] font-bold leading-tight text-sett-navy mb-2">
          {title}
        </h3>
        <p className="font-montserrat text-[14px] leading-relaxed text-sett-grey mb-6">{message}</p>
        <Button variant="primary" fullWidth onClick={onClose}>
          {resolvedButtonLabel}
        </Button>
        {autoRedirectSeconds && countdown > 0 && (
          <p className="font-montserrat text-[12px] text-sett-grey mt-3">
            {t.modals.redirecting.replace('{seconds}', String(countdown))}
          </p>
        )}
      </div>
    </Modal>
  );
}
