'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';

import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { translations } from '@/lib/i18n/translations';
import { settingsApi, type PoliciesSettings } from '@/lib/api/settings';
import { cn } from '@/lib/utils/cn';

const EMPTY: PoliciesSettings = {
  termsConditionsEn: '', termsConditionsDe: '', cancellationConditionsEn: '', cancellationConditionsDe: '',
};

// Same i18n defaults the Create Request page uses to seed its inline
// policies block. Pulled out as a module-level constant so fetchData
// can replace empty BE values with these — that way the Policies page
// reflects what the user actually sees applied in offers / requests,
// instead of showing "—" while Create Request shows full bullet lists.
// Without this, QA reported that clicking Edit Policies opened editors
// with no previous text — when in reality those policies (the defaults)
// were live everywhere else.
const DEFAULT_POLICIES: PoliciesSettings = {
  termsConditionsEn: translations.en.createForm.defaultTermsHtml,
  termsConditionsDe: translations.de.createForm.defaultTermsHtml,
  cancellationConditionsEn: translations.en.createForm.defaultCancellationHtml,
  cancellationConditionsDe: translations.de.createForm.defaultCancellationHtml,
};

/**
 * Replaces empty/whitespace-only fields in the BE response with the
 * locale-matched default. Saved BE values always win — defaults only
 * fill the gaps. Keeps each field independent so a user who has
 * customised only EN doesn't get their DE customisation overwritten.
 */
function withDefaults(data: PoliciesSettings): PoliciesSettings {
  const fill = (v: string, fallback: string) => (v && v.trim() ? v : fallback);
  return {
    termsConditionsEn: fill(data.termsConditionsEn, DEFAULT_POLICIES.termsConditionsEn),
    termsConditionsDe: fill(data.termsConditionsDe, DEFAULT_POLICIES.termsConditionsDe),
    cancellationConditionsEn: fill(data.cancellationConditionsEn, DEFAULT_POLICIES.cancellationConditionsEn),
    cancellationConditionsDe: fill(data.cancellationConditionsDe, DEFAULT_POLICIES.cancellationConditionsDe),
  };
}

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
      // Backfill any empty fields with the same i18n defaults that the
      // Create Request page falls back to. The user expects "the
      // policies they see in offers" to be what they're editing here.
      const filled = withDefaults(data);
      setForm(filled);
      setOriginalForm(filled);
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
          {/* Header — title + description on the left, prominent labelled
              Edit button on the right. Icon-only affordances were too easy
              to miss; a properly labelled CTA is the standard pattern for
              "this surface is editable, start here". */}
          <div className="p-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start min-w-0" style={{ gap: 12 }}>
              <div className="shrink-0" style={{ width: 4, height: 43, borderRadius: 9999, background: '#AAC737' }} />
              <div className="flex flex-col min-w-0" style={{ gap: 4 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-montserrat font-semibold text-[18px] leading-none text-[#1D1D1D]">
                    {t.policiesPage.title}
                  </h3>
                  {!editing ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sett-fill border border-sett-border font-montserrat text-[10px] font-semibold uppercase tracking-[0.05em] text-sett-text-secondary">
                      <Lock className="w-3 h-3" />
                      {t.policiesPage.readOnly}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sett-primary/15 border border-sett-primary/40 font-montserrat text-[10px] font-semibold uppercase tracking-[0.05em] text-sett-green-dark animate-badge-pulse">
                      <Pencil className="w-3 h-3" />
                      {t.policiesPage.editButton.replace(/ Policies| Richtlinien/i, '')}
                    </span>
                  )}
                </div>
                <p className="font-montserrat font-normal text-[14px] leading-snug" style={{ color: '#4A4A4A' }}>
                  {editing
                    ? t.policiesPage.editingHint.replace('{lang}', langTab === 'en' ? t.policiesPage.english : t.policiesPage.german)
                    : t.policiesPage.readOnlyHint}
                </p>
              </div>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="shrink-0 inline-flex items-center justify-center gap-2 h-[41px] px-4 rounded-lg bg-sett-primary text-sett-navy hover:bg-sett-green-dark hover:text-white font-montserrat text-[13px] font-bold uppercase tracking-[0.04em] shadow-[0_2px_8px_0_rgba(170,199,55,0.25)] transition-all duration-200 active:scale-95 whitespace-nowrap"
              >
                <Pencil className="w-4 h-4" />
                {t.policiesPage.editButton}
              </button>
            )}
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
                      <ReadOnlyField content={stripHtml(form[tcKey])} />
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
                      <ReadOnlyField content={stripHtml(form[cxlKey])} />
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

/* ─── ReadOnlyField — static, non-interactive display panel for read-only
 *  mode. It does NOT enter edit mode on click and shows no hover/focus
 *  affordance, so it can't be mistaken for a live input while the READ-ONLY
 *  badge is showing. Editing is reached only via the top-right EDIT POLICIES
 *  button. */
function ReadOnlyField({
  content,
}: {
  content: string;
}) {
  return (
    <div className="w-full min-h-[60px] rounded-[14px] bg-[#F7F7F7] border border-transparent">
      <span className="block px-3 py-3 font-montserrat text-[14px] text-[#1D1D1D] leading-relaxed">
        {content}
      </span>
    </div>
  );
}
