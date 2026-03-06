'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StepperNav } from '@/components/ui/StepperNav';
import { RoomCounter } from '@/components/ui/RoomCounter';
import { cn } from '@/lib/utils/cn';

const STEPS = [
  { label: 'Trip Details', icon: '/icons/Icon (4).svg' },
  { label: 'Room & Accommodations', icon: '/icons/Icon (3).svg' },
  { label: 'Customer Details', icon: '/icons/Icon (9).svg' },
  { label: 'Policies', icon: '/icons/Icon (7).svg' },
];

const hotelCategoryOptions = [
  { value: '', label: 'Select hotel category' },
  { value: '3', label: '3-Star' },
  { value: '4', label: '4-Star' },
  { value: '5', label: '5-Star' },
];

const budgetRangeOptions = [
  { value: '', label: 'Select budget range' },
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
];

const groupTypeOptions = [
  { value: '', label: 'Select group type' },
  { value: 'business', label: 'Business Group' },
  { value: 'leisure', label: 'Leisure Group' },
  { value: 'sports', label: 'Sports Team' },
  { value: 'conference', label: 'Conference' },
  { value: 'wedding', label: 'Wedding' },
];

interface FormData {
  // Step 1: Trip Details
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

function validateStep(step: number, data: FormData): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!data.destination.trim()) errors.destination = 'Destination is required';
    if (!data.checkInDate) errors.checkInDate = 'Check-in date is required';
    if (!data.checkOutDate) errors.checkOutDate = 'Check-out date is required';
    if (data.checkInDate && data.checkOutDate && data.checkOutDate <= data.checkInDate) {
      errors.checkOutDate = 'Check-out must be after check-in';
    }
    if (!data.hotelCategory) errors.hotelCategory = 'Hotel category is required';
    if (!data.groupType) errors.groupType = 'Group type is required';
    if (!data.groupSize.trim()) {
      errors.groupSize = 'Group size is required';
    } else if (Number(data.groupSize) < 1) {
      errors.groupSize = 'Group size must be at least 1';
    }
  }

  if (step === 1) {
    const totalRooms = data.singleRooms + data.doubleRooms + data.tripleRooms + data.quadrupleRooms;
    if (totalRooms < 1) errors.rooms = 'Select at least one room';
  }

  if (step === 2) {
    if (!data.companyName.trim()) errors.companyName = 'Company name is required';
    if (!data.firstName.trim()) errors.firstName = 'First name is required';
    if (!data.lastName.trim()) errors.lastName = 'Last name is required';
    if (!data.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!data.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (data.phone.replace(/[\s\-()]/g, '').length < 7) {
      errors.phone = 'Enter a valid phone number';
    }
  }

  return errors;
}

export default function CreateBookingRequestPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (attempted) {
        setErrors(validateStep(currentStep, next));
      }
      return next;
    });
  };

  const handleNext = () => {
    setAttempted(true);
    const stepErrors = validateStep(currentStep, formData);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

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
        destinationId: 1, // TODO: implement destination search
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
      <Header title="Create Request" />

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
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <Button variant="primary" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => {}}>
                Add Hotels
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                Create Request
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
  return (
    <>
      <SectionHeader
        title="Trip Details"
        subtitle="Specify destination, dates, and group information"
      />
      <div className="space-y-4">
        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            DESTINATION <span className="text-sett-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Barcelona, Spain"
            value={formData.destination}
            onChange={(e) => updateField('destination', e.target.value)}
            className={inputClass(!!errors.destination)}
          />
          <FieldError message={errors.destination} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              CHECK-IN DATE <span className="text-sett-destructive">*</span>
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
              CHECK-OUT DATE <span className="text-sett-destructive">*</span>
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
            label="HOTEL CATEGORY *"
            options={hotelCategoryOptions}
            value={formData.hotelCategory}
            onChange={(e) => updateField('hotelCategory', e.target.value)}
            placeholder="Select hotel category"
            error={errors.hotelCategory}
          />
          <Select
            label="BUDGET RANGE (OPTIONAL)"
            options={budgetRangeOptions}
            value={formData.budgetRange}
            onChange={(e) => updateField('budgetRange', e.target.value)}
            placeholder="Select budget range"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="GROUP TYPE *"
            options={groupTypeOptions}
            value={formData.groupType}
            onChange={(e) => updateField('groupType', e.target.value)}
            placeholder="Select group type"
            error={errors.groupType}
          />
          <Input
            label="GROUP SIZE *"
            type="number"
            placeholder="e.g. 45"
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
  return (
    <>
      <SectionHeader
        title="Room & Accommodations"
        subtitle="Select the number of rooms by type"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <RoomCounter
          label="SINGLE ROOM"
          value={formData.singleRooms}
          onChange={(v) => updateField('singleRooms', v)}
        />
        <RoomCounter
          label="DOUBLE ROOM"
          value={formData.doubleRooms}
          onChange={(v) => updateField('doubleRooms', v)}
        />
        <RoomCounter
          label="TRIPLE ROOM"
          value={formData.tripleRooms}
          onChange={(v) => updateField('tripleRooms', v)}
        />
        <RoomCounter
          label="QUADRUPLE ROOM"
          value={formData.quadrupleRooms}
          onChange={(v) => updateField('quadrupleRooms', v)}
        />
      </div>
      <FieldError message={errors.rooms} />
      <div className="mb-4" />

      <div className="space-y-4">
        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            EXTRA ROOMS <span className="text-sett-text-accent">(OPTIONAL)</span>
          </label>
          <textarea
            placeholder="Any extra rooms, 5 - bedrooms, 6 - bedrooms, etc"
            value={formData.extraRooms}
            onChange={(e) => updateField('extraRooms', e.target.value)}
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              BREAKFAST PREFERENCE <span className="text-sett-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <RadioOption
                label="With Breakfast"
                selected={formData.breakfastPreference === 'with'}
                onClick={() => updateField('breakfastPreference', 'with')}
              />
              <RadioOption
                label="Without Breakfast"
                selected={formData.breakfastPreference === 'without'}
                onClick={() => updateField('breakfastPreference', 'without')}
              />
            </div>
          </div>
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              HOTEL LOCATION <span className="text-sett-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <RadioOption
                label="Central Location"
                selected={formData.hotelLocation === 'central'}
                onClick={() => updateField('hotelLocation', 'central')}
              />
              <RadioOption
                label="Outside City Center"
                selected={formData.hotelLocation === 'outside'}
                onClick={() => updateField('hotelLocation', 'outside')}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            SPECIAL REQUESTS <span className="text-sett-text-accent">(OPTIONAL)</span>
          </label>
          <textarea
            placeholder="Please list any dietary restrictions or foods to avoid"
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
  return (
    <>
      <SectionHeader
        title="Customer Details"
        subtitle="Contact information for this travel request"
      />
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              COMPANY NAME <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Company Ltd."
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className={inputClass(!!errors.companyName)}
            />
            <FieldError message={errors.companyName} />
          </div>
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              NAME LIST
            </label>
            <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-input border border-dashed border-sett-border bg-white text-body text-sett-text-muted cursor-pointer hover:border-sett-primary transition-colors">
              <span className="text-sett-text-primary font-medium">+</span>
              Upload File
              <input
                type="file"
                className="hidden"
                onChange={(e) => updateField('nameListFile', e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              FIRST NAME <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., John"
              value={formData.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              className={inputClass(!!errors.firstName)}
            />
            <FieldError message={errors.firstName} />
          </div>
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              LAST NAME <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Doe"
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
              EMAIL ADDRESS <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="email"
              placeholder="john@company.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={inputClass(!!errors.email)}
            />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              PHONE NUMBER <span className="text-sett-destructive">*</span>
            </label>
            <input
              type="tel"
              placeholder="+1 234 567 8900"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className={inputClass(!!errors.phone)}
            />
            <FieldError message={errors.phone} />
          </div>
        </div>

        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            SPECIAL REQUESTS <span className="text-sett-text-accent">(OPTIONAL)</span>
          </label>
          <textarea
            placeholder="Any special requirements, dietary restrictions, accessibility needs, etc."
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
  return (
    <>
      <SectionHeader
        title="Policies"
        subtitle="Contact information for this travel request"
      />
      <div className="space-y-6">
        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            TERMS & CONDITIONS
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
            CANCELLATION CONDITIONS
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
