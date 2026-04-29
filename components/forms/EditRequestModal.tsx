'use client';

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { destinationsApi, getCountryName } from '@/lib/api/destinations';
import type { Destination } from '@/lib/api/destinations';
import type { BookingRequest, Proposal } from '@/types';
import type { RoomsConfig } from '@/types/requests';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Select } from '@/components/ui/Select';
import { RoomCounter } from '@/components/ui/RoomCounter';
import { Spinner } from '@/components/ui/Loader';
import { cn } from '@/lib/utils/cn';
import { PhoneInputSplit } from '@/components/ui/PhoneInputSplit';
import { detectCountryCode } from '@/lib/constants/countryCodes';
import toast from 'react-hot-toast';

interface EditRequestModalProps {
  open: boolean;
  request: BookingRequest;
  proposal?: Proposal | null;
  onClose: () => void;
  onSaved: (updated: BookingRequest) => void;
}

interface FormState {
  destinationId: number;
  destinationName: string;
  checkinDate: string;
  checkoutDate: string;
  starRating: string;
  budgetRange: string;
  groupType: string;
  groupSize: string;
  averageAge: number | '';
  single: number;
  double: number;
  triple: number;
  quadruple: number;
  standardDoubleBeds: number;
  twinBeds: number;
  extraRoomsNote: string;
  breakfastPreference: string;
  hotelLocation: string;
  specialRequirements: string;
  companyName: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountryCode: string;
  customerNotes: string;
}

/* ── Shared label style matching create form ── */
const labelCls =
  'block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5';

/* ── Shared input style matching create form ── */
const inputCls =
  'w-full p-3 rounded-[14px] border border-sett-border-light bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent focus:outline-none focus:ring-2 focus:ring-sett-primary transition-colors';

/* ── Shared textarea style matching create form ── */
const textareaCls =
  'w-full px-3 py-2.5 rounded-[14px] border border-sett-border-light bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary transition-colors resize-none min-h-[80px]';

/* ── Section header matching create form ── */
function StarDisplay({ rating, label }: { rating: number; label: string }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const total = Math.ceil(rating);
  const empty = total - full - (half ? 1 : 0);
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <svg key={`f${i}`} width="14" height="14" viewBox="0 0 24 24" fill="#AAC737" className="shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        ))}
        {half && (
          <svg key="h" width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
            <defs><linearGradient id="half-grad-em"><stop offset="50%" stopColor="#AAC737" /><stop offset="50%" stopColor="#D1D1D1" /></linearGradient></defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#half-grad-em)" />
          </svg>
        )}
        {Array.from({ length: Math.max(0, empty) }).map((_, i) => (
          <svg key={`e${i}`} width="14" height="14" viewBox="0 0 24 24" fill="#D1D1D1" className="shrink-0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        ))}
      </span>
      <span className="text-sett-text-primary">{label}</span>
    </span>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5 shrink-0" />
      <div>
        <h3 className="font-montserrat text-[16px] font-bold text-sett-text-primary leading-tight">{title}</h3>
        {subtitle && (
          <p className="font-montserrat text-[13px] text-sett-text-accent mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ── Radio option matching create form ── */
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
          <path fillRule="evenodd" clipRule="evenodd" d="M7.00008 1.1665C3.77833 1.1665 1.16675 3.77809 1.16675 6.99984C1.16675 10.2216 3.77833 12.8332 7.00008 12.8332C10.2218 12.8332 12.8334 10.2216 12.8334 6.99984C12.8334 3.77809 10.2218 1.1665 7.00008 1.1665ZM7.00008 4.6665C6.38124 4.6665 5.78775 4.91234 5.35017 5.34992C4.91258 5.78751 4.66675 6.381 4.66675 6.99984C4.66675 7.61868 4.91258 8.21217 5.35017 8.64975C5.78775 9.08734 6.38124 9.33317 7.00008 9.33317C7.61892 9.33317 8.21241 9.08734 8.65 8.64975C9.08758 8.21217 9.33341 7.61868 9.33341 6.99984C9.33341 6.381 9.08758 5.78751 8.65 5.34992C8.21241 4.91234 7.61892 4.6665 7.00008 4.6665Z" fill="#AAC737" />
        </svg>
      ) : (
        <span className="w-[14px] h-[14px] shrink-0 rounded-full border-2 border-sett-text-accent" />
      )}
      {label}
    </button>
  );
}

/* ── DatePicker custom input matching create form ── */
interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        value={value as string}
        onClick={onClick}
        onChange={() => { }}
        placeholder={placeholder}
        readOnly
        className={cn(inputCls, 'w-full pr-10 cursor-pointer')}
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

export function EditRequestModal({ open, request, proposal, onClose, onSaved }: EditRequestModalProps) {
  const { t } = useLanguage();
  const rooms = request.rooms as RoomsConfig | null | undefined;

  const [form, setForm] = useState<FormState>({
    destinationId: 0,
    destinationName: '',
    checkinDate: '',
    checkoutDate: '',
    starRating: '',
    budgetRange: '',
    groupType: '',
    groupSize: '',
    averageAge: '',
    single: 0,
    double: 0,
    triple: 0,
    quadruple: 0,
    standardDoubleBeds: 0,
    twinBeds: 0,
    extraRoomsNote: '',
    breakfastPreference: 'BB',
    hotelLocation: 'central',
    specialRequirements: '',
    companyName: '',
    firstName: '',
    lastName: '',
    contactEmail: '',
    contactPhone: '',
    contactPhoneCountryCode: '',
    customerNotes: '',
  });

  // Destination autocomplete state
  const [destQuery, setDestQuery] = useState('');
  const [destResults, setDestResults] = useState<Destination[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const destWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);
  const destDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && request) {
      // Defensive parsing if rooms is stringified
      let rData = request.rooms as any;
      if (typeof rData === 'string' && rData.trim().startsWith('{')) {
        try { rData = JSON.parse(rData); } catch { /* ignore */ }
      }
      const r = rData as RoomsConfig | null | undefined;

      setForm({
        destinationId: request.destinationId ?? 0,
        destinationName: request.destinationName ?? '',
        checkinDate: request.checkinDate?.slice(0, 10) ?? '',
        checkoutDate: request.checkoutDate?.slice(0, 10) ?? '',
        starRating: request.starRating?.toString() ?? '',
        budgetRange: request.budgetRange ?? '',
        groupType: request.groupType ?? '',
        groupSize: request.groupSize?.toString() ?? '',
        averageAge: request.averageAge ?? '',
        single: r?.single ?? 0,
        // Backend often stores double:0 when standard/twin beds are used; derive total
        double: (r?.standardDoubleBeds || r?.twinBeds)
          ? (r?.standardDoubleBeds ?? 0) + (r?.twinBeds ?? 0)
          : (r?.double ?? 0),
        triple: r?.triple ?? 0,
        quadruple: r?.quadruple ?? 0,
        standardDoubleBeds: r?.standardDoubleBeds ?? 0,
        twinBeds: r?.twinBeds ?? 0,
        extraRoomsNote: r?.extraRoomsNote ?? '',
        breakfastPreference: request.breakfastPreference ?? 'BB',
        hotelLocation: request.hotelLocation ?? 'central',
        specialRequirements: request.specialRequirements ?? '',
        companyName: request.companyName ?? '',
        firstName: request.firstName ?? '',
        lastName: request.lastName ?? '',
        contactEmail: request.contactEmail ?? '',
        ...(() => {
          const raw = request.contactPhone ?? '';
          const saved = request.contactPhoneCountryCode;
          if (saved) return { contactPhoneCountryCode: saved, contactPhone: raw };
          if (raw.startsWith('+')) {
            const detected = detectCountryCode(raw);
            if (detected) return { contactPhoneCountryCode: detected.code, contactPhone: detected.number };
          }
          return { contactPhoneCountryCode: '+44', contactPhone: raw };
        })(),
        customerNotes: request.customerNotes ?? '',
      });
      setDestQuery(request.destinationName ?? '');
      setDestResults([]);
      setDestOpen(false);
      // Clear any previous validation errors when modal opens
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (destWrapperRef.current && !destWrapperRef.current.contains(e.target as Node)) {
        setDestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close datepickers when modal scrolls to keep calendar in view
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Trigger a document click to close any open datepicker
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDestinationInputChange = useCallback((value: string) => {
    justSelectedRef.current = false;
    setDestQuery(value);
    setForm((prev) => ({ ...prev, destinationName: value, destinationId: 0 }));

    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (value.length < 2) {
      setDestResults([]);
      setDestOpen(false);
      return;
    }
    destDebounceRef.current = setTimeout(async () => {
      setDestLoading(true);
      try {
        const results = await destinationsApi.search(value);
        setDestResults(results);
        setDestOpen(results.length > 0);
      } catch {
        // silently ignore
      } finally {
        setDestLoading(false);
      }
    }, 300);
  }, []);

  const handleDestinationSelect = useCallback((dest: Destination) => {
    justSelectedRef.current = true;
    setDestQuery(dest.name);
    setForm((prev) => ({ ...prev, destinationName: dest.name, destinationId: dest.id }));
    setDestOpen(false);
    setDestResults([]);
  }, []);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Trip Details validation
    if (!form.destinationName?.trim()) {
      errors.destinationName = t.createForm.destinationRequired || 'Destination is required';
    }
    if (!form.starRating) {
      errors.starRating = t.createForm.hotelCategoryRequired || 'Hotel category is required';
    }
    if (!form.checkinDate) {
      errors.checkinDate = t.createForm.checkinDateRequired;
    }
    if (!form.checkoutDate) {
      errors.checkoutDate = t.createForm.checkoutDateRequired;
    }
    if (form.checkinDate && form.checkoutDate && new Date(form.checkoutDate) <= new Date(form.checkinDate)) {
      errors.checkoutDate = t.createForm.checkoutAfterCheckin;
    }
    if (!form.groupType) {
      errors.groupType = t.createForm.groupTypeRequired || 'Group type is required';
    }
    if (!form.groupSize) {
      errors.groupSize = t.createForm.groupSizeRequired || 'Group size is required';
    }

    const totalRooms = form.single + form.double + form.triple + form.quadruple;
    if (totalRooms === 0) {
      errors.rooms = t.offer.editRoomsRequired;
    }

    // Validate bed config if double rooms are set
    if (form.double > 0 && form.standardDoubleBeds + form.twinBeds !== form.double) {
      errors.bedConfig = t.createForm.bedConfigRequired.replace(/{count}/g, String(form.double));
    }

    // Validate guest capacity vs group size
    const guestCapacity = form.single * 1 + form.standardDoubleBeds * 2 + form.twinBeds * 2
      + form.triple * 3 + form.quadruple * 4;
    const groupSize = Number(form.groupSize);
    if (groupSize > 0 && guestCapacity > 0 && guestCapacity < groupSize) {
      errors.rooms = t.createForm.capacityTooSmall
        .replace('{capacity}', String(guestCapacity))
        .replace('{groupSize}', String(groupSize));
    }

    // Validate averageAge for youth/school groups
    const needsAge = form.groupType === 'youth_group' || form.groupType === 'school_group';
    if (needsAge && (form.averageAge === '' || form.averageAge == null)) {
      errors.averageAge = t.createForm.averageAgeRequired;
    }

    // Customer Details validation
    if (!form.companyName?.trim()) {
      errors.companyName = t.createForm.companyNameRequired || 'Company name is required';
    }
    if (!form.firstName?.trim()) {
      errors.firstName = t.createForm.firstNameRequired || 'First name is required';
    }
    if (!form.contactEmail?.trim()) {
      errors.contactEmail = t.createForm.emailRequired || 'Email is required';
    } else if (!/^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.contactEmail)) {
      errors.contactEmail = t.createForm.invalidEmail || 'Please enter a valid email address';
    }

    // Phone validation - required and must have at least 7 digits
    const phoneValue = form.contactPhone?.trim() ?? '';
    if (!phoneValue) {
      errors.contactPhone = t.createForm.phoneRequired || 'Phone number is required';
    } else {
      const digitsOnly = phoneValue.replace(/\D/g, '');
      if (digitsOnly.length < 7) {
        errors.contactPhone = 'Phone number must have at least 7 digits';
      }
    }

    // If there are errors, set them and return
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const destinationChanged =
      form.destinationId !== (request.destinationId ?? 0) ||
      form.destinationName !== (request.destinationName ?? '');

    setSaving(true);
    try {
      // If destination changed, remove all hotels and services from the proposal
      if (destinationChanged && proposal) {
        await Promise.all([
          ...(proposal.hotels ?? []).map((h) => proposalsApi.removeHotel(proposal.id, h.id)),
          ...(proposal.services ?? []).map((s) => proposalsApi.removeService(proposal.id, s.id)),
        ]);
      }

      const updated = await requestsApi.update(request.id, {
        destinationId: form.destinationId || undefined,
        destinationName: form.destinationName,
        checkinDate: form.checkinDate,
        checkoutDate: form.checkoutDate || undefined,
        starRating: form.starRating ? Number(form.starRating) : undefined,
        budgetRange: form.budgetRange || undefined,
        groupType: form.groupType || undefined,
        groupSize: form.groupSize ? Number(form.groupSize) : undefined,
        averageAge: (['youth_group', 'school_group'].includes(form.groupType) && form.averageAge !== '')
          ? Number(form.averageAge)
          : undefined,
        rooms: {
          single: form.single,
          double: 0,
          twin: 0,
          standardDoubleBeds: form.standardDoubleBeds,
          twinBeds: form.twinBeds,
          triple: form.triple,
          quadruple: form.quadruple,
          suites: 0,
          extraRoomsNote: form.extraRoomsNote || undefined,
        },
        breakfastPreference: form.breakfastPreference as 'BB' | 'RO',
        hotelLocation: form.hotelLocation as 'central' | 'outside_city_center',
        specialRequirements: form.specialRequirements || undefined,
        companyName: form.companyName,
        firstName: form.firstName,
        lastName: form.lastName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        contactPhoneCountryCode: form.contactPhoneCountryCode || undefined,
        customerNotes: form.customerNotes || undefined,
      });
      onSaved(updated);
      // Signal add-hotel page to start a fresh search with the updated request values
      localStorage.setItem(`requestNeedsNewSearch_${request.id}`, '1');
      localStorage.removeItem(`lastSearchDest_${request.id}`);
      toast.success(t.offer.editRequestSuccess);
      onClose();
    } catch {
      toast.error(t.offer.editRequestError);
    } finally {
      setSaving(false);
    }
  };

  const hotelCategoryOptions = [
    { value: '1', label: t.createForm.star1, node: <StarDisplay rating={1} label={t.createForm.star1} /> },
    { value: '1.5', label: t.createForm.star1_5, node: <StarDisplay rating={1.5} label={t.createForm.star1_5} /> },
    { value: '2', label: t.createForm.star2, node: <StarDisplay rating={2} label={t.createForm.star2} /> },
    { value: '2.5', label: t.createForm.star2_5, node: <StarDisplay rating={2.5} label={t.createForm.star2_5} /> },
    { value: '3', label: t.createForm.star3, node: <StarDisplay rating={3} label={t.createForm.star3} /> },
    { value: '3.5', label: t.createForm.star3_5, node: <StarDisplay rating={3.5} label={t.createForm.star3_5} /> },
    { value: '4', label: t.createForm.star4, node: <StarDisplay rating={4} label={t.createForm.star4} /> },
    { value: '4.5', label: t.createForm.star4_5, node: <StarDisplay rating={4.5} label={t.createForm.star4_5} /> },
    { value: '5', label: t.createForm.star5, node: <StarDisplay rating={5} label={t.createForm.star5} /> },
    { value: '5.5', label: t.createForm.star5_5, node: <StarDisplay rating={5.5} label={t.createForm.star5_5} /> },
    { value: '6', label: t.createForm.star6, node: <StarDisplay rating={6} label={t.createForm.star6} /> },
  ];

  const budgetRangeOptions = [
    { value: 'economy', label: t.createForm.economy },
    { value: 'standard', label: t.createForm.standard },
    { value: 'premium', label: t.createForm.premium },
    { value: 'luxury', label: t.createForm.luxury },
  ];

  const groupTypeOptions = [
    { value: 'business_group', label: t.createForm.businessGroup },
    { value: 'leisure_group', label: t.createForm.leisureGroup },
    { value: 'sports_team', label: t.createForm.sportsTeam },
    { value: 'conference', label: t.createForm.conference },
    { value: 'wedding', label: t.createForm.wedding },
    { value: 'youth_group', label: t.createForm.youthGroup },
    { value: 'school_group', label: t.createForm.schoolGroup },
    { value: 'mice_group', label: t.createForm.miceGroup },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="bg-white rounded-[14px] w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]"
        style={{ boxShadow: '0px 4px 20px 0px #00000014' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-sett-border-light">
          <div>
            <h2 className="font-montserrat text-[18px] font-semibold leading-none text-sett-text-primary">
              {t.offer.editRequestTitle}
            </h2>
            <p className="font-montserrat text-[13px] text-sett-text-accent mt-1">
              {t.offer.editRequestDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-[10px] hover:bg-[#F7F7F7] transition-colors"
          >
            <X className="w-5 h-5 text-sett-text-accent" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-7"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >

          {/* ── Trip Details ── */}
          <div className="flex flex-col gap-4">
            <SectionHeader
              title={t.offer.editTripDetails}
              subtitle={t.createForm.tripDetailsSubtitle}
            />

            {/* Destination autocomplete */}
            <div ref={destWrapperRef} className="relative">
              <label className={labelCls}>{t.offer.editDestination}</label>
              <input
                className={inputCls}
                value={destQuery}
                onChange={(e) => handleDestinationInputChange(e.target.value)}
                onFocus={() => { if (destResults.length > 0) setDestOpen(true); }}
                placeholder="e.g. Barcelona, Spain"
                autoComplete="off"
              />
              {destLoading && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Spinner size="sm" />
                  <span className="font-montserrat text-[12px] text-sett-text-accent">
                    {t.createForm.searching ?? 'Searching...'}
                  </span>
                </div>
              )}
              {destOpen && destResults.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-sett-border-light rounded-[14px] shadow-lg max-h-60 overflow-y-auto">
                  {destResults.map((dest) => (
                    <li
                      key={dest.id}
                      onMouseDown={(e) => { e.preventDefault(); handleDestinationSelect(dest); }}
                      className="px-3 py-2 font-montserrat text-[14px] text-sett-text-primary cursor-pointer hover:bg-[#F7F7F7]"
                    >
                      {dest.name} ({getCountryName(dest.countryCode)})
                    </li>
                  ))}
                </ul>
              )}
              {fieldErrors.destinationName && <p className="mt-1 text-caption text-red-500">{fieldErrors.destinationName}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check-in */}
              <div>
                <label className={labelCls}>{t.offer.editCheckIn}</label>
                <div className="sett-datepicker relative z-40">
                  <DatePicker
                    selected={form.checkinDate ? new Date(form.checkinDate) : null}
                    onChange={(date: Date | null) =>
                      setField('checkinDate', date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                        : '')
                    }
                    minDate={new Date()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                    dateFormat="dd.MM.yyyy"
                    placeholderText="DD.MM.YYYY"
                    popperClassName="sett-datepicker-popper"
                    popperPlacement="bottom-start"
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    customInput={<DateInput />}
                  />
                </div>
                {fieldErrors.checkinDate && <p className="mt-1 text-caption text-red-500">{fieldErrors.checkinDate}</p>}
              </div>

              {/* Check-out */}
              <div>
                <label className={labelCls}>{t.offer.editCheckOut}</label>
                <div className="sett-datepicker relative z-40">
                  <DatePicker
                    selected={form.checkoutDate ? new Date(form.checkoutDate) : null}
                    onChange={(date: Date | null) =>
                      setField('checkoutDate', date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                        : '')
                    }
                    minDate={form.checkinDate ? new Date(form.checkinDate) : new Date()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                    dateFormat="dd.MM.yyyy"
                    placeholderText="DD.MM.YYYY"
                    popperClassName="sett-datepicker-popper"
                    popperPlacement="bottom-start"
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    customInput={<DateInput />}
                  />
                </div>
                {fieldErrors.checkoutDate && <p className="mt-1 text-caption text-red-500">{fieldErrors.checkoutDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label={t.offer.editHotelCategory}
                  options={hotelCategoryOptions}
                  value={form.starRating}
                  onChange={(e) => setField('starRating', e.target.value)}
                  placeholder={t.createForm.selectHotelCategory}
                />
                {fieldErrors.starRating && <p className="mt-1 text-caption text-red-500">{fieldErrors.starRating}</p>}
              </div>
              <div>
                <Select
                  label={`${t.offer.editBudgetRange} ${t.createForm.optional}`}
                  options={budgetRangeOptions}
                  value={form.budgetRange}
                  onChange={(e) => setField('budgetRange', e.target.value)}
                  placeholder={t.createForm.selectBudgetRange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label={t.offer.editGroupType}
                  options={groupTypeOptions}
                  value={form.groupType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setField('groupType', val);
                    if (val !== 'youth_group' && val !== 'school_group') {
                      setField('averageAge', '');
                    }
                  }}
                  placeholder={t.createForm.selectGroupType}
                />
                {fieldErrors.groupType && <p className="mt-1 text-caption text-red-500">{fieldErrors.groupType}</p>}
              </div>
              <div>
                <label className={labelCls}>{t.offer.editGroupSize}</label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.groupSize}
                  onChange={(e) => setField('groupSize', e.target.value)}
                  placeholder="e.g. 45"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
                {fieldErrors.groupSize && <p className="mt-1 text-caption text-red-500">{fieldErrors.groupSize}</p>}
              </div>
            </div>

            {(form.groupType === 'youth_group' || form.groupType === 'school_group') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.createForm.averageAge}</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className={inputCls}
                    value={form.averageAge === '' ? '' : String(form.averageAge)}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setField('averageAge', '');
                      } else {
                        const num = Number(val);
                        if (num >= 0) {
                          setField('averageAge', num);
                        }
                      }
                    }}
                    placeholder={t.createForm.averageAgePlaceholder}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                  {fieldErrors.averageAge && <p className="mt-1 text-caption text-red-500">{fieldErrors.averageAge}</p>}
                </div>
              </div>
            )}
          </div>

          {/* ── Room & Accommodations ── */}
          <div className="flex flex-col gap-4">
            <SectionHeader
              title={t.offer.editRoomAccommodations}
              subtitle={t.createForm.roomSubtitle}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RoomCounter
                label={t.createForm.singleRoom}
                value={form.single}
                onChange={(v) => setField('single', v)}
              />
              <RoomCounter
                label={t.createForm.doubleRoom}
                value={form.double}
                onChange={(v) => {
                  setField('double', v);
                  const currentSdb = form.standardDoubleBeds;
                  const currentTwin = form.twinBeds;
                  if (currentSdb + currentTwin > v) {
                    const newTwin = Math.min(currentTwin, v);
                    const newSdb = Math.min(currentSdb, v - newTwin);
                    setField('twinBeds', newTwin);
                    setField('standardDoubleBeds', newSdb);
                  }
                }}
              />
              <RoomCounter
                label={t.createForm.tripleRoom}
                value={form.triple}
                onChange={(v) => setField('triple', v)}
              />
              <RoomCounter
                label={t.createForm.quadrupleRoom}
                value={form.quadruple}
                onChange={(v) => setField('quadruple', v)}
              />
            </div>
            {fieldErrors.rooms && <p className="mt-1 text-caption text-red-500">{fieldErrors.rooms}</p>}
            {fieldErrors.bedConfig && <p className="mt-1 text-caption text-red-500">{fieldErrors.bedConfig}</p>}

            {/* Bed configuration for double rooms */}
            {form.double > 0 && (
              <div className="rounded-[14px] border border-sett-border-light bg-[#F7F7F7] p-5">
                <h4 className="font-montserrat text-[14px] font-semibold text-sett-text-primary mb-4">
                  {t.offer.bedConfiguration}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RoomCounter
                    label={t.offer.standardDoubleBed}
                    value={form.standardDoubleBeds}
                    onChange={(v) => setField('standardDoubleBeds', v)}
                    max={form.double - form.twinBeds}
                  />
                  <RoomCounter
                    label={t.offer.twinBed}
                    value={form.twinBeds}
                    onChange={(v) => setField('twinBeds', v)}
                    max={form.double - form.standardDoubleBeds}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={labelCls}>
                {t.offer.editBreakfastPref}
              </label>
              <div className="flex gap-2">
                <RadioOption
                  label={t.offer.withBreakfast}
                  selected={form.breakfastPreference === 'BB'}
                  onClick={() => setField('breakfastPreference', 'BB')}
                />
                <RadioOption
                  label={t.offer.withoutBreakfast}
                  selected={form.breakfastPreference === 'RO'}
                  onClick={() => setField('breakfastPreference', 'RO')}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                {t.offer.editHotelLocation}
              </label>
              <div className="flex gap-2">
                <RadioOption
                  label={t.offer.centralLocation}
                  selected={form.hotelLocation === 'central'}
                  onClick={() => setField('hotelLocation', 'central')}
                />
                <RadioOption
                  label={t.offer.outsideCityCenter}
                  selected={form.hotelLocation === 'outside_city_center'}
                  onClick={() => setField('hotelLocation', 'outside_city_center')}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                {t.offer.editExtraRoomsNote}{' '}
                <span className="text-sett-text-accent normal-case">{t.createForm.optional}</span>
              </label>
              <textarea
                className={textareaCls}
                rows={2}
                value={form.extraRoomsNote}
                onChange={(e) => setField('extraRoomsNote', e.target.value)}
                placeholder="Any extra room requirements..."
              />
            </div>

            <div>
              <label className={labelCls}>
                {t.offer.editSpecialRequirements}{' '}
                <span className="text-sett-text-accent normal-case">{t.createForm.optional}</span>
              </label>
              <textarea
                className={textareaCls}
                rows={2}
                value={form.specialRequirements}
                onChange={(e) => setField('specialRequirements', e.target.value)}
                placeholder="e.g. Wheelchair access, Food allergies"
              />
            </div>
          </div>

          {/* ── Customer Details ── */}
          <div className="flex flex-col gap-4">
            <SectionHeader
              title={t.offer.editCustomerDetails}
              subtitle={t.createForm.customerSubtitle}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t.offer.editCompanyName}</label>
                <input
                  className={inputCls}
                  value={form.companyName}
                  onChange={(e) => setField('companyName', e.target.value)}
                  placeholder="Company name"
                />
                {fieldErrors.companyName && <p className="mt-1 text-caption text-red-500">{fieldErrors.companyName}</p>}
              </div>
              <div>
                <label className={labelCls}>{t.offer.editFirstName}</label>
                <input
                  className={inputCls}
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  placeholder="First name"
                />
                {fieldErrors.firstName && <p className="mt-1 text-caption text-red-500">{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label className={labelCls}>{t.offer.editLastName}</label>
                <input
                  className={inputCls}
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  placeholder="Last name"
                />
                {fieldErrors.lastName && <p className="mt-1 text-caption text-red-500">{fieldErrors.lastName}</p>}
              </div>
              <div>
                <label className={labelCls}>{t.offer.editEmail}</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.contactEmail}
                  onChange={(e) => setField('contactEmail', e.target.value)}
                  placeholder="email@example.com"
                />
                {fieldErrors.contactEmail && <p className="mt-1 text-caption text-red-500">{fieldErrors.contactEmail}</p>}
              </div>
              <div>
                <PhoneInputSplit
                  countryCode={form.contactPhoneCountryCode}
                  number={form.contactPhone}
                  onCountryCodeChange={(code) => setField('contactPhoneCountryCode', code)}
                  onNumberChange={(num) => setField('contactPhone', num)}
                  label={t.offer.editPhone}
                  required={true}
                  error={fieldErrors.contactPhone}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                {t.offer.editCustomerNotes}{' '}
                <span className="text-sett-text-accent normal-case">{t.createForm.optional}</span>
              </label>
              <textarea
                className={textareaCls}
                rows={2}
                value={form.customerNotes}
                onChange={(e) => setField('customerNotes', e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-sett-border-light">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex py-3 px-5 justify-center items-center rounded-[14px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] font-semibold leading-normal text-sett-text-secondary transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#EBEBEB] hover:text-sett-text-primary hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms] disabled:opacity-50"
          >
            {t.modals.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex py-3 px-5 justify-center items-center rounded-[14px] bg-sett-primary shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)] font-montserrat text-[14px] font-semibold leading-normal text-white transition-all duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-sett-primary-hover hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[3px] active:scale-[0.92] active:duration-[80ms] disabled:opacity-50"
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              t.offer.editRequestSave
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
