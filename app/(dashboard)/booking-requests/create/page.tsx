'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StepperNav } from '@/components/ui/StepperNav';
import { RoomCounter } from '@/components/ui/RoomCounter';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Spinner } from '@/components/ui/Loader';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
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
  standardDoubleBeds: 0,
  twinBeds: 0,
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
        'flex items-center gap-2 p-3 rounded-[14px] border font-montserrat text-[14px] font-normal leading-normal transition-colors flex-1',
        selected
          ? 'border-sett-primary/40 bg-sett-light-green-bg text-sett-text-primary'
          : 'border-sett-border-light bg-white text-sett-text-primary hover:border-sett-primary/40'
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
    if (!data.hotelCategory) errors.hotelCategory = t.createForm.hotelCategoryRequired;
    if (!data.groupType) errors.groupType = t.createForm.groupTypeRequired;
    if (!data.groupSize.trim()) {
      errors.groupSize = t.createForm.groupSizeRequired;
    } else if (Number(data.groupSize) <= 0) {
      errors.groupSize = t.createForm.groupSizePositive;
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
    { label: t.createForm.stepTripDetails, icon: '/icons/streamline-ultimate_trip-road.svg' },
    { label: t.createForm.stepRoomAccommodations, icon: '/icons/uil_bed.svg' },
    { label: t.createForm.stepCustomerDetails, icon: '/icons/boxicons_user.svg' },
    { label: t.createForm.stepPolicies, icon: '/icons/material-symbols_policy-outline-rounded.svg' },
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setAttempted(false);
    setErrors({});
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          standardDoubleBeds: formData.standardDoubleBeds || undefined,
          twinBeds: formData.twinBeds || undefined,
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
      toast.success(t.toasts.requestCreated);
      router.push(`/booking-requests/${created.id}`);
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
      <StepperNav steps={STEPS} currentStep={currentStep} />

      <div className="bg-white rounded-[14px] border border-sett-border-light p-6">
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

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[14px] text-body mt-4">
            {submitError}
          </div>
        )}

        {/* Horizontal Line */}
        <div className="w-full h-px bg-sett-border-light mt-6" />

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-6">
          <button
            type="button"
            onClick={() => router.push('/booking-requests')}
            className="inline-flex py-3 px-4 justify-center items-center gap-1 rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[16px] font-semibold leading-normal text-sett-text-secondary transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#EBEBEB] hover:text-sett-text-primary hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms]"
          >
            {t.common.cancel}
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex py-3 px-4 justify-center items-center gap-1 rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[16px] font-semibold leading-normal text-sett-text-secondary transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#EBEBEB] hover:text-sett-text-primary hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms]"
              >
                {t.common.back}
              </button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex py-3 px-4 justify-center items-center gap-1 rounded-[14px] bg-sett-primary shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[16px] font-semibold leading-normal text-white transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-sett-primary-hover hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms]"
              >
                {t.common.next}
              </button>
            ) : (
              <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex py-3 px-4 justify-center items-center gap-1 rounded-[14px] bg-sett-primary shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[16px] font-semibold leading-normal text-white disabled:opacity-50 transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-sett-primary-hover hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms]"
                >
                  {isSubmitting ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t.createForm.createRequestBtn}
                </button>
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

const inputClass = (hasError: boolean) =>
  cn(
    'w-full p-3 rounded-[14px] border bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent placeholder:font-montserrat placeholder:text-[14px] placeholder:font-normal placeholder:leading-normal focus:outline-none focus:ring-2 focus:ring-sett-primary',
    hasError ? 'border-red-500' : 'border-sett-border-light'
  );

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-caption text-red-500">{message}</p>;
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

  const hotelCategoryOptions = [
    { value: '3', label: t.createForm.star3 },
    { value: '4', label: t.createForm.star4 },
    { value: '5', label: t.createForm.star5 },
  ];
  const budgetRangeOptions = [
    { value: 'economy', label: t.createForm.economy },
    { value: 'standard', label: t.createForm.standard },
    { value: 'premium', label: t.createForm.premium },
    { value: 'luxury', label: t.createForm.luxury },
  ];
  const groupTypeOptions = [
    { value: 'business', label: t.createForm.businessGroup },
    { value: 'leisure', label: t.createForm.leisureGroup },
    { value: 'sports', label: t.createForm.sportsTeam },
    { value: 'conference', label: t.createForm.conference },
    { value: 'wedding', label: t.createForm.wedding },
  ];

  useEffect(() => {
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
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
            {t.createForm.destination} <span className="font-montserrat text-[14px] font-medium leading-normal uppercase text-[#FB2C36]">*</span>
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
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
              {t.createForm.checkInDate} <span className="font-montserrat text-[14px] font-medium leading-normal uppercase text-[#FB2C36]">*</span>
            </label>
            <div className="sett-datepicker">
              <DatePicker
                selected={formData.checkInDate ? new Date(formData.checkInDate) : null}
                onChange={(date: Date | null) => updateField('checkInDate', date ? date.toISOString().split('T')[0] : '')}
                minDate={new Date()}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                dateFormat="MM/dd/yyyy"
                placeholderText="MM/DD/YYYY"
                popperClassName="sett-datepicker-popper"
                popperPlacement="bottom-end"
                wrapperClassName="w-full"
                todayButton="Today"
                showPopperArrow={false}
                customInput={<DateInput hasError={!!errors.checkInDate} />}
              />
            </div>
            <FieldError message={errors.checkInDate} />
          </div>
          <div>
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
              {t.createForm.checkOutDate} <span className="font-montserrat text-[14px] font-medium leading-normal uppercase text-[#FB2C36]">*</span>
            </label>
            <div className="sett-datepicker">
              <DatePicker
                selected={formData.checkOutDate ? new Date(formData.checkOutDate) : null}
                onChange={(date: Date | null) => updateField('checkOutDate', date ? date.toISOString().split('T')[0] : '')}
                minDate={formData.checkInDate ? new Date(formData.checkInDate) : new Date()}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                dateFormat="MM/dd/yyyy"
                placeholderText="MM/DD/YYYY"
                popperClassName="sett-datepicker-popper"
                popperPlacement="bottom-end"
                wrapperClassName="w-full"
                todayButton="Today"
                showPopperArrow={false}
                customInput={<DateInput hasError={!!errors.checkOutDate} />}
              />
            </div>
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
            min="1"
            placeholder={t.createForm.groupSizePlaceholder}
            value={formData.groupSize}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || Number(val) >= 0) updateField('groupSize', val);
            }}
            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
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
          onChange={(v) => {
            updateField('doubleRooms', v);
            // Reset bed configuration when double rooms change
            updateField('standardDoubleBeds', 0);
            updateField('twinBeds', 0);
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
        <div className="mt-4 rounded-[14px] border border-sett-border-light bg-[#F7F7F7] p-5">
          <h3 className="font-montserrat text-[16px] font-semibold leading-normal text-sett-text-primary mb-4">
            Select Bed Configuration for Double Room
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RoomCounter
              label="Standard Double Bed"
              value={formData.standardDoubleBeds}
              onChange={(v) => updateField('standardDoubleBeds', v)}
              max={formData.doubleRooms - Math.floor(formData.twinBeds / 2)}
            />
            <RoomCounter
              label="Twin Bed"
              value={formData.twinBeds}
              onChange={(v) => updateField('twinBeds', v)}
              max={(formData.doubleRooms - formData.standardDoubleBeds) * 2}
            />
          </div>
        </div>
      )}
      <div className="mb-4" />

      <div className="space-y-4">
        <div>
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
  const [emailTouched, setEmailTouched] = useState(false);

  const getEmailError = () => {
    if (!emailTouched) return errors.email;
    if (!formData.email.trim()) return t.createForm.emailRequired;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return t.createForm.invalidEmail;
    return errors.email;
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
          <div>
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
            <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
          <PhoneInput
            value={formData.phone}
            onChange={(phone) => updateField('phone', phone)}
            error={errors.phone}
          />
        </div>

        <div>
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
            {t.createForm.termsAndConditions}
          </label>
          <RichTextEditor
            value={formData.termsAndConditions}
            onChange={(val) => updateField('termsAndConditions', val)}
            minHeight="160px"
          />
        </div>

        <div>
          <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
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
