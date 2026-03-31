'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { requestsApi } from '@/lib/api/requests';
import type { BookingRequest } from '@/types';
import type { RoomsConfig } from '@/types/requests';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import toast from 'react-hot-toast';

interface EditRequestModalProps {
  open: boolean;
  request: BookingRequest;
  onClose: () => void;
  onSaved: (updated: BookingRequest) => void;
}

interface FormState {
  destinationName: string;
  checkinDate: string;
  checkoutDate: string;
  starRating: string;
  budgetRange: string;
  groupType: string;
  groupSize: string;
  single: string;
  double: string;
  triple: string;
  quadruple: string;
  standardDoubleBeds: string;
  twinBeds: string;
  extraRoomsNote: string;
  breakfastPreference: string;
  hotelLocation: string;
  specialRequirements: string;
  companyName: string;
  firstName: string;
  lastName: string;
  contactEmail: string;
  contactPhone: string;
  customerNotes: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-montserrat text-[12px] font-medium uppercase tracking-wide text-[#686868]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full h-[41px] px-3 rounded-[14px] border border-[#686868]/40 font-montserrat text-[14px] text-[#1D1D1D] placeholder-[#A3A3A3] focus:outline-none focus:border-sett-primary transition-colors';

const textareaCls =
  'w-full px-3 py-2.5 rounded-[14px] border border-[#686868]/40 font-montserrat text-[14px] text-[#1D1D1D] placeholder-[#A3A3A3] focus:outline-none focus:border-sett-primary transition-colors resize-none';

export function EditRequestModal({ open, request, onClose, onSaved }: EditRequestModalProps) {
  const { t } = useLanguage();
  const rooms = request.rooms as RoomsConfig | null | undefined;

  const [form, setForm] = useState<FormState>({
    destinationName: '',
    checkinDate: '',
    checkoutDate: '',
    starRating: '',
    budgetRange: '',
    groupType: '',
    groupSize: '',
    single: '',
    double: '',
    triple: '',
    quadruple: '',
    standardDoubleBeds: '',
    twinBeds: '',
    extraRoomsNote: '',
    breakfastPreference: '',
    hotelLocation: '',
    specialRequirements: '',
    companyName: '',
    firstName: '',
    lastName: '',
    contactEmail: '',
    contactPhone: '',
    customerNotes: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && request) {
      setForm({
        destinationName: request.destinationName ?? '',
        checkinDate: request.checkinDate?.slice(0, 10) ?? '',
        checkoutDate: request.checkoutDate?.slice(0, 10) ?? '',
        starRating: request.starRating?.toString() ?? '',
        budgetRange: request.budgetRange ?? '',
        groupType: request.groupType ?? '',
        groupSize: request.groupSize?.toString() ?? '',
        single: rooms?.single?.toString() ?? '',
        double: rooms?.double?.toString() ?? '',
        triple: rooms?.triple?.toString() ?? '',
        quadruple: rooms?.quadruple?.toString() ?? '',
        standardDoubleBeds: rooms?.standardDoubleBeds?.toString() ?? '',
        twinBeds: rooms?.twinBeds?.toString() ?? '',
        extraRoomsNote: rooms?.extraRoomsNote ?? '',
        breakfastPreference: request.breakfastPreference ?? 'BB',
        hotelLocation: request.hotelLocation ?? 'central',
        specialRequirements: request.specialRequirements ?? '',
        companyName: request.companyName ?? '',
        firstName: request.firstName ?? '',
        lastName: request.lastName ?? '',
        contactEmail: request.contactEmail ?? '',
        contactPhone: request.contactPhone ?? '',
        customerNotes: request.customerNotes ?? '',
      });
    }
  }, [open, request]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await requestsApi.update(request.id, {
        destinationName: form.destinationName,
        checkinDate: form.checkinDate,
        checkoutDate: form.checkoutDate || undefined,
        starRating: form.starRating ? Number(form.starRating) : undefined,
        budgetRange: form.budgetRange || undefined,
        groupType: form.groupType || undefined,
        groupSize: form.groupSize ? Number(form.groupSize) : undefined,
        rooms: {
          single: form.single ? Number(form.single) : undefined,
          double: form.double ? Number(form.double) : undefined,
          triple: form.triple ? Number(form.triple) : undefined,
          quadruple: form.quadruple ? Number(form.quadruple) : undefined,
          standardDoubleBeds: form.standardDoubleBeds ? Number(form.standardDoubleBeds) : undefined,
          twinBeds: form.twinBeds ? Number(form.twinBeds) : undefined,
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
        customerNotes: form.customerNotes || undefined,
      });
      onSaved(updated);
      toast.success(t.offer.editRequestSuccess);
      onClose();
    } catch {
      toast.error(t.offer.editRequestError);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="bg-white rounded-[14px] w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]" style={{ boxShadow: '0px 4px 20px 0px #00000014' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#686868]/40">
          <div>
            <h2 className="font-montserrat text-[18px] font-semibold leading-none text-[#1D1D1D]">{t.offer.editRequestTitle}</h2>
            <p className="font-montserrat text-[13px] font-normal text-[#4A4A4A] mt-1">{t.offer.editRequestDesc}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[#F7F7F7] transition-colors">
            <X className="w-5 h-5 text-[#686868]" />
          </button>
        </div>

        {/* Scrollable body — themed scrollbar */}
        <div
          className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >
          {/* Trip Details */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-sett-primary rounded-full" />
              <h3 className="font-montserrat text-[14px] font-semibold text-[#1D1D1D]">{t.offer.editTripDetails}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t.offer.editDestination}>
                <input className={inputCls} value={form.destinationName} onChange={set('destinationName')} placeholder="e.g. Barcelona, Spain" />
              </Field>
              <Field label={t.offer.editHotelCategory}>
                <select className={inputCls} value={form.starRating} onChange={set('starRating')}>
                  <option value="">Select</option>
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map((s) => (
                    <option key={s} value={s}>{'⭐'.repeat(Math.ceil(s))} {s} {s === 1 ? 'Star' : 'Stars'}</option>
                  ))}
                </select>
              </Field>
              <Field label={t.offer.editCheckIn}>
                <input type="date" className={inputCls} value={form.checkinDate} onChange={set('checkinDate')} />
              </Field>
              <Field label={t.offer.editCheckOut}>
                <input type="date" className={inputCls} value={form.checkoutDate} onChange={set('checkoutDate')} />
              </Field>
              <Field label={t.offer.editBudgetRange}>
                <input className={inputCls} value={form.budgetRange} onChange={set('budgetRange')} placeholder="e.g. €100–150 per night" />
              </Field>
              <Field label={t.offer.editGroupType}>
                <input className={inputCls} value={form.groupType} onChange={set('groupType')} placeholder="e.g. Business Group" />
              </Field>
              <Field label={t.offer.editGroupSize}>
                <input type="number" min={1} className={inputCls} value={form.groupSize} onChange={set('groupSize')} placeholder="e.g. 45" />
              </Field>
            </div>
          </div>

          {/* Room & Accommodations */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-sett-primary rounded-full" />
              <h3 className="font-montserrat text-[14px] font-semibold text-[#1D1D1D]">{t.offer.editRoomAccommodations}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t.offer.editSingleRooms}>
                <input type="number" min={0} className={inputCls} value={form.single} onChange={set('single')} placeholder="0" />
              </Field>
              <Field label={t.offer.editDoubleRooms}>
                <input type="number" min={0} className={inputCls} value={form.double} onChange={set('double')} placeholder="0" />
              </Field>
              <Field label={t.offer.editTripleRooms}>
                <input type="number" min={0} className={inputCls} value={form.triple} onChange={set('triple')} placeholder="0" />
              </Field>
              <Field label={t.offer.editQuadrupleRooms}>
                <input type="number" min={0} className={inputCls} value={form.quadruple} onChange={set('quadruple')} placeholder="0" />
              </Field>
              <Field label={t.offer.editStandardDoubleBeds}>
                <input type="number" min={0} className={inputCls} value={form.standardDoubleBeds} onChange={set('standardDoubleBeds')} placeholder="0" />
              </Field>
              <Field label={t.offer.editTwinBeds}>
                <input type="number" min={0} className={inputCls} value={form.twinBeds} onChange={set('twinBeds')} placeholder="0" />
              </Field>
              <Field label={t.offer.editBreakfastPref}>
                <select className={inputCls} value={form.breakfastPreference} onChange={set('breakfastPreference')}>
                  <option value="BB">{t.offer.withBreakfast}</option>
                  <option value="RO">{t.offer.withoutBreakfast}</option>
                </select>
              </Field>
              <Field label={t.offer.editHotelLocation}>
                <select className={inputCls} value={form.hotelLocation} onChange={set('hotelLocation')}>
                  <option value="central">{t.offer.centralLocation}</option>
                  <option value="outside_city_center">{t.offer.outsideCityCenter}</option>
                </select>
              </Field>
            </div>
            <Field label={t.offer.editExtraRoomsNote}>
              <textarea className={textareaCls} rows={2} value={form.extraRoomsNote} onChange={set('extraRoomsNote')} placeholder="Any extra room requirements..." />
            </Field>
            <Field label={t.offer.editSpecialRequirements}>
              <textarea className={textareaCls} rows={2} value={form.specialRequirements} onChange={set('specialRequirements')} placeholder="e.g. Wheelchair access, Food allergies" />
            </Field>
          </div>

          {/* Customer Details */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-sett-primary rounded-full" />
              <h3 className="font-montserrat text-[14px] font-semibold text-[#1D1D1D]">{t.offer.editCustomerDetails}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t.offer.editCompanyName}>
                <input className={inputCls} value={form.companyName} onChange={set('companyName')} placeholder="Company name" />
              </Field>
              <Field label={t.offer.editFirstName}>
                <input className={inputCls} value={form.firstName} onChange={set('firstName')} placeholder="First name" />
              </Field>
              <Field label={t.offer.editLastName}>
                <input className={inputCls} value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
              </Field>
              <Field label={t.offer.editEmail}>
                <input type="email" className={inputCls} value={form.contactEmail} onChange={set('contactEmail')} placeholder="email@example.com" />
              </Field>
              <Field label={t.offer.editPhone}>
                <input className={inputCls} value={form.contactPhone} onChange={set('contactPhone')} placeholder="+1 234 567 890" />
              </Field>
            </div>
            <Field label={t.offer.editCustomerNotes}>
              <textarea className={textareaCls} rows={2} value={form.customerNotes} onChange={set('customerNotes')} placeholder="Any additional notes..." />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#686868]/40">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 h-[41px] rounded-[14px] border border-[#686868]/40 font-montserrat text-[14px] font-semibold text-[#4A4A4A] hover:bg-[#F7F7F7] hover:-translate-y-0.5 active:translate-y-[3px] active:scale-95 transition-all duration-200"
          >
            {t.modals.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 h-[41px] rounded-[14px] bg-sett-primary font-montserrat text-[14px] font-semibold text-white hover:-translate-y-0.5 active:translate-y-[3px] active:scale-95 transition-all duration-200 disabled:opacity-60"
          >
            {saving ? t.offer.editRequestSaving : t.offer.editRequestSave}
          </button>
        </div>
      </div>
    </div>
  );
}
