'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
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

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blobUrl = await proposalsApi.previewPdf(proposal.id);
      window.open(blobUrl, '_blank');
    } catch {
      // fallback to browser print
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

  return (
    <Modal open={open} onClose={onClose} title={t.contract.title} className="max-w-3xl">
      <div className="space-y-6 text-body text-sett-text-primary">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-sett-border pb-4">
          <div>
            <h2 className="text-heading-md font-bold">{t.contract.companyName}</h2>
            <p className="text-caption text-sett-text-accent">{t.contract.companySubtitle}</p>
          </div>
          <div className="text-right text-caption text-sett-text-secondary">
            <p>{t.contract.reservationNumber}{request.referenceNumber ?? request.id.slice(0, 8)}</p>
            <p>{t.contract.date}: {formatDate(request.createdAt)}</p>
          </div>
        </div>

        {/* S.E.T.T Worldwide Reservation File */}
        <div>
          <h3 className="text-body font-bold mb-2">{t.contract.reservationFile}</h3>
          <div className="grid grid-cols-2 gap-4 text-caption">
            <div>
              <span className="text-sett-text-accent">{t.contract.reservationRef}:</span>{' '}
              <span>{request.referenceNumber ?? request.id.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-sett-text-accent">{t.contract.hotelCategory}:</span>{' '}
              <span>{request.starRating ? `${request.starRating}-Star` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Prepared For */}
        <div className="bg-sett-fill rounded-card p-4">
          <h4 className="text-label font-bold text-sett-text-primary uppercase tracking-wide mb-2">{t.contract.preparedFor}</h4>
          <div className="grid grid-cols-2 gap-2 text-caption">
            <div><span className="text-sett-text-accent">{t.contract.contact}:</span> {contactName}</div>
            <div><span className="text-sett-text-accent">{t.contract.email}:</span> {request.contactEmail ?? '—'}</div>
            <div><span className="text-sett-text-accent">{t.contract.company}:</span> {request.companyName ?? '—'}</div>
            <div><span className="text-sett-text-accent">{t.contract.phone}:</span> {request.contactPhone ?? '—'}</div>
          </div>
        </div>

        {/* Trip Details */}
        <div>
          <h4 className="text-label font-bold text-sett-text-primary uppercase tracking-wide mb-2">{t.contract.tripDetails}</h4>
          <div className="grid grid-cols-3 gap-2 text-caption">
            <div><span className="text-sett-text-accent">{t.contract.destination}:</span> {request.destinationName ?? '—'}</div>
            <div><span className="text-sett-text-accent">{t.contract.checkIn}:</span> {formatDate(request.checkinDate)}</div>
            <div><span className="text-sett-text-accent">{t.contract.checkOut}:</span> {formatDate(request.checkoutDate)}</div>
          </div>
        </div>

        {/* Hotel Details */}
        {hotels.length > 0 && (
          <div>
            <h4 className="text-label font-bold text-sett-text-primary uppercase tracking-wide mb-2">{t.contract.hotelDetails}</h4>
            {hotels.map((hotel, idx) => {
              const roomEntries = hotel.rooms
                ? Object.entries(hotel.rooms as Record<string, { net?: number; sell?: number; qty?: number; nights?: number }>)
                : [];
              return (
                <div key={hotel.id} className="mb-3">
                  <p className="text-body font-semibold mb-1">
                    {idx + 1}. {hotel.hotelName ?? hotel.hotelCode}
                  </p>
                  {roomEntries.length > 0 && (
                    <table className="w-full text-caption border border-sett-border">
                      <thead>
                        <tr className="bg-sett-fill">
                          <th className="text-left px-2 py-1 border-b border-sett-border">{t.contract.roomType}</th>
                          <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.net}</th>
                          <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.sell}</th>
                          <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.qty}</th>
                          <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.nights}</th>
                          <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.total}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomEntries.map(([type, detail]) => (
                          <tr key={type} className="border-b border-sett-border last:border-0">
                            <td className="px-2 py-1 capitalize">{type.replace(/_/g, ' ')}</td>
                            <td className="px-2 py-1 text-right">{Number(detail.net ?? 0).toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{Number(detail.sell ?? 0).toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{detail.qty ?? 1}</td>
                            <td className="px-2 py-1 text-right">{detail.nights ?? 1}</td>
                            <td className="px-2 py-1 text-right font-semibold">
                              {(Number(detail.sell ?? 0) * (detail.qty ?? 1) * (detail.nights ?? 1)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {roomEntries.length === 0 && (
                    <p className="text-caption text-sett-text-secondary">
                      Total: {hotel.currency} {Number(hotel.totalPrice).toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Service Details */}
        {services.length > 0 && (
          <div>
            <h4 className="text-label font-bold text-sett-text-primary uppercase tracking-wide mb-2">{t.contract.serviceDetails}</h4>
            <table className="w-full text-caption border border-sett-border">
              <thead>
                <tr className="bg-sett-fill">
                  <th className="text-left px-2 py-1 border-b border-sett-border">{t.contract.service}</th>
                  <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.qty}</th>
                  <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.buy}</th>
                  <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.sell}</th>
                  <th className="text-right px-2 py-1 border-b border-sett-border">{t.contract.total}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-sett-border last:border-0">
                    <td className="px-2 py-1">{s.serviceName ?? '—'}</td>
                    <td className="px-2 py-1 text-right">{s.quantity ?? 1}</td>
                    <td className="px-2 py-1 text-right">{Number(s.buyPrice ?? 0).toFixed(2)}</td>
                    <td className="px-2 py-1 text-right">{Number(s.sellPrice ?? 0).toFixed(2)}</td>
                    <td className="px-2 py-1 text-right font-semibold">
                      {(Number(s.sellPrice ?? 0) * (s.quantity ?? 1)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grand Total */}
        <div className="bg-sett-fill rounded-card p-4 flex justify-between items-center">
          <span className="font-bold">{t.contract.grandTotal}</span>
          <span className="text-heading-sm font-bold">&euro;{grandTotal.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Cancellation Conditions */}
        {request.cancellationConditions && (
          <div>
            <h4 className="text-label font-bold text-sett-text-primary uppercase tracking-wide mb-2">{t.contract.cancellationConditions}</h4>
            <p className="text-caption text-sett-text-secondary whitespace-pre-line">{request.cancellationConditions}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {request.termsAndConditions && (
          <div>
            <h4 className="text-label font-bold text-sett-text-primary uppercase tracking-wide mb-2">{t.contract.termsConditions}</h4>
            <p className="text-caption text-sett-text-secondary whitespace-pre-line">{request.termsAndConditions}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-6 border-t border-sett-border pt-4">
        <Button variant="secondary" onClick={onClose}>
          {t.modals.close}
        </Button>
        <Button variant="primary" onClick={handleDownloadPdf} isLoading={downloading}>
          {t.modals.downloadPdf}
        </Button>
      </div>
    </Modal>
  );
}
