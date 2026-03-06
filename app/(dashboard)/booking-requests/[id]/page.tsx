'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Star, Pencil, Building2, FileText, Phone, Mail, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { AddServiceModal } from '@/components/forms/AddServiceModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ContractPreviewModal } from '@/components/ui/ContractPreviewModal';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import type { BookingRequest, Proposal, ProposalHotel, ProposalService } from '@/types';
import type { RoomsConfig } from '@/types/requests';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'fill-[#AAC737] text-[#AAC737]' : 'fill-none text-sett-text-accent'}`}
        />
      ))}
    </div>
  );
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [removeHotelTarget, setRemoveHotelTarget] = useState<string | null>(null);
  const [saveDraftOpen, setSaveDraftOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const req = await requestsApi.get(id);
      if (req) setRequest(req);

      // Try to load the proposal for this request
      const proposals = await proposalsApi.list();
      const linked = proposals.find((p) => p.requestId === id);
      if (linked) {
        const full = await proposalsApi.get(linked.id);
        if (full) setProposal(full);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rooms = request?.rooms as RoomsConfig | null | undefined;
  const hotels = useMemo(() => proposal?.hotels ?? [], [proposal?.hotels]);
  const services = useMemo(() => proposal?.services ?? [], [proposal?.services]);

  const totals = useMemo(() => {
    const hotelTotal = hotels.reduce((s, h) => s + Number(h.totalPrice ?? 0), 0);
    const serviceBuyTotal = services.reduce(
      (s, sv) => s + Number(sv.buyPrice ?? 0) * (sv.quantity ?? 1),
      0
    );
    const serviceSellTotal = services.reduce(
      (s, sv) => s + Number(sv.sellPrice ?? 0) * (sv.quantity ?? 1),
      0
    );
    const totalPurchase = hotelTotal + serviceBuyTotal;
    const totalSell = hotelTotal + serviceSellTotal;
    const markupEur = totalSell - totalPurchase;
    const margin = totalPurchase > 0 ? (markupEur / totalPurchase) * 100 : 0;
    return { totalPurchase, totalSell, markupEur, margin };
  }, [hotels, services]);

  const handleCreateProposal = async () => {
    setActionLoading(true);
    try {
      const result = await requestsApi.createProposal(id, {});
      const full = await proposalsApi.get(result.id);
      if (full) setProposal(full);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddHotelsClick = async () => {
    if (!proposal) {
      // Create a proposal first, then navigate
      setActionLoading(true);
      try {
        const result = await requestsApi.createProposal(id, {});
        router.push(`/booking-requests/${id}/add-hotel?proposalId=${result.id}`);
      } catch {
        setActionLoading(false);
      }
    } else {
      router.push(`/booking-requests/${id}/add-hotel?proposalId=${proposal.id}`);
    }
  };

  const handleRemoveHotel = async (hotelId: string) => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await proposalsApi.removeHotel(proposal.id, hotelId);
      setProposal((p) =>
        p ? { ...p, hotels: (p.hotels ?? []).filter((h) => h.id !== hotelId) } : null
      );
      setRemoveHotelTarget(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddService = async (payload: Parameters<typeof proposalsApi.addService>[1]) => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const added = await proposalsApi.addService(proposal.id, payload);
      setProposal((p) =>
        p ? { ...p, services: [...(p.services ?? []), added] } : null
      );
      setAddServiceOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const updated = await proposalsApi.saveDraft(proposal.id);
      setProposal(updated);
      setSaveDraftOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const updated = await proposalsApi.send(proposal.id);
      setProposal(updated);
      setSendOpen(false);
      setSuccessOpen(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await proposalsApi.update(proposal.id, {} as never);
      // Update local state - mark as declined via status update
      setProposal((p) => p ? { ...p, status: 'declined' as never } : null);
      setDeclineOpen(false);
      router.push('/booking-requests');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Header title="Create Request" />
        <p className="text-body text-sett-text-secondary">Request not found.</p>
        <Button variant="secondary" onClick={() => router.push('/booking-requests')}>
          Back
        </Button>
      </div>
    );
  }

  const breakfastLabel = request.breakfastPreference === 'BB' ? 'With Breakfast' : request.breakfastPreference === 'RO' ? 'Without Breakfast' : '—';
  const locationLabel = request.hotelLocation === 'central' ? 'Central Location' : request.hotelLocation === 'outside_city_center' ? 'Outside City Center' : '—';

  return (
    <div className="space-y-6 pb-24">
      <Header title="Create Request" />

      {/* Back + Offer ID */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/booking-requests')}
          className="flex items-center gap-1 text-body text-sett-text-secondary hover:text-sett-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-sett-border">|</span>
        <span className="text-heading-sm font-bold text-sett-text-primary">
          Offer #{request.referenceNumber ?? id.slice(0, 4)}
        </span>
      </div>

      {/* Main content area */}
      <div className="flex gap-6">
        {/* Left column: Request summary + Hotels + Services */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Request Summary card */}
          <div className="bg-sett-card rounded-card border border-sett-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-heading-sm font-bold text-sett-text-primary">Request Summary</h2>
                    <Pencil className="w-4 h-4 text-sett-text-accent" />
                  </div>
                  <p className="text-body text-sett-text-accent mt-0.5">Booking details for this offer</p>
                </div>
              </div>
              <Button variant="primary" onClick={handleAddHotelsClick} isLoading={actionLoading}>
                Add Hotels
              </Button>
            </div>

            {/* Trip Details */}
            <div className="mb-6">
              <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">Trip Details</h3>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-body text-sett-text-secondary">
                    <MapPin className="w-4 h-4 text-sett-text-accent" />
                    {request.destinationName || '—'}
                  </div>
                  <div className="flex items-center gap-1.5 text-body text-sett-text-secondary">
                    <Calendar className="w-4 h-4 text-sett-text-accent" />
                    {formatDate(request.checkinDate)} - {formatDate(request.checkoutDate)}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-label text-sett-text-accent uppercase tracking-wide">Hotel Category</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-body text-sett-text-secondary">({request.starRating}-Star)</span>
                      {request.starRating && <StarRating rating={request.starRating} />}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-label text-sett-text-accent uppercase tracking-wide">Budget Range</p>
                    <p className="text-body text-sett-text-secondary mt-0.5">{request.budgetRange || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-label text-sett-text-accent uppercase tracking-wide">Group Type</p>
                    <p className="text-body text-sett-text-secondary mt-0.5 capitalize">{request.groupType || '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-label text-sett-text-accent uppercase tracking-wide">Guests</p>
                    <p className="text-body text-sett-text-secondary mt-0.5">{request.groupSize ?? '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-sett-border mb-6" />

            {/* Room & Accommodations */}
            <div className="mb-6">
              <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">Room & Accommodations</h3>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'SINGLE', value: rooms?.single },
                  { label: 'DOUBLE', value: rooms?.double },
                  { label: 'TRIPLE', value: rooms?.triple },
                  { label: 'QUADRUPLE', value: rooms?.quadruple },
                ].map((room) => (
                  <div key={room.label} className="border border-sett-border rounded-card p-4 text-center">
                    <p className="text-heading-sm font-bold text-sett-text-primary">{room.value || '—'}</p>
                    <p className="text-label text-sett-text-accent uppercase tracking-wide">{room.label}</p>
                  </div>
                ))}
              </div>

              {rooms?.extraRoomsNote && (
                <div className="bg-[#f0f5ff] rounded-card px-4 py-3 mb-4">
                  <span className="font-semibold text-body text-sett-text-primary">Extras: </span>
                  <span className="text-body text-sett-text-secondary">{rooms.extraRoomsNote}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-sett-border rounded-card p-4 text-center">
                  <p className="text-body font-semibold text-sett-text-primary">{breakfastLabel}</p>
                  <p className="text-label text-sett-text-accent uppercase tracking-wide">Breakfast Preference</p>
                </div>
                <div className="border border-sett-border rounded-card p-4 text-center">
                  <p className="text-body font-semibold text-sett-text-primary">{locationLabel}</p>
                  <p className="text-label text-sett-text-accent uppercase tracking-wide">Hotel Location</p>
                </div>
              </div>

              {request.specialRequirements && (
                <div className="bg-[#f0f5ff] rounded-card px-4 py-3">
                  <span className="font-semibold text-body text-sett-text-primary">Special requirement: </span>
                  <span className="text-body text-sett-text-secondary">{request.specialRequirements}</span>
                </div>
              )}
            </div>

            <hr className="border-sett-border mb-6" />

            {/* Customer Details */}
            <div className="mb-6">
              <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">Customer Details</h3>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-sett-text-accent" />
                    <span className="text-label text-sett-text-accent uppercase tracking-wide">Company Name</span>
                  </div>
                  <p className="text-body text-sett-text-primary">{request.companyName || '—'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-sett-text-accent" />
                    <span className="text-label text-sett-text-accent uppercase tracking-wide">Guest List</span>
                  </div>
                  {request.guestListFileKey ? (
                    <a href="#" className="text-body text-sett-primary hover:underline">{request.guestListFileKey}</a>
                  ) : (
                    <p className="text-body text-sett-text-secondary">—</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-sett-text-accent" />
                    <span className="text-label text-sett-text-accent uppercase tracking-wide">Contact Person</span>
                  </div>
                  <p className="text-body text-sett-text-primary">
                    {[request.firstName, request.lastName].filter(Boolean).join(' ') || request.contactName || '—'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-sett-text-accent" />
                    <span className="text-label text-sett-text-accent uppercase tracking-wide">Email Address</span>
                  </div>
                  <p className="text-body text-sett-text-primary">{request.contactEmail || '—'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-sett-text-accent" />
                    <span className="text-label text-sett-text-accent uppercase tracking-wide">Phone Number</span>
                  </div>
                  <p className="text-body text-sett-text-primary">{request.contactPhone || '—'}</p>
                </div>
              </div>
              {request.customerNotes && (
                <div className="bg-[#f0f5ff] rounded-card px-4 py-3">
                  <span className="font-semibold text-body text-sett-text-primary">Special requirement: </span>
                  <span className="text-body text-sett-text-secondary">{request.customerNotes}</span>
                </div>
              )}
            </div>

            <hr className="border-sett-border mb-6" />

            {/* Policies */}
            <div>
              <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">Policies</h3>
              {request.termsAndConditions && (
                <div className="bg-sett-fill rounded-card px-4 py-3 mb-3">
                  <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">Terms & Conditions</p>
                  <p className="text-body text-sett-text-secondary whitespace-pre-line">{request.termsAndConditions}</p>
                </div>
              )}
              {request.cancellationConditions && (
                <div className="bg-sett-fill rounded-card px-4 py-3">
                  <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">Cancellation Conditions</p>
                  <p className="text-body text-sett-text-secondary whitespace-pre-line">{request.cancellationConditions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Hotels Section - only show when proposal exists */}
          {proposal && (
            <div className="bg-sett-card rounded-card border border-sett-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-heading-sm font-bold text-sett-text-primary">Hotels</h3>
                <Button variant="primary" size="sm" onClick={handleAddHotelsClick}>
                  + Add Hotel
                </Button>
              </div>

              {hotels.length === 0 ? (
                <p className="text-body text-sett-text-accent py-4">No hotels added yet. Click &quot;Add Hotels&quot; to search and add hotels.</p>
              ) : (
                <div className="space-y-4">
                  {hotels.map((hotel) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      onRemove={() => setRemoveHotelTarget(hotel.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Additional Services Section */}
          {proposal && (
            <div className="bg-sett-card rounded-card border border-sett-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-heading-sm font-bold text-sett-text-primary">Additional Services</h3>
                <Button variant="outline" size="sm" onClick={() => setAddServiceOpen(true)}>
                  + Add Service
                </Button>
              </div>

              {services.length === 0 ? (
                <p className="text-body text-sett-text-accent py-4">No services added yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-sett-border">
                        <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-3 py-2">Service</th>
                        <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-3 py-2">Markup %</th>
                        <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-3 py-2">Buy</th>
                        <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-3 py-2">Sell</th>
                        <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-3 py-2">Qty</th>
                        <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-3 py-2">Nights</th>
                        <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((service) => {
                        const buy = Number(service.buyPrice ?? 0);
                        const sell = Number(service.sellPrice ?? 0);
                        const qty = service.quantity ?? 1;
                        const markup = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
                        return (
                          <tr key={service.id} className="border-b border-sett-border last:border-0">
                            <td className="px-3 py-2.5 text-body">{service.serviceName ?? '—'}</td>
                            <td className="px-3 py-2.5 text-body">{markup.toFixed(0)}%</td>
                            <td className="px-3 py-2.5 text-body">{buy.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-body">{sell.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-body">{qty}</td>
                            <td className="px-3 py-2.5 text-body">{service.notes ?? '—'}</td>
                            <td className="px-3 py-2.5 text-body font-semibold">{(sell * qty).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar: Room Breakdown - only when proposal has hotels */}
        {proposal && hotels.length > 0 && (
          <div className="w-80 shrink-0 space-y-4">
            {/* Map placeholder */}
            <div className="bg-sett-card rounded-card border border-sett-border overflow-hidden">
              <div className="h-40 bg-sett-fill flex items-center justify-center text-sett-text-accent text-body">
                <button
                  type="button"
                  className="text-sett-primary hover:underline text-body font-medium"
                >
                  View on map
                </button>
              </div>
            </div>

            {/* Room Breakdown */}
            <div className="bg-sett-card rounded-card border border-sett-border p-4">
              <h4 className="text-heading-sm font-bold text-sett-text-primary mb-3">Room Breakdown</h4>
              <dl className="space-y-2">
                <div className="flex justify-between text-body">
                  <dt className="text-sett-text-secondary">Total Purchase</dt>
                  <dd className="font-semibold">&euro;{totals.totalPurchase.toLocaleString('en', { minimumFractionDigits: 2 })}</dd>
                </div>
                <hr className="border-sett-border" />
                <div className="flex justify-between text-body">
                  <dt className="text-sett-text-secondary">Total Sell</dt>
                  <dd className="font-semibold">&euro;{totals.totalSell.toLocaleString('en', { minimumFractionDigits: 2 })}</dd>
                </div>
                <div className="flex justify-between text-body">
                  <dt className="text-sett-text-secondary">Markup EUR</dt>
                  <dd className="font-semibold text-sett-primary">&euro;{totals.markupEur.toLocaleString('en', { minimumFractionDigits: 2 })}</dd>
                </div>
                <div className="flex justify-between text-body">
                  <dt className="text-sett-text-secondary">Margin %</dt>
                  <dd className="font-semibold">{totals.margin.toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar - only show when proposal exists */}
      {proposal && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-[200px] bg-sett-card border-t border-sett-border px-6 py-3 flex items-center justify-between z-40">
          <Button variant="outline" size="sm" onClick={() => setAddServiceOpen(true)}>
            + Add Service
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
              Preview PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSaveDraftOpen(true)}>
              Save Draft
            </Button>
            <Button variant="primary" size="sm" onClick={() => setSendOpen(true)}>
              Approve &amp; Send
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeclineOpen(true)}>
              Mark as Declined
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddServiceModal
        open={addServiceOpen}
        onClose={() => setAddServiceOpen(false)}
        onAdd={handleAddService}
        isLoading={actionLoading}
      />

      <ConfirmModal
        open={!!removeHotelTarget}
        onClose={() => setRemoveHotelTarget(null)}
        onConfirm={() => removeHotelTarget && handleRemoveHotel(removeHotelTarget)}
        title="Are you sure you want to remove this hotel?"
        message="This hotel will be removed from the offer. You can add it again from the hotel search."
        confirmLabel="Remove"
        variant="danger"
      />

      <ConfirmModal
        open={saveDraftOpen}
        onClose={() => setSaveDraftOpen(false)}
        onConfirm={handleSaveDraft}
        title="Are you sure you want to save it as draft?"
        message="The offer will be saved as a draft and won't be sent to the client. You can resume and submit it later."
        confirmLabel="Save as Draft"
        variant="primary"
      />

      <ConfirmModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onConfirm={handleApproveAndSend}
        title="Approve & Send Offer?"
        message="This will send the offer to the client. Make sure all details are correct."
        confirmLabel="Approve & Send"
        variant="primary"
      />

      <ConfirmModal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onConfirm={handleDecline}
        title="Mark Offer as Declined?"
        message="This will mark the offer as declined. You can still access it later from the archive."
        confirmLabel="Mark Declined"
        variant="danger"
      />

      <SuccessModal
        open={successOpen}
        onClose={() => {
          setSuccessOpen(false);
          router.push('/booking-requests');
        }}
        title="Offer Sent Successfully!"
        message="The offer has been sent to the client at the specified email address."
        buttonLabel="Return to Group Request"
        autoRedirectSeconds={7}
      />

      {proposal && (
        <ContractPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          request={request}
          proposal={proposal}
        />
      )}
    </div>
  );
}

/* ─────────────── Hotel Card ─────────────── */

function HotelCard({
  hotel,
  onRemove,
}: {
  hotel: ProposalHotel;
  onRemove: () => void;
}) {
  const roomEntries = hotel.rooms ? Object.entries(hotel.rooms as Record<string, { net?: number; sell?: number; qty?: number; nights?: number }>) : [];

  return (
    <div className="border border-sett-border rounded-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-sett-fill">
        <div className="flex items-center gap-2">
          <h4 className="text-body font-bold text-sett-text-primary">{hotel.hotelName ?? hotel.hotelCode}</h4>
          {hotel.tid && (
            <span className="text-label text-sett-text-accent">({hotel.tid})</span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-body text-sett-destructive hover:underline font-medium"
        >
          Remove
        </button>
      </div>

      {roomEntries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sett-border">
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2">Room Type</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2">Net</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2">Markup</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2">Sell</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2">Qty</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2">Nights</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {roomEntries.map(([type, detail]) => {
                const net = Number(detail.net ?? 0);
                const sell = Number(detail.sell ?? 0);
                const qty = detail.qty ?? 1;
                const nights = detail.nights ?? 1;
                const markup = net > 0 ? ((sell - net) / net * 100).toFixed(0) : '0';
                return (
                  <tr key={type} className="border-b border-sett-border last:border-0">
                    <td className="px-4 py-2.5 text-body capitalize">{type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5 text-body">{net.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-body">{markup}%</td>
                    <td className="px-4 py-2.5 text-body">{sell.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-body">{qty}</td>
                    <td className="px-4 py-2.5 text-body">{nights}</td>
                    <td className="px-4 py-2.5 text-body font-semibold">{(sell * qty * nights).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {roomEntries.length === 0 && (
        <div className="px-4 py-3">
          <p className="text-body text-sett-text-secondary">
            {hotel.currency} {Number(hotel.totalPrice).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
