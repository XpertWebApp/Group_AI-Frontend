'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { proposalsApi } from '@/lib/api/proposals';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateEU } from '@/lib/dateFormatter';
import { formatPriceEU, formatCurrencyEU, formatPercentageEU } from '@/lib/numberFormatter';
import type { BookingRequest, Proposal, ProposalHotel, ProposalService } from '@/types';
import type { RoomsConfig } from '@/types/requests';

interface ContractPreviewModalProps {
  open: boolean;
  onClose: () => void;
  request: BookingRequest;
  proposal: Proposal;
}

function formatDate(dateStr: string | null | undefined): string {
  return formatDateEU(dateStr);
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  twinbeds: 'Twin Rooms',
  standarddoublebeds: 'Standard Double Rooms',
  single: 'Single',
  double: 'Double',
  twin: 'Twin',
  triple: 'Triple',
  quadruple: 'Quadruple',
  suite: 'Suite',
  suites: 'Suites',
};

function formatRoomType(raw: string): string {
  const known = ROOM_TYPE_LABELS[raw.toLowerCase().replace(/[_\s]/g, '')];
  if (known) return known;
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRoomLabel(type: string, detail: any): string {
  // If actual descriptions are available from the hotel, use those
  if (detail.actualDescriptions && detail.actualDescriptions.length > 0) {
    return detail.actualDescriptions[0];
  }
  // Otherwise, use the requested room type
  return formatRoomType(type);
}

export function ContractPreviewModal({ open, onClose, request, proposal }: ContractPreviewModalProps) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  // Only show hotels/services that are included in the total
  const hotels = (proposal.hotels ?? []).filter((h) => h.includedInTotal !== false);
  const services = (proposal.services ?? []).filter((sv) => sv.includedInTotal !== false);
  const rooms = request.rooms as RoomsConfig | null | undefined;
  const contactName = [request.firstName, request.lastName].filter(Boolean).join(' ') || request.contactName || '—';

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blobUrl = await proposalsApi.previewPdf(proposal.id);
      window.open(blobUrl, '_blank');
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const hotelTotal = hotels.reduce((s, h) => s + Number(h.totalPrice ?? 0), 0);
  const serviceTotal = services.reduce(
    (s, sv) => s + Number(sv.sellPrice ?? 0) * (sv.quantity ?? 1),
    0
  );
  const grandTotal = hotelTotal + serviceTotal;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white flex flex-col max-h-[90vh] overflow-hidden"
        style={{ width: 790, borderRadius: 14, boxShadow: '0px 4px 20px 0px #00000014' }}
      >
        {/* ── Top Section ── */}
        <div
          className="flex items-center justify-between shrink-0 bg-white px-5"
          style={{ height: 83, borderBottom: '1px solid #68686866' }}
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-montserrat font-semibold text-[18px] leading-none tracking-normal" style={{ color: '#071C42' }}>
              {t.contract.title}
            </h2>
            <p className="font-montserrat font-normal text-[14px] leading-none tracking-normal" style={{ color: '#4A4A4A' }}>
              {t.contract.companySubtitle} {contactName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center justify-center gap-1 font-montserrat font-semibold text-[16px] leading-none tracking-normal text-white hover:-translate-y-0.5 active:translate-y-[3px] active:scale-95 transition-all duration-200 disabled:opacity-60"
              style={{
                width: 176,
                height: 44,
                borderRadius: 14,
                paddingTop: 12,
                paddingRight: 16,
                paddingBottom: 12,
                paddingLeft: 16,
                background: '#AAC737',
                boxShadow: '4px 4px 5px 0px #FFFFFF40 inset, 0px 8px 20px 0px #00000021',
              }}
            >
              <Download className="w-4 h-4" />
              {downloading ? t.common.loading : t.modals.downloadPdf}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#F7F7F7] text-[#686868] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div
          className="flex-1 overflow-y-auto p-5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#AAC737 #F0F0F0' }}
        >
          <div
            className="bg-white font-montserrat text-[#1D1D1D]"
            style={{ borderRadius: 14, border: '1px solid #68686866' }}
          >
            {/* ── Logo + TAX ID ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-5" style={{ borderBottom: '1px solid #68686866' }}>
              <img src="/icons/sett_logo.svg" alt="SETT" style={{ height: 40 }} />
              <div className="flex flex-col items-end" style={{ gap: 8 }}>
                <span
                  className="font-montserrat uppercase text-center"
                  style={{ fontWeight: 400, fontSize: 12, lineHeight: '100%', letterSpacing: 0, color: '#4A4A4A' }}
                >
                  {t.contract.taxId}
                </span>
                <span
                  className="font-montserrat"
                  style={{ fontWeight: 500, fontSize: 14, lineHeight: '100%', letterSpacing: 0, color: '#071C42' }}
                >
                  1001233897
                </span>
              </div>
            </div>

            {/* ── S-E-T-T WORLDWIDE RESERVATION FZE ── */}
            <div className="px-5 py-5" style={{ gap: 20 }}>
              <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#071C42' }}>
                {t.contract.sectionTitle}
              </h3>
              {/* Row 1: Assigned Person | Email Address | Phone Number */}
              <div className="flex gap-5 mb-5">
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.assignedPerson}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">Vincent Riefler</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.emailAddress}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">vincent@s-e-t-t.com</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.phoneNumber}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">+45 32 74 93 16</span>
                </div>
              </div>
              {/* Row 2: Website | Address */}
              <div className="flex gap-5">
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.website}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">https://www.s-e-t-t.com/</span>
                </div>
                <div className="flex flex-col flex-1" style={{ gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.address}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">Fujairah Creative Tower, P.O. Box 4422, Fujairah, United Arab Emirates</span>
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />

            {/* ── CONTRACT ── */}
            <div className="px-5 py-5">
              <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#071C42' }}>
                {t.contract.contractSection}
              </h3>
              <div className="flex gap-5">
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.companyId}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">4490</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.documentCode}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{request.referenceNumber ?? request.id.slice(0, 8)}/{new Date(request.createdAt).getFullYear()}</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.createdDate}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">Fujairah, {formatDate(request.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />

            {/* ── PREPARED FOR ── */}
            <div className="px-5 py-5">
              <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#071C42' }}>
                {t.contract.preparedFor}
              </h3>
              {/* Row 1: Customer Person | Email | Phone */}
              <div className="flex gap-5 mb-5">
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.customerPerson}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{contactName}</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.emailAddress}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{request.contactEmail ?? '—'}</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.phoneNumber}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{request.contactPhone ?? '—'}</span>
                </div>
              </div>
              {/* Row 2: Address */}
              <div className="flex gap-5">
                <div className="flex flex-col flex-1" style={{ gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.address}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{request.hotelLocation ?? request.destinationName ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />

            {/* ── TRIP DETAILS ── */}
            <div className="px-5 py-5">
              <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#071C42' }}>
                {t.contract.tripDetails}
              </h3>
              <div className="flex gap-5">
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.destination}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{request.destinationName ?? '—'}</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.checkInOut}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{formatDate(request.checkinDate)} — {formatDate(request.checkoutDate)}</span>
                </div>
                <div className="flex flex-col" style={{ width: 223, gap: 8 }}>
                  <span className="font-semibold text-[12px] uppercase" style={{ color: '#071C42' }}>{t.contract.guests}</span>
                  <span className="font-normal text-[14px] text-[#1D1D1D]">{request.groupSize ?? '—'}</span>
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />

            {/* ── HOTEL DETAILS ── */}
            {hotels.length > 0 && (
              <>
                <div className="px-5 py-5">
                  {/* Section Title */}
                  <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#1D1D1D' }}>
                    {t.contract.hotelDetails}
                  </h3>

                  {hotels.map((hotel) => {
                    const roomEntries = hotel.rooms
                      ? Object.entries(hotel.rooms as Record<string, { net?: number; sell?: number; qty?: number; nights?: number }>)
                      : [];
                    const subtotal = roomEntries.reduce(
                      (sum, [, d]) => sum + Number(d.sell ?? 0) * (d.qty ?? 1) * (d.nights ?? 1),
                      0
                    );
                    return (
                      <div key={hotel.id} className="mb-5 last:mb-0 flex flex-col" style={{ gap: 8 }}>
                        {/* Hotel name + Reference number row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-[#AAC737]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" />
                              <path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
                            </svg>
                            <span className="font-semibold text-[14px] leading-none text-[#1D1D1D]">
                              {hotel.hotelName ?? hotel.hotelCode}
                            </span>
                          </div>
                          {(hotel.hotelRef || hotel.tid) && (
                            <span className="text-[14px] leading-none" style={{ color: '#4A4A4A' }}>
                              <span className="font-semibold">Reference number:</span>{' '}
                              <span className="font-medium">{hotel.hotelRef ?? hotel.tid ?? `#${hotel.id.slice(0, 8)}`}</span>
                            </span>
                          )}
                        </div>

                        {/* Room table */}
                        {roomEntries.length > 0 && (
                          <div style={{ borderRadius: 14, border: '1px solid #E6EAF0', overflow: 'hidden' }}>
                            {/* Table header */}
                            <div className="flex items-center px-[13px] py-[14px]" style={{ borderBottom: '1px solid #E6EAF0' }}>
                              <span className="flex-1 font-semibold text-[12px] uppercase" style={{ color: '#4A4A4A' }}>
                                {t.contract.roomType ?? 'Room Type'}
                              </span>
                              <span className="font-semibold text-[12px] uppercase text-center" style={{ width: 80, color: '#4A4A4A' }}>
                                Rate
                              </span>
                              <span className="font-semibold text-[12px] uppercase text-center" style={{ width: 55, color: '#4A4A4A' }}>
                                {t.contract.qty}
                              </span>
                              <span className="font-semibold text-[12px] uppercase text-center" style={{ width: 65, color: '#4A4A4A' }}>
                                {t.contract.nights}
                              </span>
                              <span className="font-semibold text-[12px] uppercase text-right" style={{ width: 100, color: '#4A4A4A' }}>
                                Total (EUR)
                              </span>
                            </div>

                            {/* Room rows */}
                            {roomEntries.map(([type, detail]) => {
                              const rowTotal = Number(detail.sell ?? 0) * (detail.qty ?? 1) * (detail.nights ?? 1);
                              return (
                                <div key={type} className="flex items-center px-[13px] py-3" style={{ borderBottom: '1px solid #E6EAF0' }}>
                                  <span className="flex-1 font-normal text-[13px] text-[#1D1D1D]">
                                    {getRoomLabel(type, detail)}
                                  </span>
                                  <span className="font-normal text-[13px] text-[#1D1D1D] text-center" style={{ width: 80 }}>
                                    €{formatPriceEU(detail.sell ?? 0)}
                                  </span>
                                  <span className="font-normal text-[13px] text-[#1D1D1D] text-center" style={{ width: 55 }}>
                                    {detail.qty ?? 1}
                                  </span>
                                  <span className="font-normal text-[13px] text-[#1D1D1D] text-center" style={{ width: 65 }}>
                                    {detail.nights ?? 1}
                                  </span>
                                  <span className="font-bold text-[13px] text-[#1D1D1D] text-right" style={{ width: 100 }}>
                                    €{formatPriceEU(rowTotal)}
                                  </span>
                                </div>
                              );
                            })}

                            {/* Subtotal row */}
                            <div className="flex items-center justify-end px-[13px] py-3">
                              <span className="font-medium text-[13px] text-[#686868] mr-3">Subtotal</span>
                              <span className="font-bold text-[14px] text-[#1D1D1D]" style={{ width: 100, textAlign: 'right' }}>
                                €{formatPriceEU(subtotal)}
                              </span>
                            </div>
                          </div>
                        )}

                        {roomEntries.length === 0 && (
                          <p className="text-[13px] text-[#686868]">
                            Total: {formatCurrencyEU(hotel.totalPrice, hotel.currency)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />
              </>
            )}

            {/* ── SERVICE DETAILS ── */}
            {services.length > 0 && (
              <>
                <div className="px-5 py-5">
                  <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#071C42' }}>
                    {t.contract.serviceDetails}
                  </h3>
                  <table className="w-full text-[13px]" style={{ border: '1px solid #68686866', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-[#F7F7F7]">
                        <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.service}</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.qty}</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.buy}</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.sell}</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #68686866' }}>
                          <td className="px-3 py-2.5">{s.serviceName ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right">{s.quantity ?? 1}</td>
                          <td className="px-3 py-2.5 text-right">{formatPriceEU(s.buyPrice ?? 0)}</td>
                          <td className="px-3 py-2.5 text-right">{formatPriceEU(s.sellPrice ?? 0)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">
                            {formatPriceEU((Number(s.sellPrice ?? 0) * (s.quantity ?? 1)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />
              </>
            )}

            {/* ── GRAND TOTAL ── */}
            <div className="mx-5 my-5 flex justify-between items-center p-4 rounded-[14px]" style={{ background: '#071C42' }}>
              <span className="font-bold text-[16px] text-white">{t.contract.grandTotal}</span>
              <span className="font-bold text-[20px] text-white">€{formatPriceEU(grandTotal)}</span>
            </div>

            {/* ── CANCELLATION CONDITIONS ── */}
            {request.cancellationConditions && (
              <>
                <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />
                <div className="px-5 py-5">
                  <h3 className="font-semibold text-[16px] leading-none uppercase mb-4" style={{ color: '#071C42' }}>{t.contract.cancellationConditions}</h3>
                  <div
                    className="font-normal text-[13px] text-[#686868] leading-relaxed contract-html-content"
                    dangerouslySetInnerHTML={{ __html: request.cancellationConditions }}
                  />
                </div>
              </>
            )}

            {/* ── TERMS & CONDITIONS ── */}
            <>
              <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />
              <div className="px-5 py-5">
                <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#1D1D1D' }}>
                  {t.contract.termsConditions}
                </h3>

                {/* T&C content */}
                {request.termsAndConditions && (
                  <div
                    className="font-normal text-[13px] text-[#1D1D1D] leading-relaxed mb-5 contract-html-content"
                    dangerouslySetInnerHTML={{ __html: request.termsAndConditions }}
                  />
                )}

                {/* Payment notice */}
                <div
                  className="flex items-center px-4 py-3 mb-5"
                  style={{ background: '#FEF2F2', borderRadius: 14, borderLeft: '3px solid #F87171' }}
                >
                  <p className="font-normal text-[14px] text-[#1D1D1D]">
                    Please pay{' '}
                    <span className="font-bold">
                      {formatPriceEU(grandTotal)} EUR
                    </span>{' '}
                    until{' '}
                    <span className="font-bold">
                      {request.checkoutDate
                        ? new Date(new Date(request.checkoutDate).getTime() - 30 * 24 * 60 * 60 * 1000)
                            .toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—'}
                    </span>
                    .
                  </p>
                </div>

                {/* Standard terms */}
                <ul className="flex flex-col gap-3">
                  <li className="flex gap-2 text-[13px] leading-relaxed text-[#1D1D1D]">
                    <span className="shrink-0 mt-0.5 text-[#686868]">·</span>
                    <span>Rates and availability is based on the booked number of rooms and passengers / nights only and can be subject to changes if any of these parameters is changed/amended</span>
                  </li>
                  <li className="flex gap-2 text-[13px] leading-relaxed text-[#1D1D1D]">
                    <span className="shrink-0 mt-0.5 text-[#686868]">·</span>
                    <span>Should there be any changes in the taxes/city taxes during the contract&apos;s validity, so will the rates be amended according to the resulting new tax/city taxes regulations</span>
                  </li>
                  <li className="flex gap-2 text-[13px] leading-relaxed text-[#1D1D1D]">
                    <span className="shrink-0 mt-0.5 text-[#686868]">·</span>
                    <span>All Rates are NET Rates (no commission included) and need to be paid without any deductions or bank fees.</span>
                  </li>
                  <li className="flex gap-2 text-[13px] leading-relaxed text-[#1D1D1D]">
                    <span className="shrink-0 mt-0.5 text-[#686868]">·</span>
                    <span>This document is printed out electronically and is valid without stamp and signature</span>
                  </li>
                </ul>
              </div>
            </>

            {/* ── Divider ── */}
            <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />

            {/* ── ISSUED BY ── */}
            <div className="px-5 py-5 flex flex-col items-end">
              <span className="font-semibold text-[14px] uppercase text-[#1D1D1D]">Issued By</span>
              <span className="font-normal text-[14px] text-[#1D1D1D] mt-1">Oliver Riefler</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
