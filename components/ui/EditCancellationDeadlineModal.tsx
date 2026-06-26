'use client';

/**
 * EditCancellationDeadlineModal
 *
 * Per-hotel cancellation-deadline override modal. Implements Option B
 * from the BE handover (public/cancellation-override-fe-handover.md §3.1).
 *
 * UX:
 *  - Supplier deadline shown as a read-only row (the source of truth).
 *  - Date picker for the override, with min=today and max=supplier-1day
 *    so the user CAN'T pick a date the BE will 400 on.
 *  - Constraint hint explains the business rule upfront.
 *  - Clear-override button reverts to supplier date.
 *  - All BE error codes (CXL_OVERRIDE_TOO_LATE, CXL_OVERRIDE_IN_PAST,
 *    PROPOSAL_NOT_MODIFIABLE, PROPOSAL_LOCKED, NOT_FOUND) mapped to
 *    user-facing i18n copy via t.cancellationOverride.error*.
 *  - Save button disabled when value is unchanged or invalid.
 */

import { forwardRef, useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalOverlay } from './ModalOverlay';
import { Button } from './Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { proposalsApi } from '@/lib/api/proposals';
import { cn } from '@/lib/utils/cn';
import { formatDateEU } from '@/lib/dateFormatter';
import type { ProposalHotel } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  hotel: ProposalHotel;
  /** Called with the refreshed ProposalHotel returned by the BE so the
   *  parent can patch its local state without a full re-fetch. */
  onSaved: (updated: ProposalHotel) => void;
}

/* ── Date-picker custom input — matches the rest of the project's pickers ── */
const DateInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ value, onClick, placeholder }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        value={value as string}
        onClick={onClick}
        onChange={() => { /* read-only; picker writes via onChange on DatePicker */ }}
        placeholder={placeholder}
        readOnly
        className="w-full h-[44px] px-3 pr-10 rounded-[8px] border border-sett-border bg-white font-montserrat text-[14px] text-sett-navy placeholder:text-sett-text-accent focus:outline-none focus:border-sett-primary focus:shadow-input-focus transition-[border-color,box-shadow] duration-150 cursor-pointer"
      />
      <span onClick={onClick} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
        <Calendar className="w-4 h-4 text-sett-primary" />
      </span>
    </div>
  ),
);
DateInput.displayName = 'DateInput';

export function EditCancellationDeadlineModal({
  open,
  onClose,
  proposalId,
  hotel,
  onSaved,
}: Props) {
  const { t } = useLanguage();

  // The supplier deadline IS the constraint. If it's missing for some
  // reason, we have no rule to validate against — render nothing.
  const supplierISO = hotel.cancelDeadline;

  // Seed the picker from effectiveCancelDeadline so the user can re-pick
  // their previous override if they reopen the modal mid-edit.
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (hotel.effectiveCancelDeadline) return new Date(hotel.effectiveCancelDeadline);
    if (supplierISO) return new Date(supplierISO);
    return null;
  });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Reset state whenever a fresh hotel is loaded (e.g. modal closed and
  // reopened for a different card). Effect keyed off open + hotel.id so
  // stale picker state from a previous card doesn't leak in.
  useEffect(() => {
    if (open) {
      setSelectedDate(
        hotel.effectiveCancelDeadline
          ? new Date(hotel.effectiveCancelDeadline)
          : supplierISO
            ? new Date(supplierISO)
            : null,
      );
      setServerError(null);
    }
  }, [open, hotel.id, hotel.effectiveCancelDeadline, supplierISO]);

  // Derived bounds for the picker.
  // Max = supplier date minus 1 day (BE requires strictly earlier).
  // Min = today (BE rejects past dates).
  const supplierDate = supplierISO ? new Date(supplierISO) : null;
  const maxDate = useMemo(() => {
    if (!supplierDate) return null;
    const d = new Date(supplierDate);
    d.setDate(d.getDate() - 1);
    return d;
  }, [supplierDate]);
  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Is the picked value the same as currently-saved? Used to disable
  // Save until something has actually changed.
  const effectiveISO = hotel.effectiveCancelDeadline ?? supplierISO ?? null;
  const isUnchanged = !!selectedDate
    && !!effectiveISO
    && new Date(effectiveISO).toDateString() === selectedDate.toDateString();
  const hasOverride = !!hotel.cancelDeadlineOverride;

  // Send the picked date as the user's LOCAL end-of-day, converted to
  // UTC by the browser. End-of-day semantics per handover §3.3 — "the
  // customer can cancel up through that calendar day."
  //
  // Bug we're avoiding: an earlier version hand-rolled
  // `${y}-${m}-${day}T23:59:59.000Z` which DECLARED the time as UTC
  // (`Z` suffix). A user in IST picking "24 Oct" then shipped "24 Oct
  // 23:59 UTC" = "25 Oct 05:29 IST", so the badge read "25 Oct" instead
  // of the user's selection. setHours(23,59,59) treats the components
  // as local-time, .toISOString() converts to UTC for the wire — both
  // ends of the round-trip (picker write + badge read) now agree on
  // local calendar day.
  const buildEndOfDayISO = (d: Date): string => {
    const local = new Date(d);
    local.setHours(23, 59, 59, 0);
    return local.toISOString();
  };

  const formatSupplierDate = (): string => {
    if (!supplierISO) return '—';
    return formatDateEU(supplierISO);
  };

  // Map BE errorCodes to user-facing i18n. Falls back to the BE-supplied
  // message string if we don't recognise the code.
  const errorMessage = (code: string | undefined, message: string | undefined): string => {
    switch (code) {
      case 'CXL_OVERRIDE_TOO_LATE':
        return t.cancellationOverride.errorTooLate.replace('{supplierDate}', formatSupplierDate());
      case 'CXL_OVERRIDE_IN_PAST':
        return t.cancellationOverride.errorInPast;
      case 'PROPOSAL_NOT_MODIFIABLE':
        return t.cancellationOverride.errorNotModifiable;
      case 'PROPOSAL_LOCKED':
        return t.cancellationOverride.errorLocked;
      case 'NOT_FOUND':
        return t.cancellationOverride.errorNotFound;
      default:
        return message ?? t.cancellationOverride.errorGeneric;
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    setServerError(null);
    setSaving(true);
    try {
      const overrideISO = buildEndOfDayISO(selectedDate);
      const updated = await proposalsApi.updateHotelCancellation(
        proposalId,
        hotel.id,
        overrideISO,
      );
      toast.success(t.cancellationOverride.toastOverrideSaved);
      onSaved(updated);
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        const code = err.response?.data?.error as string | undefined;
        const msg = err.response?.data?.message as string | undefined;
        setServerError(errorMessage(code, msg));
      } else {
        setServerError(t.cancellationOverride.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    setServerError(null);
    setSaving(true);
    try {
      const updated = await proposalsApi.updateHotelCancellation(
        proposalId,
        hotel.id,
        null,
      );
      toast.success(t.cancellationOverride.toastOverrideCleared);
      onSaved(updated);
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        const code = err.response?.data?.error as string | undefined;
        const msg = err.response?.data?.message as string | undefined;
        setServerError(errorMessage(code, msg));
      } else {
        setServerError(t.cancellationOverride.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!supplierISO) return null;

  return (
    <ModalOverlay open={open} onClose={saving ? undefined : onClose} labelledBy="cxl-modal-title">
      <div
        className="w-full max-w-[520px] bg-white rounded-[14px] overflow-hidden shadow-[0_4px_20px_0_rgba(0,0,0,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <h2
            id="cxl-modal-title"
            className="font-montserrat text-[18px] font-semibold leading-tight text-sett-navy"
          >
            {t.cancellationOverride.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded-md hover:bg-sett-border/50 text-sett-text-secondary transition-colors shrink-0 disabled:opacity-50"
            aria-label={t.cancellationOverride.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-5 border-t border-sett-border-light" />

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Supplier deadline — read-only */}
          <div>
            <label className="block font-montserrat text-[12px] font-semibold uppercase tracking-[0.05em] text-sett-text-secondary mb-1.5">
              {t.cancellationOverride.supplierLabel}
            </label>
            <div className="w-full h-[44px] px-3 flex items-center rounded-[8px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] font-medium text-sett-navy">
              {formatSupplierDate()}
            </div>
          </div>

          {/* Override picker */}
          <div>
            <label className="block font-montserrat text-[12px] font-semibold uppercase tracking-[0.05em] text-sett-text-secondary mb-1.5">
              {t.cancellationOverride.overrideTo}
            </label>
            <DatePicker
              selected={selectedDate}
              onChange={(d: Date | null) => {
                setSelectedDate(d);
                setServerError(null);
              }}
              minDate={minDate}
              maxDate={maxDate ?? undefined}
              dateFormat="dd.MM.yyyy"
              customInput={<DateInput />}
              placeholderText={t.cancellationOverride.datePickerLabel}
              disabled={saving}
              popperClassName="z-[9999]"
              popperPlacement="bottom-start"
            />
          </div>

          {/* Constraint hint — explains the rule so staff don't try the
              wrong date and hit a 400. Yellow-amber tone consistent with
              other "be careful" notices in the app. */}
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-[8px]"
            style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}
          >
            <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" aria-hidden />
            <p className="font-montserrat text-[12px] text-[#92400E] leading-snug">
              {t.cancellationOverride.constraintHint}
            </p>
          </div>

          {/* Server error — surfaces BE 4xx responses inline */}
          {serverError && (
            <div
              className="px-3 py-2.5 rounded-[8px]"
              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}
            >
              <p className="font-montserrat text-[12px] text-sett-destructive leading-snug">
                {serverError}
              </p>
            </div>
          )}
        </div>

        <div className="mx-5 border-t border-sett-border-light" />

        {/* Footer — Clear (when override active) + Cancel + Save */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            {hasOverride && (
              <button
                type="button"
                onClick={handleClearOverride}
                disabled={saving}
                className={cn(
                  'font-montserrat text-[13px] font-semibold text-sett-destructive hover:underline transition-colors disabled:opacity-50',
                )}
              >
                {t.cancellationOverride.clearOverride}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              {t.cancellationOverride.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={saving}
              disabled={!selectedDate || isUnchanged || saving}
            >
              {t.cancellationOverride.save}
            </Button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
