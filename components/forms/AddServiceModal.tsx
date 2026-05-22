'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ChevronDown, Check, X } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { AddProposalServicePayload } from '@/types/proposals';
import type { ProposalService } from '@/types';

const SERVICE_OPTIONS = [
  'Airport shuttle',
  'Disabled access',
  'Air conditioning',
  'Gym available',
  'Bar',
  'Restaurant',
  'Pool',
  'Spa',
  'WiFi',
  'Parking',
  'Transfer',
  'Guide',
  'Wheelchair',
];

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: AddProposalServicePayload) => Promise<void>;
  isLoading?: boolean;
  initialData?: ProposalService;
  bookingStartDate?: string | null;
  bookingEndDate?: string | null;
}

/* ── Shared input className — brand spec §5.5 ──
   1px solid #D0D0D0, radius 4px, focus #AAC737 with green glow,
   labels above use Montserrat 600 12px navy uppercase letter-spacing 0.05em. */
const inputCls =
  'w-full h-[41px] px-3 py-2 rounded-[4px] border border-[#D0D0D0] bg-white font-montserrat text-[14px] font-normal leading-none text-sett-navy placeholder:text-sett-grey placeholder:font-normal focus:outline-none focus:border-sett-primary focus:shadow-[0_0_0_3px_rgba(170,199,55,0.15)] transition-[border-color,box-shadow] duration-150';

/* ── Field wrapper ── */
function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
        {label}{required && <span className="text-[#CC3333] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{error}</p>
      )}
    </div>
  );
}

/* Error state — brand spec §5.5: border-color #CC3333 (no red/orange). */
const errorInputCls =
  'w-full h-[41px] px-3 py-2 rounded-[4px] border border-[#CC3333] bg-white font-montserrat text-[14px] font-normal leading-none text-sett-navy placeholder:text-sett-grey placeholder:font-normal focus:outline-none focus:shadow-[0_0_0_3px_rgba(204,51,51,0.15)] transition-[border-color,box-shadow] duration-150';

/* ── Themed date input ── */
interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}
const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onClick, placeholder, hasError }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        value={value as string}
        onClick={onClick}
        onChange={() => { }}
        placeholder={placeholder ?? 'MM/DD/YYYY'}
        readOnly
        className={cn(hasError ? errorInputCls : inputCls, 'pr-9 cursor-pointer')}
      />
      <span onClick={onClick} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AAC737" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

interface FormErrors {
  service?: string;
  dateFrom?: string;
  dateTo?: string;
  buyPrice?: string;
  sellPrice?: string;
  markup?: string;
  quantity?: string;
  day?: string;
  night?: string;
}

/* Prevent scroll / zoom from changing number input values */
const blurOnWheel = (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur();

/* Prevent typing '-' in number inputs */
const blockMinus = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === '-') e.preventDefault();
};

export function AddServiceModal({ open, onClose, onAdd, isLoading, initialData, bookingStartDate, bookingEndDate }: AddServiceModalProps) {
  const { t } = useLanguage();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [markup, setMarkup] = useState('');
  const [quantity, setQuantity] = useState('');
  const [day, setDay] = useState('');
  const [night, setNight] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && initialData) {
      setSelectedServices(initialData.serviceName ? initialData.serviceName.split(', ') : []);
      const buy = Number(initialData.buyPrice ?? 0);
      const sell = Number(initialData.sellPrice ?? 0);
      setBuyPrice(buy ? buy.toString() : '');
      setSellPrice(sell ? sell.toString() : '');
      setQuantity(String(initialData.quantity ?? ''));
      if (buy > 0 && sell > 0) {
        setMarkup((((sell - buy) / buy) * 100).toFixed(1));
      } else {
        setMarkup('');
      }
      const notes = initialData.notes ?? '';
      setDay(notes.includes('Day') ? '1' : '');
      setNight(notes.includes('Night') ? '1' : '');
      setDateFrom(initialData.dateFrom ? new Date(initialData.dateFrom) : null);
      setDateTo(initialData.dateTo ? new Date(initialData.dateTo) : null);
      setShowDropdown(false);
    } else if (!open) {
      setSelectedServices([]);
      setShowDropdown(false);
      setDateFrom(null);
      setDateTo(null);
      setBuyPrice('');
      setSellPrice('');
      setMarkup('');
      setQuantity('');
      setDay('');
      setNight('');
      setErrors({});
    }
  }, [open, initialData]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleBuyChange = (val: string) => {
    const clamped = val === '' ? '' : String(Math.max(0, Number(val)));
    setBuyPrice(clamped);
    if (errors.buyPrice) setErrors((err) => ({ ...err, buyPrice: undefined }));
    if (clamped && markup) {
      setSellPrice((Number(clamped) * (1 + Number(markup) / 100)).toFixed(2));
      if (errors.sellPrice) setErrors((err) => ({ ...err, sellPrice: undefined }));
    }
  };

  const handleMarkupChange = (val: string) => {
    const clamped = val === '' ? '' : String(Math.max(0, Number(val)));
    setMarkup(clamped);
    if (errors.markup) setErrors((err) => ({ ...err, markup: undefined }));
    if (buyPrice && clamped) {
      setSellPrice((Number(buyPrice) * (1 + Number(clamped) / 100)).toFixed(2));
      if (errors.sellPrice) setErrors((err) => ({ ...err, sellPrice: undefined }));
    }
  };

  const toggleService = (opt: string) => {
    setSelectedServices((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]
    );
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (selectedServices.length === 0) errs.service = t.services.errServiceRequired;
    if (!dateFrom) errs.dateFrom = t.services.errDateFromRequired;
    if (!dateTo) errs.dateTo = t.services.errDateToRequired;
    else if (dateFrom && dateTo < dateFrom) errs.dateTo = t.services.errDateToBeforeFrom;
    if (!buyPrice) errs.buyPrice = t.services.errBuyPriceRequired;
    else if (Number(buyPrice) <= 0) errs.buyPrice = t.services.errBuyPricePositive;
    if (!sellPrice) errs.sellPrice = t.services.errSellPriceRequired;
    else if (Number(sellPrice) <= 0) errs.sellPrice = t.services.errSellPricePositive;
    if (!markup) errs.markup = t.services.errMarkupRequired;
    if (!quantity) errs.quantity = t.services.errQuantityRequired;
    else if (Number(quantity) < 1) errs.quantity = t.services.errQuantityPositive;
    if (!day) errs.day = t.services.errDayRequired;
    if (!night) errs.night = t.services.errNightRequired;
    return errs;
  };

  const handleAdd = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await onAdd({
      serviceName: selectedServices.join(', '),
      dateFrom: dateFrom ? `${dateFrom.getFullYear()}-${String(dateFrom.getMonth() + 1).padStart(2, '0')}-${String(dateFrom.getDate()).padStart(2, '0')}` : undefined,
      dateTo: dateTo ? `${dateTo.getFullYear()}-${String(dateTo.getMonth() + 1).padStart(2, '0')}-${String(dateTo.getDate()).padStart(2, '0')}` : undefined,
      buyPrice: buyPrice ? Number(buyPrice) : undefined,
      sellPrice: Number(sellPrice),
      quantity: quantity ? parseInt(quantity, 10) || 1 : 1,
      days: (Number(day) || 0) + (Number(night) || 0),
      notes: [day ? 'Day' : '', night ? 'Night' : ''].filter(Boolean).join(', ') || undefined,
    });
  };

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div
        className="bg-white flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          width: 480,
          borderRadius: 8, // §5.3 panels
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {/* §5.3 accent emphasis: 3px green left-border on the panel + a thin
            green stripe at the very top to anchor the brand without using a
            navy header band that would dominate a small modal. */}
        <div aria-hidden className="h-[3px] w-full bg-sett-primary" />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            {/* §3 H3 / Subsection — navy, weight 700 */}
            <h2 className="font-montserrat text-[20px] font-bold leading-tight text-sett-navy">
              {initialData ? t.services.editService : t.services.addService}
            </h2>
            {/* §3 subtitle — grey body, 14px */}
            <p className="font-montserrat text-[13px] font-normal leading-snug text-sett-grey">
              {initialData ? t.services.editServiceDesc : t.services.addServiceDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] hover:bg-[#F8F9FA] text-sett-grey hover:text-sett-navy transition-colors mt-0.5 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* §5.3 1px border (no 25%-grey ad-hoc divider). */}
        <div className="h-px bg-[#E0E0E0] mx-5" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">

          {/* Service Name — multi-select with checkboxes */}
          <div className="flex flex-col gap-[6px]" ref={dropdownRef}>
            <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
              {t.services.serviceName}<span className="text-[#CC3333] ml-0.5">*</span>
            </label>
            <div className="relative">
              {/* Trigger — §5.5 form input: 1px solid #D0D0D0, radius 4px,
                  focus green border + soft green glow. Error uses brand
                  #CC3333 (not generic red). */}
              <div
                onClick={() => { setShowDropdown((v) => !v); if (errors.service) setErrors((e) => ({ ...e, service: undefined })); }}
                className={cn(
                  'w-full min-h-[41px] flex items-center flex-wrap gap-1.5 px-3 py-2 rounded-[4px] border bg-white cursor-pointer transition-[border-color,box-shadow] duration-150',
                  errors.service
                    ? 'border-[#CC3333] shadow-[0_0_0_3px_rgba(204,51,51,0.15)]'
                    : showDropdown
                      ? 'border-sett-primary shadow-[0_0_0_3px_rgba(170,199,55,0.15)]'
                      : 'border-[#D0D0D0] hover:border-sett-primary/60'
                )}
              >
                {selectedServices.length === 0 ? (
                  <span className="font-montserrat text-[14px] font-normal leading-none text-sett-grey flex-1">
                    {t.services.selectServices}
                  </span>
                ) : (
                  <>
                    {selectedServices.map((svc) => (
                      <span
                        key={svc}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#F5F9E8] border border-sett-primary font-montserrat text-[12px] font-semibold text-sett-navy leading-none"
                      >
                        {/* Display the localized label; the chip's identity
                            (the value stored in selectedServices and sent to
                            the backend) stays in canonical English. */}
                        {t.services.presetLabels?.[svc] ?? svc}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleService(svc); }}
                          className="ml-0.5 hover:text-sett-green-dark transition-colors"
                          aria-label={`Remove ${svc}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </>
                )}
                <ChevronDown
                  className={cn(
                    'shrink-0 w-4 h-4 ml-auto text-sett-grey transition-transform duration-200',
                    showDropdown && 'rotate-180'
                  )}
                />
              </div>

              {/* Dropdown panel — §5.3 card: 1px solid #E0E0E0, radius 8px,
                  subtle shadow 0 2px 8px rgba(0,0,0,0.08). */}
              {showDropdown && (
                <div className="absolute z-20 w-full mt-1.5 bg-white border border-[#E0E0E0] rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
                  {/* Header — labels: Montserrat 600 / 11–12px / uppercase / navy. */}
                  <div className="px-3.5 py-2.5 border-b border-[#E0E0E0]">
                    <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.05em] text-sett-navy">
                      {t.services.serviceList}
                    </p>
                  </div>
                  {/* Scrollable list with themed scrollbar */}
                  <div
                    className="max-h-[200px] overflow-y-auto py-1.5"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#AAC737 #F0F0F0',
                    }}
                  >
                    {SERVICE_OPTIONS.map((opt) => {
                      const isSelected = selectedServices.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleService(opt)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3.5 py-2.5 font-montserrat text-[14px] transition-colors',
                            isSelected
                              ? 'bg-[#F5F9E8] text-sett-navy font-medium' // §5.2 active row tint
                              : 'text-sett-navy hover:bg-[#F8F9FA]'
                          )}
                        >
                          {/* Checkbox — green bg + white check when active,
                              1px solid #D0D0D0 when inactive (matches §5.5 inputs). */}
                          <span
                            className={cn(
                              'w-4 h-4 shrink-0 rounded-[3px] border flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-sett-primary border-sett-primary'
                                : 'bg-white border-[#D0D0D0]'
                            )}
                          >
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="truncate">{t.services.presetLabels?.[opt] ?? opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {errors.service && (
              <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.service}</p>
            )}
          </div>

          {/* Date From / Date To */}
          <div className="flex justify-between">
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.dateFrom}<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <div className="sett-datepicker">
                <DatePicker
                  selected={dateFrom}
                  onChange={(date: Date | null) => { setDateFrom(date); setErrors((e) => ({ ...e, dateFrom: undefined, dateTo: undefined })); }}
                  minDate={bookingStartDate ? new Date(bookingStartDate) : new Date()}
                  maxDate={bookingEndDate ? new Date(bookingEndDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="MM/DD/YYYY"
                  popperClassName="sett-datepicker-popper"
                  popperPlacement="bottom-start"
                  wrapperClassName="w-full"
                  todayButton={t.addHotel.today}
                  showPopperArrow={false}
                  customInput={<DateInput hasError={!!errors.dateFrom} />}
                />
              </div>
              {errors.dateFrom && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.dateFrom}</p>
              )}
            </div>
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.dateTo}<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <div className="sett-datepicker">
                <DatePicker
                  selected={dateTo}
                  onChange={(date: Date | null) => { setDateTo(date); setErrors((e) => ({ ...e, dateTo: undefined })); }}
                  minDate={dateFrom ?? (bookingStartDate ? new Date(bookingStartDate) : new Date())}
                  maxDate={bookingEndDate ? new Date(bookingEndDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                  dateFormat="MM/dd/yyyy"
                  placeholderText="MM/DD/YYYY"
                  popperClassName="sett-datepicker-popper"
                  popperPlacement="bottom-end"
                  wrapperClassName="w-full"
                  todayButton={t.addHotel.today}
                  showPopperArrow={false}
                  customInput={<DateInput hasError={!!errors.dateTo} />}
                />
              </div>
              {errors.dateTo && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.dateTo}</p>
              )}
            </div>
          </div>

          {/* Buy Price / Sell Price */}
          <div className="flex justify-between">
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.buyPrice} (€)<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                value={buyPrice}
                onChange={(e) => { handleBuyChange(e.target.value); if (errors.buyPrice) setErrors((err) => ({ ...err, buyPrice: undefined })); }}
                onKeyDown={blockMinus}
                onWheel={blurOnWheel}
                className={errors.buyPrice ? errorInputCls : inputCls}
              />
              {errors.buyPrice && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.buyPrice}</p>
              )}
            </div>
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.sellPrice} (€)<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                value={sellPrice}
                onChange={(e) => { setSellPrice(e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value)))); if (errors.sellPrice) setErrors((err) => ({ ...err, sellPrice: undefined })); }}
                onKeyDown={blockMinus}
                onWheel={blurOnWheel}
                className={errors.sellPrice ? errorInputCls : inputCls}
              />
              {errors.sellPrice && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.sellPrice}</p>
              )}
            </div>
          </div>

          {/* Markup / Quantity */}
          <div className="flex justify-between">
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.markupPct}<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                placeholder="0"
                value={markup}
                onChange={(e) => { handleMarkupChange(e.target.value); if (errors.markup) setErrors((err) => ({ ...err, markup: undefined })); }}
                onKeyDown={blockMinus}
                onWheel={blurOnWheel}
                className={errors.markup ? errorInputCls : inputCls}
              />
              {errors.markup && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.markup}</p>
              )}
            </div>
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.quantity}<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={1}
                placeholder="0"
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value === '' ? '' : String(Math.max(1, Number(e.target.value)))); if (errors.quantity) setErrors((err) => ({ ...err, quantity: undefined })); }}
                onKeyDown={blockMinus}
                onWheel={blurOnWheel}
                className={errors.quantity ? errorInputCls : inputCls}
              />
              {errors.quantity && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* Day / Night — number inputs */}
          <div className="flex justify-between">
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.day}<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={day}
                onChange={(e) => { setDay(e.target.value); if (errors.day) setErrors((err) => ({ ...err, day: undefined })); }}
                onKeyDown={blockMinus}
                onWheel={blurOnWheel}
                className={errors.day ? errorInputCls : inputCls}
              />
              {errors.day && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.day}</p>
              )}
            </div>
            <div className="flex flex-col gap-[6px]" style={{ width: 194 }}>
              <label className="font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy">
                {t.services.night}<span className="text-[#CC3333] ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={night}
                onChange={(e) => { setNight(e.target.value); if (errors.night) setErrors((err) => ({ ...err, night: undefined })); }}
                onKeyDown={blockMinus}
                onWheel={blurOnWheel}
                className={errors.night ? errorInputCls : inputCls}
              />
              {errors.night && (
                <p className="font-montserrat text-[12px] text-[#CC3333] leading-none mt-0.5">{errors.night}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer — §5.1 buttons spec: primary CTA #AAC737 bg with NAVY text
            (not white), radius 4px, uppercase, letter-spacing 0.08em, weight 700.
            Secondary CTA: transparent bg, green border, green text. */}
        <div className="h-px bg-[#E0E0E0] mx-5" />
        <div className="flex gap-3 px-5 py-4 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] border-2 border-sett-primary bg-transparent font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-primary hover:bg-sett-primary/5 active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
          >
            {t.modals.cancel}
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isLoading}
            className="inline-flex items-center justify-center h-[41px] px-6 rounded-[4px] bg-sett-primary hover:bg-sett-green-dark font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-navy active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {t.services.savingShort ?? 'Saving…'}
              </span>
            ) : initialData ? t.services.updateService : t.services.addService}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
