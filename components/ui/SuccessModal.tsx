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
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 rounded-full bg-sett-light-green-bg flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-sett-primary" />
        </div>
        <h3 className="text-heading-sm font-bold text-sett-text-primary mb-2">{title}</h3>
        <p className="text-body text-sett-text-secondary mb-6">{message}</p>
        <Button variant="primary" fullWidth onClick={onClose}>
          {resolvedButtonLabel}
        </Button>
        {autoRedirectSeconds && countdown > 0 && (
          <p className="text-caption text-sett-text-accent mt-3">
            {t.modals.redirecting.replace('{seconds}', String(countdown))}
          </p>
        )}
      </div>
    </Modal>
  );
}
