'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Star,
  Building2,
  FileText,
  Phone,
  Mail,
  Users,
  Eye,
  Save,
  ChevronUp,
  ChevronDown,
  Trash2,
  SquarePen,
  Send,
  XCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { AddServiceModal } from '@/components/forms/AddServiceModal';
import { EditRequestModal } from '@/components/forms/EditRequestModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ContractPreviewModal } from '@/components/ui/ContractPreviewModal';
import { PageLoader } from '@/components/ui/Loader';
import { HotelMap } from '@/components/ui/HotelMap';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import type { BookingRequest, Proposal, ProposalHotel, ProposalService } from '@/types';
import type { RoomsConfig } from '@/types/requests';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import toast from 'react-hot-toast';

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
          style={{ width: 16, height: 16 }}
          className={i < rating ? 'fill-[#AAC737] text-[#AAC737]' : 'fill-none text-[#D1D1D1]'}
        />
      ))}
    </div>
  );
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { t } = useLanguage();

  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  // Modal states
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<ProposalService | null>(null);
  const [removeServiceTarget, setRemoveServiceTarget] = useState<string | null>(null);
  const [removeHotelTarget, setRemoveHotelTarget] = useState<string | null>(null);
  const [saveDraftOpen, setSaveDraftOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendEmailError, setSendEmailError] = useState('');
  const [approveStepDone, setApproveStepDone] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editRequestOpen, setEditRequestOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const req = await requestsApi.get(id);
      if (req) setRequest(req);

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
    // Calculate hotel buy (net) and sell totals separately from room breakdown
    let hotelBuyTotal = 0;
    let hotelSellTotal = 0;
    hotels.forEach((h) => {
      const roomData = h.rooms as Record<string, { net: number; sell: number; qty: number; nights: number }> | null;
      if (roomData && Object.keys(roomData).length > 0) {
        Object.values(roomData).forEach((detail) => {
          const net = Number(detail.net ?? 0);
          const sell = Number(detail.sell ?? 0);
          const qty = detail.qty ?? 1;
          const nights = detail.nights ?? 1;
          hotelBuyTotal += net * qty * nights;
          hotelSellTotal += sell * qty * nights;
        });
      } else {
        // No room breakdown — use totalPrice for both
        const tp = Number(h.totalPrice ?? 0);
        hotelBuyTotal += tp;
        hotelSellTotal += tp;
      }
    });
    const serviceBuyTotal = services.reduce(
      (s, sv) => s + Number(sv.buyPrice ?? 0) * (sv.quantity ?? 1),
      0
    );
    const serviceSellTotal = services.reduce(
      (s, sv) => s + Number(sv.sellPrice ?? 0) * (sv.quantity ?? 1),
      0
    );
    const totalPurchase = hotelBuyTotal + serviceBuyTotal;
    const totalSell = hotelSellTotal + serviceSellTotal;
    const markupEur = totalSell - totalPurchase;
    const margin = totalPurchase > 0 ? (markupEur / totalPurchase) * 100 : 0;
    return { totalPurchase, totalSell, markupEur, margin };
  }, [hotels, services]);

  const handlePricingUpdate = useCallback((hotelId: string, updatedHotel: ProposalHotel) => {
    setProposal((p) =>
      p ? { ...p, hotels: (p.hotels ?? []).map((h) => (h.id === hotelId ? updatedHotel : h)) } : null
    );
  }, []);

  const handleAddHotelsClick = async () => {
    if (!proposal) {
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
      toast.success(t.toasts.hotelRemoved);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddService = async (payload: Parameters<typeof proposalsApi.addService>[1]) => {
    setActionLoading(true);
    try {
      let proposalId = proposal?.id;
      if (!proposalId) {
        const created = await requestsApi.createProposal(id, {});
        proposalId = created.id;
        const full = await proposalsApi.get(proposalId);
        if (full) setProposal(full);
      }
      const { service, proposal: updatedProposal } = await proposalsApi.addService(proposalId, payload);
      setProposal((p) =>
        p
          ? {
            ...p,
            ...updatedProposal,
            services: [...(p.services ?? []), service],
            hotels: p.hotels,
          }
          : null
      );
      setAddServiceOpen(false);
      toast.success(t.toasts.serviceAdded);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditService = async (payload: Parameters<typeof proposalsApi.addService>[1]) => {
    if (!proposal || !editingService) return;
    setActionLoading(true);
    try {
      const { service, proposal: updatedProposal } = await proposalsApi.updateService(
        proposal.id,
        editingService.id,
        payload
      );
      setProposal((p) =>
        p
          ? {
            ...p,
            ...updatedProposal,
            services: (p.services ?? []).map((s) => (s.id === editingService.id ? service : s)),
            hotels: p.hotels,
          }
          : null
      );
      setEditingService(null);
      toast.success(t.toasts.serviceUpdated);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      await proposalsApi.removeService(proposal.id, serviceId);
      setProposal((p) =>
        p ? { ...p, services: (p.services ?? []).filter((s) => s.id !== serviceId) } : null
      );
      setRemoveServiceTarget(null);
      toast.success(t.toasts.serviceRemoved);
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
      toast.success(t.toasts.draftSaved);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!proposal) return;
    setSendError('');
    setSendEmailError('');

    // Validate at least 1 hotel
    if (!proposal.hotels || proposal.hotels.length === 0) {
      setSendError(t.offer.noHotelsError);
      return;
    }

    // Validate email
    const emailVal = sendEmail.trim();
    if (!emailVal) {
      setSendEmailError(t.offer.emailRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setSendEmailError(t.offer.emailInvalid);
      return;
    }

    setActionLoading(true);

    // Step 1: Approve — generates PDF, emails agent.
    // Skipped if a previous attempt already completed this step successfully.
    if (!approveStepDone) {
      try {
        await proposalsApi.approve(proposal.id, {
          agentEmail: emailVal,
          adminNotes: sendNotes.trim() || undefined,
        });
        setApproveStepDone(true);
      } catch {
        setSendError(t.toasts.failedToApprove);
        setActionLoading(false);
        return;
      }
    }

    // Step 2: Send — marks proposal as sent
    try {
      const updated = await proposalsApi.send(proposal.id, {
        sendToEmail: emailVal,
      });
      setProposal(updated);
      setSendOpen(false);
      setSendEmail('');
      setSendNotes('');
      setApproveStepDone(false);
      setSuccessOpen(true);
      toast.success(t.toasts.proposalSent);
    } catch {
      setSendError(`${t.offer.approvedButNotSent}. ${t.offer.tryAgain}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const updated = await proposalsApi.decline(proposal.id, {
        rejectionReason: 'Declined by agent',
      });
      setProposal(updated);
      setDeclineOpen(false);
      toast.success(t.toasts.proposalDeclined);
      router.push('/booking-requests');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <PageLoader message={t.offer.loadingOffer} />;
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Header title={t.createForm.title} />
        <p className="text-body text-sett-text-secondary">{t.offer.requestNotFound}</p>
        <Button variant="secondary" onClick={() => router.push('/booking-requests')}>
          {t.common.back}
        </Button>
      </div>
    );
  }

  const breakfastLabel =
    request.breakfastPreference === 'BB'
      ? t.offer.withBreakfast
      : request.breakfastPreference === 'RO'
        ? t.offer.withoutBreakfast
        : '—';
  const locationLabel =
    request.hotelLocation === 'central'
      ? t.offer.centralLocation
      : request.hotelLocation === 'outside_city_center'
        ? t.offer.outsideCityCenter
        : '—';




  return (
    <>
      <Header title={t.createForm.title} />

      <div className="p-4 md:p-6 space-y-6 pb-8">
        {/* ── Breadcrumb ── */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => router.push('/booking-requests')}
            className="flex items-center gap-1 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.common.back}
          </button>
          <span className="text-[#E6EAF0] hidden sm:inline">|</span>
          <span className="font-montserrat text-[18px] font-bold text-sett-text-primary">
            {t.offer.offer} #{request.referenceNumber ?? id.slice(0, 4)}
          </span>
          <Badge variant={getStatusBadgeVariant(proposal?.status ?? request.status)}>
            {(proposal?.status ?? request.status)
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </Badge>
        </div>

        {/* ════════════════════ MAIN CONTENT CARD ════════════════════ */}
        <div className="bg-white rounded-[14px] border border-[#686868]/40 p-5">

          {/* ════════════════════ REQUEST SUMMARY ════════════════════ */}
          <div className="mb-6">
            {/* Section header with Add Hotels button */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-montserrat text-[18px] font-semibold text-sett-text-primary">
                      {t.offer.requestSummary}
                    </h2>
                    <button type="button" onClick={() => setEditRequestOpen(true)} className="p-0.5 rounded hover:opacity-70 transition-opacity">
                      <SquarePen className="w-4 h-4 text-sett-primary" />
                    </button>
                  </div>
                  <p className="font-montserrat text-[14px] font-normal leading-none text-[#4A4A4A] mt-0.5">
                    {t.offer.bookingDetails}
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddHotelsClick}
                isLoading={actionLoading}
                disabled={['sent', 'approved', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
              >
                {t.offer.addHotels}
              </Button>
            </div>

            {/* Collapsible content */}
            {!summaryCollapsed && (
              <>
                {/* ── Trip Details ── */}
                <div className="mt-6 mb-6">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between min-h-[51px] gap-6">
                    {/* Left: Trip Details label + Location + Date */}
                    <div className="flex flex-col gap-[14px]">
                      <h3 className="font-montserrat text-[16px] font-semibold leading-none text-sett-text-primary">
                        {t.offer.tripDetails}
                      </h3>
                      <div className="flex items-center gap-[10px] flex-wrap">
                        {/* Location */}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-[14px] h-[14px] text-sett-text-accent shrink-0" />
                          <span className="font-montserrat text-[14px] font-medium leading-none text-[#4A4A4A]">
                            {request.destinationName || '—'}
                          </span>
                        </div>
                        {/* Dot separator */}
                        <div className="w-1 h-1 rounded-[18px] bg-[#E6EAF0] shrink-0 hidden sm:block" />
                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-[14px] h-[14px] text-sett-text-accent shrink-0" />
                          <span className="font-montserrat text-[14px] font-medium leading-none text-[#4A4A4A]">
                            {formatDate(request.checkinDate)} - {formatDate(request.checkoutDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:flex xl:items-center gap-5 xl:gap-5 w-full xl:w-auto">
                      {/* Hotel Category */}
                      <div className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center xl:w-[155px]">
                        <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-[#686868]">
                          {t.offer.hotelCategory}
                        </p>
                        {/* value row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-montserrat text-[14px] font-normal leading-none text-[#1D1D1D] whitespace-nowrap">
                            ({request.starRating}-Star)
                          </span>
                          {request.starRating && <StarRating rating={request.starRating} />}
                        </div>
                      </div>
                      {/* Vertical divider */}
                      <div className="hidden xl:block w-px h-[46px] bg-[#E6EAF0] shrink-0" />
                      {/* Budget Range */}
                      <div className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center">
                        <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-[#686868]">
                          {t.offer.budgetRange}
                        </p>
                        <p className="font-montserrat text-[14px] font-normal leading-none text-[#1D1D1D]">
                          {request.budgetRange ? request.budgetRange.charAt(0).toUpperCase() + request.budgetRange.slice(1) : '—'}
                        </p>
                      </div>
                      {/* Vertical divider */}
                      <div className="hidden xl:block w-px h-[46px] bg-[#E6EAF0] shrink-0" />
                      {/* Group Type */}
                      <div className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center">
                        <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-[#686868]">
                          {t.offer.groupType}
                        </p>
                        <p className="font-montserrat text-[14px] font-normal leading-none text-[#1D1D1D] capitalize">
                          {request.groupType || '—'}
                        </p>
                      </div>
                      {/* Vertical divider */}
                      <div className="hidden xl:block w-px h-[46px] bg-[#E6EAF0] shrink-0" />
                      {/* Guests */}
                      <div className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center">
                        <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-[#686868]">
                          {t.offer.guests}
                        </p>
                        <p className="font-montserrat text-[14px] font-normal leading-none text-[#1D1D1D]">
                          {request.groupSize ?? '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-[#686868]/40 mb-6" />

                {/* ── Room & Accommodations ── */}
                <div className="flex flex-col gap-5 mb-6">
                  {/* Heading — height:20 */}
                  <h3 className="font-montserrat text-[16px] font-semibold leading-none text-[#1D1D1D]">
                    {t.offer.roomAccommodations}
                  </h3>
                  {/* Cards grid — Responsive 2x2 or 4x1 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 w-full gap-3 sm:gap-5">
                    {[
                      { label: t.offer.single, value: rooms?.single },
                      { label: t.offer.double, value: rooms?.double },
                      { label: t.offer.triple, value: rooms?.triple },
                      { label: t.offer.quadruple, value: rooms?.quadruple },
                    ].map((room) => (
                      <div
                        key={room.label}
                        className="flex flex-col items-center justify-center gap-2 sm:gap-[14px] border border-[#686868]/40 rounded-[14px] py-4 sm:py-0 sm:h-[86px]"
                      >
                        <p className="font-montserrat text-[16px] sm:text-[18px] font-bold leading-none text-[#1D1D1D]">
                          {room.value ?? '—'}
                        </p>
                        <p className="font-montserrat text-[10px] sm:text-[12px] font-semibold leading-none uppercase text-sett-text-accent">
                          {room.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Bed Configuration for Double Room — outer: 14px radius, border #68686866, h:166 */}
                  <div className="w-full rounded-[14px] border border-[#686868]/40 bg-white p-5">
                    <h4 className="font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D] mb-5">
                      Bed Configuration for Double Room
                    </h4>
                    {/* Inner cards grid — gap:20px, responsive */}
                    <div className="grid grid-cols-2 w-full gap-3 sm:gap-5">
                      {[
                        { label: 'Standard Double Bed', value: rooms?.standardDoubleBeds },
                        { label: 'Twin Bed', value: rooms?.twinBeds },
                      ].map((bed) => (
                        <div
                          key={bed.label}
                          className="flex flex-col items-center justify-center gap-2 sm:gap-[14px] border border-[#686868]/40 rounded-[14px] py-4 sm:py-0 sm:h-[86px]"
                        >
                          <p className="font-montserrat text-[16px] sm:text-[18px] font-bold leading-none text-[#1D1D1D]">
                            {bed.value ?? '—'}
                          </p>
                          <p className="font-montserrat text-[10px] sm:text-[12px] font-semibold leading-none uppercase text-sett-text-accent text-center px-2">
                            {bed.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {rooms?.extraRoomsNote && (
                    <div className="w-full rounded-[14px] bg-[#071C42]/[0.10] px-5 py-5 flex items-center gap-[10px]" style={{ minHeight: 57 }}>
                      <span className="font-montserrat text-[14px] font-semibold leading-none text-[#071C42]">{t.offer.extras}:</span>
                      <span className="font-montserrat text-[14px] font-normal leading-none text-[#071C42]">{rooms.extraRoomsNote}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="border border-[#686868]/40 rounded-[14px] p-3 sm:p-4 text-center">
                      <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary">{breakfastLabel}</p>
                      <p className="font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent mt-0.5">
                        {t.offer.breakfastPreference}
                      </p>
                    </div>
                    <div className="border border-[#686868]/40 rounded-[14px] p-3 sm:p-4 text-center">
                      <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary">{locationLabel}</p>
                      <p className="font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent mt-0.5">
                        {t.offer.hotelLocation}
                      </p>
                    </div>
                  </div>

                  {request.specialRequirements && (
                    <div className="w-full rounded-[14px] bg-[#071C42]/[0.10] px-5 py-5 flex items-center gap-[10px]" style={{ minHeight: 57 }}>
                      <span className="font-montserrat text-[14px] font-semibold leading-none text-[#071C42]">{t.offer.specialRequirement}:</span>
                      <span className="font-montserrat text-[14px] font-normal leading-none text-[#071C42]">{request.specialRequirements}</span>
                    </div>
                  )}
                </div>

                <hr className="border-[#686868]/40 mb-6" />

                {/* ── Customer Details ── */}
                <div className="mb-6">
                  <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-3">
                    {t.offer.customerDetails}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.companyName}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D]">
                        {request.companyName || '—'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.guestList}
                        </span>
                      </div>
                      {request.guestListFileKey ? (
                        <a href="#" className="font-montserrat text-[14px] font-semibold leading-none text-sett-primary hover:underline">
                          {request.guestListFileKey}
                        </a>
                      ) : (
                        <p className="font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D]">—</p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.contactPerson}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D]">
                        {[request.firstName, request.lastName].filter(Boolean).join(' ') ||
                          request.contactName ||
                          '—'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mail className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.emailAddress}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D]">{request.contactEmail || '—'}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.phoneNumber}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D]">
                        {request.contactPhone
                          ? request.contactPhone.replace(/[^\d+]/g, '').replace(/(\+?\d{3})(?=\d)/g, '$1 ').trim()
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {request.customerNotes && (
                    <div className="w-full rounded-[14px] bg-[#071C42]/[0.10] px-5 py-5 flex items-center gap-[10px] mt-3" style={{ minHeight: 57 }}>
                      <span className="font-montserrat text-[14px] font-semibold leading-none text-[#071C42]">{t.offer.specialRequirement}:</span>
                      <span className="font-montserrat text-[14px] font-normal leading-none text-[#071C42]">{request.customerNotes}</span>
                    </div>
                  )}
                </div>

                <hr className="border-[#686868]/40 mb-6" />

                {/* ── Policies ── */}
                <div>
                  <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-3">{t.offer.policies}</h3>
                  {request.termsAndConditions && request.termsAndConditions.replace(/<[^>]*>/g, '').trim() && (
                    <div className="bg-sett-fill rounded-card px-4 py-3 mb-3 border border-sett-border/50">
                      <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">
                        {t.offer.termsConditions}
                      </p>
                      <div
                        className="font-montserrat text-[14px] font-semibold text-[#1D1D1D]"
                        style={{ lineHeight: '22px' }}
                        dangerouslySetInnerHTML={{ __html: request.termsAndConditions }}
                      />
                    </div>
                  )}
                  {request.cancellationConditions && request.cancellationConditions.replace(/<[^>]*>/g, '').trim() && (
                    <div className="bg-sett-fill rounded-card px-4 py-3 border border-sett-border/50">
                      <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">
                        {t.offer.cancellationConditions}
                      </p>
                      <div
                        className="font-montserrat text-[14px] font-semibold text-[#1D1D1D]"
                        style={{ lineHeight: '22px' }}
                        dangerouslySetInnerHTML={{ __html: request.cancellationConditions }}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Collapse/Expand toggle */}
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                className="p-1 rounded-full hover:bg-sett-fill transition-colors text-sett-text-accent hover:text-sett-text-primary"
                aria-label={summaryCollapsed ? 'Expand request summary' : 'Collapse request summary'}
              >
                {summaryCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* ════════════════════ HOTELS + SIDEBAR ════════════════════ */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Hotels + Services */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Hotels */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary">{t.offer.hotels}</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddHotelsClick}
                    isLoading={actionLoading}
                    disabled={['sent', 'approved', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
                  >
                    {t.offer.addHotel}
                  </Button>
                </div>

                {hotels.length === 0 ? (
                  <div className="bg-sett-card rounded-card border border-sett-border p-6 text-center">
                    <p className="text-body text-sett-text-accent">
                      {t.offer.noHotels}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hotels.map((hotel) => (
                      <HotelCard
                        key={hotel.id}
                        hotel={hotel}
                        proposalId={proposal!.id}
                        onPricingUpdate={handlePricingUpdate}
                        onRemove={() => setRemoveHotelTarget(hotel.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Services — only show when hotels are added */}
              {hotels.length > 0 && <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-heading-sm font-bold text-sett-text-primary">
                    {t.offer.additionalServices}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setAddServiceOpen(true)}
                    className="px-4 py-1.5 border-2 border-sett-primary rounded-button text-body text-sett-primary font-bold uppercase tracking-[0.08em] hover:bg-sett-primary hover:text-sett-navy disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-sett-primary disabled:border-gray-300 transition-colors duration-200"
                    disabled={['sent', 'approved', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
                  >
                    {t.offer.addService}
                  </button>
                </div>

                {services.length > 0 && (
                  <div className="bg-sett-card rounded-card border border-sett-border overflow-hidden">
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="border-b border-sett-border bg-sett-fill">
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium">
                              {t.offer.service}
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium">
                              {t.offer.net} &euro;
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium">
                              {t.offer.markup}
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium">
                              {t.offer.sell} &euro;
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium">
                              {t.offer.qty}
                            </th>
                            <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium">
                              {t.offer.total} &euro;
                            </th>
                            <th className="w-20" />
                          </tr>
                        </thead>
                        <tbody>
                          {services.map((service) => (
                            <ServiceRow
                              key={service.id}
                              service={service}
                              onEdit={() => setEditingService(service)}
                              onDelete={() => setRemoveServiceTarget(service.id)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-sett-border">
                      {services.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          onEdit={() => setEditingService(service)}
                          onDelete={() => setRemoveServiceTarget(service.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>}
            </div>

            {/* Right sidebar — only show when proposal exists with hotels */}
            {proposal && hotels.length > 0 && (
              <div className="w-full lg:w-72 shrink-0 space-y-4">
                {/* View on map */}
                <div className="bg-sett-card rounded-card border border-sett-border overflow-hidden">
                  <h4 className="text-body font-bold text-sett-text-primary px-5 pt-4 pb-2">
                    {t.offer.viewOnMap}
                  </h4>
                  <div className="mx-4 mb-4">
                    <HotelMap hotels={hotels} className="h-44" />
                  </div>
                </div>

                {/* Room Breakdown */}
                <div className="bg-white flex flex-col" style={{ borderRadius: 14, border: '1px solid #6868681A' }}>
                  {/* Title */}
                  <div className="px-5 pt-5 pb-5">
                    <h4 className="font-montserrat font-semibold text-[18px] leading-none tracking-normal text-[#1D1D1D]">
                      {t.offer.roomBreakdown}
                    </h4>
                  </div>
                  {/* Divider below title */}
                  <div className="mx-5" style={{ borderTop: '1px solid #6868681A' }} />
                  {/* Rows */}
                  <div className="px-5 pt-5 pb-5 flex flex-col gap-4">
                    {/* Total Purchase */}
                    <div className="flex items-center justify-between">
                      <span className="font-montserrat text-[14px] font-medium text-[#686868]">{t.offer.totalPurchase}</span>
                      <span className="font-montserrat font-semibold text-[16px] leading-none text-right" style={{ color: '#071C42' }}>
                        €{totals.totalPurchase.toLocaleString('en', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Divider below Total Purchase */}
                    <div style={{ borderTop: '1px solid #6868681A' }} />
                    {/* Total Sell */}
                    <div className="flex items-center justify-between">
                      <span className="font-montserrat text-[14px] font-medium text-[#686868]">{t.offer.totalSell}</span>
                      <span className="font-montserrat font-semibold text-[16px] leading-none text-right" style={{ color: '#071C42' }}>
                        €{totals.totalSell.toLocaleString('en', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Divider below Total Sell */}
                    <div style={{ borderTop: '1px solid #6868681A' }} />
                    {/* Margin */}
                    <div className="flex items-center justify-between">
                      <span className="font-montserrat text-[14px] font-medium text-[#686868]">{t.offer.marginEur}</span>
                      <span className="font-montserrat font-bold text-[18px] leading-none text-right" style={{ color: '#667F00' }}>
                        €{totals.markupEur.toLocaleString('en', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Green divider below Margin */}
                    <div style={{ borderTop: '1px solid #AAC737' }} />
                    {/* Margin % */}
                    <div className="flex items-center justify-between">
                      <span className="font-montserrat text-[14px] font-medium text-[#686868]">{t.offer.marginPct}</span>
                      <span className="font-montserrat font-bold text-[16px] leading-none text-right" style={{ color: '#AAC737' }}>
                        {totals.margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                    <Eye className="w-4 h-4" />
                    {t.offer.previewPdf}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setSaveDraftOpen(true)}>
                    <Save className="w-4 h-4" />
                    {t.offer.saveDraft}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSendOpen(true)}
                    disabled={['sent', 'approved', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
                  >
                    <Send className="w-4 h-4" />
                    {t.offer.approveAndSend}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeclineOpen(true)}
                    disabled={['sent', 'approved', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
                  >
                    <XCircle className="w-4 h-4" />
                    {t.offer.markDeclined}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════ MODALS ════════════════════ */}
          <AddServiceModal
            open={addServiceOpen}
            onClose={() => setAddServiceOpen(false)}
            onAdd={handleAddService}
            isLoading={actionLoading}
          />

          <AddServiceModal
            open={!!editingService}
            onClose={() => setEditingService(null)}
            onAdd={handleEditService}
            isLoading={actionLoading}
            initialData={editingService ?? undefined}
          />

          <ConfirmModal
            open={!!removeServiceTarget}
            onClose={() => setRemoveServiceTarget(null)}
            onConfirm={() => removeServiceTarget && handleRemoveService(removeServiceTarget)}
            title={t.offer.removeServiceTitle}
            message={t.offer.removeServiceMsg}
            confirmLabel={t.common.remove}
            variant="danger"
          />

          <ConfirmModal
            open={!!removeHotelTarget}
            onClose={() => setRemoveHotelTarget(null)}
            onConfirm={() => removeHotelTarget && handleRemoveHotel(removeHotelTarget)}
            title={t.offer.removeHotelTitle}
            message={t.offer.removeHotelMsg}
            confirmLabel={t.common.remove}
            variant="danger"
          />

          <ConfirmModal
            open={saveDraftOpen}
            onClose={() => setSaveDraftOpen(false)}
            onConfirm={handleSaveDraft}
            title={t.offer.saveDraftTitle}
            message={t.offer.saveDraftMsg}
            confirmLabel={t.offer.saveDraftConfirm}
            variant="primary"
          />

          {/* Approve & Send Modal */}
          {sendOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-[14px] border border-sett-border-light w-full max-w-md mx-4 p-6">
                <h3 className="font-montserrat text-[18px] font-semibold text-sett-text-primary mb-1">
                  {t.offer.approveTitle}
                </h3>
                <p className="font-montserrat text-[14px] text-sett-text-secondary mb-5">
                  {t.offer.approveMsg}
                </p>

                {sendError && (
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-[10px] bg-red-50 border border-red-200">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="font-montserrat text-[13px] text-red-700">{sendError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block font-montserrat text-[13px] font-semibold text-sett-text-primary mb-1.5">
                      {t.offer.agentEmail} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={sendEmail}
                      onChange={(e) => { setSendEmail(e.target.value); if (sendEmailError) setSendEmailError(''); }}
                      placeholder={t.offer.emailPlaceholder}
                      className={`w-full px-3 py-2.5 rounded-[10px] border font-montserrat text-[14px] text-sett-text-primary placeholder-sett-text-accent focus:outline-none ${sendEmailError
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-sett-border-light focus:border-sett-primary'
                        }`}
                    />
                    {sendEmailError && (
                      <p className="mt-1 font-montserrat text-[12px] text-red-500">{sendEmailError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-montserrat text-[13px] font-semibold text-sett-text-primary mb-1.5">
                      {t.offer.adminNotes} <span className="font-normal text-sett-text-accent">{t.offer.adminNotesOptional}</span>
                    </label>
                    <textarea
                      value={sendNotes}
                      onChange={(e) => setSendNotes(e.target.value)}
                      placeholder={t.offer.notesPlaceholder}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-[10px] border border-sett-border-light font-montserrat text-[14px] text-sett-text-primary placeholder-sett-text-accent focus:outline-none focus:border-sett-primary resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => { setSendOpen(false); setSendError(''); setSendEmailError(''); setSendEmail(''); setSendNotes(''); setApproveStepDone(false); }}
                    disabled={actionLoading}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleApproveAndSend}
                    isLoading={actionLoading}
                  >
                    <Send className="w-4 h-4" />
                    {approveStepDone ? t.offer.retrySend : t.offer.approveAndSend}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ConfirmModal
            open={declineOpen}
            onClose={() => setDeclineOpen(false)}
            onConfirm={handleDecline}
            title={t.offer.declineTitle}
            message={t.offer.declineMsg}
            confirmLabel={t.offer.declineConfirm}
            variant="danger"
          />

          {request && (
            <EditRequestModal
              open={editRequestOpen}
              request={request}
              onClose={() => setEditRequestOpen(false)}
              onSaved={(updated) => setRequest(updated)}
            />
          )}

          <SuccessModal
            open={successOpen}
            onClose={() => {
              setSuccessOpen(false);
              router.push('/booking-requests');
            }}
            title={t.offer.offerSentTitle}
            message={t.offer.offerSentMsg}
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
      </div>
    </>
  );
}

/* ─────────────── Markup Dropdown ─────────────── */

const MARKUP_PRESETS = [10, 15, 18, 20, 25] as const;

function MarkupDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (markup: number) => void;
}) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const isPreset = MARKUP_PRESETS.includes(Math.round(value) as typeof MARKUP_PRESETS[number]);

  // Position the dropdown using getBoundingClientRect
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    setPos({ top: rect.bottom + 4, left: rect.right - 140 });
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
      setIsCustom(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on scroll so it doesn't float detached
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => { setOpen(false); setIsCustom(false); };
    const main = document.querySelector('main');
    main?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      main?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [open]);

  const handleSelect = (preset: number) => {
    onChange(preset);
    setOpen(false);
    setIsCustom(false);
  };

  const handleCustomSubmit = () => {
    const parsed = parseFloat(customValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onChange(parsed);
      setOpen(false);
      setIsCustom(false);
      setCustomValue('');
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded border border-sett-border hover:border-sett-primary text-body text-sett-text-primary bg-white transition-colors min-w-[72px] justify-between"
      >
        <span>{Math.round(value)}%</span>
        <svg className="w-3 h-3 text-sett-text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] bg-white border border-sett-border rounded-lg shadow-lg min-w-[140px] py-1"
            style={{ top: pos.top, left: pos.left }}
          >
            {MARKUP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelect(preset)}
                className={`w-full text-left px-3 py-1.5 text-body hover:bg-sett-fill transition-colors ${Math.round(value) === preset ? 'text-sett-primary font-semibold bg-sett-fill' : 'text-sett-text-primary'
                  }`}
              >
                {preset}%
              </button>
            ))}
            <hr className="border-sett-border my-1" />
            {isCustom ? (
              <div className="px-3 py-1.5 flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomSubmit();
                    if (e.key === 'Escape') { setIsCustom(false); setOpen(false); }
                  }}
                  autoFocus
                  className="w-16 px-1.5 py-0.5 border border-sett-border rounded text-body text-sett-text-primary focus:border-sett-primary focus:outline-none"
                  placeholder="0-100"
                />
                <span className="text-body text-sett-text-accent">%</span>
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  className="text-sett-primary text-body font-medium hover:underline ml-1"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setIsCustom(true); setCustomValue(isPreset ? '' : String(Math.round(value))); }}
                className="w-full text-left px-3 py-1.5 text-body text-sett-primary hover:bg-sett-fill transition-colors font-medium"
              >
                Custom...
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

/* ─────────────── Hotel Card ─────────────── */

type RoomData = Record<string, { net?: number; sell?: number; qty?: number; nights?: number }>;

function HotelCard({
  hotel,
  proposalId,
  onPricingUpdate,
  onRemove,
}: {
  hotel: ProposalHotel;
  proposalId: string;
  onPricingUpdate: (hotelId: string, updatedHotel: ProposalHotel) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const [localRooms, setLocalRooms] = useState<RoomData>(
    (hotel.rooms as RoomData) ?? {}
  );
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local rooms when hotel prop changes (e.g. after API refresh)
  useEffect(() => {
    setLocalRooms((hotel.rooms as RoomData) ?? {});
  }, [hotel.rooms]);

  const roomEntries = Object.entries(localRooms);

  const computeTotalPrice = useCallback((rooms: RoomData): number => {
    return Object.values(rooms).reduce((sum, detail) => {
      const sell = Number(detail.sell ?? 0);
      const qty = detail.qty ?? 1;
      const nights = detail.nights ?? 1;
      return sum + sell * qty * nights;
    }, 0);
  }, []);

  const persistPricing = useCallback(
    (updatedRooms: RoomData) => {
      // Debounce API calls by 800ms
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const totalPrice = computeTotalPrice(updatedRooms);
          const { hotel: updatedHotel } = await proposalsApi.adjustHotelPricing(proposalId, hotel.id, {
            rooms: updatedRooms,
            totalPrice,
            currency: hotel.currency,
          });
          onPricingUpdate(hotel.id, updatedHotel);
        } catch {
          // Revert on failure
          setLocalRooms((hotel.rooms as RoomData) ?? {});
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [proposalId, hotel.id, hotel.currency, hotel.rooms, computeTotalPrice, onPricingUpdate]
  );

  const handleMarkupChange = useCallback(
    (roomType: string, newMarkup: number) => {
      setLocalRooms((prev) => {
        const detail = prev[roomType];
        if (!detail) return prev;
        const net = Number(detail.net ?? 0);
        const newSell = parseFloat((net * (1 + newMarkup / 100)).toFixed(2));
        const updated = {
          ...prev,
          [roomType]: { ...detail, sell: newSell },
        };
        persistPricing(updated);
        return updated;
      });
    },
    [persistPricing]
  );

  const handleSellChange = useCallback(
    (roomType: string, newSell: number) => {
      setLocalRooms((prev) => {
        const detail = prev[roomType];
        if (!detail) return prev;
        const updated = {
          ...prev,
          [roomType]: { ...detail, sell: parseFloat(newSell.toFixed(2)) },
        };
        persistPricing(updated);
        return updated;
      });
    },
    [persistPricing]
  );

  return (
    <div className="bg-sett-card rounded-card border border-sett-border">
      {/* Hotel header — dark navy */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-[#1B2B44] rounded-t-card">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-body font-bold text-white truncate">
            {hotel.hotelName || hotel.hotelCode}
          </h4>
          <div className="flex gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-sett-primary text-sett-primary" />
            ))}
          </div>
          {saving && (
            <span className="text-caption text-white/70 ml-2 animate-pulse shrink-0">{t.common.loading}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 text-body text-white/80 hover:text-white font-medium transition-colors shrink-0 ml-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.common.remove}</span>
        </button>
      </div>

      {/* Room table — desktop */}
      {roomEntries.length > 0 ? (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-sett-border">
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.roomType}
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.net} &euro;
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.markup}
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.sell} &euro;
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.qty}
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.nights}
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.total} &euro;
                  </th>
                </tr>
              </thead>
              <tbody>
                {roomEntries.map(([type, detail]) => {
                  const net = Number(detail.net ?? 0);
                  const sell = Number(detail.sell ?? 0);
                  const qty = detail.qty ?? 1;
                  const nights = detail.nights ?? 1;
                  const markup = net > 0 ? ((sell - net) / net) * 100 : 0;
                  const total = sell * qty * nights;
                  return (
                    <tr key={type} className="border-b border-sett-border last:border-0">
                      <td className="px-4 py-2.5 text-body text-sett-text-primary">{type}</td>
                      <td className="px-4 py-2.5 text-body text-sett-text-primary text-right">
                        {net.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <MarkupDropdown value={markup} onChange={(m) => handleMarkupChange(type, m)} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={sell.toFixed(2)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) handleSellChange(type, val);
                          }}
                          className="w-20 px-1.5 py-0.5 border border-sett-border rounded text-body text-sett-text-primary text-right focus:border-sett-primary focus:outline-none bg-white"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-body text-sett-text-primary text-right">
                        {qty}
                      </td>
                      <td className="px-4 py-2.5 text-body text-sett-text-primary text-right">
                        {nights}
                      </td>
                      <td className="px-4 py-2.5 text-body text-sett-primary text-right font-semibold">
                        {total.toLocaleString('en', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Room cards — mobile */}
          <div className="md:hidden divide-y divide-sett-border">
            {roomEntries.map(([type, detail]) => {
              const net = Number(detail.net ?? 0);
              const sell = Number(detail.sell ?? 0);
              const qty = detail.qty ?? 1;
              const nights = detail.nights ?? 1;
              const markup = net > 0 ? ((sell - net) / net) * 100 : 0;
              const total = sell * qty * nights;
              return (
                <div key={type} className="p-3 space-y-2">
                  <p className="text-body font-medium text-sett-text-primary">{type}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.net}</span>
                      <p className="text-sett-text-primary mt-0.5">{net.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.markup}</span>
                      <div className="mt-0.5">
                        <MarkupDropdown value={markup} onChange={(m) => handleMarkupChange(type, m)} />
                      </div>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.sell}</span>
                      <div className="mt-0.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={sell.toFixed(2)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) handleSellChange(type, val);
                          }}
                          className="w-full max-w-[80px] px-1.5 py-0.5 border border-sett-border rounded text-body text-sett-text-primary text-right focus:border-sett-primary focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.qty}</span>
                      <p className="text-sett-text-primary mt-0.5">{qty}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.nights}</span>
                      <p className="text-sett-text-primary mt-0.5">{nights}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.total}</span>
                      <p className="text-sett-primary font-semibold mt-0.5">{total.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="px-4 py-3">
          <p className="text-body text-sett-text-secondary">
            {hotel.currency} {Number(hotel.totalPrice).toLocaleString('en', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Cancellation info */}
      {hotel.freeCancellation && hotel.cancelDeadline && (
        <div className="px-4 py-2 border-t border-sett-border/50">
          <p className="text-caption text-sett-primary font-medium">
            {t.offer.freeCancellation}{' '}
            {new Date(hotel.cancelDeadline).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Service Row ─────────────── */

function ServiceRow({
  service,
  onEdit,
  onDelete,
}: {
  service: ProposalService;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const buy = Number(service.buyPrice ?? 0);
  const sell = Number(service.sellPrice ?? 0);
  const qty = service.quantity ?? 1;
  const markup = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
  const total = sell * qty;

  return (
    <tr className="border-b border-sett-border last:border-0">
      <td className="px-4 py-2.5 text-body text-sett-text-primary">
        {service.serviceName ?? '—'}
      </td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary">{buy.toFixed(2)}</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary">{markup.toFixed(0)}%</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary">{sell.toFixed(2)}</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary">{qty}</td>
      <td className="px-4 py-2.5 text-body text-sett-primary text-right font-semibold">
        {total.toLocaleString('en', { minimumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="text-sett-text-accent hover:text-sett-primary transition-colors"
          >
            <SquarePen className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-sett-text-accent hover:text-sett-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────── Service Card (mobile) ─────────────── */

function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: ProposalService;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const buy = Number(service.buyPrice ?? 0);
  const sell = Number(service.sellPrice ?? 0);
  const qty = service.quantity ?? 1;
  const markup = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
  const total = sell * qty;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-body font-medium text-sett-text-primary">{service.serviceName ?? '—'}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit} className="text-sett-text-accent hover:text-sett-primary transition-colors">
            <SquarePen className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDelete} className="text-sett-text-accent hover:text-sett-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Net</span>
          <p className="text-sett-text-primary mt-0.5">{buy.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Markup</span>
          <p className="text-sett-text-primary mt-0.5">{markup.toFixed(0)}%</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Sell</span>
          <p className="text-sett-text-primary mt-0.5">{sell.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Qty</span>
          <p className="text-sett-text-primary mt-0.5">{qty}</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Total</span>
          <p className="text-sett-primary font-semibold mt-0.5">{total.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
}
