'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, SquarePen } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi, type CompanySettings } from '@/lib/api/settings';
import { cn } from '@/lib/utils/cn';

const EMPTY: CompanySettings = {
  companyName: '', assignedPerson: '', emailAddress: '', phoneNumber: '', website: '', taxId: '', address: '',
};

type FieldErrors = Partial<Record<keyof CompanySettings, string>>;

function validateForm(form: CompanySettings): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.companyName.trim()) errors.companyName = 'Company name is required';
  if (!form.assignedPerson.trim()) errors.assignedPerson = 'Assigned person is required';

  if (!form.emailAddress.trim()) {
    errors.emailAddress = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailAddress.trim())) {
    errors.emailAddress = 'Please enter a valid email address';
  }

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required';
  } else if (form.phoneNumber.replace(/[\s\-()]/g, '').length < 7) {
    errors.phoneNumber = 'Please enter a valid phone number';
  }

  if (!form.website.trim()) {
    errors.website = 'Website is required';
  } else if (!/^https?:\/\/.+\..+/.test(form.website.trim()) && !/^[a-zA-Z0-9].*\..+/.test(form.website.trim())) {
    errors.website = 'Please enter a valid URL';
  }

  if (!form.taxId.trim()) errors.taxId = 'Tax ID is required';
  if (!form.address.trim()) errors.address = 'Address is required';

  return errors;
}

export default function CompanyDetailsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<CompanySettings>(EMPTY);
  const [originalForm, setOriginalForm] = useState<CompanySettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<keyof CompanySettings>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getCompany();
      setForm(data);
      setOriginalForm(data);
    } catch {
      // handled by api client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const update = (field: keyof CompanySettings, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setTouched((prev) => new Set(prev).add(field));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleBlur = (field: keyof CompanySettings) => {
    const fieldErrors = validateForm(form);
    if (fieldErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  const handleSave = async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouched(new Set(Object.keys(form) as (keyof CompanySettings)[]));
      return;
    }

    setSaving(true);
    try {
      await settingsApi.updateCompany(form);
      setOriginalForm(form);
      setEditing(false);
      setErrors({});
      setTouched(new Set());
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
    setErrors({});
    setTouched(new Set());
  };

  const inputBase = 'w-full h-[41px] rounded-[14px] font-montserrat text-[14px] text-[#1D1D1D] placeholder:text-[#A3A3A3] focus:outline-none';

  const getInputCls = (field: keyof CompanySettings) =>
    cn(
      inputBase,
      editing
        ? errors[field]
          ? 'bg-white border border-[#FB2C36] focus:ring-2 focus:ring-[#FB2C36]/20'
          : 'bg-white border border-[#E6EAF0] focus:ring-2 focus:ring-sett-primary'
        : 'bg-[#F7F7F7] border-none'
    );

  const renderField = (f: { key: keyof CompanySettings; label: string; placeholder: string; type?: string }, fullWidth?: boolean) => {
    // Phone field — use PhoneInput in edit mode, plain input in view mode
    if (f.key === 'phoneNumber') {
      if (editing) {
        return (
          <div key={f.key} className="flex flex-col flex-1" style={{ gap: 6 }}>
            <label className="font-montserrat text-[14px] font-medium leading-none uppercase text-[#1D1D1D]">
              {f.label} <span className="text-[#FB2C36]">*</span>
            </label>
            <PhoneInput
              value={form.phoneNumber}
              onChange={(phone) => update('phoneNumber', phone)}
              error={errors.phoneNumber}
              placeholder="+1 234 567 8900"
              hideLabel
            />
          </div>
        );
      }
      // View mode — plain disabled input
    }

    return (
      <div key={f.key} className={cn('flex flex-col', !fullWidth && 'flex-1')} style={{ gap: 6 }}>
        <label className="font-montserrat text-[14px] font-medium leading-none uppercase text-[#1D1D1D]">
          {f.label} <span className="text-[#FB2C36]">*</span>
        </label>
        <input
          type={f.type || 'text'}
          value={form[f.key]}
          onChange={(e) => update(f.key, e.target.value)}
          onBlur={() => handleBlur(f.key)}
          placeholder={f.placeholder}
          disabled={!editing}
          className={getInputCls(f.key)}
          style={{ padding: 12 }}
        />
        {editing && errors[f.key] && (
          <p className="font-montserrat text-[12px] text-[#FB2C36]">{errors[f.key]}</p>
        )}
      </div>
    );
  };

  const pairedFields: { key: keyof CompanySettings; label: string; placeholder: string; type?: string }[][] = [
    [
      { key: 'companyName', label: t.companyDetails.companyName, placeholder: t.companyDetails.companyNamePlaceholder },
      { key: 'assignedPerson', label: t.companyDetails.assignedPerson, placeholder: t.companyDetails.assignedPersonPlaceholder },
    ],
    [
      { key: 'emailAddress', label: t.companyDetails.emailAddress, placeholder: t.companyDetails.emailAddressPlaceholder, type: 'email' },
      { key: 'phoneNumber', label: t.companyDetails.phoneNumber, placeholder: t.companyDetails.phoneNumberPlaceholder, type: 'tel' },
    ],
    [
      { key: 'website', label: t.companyDetails.website, placeholder: t.companyDetails.websitePlaceholder, type: 'url' },
      { key: 'taxId', label: t.companyDetails.taxId, placeholder: t.companyDetails.taxIdPlaceholder },
    ],
  ];
  const fullWidthField = { key: 'address' as keyof CompanySettings, label: t.companyDetails.address, placeholder: t.companyDetails.addressPlaceholder };

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
            {t.companyDetails.back}
          </button>
          <span className="text-[#E6EAF0]">|</span>
          <h2 className="font-montserrat font-medium text-[18px] leading-none text-[#1D1D1D]">
            {t.companyDetails.title}
          </h2>
        </div>

        <div className="rounded-[14px] bg-white" style={{ border: '1px solid #E6EAF0' }}>
          {/* Header */}
          <div className="p-5">
            <div className="flex items-start" style={{ gap: 12 }}>
              <div className="shrink-0" style={{ width: 4, height: 43, borderRadius: 9999, background: '#AAC737' }} />
              <div className="flex flex-col" style={{ gap: 4 }}>
                <div className="flex items-center" style={{ gap: 14 }}>
                  <h3 className="font-montserrat font-semibold text-[18px] leading-none text-[#1D1D1D]">
                    {t.companyDetails.title}
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
                  {t.companyDetails.description}
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
              <div className="flex flex-col" style={{ gap: 14 }}>
                {/* Paired rows */}
                {pairedFields.map((row, ri) => (
                  <div key={ri} className="flex justify-between" style={{ gap: 20 }}>
                    {row.map((f) => renderField(f))}
                  </div>
                ))}

                {/* Address — full width */}
                {renderField(fullWidthField, true)}

                {/* Action buttons — edit mode */}
                {editing && (
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      isLoading={saving}
                    >
                      {t.companyDetails.save}
                    </Button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2.5 rounded-[14px] font-montserrat text-[14px] font-semibold text-[#4A4A4A] border hover:bg-[#F7F7F7] transition-colors"
                      style={{ border: '1px solid #E6EAF0' }}
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
