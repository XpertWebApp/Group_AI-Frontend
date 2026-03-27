'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi } from '@/lib/api/settings';

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

  const handleSave = async () => {
    const num = parseInt(markup, 10);
    if (isNaN(num) || num < 0 || num > 100) return;
    setSaving(true);
    try {
      await settingsApi.updateGeneral({ defaultMarkupPercentage: String(num) });
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

              {/* Markup Field */}
              <div className="mb-4">
                <Select
                  label={t.generalConfig.defaultMarkup}
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  options={Array.from({ length: 101 }, (_, i) => ({
                    value: String(i),
                    label: `${i} %`,
                  }))}
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
