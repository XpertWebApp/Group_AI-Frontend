'use client';

import { useState, useEffect, useRef, forwardRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ChevronDown, X as XIcon } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StepperNav } from '@/components/ui/StepperNav';
import { RoomCounter } from '@/components/ui/RoomCounter';
import { PhoneInputSplit } from '@/components/ui/PhoneInputSplit';
import { Spinner } from '@/components/ui/Loader';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { NationalityPicker } from '@/components/ui/NationalityPicker';
import { cn } from '@/lib/utils/cn';
import { destinationsApi, getCountryName } from '@/lib/api/destinations';
import type { Destination } from '@/lib/api/destinations';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { translations } from '@/lib/i18n/translations';
import { settingsApi, type PoliciesSettings } from '@/lib/api/settings';
import {
  AGE_REQUIRED_GROUP_TYPES,
  AVERAGE_AGE_MAX,
  AVERAGE_AGE_MIN,
  buildGroupTypeOptions,
  groupTypeRequiresAge,
} from '@/lib/utils/groupType';
import { FreeCancellationDateBanner } from '@/components/ui/FreeCancellationDateBanner';
import { OdooCompanyPicker } from '@/components/forms/OdooCompanyPicker';
import { detectCountryCode } from '@/lib/constants/countryCodes';

interface FormData {
  // Step 1: Trip Details
  destinationId: number;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  /** Multi-select hotel category codes ("1".."5"). Empty = none ticked yet. */
  hotelCategories: string[];
  budgetRange: string;
  groupType: string;
  groupSize: string;
  averageAge: number | '';
  /** WBE ISO-like nationality code (e.g. 'DE'). Required by the BE per
   *  public/nationality-change-fe.md to stop the silent 'HU' default. */
  nationalityCode: string | null;
  // Step 2: Room & Accommodations
  singleRooms: number;
  doubleRooms: number;
  standardDoubleBeds: number;
  twinBeds: number;
  tripleRooms: number;
  quadrupleRooms: number;
  extraRooms: string;
  breakfastPreference: 'with' | 'without';
  hotelLocation: 'central' | 'outside';
  specialRequestsRooms: string;
  // Step 3: Customer Details
  companyName: string;
  // Linked Odoo `res.partner` id (null until staff picks a match in the
  // OdooCompanyPicker). Required at send-offer time post-cutover.
  odooContactId: number | null;
  nameListFile: File | null;
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  specialRequestsCustomer: string;
  // Step 4: Policies
  termsAndConditions: string;
  cancellationConditions: string;
}

const defaultFormData: FormData = {
  destinationId: 0,
  destination: '',
  checkInDate: '',
  checkOutDate: '',
  hotelCategories: [],
  budgetRange: '',
  groupType: '',
  groupSize: '',
  averageAge: '',
  nationalityCode: null,
  singleRooms: 0,
  doubleRooms: 0,
  standardDoubleBeds: 0,
  twinBeds: 0,
  tripleRooms: 0,
  quadrupleRooms: 0,
  extraRooms: '',
  breakfastPreference: 'with',
  hotelLocation: 'central',
  specialRequestsRooms: '',
  companyName: '',
  odooContactId: null,
  nameListFile: null,
  firstName: '',
  lastName: '',
  email: '',
  phoneCountryCode: '+44',
  phone: '',
  specialRequestsCustomer: '',
  // Defaults for the policy editors are seeded at mount-time from the current
  // locale via an effect inside the page component (see below). Left blank
  // here so the i18n layer is the single source of truth for the boilerplate.
  termsAndConditions: '',
  cancellationConditions: '',
};

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5 animate-sidebar-fade-up" />
      <div className="animate-sidebar-fade-up" style={{ animationDelay: '80ms' }}>
        <h2 className="text-heading-sm font-bold text-sett-text-primary">{title}</h2>
        <p className="text-body text-sett-text-accent mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function RadioOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 p-3 rounded-[14px] border font-montserrat text-[14px] font-normal leading-normal flex-1',
        'transition-all duration-180 ease-sett-out active:scale-[0.97]',
        selected
          ? 'border-sett-primary/40 bg-sett-light-green-bg text-sett-text-primary shadow-[0_2px_8px_0_rgba(170,199,55,0.18)]'
          : 'border-sett-border-light bg-white text-sett-text-primary hover:border-sett-primary/40 hover:bg-sett-light-green-bg/30'
      )}
    >
      {selected ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" className="w-[14px] h-[14px] shrink-0">
          <path fillRule="evenodd" clipRule="evenodd" d="M7.00008 1.1665C3.77833 1.1665 1.16675 3.77809 1.16675 6.99984C1.16675 10.2216 3.77833 12.8332 7.00008 12.8332C10.2218 12.8332 12.8334 10.2216 12.8334 6.99984C12.8334 3.77809 10.2218 1.1665 7.00008 1.1665ZM7.00008 4.6665C6.38124 4.6665 5.78775 4.91234 5.35017 5.34992C4.91258 5.78751 4.66675 6.381 4.66675 6.99984C4.66675 7.61868 4.91258 8.21217 5.35017 8.64975C5.78775 9.08734 6.38124 9.33317 7.00008 9.33317C7.61892 9.33317 8.21241 9.08734 8.65 8.64975C9.08758 8.21217 9.33341 7.61868 9.33341 6.99984C9.33341 6.381 9.08758 5.78751 8.65 5.34992C8.21241 4.91234 7.61892 4.6665 7.00008 4.6665Z" fill="#AAC737"/>
        </svg>
      ) : (
        <span className="w-[14px] h-[14px] shrink-0 rounded-full border-2 border-sett-text-accent" />
      )}
      {label}
    </button>
  );
}

type FieldErrors = Record<string, string>;

// Email regex — local part must accept the RFC 5322 sub-delimiters that
// real users actually put in their addresses. Prior version omitted `+`
// and rejected plus-addressed emails like `claude+h3-gamma@s-e-t-t.com`,
// which is the mainstream "tag your address per-service" pattern. Kept
// aligned with the permissive validator in SendOfferDualPreviewModal so
// an address accepted at Send time also passes here at Create time.
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Computes 0–1 completion of the current step based on the same required fields
 * used by validateStep. Kept in lockstep with validateStep so the visual progress
 * never disagrees with the validator that gates the Next button.
 */
function getStepProgress(step: number, data: FormData): number {
  const checks: boolean[] = [];

  if (step === 0) {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0];
    checks.push(!!data.destination.trim());
    checks.push(
      !!data.checkInDate && data.checkInDate >= today && data.checkInDate <= maxDate
    );
    checks.push(
      !!data.checkOutDate &&
      data.checkOutDate >= today &&
      data.checkOutDate <= maxDate &&
      (!data.checkInDate || data.checkOutDate > data.checkInDate)
    );
    checks.push(data.hotelCategories.length > 0);
    checks.push(!!data.groupType);
    checks.push(!!data.groupSize.trim() && Number(data.groupSize) > 0);
    if (groupTypeRequiresAge(data.groupType)) {
      const age = Number(data.averageAge);
      checks.push(data.averageAge !== '' && data.averageAge != null && age >= AVERAGE_AGE_MIN && age <= AVERAGE_AGE_MAX);
    }
  }

  if (step === 1) {
    const totalRooms = data.singleRooms + data.doubleRooms + data.tripleRooms + data.quadrupleRooms;
    checks.push(totalRooms >= 1);
    if (data.doubleRooms > 0) {
      checks.push(data.standardDoubleBeds + data.twinBeds === data.doubleRooms);
    }
    const guestCapacity =
      data.singleRooms * 1 +
      data.standardDoubleBeds * 2 +
      data.twinBeds * 2 +
      data.tripleRooms * 3 +
      data.quadrupleRooms * 4;
    const groupSize = Number(data.groupSize);
    if (groupSize > 0) {
      checks.push(guestCapacity >= groupSize);
    }
  }

  if (step === 2) {
    checks.push(!!data.companyName.trim());
    checks.push(!!data.firstName.trim());
    checks.push(!!data.lastName.trim());
    checks.push(
      !!data.email.trim() &&
      EMAIL_RE.test(data.email)
    );
    checks.push(!!data.phone.trim() && data.phone.length >= 7 && data.phone.length <= 15);
  }

  if (step === 3) {
    // Policies have sensible defaults — count as fully complete.
    return 1;
  }

  if (checks.length === 0) return 0;
  const passed = checks.filter(Boolean).length;
  return passed / checks.length;
}

// Attachment limits — must mirror the backend (attachments.controller.ts) so
// we block oversized/wrong-type files on the client with a clear message
// instead of a raw 413/415 from the server. Note: the live nginx also needs
// `client_max_body_size` raised (see the BE handover) for 1–10 MB files to
// actually reach the API — this guard is complementary, not a replacement.
// Max upload size in MB. The API accepts 10 MB, BUT the live nginx proxy caps
// the request body at its 1 MB default and 413s anything larger BEFORE it
// reaches the API. So we cap the FE at what the server actually accepts — the
// user gets a clear "too large" message instead of a 413, and no oversized
// request is ever sent. Configurable via NEXT_PUBLIC_MAX_UPLOAD_MB: once nginx's
// client_max_body_size is raised (see attachment-413-nginx-infra-handover.md),
// set NEXT_PUBLIC_MAX_UPLOAD_MB=10 to use the full API limit.
const MAX_ATTACHMENT_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB) || 1;
const MAX_ATTACHMENT_SIZE = MAX_ATTACHMENT_MB * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Returns a localized error message if the file is too big or the wrong type,
 *  otherwise null. Mirrors the backend allow-list. */
function validateAttachmentFile(file: File, t: ReturnType<typeof useLanguage>['t']): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return t.createForm.fileTooLarge
      .replace('{name}', file.name)
      .replace('{size}', (file.size / 1024 / 1024).toFixed(1))
      .replace('{max}', String(MAX_ATTACHMENT_MB));
  }
  // Some browsers report an empty type for uncommon files; the backend still
  // validates, so only reject when a type is present and not allowed.
  if (file.type && !ALLOWED_ATTACHMENT_MIME.includes(file.type)) {
    return t.createForm.fileTypeNotAllowed.replace('{name}', file.name);
  }
  return null;
}

function validateStep(step: number, data: FormData, t: ReturnType<typeof useLanguage>['t']): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!data.destination.trim()) {
      errors.destination = t.createForm.destinationRequired;
    }
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0];
    if (!data.checkInDate) {
      errors.checkInDate = t.createForm.checkInRequired;
    } else if (data.checkInDate < today) {
      errors.checkInDate = t.createForm.checkInPastDate;
    } else if (data.checkInDate > maxDate) {
      errors.checkInDate = t.createForm.dateTooFarInFuture;
    }
    if (!data.checkOutDate) {
      errors.checkOutDate = t.createForm.checkOutRequired;
    } else if (data.checkOutDate < today) {
      errors.checkOutDate = t.createForm.checkOutPastDate;
    } else if (data.checkOutDate > maxDate) {
      errors.checkOutDate = t.createForm.dateTooFarInFuture;
    }
    if (data.checkInDate && data.checkOutDate && data.checkOutDate <= data.checkInDate) {
      errors.checkOutDate = t.createForm.checkOutAfterCheckIn;
    }
    if (data.hotelCategories.length === 0) {
      errors.hotelCategories = t.createForm.hotelCategoryRequired;
    }
    if (!data.groupType) errors.groupType = t.createForm.groupTypeRequired;
    if (!data.groupSize.trim()) {
      errors.groupSize = t.createForm.groupSizeRequired;
    } else if (Number(data.groupSize) <= 0) {
      errors.groupSize = t.createForm.groupSizePositive;
    }
    if (groupTypeRequiresAge(data.groupType)) {
      if (data.averageAge === '' || data.averageAge == null) {
        errors.averageAge = t.createForm.averageAgeRequired;
      } else if (Number(data.averageAge) < AVERAGE_AGE_MIN || Number(data.averageAge) > AVERAGE_AGE_MAX) {
        errors.averageAge = t.createForm.averageAgeInvalid;
      }
    }
    if (!data.nationalityCode) {
      errors.nationalityCode = t.nationality.required;
    }
  }

  if (step === 1) {
    const totalRooms = data.singleRooms + data.doubleRooms + data.tripleRooms + data.quadrupleRooms;
    if (totalRooms < 1) errors.rooms = t.createForm.selectAtLeastOneRoom;
    if (data.doubleRooms > 0) {
      if (data.standardDoubleBeds + data.twinBeds !== data.doubleRooms) {
        errors.bedConfig = t.createForm.bedConfigRequired.replace(/{count}/g, String(data.doubleRooms));
      }
    }
    const guestCapacity = data.singleRooms * 1 + data.standardDoubleBeds * 2 + data.twinBeds * 2
      + data.tripleRooms * 3 + data.quadrupleRooms * 4;
    const groupSize = Number(data.groupSize);
    if (groupSize > 0 && guestCapacity > 0 && guestCapacity < groupSize) {
      errors.rooms = t.createForm.capacityTooSmall
        .replace('{capacity}', String(guestCapacity))
        .replace('{groupSize}', String(groupSize));
    }
  }

  if (step === 2) {
    if (!data.companyName.trim()) errors.companyName = t.createForm.companyNameRequired;
    if (!data.firstName.trim()) errors.firstName = t.createForm.firstNameRequired;
    if (!data.lastName.trim()) errors.lastName = t.createForm.lastNameRequired;
    if (!data.email.trim()) {
      errors.email = t.createForm.emailRequired;
    } else if (!EMAIL_RE.test(data.email)) {
      errors.email = t.createForm.invalidEmail;
    }
    if (!data.phone.trim()) {
      errors.phone = t.createForm.phoneRequired;
    } else if (data.phone.length < 7 || data.phone.length > 15) {
      errors.phone = t.createForm.invalidPhone;
    }
  }

  return errors;
}

export default function CreateBookingRequestPage() {
  return (
    <Suspense fallback={null}>
      <CreateBookingRequestPageInner />
    </Suspense>
  );
}

const SESSION_KEY = 'createFormSession';

function CreateBookingRequestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();
  // Both translations bundles, so we can detect "field still contains the
  // OTHER locale's default" and re-seed on language switch without
  // overwriting any edits the user has typed.
  const enTranslations = translations.en.createForm;
  const deTranslations = translations.de.createForm;
  // Live T&C + Cancellation defaults from Settings → Policies. Loaded
  // once on mount; the seeding effect below prefers these over the i18n
  // boilerplate so the admin's edits in Settings drive the Create
  // Request form. Stays null while loading and on fetch failure — the
  // i18n boilerplate kicks in as a fallback in both cases.
  const [policies, setPolicies] = useState<PoliciesSettings | null>(null);
  useEffect(() => {
    let cancelled = false;
    settingsApi.getPolicies()
      .then((data) => { if (!cancelled) setPolicies(data); })
      .catch(() => { /* silent — fall back to i18n boilerplate */ });
    return () => { cancelled = true; };
  }, []);
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const params = new URLSearchParams(window.location.search);
    if (params.get('draft')) return 0;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { step } = JSON.parse(saved);
        return typeof step === 'number' ? step : 0;
      }
    } catch {}
    return 0;
  });

  const STEPS = [
    { label: t.createForm.stepTripDetails, icon: '/icons/streamline-ultimate_trip-road.svg' },
    { label: t.createForm.stepRoomAccommodations, icon: '/icons/uil_bed.svg' },
    { label: t.createForm.stepCustomerDetails, icon: '/icons/boxicons_user.svg' },
    { label: t.createForm.stepPolicies, icon: '/icons/material-symbols_policy-outline-rounded.svg' },
  ];
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window === 'undefined') return defaultFormData;
    const params = new URLSearchParams(window.location.search);
    if (params.get('draft')) return defaultFormData;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        // Older drafts stored a single-value `hotelCategory: string`. Migrate
        // that into the new `hotelCategories: string[]` so the dropdown
        // pre-ticks correctly without throwing away the user's prior pick.
        const parsed = JSON.parse(saved) as { formData: Partial<FormData> & { hotelCategory?: string } };
        const savedForm = parsed.formData ?? {};
        const migratedCategories: string[] = Array.isArray(savedForm.hotelCategories)
          ? savedForm.hotelCategories
          : savedForm.hotelCategory
            ? [savedForm.hotelCategory]
            : [];
        return {
          ...defaultFormData,
          ...savedForm,
          hotelCategories: migratedCategories,
          nameListFile: null,
        };
      }
    } catch {}
    return defaultFormData;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  // When returning from summary page to edit a just-created request
  const [draftRequestId, setDraftRequestId] = useState<string | null>(null);

  // Track step transition direction for the slide animation:
  // 'forward' (Next) → slides in from right; 'back' (Back) → from left.
  // Initial mount uses 'forward' so the first step also slides in.
  const prevStepRef = useRef<number>(currentStep);
  const stepDirection: 'forward' | 'back' =
    currentStep >= prevStepRef.current ? 'forward' : 'back';
  useEffect(() => {
    prevStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    const draft = searchParams.get('draft');
    if (!draft) return;
    try {
      const saved = sessionStorage.getItem(`createFormDraft_${draft}`);
      if (saved) {
        // Same legacy-field migration as the SESSION_KEY restore path above.
        const parsed = JSON.parse(saved) as Partial<FormData> & { hotelCategory?: string };
        const migratedCategories: string[] = Array.isArray(parsed.hotelCategories)
          ? parsed.hotelCategories
          : parsed.hotelCategory
            ? [parsed.hotelCategory]
            : [];
        setFormData({
          ...defaultFormData,
          ...parsed,
          hotelCategories: migratedCategories,
          nameListFile: null,
        });
        setDraftRequestId(draft);
      }
    } catch {
      // ignore parse errors
    }
  }, [searchParams]);

  // Continuously save step + formData so a reload can restore them
  useEffect(() => {
    if (draftRequestId) return; // submitted request uses its own key
    try {
      const { nameListFile: _file, ...serializableFormData } = formData;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step: currentStep, formData: serializableFormData }));
    } catch {
      // storage full — not critical
    }
  }, [currentStep, formData, draftRequestId]);

  // Seed (and re-seed on language toggle) the boilerplate text in the
  // policy editors.
  //
  // Source-of-truth precedence per BE handover:
  //   1. Live values from Settings → Policies (admin-edited), per locale
  //   2. i18n boilerplate fallback (used while policies are loading and
  //      if Settings has nothing saved)
  //
  // We only overwrite a field when it's empty OR currently holds one of
  // the recognised defaults (live or i18n, EN or DE). That preserves any
  // edit the user has actually typed across language switches and when
  // /settings/policies finishes loading mid-edit.
  useEffect(() => {
    setFormData((prev) => {
      const enTerms = policies?.termsConditionsEn || enTranslations.defaultTermsHtml;
      const deTerms = policies?.termsConditionsDe || deTranslations.defaultTermsHtml;
      const enCancel = policies?.cancellationConditionsEn || enTranslations.defaultCancellationHtml;
      const deCancel = policies?.cancellationConditionsDe || deTranslations.defaultCancellationHtml;
      const wantedTerms = locale === 'de' ? deTerms : enTerms;
      const wantedCancel = locale === 'de' ? deCancel : enCancel;

      // "Default" recognisers — include BOTH the i18n fallback and the
      // live policy values so we correctly identify the field as still
      // default after policies arrive (or after the locale flips).
      const termsDefaults = new Set([
        enTranslations.defaultTermsHtml,
        deTranslations.defaultTermsHtml,
        policies?.termsConditionsEn ?? '',
        policies?.termsConditionsDe ?? '',
      ]);
      const cancelDefaults = new Set([
        enTranslations.defaultCancellationHtml,
        deTranslations.defaultCancellationHtml,
        policies?.cancellationConditionsEn ?? '',
        policies?.cancellationConditionsDe ?? '',
      ]);

      const termsIsDefault = !prev.termsAndConditions || termsDefaults.has(prev.termsAndConditions);
      const cancelIsDefault = !prev.cancellationConditions || cancelDefaults.has(prev.cancellationConditions);

      if (!termsIsDefault && !cancelIsDefault) return prev;
      // Skip a no-op write — prevents the effect from re-rendering the
      // editors when nothing actually changed (avoids cursor jitter mid-edit).
      const nextTerms = termsIsDefault ? wantedTerms : prev.termsAndConditions;
      const nextCancel = cancelIsDefault ? wantedCancel : prev.cancellationConditions;
      if (nextTerms === prev.termsAndConditions && nextCancel === prev.cancellationConditions) return prev;
      return {
        ...prev,
        termsAndConditions: nextTerms,
        cancellationConditions: nextCancel,
      };
    });
  }, [locale, enTranslations, deTranslations, policies]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (attempted) {
        setErrors(validateStep(currentStep, next, t));
      }
      return next;
    });
  };

  const scrollToTop = () => {
    const main = document.querySelector('main');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    setAttempted(true);
    const stepErrors = validateStep(currentStep, formData, t);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      // Scroll to first error field
      setTimeout(() => {
        const firstError = document.querySelector('.text-sett-destructive');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    setAttempted(false);
    setErrors({});
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
      scrollToTop();
    }
  };

  const handleBack = () => {
    setAttempted(false);
    setErrors({});
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      scrollToTop();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { requestsApi } = await import('@/lib/api/requests');
      const payload = {
        // Step 1: Trip Details
        destinationId: formData.destinationId,
        destinationName: formData.destination,
        checkinDate: formData.checkInDate,
        checkoutDate: formData.checkOutDate || undefined,
        // Send both fields during the migration window. Backend prefers `starRatings`
        // when both are present; legacy single field stays for Wix-webhook compat.
        starRatings: formData.hotelCategories.length > 0
          ? formData.hotelCategories.map(Number).sort((a, b) => a - b)
          : undefined,
        starRating: formData.hotelCategories.length > 0
          ? Number(formData.hotelCategories[0])
          : undefined,
        budgetRange: formData.budgetRange || undefined,
        groupType: formData.groupType || undefined,
        groupSize: formData.groupSize ? Number(formData.groupSize) : undefined,
        averageAge: groupTypeRequiresAge(formData.groupType) && formData.averageAge !== ''
          ? Number(formData.averageAge)
          : undefined,
        currencyCode: 'EUR',
        // BE now requires nationality (no more silent 'HU' default).
        // The form blocks Submit when this is null, so the cast is safe.
        nationalityCode: formData.nationalityCode!,
        // Step 2: Room & Accommodations
        rooms: {
          single: formData.singleRooms,
          double: 0,
          twin: 0,
          standardDoubleBeds: formData.standardDoubleBeds,
          twinBeds: formData.twinBeds,
          triple: formData.tripleRooms,
          quadruple: formData.quadrupleRooms,
          suites: 0,
          extraRoomsNote: formData.extraRooms || undefined,
        },
        breakfastPreference: (formData.breakfastPreference === 'with' ? 'BB' : 'RO') as 'BB' | 'RO',
        hotelLocation: (formData.hotelLocation === 'central' ? 'central' : 'outside_city_center') as 'central' | 'outside_city_center',
        specialRequirements: formData.specialRequestsRooms || undefined,
        // Step 3: Customer Details
        companyName: formData.companyName,
        odooContactId: formData.odooContactId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        contactPhoneCountryCode: formData.phoneCountryCode || undefined,
        customerNotes: formData.specialRequestsCustomer || undefined,
        // Step 4: Policies
        termsAndConditions: formData.termsAndConditions?.replace(/<[^>]*>/g, '').trim() ? formData.termsAndConditions : undefined,
        cancellationConditions: formData.cancellationConditions?.replace(/<[^>]*>/g, '').trim() ? formData.cancellationConditions : undefined,
        status: 'pending' as const,
      };

      let requestId: string;
      if (draftRequestId) {
        // Returning from summary to edit — update the existing request
        await requestsApi.update(draftRequestId, payload);
        // Keep the draft key so the user can go back again from the summary page
        try {
          sessionStorage.setItem(`createFormDraft_${draftRequestId}`, JSON.stringify(formData));
        } catch { /* storage full — not critical */ }
        requestId = draftRequestId;
        toast.success(t.toasts.requestCreated);
      } else {
        // Fresh create
        const created = await requestsApi.create(payload);
        // Save form data so Back button on summary page can restore it
        try {
          sessionStorage.setItem(`createFormDraft_${created.id}`, JSON.stringify(formData));
        } catch { /* storage full — not critical */ }
        requestId = created.id;
        toast.success(t.toasts.requestCreated);
      }

      if (formData.nameListFile) {
        try {
          await requestsApi.uploadAttachments(requestId, [formData.nameListFile]);
        } catch (err) {
          // 413 = the server (nginx) rejected the body as too large — distinct
          // from a generic upload failure, so show a clearer message. The FE
          // already blocks >10MB; a 413 here means the server's body limit is
          // below the API's 10MB (infra: raise nginx client_max_body_size).
          const ax = await import('axios');
          const is413 = ax.isAxiosError(err) && err.response?.status === 413;
          toast.error(is413 ? t.toasts.fileTooLargeUpload : t.toasts.fileUploadFailed);
        }
      }

      sessionStorage.removeItem(SESSION_KEY);
      router.push(`/booking-requests/${requestId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create request';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header title={t.createForm.title} />

      <div className="p-4 md:p-6 space-y-6">
      <div className="animate-card-rise-in">
        <StepperNav
          steps={STEPS}
          currentStep={currentStep}
          stepProgress={getStepProgress(currentStep, formData)}
        />
      </div>

      <div
        className="bg-white rounded-[14px] border border-sett-border-light p-6 animate-card-rise-in"
        style={{ animationDelay: '200ms' }}
      >
        {/* Step content — re-keys on step change so the slide animation fires every transition.
            `relative z-10` is required because the entrance animations on this wrapper and on the
            bottom buttons row both create stacking contexts. Without this, the buttons (later in
            DOM order) paint over inline-rendered Select dropdowns inside the step content. */}
        <div
          key={`step-${currentStep}`}
          className={cn(
            'relative z-10',
            stepDirection === 'forward'
              ? 'animate-step-in-right'
              : 'animate-step-in-left'
          )}
        >
          {currentStep === 0 && (
            <TripDetailsStep formData={formData} updateField={updateField} errors={errors} />
          )}
          {currentStep === 1 && (
            <RoomAccommodationsStep formData={formData} updateField={updateField} errors={errors} />
          )}
          {currentStep === 2 && (
            <CustomerDetailsStep formData={formData} updateField={updateField} errors={errors} />
          )}
          {currentStep === 3 && (
            <PoliciesStep formData={formData} updateField={updateField} />
          )}
        </div>

        {submitError && (
          <div className="bg-sett-destructive/10 border border-sett-destructive/30 text-sett-destructive px-4 py-3 rounded-[14px] text-body mt-4 animate-sidebar-fade-up">
            {submitError}
          </div>
        )}

        {/* Horizontal Line */}
        <div className="w-full h-px bg-sett-border-light mt-6" />

        {/* Bottom Actions
            `relative z-0` keeps this row beneath any inline-rendered Select
            dropdown above (whose stacking context is on the step content
            wrapper at z-10).
            `gap-3` on the group + `flex-wrap` make the buttons breathe and
            wrap cleanly on narrow viewports rather than overflowing the
            card. On mobile the row stacks (Cancel on top, action group
            below) so a small touch target never gets clipped. */}
        <div
          className="relative z-0 flex flex-wrap items-center justify-between gap-3 pt-6 animate-sidebar-fade-up"
          style={{ animationDelay: '520ms' }}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); router.push('/booking-requests'); }}
          >
            {t.common.cancel}
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            {currentStep > 0 && (
              <Button variant="secondary" size="md" onClick={handleBack}>
                {t.common.back}
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button variant="primary" size="md" onClick={handleNext}>
                {t.common.next}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                {t.createForm.createRequestBtn}
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

/* ─────────────── Step 1: Trip Details ─────────────── */

interface StepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  errors: FieldErrors;
}

// §5.5 Form Inputs: border 1px solid #D0D0D0 (sett-border), radius 4px,
// focus: border #AAC737 + box-shadow 0 0 0 3px rgba(170,199,55,0.15)
const inputClass = (hasError: boolean) =>
  cn(
    'w-full p-3 rounded-input border bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent placeholder:font-montserrat placeholder:text-[14px] placeholder:font-normal placeholder:leading-normal focus:outline-none focus:border-sett-primary focus:shadow-input-focus',
    hasError ? 'border-sett-destructive' : 'border-sett-border'
  );

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-caption text-sett-destructive">{message}</p>;
}

function StarDisplay({ rating, label }: { rating: number; label: string }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const total = Math.ceil(rating);
  const empty = total - full - (half ? 1 : 0);
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <svg key={`f${i}`} width="14" height="14" viewBox="0 0 24 24" fill="#AAC737" className="shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        ))}
        {half && (
          <svg key="h" width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
            <defs><linearGradient id="half-grad-sc"><stop offset="50%" stopColor="#AAC737"/><stop offset="50%" stopColor="#D1D1D1"/></linearGradient></defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half-grad-sc)"/>
          </svg>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <svg key={`e${i}`} width="14" height="14" viewBox="0 0 24 24" fill="#D1D1D1" className="shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        ))}
      </span>
      <span className="text-sett-text-primary">{label}</span>
    </span>
  );
}

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ hasError, value, onClick, placeholder }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        value={value as string}
        onClick={onClick}
        onChange={() => {}}
        placeholder={placeholder}
        readOnly
        className={cn(inputClass(!!hasError), 'w-full pr-10 cursor-pointer')}
      />
      <span onClick={onClick} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAC737" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    </div>
  )
);
DateInput.displayName = 'DateInput';

function TripDetailsStep({ formData, updateField, errors }: StepProps) {
  const { t } = useLanguage();
  const [destQuery, setDestQuery] = useState(formData.destination);
  const [destResults, setDestResults] = useState<Destination[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const destWrapperRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);
  const userTypingRef = useRef(false);

  // Hotel-category multi-select dropdown state. Same UX pattern as AddServiceModal —
  // chips inside the trigger, checkbox dropdown below.
  const [hotelCatDropdownOpen, setHotelCatDropdownOpen] = useState(false);
  const hotelCatWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hotelCatDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (hotelCatWrapperRef.current && !hotelCatWrapperRef.current.contains(e.target as Node)) {
        setHotelCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [hotelCatDropdownOpen]);

  const toggleHotelCategory = (value: string) => {
    const next = formData.hotelCategories.includes(value)
      ? formData.hotelCategories.filter((v) => v !== value)
      : [...formData.hotelCategories, value].sort();
    updateField('hotelCategories', next);
  };

  // Sync destQuery when formData.destination is restored from sessionStorage draft
  useEffect(() => {
    if (formData.destination && !userTypingRef.current) {
      setDestQuery(formData.destination);
    }
  }, [formData.destination]);

  const hotelCategoryOptions = [
    { value: '1',   label: t.createForm.star1,   node: <StarDisplay rating={1}   label="1 Star" /> },
    { value: '2',   label: t.createForm.star2,   node: <StarDisplay rating={2}   label="2 Stars" /> },
    { value: '3',   label: t.createForm.star3,   node: <StarDisplay rating={3}   label="3 Stars" /> },
    { value: '4',   label: t.createForm.star4,   node: <StarDisplay rating={4}   label="4 Stars" /> },
    { value: '5',   label: t.createForm.star5,   node: <StarDisplay rating={5}   label="5 Stars" /> },
  ];
  const budgetRangeOptions = [
    { value: 'economy', label: t.createForm.economy },
    { value: 'standard', label: t.createForm.standard },
    { value: 'premium', label: t.createForm.premium },
    { value: 'luxury', label: t.createForm.luxury },
  ];
  // Canonical codes per backend handover: business | leisure | sports | youth |
  // school | family | wedding | mice | other. The Select sends the code as-is;
  // labels come from the i18n layer.
  const groupTypeOptions = buildGroupTypeOptions(t);

  useEffect(() => {
    if (!userTypingRef.current) return;

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (destQuery.length < 2) {
      setDestResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setDestLoading(true);
      try {
        const results = await destinationsApi.search(destQuery);
        setDestResults(results);
        setDestOpen(results.length > 0);
      } catch {
        setDestResults([]);
      } finally {
        setDestLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [destQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (destWrapperRef.current && !destWrapperRef.current.contains(e.target as Node)) {
        setDestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDestinationSelect = (dest: Destination) => {
    justSelectedRef.current = true;
    userTypingRef.current = false;
    setDestQuery(dest.name);
    updateField('destination', dest.name);
    updateField('destinationId', dest.id);
    setDestOpen(false);
    setDestResults([]);
  };

  const handleDestinationInputChange = (value: string) => {
    userTypingRef.current = true;
    setDestQuery(value);
    updateField('destination', value);
    updateField('destinationId', 0);
  };

  return (
    <>
      <SectionHeader
        title={t.createForm.tripDetailsTitle}
        subtitle={t.createForm.tripDetailsSubtitle}
      />
      <div className="space-y-4">
        {/* Destination — animate-field-fade-in uses opacity only (no transform),
            so neither this wrapper nor its siblings create a CSS stacking context.
            When the suggestions dropdown is open, the wrapper itself needs a high
            z-index so the absolute <ul> can float above sibling form fields below
            (same pattern as the shared Select component). */}
        <div
          ref={destWrapperRef}
          className={cn(
            'relative group animate-field-fade-in',
            destOpen && destResults.length > 0 && 'z-[9999]'
          )}
          style={{ animationDelay: '120ms' }}
        >
          <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
            {t.createForm.destination} <span className="text-sett-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder={t.createForm.destinationPlaceholder}
            value={destQuery}
            onChange={(e) => handleDestinationInputChange(e.target.value)}
            onFocus={() => { if (destResults.length > 0) setDestOpen(true); }}
            className={inputClass(!!errors.destination)}
          />
          {destOpen && destResults.length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-white border border-sett-border rounded-input shadow-lg max-h-60 overflow-y-auto">
              {destResults.map((dest, i) => (
                <li
                  key={dest.id}
                  onClick={() => handleDestinationSelect(dest)}
                  className="px-3 py-2 text-body cursor-pointer hover:bg-sett-fill transition-colors duration-150 animate-fade-in-right"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {dest.name} ({getCountryName(dest.countryCode)})
                </li>
              ))}
            </ul>
          )}
          {destLoading && (
            <div className="flex items-center gap-2 mt-1.5 animate-sidebar-fade-up">
              <Spinner size="sm" />
              <span className="text-caption text-sett-text-muted">{t.createForm.searching}</span>
            </div>
          )}
          <FieldError message={errors.destination} />
        </div>

        {/* Check-in / Check-out */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="animate-field-fade-in" style={{ animationDelay: '180ms' }}>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.checkInDate} <span className="text-sett-destructive">*</span>
            </label>
            <div className="sett-datepicker">
              <DatePicker
                selected={formData.checkInDate ? new Date(formData.checkInDate) : null}
                onChange={(date: Date | null) => updateField('checkInDate', date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '')}
                minDate={new Date()}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                dateFormat="dd.MM.yyyy"
                placeholderText="DD.MM.YYYY"
                popperClassName="sett-datepicker-popper"
                popperPlacement="bottom-end"
                portalId="sett-datepicker-portal"
                wrapperClassName="w-full"
                todayButton={t.addHotel.today}
                showPopperArrow={false}
                customInput={<DateInput hasError={!!errors.checkInDate} />}
              />
            </div>
            <FieldError message={errors.checkInDate} />
            {/* Passive hint — always visible below the field so the user is
                warned BEFORE picking a risky near-date. Sized + colored as
                proper helper text (12px navy/70) instead of the previous
                11px italic light-grey which read as nearly invisible. */}
            <p className="mt-1.5 font-montserrat text-[12px] font-medium leading-snug text-sett-text-primary/70">
              {t.createForm.checkInDateHint}
            </p>
          </div>
          <div className="animate-field-fade-in" style={{ animationDelay: '220ms' }}>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.checkOutDate} <span className="text-sett-destructive">*</span>
            </label>
            <div className="sett-datepicker">
              <DatePicker
                selected={formData.checkOutDate ? new Date(formData.checkOutDate) : null}
                onChange={(date: Date | null) => updateField('checkOutDate', date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '')}
                minDate={formData.checkInDate ? new Date(formData.checkInDate) : new Date()}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                dateFormat="dd.MM.yyyy"
                placeholderText="DD.MM.YYYY"
                popperClassName="sett-datepicker-popper"
                popperPlacement="bottom-end"
                portalId="sett-datepicker-portal"
                wrapperClassName="w-full"
                todayButton={t.addHotel.today}
                showPopperArrow={false}
                customInput={<DateInput hasError={!!errors.checkOutDate} />}
              />
            </div>
            <FieldError message={errors.checkOutDate} />
          </div>
        </div>

        {/* Free-cancellation contextual banner — appears only when the user has
            picked a check-in date within the next 14 days. The backend filters
            search results to free-cancellation rates only, so near-date requests
            return fewer hotels. We surface this to the user so they understand
            why their result set may be small (and can choose a later date if
            their group allows it). */}
        <FreeCancellationDateBanner checkInDate={formData.checkInDate} />

        {/* Hotel Category (multi-select dropdown) / Budget.
            Same UX pattern as the AddServiceModal: chips inside the trigger,
            checkbox dropdown below. Backend's ±1 relaxation widens further
            automatically — the helper text below the field explains this. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* When the dropdown is open, lift the wrapper's z-index so the
              panel renders above sibling form fields below (Group Type, etc.).
              Same pattern as the shared Select component — without this, the
              panel is painted behind later siblings on the page. */}
          <div
            className={cn(
              'animate-field-fade-in',
              hotelCatDropdownOpen && 'relative z-[9999]',
            )}
            style={{ animationDelay: '280ms' }}
            ref={hotelCatWrapperRef}
          >
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.hotelCategory} <span className="text-sett-destructive">*</span>
            </label>
            <div className="relative">
              {/* Trigger — shows selected categories as chips, or the placeholder */}
              <div
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={hotelCatDropdownOpen}
                aria-controls="hotel-category-listbox"
                tabIndex={0}
                onClick={() => setHotelCatDropdownOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setHotelCatDropdownOpen((v) => !v);
                  }
                }}
                className={cn(
                  // §5.5 brand-spec input: 4px radius + #E0E0E0 border, so
                  // Hotel Category visually matches the Check-in date input
                  // and the adjacent Budget Range / Group Type / Group Size
                  // fields on this form.
                  'w-full min-h-[44px] flex items-center flex-wrap gap-1.5 px-3 py-2 rounded-input border bg-white cursor-pointer transition-all duration-150',
                  errors.hotelCategories
                    ? 'border-sett-destructive'
                    : hotelCatDropdownOpen
                      ? 'border-sett-primary shadow-input-focus'
                      : 'border-sett-border hover:border-sett-primary/40',
                )}
              >
                {formData.hotelCategories.length === 0 ? (
                  <span className="font-montserrat text-[14px] font-normal text-sett-text-accent flex-1">
                    {t.createForm.selectHotelCategory}
                  </span>
                ) : (
                  <>
                    {hotelCategoryOptions
                      .filter((o) => formData.hotelCategories.includes(o.value))
                      .map((opt) => (
                        <span
                          key={opt.value}
                          // Hover micro-interaction: the chip lifts 1px,
                          // border deepens to full brand-primary, and a soft
                          // green shadow appears underneath — signals
                          // interactivity (and that the X is hit-able)
                          // without competing with the chip's selected state.
                          className="group/chip inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-sett-light-green-bg border border-sett-primary/30 font-montserrat text-[12px] font-semibold text-sett-primary leading-tight cursor-default transition-all duration-200 ease-sett-out hover:-translate-y-0.5 hover:border-sett-primary hover:shadow-[0_4px_12px_-2px_rgba(170,199,55,0.35)] hover:bg-sett-light-green-bg/80"
                        >
                          {opt.node}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHotelCategory(opt.value);
                            }}
                            // X button: pops slightly larger on chip hover so
                            // staff visually find it; rotates 90° + tints
                            // destructive red when hovered directly so the
                            // "this removes the selection" intent is obvious.
                            className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ease-sett-out group-hover/chip:scale-110 hover:bg-sett-destructive/10 hover:text-sett-destructive hover:rotate-90"
                            aria-label={`Remove ${opt.label}`}
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </>
                )}
                <ChevronDown
                  className={cn(
                    'shrink-0 w-4 h-4 ml-auto text-sett-text-muted transition-transform duration-200',
                    hotelCatDropdownOpen && 'rotate-180',
                  )}
                />
              </div>

              {/* Dropdown panel */}
              {hotelCatDropdownOpen && (
                <div
                  id="hotel-category-listbox"
                  role="listbox"
                  aria-multiselectable="true"
                  className="absolute z-20 w-full mt-1.5 bg-white border border-sett-border-light rounded-[14px] shadow-[0_8px_24px_0_rgba(0,0,0,0.12)] overflow-hidden animate-sidebar-fade-up"
                >
                  <div className="px-3.5 py-2.5 border-b border-sett-border-light">
                    <p className="font-montserrat text-[11px] font-semibold uppercase tracking-wide text-sett-text-accent">
                      {t.createForm.hotelCategory}
                    </p>
                  </div>
                  <div
                    className="max-h-[240px] overflow-y-auto py-1.5"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
                  >
                    {hotelCategoryOptions.map((opt) => {
                      const isSelected = formData.hotelCategories.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => toggleHotelCategory(opt.value)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3.5 py-2.5 font-montserrat text-[14px] transition-colors',
                            isSelected
                              ? 'bg-sett-light-green-bg text-sett-primary font-medium'
                              : 'text-sett-text-primary hover:bg-sett-fill',
                          )}
                        >
                          <span
                            className={cn(
                              'w-4 h-4 shrink-0 rounded-[4px] border flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-sett-primary border-sett-primary'
                                : 'bg-white border-sett-border',
                            )}
                          >
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {opt.node}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* Same helper-text treatment as the Check-in date hint — readable
                12px navy/70 instead of the previous faint italic. */}
            <p className="mt-1.5 font-montserrat text-[12px] font-medium leading-snug text-sett-text-primary/70">
              {t.createForm.hotelCategoryHint}
            </p>
            {errors.hotelCategories && (
              <p className="mt-1 text-caption text-sett-destructive">{errors.hotelCategories}</p>
            )}
          </div>
          <Select
            label={`${t.createForm.budgetRange} ${t.createForm.optional}`}
            options={budgetRangeOptions}
            value={formData.budgetRange}
            onChange={(e) => updateField('budgetRange', e.target.value)}
            placeholder={t.createForm.selectBudgetRange}
            className="animate-field-fade-in"
            style={{ animationDelay: '320ms' }}
            // §5.5 input style so Budget Range matches the Check-in date input
            // and the sibling fields on this form. Without these overrides the
            // shared Select defaults to a 14px radius + lighter border.
            // Height-pinned to 44px (with reduced vertical padding) so the
            // trigger lines up exactly with the Hotel Category multi-select
            // sibling on the same row.
            // Border color is no longer overridden here — the shared Select
            // now defaults to border-sett-border at rest and border-sett-primary
            // when open. Overriding it here was pinning the border to grey
            // even when open, defeating the focus highlight.
            triggerClassName="rounded-input h-[44px] !py-0"
          />
        </div>

        {/* Group Type / Group Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={`${t.createForm.groupType} *`}
            options={groupTypeOptions}
            value={formData.groupType}
            onChange={(e) => {
              const val = e.target.value;
              updateField('groupType', val);
              // Clear age unless the new group type requires it.
              if (!AGE_REQUIRED_GROUP_TYPES.has(val as never)) {
                updateField('averageAge', '');
              }
            }}
            placeholder={t.createForm.selectGroupType}
            error={errors.groupType}
            className="animate-field-fade-in"
            style={{ animationDelay: '380ms' }}
            // Border color is no longer overridden here — the shared Select
            // now defaults to border-sett-border at rest and border-sett-primary
            // when open. Overriding it here was pinning the border to grey
            // even when open, defeating the focus highlight.
            triggerClassName="rounded-input h-[44px] !py-0"
          />
          <div className="animate-field-fade-in" style={{ animationDelay: '420ms' }}>
            <Input
              label={`${t.createForm.groupSize} *`}
              type="number"
              min="1"
              placeholder={t.createForm.groupSizePlaceholder}
              value={formData.groupSize}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val === '' || Number(val) >= 0) updateField('groupSize', val);
              }}
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === '.') e.preventDefault(); }}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              error={errors.groupSize}
              // §5.5 input style so Group Size matches Group Type on the
              // same row — same 44px height (with reduced vertical padding)
              // and same brand-spec border/focus glow inherited from the
              // shared Input component.
              className="rounded-input h-[44px] !py-0"
            />
          </div>
        </div>

        {/* Average Age — conditional, slides in only for youth/school groups */}
        {groupTypeRequiresAge(formData.groupType) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="animate-field-fade-in">
              <Input
                label={`${t.createForm.averageAge} *`}
                type="number"
                min={AVERAGE_AGE_MIN}
                max={AVERAGE_AGE_MAX}
                placeholder={t.createForm.averageAgePlaceholder}
                value={formData.averageAge === '' ? '' : String(formData.averageAge)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateField('averageAge', '');
                  } else {
                    const num = Number(val);
                    if (num >= 0) {
                      updateField('averageAge', num);
                    }
                  }
                }}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                error={errors.averageAge}
              />
            </div>
          </div>
        )}

        {/* Nationality — required per BE handover
            (public/nationality-change-fe.md). Stops the silent WBE
            default-to-Hungarian rate-card bug. Pinned to the bottom of
            Step 1 so it sits with other trip-shaping fields rather than
            with customer data. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 mt-1">
          <div className="animate-field-fade-in" style={{ animationDelay: '120ms' }}>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.nationality.label} <span className="text-sett-destructive">*</span>
            </label>
            <NationalityPicker
              value={formData.nationalityCode}
              onChange={(code) => updateField('nationalityCode', code)}
              hasError={!!errors.nationalityCode}
            />
            {errors.nationalityCode && (
              <p className="mt-1 text-caption text-red-500">{errors.nationalityCode}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────── Step 2: Room & Accommodations ─────────────── */

function RoomAccommodationsStep({ formData, updateField, errors }: StepProps) {
  const { t } = useLanguage();
  return (
    <>
      <SectionHeader
        title={t.createForm.roomTitle}
        subtitle={t.createForm.roomSubtitle}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <RoomCounter
          label={t.createForm.singleRoom}
          value={formData.singleRooms}
          onChange={(v) => updateField('singleRooms', v)}
        />
        <RoomCounter
          label={t.createForm.doubleRoom}
          value={formData.doubleRooms}
          onChange={(v) => {
            updateField('doubleRooms', v);
            // If reducing double rooms, clamp sub-fields so they don't exceed the new total
            const currentSdb = formData.standardDoubleBeds;
            const currentTwin = formData.twinBeds;
            if (currentSdb + currentTwin > v) {
              // Preserve ratio as much as possible; reduce twin first, then standard
              const newTwin = Math.min(currentTwin, v);
              const newSdb = Math.min(currentSdb, v - newTwin);
              updateField('twinBeds', newTwin);
              updateField('standardDoubleBeds', newSdb);
            }
          }}
        />
        <RoomCounter
          label={t.createForm.tripleRoom}
          value={formData.tripleRooms}
          onChange={(v) => updateField('tripleRooms', v)}
        />
        <RoomCounter
          label={t.createForm.quadrupleRoom}
          value={formData.quadrupleRooms}
          onChange={(v) => updateField('quadrupleRooms', v)}
        />
      </div>
      <FieldError message={errors.rooms} />

      {/* Bed Configuration for Double Room */}
      {formData.doubleRooms > 0 && (
        <div className="mt-4 rounded-[14px] border border-sett-border-light bg-sett-fill p-5">
          <h3 className="font-montserrat text-[16px] font-semibold leading-normal text-sett-text-primary mb-4">
            {t.addHotel.selectBedConfiguration}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RoomCounter
              label={t.offer.standardDoubleBed}
              value={formData.standardDoubleBeds}
              onChange={(v) => updateField('standardDoubleBeds', v)}
              max={formData.doubleRooms - formData.twinBeds}
            />
            <RoomCounter
              label={t.offer.twinBed}
              value={formData.twinBeds}
              onChange={(v) => updateField('twinBeds', v)}
              max={formData.doubleRooms - formData.standardDoubleBeds}
            />
          </div>
          <FieldError message={errors.bedConfig} />
        </div>
      )}
      <div className="mb-4" />

      <div className="space-y-4">
        <div>
          <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
            {t.createForm.extraRooms} <span className="text-sett-text-accent">{t.createForm.optional}</span>
          </label>
          <textarea
            placeholder={t.createForm.extraRoomsPlaceholder}
            value={formData.extraRooms}
            onChange={(e) => updateField('extraRooms', e.target.value)}
            // §5.5 focus glow — same soft green box-shadow + brand-primary
            // border as Budget Range, Group Type, and the Hotel Category
            // trigger. Replaces the chunky Tailwind ring used previously.
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:border-sett-primary focus:shadow-input-focus transition-[border-color,box-shadow] duration-150 min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.breakfastPreference} <span className="text-sett-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <RadioOption
                label={t.createForm.withBreakfast}
                selected={formData.breakfastPreference === 'with'}
                onClick={() => updateField('breakfastPreference', 'with')}
              />
              <RadioOption
                label={t.createForm.withoutBreakfast}
                selected={formData.breakfastPreference === 'without'}
                onClick={() => updateField('breakfastPreference', 'without')}
              />
            </div>
          </div>
          <div>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.hotelLocation} <span className="text-sett-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <RadioOption
                label={t.createForm.centralLocation}
                selected={formData.hotelLocation === 'central'}
                onClick={() => updateField('hotelLocation', 'central')}
              />
              <RadioOption
                label={t.createForm.outsideCityCenter}
                selected={formData.hotelLocation === 'outside'}
                onClick={() => updateField('hotelLocation', 'outside')}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
            {t.createForm.specialRequests} <span className="text-sett-text-accent">{t.createForm.optional}</span>
          </label>
          <textarea
            placeholder={t.createForm.specialRequestsRoomPlaceholder}
            value={formData.specialRequestsRooms}
            onChange={(e) => updateField('specialRequestsRooms', e.target.value)}
            // §5.5 focus glow — same soft green box-shadow + brand-primary
            // border as Budget Range, Group Type, and the Hotel Category
            // trigger.
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:border-sett-primary focus:shadow-input-focus transition-[border-color,box-shadow] duration-150 min-h-[80px]"
          />
        </div>
      </div>
    </>
  );
}

/* ─────────────── Step 3: Customer Details ─────────────── */

function CustomerDetailsStep({ formData, updateField, errors }: StepProps) {
  const { t } = useLanguage();
  const [emailTouched, setEmailTouched] = useState(false);

  // Autofill provenance — remembers whether email / phone were populated
  // by the OdooCompanyPicker (vs typed by the user). When the picker is
  // later cleared or switched to a different company, we wipe ONLY the
  // fields that came from autofill — manually typed values stay.
  //
  // Refs (not state) because:
  //   1. No re-render needed when the flag flips
  //   2. The picker's onChange/onPicked callbacks can read/write without
  //      becoming reactive dependencies that re-run the effect
  const emailAutofilledRef = useRef(false);
  const phoneAutofilledRef = useRef(false);

  // Email validation precedence:
  //  - Field untouched → fall back to parent `errors.email` (set by the
  //    parent's validateStep on Submit attempts) so prior failed submits
  //    still surface their error.
  //  - Field touched + currently invalid → show the live client-side
  //    error message (empty / bad format).
  //  - Field touched + currently VALID → return undefined so any stale
  //    parent `errors.email` from a previous validateStep pass is
  //    cleared on screen. Without this, an autofilled or freshly-typed
  //    valid email kept showing "Enter a valid email address" because
  //    the function fell through to `errors.email`.
  const getEmailError = () => {
    if (!emailTouched) return errors.email;
    if (!formData.email.trim()) return t.createForm.emailRequired;
    if (!EMAIL_RE.test(formData.email)) return t.createForm.invalidEmail;
    return undefined;
  };
  const emailError = getEmailError();
  return (
    <>
      <SectionHeader
        title={t.createForm.customerTitle}
        subtitle={t.createForm.customerSubtitle}
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* §BackendGuidelines.md — live Odoo company picker. Replaces the
              previous plain free-text input. companyName + odooContactId are
              kept in form state and POSTed together. onPicked autofills
              Email + Phone from the Odoo row, but only when the fields are
              still empty — never overwrite staff input. */}
          <OdooCompanyPicker
            value={{ companyName: formData.companyName, odooContactId: formData.odooContactId }}
            onChange={(next) => {
              updateField('companyName', next.companyName);
              updateField('odooContactId', next.odooContactId);
              // When the picker is cleared (companyName === ''), wipe
              // any dependent fields that were autofilled by a prior
              // pick — but leave manually-typed values alone. Same
              // applies when the picker is reset to a different name
              // mid-search (odooContactId nulls but the user hasn't
              // re-picked yet).
              const isClearedOrUnlinked = !next.companyName.trim() || next.odooContactId == null;
              if (isClearedOrUnlinked) {
                if (emailAutofilledRef.current) {
                  updateField('email', '');
                  emailAutofilledRef.current = false;
                }
                if (phoneAutofilledRef.current) {
                  updateField('phone', '');
                  // Country code is presentational — keep whatever the
                  // user had set. Only the number portion was autofilled.
                  phoneAutofilledRef.current = false;
                }
              }
            }}
            onPicked={(row) => {
              // On a fresh pick, ALWAYS overwrite previously-autofilled
              // values. If the field has data that wasn't autofilled
              // (manual entry), respect it — the original "only when
              // empty" rule still applies for that case.
              const canOverwriteEmail =
                emailAutofilledRef.current || !formData.email.trim();
              if (canOverwriteEmail && row.email) {
                updateField('email', row.email);
                emailAutofilledRef.current = true;
                // Mark the field touched so the live validator runs
                // (and clears any stale "Enter a valid email address"
                // surfaced by a prior Submit attempt).
                setEmailTouched(true);
              }
              const canOverwritePhone =
                phoneAutofilledRef.current || !formData.phone.trim();
              if (canOverwritePhone && row.phone) {
                const split = detectCountryCode(row.phone);
                if (split) {
                  updateField('phoneCountryCode', split.code);
                  updateField('phone', split.number);
                } else {
                  updateField('phone', row.phone);
                }
                phoneAutofilledRef.current = true;
              }
            }}
            label={t.createForm.companyName}
            required
            error={errors.companyName}
          />
          <div>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.nameList}
            </label>
            {formData.nameListFile ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-input border border-sett-primary bg-sett-primary/5 text-body">
                <svg className="w-4 h-4 text-sett-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sett-text-primary truncate flex-1">{formData.nameListFile.name}</span>
                <button
                  type="button"
                  onClick={() => updateField('nameListFile', null)}
                  className="text-sett-text-accent hover:text-sett-destructive transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-input border border-dashed border-sett-border bg-white text-body text-sett-text-muted cursor-pointer hover:border-sett-primary transition-colors">
                <span className="text-sett-text-primary font-medium">+</span>
                {t.createForm.uploadFile}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    // Reset so picking the same file again after an error still
                    // fires onChange.
                    e.target.value = '';
                    if (!file) return;
                    const err = validateAttachmentFile(file, t);
                    if (err) {
                      toast.error(err);
                      return; // block: don't store the file, nothing gets uploaded
                    }
                    updateField('nameListFile', file);
                  }}
                />
              </label>
            )}
            <p className="mt-1.5 font-montserrat text-[11px] text-sett-text-muted">
              {t.createForm.fileHint.replace('{max}', String(MAX_ATTACHMENT_MB))}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.firstName} <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t.createForm.firstNamePlaceholder}
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              className={inputClass(!!errors.firstName)}
            />
            <FieldError message={errors.firstName} />
          </div>
          <div>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.lastName} <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t.createForm.lastNamePlaceholder}
              value={formData.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              className={inputClass(!!errors.lastName)}
            />
            <FieldError message={errors.lastName} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
              {t.createForm.emailAddress} <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t.createForm.emailPlaceholder}
              value={formData.email}
              onChange={(e) => { updateField('email', e.target.value); if (!emailTouched) setEmailTouched(true); }}
              onBlur={() => setEmailTouched(true)}
              className={inputClass(!!emailError)}
            />
            <FieldError message={emailError} />
          </div>
          <PhoneInputSplit
            countryCode={formData.phoneCountryCode}
            number={formData.phone}
            onCountryCodeChange={(code) => updateField('phoneCountryCode', code)}
            onNumberChange={(num) => updateField('phone', num)}
            error={errors.phone}
          />
        </div>

        <div>
          <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
            {t.createForm.specialRequests} <span className="text-sett-text-accent">{t.createForm.optional}</span>
          </label>
          <textarea
            placeholder={t.createForm.specialRequestsCustomerPlaceholder}
            value={formData.specialRequestsCustomer}
            onChange={(e) => updateField('specialRequestsCustomer', e.target.value)}
            // §5.5 focus glow — same soft green box-shadow + brand-primary
            // border as the Room & Accommodations textareas and Budget Range.
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:border-sett-primary focus:shadow-input-focus transition-[border-color,box-shadow] duration-150 min-h-[80px]"
          />
        </div>
      </div>
    </>
  );
}

/* ─────────────── Step 4: Policies ─────────────── */

function PoliciesStep({
  formData,
  updateField,
}: {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      <SectionHeader
        title={t.createForm.policiesTitle}
        subtitle={t.createForm.policiesSubtitle}
      />
      <div className="space-y-6">
        <div>
          <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
            {t.createForm.termsAndConditions}
          </label>
          <RichTextEditor
            value={formData.termsAndConditions}
            onChange={(val) => updateField('termsAndConditions', val)}
            minHeight="160px"
          />
        </div>

        <div>
          <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
            {t.createForm.cancellationConditions}
          </label>
          <RichTextEditor
            value={formData.cancellationConditions}
            onChange={(val) => updateField('cancellationConditions', val)}
            minHeight="120px"
          />
        </div>
      </div>
    </>
  );
}
