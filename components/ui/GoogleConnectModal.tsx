'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { authApi } from '@/lib/api/auth';

interface GoogleConnectModalProps {
  open: boolean;
  onClose: () => void;
}

function GoogleLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M39.2 20.459c0-1.4-.117-2.75-.333-4.042H20v7.642h10.773a9.209 9.209 0 0 1-4 6.042v5.016h6.475C36.8 31.659 39.2 26.509 39.2 20.459Z" fill="#4285F4"/>
      <path d="M20 40c5.4 0 9.933-1.783 13.248-4.883l-6.475-5.016c-1.8 1.208-4.1 1.925-6.773 1.925-5.21 0-9.617-3.517-11.19-8.25H2.116v5.183A19.996 19.996 0 0 0 20 40Z" fill="#34A853"/>
      <path d="M8.81 23.776A12.014 12.014 0 0 1 8.183 20c0-1.308.225-2.575.627-3.776V11.04H2.116A19.996 19.996 0 0 0 0 20c0 3.233.775 6.283 2.116 8.96L8.81 23.776Z" fill="#FBBC05"/>
      <path d="M20 7.967c2.935 0 5.567 1.008 7.64 2.983l5.733-5.733C29.917 1.984 25.4 0 20 0 12.133 0 5.375 4.342 2.116 10.717L8.81 15.9C10.383 11.167 14.79 7.967 20 7.967Z" fill="#EA4335"/>
    </svg>
  );
}

export function GoogleConnectModal({ open, onClose }: GoogleConnectModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await authApi.getGoogleConnectUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
      onClose();
    } catch {
      // silently ignore
    } finally {
      setConnecting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[20px] shadow-[0_8px_40px_0_rgba(0,0,0,0.18)] w-full max-w-[620px] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-5">
          <div>
            <h2 className="font-montserrat text-[20px] font-bold text-sett-text-primary leading-snug">
              Manage Your Google Account
            </h2>
            <p className="font-montserrat text-[14px] font-normal text-sett-text-secondary mt-1.5 leading-relaxed">
              Connect your Gmail account quickly and securely with just a few clicks.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-sett-text-secondary transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-0" />

        {/* Google card row */}
        <div className="mx-6 my-5 rounded-[14px] border border-sett-border-light p-5 flex items-center gap-4">
          {/* Logo in circle */}
          <div
            className="shrink-0 w-14 h-14 rounded-full bg-white flex items-center justify-center"
            style={{ boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)', border: '1px solid #EEEEEE' }}
          >
            <GoogleLogo size={32} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="font-montserrat text-[15px] font-bold text-sett-text-primary">Google</p>
            <p className="font-montserrat text-[13px] font-normal text-sett-text-secondary mt-0.5 leading-relaxed">
              Link your Google account to quickly and easily send emails and handle all your communications
            </p>
          </div>

          {/* Connect button — right side */}
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="shrink-0 h-[44px] px-6 rounded-[12px] font-montserrat text-[13px] font-semibold uppercase tracking-wider text-white transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg, #AAC737 0%, #8DAF1A 100%)' }}
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
