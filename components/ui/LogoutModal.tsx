'use client';

import { useState, useEffect } from 'react';


interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function LogoutModal({ open, onClose, onConfirm }: LogoutModalProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[448px] p-5 flex flex-col justify-center items-start gap-10 rounded-[14px] border-2 border-[#E6EAF0] bg-white shadow-[0_4px_10px_720px_rgba(0,0,0,0.60)]">
        <div>
          <h2 className="font-montserrat text-[18px] font-semibold leading-normal text-[#1D1D1D] mb-2">
            Are you sure you want to Logout?
          </h2>
          <p className="font-montserrat text-[14px] font-normal leading-normal text-[#4A4A4A]">
            Logging out will remove your access. You can log back in at any time.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex w-[198px] py-3 px-4 justify-center items-center gap-1 rounded-[14px] border border-[#E6EAF0] bg-[#F7F7F7] font-montserrat text-[16px] font-semibold leading-normal text-[#1D1D1D] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex flex-1 py-3 px-4 justify-center items-center gap-1 rounded-[14px] bg-[#FB2C36] shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[16px] font-semibold leading-normal text-white disabled:opacity-50"
          >
            {loading ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
