'use client';

/**
 * EditPaymentDeadlineModal
 *
 * Proposal-level payment-deadline editor. Sibling to
 * EditCancellationDeadlineModal but operates on the proposal as a
 * whole — one date for the whole offer, not per-hotel.
 *
 * Per BE handover (public/payment-deadline.md §3.2 Option B).
 *
 * UX:
 *  - Shows "Earliest cancellation deadline on this proposal" so staff
 *    know the upper bound before they pick.
 *  - Date picker locked to (earliestCxl - 1 day) on the max side so the
 *    user CAN'T pick a date the BE will 400 on.
 *  - Constraint hint explains why the rule exists.
 *  - Clear-deadline button reverts to "not set" (re-blocks Send Offer).
 *  - All BE error codes (PAYMENT_DEADLINE_AFTER_CANCELLATION,
 *    PAYMENT_DEADLINE_IN_PAST, PROPOSAL_NOT_MODIFIABLE, PROPOSAL_LOCKED,
 *    NOT_FOUND) mapped to i18n via t.paymentDeadline.error*.
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
import type { Proposal } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  proposal: Proposal;
  /** Called with the refreshed Proposal returned by the BE so the parent
   *  can merge it into local state without a follow-up GET. */
  onSaved: (updated: Proposal) => void;
}

/* ── Date-picker custom input — matches every other picker in the project. ── */
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

/** Earliest cancellation deadline across all hotels in the proposal.
 *  Uses each hotel's `effectiveCancelDeadline` (override-aware). Returns
 *  null when there's nothing to bound against. */
function earliestCancellationDeadline(proposal: Proposal): Date | null {
  const hotels = proposal.hotels ?? [];
  let earliest: Date | null = null;
  for (const h of hotels) {
    const iso = h.effectiveCancelDeadline ?? h.cancelDeadline ?? null;
    if (!iso) continue;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    if (!earliest || d < earliest) earliest = d;
  }
  return earliest;
}

export function EditPaymentDeadlineModal({
  open,
  onClose,
  proposal,
  onSaved,
}: Props) {
  const { t } = useLanguage();

  // Bounds. Max = earliest cancellation deadline - 1 day.
  const earliestCxl = useMemo(() => earliestCancellationDeadline(proposal), [proposal]);
  const maxDate = useMemo(() => {
    if (!earliestCxl) return null;
    const d = new Date(earliestCxl);
    d.setDate(d.getDate() - 1);
    return d;
  }, [earliestCxl]);
  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Seed the picker from the proposal's existing payment deadline.
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (proposal.paymentDeadline) return new Date(proposal.paymentDeadline);
    return null;
  });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Re-seed on open or when the underlying proposal changes (e.g. clear-
  // and-reopen, or another tab updated the field).
  useEffect(() => {
    if (open) {
      setSelectedDate(
        proposal.paymentDeadline ? new Date(proposal.paymentDeadline) : null,
      );
      setServerError(null);
    }
  }, [open, proposal.paymentDeadline]);

  // Save-button disable logic. Unchanged value OR no value picked OR
  // proposal has no hotels (and thus no max bound). All three block.
  const currentISO = proposal.paymentDeadline ?? null;
  const isUnchanged = !!selectedDate
    && !!currentISO
    && new Date(currentISO).toDateString() === selectedDate.toDateString();
  const hasDeadline = !!proposal.paymentDeadline;
  const hasHotels = (proposal.hotels?.length ?? 0) > 0;

  // Wire-format the picked date as LOCAL end-of-day, then to UTC for
  // transit. Same convention as cancellation override — keeps the picker
  // value and the rendered date in lockstep across timezones.
  const buildEndOfDayISO = (d: Date): string => {
    const local = new Date(d);
    local.setHours(23, 59, 59, 0);
    return local.toISOString();
  };

  // Map BE errorCodes to user-facing i18n. Falls back to BE-supplied
  // message string when the code isn't recognised.
  const errorMessage = (code: string | undefined, message: string | undefined): string => {
    switch (code) {
      case 'PAYMENT_DEADLINE_AFTER_CANCELLATION':
        return t.paymentDeadline.errorAfterCxl.replace(
          '{earliestCxl}',
          earliestCxl ? formatDateEU(earliestCxl.toISOString()) : '—',
        );
      case 'PAYMENT_DEADLINE_IN_PAST':
        return t.paymentDeadline.errorInPast;
      case 'PROPOSAL_NOT_MODIFIABLE':
        return t.paymentDeadline.errorNotModifiable;
      case 'PROPOSAL_LOCKED':
        return t.paymentDeadline.errorLocked;
      case 'NOT_FOUND':
        return t.paymentDeadline.errorNotFound;
      default:
        return message ?? t.paymentDeadline.errorGeneric;
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    setServerError(null);
    setSaving(true);
    try {
      const iso = buildEndOfDayISO(selectedDate);
      const updated = await proposalsApi.updatePaymentDeadline(proposal.id, iso);
      toast.success(t.paymentDeadline.toastSaved);
      onSaved(updated);
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        const code = err.response?.data?.error
          ?? err.response?.data?.errorCode
          ?? err.response?.data?.code;
        const msg = err.response?.data?.message as string | undefined;
        setServerError(errorMessage(code, msg));
      } else {
        setServerError(t.paymentDeadline.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setServerError(null);
    setSaving(true);
    try {
      const updated = await proposalsApi.updatePaymentDeadline(proposal.id, null);
      toast.success(t.paymentDeadline.toastCleared);
      onSaved(updated);
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        const code = err.response?.data?.error
          ?? err.response?.data?.errorCode
          ?? err.response?.data?.code;
        const msg = err.response?.data?.message as string | undefined;
        setServerError(errorMessage(code, msg));
      } else {
        setServerError(t.paymentDeadline.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay open={open} onClose={saving ? undefined : onClose} labelledBy="pay-modal-title">
      <div
        className="w-full max-w-[560px] bg-white rounded-[14px] overflow-hidden shadow-[0_4px_20px_0_rgba(0,0,0,0.14)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2
              id="pay-modal-title"
              className="font-montserrat text-[18px] font-semibold leading-tight text-sett-navy"
            >
              {t.paymentDeadline.modalTitle}
            </h2>
            <p className="mt-1 font-montserrat text-[13px] text-sett-text-secondary leading-snug">
              {t.paymentDeadline.modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded-md hover:bg-sett-border/50 text-sett-text-secondary transition-colors shrink-0 disabled:opacity-50"
            aria-label={t.paymentDeadline.cancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mx-5 border-t border-sett-border-light" />

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Earliest cancellation deadline — read-only context */}
          {hasHotels && (
            <div>
              <label className="block font-montserrat text-[12px] font-semibold uppercase tracking-[0.05em] text-sett-text-secondary mb-1.5">
                {t.paymentDeadline.earliestCxlLabel}
              </label>
              <div className="w-full h-[44px] px-3 flex items-center rounded-[8px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] font-medium text-sett-navy">
                {earliestCxl ? formatDateEU(earliestCxl.toISOString()) : '—'}
              </div>
            </div>
          )}

          {/* Picker */}
          <div>
            <label className="block font-montserrat text-[12px] font-semibold uppercase tracking-[0.05em] text-sett-text-secondary mb-1.5">
              {t.paymentDeadline.pickerLabel}
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
              placeholderText={t.paymentDeadline.pickerLabel}
              disabled={saving || !hasHotels}
              popperClassName="z-[9999]"
              popperPlacement="bottom-start"
            />
          </div>

          {/* Constraint hint OR no-hotels hint */}
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-[8px]"
            style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}
          >
            <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" aria-hidden />
            <p className="font-montserrat text-[12px] text-[#92400E] leading-snug">
              {hasHotels ? t.paymentDeadline.constraintHint : t.paymentDeadline.noHotelsHint}
            </p>
          </div>

          {/* Server error */}
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

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            {hasDeadline && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className={cn(
                  'font-montserrat text-[13px] font-semibold text-sett-destructive hover:underline transition-colors disabled:opacity-50',
                )}
              >
                {t.paymentDeadline.clearDeadline}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              {t.paymentDeadline.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={saving}
              disabled={!selectedDate || isUnchanged || saving || !hasHotels}
            >
              {t.paymentDeadline.save}
            </Button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
