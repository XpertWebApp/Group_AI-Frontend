'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

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

export default function ConnectAccountPage() {
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  function fetchStatus() {
    authApi.getGoogleStatus().then((s) => {
      setConnected(s.connected);
      setEmail(s.email ?? null);
    }).catch(() => {});
  }

  function fetchConnectUrl() {
    authApi.getGoogleConnectUrl('/connect-account').then(setConnectUrl).catch(() => {});
  }

  useEffect(() => {
    fetchStatus();
    fetchConnectUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Google OAuth callback: ?google=connected or ?google=denied
  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (!googleParam) return;
    if (googleParam === 'connected') {
      toast.success('Google account connected successfully!');
      fetchStatus();
    } else if (googleParam === 'denied') {
      toast.error('Google connection was denied.');
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('google');
    window.history.replaceState({}, '', url.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await authApi.disconnectGoogle();
      setConnected(false);
      setEmail(null);
      toast.success('Google account disconnected.');
      // Re-fetch connect URL for re-connecting
      fetchConnectUrl();
    } catch {
      toast.error('Failed to disconnect. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      <Header title="Connect Your Google Account" />
      <div className="p-4 md:p-6">
        <div className="bg-white rounded-[14px] shadow-[0_1px_4px_0_rgba(0,0,0,0.08)] border border-sett-border-light overflow-hidden">
          {/* Title section */}
          <div className="px-7 pt-7 pb-5">
            <h2 className="font-montserrat text-[20px] font-bold text-sett-text-primary leading-snug">
              Manage Your Google Account
            </h2>
            <p className="font-montserrat text-[14px] font-normal text-sett-text-secondary mt-1.5 leading-relaxed">
              Connect your Gmail account quickly and securely with just a few clicks.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-sett-border-light" />

          {/* Google card row */}
          <div className="mx-6 my-6 rounded-[14px] p-5 flex items-center gap-4" style={{ border: '1px solid #68686866' }}>
            {/* Logo in circle */}
            <div
              className="shrink-0 w-14 h-14 rounded-full bg-white flex items-center justify-center"
              style={{ boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.12)', border: '1px solid #EEEEEE' }}
            >
              <GoogleLogo size={32} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-montserrat text-[18px] font-semibold leading-[100%] tracking-[0%]" style={{ color: '#071C42' }}>Google</p>
              {connected && email ? (
                <p className="font-montserrat text-[13px] font-normal text-sett-text-secondary mt-0.5">
                  {email}
                </p>
              ) : !connected && (
                <p className="font-montserrat text-[13px] font-normal text-sett-text-secondary mt-0.5">
                  Link your Google account to quickly and easily send emails and handle all your communications
                </p>
              )}
            </div>

            {/* Right side — connected or disconnected state */}
            {connected ? (
              <div className="flex items-center gap-3 shrink-0">
                {/* Connected indicator */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-[9px] h-[9px] rounded-full shrink-0"
                    style={{ background: '#44B464' }}
                  />
                  <span
                    className="font-montserrat font-medium text-[14px] leading-[100%] tracking-[0%]"
                    style={{ color: '#686868' }}
                  >
                    Connected
                  </span>
                </div>

                {/* Disconnect button */}
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="h-[41px] px-4 rounded-[14px] font-montserrat font-semibold text-[14px] leading-[100%] tracking-[0.08px] uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{
                    background: '#F7F7F7',
                    border: '1px solid #68686866',
                    color: '#686868',
                  }}
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            ) : (
              /* Connect button — URL pre-fetched, instant navigation */
              connectUrl ? (
                <a
                  href={connectUrl}
                  className="shrink-0 h-[44px] px-6 rounded-[12px] font-montserrat text-[13px] font-semibold uppercase tracking-wider text-white flex items-center transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(90deg, #AAC737 0%, #8DAF1A 100%)' }}
                >
                  Connect
                </a>
              ) : (
                <div
                  className="shrink-0 h-[44px] px-6 rounded-[12px] font-montserrat text-[13px] font-semibold uppercase tracking-wider text-white flex items-center opacity-40"
                  style={{ background: 'linear-gradient(90deg, #AAC737 0%, #8DAF1A 100%)' }}
                >
                  Connect
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
