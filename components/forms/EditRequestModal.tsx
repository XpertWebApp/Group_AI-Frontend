'use client';

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { requestsApi } from '@/lib/api/requests';
import { destinationsApi, getCountryName } from '@/lib/api/destinations';
import type { Destination } from '@/lib/api/destinations';
import type { BookingRequest } from '@/types';
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
        onChange={() => {}}
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

export function EditRequestModal({ open, request, onClose, onSaved }: EditRequestModalProps) {
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
  const justSelectedRef = useRef(false);
  const destDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && request) {
      setForm({
        destinationId: request.destinationId ?? 0,
        destinationName: request.destinationName ?? '',
        checkinDate: request.checkinDate?.slice(0, 10) ?? '',
        checkoutDate: request.checkoutDate?.slice(0, 10) ?? '',
        starRating: request.starRating?.toString() ?? '',
        budgetRange: request.budgetRange ?? '',
        groupType: request.groupType ?? '',
        groupSize: request.groupSize?.toString() ?? '',
        single: rooms?.single ?? 0,
        double: rooms?.double ?? 0,
        triple: rooms?.triple ?? 0,
        quadruple: rooms?.quadruple ?? 0,
        standardDoubleBeds: rooms?.standardDoubleBeds ?? 0,
        twinBeds: rooms?.twinBeds ?? 0,
        extraRoomsNote: rooms?.extraRoomsNote ?? '',
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
          return { contactPhoneCountryCode: '+1', contactPhone: raw };
        })(),
        customerNotes: request.customerNotes ?? '',
      });
      setDestQuery(request.destinationName ?? '');
      setDestResults([]);
      setDestOpen(false);
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
  };

  const handleSave = async () => {
    const totalRooms = form.single + form.double + form.triple + form.quadruple;
    if (totalRooms === 0) {
      toast.error(t.offer.editRoomsRequired);
      return;
    }

    setSaving(true);
    try {
      const updated = await requestsApi.update(request.id, {
        destinationId: form.destinationId || undefined,
        destinationName: form.destinationName,
        checkinDate: form.checkinDate,
        checkoutDate: form.checkoutDate || undefined,
        starRating: form.starRating ? Number(form.starRating) : undefined,
        budgetRange: form.budgetRange || undefined,
        groupType: form.groupType || undefined,
        groupSize: form.groupSize ? Number(form.groupSize) : undefined,
        rooms: {
          single: form.single || undefined,
          double: form.double || undefined,
          triple: form.triple || undefined,
          quadruple: form.quadruple || undefined,
          standardDoubleBeds: form.standardDoubleBeds || undefined,
          twinBeds: form.twinBeds || undefined,
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
    { value: '1',   label: t.createForm.star1 },
    { value: '1.5', label: t.createForm.star1_5 },
    { value: '2',   label: t.createForm.star2 },
    { value: '2.5', label: t.createForm.star2_5 },
    { value: '3',   label: t.createForm.star3 },
    { value: '3.5', label: t.createForm.star3_5 },
    { value: '4',   label: t.createForm.star4 },
    { value: '4.5', label: t.createForm.star4_5 },
    { value: '5',   label: t.createForm.star5 },
    { value: '5.5', label: t.createForm.star5_5 },
    { value: '6',   label: t.createForm.star6 },
  ];

  const budgetRangeOptions = [
    { value: 'economy',  label: t.createForm.economy },
    { value: 'standard', label: t.createForm.standard },
    { value: 'premium',  label: t.createForm.premium },
    { value: 'luxury',   label: t.createForm.luxury },
  ];

  const groupTypeOptions = [
    { value: 'business',   label: t.createForm.businessGroup },
    { value: 'leisure',    label: t.createForm.leisureGroup },
    { value: 'sports',     label: t.createForm.sportsTeam },
    { value: 'conference', label: t.createForm.conference },
    { value: 'wedding',    label: t.createForm.wedding },
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check-in */}
              <div>
                <label className={labelCls}>{t.offer.editCheckIn}</label>
                <div className="sett-datepicker">
                  <DatePicker
                    selected={form.checkinDate ? new Date(form.checkinDate) : null}
                    onChange={(date: Date | null) =>
                      setField('checkinDate', date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                        : '')
                    }
                    minDate={new Date()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                    dateFormat="MM/dd/yyyy"
                    placeholderText="MM/DD/YYYY"
                    popperClassName="sett-datepicker-popper"
                    popperPlacement="bottom-start"
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    customInput={<DateInput />}
                  />
                </div>
              </div>

              {/* Check-out */}
              <div>
                <label className={labelCls}>{t.offer.editCheckOut}</label>
                <div className="sett-datepicker">
                  <DatePicker
                    selected={form.checkoutDate ? new Date(form.checkoutDate) : null}
                    onChange={(date: Date | null) =>
                      setField('checkoutDate', date
                        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                        : '')
                    }
                    minDate={form.checkinDate ? new Date(form.checkinDate) : new Date()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                    dateFormat="MM/dd/yyyy"
                    placeholderText="MM/DD/YYYY"
                    popperClassName="sett-datepicker-popper"
                    popperPlacement="bottom-start"
                    wrapperClassName="w-full"
                    showPopperArrow={false}
                    customInput={<DateInput />}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={t.offer.editHotelCategory}
                options={hotelCategoryOptions}
                value={form.starRating}
                onChange={(e) => setField('starRating', e.target.value)}
                placeholder={t.createForm.selectHotelCategory}
              />
              <Select
                label={`${t.offer.editBudgetRange} ${t.createForm.optional}`}
                options={budgetRangeOptions}
                value={form.budgetRange}
                onChange={(e) => setField('budgetRange', e.target.value)}
                placeholder={t.createForm.selectBudgetRange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={t.offer.editGroupType}
                options={groupTypeOptions}
                value={form.groupType}
                onChange={(e) => setField('groupType', e.target.value)}
                placeholder={t.createForm.selectGroupType}
              />
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
              </div>
            </div>
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
                  setField('standardDoubleBeds', 0);
                  setField('twinBeds', 0);
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
                    max={form.double - Math.floor(form.twinBeds / 2)}
                  />
                  <RoomCounter
                    label={t.offer.twinBed}
                    value={form.twinBeds}
                    onChange={(v) => setField('twinBeds', v)}
                    max={(form.double - form.standardDoubleBeds) * 2}
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
              </div>
              <div>
                <label className={labelCls}>{t.offer.editFirstName}</label>
                <input
                  className={inputCls}
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className={labelCls}>{t.offer.editLastName}</label>
                <input
                  className={inputCls}
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  placeholder="Last name"
                />
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
              </div>
              <div>
                <PhoneInputSplit
                  countryCode={form.contactPhoneCountryCode}
                  number={form.contactPhone}
                  onCountryCodeChange={(code) => setField('contactPhoneCountryCode', code)}
                  onNumberChange={(num) => setField('contactPhone', num)}
                  label={t.offer.editPhone}
                  required={false}
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
