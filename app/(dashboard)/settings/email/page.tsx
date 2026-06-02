'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  settingsApi,
  type EmailSettingsResponse,
  type SenderIdentity,
  type EmailConnectionStatus,
} from '@/lib/api/settings';

/* ───────── helpers ─────────
 * `formatRelativeTime` is duplicated from the Settings index page rather
 * than extracted to a shared util because both call sites are small and
 * the wording rules drift with locale tweaks. If a third caller appears,
 * promote it to `lib/dateFormatter.ts`. */
function formatRelativeTime(dateStr: string | null, locale: string): string | null {
  if (!dateStr) return null;
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  if (locale === 'de') {
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHrs < 24) return `vor ${diffHrs} Std.`;
    if (diffDays < 7) return `vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`;
    return `vor ${diffWeeks} ${diffWeeks === 1 ? 'Woche' : 'Wochen'}`;
  }
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (val: string) => val === '' || EMAIL_REGEX.test(val);

// The only Brevo-verified sender. If the admin changes `fromEmail` away
// from this, render a (non-blocking) warning per BE handover §5.4.
const BREVO_VERIFIED_SENDER = 'groups@s-e-t-t.com';

export default function EmailConfigPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();

  const [data, setData] = useState<EmailSettingsResponse | null>(null);
  const [form, setForm] = useState<SenderIdentity>({
    fromName: '',
    fromEmail: '',
    replyToFallback: '',
    staffNotificationEmail: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SenderIdentity, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Test-send card state
  const [testTo, setTestTo] = useState('');
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settingsApi.getEmailSettings();
      setData(res);
      setForm(res.senderIdentity);
    } catch {
      // handled by api client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Detect unsaved changes — drives the Save button's disabled state.
  const dirty = useMemo(() => {
    if (!data) return false;
    const s = data.senderIdentity;
    return (
      form.fromName !== s.fromName
      || form.fromEmail !== s.fromEmail
      || form.replyToFallback !== s.replyToFallback
      || form.staffNotificationEmail !== s.staffNotificationEmail
    );
  }, [form, data]);

  // Inline warning per BE §5.4: admin picked a sender that isn't the
  // Brevo-verified one — Brevo will rewrite the From header anyway, so the
  // visible inbox sender won't match. Non-blocking; save still works.
  const showSenderWarning = form.fromEmail !== '' && form.fromEmail !== BREVO_VERIFIED_SENDER;

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof SenderIdentity, string>> = {};
    if (!isValidEmail(form.fromEmail)) next.fromEmail = t.emailConfig.invalidEmail;
    if (!isValidEmail(form.replyToFallback)) next.replyToFallback = t.emailConfig.invalidEmail;
    if (!isValidEmail(form.staffNotificationEmail)) next.staffNotificationEmail = t.emailConfig.invalidEmail;
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, t]);

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await settingsApi.updateSenderIdentity(form);
      // Reflect any BE-side trimming/normalisation by re-syncing from the
      // PUT response (no second GET needed).
      setData(res);
      setForm(res.senderIdentity);
      toast.success(t.emailConfig.saved);
    } catch {
      // handled by api client
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTestError(null);
    setTestSuccess(null);
    if (!isValidEmail(testTo) || testTo === '') {
      setTestError(t.emailConfig.invalidEmail);
      return;
    }
    setTesting(true);
    try {
      await settingsApi.sendEmailTest(testTo);
      setTestSuccess(t.emailConfig.sendTestSuccess.replace('{to}', testTo));
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        const code = err.response?.data?.error as string | undefined;
        const msg = err.response?.data?.message as string | undefined;
        if (code === 'RATE_LIMITED' || err.response?.status === 429) {
          setTestError(t.emailConfig.sendTestRateLimited);
        } else if (code === 'NOT_CONFIGURED' || err.response?.status === 503) {
          setTestError(t.emailConfig.sendTestNotConfigured);
        } else {
          setTestError(msg ?? 'Failed to send test email');
        }
      } else {
        setTestError('Failed to send test email');
      }
    } finally {
      setTesting(false);
    }
  };

  const connection = data?.connection;
  const intercept = data?.intercept;
  const lastTested = formatRelativeTime(connection?.lastTestedAt ?? null, locale);

  return (
    <>
      <Header title={t.settings.title} />
      <div className="p-4 md:p-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3.5 mb-6">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-1.5 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.emailConfig.back}
          </button>
          <h2 className="font-montserrat text-[22px] font-semibold leading-none text-sett-text-primary">
            {t.emailConfig.title}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* ─────────── Card 1: Sender Identity ─────────── */}
            <SectionCard
              title={t.emailConfig.senderTitle}
              description={t.emailConfig.senderDesc}
            >
              <div className="max-w-[480px] space-y-4">
                <Field
                  label={t.emailConfig.fromName}
                  value={form.fromName}
                  placeholder={t.emailConfig.fromNamePlaceholder}
                  onChange={(v) => setForm({ ...form, fromName: v })}
                />
                <Field
                  label={t.emailConfig.fromEmail}
                  value={form.fromEmail}
                  placeholder={t.emailConfig.fromEmailPlaceholder}
                  onChange={(v) => {
                    setForm({ ...form, fromEmail: v });
                    if (errors.fromEmail) setErrors({ ...errors, fromEmail: undefined });
                  }}
                  error={errors.fromEmail}
                  warning={showSenderWarning ? t.emailConfig.senderWarning : undefined}
                />
                <Field
                  label={t.emailConfig.replyToFallback}
                  value={form.replyToFallback}
                  placeholder={t.emailConfig.replyToFallbackPlaceholder}
                  onChange={(v) => {
                    setForm({ ...form, replyToFallback: v });
                    if (errors.replyToFallback) setErrors({ ...errors, replyToFallback: undefined });
                  }}
                  error={errors.replyToFallback}
                />
                <Field
                  label={t.emailConfig.staffNotificationEmail}
                  value={form.staffNotificationEmail}
                  placeholder={t.emailConfig.staffNotificationEmailPlaceholder}
                  onChange={(v) => {
                    setForm({ ...form, staffNotificationEmail: v });
                    if (errors.staffNotificationEmail) setErrors({ ...errors, staffNotificationEmail: undefined });
                  }}
                  error={errors.staffNotificationEmail}
                />

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    isLoading={saving}
                    disabled={!dirty}
                  >
                    {t.emailConfig.save}
                  </Button>
                </div>
              </div>
            </SectionCard>

            {/* ─────────── Card 2: Brevo Connection ─────────── */}
            <SectionCard
              title={t.emailConfig.connectionTitle}
              description=""
              statusDot={
                connection ? (
                  <StatusDot
                    status={connection.configured ? connection.status : 'untested'}
                    lastTested={connection.configured ? lastTested : null}
                    error={connection.statusError}
                    configured={connection.configured}
                    t={t}
                  />
                ) : null
              }
            >
              {!connection || !connection.configured ? (
                <p className="font-montserrat text-[14px] text-sett-text-secondary">
                  {t.emailConfig.notConfigured}
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <ReadOnlyRow label={t.emailConfig.provider} value={connection.provider} />
                    <ReadOnlyRow
                      label={t.emailConfig.hostPort}
                      value={`${connection.host} : ${connection.port} (${connection.security})`}
                    />
                    <ReadOnlyRow label={t.emailConfig.username} value={connection.usernameMasked ?? '—'} />
                    <ReadOnlyRow label={t.emailConfig.password} value={connection.passwordMasked ?? '—'} />
                  </div>

                  {/* Test-send sub-card */}
                  <div className="pt-4 border-t border-[#E6EAF0]">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2 max-w-[480px]">
                      <div className="flex-1">
                        <Input
                          label={t.emailConfig.sendTestLabel}
                          type="email"
                          value={testTo}
                          onChange={(e) => {
                            setTestTo(e.target.value);
                            setTestError(null);
                            setTestSuccess(null);
                          }}
                          placeholder={t.emailConfig.sendTestPlaceholder}
                          disabled={testing}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        onClick={handleSendTest}
                        isLoading={testing}
                        disabled={!testTo.trim()}
                      >
                        <Send className="w-4 h-4" />
                        {t.emailConfig.sendTest}
                      </Button>
                    </div>
                    {testSuccess && (
                      <p className="mt-2 font-montserrat text-[13px] text-[#2E7D32]">
                        ✓ {testSuccess}
                      </p>
                    )}
                    {testError && (
                      <p className="mt-2 font-montserrat text-[13px] text-[#FB2C36]">
                        {testError}
                      </p>
                    )}
                  </div>

                  <p className="font-montserrat text-[12px] text-sett-text-secondary leading-relaxed">
                    ⓘ {t.emailConfig.credentialsHint}
                  </p>
                </div>
              )}
            </SectionCard>

            {/* ─────────── Card 3: QA & Safety (only when intercept is active) ─────────── */}
            {intercept?.active && (
              <div className="rounded-[14px] bg-[#FFFBEB] border border-[#FCD34D] p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-montserrat font-bold text-[15px] text-[#92400E] uppercase tracking-[0.05em]">
                      {t.emailConfig.interceptActive}
                    </h3>
                    <p className="font-montserrat text-[14px] text-[#1D1D1D]">
                      {t.emailConfig.interceptDesc}
                    </p>
                    <p className="font-montserrat text-[14px] font-semibold text-sett-navy">
                      {intercept.target ?? '—'}
                    </p>
                    <p className="font-montserrat text-[12px] text-sett-text-secondary leading-relaxed pt-2">
                      {t.emailConfig.interceptHint}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Reusable card frame matching the Settings → General visual language ─── */
function SectionCard({
  title,
  description,
  statusDot,
  children,
}: {
  title: string;
  description: string;
  statusDot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-sett-border-light bg-white p-5">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-1 h-[43px] rounded-full bg-sett-primary shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D]">
              {title}
            </h3>
            {statusDot}
          </div>
          {description && (
            <p className="font-montserrat text-[14px] font-normal leading-snug text-[#4A4A4A]">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Field — thin wrapper around the shared Input. Inherits all the
 *  brand-spec border, focus glow, hover, error styling. Adds an optional
 *  amber warning line shown when no error is present (used for the
 *  non-verified-sender hint that doesn't block save). */
function Field({
  label,
  value,
  placeholder,
  onChange,
  error,
  warning,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  error?: string;
  warning?: string;
}) {
  return (
    <div>
      <Input
        label={label}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        error={error}
      />
      {!error && warning && (
        <p className="mt-1 font-montserrat text-[12px] text-[#B45309] leading-relaxed">
          ⚠ {warning}
        </p>
      )}
    </div>
  );
}

/* ─── Read-only label/value row used inside the Brevo Connection card ─── */
function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.05em] text-sett-text-secondary">
        {label}
      </div>
      <div className="font-montserrat text-[14px] text-sett-navy mt-0.5 break-all">
        {value}
      </div>
    </div>
  );
}

/* ─── Status dot (green / red / grey) with semantic sub-label ─── */
function StatusDot({
  status,
  lastTested,
  error,
  configured,
  t,
}: {
  status: EmailConnectionStatus;
  lastTested: string | null;
  error: string | null;
  configured: boolean;
  t: { emailConfig: { statusConnected: string; statusError: string; statusUntested: string; lastTested: string; notConfigured: string } };
}) {
  if (!configured) {
    return (
      <span className="inline-flex items-center gap-2 font-montserrat text-[12px] text-sett-text-secondary">
        <span className="w-2 h-2 rounded-full bg-[#A3A3A3]" />
        {t.emailConfig.notConfigured}
      </span>
    );
  }
  const dotColour =
    status === 'connected' ? '#2E7D32' :
    status === 'error' ? '#FB2C36' : '#A3A3A3';
  const label =
    status === 'connected' ? (lastTested ? t.emailConfig.lastTested.replace('{when}', lastTested) : t.emailConfig.statusConnected) :
    status === 'error' ? (error ? `${t.emailConfig.statusError}: ${error}` : t.emailConfig.statusError) :
    t.emailConfig.statusUntested;
  return (
    <span
      className="inline-flex items-center gap-2 font-montserrat text-[12px] text-sett-text-secondary max-w-[320px]"
      title={status === 'error' && error ? error : undefined}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColour }} />
      <span className="truncate">{label}</span>
    </span>
  );
}
