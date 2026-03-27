'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { proposalsApi } from '@/lib/api/proposals';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { BookingRequest, Proposal, ProposalHotel, ProposalService } from '@/types';
import type { RoomsConfig } from '@/types/requests';

interface ContractPreviewModalProps {
  open: boolean;
  onClose: () => void;
  request: BookingRequest;
  proposal: Proposal;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ContractPreviewModal({ open, onClose, request, proposal }: ContractPreviewModalProps) {
  const { t } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const hotels = proposal.hotels ?? [];
  const services = proposal.services ?? [];
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
        className="bg-[#F7F7F7] flex flex-col max-h-[90vh] overflow-hidden"
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
              className="flex items-center justify-center gap-1 font-montserrat font-semibold text-[14px] leading-none uppercase tracking-normal text-white hover:-translate-y-0.5 active:translate-y-[3px] active:scale-95 transition-all duration-200 disabled:opacity-60"
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
            <div className="flex items-start justify-between px-5 pt-5 pb-5" style={{ borderBottom: '1px solid #68686866' }}>
              <div>
                <h2 className="font-bold text-[24px] tracking-wide" style={{ color: '#071C42' }}>SETT</h2>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#AAC737' }}>Sport &amp; Events Tours &amp; Travel</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[12px] uppercase text-[#686868]">{t.contract.taxId}</p>
                <p className="font-bold text-[16px] text-[#1D1D1D]">DE123456789</p>
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
                  <h3 className="font-semibold text-[16px] leading-none uppercase mb-5" style={{ color: '#071C42' }}>
                    {t.contract.hotelDetails}
                  </h3>
                  {hotels.map((hotel, idx) => {
                    const roomEntries = hotel.rooms
                      ? Object.entries(hotel.rooms as Record<string, { net?: number; sell?: number; qty?: number; nights?: number }>)
                      : [];
                    return (
                      <div key={hotel.id} className="mb-5 last:mb-0">
                        <p className="font-semibold text-[14px] mb-3 text-[#1D1D1D]">
                          {idx + 1}. {hotel.hotelName ?? hotel.hotelCode}
                          {hotel.tid && <span className="text-[12px] text-[#686868] font-normal ml-2">Reference number: {hotel.tid}</span>}
                        </p>
                        {roomEntries.length > 0 && (
                          <table className="w-full text-[13px]" style={{ border: '1px solid #68686866', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr className="bg-[#F7F7F7]">
                                <th className="text-left px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.roomType}</th>
                                <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.net}</th>
                                <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.sell}</th>
                                <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.qty}</th>
                                <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.nights}</th>
                                <th className="text-right px-3 py-2.5 font-semibold text-[11px] uppercase text-[#686868]" style={{ borderBottom: '1px solid #68686866' }}>{t.contract.total}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roomEntries.map(([type, detail]) => (
                                <tr key={type} style={{ borderBottom: '1px solid #68686866' }}>
                                  <td className="px-3 py-2.5 capitalize">{type.replace(/_/g, ' ')}</td>
                                  <td className="px-3 py-2.5 text-right">{Number(detail.net ?? 0).toFixed(2)}</td>
                                  <td className="px-3 py-2.5 text-right">{Number(detail.sell ?? 0).toFixed(2)}</td>
                                  <td className="px-3 py-2.5 text-right">{detail.qty ?? 1}</td>
                                  <td className="px-3 py-2.5 text-right">{detail.nights ?? 1}</td>
                                  <td className="px-3 py-2.5 text-right font-semibold">
                                    {(Number(detail.sell ?? 0) * (detail.qty ?? 1) * (detail.nights ?? 1)).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {roomEntries.length === 0 && (
                          <p className="text-[13px] text-[#686868]">
                            Total: {hotel.currency} {Number(hotel.totalPrice).toFixed(2)}
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
                          <td className="px-3 py-2.5 text-right">{Number(s.buyPrice ?? 0).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right">{Number(s.sellPrice ?? 0).toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">
                            {(Number(s.sellPrice ?? 0) * (s.quantity ?? 1)).toFixed(2)}
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
              <span className="font-bold text-[20px] text-white">€{grandTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* ── CANCELLATION CONDITIONS ── */}
            {request.cancellationConditions && (
              <>
                <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />
                <div className="px-5 py-5">
                  <h3 className="font-semibold text-[16px] leading-none uppercase mb-4" style={{ color: '#071C42' }}>{t.contract.cancellationConditions}</h3>
                  <p className="font-normal text-[13px] text-[#686868] whitespace-pre-line leading-relaxed">{request.cancellationConditions}</p>
                </div>
              </>
            )}

            {/* ── TERMS & CONDITIONS ── */}
            {request.termsAndConditions && (
              <>
                <div className="mx-5" style={{ borderTop: '1px solid #68686866' }} />
                <div className="px-5 py-5">
                  <h3 className="font-semibold text-[16px] leading-none uppercase mb-4" style={{ color: '#071C42' }}>{t.contract.termsConditions}</h3>
                  <p className="font-normal text-[13px] text-[#686868] whitespace-pre-line leading-relaxed">{request.termsAndConditions}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
