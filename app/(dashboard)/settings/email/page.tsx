'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi, type EmailConfig, type EmailConfigUser } from '@/lib/api/settings';
import { cn } from '@/lib/utils/cn';

export default function EmailConfigPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [fromName, setFromName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<EmailConfigUser | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getEmailConfig();
      setConfig(data);
      setFromName(data.fromName || '');
    } catch {
      // handled by api client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Handle Google redirect callback
  useEffect(() => {
    const googleStatus = searchParams.get('google');
    if (googleStatus === 'connected') {
      toast.success(t.emailConfig.googleConnected);
      window.history.replaceState({}, '', '/settings/email');
      fetchConfig();
    } else if (googleStatus === 'denied') {
      toast.error(t.emailConfig.googleDenied);
      window.history.replaceState({}, '', '/settings/email');
    }
  }, [searchParams, t, fetchConfig]);

  const handleDisconnect = async (user: EmailConfigUser) => {
    setDisconnectingId(user.id);
    try {
      await settingsApi.disconnectGoogle(user.id);
      const name = `${user.firstName} ${user.lastName ?? ''}`.trim();
      toast.success(t.emailConfig.disconnected.replace('{name}', name));
      fetchConfig();
    } catch {
      // handled by api client
    } finally {
      setDisconnectingId(null);
      setConfirmDisconnect(null);
    }
  };

  const handleConnect = async () => {
    try {
      const url = await settingsApi.getGoogleConnectUrl();
      window.location.href = url;
    } catch {
      // handled by api client
    }
  };

  const handleSaveFromName = async () => {
    if (!fromName.trim()) return;
    setSaving(true);
    try {
      await settingsApi.updateFromName(fromName.trim());
      toast.success(t.emailConfig.saved);
    } catch {
      // handled by api client
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title={t.settings.title} />
      <div className="p-4 md:p-6">
        {/* Page heading */}
        <div className="flex items-center mb-6" style={{ gap: 14 }}>
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-1.5 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.emailConfig.back}
          </button>
          <span className="text-[#E6EAF0]">|</span>
          <h2 className="font-montserrat font-medium text-[18px] leading-none text-[#1D1D1D]">
            {t.emailConfig.title}
          </h2>
        </div>

        <div className="space-y-6">
          {/* ── Section 1: Google Account Connections ── */}
          <div className="rounded-[14px] bg-white" style={{ border: '1px solid #E6EAF0' }}>
            <div className="p-5">
              <div className="flex items-start mb-5" style={{ gap: 12 }}>
                <div className="shrink-0" style={{ width: 4, height: 43, borderRadius: 9999, background: '#AAC737' }} />
                <div className="flex flex-col" style={{ gap: 4 }}>
                  <h3 className="font-montserrat font-semibold text-[18px] leading-none text-[#1D1D1D]">
                    {t.emailConfig.googleTitle}
                  </h3>
                  <p className="font-montserrat font-normal text-[14px] leading-none" style={{ color: '#4A4A4A' }}>
                    {t.emailConfig.googleDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderTop: '1px solid #E6EAF0', borderBottom: '1px solid #E6EAF0' }}>
                    <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>
                      {t.emailConfig.name}
                    </th>
                    <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>
                      {t.emailConfig.email}
                    </th>
                    <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>
                      {t.emailConfig.status}
                    </th>
                    <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>
                      {t.emailConfig.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12">
                        <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
                      </td>
                    </tr>
                  ) : !config?.users?.length ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 font-montserrat text-[14px] text-[#A3A3A3]">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    config.users.map((user) => (
                      <tr
                        key={user.id}
                        className={cn(
                          'bg-white hover:bg-[#F7F7F7] transition-colors',
                          !user.isActive && 'opacity-50'
                        )}
                        style={{ height: 72, borderBottom: '1px solid #E6EAF0' }}
                      >
                        <td className="px-5 font-montserrat text-[14px] font-medium leading-none text-[#1D1D1D]">
                          {user.firstName} {user.lastName ?? ''}
                        </td>
                        <td className="px-5 font-montserrat text-[14px] font-normal leading-none text-[#1D1D1D]">
                          {user.email}
                        </td>
                        <td className="px-5">
                          {user.googleConnected ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-montserrat text-[12px] font-semibold" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2E7D32' }} />
                              {t.emailConfig.connected}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-montserrat text-[12px] font-semibold" style={{ background: '#F5F5F5', color: '#A3A3A3' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#A3A3A3' }} />
                              {t.emailConfig.notConnected}
                            </span>
                          )}
                        </td>
                        <td className="px-5">
                          {user.googleConnected && (
                            <button
                              type="button"
                              onClick={() => setConfirmDisconnect(user)}
                              disabled={disconnectingId === user.id}
                              className="px-3 py-1.5 rounded-[8px] font-montserrat text-[13px] font-semibold text-[#FB2C36] border border-[#FB2C36]/30 hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
                            >
                              {disconnectingId === user.id ? '...' : t.emailConfig.disconnect}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Connect own Google button */}
            <div className="px-5 py-4" style={{ borderTop: '1px solid #E6EAF0' }}>
              <button
                type="button"
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] font-montserrat text-[14px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[3px] active:scale-95"
                style={{ background: '#AAC737', boxShadow: '4px 4px 5px 0px #FFFFFF40 inset, 0px 8px 20px 0px #00000021' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t.emailConfig.connectGoogle}
              </button>
            </div>
          </div>

          {/* ── Section 2: Sender Information ── */}
          <div className="rounded-[14px] bg-white" style={{ border: '1px solid #E6EAF0' }}>
            <div className="p-5">
              <div className="flex items-start mb-5" style={{ gap: 12 }}>
                <div className="shrink-0" style={{ width: 4, height: 43, borderRadius: 9999, background: '#AAC737' }} />
                <div className="flex flex-col" style={{ gap: 4 }}>
                  <h3 className="font-montserrat font-semibold text-[18px] leading-none text-[#1D1D1D]">
                    {t.emailConfig.senderTitle}
                  </h3>
                  <p className="font-montserrat font-normal text-[14px] leading-none" style={{ color: '#4A4A4A' }}>
                    {t.emailConfig.senderDesc}
                  </p>
                </div>
              </div>

              <div className="max-w-[400px] space-y-4">
                <div className="flex flex-col" style={{ gap: 6 }}>
                  <label className="font-montserrat text-[14px] font-semibold leading-none uppercase text-[#0A0A0A]">
                    {t.emailConfig.fromName} <span className="text-[#FB2C36]">*</span>
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder={t.emailConfig.fromNamePlaceholder}
                    className="w-full h-[41px] rounded-[14px] font-montserrat text-[14px] font-normal text-[#1D1D1D] placeholder:text-[#A3A3A3] focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
                    style={{ border: '1px solid #E6EAF0', padding: '12px' }}
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={handleSaveFromName}
                  isLoading={saving}
                  disabled={!fromName.trim()}
                >
                  {t.emailConfig.save}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Disconnect Confirmation Modal ── */}
      {confirmDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-[14px] w-full max-w-md mx-4 p-6" style={{ border: '1px solid #E6EAF0' }}>
            <h3 className="font-montserrat text-[18px] font-semibold text-[#1D1D1D] mb-2">
              {t.emailConfig.disconnectTitle}
            </h3>
            <p className="font-montserrat text-[14px] text-[#4A4A4A] mb-6">
              {t.emailConfig.disconnectMsg.replace('{name}', `${confirmDisconnect.firstName} ${confirmDisconnect.lastName ?? ''}`.trim())}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDisconnect(null)}
                className="px-4 py-2.5 rounded-[14px] font-montserrat text-[14px] font-semibold text-[#4A4A4A] border hover:bg-[#F7F7F7] transition-colors"
                style={{ border: '1px solid #E6EAF0' }}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDisconnect(confirmDisconnect)}
                disabled={disconnectingId === confirmDisconnect.id}
                className="px-4 py-2.5 rounded-[14px] font-montserrat text-[14px] font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: '#FB2C36' }}
              >
                {disconnectingId === confirmDisconnect.id ? '...' : t.emailConfig.disconnect}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
