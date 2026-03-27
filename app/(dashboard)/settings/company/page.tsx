'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi, type CompanySettings } from '@/lib/api/settings';

const EMPTY: CompanySettings = {
  companyName: '', assignedPerson: '', emailAddress: '', phoneNumber: '', website: '', taxId: '', address: '',
};

export default function CompanyDetailsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<CompanySettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsApi.getCompany()
      .then((data) => { if (!cancelled) setForm(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (field: keyof CompanySettings, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateCompany(form);
      toast.success(t.toasts.settingsSaved);
    } catch {
      // handled by api client
    } finally {
      setSaving(false);
    }
  };

  const canSave = Object.values(form).every((v) => v.trim() !== '');

  const inputCls = 'w-full h-[41px] px-3 rounded-[14px] border border-sett-border-light font-montserrat text-[14px] text-sett-text-primary placeholder:text-[#A3A3A3] focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary';
  const labelCls = 'font-montserrat text-[12px] font-semibold uppercase tracking-wider text-sett-text-primary';

  const fields: { key: keyof CompanySettings; label: string; placeholder: string; type?: string }[] = [
    { key: 'companyName', label: t.companyDetails.companyName, placeholder: t.companyDetails.companyNamePlaceholder },
    { key: 'assignedPerson', label: t.companyDetails.assignedPerson, placeholder: t.companyDetails.assignedPersonPlaceholder },
    { key: 'emailAddress', label: t.companyDetails.emailAddress, placeholder: t.companyDetails.emailAddressPlaceholder, type: 'email' },
    { key: 'phoneNumber', label: t.companyDetails.phoneNumber, placeholder: t.companyDetails.phoneNumberPlaceholder, type: 'tel' },
    { key: 'website', label: t.companyDetails.website, placeholder: t.companyDetails.websitePlaceholder, type: 'url' },
    { key: 'taxId', label: t.companyDetails.taxId, placeholder: t.companyDetails.taxIdPlaceholder },
    { key: 'address', label: t.companyDetails.address, placeholder: t.companyDetails.addressPlaceholder },
  ];

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
            {t.companyDetails.back}
          </button>
          <h2 className="font-montserrat text-[22px] font-semibold leading-none text-sett-text-primary">
            {t.companyDetails.title}
          </h2>
        </div>

        <div className="max-w-[600px] rounded-[14px] border border-sett-border-light bg-white p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.08)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className={labelCls}>{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}

              <p className="font-montserrat text-[12px] text-sett-text-accent">
                {t.companyDetails.hint}
              </p>

              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={saving}
                disabled={!canSave}
              >
                {t.companyDetails.save}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
