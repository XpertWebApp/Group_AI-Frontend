'use client';

import { Modal } from './Modal';
import { Button } from './Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = 'danger',
}: ConfirmModalProps) {
  const { t } = useLanguage();
  const resolvedConfirmLabel = confirmLabel ?? t.modals.confirm;
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {/* §3 body — Montserrat 400 / 14px / grey #686868 */}
      <p className="font-montserrat text-[14px] leading-relaxed text-sett-grey mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t.modals.cancel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'destructive' : 'primary'}
          onClick={handleConfirm}
        >
          {resolvedConfirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
