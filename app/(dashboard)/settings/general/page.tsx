'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi } from '@/lib/api/settings';
import { invalidateDefaultMarkup } from '@/hooks/useDefaultMarkup';

// Common-value shortcuts shown in the preset Select. Keep this list short
// — the custom input handles every value that isn't worth a dedicated row.
const MARKUP_PRESETS = ['0', '5', '10', '15', '18', '20', '25', '30', '50', '100'];

export default function GeneralConfigPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [markup, setMarkup] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsApi.getGeneral()
      .then((data) => { if (!cancelled) setMarkup(data.defaultMarkupPercentage); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Normalise the raw input (e.g. "18,5" → "18.5") so float parsing works
  // regardless of locale, then validate range. Returns the canonical
  // string we'll send to the BE, or null if the input isn't acceptable.
  const MARKUP_MAX = 9_999_999_999;
  const parseMarkup = (raw: string): string | null => {
    const cleaned = raw.replace(',', '.').trim();
    if (cleaned === '') return null;
    const num = parseFloat(cleaned);
    if (isNaN(num) || num < 0 || num > MARKUP_MAX) return null;
    // Clamp to 2 decimals — strips trailing zeros so "18.50" → "18.5".
    return String(Math.round(num * 100) / 100);
  };

  const canonicalMarkup = parseMarkup(markup);
  const isInvalid = markup.trim() !== '' && canonicalMarkup === null;

  const handleSave = async () => {
    if (canonicalMarkup === null) return;
    setSaving(true);
    try {
      await settingsApi.updateGeneral({ defaultMarkupPercentage: canonicalMarkup });
      // Force every consumer (proposal slider seed, markup-dropdown chip
      // highlight, etc.) to re-fetch on next mount so the new default
      // shows up without a hard reload.
      invalidateDefaultMarkup();
      toast.success(t.toasts.settingsSaved);
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
        {/* Back + Title */}
        <div className="flex items-center gap-3.5 mb-6">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-1.5 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.generalConfig.back}
          </button>
          <h2 className="font-montserrat text-[22px] font-semibold leading-none text-sett-text-primary">
            {t.generalConfig.title}
          </h2>
        </div>

        {/* Main Card */}
        <div className="rounded-[14px] border border-sett-border-light bg-white p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Pricing Rules Header */}
              <div className="flex items-start gap-3 mb-6">
                <div className="w-1 h-[43px] rounded-full bg-sett-primary shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D]">
                    {t.generalConfig.pricingRules}
                  </h3>
                  <p className="font-montserrat text-[14px] font-normal leading-none text-[#4A4A4A]">
                    {t.generalConfig.pricingRulesDesc}
                  </p>
                </div>
              </div>

              {/* Markup Field — preset Select + free-text Input. Both write
                  to the same `markup` state, so picking a preset fills the
                  input and typing in the input deselects the preset (the
                  Select snaps to "" — its blank/custom row). */}
              <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  label={t.generalConfig.defaultMarkupPreset}
                  value={MARKUP_PRESETS.includes(canonicalMarkup ?? '') ? (canonicalMarkup ?? '') : ''}
                  onChange={(e) => setMarkup(e.target.value)}
                  options={[
                    { value: '', label: '—' },
                    ...MARKUP_PRESETS.map((v) => ({ value: v, label: `${v} %` })),
                  ]}
                />
                {/* Shared Input — brand-spec border, focus glow, error
                    state, label, and the new `suffix` prop for the % glyph
                    all come from one component. */}
                <Input
                  label={t.generalConfig.defaultMarkupCustom}
                  type="text"
                  inputMode="decimal"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  placeholder="e.g. 18.5"
                  error={isInvalid ? t.generalConfig.defaultMarkupRangeError : undefined}
                  suffix="%"
                />
              </div>

              {/* Hint */}
              <div className="flex items-center gap-1.5 mb-6">
                <Info className="w-3.5 h-3.5 text-sett-text-accent shrink-0" />
                <p className="font-montserrat text-[12px] font-normal text-sett-text-accent">
                  {t.generalConfig.defaultMarkupHint}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-sett-border-light mb-5" />

              {/* Save Button — right aligned */}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={saving}
                  disabled={canonicalMarkup === null}
                >
                  {t.generalConfig.save}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
