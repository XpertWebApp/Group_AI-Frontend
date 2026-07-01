'use client';

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { ChevronDown, X, Info } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
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
import {
  AGE_REQUIRED_GROUP_TYPES,
  AVERAGE_AGE_MAX,
  AVERAGE_AGE_MIN,
  buildGroupTypeOptions,
  groupTypeRequiresAge,
  toCanonicalGroupType,
} from '@/lib/utils/groupType';
import { selectedStars } from '@/lib/utils/starRatings';
import { FreeCancellationDateBanner } from '@/components/ui/FreeCancellationDateBanner';
import { OdooCompanyPicker } from '@/components/forms/OdooCompanyPicker';
import { NationalityPicker } from '@/components/ui/NationalityPicker';
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
  /** Multi-select star category codes ("1".."5"). Empty = none ticked. */
  starRatings: string[];
  budgetRange: string;
  groupType: string;
  groupSize: string;
  averageAge: number | '';
  /** WBE nationality code. Optional on the modal so legacy null rows
   *  can be opened without forcing a save — the info note prompts. */
  nationalityCode: string | null;
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
  // Linked Odoo `res.partner` id (null until linked). Required at send-offer
  // time post-cutover — see BackendGuidelines.md §2.3.
  odooContactId: number | null;
  firstName: string;
  lastName: string;
  contactEmail: string;
  contactPhone: string;
  contactPhoneCountryCode: string;
  customerNotes: string;
}

/* ── Shared label style — §5.5 form labels: Montserrat 600, 12px, uppercase,
   letter-spacing 0.05em, navy. */
const labelCls =
  'block font-montserrat text-[12px] font-semibold leading-tight text-sett-navy uppercase tracking-[0.05em] mb-1';

/* ── Shared input style ── */
const inputCls =
  'w-full px-3 py-2 rounded-[4px] border border-[#D0D0D0] bg-white font-montserrat text-[13px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent focus:outline-none focus:border-sett-primary focus:shadow-[0_0_0_3px_rgba(170,199,55,0.15)] transition-colors';

/* ── Shared textarea style ── */
const textareaCls =
  'w-full px-3 py-2 rounded-[4px] border border-[#D0D0D0] bg-white font-montserrat text-[13px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:border-sett-primary focus:shadow-[0_0_0_3px_rgba(170,199,55,0.15)] transition-colors resize-none min-h-[64px]';

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
    <div className="flex items-start gap-2.5 mb-3">
      <div className="w-1 h-8 bg-sett-primary rounded-full mt-0.5 shrink-0" />
      <div>
        <h3 className="font-montserrat text-[14px] font-bold text-sett-text-primary leading-tight">{title}</h3>
        {subtitle && (
          <p className="font-montserrat text-[12px] text-sett-text-accent mt-0.5 leading-snug">{subtitle}</p>
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
        'flex items-center gap-2 px-3 py-2 rounded-[4px] border font-montserrat text-[13px] font-normal leading-normal transition-colors flex-1',
        selected
          ? 'border-sett-primary bg-[#F5F9E8] text-sett-navy'
          : 'border-[#D0D0D0] bg-white text-sett-navy hover:border-sett-primary/60'
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
    starRatings: [],
    budgetRange: '',
    groupType: '',
    groupSize: '',
    averageAge: '',
    nationalityCode: null,
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
    odooContactId: null,
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

  // Hotel-category multi-select dropdown state. Mirrors the AddServiceModal UX.
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
    setForm((prev) => ({
      ...prev,
      starRatings: prev.starRatings.includes(value)
        ? prev.starRatings.filter((v) => v !== value)
        : [...prev.starRatings, value].sort(),
    }));
  };

  // Anchors used to scroll the modal body so the date input is positioned with
  // enough room for the calendar popper to fit fully below it.
  const checkinAnchorRef = useRef<HTMLInputElement>(null);
  const checkoutAnchorRef = useRef<HTMLInputElement>(null);

  // When the user opens a calendar, gently scroll the modal so the input sits
  // near the top — guarantees enough vertical room below for the calendar
  // popper, even at 150% zoom where the calendar's footprint is taller than
  // half the modal.
  const ensureDatePickerVisible = useCallback((which: 'checkin' | 'checkout') => {
    const container = scrollContainerRef.current;
    const anchor = which === 'checkin' ? checkinAnchorRef.current : checkoutAnchorRef.current;
    if (!container || !anchor) return;
    // Defer to next frame so the popper has a chance to mount and measure.
    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      // Target: keep the input ~24px below the top of the scroll area.
      const desiredOffsetFromTop = 24;
      const delta = anchorRect.top - containerRect.top - desiredOffsetFromTop;
      if (Math.abs(delta) > 4) {
        container.scrollBy({ top: delta, behavior: 'smooth' });
      }
    });
  }, []);

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
        // Pre-tick selected categories. Reads new `starRatings` first, then falls
        // back to wrapping the legacy single `starRating` so old saved requests
        // open with the correct boxes already checked.
        starRatings: selectedStars(request).map(String),
        budgetRange: request.budgetRange ?? '',
        groupType: request.groupType ?? '',
        groupSize: request.groupSize?.toString() ?? '',
        averageAge: request.averageAge ?? '',
        // Legacy null = the row was created before nationality was
        // required. The picker handles the null case (placeholder shown,
        // info note rendered) per BE handover §3.3.
        nationalityCode: request.nationalityCode ?? null,
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
        odooContactId: request.odooContactId ?? null,
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

  // We deliberately do NOT close datepickers on every scroll anymore — the
  // calendar now lives inside the modal body and may need the modal to scroll
  // to fit fully on screen. Closing on programmatic scroll defeated that.
  // (Outside-click and Escape still close the calendar via react-datepicker's
  // own listeners.)

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
    if (form.starRatings.length === 0) {
      errors.starRatings = t.createForm.hotelCategoryPickAtLeastOne || 'Pick at least one star category';
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

    // Validate averageAge for youth/school groups (6–25 inclusive per backend)
    if (groupTypeRequiresAge(form.groupType)) {
      if (form.averageAge === '' || form.averageAge == null) {
        errors.averageAge = t.createForm.averageAgeRequired;
      } else if (Number(form.averageAge) < AVERAGE_AGE_MIN || Number(form.averageAge) > AVERAGE_AGE_MAX) {
        errors.averageAge = t.createForm.averageAgeInvalid;
      }
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
      // Include `+` in the local-part char class so plus-addressed emails
      // like `alice+work@example.com` validate. The prior class omitted
      // `+` and blocked legitimate addresses at Save time.
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.contactEmail)) {
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
        // Send both fields during the migration window. Backend prefers `starRatings`.
        starRatings: form.starRatings.length > 0
          ? form.starRatings.map(Number).sort((a, b) => a - b)
          : undefined,
        starRating: form.starRatings.length > 0 ? Number(form.starRatings[0]) : undefined,
        budgetRange: form.budgetRange || undefined,
        // Always send the canonical code. If the form still carries a legacy
        // value (loaded from an older saved request), normalize it on write.
        groupType: form.groupType ? (toCanonicalGroupType(form.groupType) ?? form.groupType) : undefined,
        groupSize: form.groupSize ? Number(form.groupSize) : undefined,
        averageAge: groupTypeRequiresAge(form.groupType) && form.averageAge !== ''
          ? Number(form.averageAge)
          : undefined,
        // Send only when the user actually picked one — keeps legacy
        // null rows null until staff explicitly fixes them.
        nationalityCode: form.nationalityCode ?? undefined,
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
        odooContactId: form.odooContactId,
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

  // Whole stars only (1–5) — matches the Create Request form. Half-star and
  // 6-star values are intentionally not offered to staff.
  const hotelCategoryOptions = [
    { value: '1', label: t.createForm.star1, node: <StarDisplay rating={1} label={t.createForm.star1} /> },
    { value: '2', label: t.createForm.star2, node: <StarDisplay rating={2} label={t.createForm.star2} /> },
    { value: '3', label: t.createForm.star3, node: <StarDisplay rating={3} label={t.createForm.star3} /> },
    { value: '4', label: t.createForm.star4, node: <StarDisplay rating={4} label={t.createForm.star4} /> },
    { value: '5', label: t.createForm.star5, node: <StarDisplay rating={5} label={t.createForm.star5} /> },
  ];

  const budgetRangeOptions = [
    { value: 'economy', label: t.createForm.economy },
    { value: 'standard', label: t.createForm.standard },
    { value: 'premium', label: t.createForm.premium },
    { value: 'luxury', label: t.createForm.luxury },
  ];

  // Canonical codes per backend handover. Old request values loaded into the
  // form are normalized on display (`displayedGroupType`) so the Select shows
  // the right option without the user having to re-select.
  const groupTypeOptions = buildGroupTypeOptions(t);
  const displayedGroupType = form.groupType
    ? (toCanonicalGroupType(form.groupType) ?? form.groupType)
    : '';

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div
        className="bg-white w-full max-w-xl mx-4 flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          borderRadius: 8, // §5.3 panel
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* §5.3 emphasis accent — 3px green strip at top */}
        <div aria-hidden className="h-[3px] w-full bg-sett-primary shrink-0" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0]">
          <div>
            <h2 className="font-montserrat text-[18px] font-bold leading-tight text-sett-navy">
              {t.offer.editRequestTitle}
            </h2>
            <p className="font-montserrat text-[13px] text-sett-grey mt-1 leading-snug">
              {t.offer.editRequestDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F8F9FA] text-sett-grey hover:text-sett-navy transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >

          {/* ── Trip Details ── */}
          <div className="flex flex-col gap-3">
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
                placeholder={t.createForm.destinationPlaceholder}
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
              {fieldErrors.destinationName && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.destinationName}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Check-in */}
              <div>
                <label className={labelCls}>{t.offer.editCheckIn}</label>
                <div className="sett-datepicker relative z-40">
                  <DatePicker
                    selected={form.checkinDate ? new Date(form.checkinDate) : null}
                    onChange={(date: Date | null) =>
                      setField('checkinDate', date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '')
                    }
                    onCalendarOpen={() => ensureDatePickerVisible('checkin')}
                    minDate={new Date()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                    dateFormat="dd.MM.yyyy"
                    placeholderText="DD.MM.YYYY"
                    popperClassName="sett-datepicker-popper sett-datepicker-popper--in-modal"
                    popperPlacement="bottom-start"
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    customInput={<DateInput ref={checkinAnchorRef} />}
                  />
                </div>
                {fieldErrors.checkinDate && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.checkinDate}</p>}
                {/* Passive hint matching the Create form. */}
                <p className="mt-1.5 font-montserrat text-[11px] italic text-sett-text-secondary leading-snug">
                  {t.createForm.checkInDateHint}
                </p>
              </div>

              {/* Check-out */}
              <div>
                <label className={labelCls}>{t.offer.editCheckOut}</label>
                <div className="sett-datepicker relative z-40">
                  <DatePicker
                    selected={form.checkoutDate ? new Date(form.checkoutDate) : null}
                    onChange={(date: Date | null) =>
                      setField('checkoutDate', date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '')
                    }
                    onCalendarOpen={() => ensureDatePickerVisible('checkout')}
                    minDate={form.checkinDate ? new Date(form.checkinDate) : new Date()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                    dateFormat="dd.MM.yyyy"
                    placeholderText="DD.MM.YYYY"
                    popperClassName="sett-datepicker-popper sett-datepicker-popper--in-modal"
                    popperPlacement="bottom-start"
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    customInput={<DateInput ref={checkoutAnchorRef} />}
                  />
                </div>
                {fieldErrors.checkoutDate && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.checkoutDate}</p>}
              </div>
            </div>

            {/* Free-cancellation contextual banner — same component as the
                Create form. Surfaces graded warnings when the user edits the
                check-in to a near date. */}
            <FreeCancellationDateBanner checkInDate={form.checkinDate} />

            {/* Hotel Category sits on its own full-width row. The chip list
                can grow to ~5 rows when all star tiers are picked; pairing
                it with a short sibling (Budget Range) left a tall empty
                column on the right. Budget Range now follows after Group
                Type / Group Size for a cleaner vertical rhythm. */}
            <div>
              {/* Lift wrapper z-index while open so the dropdown panel renders
                  above the sibling Group Size field below it. */}
              <div
                ref={hotelCatWrapperRef}
                className={hotelCatDropdownOpen ? 'relative z-[9999]' : undefined}
              >
                <label className={labelCls}>{t.offer.editHotelCategory}</label>
                <div className="relative">
                  {/* Multi-select trigger — same pattern as the create form */}
                  <div
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-expanded={hotelCatDropdownOpen}
                    aria-controls="edit-hotel-category-listbox"
                    tabIndex={0}
                    onClick={() => setHotelCatDropdownOpen((v) => !v)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setHotelCatDropdownOpen((v) => !v);
                      }
                    }}
                    className={cn(
                      'w-full min-h-[44px] flex items-center flex-wrap gap-1.5 px-3 py-2 rounded-[14px] border bg-white cursor-pointer transition-all duration-150',
                      fieldErrors.starRatings
                        ? 'border-[#CC3333]'
                        : hotelCatDropdownOpen
                          ? 'border-sett-primary ring-2 ring-sett-primary/20'
                          : 'border-sett-border-light hover:border-sett-primary/40',
                    )}
                  >
                    {form.starRatings.length === 0 ? (
                      <span className="font-montserrat text-[14px] font-normal text-sett-text-accent flex-1">
                        {t.createForm.selectHotelCategory}
                      </span>
                    ) : (
                      <>
                        {hotelCategoryOptions
                          .filter((o) => form.starRatings.includes(o.value))
                          .map((opt) => (
                            <span
                              key={opt.value}
                              // Hover micro-interaction matches the Create
                              // form: chip lifts 1px, border deepens, soft
                              // green shadow underneath.
                              className="group/chip inline-flex items-center gap-1.5 px-2 py-1 rounded-[8px] bg-sett-light-green-bg border border-sett-primary/30 font-montserrat text-[12px] font-semibold text-sett-primary leading-tight cursor-default transition-all duration-200 ease-sett-out hover:-translate-y-0.5 hover:border-sett-primary hover:shadow-[0_4px_12px_-2px_rgba(170,199,55,0.35)] hover:bg-sett-light-green-bg/80"
                            >
                              {opt.node}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleHotelCategory(opt.value);
                                }}
                                className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full transition-all duration-200 ease-sett-out group-hover/chip:scale-110 hover:bg-sett-destructive/10 hover:text-sett-destructive hover:rotate-90"
                                aria-label={`Remove ${opt.label}`}
                              >
                                <X className="w-3 h-3" />
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

                  {hotelCatDropdownOpen && (
                    <div
                      id="edit-hotel-category-listbox"
                      role="listbox"
                      aria-multiselectable="true"
                      className="absolute z-20 w-full mt-1.5 bg-white border border-sett-border-light rounded-[14px] shadow-[0_8px_24px_0_rgba(0,0,0,0.12)] overflow-hidden"
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
                          const isSelected = form.starRatings.includes(opt.value);
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
                {fieldErrors.starRatings && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.starRatings}</p>}
              </div>
            </div>

            {/* Group Type + Group Size — required fields, side-by-side.
                Always two columns: the modal is max-w-xl (576px), narrower
                than Tailwind's md: breakpoint (768px), so a viewport-based
                md:grid-cols-2 would never activate inside the modal. */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                {/* Render our own label with `labelCls` (12px uppercase navy)
                    and override the Select trigger to match `inputCls` (4px
                    radius, #D0D0D0 border, px-3 py-2, 13px). Without this the
                    Select's built-in 14px label + 14px rounded-[14px] trigger
                    visually mismatch the sibling Group Size input. */}
                <label className={labelCls}>{t.offer.editGroupType}</label>
                <Select
                  options={groupTypeOptions}
                  value={displayedGroupType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setField('groupType', val);
                    if (!AGE_REQUIRED_GROUP_TYPES.has(val as never)) {
                      setField('averageAge', '');
                    }
                  }}
                  placeholder={t.createForm.selectGroupType}
                  triggerClassName="rounded-[4px] border-[#D0D0D0] px-3 py-2 text-[13px]"
                />
                {fieldErrors.groupType && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.groupType}</p>}
              </div>
              <div>
                <label className={labelCls}>{t.offer.editGroupSize}</label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.groupSize}
                  onChange={(e) => setField('groupSize', e.target.value)}
                  placeholder={t.createForm.groupSizePlaceholder}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
                {fieldErrors.groupSize && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.groupSize}</p>}
              </div>
            </div>

            {/* Budget Range — optional, on its own row at the end of the
                trip-details block. Demoted here so the tall Hotel Category
                chip list no longer leaves a big empty column next to it.
                Label + trigger styled to match the sibling text inputs (see
                Group Type above for the same pattern). */}
            <div>
              <label className={labelCls}>
                {t.offer.editBudgetRange} {t.createForm.optional}
              </label>
              <Select
                options={budgetRangeOptions}
                value={form.budgetRange}
                onChange={(e) => setField('budgetRange', e.target.value)}
                placeholder={t.createForm.selectBudgetRange}
                triggerClassName="rounded-[4px] border-[#D0D0D0] px-3 py-2 text-[13px]"
              />
            </div>

            {groupTypeRequiresAge(form.groupType) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t.createForm.averageAge}</label>
                  <input
                    type="number"
                    min={AVERAGE_AGE_MIN}
                    max={AVERAGE_AGE_MAX}
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
                  {fieldErrors.averageAge && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.averageAge}</p>}
                </div>
              </div>
            )}

            {/* Nationality — required field for new requests. Legacy
                rows opened with `null` show the info note explaining why
                this matters (silent 'HU' default → wrong WBE rate card).
                Per BE handover §3.3. */}
            <div>
              <label className={labelCls}>
                {t.nationality.label} <span className="text-[#CC3333]">*</span>
              </label>
              <NationalityPicker
                value={form.nationalityCode}
                onChange={(code) => setField('nationalityCode', code)}
              />
              {request.nationalityCode == null && form.nationalityCode == null && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-[8px] bg-[#E9EEFC] border border-[#ADBEF2]">
                  <Info className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" aria-hidden />
                  <p className="font-montserrat text-[12px] text-[#1D4ED8] leading-snug">
                    {t.nationality.legacyNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Room & Accommodations ── */}
          <div className="flex flex-col gap-3">
            <SectionHeader
              title={t.offer.editRoomAccommodations}
              subtitle={t.createForm.roomSubtitle}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            {fieldErrors.rooms && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.rooms}</p>}
            {fieldErrors.bedConfig && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.bedConfig}</p>}

            {/* Bed configuration for double rooms */}
            {form.double > 0 && (
              <div className="rounded-[14px] border border-sett-border-light bg-[#F7F7F7] p-5">
                <h4 className="font-montserrat text-[14px] font-semibold text-sett-text-primary mb-4">
                  {t.offer.bedConfiguration}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                placeholder={t.offer.editExtraRoomsPlaceholder}
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
                placeholder={t.createForm.specialRequestsCustomerPlaceholder}
              />
            </div>
          </div>

          {/* ── Customer Details ── */}
          <div className="flex flex-col gap-3">
            <SectionHeader
              title={t.offer.editCustomerDetails}
              subtitle={t.createForm.customerSubtitle}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Odoo company picker — replaces the previous free-text input.
                  See BackendGuidelines.md §3.1. companyName + odooContactId
                  are saved together via PATCH /requests/:id. */}
              <OdooCompanyPicker
                value={{ companyName: form.companyName, odooContactId: form.odooContactId }}
                onChange={(next) => {
                  setField('companyName', next.companyName);
                  setField('odooContactId', next.odooContactId);
                }}
                onPicked={(row) => {
                  // Autofill Email + Phone from the Odoo row, but only when
                  // the host field is still empty — staff may have already
                  // typed a different contact and we never overwrite that.
                  if (!form.contactEmail.trim() && row.email) {
                    setField('contactEmail', row.email);
                  }
                  if (!form.contactPhone.trim() && row.phone) {
                    const split = detectCountryCode(row.phone);
                    if (split) {
                      setField('contactPhoneCountryCode', split.code);
                      setField('contactPhone', split.number);
                    } else {
                      setField('contactPhone', row.phone);
                    }
                  }
                }}
                label={t.offer.editCompanyName}
                required
                error={fieldErrors.companyName}
              />
              <div>
                <label className={labelCls}>{t.offer.editFirstName}</label>
                <input
                  className={inputCls}
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  placeholder={t.createForm.firstNamePlaceholder}
                />
                {fieldErrors.firstName && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.firstName}</p>}
              </div>
              <div>
                <label className={labelCls}>{t.offer.editLastName}</label>
                <input
                  className={inputCls}
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  placeholder={t.createForm.lastNamePlaceholder}
                />
                {fieldErrors.lastName && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.lastName}</p>}
              </div>
              <div>
                <label className={labelCls}>{t.offer.editEmail}</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.contactEmail}
                  onChange={(e) => setField('contactEmail', e.target.value)}
                  placeholder={t.createForm.emailPlaceholder}
                />
                {fieldErrors.contactEmail && <p className="mt-1 text-caption text-[#CC3333]">{fieldErrors.contactEmail}</p>}
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
                placeholder={t.offer.editCustomerNotesPlaceholder}
              />
            </div>
          </div>
        </div>

        {/* Footer — §5.1 buttons */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#E0E0E0]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] border-2 border-sett-primary bg-transparent font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-primary hover:bg-sett-primary/5 active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
          >
            {t.modals.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] bg-sett-primary hover:bg-sett-green-dark font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-navy active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
          >
            {saving ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              t.offer.editRequestSave
            )}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
