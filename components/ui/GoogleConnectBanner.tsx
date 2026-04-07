'use client';

import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface GoogleConnectBannerProps {
  initialStatus?: { connected: boolean; email?: string };
}

export function GoogleConnectBanner({ initialStatus }: GoogleConnectBannerProps) {
  const { t } = useLanguage();
  const gc = t.dashboard.googleConnect;
  const [status, setStatus] = useState(initialStatus ?? { connected: false });
  const [loading, setLoading] = useState(!initialStatus);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (initialStatus) return;
    authApi.getGoogleStatus().then(setStatus).catch(() => {}).finally(() => setLoading(false));
  }, [initialStatus]);

  if (loading || status.connected) return null;

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await authApi.getGoogleConnectUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // silently ignore — user will retry
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <Mail className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary">{gc.bannerTitle}</p>
          <p className="font-montserrat text-[13px] font-normal text-sett-text-secondary">{gc.bannerDescription}</p>
        </div>
      </div>
      <Button size="sm" onClick={handleConnect} disabled={connecting}>
        {connecting ? gc.connecting : gc.connectButton}
      </Button>
    </div>
  );
}
