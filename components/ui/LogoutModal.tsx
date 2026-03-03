'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function LogoutModal({ open, onClose, onConfirm }: LogoutModalProps) {
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
    <Modal open={open} onClose={onClose} title="Are you sure you want to logout?">
      <p className="text-body text-sett-text-secondary mb-6">
        You&apos;ll be returned to the login page.
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleConfirm} isLoading={loading}>
          Sign out
        </Button>
      </div>
    </Modal>
  );
}
