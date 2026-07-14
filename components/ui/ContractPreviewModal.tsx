'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Download, MapPin } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { proposalsApi } from '@/lib/api/proposals';
import { linkifyPolicyHtml } from '@/lib/utils/linkifyPolicyHtml';
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

  // Language-aware hotel descriptions. The parent loaded the proposal in
  // whatever language was active at mount; toggling the picker mid-modal
  // needs a re-fetch with ?language= so the BE returns the right GIATA
  // description text. Image URLs, names, and facility lists don't depend
  // on locale, so they're the same on every fetch — we only swap the
  // proposal reference for the description-aware view.
  const [localisedProposal, setLocalisedProposal] = useState<Proposal | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    proposalsApi.get(proposal.id, previewLang)
      .then((data) => { if (!cancelled && data) setLocalisedProposal(data); })
      .catch(() => { /* silent — fall back to the parent's proposal */ });
    return () => { cancelled = true; };
  }, [open, proposal.id, previewLang]);

  // Prefer the locale-aware copy when it's loaded for the active language.
  // Falls back to the parent-supplied proposal during the in-flight window.
  const activeProposal = localisedProposal ?? proposal;

  // Per-offer policies win: when the request has its own Terms / Cancellation
  // text (edited on the offer), show that; otherwise fall back to the global
  // Settings policy for the active language. Under DE we prefer the BE-supplied
  // German translation of the per-offer text (`*ConditionsDe`) and fall back to
  // the base (English) per-offer field until the BE ships it — matching the
  // offer detail page. See per-offer-policies-german-be-handover.md.
  const pickPolicy = (
    base: string | null | undefined,
    de: string | null | undefined,
    settingsEn: string | null | undefined,
    settingsDe: string | null | undefined,
  ): string => {
    const perOffer = previewLang === 'de' ? (de?.trim() ? de : base) : base;
    if (perOffer?.trim()) return perOffer;
    return (previewLang === 'de' ? settingsDe : settingsEn) ?? '';
  };
  const rawTermsHtml = pickPolicy(
    request.termsAndConditions,
    request.termsAndConditionsDe,
    policies?.termsConditionsEn,
    policies?.termsConditionsDe,
  );
  const rawCancellationHtml = pickPolicy(
    request.cancellationConditions,
    request.cancellationConditionsDe,
    policies?.cancellationConditionsEn,
    policies?.cancellationConditionsDe,
  );
  // Make links in the policy text clickable and open in a new tab (existing
  // <a> tags + bare pasted URLs). Memoised so we don't re-parse on every render.
  const termsHtml = useMemo(() => linkifyPolicyHtml(rawTermsHtml), [rawTermsHtml]);
  const cancellationHtml = useMemo(() => linkifyPolicyHtml(rawCancellationHtml), [rawCancellationHtml]);
  const hotels = (activeProposal.hotels ?? []).filter((h) => h.includedInTotal !== false);
  const services = (activeProposal.services ?? []).filter((sv) => sv.includedInTotal !== false);
  // rooms not directly referenced — guest count comes from request.groupSize.
  void (request.rooms as RoomsConfig | null | undefined);
  const contactName = [request.firstName, request.lastName].filter(Boolean).join(' ') || request.contactName || '—';
  // Customer phone shown WITH its country/dial code (e.g. "+44 7876787678"),
  // matching the BE PDF. Prepend the code + a single space when present;
  // fall back to the bare number (no stray "+"/space) otherwise.
  const customerPhone = request.contactPhone
    ? [request.contactPhoneCountryCode, request.contactPhone].filter(Boolean).join(' ')
    : '—';

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

  // Payment-due date — use the customer-facing deadline set on the proposal
  // (`paymentDeadline`), which is exactly what the BE PDF renders. Only fall
  // back to the legacy `checkout − 30 days` default for grandfathered
  // proposals that have no deadline set. Previously this always used the
  // fallback, so the preview showed a date that didn't match the PDF.
  const paymentDueDate = activeProposal.paymentDeadline
    ? new Date(activeProposal.paymentDeadline)
    : request.checkoutDate
      ? new Date(new Date(request.checkoutDate).getTime() - 30 * 24 * 60 * 60 * 1000)
      : null;

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
              {/* Header logo — "24 H GROUP OFFER" badge per BE PDF.
                  Uses the transparent-bg PNG designed for navy header
                  bands. Earlier we pointed at /icons/24h-group-offer.svg
                  which doesn't exist on disk, so the onError fallback
                  served sett_logo.svg — a multi-colour version where
                  the "Sport & Events Tours & Travel" sub-line is navy
                  on navy, effectively invisible. The transparent PNG
                  variant is the correct asset for this surface. */}
              <img
                src="/Logos/s-e-t-t-groups-logo-black-font (4) .png"
                alt="24 H Group Offer"
                // Brighten the logo so it reads clearly against the dark navy
                // header band. Values kept in sync with the BE PDF template
                // (pdfGeneration.service.ts `.doc-header .logo`) so the preview
                // and the downloaded PDF look identical.
                style={{ height: 56, filter: 'brightness(1.7) contrast(1.1)' }}
              />
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
                  <MetaRow label={t.contract.phoneNumber} value={customerPhone} />
                  {/* Customer ADDRESS row removed: the customer has no real
                      address field, so it was filled with hotelLocation
                      ("central") / destinationName — meaningless to the
                      customer. Matches the BE PDF, which dropped it too. */}
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

            {/* ─────────── HOTEL DETAILS — full BE-PDF card layout
                Per public/hotecards.txt: image (160×120), star rating,
                full address with map-pin, 3-line description, facility
                chips, free-cancellation pill (top-right), reservation
                reference in card footer. Card has a green left-accent
                border, 1px outline, and rounded corners. ─────────── */}
            {hotels.length > 0 && (
              <div className="px-8 py-6" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <h3 className="font-montserrat font-bold text-[16px] uppercase text-sett-navy mb-4" style={{ letterSpacing: '0.05em' }}>
                  {t.contract.hotelDetails}
                </h3>

                {hotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    t={t}
                    mealCode={request.breakfastPreference}
                  />
                ))}
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

            {/* ─────────── PAYMENT DETAILS — matches BE PDF
                Payment-due pill (green-bg, green border) on top, bank-
                details table beneath. Re-added 2026-06-04 so the FE
                preview matches the downloadable BE PDF byte-for-byte;
                an earlier removal made the preview disagree with what
                the customer ultimately receives. ─────────── */}
            <div className="px-8 py-6" style={{ borderBottom: '1px solid #E0E0E0' }}>
              <h3 className="font-montserrat font-bold text-[16px] uppercase text-sett-navy mb-4" style={{ letterSpacing: '0.05em' }}>
                {t.contract.paymentDetails}
              </h3>

              {/* Payment-due pill */}
              <div
                className="px-4 py-3 mb-4 rounded-[4px]"
                style={{ background: '#F5F9E8', border: '1px solid #C8E050' }}
              >
                <p className="font-montserrat text-[13px] text-sett-navy">
                  {t.contract.payPrompt}{' '}
                  <span className="font-bold">€{formatPriceEU(grandTotal)}</span>{' '}
                  {t.contract.payBy}{' '}
                  <span className="font-bold">
                    {paymentDueDate
                      ? paymentDueDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </span>.
                </p>
              </div>

              {/* Bank-details table */}
              <div style={{ borderRadius: 4, border: '1px solid #E0E0E0', overflow: 'hidden' }}>
                <BankRow label={t.contract.bankName} value="Emirates NBD" />
                <BankRow label={t.contract.accountHolder} value="S-E-T-T Worldwide Reservation FZE" />
                <BankRow label={t.contract.iban} value="AE12 0260 0010 1234 5678 901" />
                <BankRow label={t.contract.swiftBic} value="EBILAEAD" isLast />
              </div>
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

            {/* ─────────── FOOTER — navy band with SETT logo, legal copy,
                and "Issued By" panel per the BE PDF. ─────────── */}
            <div className="flex items-start justify-between px-8 py-5 gap-6" style={{ background: '#071c42' }}>
              <div className="flex-1 min-w-0">
                {/* SETT footer wordmark — same root-cause swap as the
                    header. The original src pointed at a non-existent
                    /icons/sett-footer-logo.svg, falling back to the
                    multi-colour sett_logo.svg whose navy sub-line
                    disappeared on the navy footer band. Transparent
                    umbrella PNG is the right asset for this surface. */}
                <img
                  src="/Logos/sett-umbrella-logo-transparent.png"
                  alt="SETT"
                  style={{ height: 36, marginBottom: 10 }}
                />
                <p className="font-montserrat text-[10px] leading-relaxed text-white opacity-80 max-w-[520px]">
                  {t.contract.footerLegal}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0">
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

/* ─── Label/value row inside the bank-details table ─── */
function BankRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div
      className="flex items-center px-4 py-2.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid #E0E0E0' }}
    >
      <span
        className="font-montserrat uppercase"
        style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#686868', width: 180 }}
      >
        {label}
      </span>
      <span className="font-montserrat text-[13px] font-semibold text-sett-navy flex-1">
        {value}
      </span>
    </div>
  );
}

/* ─── Star rating row — ★★★☆☆ pattern. Renders 5 stars; first
 *  `rating` are filled green, rest are empty grey. Null/0 → nothing. */
function StarRating({ rating }: { rating: number | null | undefined }) {
  if (!rating || rating < 1) return null;
  const filled = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div aria-label={`${filled} of 5 stars`} className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="font-montserrat text-[14px] leading-none"
          style={{ color: i < filled ? '#AAC737' : '#D0D0D0' }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/* ─── Hotel image slot — 160×120 box with three states:
 *
 *  1. No URL provided  → dashed-border placeholder + tooltip explaining
 *     the BE enrichment block hasn't shipped yet (or `imageUrl` is null
 *     for this hotel). Same look as the BE PDF's "no image" state.
 *  2. URL provided, loading  → solid-border box, light grey fill.
 *  3. URL provided, load failed (404, CSP block, CORS, etc.) → falls
 *     back to state 1 with a different tooltip so it's diagnosable at
 *     a glance: hover the box and you see what went wrong.
 *
 *  Designer note: a blank box is information too. The tooltip + dashed
 *  border tell staff "this isn't a bug, the image just isn't available
 *  yet" without polluting the preview with intrusive copy. */
function HotelImage({ srcs, alt }: { srcs: string[]; alt: string }) {
  // Cascade through the hotel's ordered image chain (BE `imageUrls[]`: GIATA
  // primary → all WBE keys), advancing to the next candidate on load error —
  // mirrors the Add Hotel search card. The GIATA "primary" is often a broken
  // placeholder, so a single URL frequently failed here; falling back lands on
  // a working WBE photo. When the whole chain is exhausted we show the "no
  // image" placeholder.
  const [idx, setIdx] = useState(0);
  // Reset when the chain content changes (e.g. locale re-fetch swaps proposals).
  const chainKey = srcs.join('|');
  useEffect(() => { setIdx(0); }, [chainKey]);

  // Resolve each URL the same way the add-hotel page does: absolute URLs and
  // `/api/` paths are used as-is; a bare relative path/key is prefixed with the
  // API base (else it 404s against the FE origin).
  const raw = idx < srcs.length ? srcs[idx] : null;
  const resolvedSrc = raw
    ? raw.startsWith('http') || raw.startsWith('/api/')
      ? raw
      : `${process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'}${raw}`
    : null;

  const showImage = !!resolvedSrc;
  const tooltip = srcs.length === 0
    ? 'No image available for this hotel yet'
    : !resolvedSrc
      ? `All ${srcs.length} image candidate(s) failed to load`
      : '';

  return (
    <div
      className="shrink-0 overflow-hidden bg-[#F8F9FA]"
      title={tooltip || undefined}
      style={{
        width: 160,
        height: 120,
        borderRadius: 4,
        border: showImage ? '1px solid #E0E0E0' : '1px dashed #C0C0C0',
      }}
    >
      {showImage && resolvedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          // key by URL so switching candidates remounts and re-fires onError
          // if the next one also fails.
          key={resolvedSrc}
          src={resolvedSrc}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : null}
    </div>
  );
}

/* ─── Hotel card — full BE-PDF spec.
 *  Left-column: 160×120 image (dashed placeholder if no image yet — the
 *  imageUrl field lands in a BE deploy per public/hotecards.txt).
 *  Right-column: name (clickable to SETTHub), stars, address with map-
 *  pin, description (3-line clamped), facility chips. Free-cancellation
 *  pill anchored top-right. Room table beneath. Reservation Ref. in the
 *  card footer. The card has a green left-accent border + soft outline. */
function HotelCard({
  hotel,
  t,
  mealCode,
}: {
  hotel: import('@/types').ProposalHotel;
  t: ReturnType<typeof useLanguage>['t'];
  /** Request-level meal-plan code (BB/RO/HB/FB/AI). Rendered as the FIRST
   *  chip on the card to match the BE PDF, which leads with the meal plan. */
  mealCode?: string | null;
}) {
  const roomEntries = hotel.rooms
    ? Object.entries(hotel.rooms as Record<string, { net?: number; sell?: number; qty?: number; nights?: number }>)
    : [];
  const subtotal = roomEntries.reduce(
    (sum, [, d]) => sum + Number(d.sell ?? 0) * (d.qty ?? 1) * (d.nights ?? 1),
    0,
  );

  const addressLine = [hotel.address, hotel.addressCity, hotel.addressCountry]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(', ');

  // Free-cancellation deadline — BE sends ISO; render dd.mm.yyyy.
  // Use the BE-derived effectiveCancelDeadline so the badge ALWAYS
  // reflects what the customer will see — override when staff has set
  // one, supplier date otherwise. Fall back to the raw supplier field
  // for older proposal payloads that pre-date the cancellation override
  // BE deploy (public/cancellation-override-fe-handover.md §2.1).
  const cancelDate = hotel.effectiveCancelDeadline
    ? formatDateEU(hotel.effectiveCancelDeadline)
    : hotel.cancelDeadline
      ? formatDateEU(hotel.cancelDeadline)
      : null;

  // Facilities — top-3 in BE's brand-priority order (already sorted upstream).
  // BE already caps facilities at 3 in brand-priority order per Neha's
  // deploy spec — slice is defensive belt-and-braces (in case any older
  // legacy proposals ever come back with longer lists).
  const facilities = (hotel.facilities ?? []).slice(0, 3);

  // Meal-plan chip — leads the chip row to match the BE PDF (meal first,
  // then up to 3 facilities → max 4 chips). Map the code to a localised
  // label; fall back to the raw code (uppercased) for unknown values.
  const mealCodeUpper = mealCode?.trim().toUpperCase();
  const mealChip = mealCodeUpper
    ? ((t.contract.meals as Record<string, string>)[mealCodeUpper] ?? mealCodeUpper)
    : null;

  // Hotel name — clickable when SETTHub URL is present. Link opens in
  // a new tab; never embed external nav inline.
  const hotelName = hotel.hotelName ?? hotel.hotelCode;
  const nameEl = hotel.sethubDetailsUrl ? (
    <a
      href={hotel.sethubDetailsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={t.contract.viewOnSettHub}
      className="font-montserrat font-bold text-[16px] text-sett-navy hover:text-sett-green-dark hover:underline transition-colors"
    >
      {hotelName}
    </a>
  ) : (
    <span className="font-montserrat font-bold text-[16px] text-sett-navy">
      {hotelName}
    </span>
  );

  return (
    <div
      className="mb-5 last:mb-0 bg-white"
      style={{
        borderRadius: 4,
        border: '1px solid #E0E0E0',
        borderLeft: '3px solid #071c42',
        overflow: 'hidden',
      }}
    >
      {/* ── Top section: image + meta + free-cancel pill ── */}
      <div className="flex gap-4 p-4">
        <HotelImage
          srcs={hotel.imageUrls?.length ? hotel.imageUrls : (hotel.imageUrl ? [hotel.imageUrl] : [])}
          alt={hotelName}
        />

        {/* Right column — name, stars, address, description, chips */}
        <div className="flex-1 min-w-0">
          {/* Name + stars (left) with the free-cancellation pill (right).
              In-flow flex row with min-w-0 on the name box + shrink-0 on the
              pill, so a longer localized pill label (e.g. German "Kostenfreie
              Stornierung") never overlaps the hotel name — the name wraps
              instead. Replaces the old absolute pill + fixed pr-[160px] hack
              that only left room for the shorter English label. */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex flex-col gap-1">
              {nameEl}
              <StarRating rating={hotel.starRating ?? null} />
            </div>

            {/* Free-cancellation pill — top-right, matching the BE PDF. */}
            {hotel.freeCancellation && (
              <div
                className="shrink-0 inline-flex flex-col items-end px-3 py-1.5 rounded-[6px]"
                style={{
                  background: 'rgba(170,199,55,0.10)',
                  border: '1px solid #AAC737',
                }}
              >
                <span className="font-montserrat font-bold text-[12px] text-sett-green-dark whitespace-nowrap">
                  ✓ {t.contract.freeCancellation}
                </span>
                {cancelDate && (
                  <span className="font-montserrat text-[11px] text-sett-navy whitespace-nowrap mt-0.5">
                    {t.contract.cancelBefore} {cancelDate}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Address — pin icon + comma-joined line */}
          {addressLine && (
            <div className="flex items-start gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5 text-sett-primary shrink-0 mt-0.5" aria-hidden />
              <span className="font-montserrat text-[13px] text-sett-navy leading-snug">
                {addressLine}
              </span>
            </div>
          )}

          {/* Description — 3-line clamp via webkit; comes from BE
              enrichment (master.HotelGiataText). Conditional. */}
          {hotel.description && (
            <p
              className="font-montserrat text-[12px] text-sett-grey leading-relaxed mt-2"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {hotel.description}
            </p>
          )}

          {/* Chip row — meal plan first, then facilities, max 4 in BE's
              priority order (matches the BE PDF). */}
          {(mealChip || facilities.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {mealChip && (
                <span
                  key="__meal"
                  className="inline-flex items-center px-3 py-1 rounded-full font-montserrat text-[11px] font-semibold text-sett-navy border border-sett-primary"
                  style={{ background: 'rgba(170,199,55,0.08)' }}
                >
                  {mealChip}
                </span>
              )}
              {facilities.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center px-3 py-1 rounded-full font-montserrat text-[11px] font-semibold text-sett-navy border border-sett-primary"
                  style={{ background: 'rgba(170,199,55,0.08)' }}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Room table (or fallback) ── */}
      {roomEntries.length > 0 ? (
        <div style={{ borderTop: '1px solid #E0E0E0' }}>
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
        <p className="px-4 py-3 font-montserrat text-[13px] text-sett-grey" style={{ borderTop: '1px solid #E0E0E0' }}>
          {t.contract.total}: {formatCurrencyEU(hotel.totalPrice, hotel.currency)}
        </p>
      )}

      {/* ── Card footer: Reservation Ref. — bottom-right per BE PDF.
          Divider line above it separates the SUBTOTAL row from the ref,
          matching the downloaded PDF. ── */}
      {(hotel.hotelRef || hotel.tid) && (
        <div
          className="flex items-center justify-end px-4 py-2"
          style={{ background: '#F8F9FA', borderTop: '1px solid #E0E0E0' }}
        >
          <span className="font-montserrat text-[12px] text-sett-grey">
            <span className="font-bold text-sett-navy">{t.contract.reservationRef}</span>{' '}
            <span>{hotel.hotelRef ?? hotel.tid ?? `#${hotel.id.slice(0, 8)}`}</span>
          </span>
        </div>
      )}
    </div>
  );
}
