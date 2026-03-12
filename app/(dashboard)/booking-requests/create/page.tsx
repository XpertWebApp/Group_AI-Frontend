'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StepperNav } from '@/components/ui/StepperNav';
import { RoomCounter } from '@/components/ui/RoomCounter';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Spinner } from '@/components/ui/Loader';
import { cn } from '@/lib/utils/cn';
import { destinationsApi } from '@/lib/api/destinations';
import type { Destination } from '@/lib/api/destinations';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface FormData {
  // Step 1: Trip Details
  destinationId: number;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  hotelCategory: string;
  budgetRange: string;
  groupType: string;
  groupSize: string;
  // Step 2: Room & Accommodations
  singleRooms: number;
  doubleRooms: number;
  tripleRooms: number;
  quadrupleRooms: number;
  extraRooms: string;
  breakfastPreference: 'with' | 'without';
  hotelLocation: 'central' | 'outside';
  specialRequestsRooms: string;
  // Step 3: Customer Details
  companyName: string;
  nameListFile: File | null;
  firstName: string;
  lastName: string;
  email: string;
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
  hotelCategory: '',
  budgetRange: '',
  groupType: '',
  groupSize: '',
  singleRooms: 0,
  doubleRooms: 0,
  tripleRooms: 0,
  quadrupleRooms: 0,
  extraRooms: '',
  breakfastPreference: 'with',
  hotelLocation: 'central',
  specialRequestsRooms: '',
  companyName: '',
  nameListFile: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  specialRequestsCustomer: '',
  termsAndConditions:
    '1. All prices are per person unless otherwise stated\n2. Prices are subject to availability at time of booking\n3. Full payment required 30 days before arrival\n4. Cancellation policy applies as per individual hotel terms\n5. Group rates are valid for minimum 10 participants\n6. Final room list required 14 days before arrival',
  cancellationConditions:
    'Cancellations made 14 days or more in advance of the event date will receive a 100% refund. Cancellations made within 7 days will incur a 50% fee.',
};

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
      <div>
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
        'flex items-center gap-2 px-4 py-3 rounded-input border text-body font-medium transition-colors flex-1',
        selected
          ? 'bg-sett-primary text-white border-sett-primary'
          : 'bg-white text-sett-text-primary border-sett-border hover:border-sett-primary'
      )}
    >
      <span
        className={cn(
          'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
          selected ? 'border-white' : 'border-sett-text-accent'
        )}
      >
        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}

type FieldErrors = Record<string, string>;

function validateStep(step: number, data: FormData, t: ReturnType<typeof useLanguage>['t']): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!data.destination.trim()) {
      errors.destination = t.createForm.destinationRequired;
    }
    if (!data.checkInDate) errors.checkInDate = t.createForm.checkInRequired;
    if (!data.checkOutDate) errors.checkOutDate = t.createForm.checkOutRequired;
    if (data.checkInDate && data.checkOutDate && data.checkOutDate <= data.checkInDate) {
      errors.checkOutDate = t.createForm.checkOutAfterCheckIn;
    }
  }

  if (step === 1) {
    const totalRooms = data.singleRooms + data.doubleRooms + data.tripleRooms + data.quadrupleRooms;
    if (totalRooms < 1) errors.rooms = t.createForm.selectAtLeastOneRoom;
  }

  if (step === 2) {
    if (!data.companyName.trim()) errors.companyName = t.createForm.companyNameRequired;
    if (!data.firstName.trim()) errors.firstName = t.createForm.firstNameRequired;
    if (!data.lastName.trim()) errors.lastName = t.createForm.lastNameRequired;
    if (!data.email.trim()) {
      errors.email = t.createForm.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = t.createForm.invalidEmail;
    }
    if (!data.phone.trim()) {
      errors.phone = t.createForm.phoneRequired;
    } else if (data.phone.replace(/[\s\-()]/g, '').length < 7) {
      errors.phone = t.createForm.invalidPhone;
    }
  }

  return errors;
}

export default function CreateBookingRequestPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const STEPS = [
    { label: t.createForm.stepTripDetails, icon: '/icons/Icon (4).svg' },
    { label: t.createForm.stepRoomAccommodations, icon: '/icons/Icon (3).svg' },
    { label: t.createForm.stepCustomerDetails, icon: '/icons/Icon (9).svg' },
    { label: t.createForm.stepPolicies, icon: '/icons/Icon (7).svg' },
  ];
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (attempted) {
        setErrors(validateStep(currentStep, next, t));
      }
      return next;
    });
  };

  const handleNext = () => {
    setAttempted(true);
    const stepErrors = validateStep(currentStep, formData, t);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      // Scroll to first error field
      setTimeout(() => {
        const firstError = document.querySelector('.text-red-500');
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
    }
  };

  const handleBack = () => {
    setAttempted(false);
    setErrors({});
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { requestsApi } = await import('@/lib/api/requests');
      const created = await requestsApi.create({
        // Step 1: Trip Details
        destinationId: formData.destinationId,
        destinationName: formData.destination,
        checkinDate: formData.checkInDate,
        checkoutDate: formData.checkOutDate || undefined,
        starRating: formData.hotelCategory ? Number(formData.hotelCategory) : undefined,
        budgetRange: formData.budgetRange || undefined,
        groupType: formData.groupType || undefined,
        groupSize: formData.groupSize ? Number(formData.groupSize) : undefined,
        currencyCode: 'EUR',
        // Step 2: Room & Accommodations
        rooms: {
          single: formData.singleRooms,
          double: formData.doubleRooms,
          triple: formData.tripleRooms,
          quadruple: formData.quadrupleRooms,
          extraRoomsNote: formData.extraRooms || undefined,
        },
        breakfastPreference: formData.breakfastPreference === 'with' ? 'BB' : 'RO',
        hotelLocation: formData.hotelLocation === 'central' ? 'central' : 'outside_city_center',
        specialRequirements: formData.specialRequestsRooms || undefined,
        // Step 3: Customer Details
        companyName: formData.companyName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        contactEmail: formData.email,
        contactPhone: formData.phone,
        customerNotes: formData.specialRequestsCustomer || undefined,
        // Step 4: Policies
        termsAndConditions: formData.termsAndConditions || undefined,
        cancellationConditions: formData.cancellationConditions || undefined,
        status: 'pending',
      });
      router.push(`/booking-requests/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create request';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header title={t.createForm.title} />

      <StepperNav steps={STEPS} currentStep={currentStep} />

      <div className="bg-sett-card rounded-card border border-sett-border p-6">
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-card text-body">
          {submitError}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => router.push('/booking-requests')}
        >
          {t.common.cancel}
        </Button>
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              {t.common.back}
            </Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button variant="primary" onClick={handleNext} className="text-white">
              {t.common.next}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => {}}>
                {t.createForm.addHotels}
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                {t.createForm.createRequestBtn}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Step 1: Trip Details ─────────────── */

interface StepProps {
  formData: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  errors: FieldErrors;
}

const inputClass = (hasError: boolean) =>
  cn(
    'w-full px-3 py-2.5 rounded-input border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary',
    hasError ? 'border-red-500' : 'border-sett-border'
  );

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-caption text-red-500">{message}</p>;
}

function TripDetailsStep({ formData, updateField, errors }: StepProps) {
  const { t } = useLanguage();
  const [destQuery, setDestQuery] = useState(formData.destination);
  const [destResults, setDestResults] = useState<Destination[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const destWrapperRef = useRef<HTMLDivElement>(null);

  const hotelCategoryOptions = [
    { value: '', label: t.createForm.selectHotelCategory },
    { value: '3', label: t.createForm.star3 },
    { value: '4', label: t.createForm.star4 },
    { value: '5', label: t.createForm.star5 },
  ];
  const budgetRangeOptions = [
    { value: '', label: t.createForm.selectBudgetRange },
    { value: 'economy', label: t.createForm.economy },
    { value: 'standard', label: t.createForm.standard },
    { value: 'premium', label: t.createForm.premium },
    { value: 'luxury', label: t.createForm.luxury },
  ];
  const groupTypeOptions = [
    { value: '', label: t.createForm.selectGroupType },
    { value: 'business', label: t.createForm.businessGroup },
    { value: 'leisure', label: t.createForm.leisureGroup },
    { value: 'sports', label: t.createForm.sportsTeam },
    { value: 'conference', label: t.createForm.conference },
    { value: 'wedding', label: t.createForm.wedding },
  ];

  useEffect(() => {
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
    setDestQuery(dest.name);
    updateField('destination', dest.name);
    updateField('destinationId', dest.id);
    setDestOpen(false);
    setDestResults([]);
  };

  const handleDestinationInputChange = (value: string) => {
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
        <div ref={destWrapperRef} className="relative">
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {t.createForm.destination} <span className="text-red-500">*</span>
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
              {destResults.map((dest) => (
                <li
                  key={dest.id}
                  onClick={() => handleDestinationSelect(dest)}
                  className="px-3 py-2 text-body cursor-pointer hover:bg-sett-fill"
                >
                  {dest.name} ({dest.countryCode})
                </li>
              ))}
            </ul>
          )}
          {destLoading && (
            <div className="flex items-center gap-2 mt-1.5">
              <Spinner size="sm" />
              <span className="text-caption text-sett-text-muted">{t.createForm.searching}</span>
            </div>
          )}
          <FieldError message={errors.destination} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              {t.createForm.checkInDate} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.checkInDate}
              onChange={(e) => updateField('checkInDate', e.target.value)}
              className={inputClass(!!errors.checkInDate)}
            />
            <FieldError message={errors.checkInDate} />
          </div>
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              {t.createForm.checkOutDate} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.checkOutDate}
              onChange={(e) => updateField('checkOutDate', e.target.value)}
              className={inputClass(!!errors.checkOutDate)}
            />
            <FieldError message={errors.checkOutDate} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={`${t.createForm.hotelCategory} *`}
            options={hotelCategoryOptions}
            value={formData.hotelCategory}
            onChange={(e) => updateField('hotelCategory', e.target.value)}
            placeholder={t.createForm.selectHotelCategory}
            error={errors.hotelCategory}
          />
          <Select
            label={`${t.createForm.budgetRange} ${t.createForm.optional}`}
            options={budgetRangeOptions}
            value={formData.budgetRange}
            onChange={(e) => updateField('budgetRange', e.target.value)}
            placeholder={t.createForm.selectBudgetRange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label={`${t.createForm.groupType} *`}
            options={groupTypeOptions}
            value={formData.groupType}
            onChange={(e) => updateField('groupType', e.target.value)}
            placeholder={t.createForm.selectGroupType}
            error={errors.groupType}
          />
          <Input
            label={`${t.createForm.groupSize} *`}
            type="number"
            placeholder={t.createForm.groupSizePlaceholder}
            value={formData.groupSize}
            onChange={(e) => updateField('groupSize', e.target.value)}
            error={errors.groupSize}
          />
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
          onChange={(v) => updateField('doubleRooms', v)}
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
      <div className="mb-4" />

      <div className="space-y-4">
        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {t.createForm.extraRooms} <span className="text-sett-text-accent">{t.createForm.optional}</span>
          </label>
          <textarea
            placeholder={t.createForm.extraRoomsPlaceholder}
            value={formData.extraRooms}
            onChange={(e) => updateField('extraRooms', e.target.value)}
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
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
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
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
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {t.createForm.specialRequests} <span className="text-sett-text-accent">{t.createForm.optional}</span>
          </label>
          <textarea
            placeholder={t.createForm.specialRequestsRoomPlaceholder}
            value={formData.specialRequestsRooms}
            onChange={(e) => updateField('specialRequestsRooms', e.target.value)}
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary min-h-[80px]"
          />
        </div>
      </div>
    </>
  );
}

/* ─────────────── Step 3: Customer Details ─────────────── */

function CustomerDetailsStep({ formData, updateField, errors }: StepProps) {
  const { t } = useLanguage();
  return (
    <>
      <SectionHeader
        title={t.createForm.customerTitle}
        subtitle={t.createForm.customerSubtitle}
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              {t.createForm.companyName} <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder={t.createForm.companyNamePlaceholder}
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className={inputClass(!!errors.companyName)}
            />
            <FieldError message={errors.companyName} />
          </div>
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
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
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={(e) => updateField('nameListFile', e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
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
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
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
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              {t.createForm.emailAddress} <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="email"
              placeholder={t.createForm.emailPlaceholder}
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputClass(!!errors.email)}
            />
            <FieldError message={errors.email} />
          </div>
          <PhoneInput
            value={formData.phone}
            onChange={(phone) => updateField('phone', phone)}
            error={errors.phone}
          />
        </div>

        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {t.createForm.specialRequests} <span className="text-sett-text-accent">{t.createForm.optional}</span>
          </label>
          <textarea
            placeholder={t.createForm.specialRequestsCustomerPlaceholder}
            value={formData.specialRequestsCustomer}
            onChange={(e) => updateField('specialRequestsCustomer', e.target.value)}
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary min-h-[80px]"
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
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {t.createForm.termsAndConditions}
          </label>
          <div className="border border-sett-border rounded-input overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-sett-border bg-sett-fill">
              {['B', 'I', 'U', 'S'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded text-sett-text-secondary hover:bg-sett-border/50 text-sm font-semibold"
                >
                  {btn}
                </button>
              ))}
              <span className="w-px h-4 bg-sett-border mx-1" />
              {['≡', '≡', '≡'].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded text-sett-text-secondary hover:bg-sett-border/50 text-sm"
                >
                  {btn}
                </button>
              ))}
            </div>
            <textarea
              value={formData.termsAndConditions}
              onChange={(e) => updateField('termsAndConditions', e.target.value)}
              className="w-full px-4 py-3 text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none min-h-[160px] resize-y"
            />
          </div>
        </div>

        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {t.createForm.cancellationConditions}
          </label>
          <div className="border border-sett-border rounded-input overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-sett-border bg-sett-fill">
              {['B', 'I', 'U', 'S'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded text-sett-text-secondary hover:bg-sett-border/50 text-sm font-semibold"
                >
                  {btn}
                </button>
              ))}
              <span className="w-px h-4 bg-sett-border mx-1" />
              {['≡', '≡', '≡'].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded text-sett-text-secondary hover:bg-sett-border/50 text-sm"
                >
                  {btn}
                </button>
              ))}
            </div>
            <textarea
              value={formData.cancellationConditions}
              onChange={(e) => updateField('cancellationConditions', e.target.value)}
              className="w-full px-4 py-3 text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none min-h-[120px] resize-y"
            />
          </div>
        </div>
      </div>
    </>
  );
}
