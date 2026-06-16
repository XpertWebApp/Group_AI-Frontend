'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { proposalsApi } from '@/lib/api/proposals';
import { settingsApi, type PoliciesSettings } from '@/lib/api/settings';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { translations } from '@/lib/i18n/translations';
import { formatDateEU } from '@/lib/dateFormatter';
import { formatPriceEU, formatCurrencyEU } from '@/lib/numberFormatter';
import type { BookingRequest, Proposal } from '@/types';
import type { RoomsConfig } from '@/types/requests';

interface ContractPreviewModalProps {
  open: boolean;
  onClose: () => void;
  request: BookingRequest;
  proposal: Proposal;
  /** PDF language explicitly chosen via the PdfLanguagePicker. When
   *  omitted, falls back to the UI's current locale. */
  pdfLanguage?: 'en' | 'de';
}

function formatDate(dateStr: string | null | undefined): string {
  return formatDateEU(dateStr);
}

/**
 * Localize an API room-type code into the user's current language by looking
 * up the addHotel slice of the i18n bundle. Falls back to a CamelCase split
 * when the code isn't known.
 */
function formatRoomType(
  raw: string,
  tAddHotel?: {
    roomSingle: string; roomDouble: string; roomTriple: string;
    roomQuadruple: string; roomSuite: string; roomSuites: string;
    standardDoubleBed: string; twinBed: string;
  },
): string {
  if (tAddHotel) {
    const normalized = raw.toLowerCase().replace(/[_\s]/g, '');
    const map: Record<string, string> = {
      twinbeds: tAddHotel.twinBed,
      twin: tAddHotel.twinBed,
      standarddoublebeds: tAddHotel.standardDoubleBed,
      single: tAddHotel.roomSingle,
      double: tAddHotel.roomDouble,
      triple: tAddHotel.roomTriple,
      quadruple: tAddHotel.roomQuadruple,
      suite: tAddHotel.roomSuite,
      suites: tAddHotel.roomSuites,
    };
    if (map[normalized]) return map[normalized];
  }
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRoomLabel(
  type: string,
  detail: any,
  tAddHotel?: Parameters<typeof formatRoomType>[1],
): string {
  if (detail.actualDescriptions && detail.actualDescriptions.length > 0) {
    return detail.actualDescriptions[0];
  }
  return formatRoomType(type, tAddHotel);
}

export function ContractPreviewModal({ open, onClose, request, proposal, pdfLanguage }: ContractPreviewModalProps) {
  const { locale } = useLanguage();
  // Prefer the explicit picker choice when present; otherwise fall back to
  // the UI locale (legacy callers that haven't wired the picker yet).
  const previewLang: 'en' | 'de' = pdfLanguage ?? (locale === 'de' ? 'de' : 'en');
  // Drive the on-screen preview body from the picker, NOT the UI locale —
  // staff flips the picker to see what the PDF will look like in that lang.
  const t = translations[previewLang];
  const [downloading, setDownloading] = useState(false);

  // Pull live T&C / Cancellation policies from /settings/policies and pick
  // the EN or DE block based on the picker. The customer always sees the
  // current policy text (live, not snapshotted) — admin edits in Settings
  // take effect immediately on every preview. If the call fails, fall back
  // to the per-request snapshot saved on the BookingRequest.
  const [policies, setPolicies] = useState<PoliciesSettings | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    settingsApi.getPolicies()
      .then((data) => { if (!cancelled) setPolicies(data); })
      .catch(() => { /* silent — fall back to request snapshot */ });
    return () => { cancelled = true; };
  }, [open]);

  const termsHtml =
    (previewLang === 'de' ? policies?.termsConditionsDe : policies?.termsConditionsEn)
    ?? request.termsAndConditions
    ?? '';
  const cancellationHtml =
    (previewLang === 'de' ? policies?.cancellationConditionsDe : policies?.cancellationConditionsEn)
    ?? request.cancellationConditions
    ?? '';
  const hotels = (proposal.hotels ?? []).filter((h) => h.includedInTotal !== false);
  const services = (proposal.services ?? []).filter((sv) => sv.includedInTotal !== false);
  // rooms not directly referenced — guest count comes from request.groupSize.
  void (request.rooms as RoomsConfig | null | undefined);
  const contactName = [request.firstName, request.lastName].filter(Boolean).join(' ') || request.contactName || '—';

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blobUrl = await proposalsApi.previewPdf(proposal.id, previewLang);
      window.open(blobUrl, '_blank');
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const hotelTotal = hotels.reduce((s, h) => s + Number(h.totalPrice ?? 0), 0);
  const serviceTotal = services.reduce(
    (sum, sv) => sum + Number(sv.sellPrice ?? 0) * (sv.quantity ?? 1),
    0,
  );
  const grandTotal = hotelTotal + serviceTotal;

  const documentCode = `${request.referenceNumber ?? request.id.slice(0, 8)}/${new Date(request.createdAt).getFullYear()}`;

  return (
    <ModalOverlay open={open} onClose={onClose}>
      {/* §5.3 outer panel — radius 8, 1px border #E0E0E0, light shadow. The
          modal frame itself stays understated so the inner document carries
          the brand presentation. */}
      <div
        className="bg-white flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          width: 820,
          borderRadius: 8,
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* §5.3 accent stripe — identifies the brand at the top of the modal */}
        <div aria-hidden className="h-[3px] w-full bg-sett-primary" />

        {/* Modal title bar (sits above the document) */}
        <div className="flex items-center justify-between shrink-0 bg-white px-5 py-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
          <h2 className="font-montserrat font-bold text-[18px] leading-tight text-sett-navy">
            {t.contract.title}
          </h2>
          <div className="flex items-center gap-3">
            {/* §5.1 primary CTA — green bg, NAVY text, 4px radius, uppercase */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 h-[41px] px-6 rounded-[4px] bg-sett-primary hover:bg-sett-green-dark font-montserrat text-[14px] font-bold leading-none uppercase tracking-[0.08em] text-sett-navy active:scale-[0.98] transition-colors duration-200 disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloading ? t.offer.pdfDownloading : t.modals.downloadPdf}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[4px] hover:bg-[#F8F9FA] text-sett-grey hover:text-sett-navy transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Document Body ── */}
        <div
          className="flex-1 overflow-y-auto bg-[#F8F9FA] p-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >
          {/* §6.1 the document itself — white "page" with subtle border */}
          <div
            className="bg-white font-montserrat text-sett-navy mx-auto"
            style={{ borderRadius: 8, border: '1px solid #E0E0E0', overflow: 'hidden' }}
          >
            {/* ─────────── §6.1 HEADER — navy bg, white text, doc number on right ─────────── */}
            <div
              className="flex items-center justify-between px-8 py-6"
              style={{ background: '#071c42' }}
            >
              <img src="/icons/sett_logo.svg" alt="SETT" style={{ height: 36 }} />
              <div className="flex flex-col items-end" style={{ gap: 4 }}>
                <span
                  className="font-montserrat uppercase"
                  style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', color: '#AAC737' }}
                >
                  {t.contract.offer}
                </span>
                <span
                  className="font-montserrat"
                  style={{ fontWeight: 600, fontSize: 13, color: '#FFFFFF' }}
                >
                  {t.contract.documentNo} {documentCode}
                </span>
                <span
                  className="font-montserrat"
                  style={{ fontWeight: 400, fontSize: 12, color: '#FFFFFF', opacity: 0.85 }}
                >
                  {formatDate(request.createdAt)}
                </span>
              </div>
            </div>

            {/* §6.1 — 3px green accent bar directly below the header */}
            <div aria-hidden style={{ height: 3, background: '#AAC737' }} />

            {/* ─────────── §6.1 TWO-COLUMN METADATA — Supplier (left) | Customer (right) ─────────── */}
            <div className="grid grid-cols-2 gap-6 px-8 py-6" style={{ borderBottom: '1px solid #E0E0E0' }}>
              {/* Supplier column */}
              <div>
                <div
                  className="font-montserrat uppercase mb-3"
                  style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#AAC737' }}
                >
                  {t.contract.supplier}
                </div>
                <div className="font-montserrat font-bold text-[14px] text-sett-navy mb-2">
                  {t.contract.sectionTitle}
                </div>
                <div className="space-y-1.5">
                  <MetaRow label={t.contract.assignedPerson} value="Vincent Riefler" />
                  <MetaRow label={t.contract.emailAddress} value="vincent@s-e-t-t.com" />
                  <MetaRow label={t.contract.phoneNumber} value="+45 32 74 93 16" />
                  <MetaRow label={t.contract.address} value="Fujairah Creative Tower, P.O. Box 4422, Fujairah, UAE" />
                  <MetaRow label={t.contract.taxId} value="1001233897" />
                </div>
              </div>

              {/* Customer column */}
              <div>
                <div
                  className="font-montserrat uppercase mb-3"
                  style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#AAC737' }}
                >
                  {t.contract.customer}
                </div>
                <div className="font-montserrat font-bold text-[14px] text-sett-navy mb-2">
                  {contactName}
                </div>
                <div className="space-y-1.5">
                  <MetaRow label={t.contract.emailAddress} value={request.contactEmail ?? '—'} />
                  <MetaRow label={t.contract.phoneNumber} value={request.contactPhone ?? '—'} />
                  <MetaRow label={t.contract.address} value={request.hotelLocation ?? request.destinationName ?? '—'} />
                </div>
              </div>
            </div>

            {/* ─────────── TRIP DETAILS — full-width row ─────────── */}
            <div className="px-8 py-5" style={{ borderBottom: '1px solid #E0E0E0' }}>
              <div
                className="font-montserrat uppercase mb-3"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#AAC737' }}
              >
                {t.contract.tripDetails}
              </div>
              <div className="grid grid-cols-3 gap-6">
                <MetaRow label={t.contract.destination} value={request.destinationName ?? '—'} />
                <MetaRow
                  label={t.contract.checkInOut}
                  value={`${formatDate(request.checkinDate)} — ${formatDate(request.checkoutDate)}`}
                />
                <MetaRow label={t.contract.guests} value={String(request.groupSize ?? '—')} />
              </div>
            </div>

            {/* ─────────── §6.1 HOTEL DETAILS TABLE — navy header, clean body ─────────── */}
            {hotels.length > 0 && (
              <div className="px-8 py-6" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <h3 className="font-montserrat font-bold text-[16px] uppercase text-sett-navy mb-4" style={{ letterSpacing: '0.05em' }}>
                  {t.contract.hotelDetails}
                </h3>

                {hotels.map((hotel) => {
                  const roomEntries = hotel.rooms
                    ? Object.entries(hotel.rooms as Record<string, { net?: number; sell?: number; qty?: number; nights?: number }>)
                    : [];
                  const subtotal = roomEntries.reduce(
                    (sum, [, d]) => sum + Number(d.sell ?? 0) * (d.qty ?? 1) * (d.nights ?? 1),
                    0,
                  );
                  return (
                    <div key={hotel.id} className="mb-5 last:mb-0">
                      {/* Hotel name + Reference */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-montserrat font-bold text-[14px] text-sett-navy">
                          {hotel.hotelName ?? hotel.hotelCode}
                        </span>
                        {(hotel.hotelRef || hotel.tid) && (
                          <span className="font-montserrat text-[12px] text-sett-grey">
                            <span className="font-semibold">{t.contract.reservationRef}</span>{' '}
                            <span>{hotel.hotelRef ?? hotel.tid ?? `#${hotel.id.slice(0, 8)}`}</span>
                          </span>
                        )}
                      </div>

                      {roomEntries.length > 0 ? (
                        <div style={{ borderRadius: 4, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                          {/* Navy header row */}
                          <div className="flex items-center px-4 py-3" style={{ background: '#071c42' }}>
                            <span className="flex-1 font-montserrat font-bold text-[11px] uppercase text-white" style={{ letterSpacing: '0.05em' }}>
                              {t.contract.roomType}
                            </span>
                            <span className="font-montserrat font-bold text-[11px] uppercase text-white text-right" style={{ width: 80, letterSpacing: '0.05em' }}>
                              {t.contract.sell}
                            </span>
                            <span className="font-montserrat font-bold text-[11px] uppercase text-white text-center" style={{ width: 55, letterSpacing: '0.05em' }}>
                              {t.contract.qty}
                            </span>
                            <span className="font-montserrat font-bold text-[11px] uppercase text-white text-center" style={{ width: 65, letterSpacing: '0.05em' }}>
                              {t.contract.nights}
                            </span>
                            <span className="font-montserrat font-bold text-[11px] uppercase text-white text-right" style={{ width: 100, letterSpacing: '0.05em' }}>
                              {t.contract.total}
                            </span>
                          </div>

                          {/* Body rows */}
                          {roomEntries.map(([type, detail], idx) => {
                            const rowTotal = Number(detail.sell ?? 0) * (detail.qty ?? 1) * (detail.nights ?? 1);
                            return (
                              <div
                                key={type}
                                className="flex items-center px-4 py-3"
                                style={{ borderTop: idx === 0 ? 'none' : '1px solid #E0E0E0' }}
                              >
                                <span className="flex-1 font-montserrat text-[13px] text-sett-navy">
                                  {getRoomLabel(type, detail, t.addHotel)}
                                </span>
                                <span className="font-montserrat text-[13px] text-sett-navy text-right" style={{ width: 80 }}>
                                  €{formatPriceEU(detail.sell ?? 0)}
                                </span>
                                <span className="font-montserrat text-[13px] text-sett-navy text-center" style={{ width: 55 }}>
                                  {detail.qty ?? 1}
                                </span>
                                <span className="font-montserrat text-[13px] text-sett-navy text-center" style={{ width: 65 }}>
                                  {detail.nights ?? 1}
                                </span>
                                <span className="font-montserrat font-bold text-[13px] text-sett-navy text-right" style={{ width: 100 }}>
                                  €{formatPriceEU(rowTotal)}
                                </span>
                              </div>
                            );
                          })}

                          {/* Subtotal */}
                          <div className="flex items-center justify-end px-4 py-3" style={{ borderTop: '1px solid #E0E0E0', background: '#F8F9FA' }}>
                            <span className="font-montserrat font-semibold text-[12px] uppercase text-sett-grey mr-4" style={{ letterSpacing: '0.05em' }}>
                              {t.contract.subtotal}
                            </span>
                            <span className="font-montserrat font-bold text-[14px] text-sett-navy text-right" style={{ width: 100 }}>
                              €{formatPriceEU(subtotal)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="font-montserrat text-[13px] text-sett-grey">
                          {t.contract.total}: {formatCurrencyEU(hotel.totalPrice, hotel.currency)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─────────── §6.1 SERVICE DETAILS TABLE — same brand pattern ─────────── */}
            {services.length > 0 && (() => {
              const serviceSubtotal = services.reduce(
                (sum, s) => sum + Number(s.sellPrice ?? 0) * (s.quantity ?? 1),
                0,
              );
              return (
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <h3 className="font-montserrat font-bold text-[16px] uppercase text-sett-navy mb-4" style={{ letterSpacing: '0.05em' }}>
                    {t.contract.serviceDetails}
                  </h3>

                  <div style={{ borderRadius: 4, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                    {/* Navy header */}
                    <div className="flex items-center px-4 py-3" style={{ background: '#071c42' }}>
                      <span className="flex-1 font-montserrat font-bold text-[11px] uppercase text-white" style={{ letterSpacing: '0.05em' }}>
                        {t.contract.service}
                      </span>
                      <span className="font-montserrat font-bold text-[11px] uppercase text-white text-center" style={{ width: 130, letterSpacing: '0.05em' }}>
                        {t.contract.date}
                      </span>
                      <span className="font-montserrat font-bold text-[11px] uppercase text-white text-center" style={{ width: 55, letterSpacing: '0.05em' }}>
                        {t.contract.qty}
                      </span>
                      <span className="font-montserrat font-bold text-[11px] uppercase text-white text-right" style={{ width: 80, letterSpacing: '0.05em' }}>
                        {t.contract.sell}
                      </span>
                      <span className="font-montserrat font-bold text-[11px] uppercase text-white text-right" style={{ width: 100, letterSpacing: '0.05em' }}>
                        {t.contract.total}
                      </span>
                    </div>

                    {/* Body rows */}
                    {services.map((s, idx) => {
                      const rowTotal = Number(s.sellPrice ?? 0) * (s.quantity ?? 1);
                      const dateLabel = s.dateFrom && s.dateTo && s.dateFrom !== s.dateTo
                        ? `${formatDateEU(s.dateFrom)} — ${formatDateEU(s.dateTo)}`
                        : s.dateFrom
                          ? formatDateEU(s.dateFrom)
                          : '—';
                      return (
                        <div
                          key={s.id}
                          className="flex items-center px-4 py-3"
                          style={{ borderTop: idx === 0 ? 'none' : '1px solid #E0E0E0' }}
                        >
                          <span className="flex-1 font-montserrat text-[13px] text-sett-navy">
                            {s.serviceName ?? '—'}
                          </span>
                          <span className="font-montserrat text-[12px] text-sett-grey text-center" style={{ width: 130 }}>
                            {dateLabel}
                          </span>
                          <span className="font-montserrat text-[13px] text-sett-navy text-center" style={{ width: 55 }}>
                            {s.quantity ?? 1}
                          </span>
                          <span className="font-montserrat text-[13px] text-sett-navy text-right" style={{ width: 80 }}>
                            €{formatPriceEU(s.sellPrice ?? 0)}
                          </span>
                          <span className="font-montserrat font-bold text-[13px] text-sett-navy text-right" style={{ width: 100 }}>
                            €{formatPriceEU(rowTotal)}
                          </span>
                        </div>
                      );
                    })}

                    {/* Subtotal */}
                    <div className="flex items-center justify-end px-4 py-3" style={{ borderTop: '1px solid #E0E0E0', background: '#F8F9FA' }}>
                      <span className="font-montserrat font-semibold text-[12px] uppercase text-sett-grey mr-4" style={{ letterSpacing: '0.05em' }}>
                        {t.contract.subtotal}
                      </span>
                      <span className="font-montserrat font-bold text-[14px] text-sett-navy text-right" style={{ width: 100 }}>
                        €{formatPriceEU(serviceSubtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ─────────── §6.1 GRAND TOTAL — green bg, navy text, full-width row ─────────── */}
            <div
              className="flex items-center justify-between px-8 py-5"
              style={{ background: '#AAC737', borderBottom: '1px solid #E0E0E0' }}
            >
              <span className="font-montserrat font-bold text-[16px] uppercase text-sett-navy" style={{ letterSpacing: '0.08em' }}>
                {t.contract.grandTotal}
              </span>
              <span className="font-montserrat font-bold text-[22px] text-sett-navy">
                €{formatPriceEU(grandTotal)}
              </span>
            </div>

            {/* ─────────── CANCELLATION CONDITIONS ─────────── */}
            {cancellationHtml && (
              <div className="px-8 py-6" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <h3 className="font-montserrat font-bold text-[16px] uppercase text-sett-navy mb-4" style={{ letterSpacing: '0.05em' }}>
                  {t.contract.cancellationConditions}
                </h3>
                <div
                  className="font-montserrat text-[13px] leading-relaxed text-sett-grey sett-rich-editor"
                  dangerouslySetInnerHTML={{ __html: cancellationHtml }}
                />
              </div>
            )}

            {/* ─────────── TERMS & CONDITIONS ─────────── */}
            {termsHtml && (
              <div className="px-8 py-6">
                <h3 className="font-montserrat font-bold text-[16px] uppercase text-sett-navy mb-4" style={{ letterSpacing: '0.05em' }}>
                  {t.contract.termsConditions}
                </h3>
                <div
                  className="font-montserrat text-[13px] leading-relaxed text-sett-grey sett-rich-editor"
                  dangerouslySetInnerHTML={{ __html: termsHtml }}
                />
              </div>
            )}

            {/* §8.2 — thin green line above footer text */}
            <div aria-hidden style={{ height: 2, background: '#AAC737' }} />

            {/* ─────────── §6.1 FOOTER — green bar with legal + issued by ─────────── */}
            <div className="flex items-end justify-between px-8 py-5" style={{ background: '#071c42' }}>
              <p className="font-montserrat text-[10px] leading-relaxed text-white opacity-80 max-w-[520px]">
                {t.contract.footerLegal}
              </p>
              <div className="flex flex-col items-end">
                <span
                  className="font-montserrat uppercase"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#AAC737' }}
                >
                  {t.contract.issuedBy}
                </span>
                <span className="font-montserrat text-[13px] font-semibold text-white mt-0.5">
                  Oliver Riefler
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ─── Two-line label/value cell used across the metadata grid ─── */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="font-montserrat uppercase"
        style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#686868' }}
      >
        {label}
      </div>
      <div className="font-montserrat text-[13px] font-normal text-sett-navy mt-0.5">
        {value}
      </div>
    </div>
  );
}
