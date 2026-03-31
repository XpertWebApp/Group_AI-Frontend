'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, SquarePen } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';

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
  const [originalForm, setOriginalForm] = useState<PoliciesSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [langTab, setLangTab] = useState<LangTab>('en');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getPolicies();
      setForm(data);
      setOriginalForm(data);
    } catch {
      // handled by api client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updatePolicies(form);
      setOriginalForm(form);
      setEditing(false);
      toast.success(t.toasts.settingsSaved);
    } catch {
      // handled by api client
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(originalForm);
    setEditing(false);
  };

  const tcKey = langTab === 'en' ? 'termsConditionsEn' : 'termsConditionsDe';
  const cxlKey = langTab === 'en' ? 'cancellationConditionsEn' : 'cancellationConditionsDe';

  const tabCls = (active: boolean) => cn(
    'px-4 py-2 rounded-t-[10px] font-montserrat text-[14px] font-semibold transition-colors',
    active ? 'bg-white text-sett-text-primary border border-[#E6EAF0] border-b-white -mb-px' : 'text-[#A3A3A3] hover:text-sett-text-primary'
  );

  // Strip HTML tags for view mode display
  const stripHtml = (html: string) => {
    if (!html) return '—';
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return text || '—';
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
            className="flex items-center font-montserrat text-[14px] font-normal text-sett-text-secondary hover:text-sett-text-primary transition-colors"
            style={{ gap: 4 }}
          >
            <ArrowLeft className="w-[14px] h-[14px]" />
            {t.policiesPage.back}
          </button>
          <span className="text-[#E6EAF0]">|</span>
          <h2 className="font-montserrat font-medium text-[18px] leading-none text-[#1D1D1D]">
            {t.policiesPage.title}
          </h2>
        </div>

        {/* Main card */}
        <div className="rounded-[14px] bg-white" style={{ border: '1px solid #E6EAF0' }}>
          {/* Header */}
          <div className="p-5">
            <div className="flex items-start" style={{ gap: 12 }}>
              {/* Green accent line */}
              <div className="shrink-0" style={{ width: 4, height: 43, borderRadius: 9999, background: '#AAC737' }} />
              <div className="flex flex-col" style={{ gap: 4 }}>
                <div className="flex items-center" style={{ gap: 14 }}>
                  <h3 className="font-montserrat font-semibold text-[18px] leading-none text-[#1D1D1D]">
                    {t.policiesPage.title}
                  </h3>
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-sett-primary hover:text-sett-primary/70 transition-colors"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="font-montserrat font-normal text-[14px] leading-none" style={{ color: '#4A4A4A' }}>
                  {t.policiesPage.description}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="px-5 pb-5">
              <div style={{ borderTop: '1px solid #E6EAF0' }} className="pt-5">
                {/* Language Tabs */}
                <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid #E6EAF0' }}>
                  <button type="button" onClick={() => setLangTab('en')} className={tabCls(langTab === 'en')}>
                    {t.policiesPage.english}
                  </button>
                  <button type="button" onClick={() => setLangTab('de')} className={tabCls(langTab === 'de')}>
                    {t.policiesPage.german}
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Terms & Conditions */}
                  <div style={{ gap: 6 }} className="flex flex-col">
                    <label className="font-montserrat text-[14px] font-medium leading-none uppercase text-[#1D1D1D]">
                      {t.policiesPage.termsConditions}
                    </label>
                    {editing ? (
                      <RichTextEditor
                        value={form[tcKey]}
                        onChange={(val) => setForm((p) => ({ ...p, [tcKey]: val }))}
                        minHeight="180px"
                      />
                    ) : (
                      <div
                        className="w-full min-h-[60px] rounded-[14px] font-montserrat text-[14px] text-[#1D1D1D] leading-relaxed"
                        style={{ background: '#F7F7F7', padding: 12 }}
                      >
                        {stripHtml(form[tcKey])}
                      </div>
                    )}
                  </div>

                  {/* Cancellation Conditions */}
                  <div style={{ gap: 6 }} className="flex flex-col">
                    <label className="font-montserrat text-[14px] font-medium leading-none uppercase text-[#1D1D1D]">
                      {t.policiesPage.cancellationConditions}
                    </label>
                    {editing ? (
                      <RichTextEditor
                        value={form[cxlKey]}
                        onChange={(val) => setForm((p) => ({ ...p, [cxlKey]: val }))}
                        minHeight="180px"
                      />
                    ) : (
                      <div
                        className="w-full min-h-[60px] rounded-[14px] font-montserrat text-[14px] text-[#1D1D1D] leading-relaxed"
                        style={{ background: '#F7F7F7', padding: 12 }}
                      >
                        {stripHtml(form[cxlKey])}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {editing && (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex items-center justify-center rounded-[14px] font-montserrat text-[14px] font-semibold text-[#4A4A4A] hover:bg-[#F7F7F7] transition-colors"
                        style={{ width: 180, height: 44, border: '1px solid #E6EAF0' }}
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center justify-center rounded-[14px] font-montserrat text-[14px] font-semibold text-white disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-[3px] active:scale-95"
                        style={{ width: 180, height: 44, background: '#AAC737', boxShadow: '4px 4px 5px 0px #FFFFFF40 inset, 0px 8px 20px 0px #00000021' }}
                      >
                        {saving ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t.policiesPage.save}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
