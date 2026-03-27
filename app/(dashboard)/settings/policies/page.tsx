'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi, type PoliciesSettings } from '@/lib/api/settings';
import { cn } from '@/lib/utils/cn';

const EMPTY: PoliciesSettings = {
  termsConditionsEn: '', termsConditionsDe: '', cancellationConditionsEn: '', cancellationConditionsDe: '',
};

type LangTab = 'en' | 'de';

export default function PoliciesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<PoliciesSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [langTab, setLangTab] = useState<LangTab>('en');

  useEffect(() => {
    let cancelled = false;
    settingsApi.getPolicies()
      .then((data) => { if (!cancelled) setForm(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updatePolicies(form);
      toast.success(t.toasts.settingsSaved);
    } catch {
      // handled by api client
    } finally {
      setSaving(false);
    }
  };

  const tcKey = langTab === 'en' ? 'termsConditionsEn' : 'termsConditionsDe';
  const cxlKey = langTab === 'en' ? 'cancellationConditionsEn' : 'cancellationConditionsDe';

  const tabCls = (active: boolean) => cn(
    'px-4 py-2 rounded-t-[10px] font-montserrat text-[14px] font-semibold transition-colors',
    active ? 'bg-white text-sett-text-primary border border-sett-border-light border-b-white -mb-px' : 'text-sett-text-secondary hover:text-sett-text-primary'
  );

  return (
    <>
      <Header title={t.settings.title} />
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3.5 mb-6">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-1.5 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.policiesPage.back}
          </button>
          <h2 className="font-montserrat text-[22px] font-semibold leading-none text-sett-text-primary">
            {t.policiesPage.title}
          </h2>
        </div>

        <div className="rounded-[14px] border border-sett-border-light bg-white shadow-[0_4px_20px_0_rgba(0,0,0,0.08)]">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Language Tabs */}
              <div className="flex gap-1 px-6 pt-5 border-b border-sett-border-light">
                <button type="button" onClick={() => setLangTab('en')} className={tabCls(langTab === 'en')}>
                  {t.policiesPage.english}
                </button>
                <button type="button" onClick={() => setLangTab('de')} className={tabCls(langTab === 'de')}>
                  {t.policiesPage.german}
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Terms & Conditions */}
                <div className="space-y-2">
                  <label className="font-montserrat text-[12px] font-semibold uppercase tracking-wider text-sett-text-primary">
                    {t.policiesPage.termsConditions}
                  </label>
                  <RichTextEditor
                    value={form[tcKey]}
                    onChange={(val) => setForm((p) => ({ ...p, [tcKey]: val }))}
                    minHeight="180px"
                  />
                </div>

                {/* Cancellation Conditions */}
                <div className="space-y-2">
                  <label className="font-montserrat text-[12px] font-semibold uppercase tracking-wider text-sett-text-primary">
                    {t.policiesPage.cancellationConditions}
                  </label>
                  <RichTextEditor
                    value={form[cxlKey]}
                    onChange={(val) => setForm((p) => ({ ...p, [cxlKey]: val }))}
                    minHeight="180px"
                  />
                </div>

                <p className="font-montserrat text-[12px] text-sett-text-accent">
                  {t.policiesPage.hint}
                </p>

                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={saving}
                >
                  {t.policiesPage.save}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
