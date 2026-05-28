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
  Trash2,
  SquarePen,
  Send,
  XCircle,
  X,
  Download,
  AlertTriangle,
  Check,
  History,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { HotelName } from '@/components/ui/HotelName';
import { AddServiceModal } from '@/components/forms/AddServiceModal';
import { EditRequestModal } from '@/components/forms/EditRequestModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { ContractPreviewModal } from '@/components/ui/ContractPreviewModal';
import { RequestSummarySkeleton } from '@/components/ui/Loader';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import type { Attachment, BookingRequest, OfferHistoryEntry, Proposal, ProposalHotel, ProposalService } from '@/types';
import type { RoomsConfig } from '@/types/requests';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateEU, formatDateTimeEU } from '@/lib/dateFormatter';
import { formatPriceEU, formatCurrencyEU, formatPercentageEU, formatNumberEU } from '@/lib/numberFormatter';
import { cn } from '@/lib/utils/cn';
import { selectedStars } from '@/lib/utils/starRatings';
import { getGroupTypeLabel, groupTypeRequiresAge } from '@/lib/utils/groupType';
import toast from 'react-hot-toast';

function formatDate(dateStr: string | null | undefined): string {
  return formatDateEU(dateStr);
}

/**
 * Map an API-shaped room-type code (e.g. "StandardDoubleBeds", "twin_beds",
 * "single") to the user's current locale. `tAddHotel` is the addHotel slice
 * of the i18n bundle — passed in so this stays a pure function (not a hook).
 *
 * Falls back to a generated CamelCase split when the code isn't known, so a
 * new server-side room type still renders sanely.
 */
function formatRoomType(
  type: string,
  tAddHotel?: {
    roomSingle: string; roomDouble: string; roomTriple: string;
    roomQuadruple: string; roomSuite: string; roomSuites: string;
    standardDoubleBed: string; twinBed: string;
  },
): string {
  if (tAddHotel) {
    const normalized = type.toLowerCase().replace(/[_\s]/g, '');
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
  return type
    .replace(/_+/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getRoomLabel(
  type: string,
  detail: any,
  tAddHotel?: Parameters<typeof formatRoomType>[1],
): string {
  // If actual descriptions are available from the hotel, use those
  if (detail.actualDescriptions && detail.actualDescriptions.length > 0) {
    return detail.actualDescriptions[0];
  }
  // Otherwise, use the requested room type (localized when t is provided)
  return formatRoomType(type, tAddHotel);
}

function formatPhone(code: string | null | undefined, num: string | null | undefined): string {
  if (!num) return '—';
  if (code) return `${code} ${num}`;
  return num;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = i < Math.floor(rating);
        const half = !full && i < rating;
        return (
          <span key={i} className="relative inline-block" style={{ width: 16, height: 16 }}>
            {/* Empty star base */}
            <Star style={{ width: 16, height: 16 }} className="fill-none text-[#D1D1D1]" />
            {/* Full fill */}
            {full && (
              <Star style={{ width: 16, height: 16 }} className="absolute inset-0 fill-[#AAC737] text-[#AAC737]" />
            )}
            {/* Half fill — clip left 50% */}
            {half && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <Star style={{ width: 16, height: 16 }} className="fill-[#AAC737] text-[#AAC737]" />
              </span>
            )}
          </span>
        );
      })}
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [offerHistory, setOfferHistory] = useState<OfferHistoryEntry[]>([]);
  const [offerHistoryLoading, setOfferHistoryLoading] = useState(false);

  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  // The collapsible body now uses a CSS `grid-template-rows` 1fr↔0fr
  // transition (see .sett-collapsible in globals.css), so the content
  // stays mounted always and the wrapper smoothly contracts its height.
  // No timer machinery needed — toggling state is enough.
  const toggleSummary = useCallback(() => {
    setSummaryCollapsed((v) => !v);
  }, []);

  // Modal states
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<ProposalService | null>(null);
  const [removeServiceTarget, setRemoveServiceTarget] = useState<string | null>(null);
  const [removeHotelTarget, setRemoveHotelTarget] = useState<string | null>(null);
  const [saveDraftOpen, setSaveDraftOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmails, setSendEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [sendNotes, setSendNotes] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendEmailError, setSendEmailError] = useState('');
  const [approveStepDone, setApproveStepDone] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editRequestOpen, setEditRequestOpen] = useState(false);
  const [selectedHotelsForBreakdown, setSelectedHotelsForBreakdown] = useState<Set<string>>(new Set());

  const toggleHotelBreakdownSelection = (hotelId: string) => {
    setSelectedHotelsForBreakdown((prev) => {
      const updated = new Set(prev);
      if (updated.has(hotelId)) {
        updated.delete(hotelId);
      } else {
        updated.add(hotelId);
      }
      return updated;
    });
  };

  const loadData = useCallback(async () => {
    try {
      const req = await requestsApi.get(id);
      if (req) setRequest(req);

      const [proposals, atts] = await Promise.all([
        proposalsApi.list(),
        requestsApi.listAttachments(id).catch(() => [] as Attachment[]),
      ]);
      setAttachments(atts);
      const linked = proposals.find((p) => p.requestId === id);
      if (linked) {
        const full = await proposalsApi.get(linked.id);
        if (full) setProposal(full);
        setOfferHistoryLoading(true);
        proposalsApi.listOffers(linked.id)
          .then(setOfferHistory)
          .catch(() => { })
          .finally(() => setOfferHistoryLoading(false));
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

  // Calculate per-hotel breakdown
  const hotelBreakdowns = useMemo(() => {
    return hotels
      .filter((h) => h.includedInTotal !== false)
      .map((h) => {
        const roomData = h.rooms as Record<string, { net: number; sell: number; qty: number; nights: number }> | null;
        let buy = 0;
        let sell = 0;
        if (roomData && Object.keys(roomData).length > 0) {
          Object.values(roomData).forEach((detail) => {
            const net = Number(detail.net ?? 0);
            const sellPrice = Number(detail.sell ?? 0);
            const qty = detail.qty ?? 1;
            const nights = detail.nights ?? 1;
            buy += net * qty * nights;
            sell += sellPrice * qty * nights;
          });
        } else {
          buy = Number(h.totalPrice ?? 0);
          sell = Number(h.totalPrice ?? 0);
        }
        const margin = sell - buy;
        const marginPct = buy > 0 ? (margin / buy) * 100 : 0;
        return { hotelId: h.id, hotelName: h.hotelName || h.hotelCode, buy, sell, margin, marginPct };
      });
  }, [hotels]);

  const totals = useMemo(() => {
    // Only include hotels/services where includedInTotal is not explicitly false
    let hotelBuyTotal = 0;
    let hotelSellTotal = 0;
    hotels.filter((h) => h.includedInTotal !== false).forEach((h) => {
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
        const tp = Number(h.totalPrice ?? 0);
        hotelBuyTotal += tp;
        hotelSellTotal += tp;
      }
    });
    const includedServices = services.filter((sv) => sv.includedInTotal !== false);
    const serviceBuyTotal = includedServices.reduce(
      (s, sv) => s + Number(sv.buyPrice ?? 0) * (sv.quantity ?? 1),
      0
    );
    const serviceSellTotal = includedServices.reduce(
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

  const handleToggleHotelIncluded = useCallback(async (hotelId: string, includedInTotal: boolean) => {
    if (!proposal) return;
    // Optimistic update
    setProposal((p) =>
      p ? { ...p, hotels: (p.hotels ?? []).map((h) => h.id === hotelId ? { ...h, includedInTotal } : h) } : null
    );
    try {
      const { hotel: updatedHotel } = await proposalsApi.toggleHotelIncluded(proposal.id, hotelId, includedInTotal);
      setProposal((p) =>
        p ? { ...p, hotels: (p.hotels ?? []).map((h) => h.id === hotelId ? updatedHotel : h) } : null
      );
    } catch {
      // Revert on failure
      setProposal((p) =>
        p ? { ...p, hotels: (p.hotels ?? []).map((h) => h.id === hotelId ? { ...h, includedInTotal: !includedInTotal } : h) } : null
      );
      toast.error('Failed to update hotel inclusion. Please try again.');
    }
  }, [proposal]);

  const handleToggleServiceIncluded = useCallback(async (serviceId: string, includedInTotal: boolean) => {
    if (!proposal) return;
    // Optimistic update
    setProposal((p) =>
      p ? { ...p, services: (p.services ?? []).map((s) => s.id === serviceId ? { ...s, includedInTotal } : s) } : null
    );
    try {
      const { service: updatedService } = await proposalsApi.updateService(proposal.id, serviceId, { includedInTotal });
      setProposal((p) =>
        p ? { ...p, services: (p.services ?? []).map((s) => s.id === serviceId ? updatedService : s) } : null
      );
    } catch {
      // Revert on failure
      setProposal((p) =>
        p ? { ...p, services: (p.services ?? []).map((s) => s.id === serviceId ? { ...s, includedInTotal: !includedInTotal } : s) } : null
      );
      toast.error('Failed to update service inclusion. Please try again.');
    }
  }, [proposal]);

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

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const addEmailChip = (raw = emailInput) => {
    const val = raw.trim().replace(/,+$/, '');
    if (!val) return;
    if (!isValidEmail(val)) {
      setSendEmailError(t.offer.emailInvalid);
      return;
    }
    if (sendEmails.length >= 20) {
      setSendEmailError(t.offer.emailsMaxLimit);
      return;
    }
    const lower = val.toLowerCase();
    if (!sendEmails.map((e) => e.toLowerCase()).includes(lower)) {
      setSendEmails((prev) => [...prev, val]);
    }
    setEmailInput('');
    setSendEmailError('');
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmailChip();
    } else if (e.key === 'Backspace' && emailInput === '' && sendEmails.length > 0) {
      setSendEmails((prev) => prev.slice(0, -1));
    }
  };

  const handleEmailInputBlur = () => {
    if (emailInput.trim()) addEmailChip();
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

    // Flush any email typed but not yet added as a chip
    let finalEmails = [...sendEmails];
    const pending = emailInput.trim();
    if (pending) {
      if (!isValidEmail(pending)) {
        setSendEmailError(t.offer.emailInvalid);
        return;
      }
      const lower = pending.toLowerCase();
      if (!finalEmails.map((e) => e.toLowerCase()).includes(lower)) {
        finalEmails = [...finalEmails, pending];
        setSendEmails(finalEmails);
      }
      setEmailInput('');
    }

    if (finalEmails.length === 0) {
      setSendEmailError(t.offer.emailsRequired);
      return;
    }

    setActionLoading(true);

    // Step 1: Approve — generates PDF, emails agent.
    // Skipped if a previous attempt already completed this step successfully.
    if (!approveStepDone) {
      try {
        await proposalsApi.approve(proposal.id, {
          agentEmail: finalEmails[0],
          adminNotes: sendNotes.trim() || undefined,
        });
        setApproveStepDone(true);
      } catch (err: unknown) {
        const ax = await import('axios');
        if (ax.isAxiosError(err)) {
          const errorCode = err.response?.data?.error as string | undefined;
          const backendMessage = err.response?.data?.message as string | undefined;
          const status = err.response?.status;

          if (errorCode === 'PROPOSAL_NOT_APPROVABLE' || status === 412) {
            setSendError('This offer cannot be approved in its current state. Please refresh the page and try again.');
          } else if (errorCode === 'PDF_GENERATION_FAILED') {
            setSendError(t.toasts.pdfGenerationFailed);
          } else if (errorCode === 'NO_RECIPIENT_EMAIL') {
            setSendError(t.toasts.noRecipientEmail);
          } else if (status === 403) {
            setSendError('You do not have permission to approve this offer.');
          } else if (status && status >= 500) {
            setSendError('A server error occurred while approving the offer. Please try again.');
          } else {
            setSendError(backendMessage || t.toasts.failedToApprove);
          }
        } else {
          setSendError(t.toasts.failedToApprove);
        }
        setActionLoading(false);
        return;
      }
    }

    // Step 2: Send — marks proposal as sent
    try {
      const result = await proposalsApi.send(proposal.id, {
        sendToEmails: finalEmails,
      });
      setProposal(result.proposal);
      setSendOpen(false);
      setSendEmails([]);
      setEmailInput('');
      setSendNotes('');
      setSendError('');
      setApproveStepDone(false);
      setSuccessOpen(true);
      toast.success(t.toasts.proposalSent);
      proposalsApi.listOffers(proposal.id).then(setOfferHistory).catch(() => { });
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        const errorCode = err.response?.data?.error as string | undefined;
        const backendMessage = err.response?.data?.message as string | undefined;
        const emailError = err.response?.data?.data?.emailError as string | undefined;
        const proposalData = err.response?.data?.data?.proposal;
        const status = err.response?.status;
        if (proposalData) setProposal((p) => p ? { ...p, ...proposalData } : p);

        if (errorCode === 'SMTP_FAILED' || errorCode === 'EMAIL_SEND_FAILED') {
          setSendError(emailError || t.toasts.emailSendFailed);
        } else if (errorCode === 'SMTP_NOT_CONFIGURED') {
          setSendError(emailError || t.toasts.smtpNotConfigured);
        } else if (errorCode === 'NO_RECIPIENT_EMAIL') {
          setSendError(t.toasts.noRecipientEmail);
        } else if (errorCode === 'PDF_GENERATION_FAILED') {
          setSendError(t.toasts.pdfGenerationFailed);
        } else if (errorCode === 'PROPOSAL_ALREADY_SENT') {
          setSendOpen(false);
          toast.success(t.toasts.proposalAlreadySent);
        } else if (errorCode === 'PROPOSAL_NOT_MODIFIABLE' || status === 412) {
          setSendError('This offer cannot be sent in its current state. Please refresh and try again.');
        } else if (status === 403) {
          setSendError('You do not have permission to send this offer.');
        } else if (status === 409) {
          setSendError('A conflict occurred — the offer may have already been updated. Please refresh and try again.');
        } else if (status && status >= 500) {
          setSendError('A server error occurred while sending the offer. Please try again or contact support.');
        } else {
          setSendError(backendMessage || `${t.offer.approvedButNotSent}. ${t.offer.tryAgain}`);
        }
      } else {
        setSendError(`${t.offer.approvedButNotSent}. ${t.offer.tryAgain}`);
      }
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
    } catch (err: unknown) {
      const ax = await import('axios');
      if (ax.isAxiosError(err)) {
        const errorCode = err.response?.data?.error as string | undefined;
        if (errorCode === 'PROPOSAL_NOT_DECLINABLE' || errorCode === 'PROPOSAL_NOT_APPROVABLE') {
          toast.error(t.toasts.proposalNotDeclinable);
        } else {
          toast.error(err.response?.data?.message || t.toasts.proposalNotDeclinable);
        }
      } else {
        toast.error(t.toasts.proposalNotDeclinable);
      }
      setDeclineOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title={t.createForm.title} />
        <RequestSummarySkeleton />
      </>
    );
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

  const formatGroupType = (gt: string | null | undefined): string => getGroupTypeLabel(gt, t);


  return (
    <>
      <Header title={t.createForm.title} />

      <div className="p-4 md:p-6 space-y-6 pb-8">
        {/* ── Breadcrumb ── */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 animate-sidebar-fade-up">
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

        {/* ════════════════════ MANUAL HANDLING REQUIRED BANNER ════════════════════ */}
        {request.status === 'needs_manual_handling' && (
          <div
            className="flex items-start gap-4 rounded-[14px] border border-amber-200 border-l-4 border-l-amber-400 bg-amber-50 px-5 py-4 mb-6 animate-sidebar-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            {/* Icon circle */}
            <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-montserrat text-[14px] font-semibold text-amber-900 leading-snug">
                Manual handling required
              </p>
              <p className="font-montserrat text-[13px] font-normal text-amber-700 mt-0.5 mb-3 leading-snug">
                Our automated search couldn&apos;t find suitable hotels for this request. Please contact suppliers directly or adjust the criteria and re-run the search.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={() => router.push(`/booking-requests/${id}/add-hotel`)}>
                  Re-run Search
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    window.location.href = `mailto:${request.contactEmail || ''}?subject=Following%20Up%20on%20Your%20Hotel%20Request`;
                  }}
                >
                  Contact Customer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ MAIN CONTENT (two stacked cards) ════════════════════ */}
        <div className="space-y-6">

          {/* ════════════════════ REQUEST SUMMARY CARD ════════════════════ */}
          <div
            className="relative bg-white rounded-[14px] border border-sett-border p-5 animate-card-rise-in"
            style={{ animationDelay: '160ms' }}
          >
            {/* Section header */}
            <div
              className="flex items-center justify-between animate-sidebar-fade-up"
              style={{ animationDelay: '440ms' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
                <div>
                  {/* Edit-icon dedup: the button next to the Trip Details
                      subsection (a few lines below) is the canonical entry
                      point — it sits beside the data the user actually
                      edits. The previously-rendered duplicate next to the
                      Request Summary title was removed to avoid two
                      identically-behaving controls in the same eyeline. */}
                  <h2 className="font-montserrat text-[18px] font-semibold text-sett-text-primary">
                    {t.offer.requestSummary}
                  </h2>
                  <p className="font-montserrat text-[14px] font-normal leading-none text-sett-text-secondary mt-0.5">
                    {t.offer.bookingDetails}
                  </p>
                </div>
              </div>
            </div>

            {/* Youth/School ranking note — sets staff expectations that auto-results
                were ranked to surface youth-friendly properties first, but regular
                hotels are intentionally still in the list. */}
            {groupTypeRequiresAge(request.groupType) && request.averageAge != null && (
              <div
                className="mt-5 flex items-start gap-3 rounded-[10px] border border-sett-primary/30 bg-sett-primary/[0.06] px-4 py-3 animate-sidebar-fade-up"
                style={{ animationDelay: '480ms' }}
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-sett-primary flex items-center justify-center mt-0.5">
                  <Users className="w-3.5 h-3.5 text-sett-navy" />
                </div>
                <p className="font-montserrat text-[13px] leading-snug text-sett-text-primary">
                  {t.addHotel.youthSchoolRankingNote.replace('{age}', String(request.averageAge))}
                </p>
              </div>
            )}

            {/* ── Trip Details (always visible — collapsed view shows ONLY this) ── */}
            <div className={summaryCollapsed ? 'mt-6' : 'mt-6 mb-6'}>
              <div className="flex flex-col xl:flex-row xl:items-center justify-between min-h-[51px] gap-6">
                {/* Left: Trip Details label + Location + Date */}
                <div
                  className="flex flex-col gap-[14px] animate-fade-in-right"
                  style={{ animationDelay: '520ms' }}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-montserrat text-[16px] font-semibold leading-none text-sett-text-primary">
                      {t.offer.tripDetails}
                    </h3>
                    {!['sent', 'approved', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase()) && (
                      <span className="relative group/edit inline-flex">
                        <button
                          type="button"
                          onClick={() => setEditRequestOpen(true)}
                          // Two layered hover effects:
                          //  - background pill tints green so the hit target is
                          //    visually obvious before the click.
                          //  - icon scales up + rotates a touch and the button
                          //    nudges right so the action feels responsive.
                          // Active state presses down for tactile feedback.
                          className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] text-sett-primary hover:bg-sett-light-green-bg hover:text-sett-green-dark hover:translate-x-0.5 active:scale-95 transition-[background-color,color,transform] duration-200 ease-sett-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary focus-visible:ring-offset-1"
                          aria-label={t.offer.editRequestTitle}
                          title={t.offer.editRequestTitle}
                        >
                          <SquarePen className="w-4 h-4 transition-transform duration-200 ease-sett-out group-hover/edit:scale-110 group-hover/edit:rotate-[-4deg]" />
                        </button>
                        {/* Custom tooltip — visible on hover/focus, hidden by
                            default. Uses the brand navy panel so it reads
                            against any backdrop. Native title= above provides
                            the same text for accessibility tools / mobile
                            long-press / users who land via keyboard nav. */}
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 whitespace-nowrap rounded-md bg-sett-navy text-white text-[11px] font-medium font-montserrat px-2 py-1 shadow-lg ring-1 ring-white/10 opacity-0 translate-y-[-2px] transition-all duration-180 ease-sett-out group-hover/edit:opacity-100 group-hover/edit:translate-y-0 group-focus-within/edit:opacity-100 group-focus-within/edit:translate-y-0"
                        >
                          {t.offer.editRequestTitle}
                          <span
                            aria-hidden
                            className="absolute left-1/2 -translate-x-1/2 bottom-full border-4 border-transparent border-b-sett-navy"
                          />
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-[10px] flex-wrap">
                        {/* Location */}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-[14px] h-[14px] text-sett-text-accent shrink-0" />
                          <span className="font-montserrat text-[14px] font-medium leading-none text-sett-text-secondary">
                            {request.destinationName || '—'}
                          </span>
                        </div>
                        {/* Dot separator */}
                        <div className="w-1 h-1 rounded-[18px] bg-sett-border-light shrink-0 hidden sm:block" />
                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-[14px] h-[14px] text-sett-text-accent shrink-0" />
                          <span className="font-montserrat text-[14px] font-medium leading-none text-sett-text-secondary">
                            {formatDate(request.checkinDate)} - {formatDate(request.checkoutDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Stats — each stat fades up with a staggered delay */}
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:flex xl:items-center gap-5 xl:gap-5 w-full xl:w-auto">
                      {/* Hotel Category */}
                      <div
                        className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center animate-card-rise-in"
                        style={{ animationDelay: '600ms' }}
                      >
                        <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-sett-text-secondary">
                          {t.offer.hotelCategory}
                        </p>
                        {/* value row — multi-select aware. If multiple categories
                            are saved, render them as comma-separated `3★, 4★`. */}
                        {(() => {
                          const stars = selectedStars(request);
                          if (stars.length === 0) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="font-montserrat text-[14px] font-normal leading-none text-sett-text-accent">—</span>
                              </div>
                            );
                          }
                          if (stars.length === 1) {
                            return (
                              <div className="flex items-center gap-2 flex-nowrap">
                                <span className="font-montserrat text-[14px] font-normal leading-none text-sett-text-primary whitespace-nowrap">
                                  ({stars[0]}-Star)
                                </span>
                                <StarRating rating={stars[0]} />
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center flex-wrap gap-1.5">
                              {stars.map((s) => (
                                <span
                                  key={s}
                                  className="inline-flex items-center px-2 py-0.5 rounded-[8px] bg-sett-light-green-bg border border-sett-primary/30 font-montserrat text-[12px] font-semibold text-sett-primary leading-none"
                                >
                                  {s}★
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      {/* Vertical divider */}
                      <div className="hidden xl:block w-px h-[46px] bg-sett-border-light shrink-0" />
                      {/* Budget Range */}
                      <div
                        className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center animate-card-rise-in"
                        style={{ animationDelay: '670ms' }}
                      >
                        <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-sett-text-secondary">
                          {t.offer.budgetRange}
                        </p>
                        <p className="font-montserrat text-[14px] font-normal leading-none text-sett-text-primary">
                          {request.budgetRange ? request.budgetRange.charAt(0).toUpperCase() + request.budgetRange.slice(1) : '—'}
                        </p>
                      </div>
                      {/* Vertical divider */}
                      <div className="hidden xl:block w-px h-[46px] bg-sett-border-light shrink-0" />
                      {/* Group Type */}
                      <div
                        className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center animate-card-rise-in"
                        style={{ animationDelay: '740ms' }}
                      >
                        <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-sett-text-secondary">
                          {t.offer.groupType}
                        </p>
                        <p className="font-montserrat text-[14px] font-normal leading-none text-sett-text-primary">
                          {formatGroupType(request.groupType)}
                        </p>
                      </div>
                      {/* Vertical divider */}
                      <div className="hidden xl:block w-px h-[46px] bg-sett-border-light shrink-0" />
                      {/* Average Age - conditionally shown */}
                      {groupTypeRequiresAge(request.groupType) &&
                        request.averageAge != null && (
                        <>
                          <div
                            className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center animate-card-rise-in"
                            style={{ animationDelay: '810ms' }}
                          >
                            <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-sett-text-secondary">
                              {t.offer.averageAge}
                            </p>
                            <p className="font-montserrat text-[14px] font-normal leading-none text-sett-text-primary">
                              {request.averageAge}
                            </p>
                          </div>
                          {/* Vertical divider */}
                          <div className="hidden xl:block w-px h-[46px] bg-sett-border-light shrink-0" />
                        </>
                      )}
                      {/* Guests */}
                  <div
                    className="flex flex-col gap-2 xl:gap-[14px] items-start xl:items-center animate-card-rise-in"
                    style={{ animationDelay: '880ms' }}
                  >
                    <p className="font-montserrat text-[12px] font-medium leading-none tracking-normal uppercase text-sett-text-secondary">
                      {t.offer.guests}
                    </p>
                    <p className="font-montserrat text-[14px] font-normal leading-none text-sett-text-primary">
                      {request.groupSize ?? '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Collapsible: the rest of the request summary ──
                Uses .sett-collapsible (grid-template-rows 1fr↔0fr) so the
                panel smoothly contracts/expands its intrinsic height across
                ~420ms — no DOM measurement, no timer machinery. Content
                stays mounted always so internal animations re-trigger on
                expand. The inner aria-hidden tracks the visible state for
                screen readers. */}
            <div
              className="sett-collapsible"
              data-collapsed={summaryCollapsed || undefined}
              aria-hidden={summaryCollapsed}
            >
              <div className="sett-collapsible-inner">
                <hr className="border-sett-border-light mb-6 mt-2" />

                {/* ── Room & Accommodations ── */}
                <div className="flex flex-col gap-5 mb-6">
                  {/* Heading — height:20 */}
                  <h3
                    className="font-montserrat text-[16px] font-semibold leading-none text-sett-text-primary animate-sidebar-fade-up"
                    style={{ animationDelay: '40ms' }}
                  >
                    {t.offer.roomAccommodations}
                  </h3>
                  {/* Cards grid — Responsive 2x2 or 4x1 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 w-full gap-3 sm:gap-5">
                    {[
                      { label: t.offer.single, value: rooms?.single },
                      {
                        label: t.offer.double,
                        // Backend always stores double:0; derive the real count from sub-fields
                        value: (rooms?.standardDoubleBeds || rooms?.twinBeds)
                          ? (rooms?.standardDoubleBeds ?? 0) + (rooms?.twinBeds ?? 0)
                          : rooms?.double,
                      },
                      { label: t.offer.triple, value: rooms?.triple },
                      { label: t.offer.quadruple, value: rooms?.quadruple },
                    ].map((room, i) => (
                      <div
                        key={room.label}
                        className="flex flex-col items-center justify-center gap-2 sm:gap-[14px] border border-sett-border rounded-[14px] py-4 sm:py-0 sm:h-[86px] animate-card-rise-in"
                        style={{ animationDelay: `${120 + i * 60}ms` }}
                      >
                        <p className="font-montserrat text-[16px] sm:text-[18px] font-bold leading-none text-sett-text-primary">
                          {room.value ?? '—'}
                        </p>
                        <p className="font-montserrat text-[10px] sm:text-[12px] font-semibold leading-none uppercase text-sett-text-accent">
                          {room.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Bed Configuration for Double Room — outer: 14px radius, border sett-border, h:166 */}
                  <div
                    className="w-full rounded-[14px] border border-sett-border bg-white p-5 animate-card-rise-in"
                    style={{ animationDelay: '380ms' }}
                  >
                    <h4 className="font-montserrat text-[14px] font-semibold leading-none text-sett-text-primary mb-5">
                      {t.offer.bedConfiguration}
                    </h4>
                    {/* Inner cards grid — gap:20px, responsive */}
                    <div className="grid grid-cols-2 w-full gap-3 sm:gap-5">
                      {[
                        { label: t.offer.standardDoubleBed, value: rooms?.standardDoubleBeds },
                        { label: t.offer.twinBed, value: rooms?.twinBeds },
                      ].map((bed) => (
                        <div
                          key={bed.label}
                          className="flex flex-col items-center justify-center gap-2 sm:gap-[14px] border border-sett-border rounded-[14px] py-4 sm:py-0 sm:h-[86px]"
                        >
                          <p className="font-montserrat text-[16px] sm:text-[18px] font-bold leading-none text-sett-text-primary">
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
                    <div
                      className="w-full rounded-[14px] bg-sett-navy/10 px-5 py-5 flex items-center gap-[10px] animate-sidebar-fade-up"
                      style={{ minHeight: 57, animationDelay: '460ms' }}
                    >
                      <span className="font-montserrat text-[14px] font-semibold leading-none text-sett-navy">{t.offer.extras}:</span>
                      <span className="font-montserrat text-[14px] font-normal leading-none text-sett-navy">{rooms.extraRoomsNote}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div
                      className="border border-sett-border rounded-[14px] p-3 sm:p-4 text-center animate-card-rise-in"
                      style={{ animationDelay: '520ms' }}
                    >
                      <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary">{breakfastLabel}</p>
                      <p className="font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent mt-0.5">
                        {t.offer.breakfastPreference}
                      </p>
                    </div>
                    <div
                      className="border border-sett-border rounded-[14px] p-3 sm:p-4 text-center animate-card-rise-in"
                      style={{ animationDelay: '580ms' }}
                    >
                      <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary">{locationLabel}</p>
                      <p className="font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent mt-0.5">
                        {t.offer.hotelLocation}
                      </p>
                    </div>
                  </div>

                  {request.specialRequirements && (
                    <div
                      className="w-full rounded-[14px] bg-sett-navy/10 px-5 py-5 flex items-center gap-[10px] animate-sidebar-fade-up"
                      style={{ minHeight: 57, animationDelay: '660ms' }}
                    >
                      <span className="font-montserrat text-[14px] font-semibold leading-none text-sett-navy">{t.offer.specialRequirement}:</span>
                      <span className="font-montserrat text-[14px] font-normal leading-none text-sett-navy">{request.specialRequirements}</span>
                    </div>
                  )}
                </div>

                <hr className="border-sett-border-light mb-6" />

                {/* ── Customer Details ── */}
                <div className="mb-6">
                  <h3
                    className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-3 animate-sidebar-fade-up"
                    style={{ animationDelay: '40ms' }}
                  >
                    {t.offer.customerDetails}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-3">
                    <div className="animate-sidebar-fade-up" style={{ animationDelay: '120ms' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.companyName}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-sett-text-primary">
                        {request.companyName || '—'}
                      </p>
                    </div>
                    <div className="animate-sidebar-fade-up" style={{ animationDelay: '180ms' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.guestList}
                        </span>
                      </div>
                      {attachments.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {attachments.map((att) => (
                            <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                              className="font-montserrat text-[14px] font-semibold leading-none text-sett-primary hover:underline truncate">
                              {att.originalName}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="font-montserrat text-[14px] font-semibold leading-none text-sett-text-primary">—</p>
                      )}
                    </div>
                    <div className="animate-sidebar-fade-up" style={{ animationDelay: '240ms' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.contactPerson}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-sett-text-primary">
                        {[request.firstName, request.lastName].filter(Boolean).join(' ') ||
                          request.contactName ||
                          '—'}
                      </p>
                    </div>
                    <div className="animate-sidebar-fade-up" style={{ animationDelay: '300ms' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mail className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.emailAddress}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-sett-text-primary">{request.contactEmail || '—'}</p>
                    </div>
                    <div className="animate-sidebar-fade-up" style={{ animationDelay: '360ms' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Phone className="w-3.5 h-3.5 text-sett-text-accent" />
                        <span className="text-label text-sett-text-accent uppercase tracking-wide">
                          {t.offer.phoneNumber}
                        </span>
                      </div>
                      <p className="font-montserrat text-[14px] font-semibold leading-none text-sett-text-primary">
                        {formatPhone(request.contactPhoneCountryCode, request.contactPhone)}
                      </p>
                    </div>
                  </div>
                  {request.customerNotes && (
                    <div
                      className="w-full rounded-[14px] bg-sett-navy/10 px-5 py-5 flex items-center gap-[10px] mt-3 animate-sidebar-fade-up"
                      style={{ minHeight: 57, animationDelay: '440ms' }}
                    >
                      <span className="font-montserrat text-[14px] font-semibold leading-none text-sett-navy">{t.offer.specialRequirement}:</span>
                      <span className="font-montserrat text-[14px] font-normal leading-none text-sett-navy">{request.customerNotes}</span>
                    </div>
                  )}
                </div>

                <hr className="border-sett-border-light mb-6" />

                {/* ── Policies ── */}
                <div>
                  <h3
                    className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-3 animate-sidebar-fade-up"
                    style={{ animationDelay: '40ms' }}
                  >
                    {t.offer.policies}
                  </h3>
                  {request.termsAndConditions && request.termsAndConditions.replace(/<[^>]*>/g, '').trim() && (
                    <div
                      className="bg-sett-fill rounded-card px-4 py-3 mb-3 border border-sett-border/50 animate-card-rise-in"
                      style={{ animationDelay: '120ms' }}
                    >
                      <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">
                        {t.offer.termsConditions}
                      </p>
                      {/* `sett-rich-editor` restores ul/ol markers that Tailwind
                          preflight strips — same hook used by the RichTextEditor
                          so what the user typed renders identically here. */}
                      <div
                        className="sett-rich-editor font-montserrat text-[14px] font-semibold text-sett-text-primary"
                        style={{ lineHeight: '22px' }}
                        dangerouslySetInnerHTML={{ __html: request.termsAndConditions }}
                      />
                    </div>
                  )}
                  {request.cancellationConditions && request.cancellationConditions.replace(/<[^>]*>/g, '').trim() && (
                    <div
                      className="bg-sett-fill rounded-card px-4 py-3 border border-sett-border/50 animate-card-rise-in"
                      style={{ animationDelay: '200ms' }}
                    >
                      <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">
                        {t.offer.cancellationConditions}
                      </p>
                      <div
                        className="sett-rich-editor font-montserrat text-[14px] font-semibold text-sett-text-primary"
                        style={{ lineHeight: '22px' }}
                        dangerouslySetInnerHTML={{ __html: request.cancellationConditions }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* ── Collapse / Expand toggle ──
                Brand-aligned §5.1 button: 14px Montserrat 700, UPPERCASE,
                0.08em tracking, 4px radius. State-driven styling:
                  • Collapsed: PRIMARY (filled #AAC737, navy text) — invites
                    the user to "Show More" with brand confidence.
                  • Expanded: SECONDARY (transparent, 2px green border,
                    green text) — quieter because the content's already
                    on screen, the action just dismisses it.
                Sits centered on the bottom edge of the card, lifted by a
                subtle drop shadow so it reads as a control attached to the
                panel rather than a generic widget. */}
            <button
              type="button"
              onClick={toggleSummary}
              className={cn(
                'absolute left-1/2 -bottom-5 -translate-x-1/2 z-10',
                'inline-flex items-center gap-2 px-5 h-10 rounded-[4px]',
                'font-montserrat text-[13px] font-bold uppercase tracking-[0.08em] leading-none',
                'transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-out',
                'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary focus-visible:ring-offset-2',
                summaryCollapsed
                  // §5.1 PRIMARY — filled green, navy text
                  ? 'bg-sett-primary text-sett-navy border-2 border-sett-primary hover:bg-sett-green-dark hover:border-sett-green-dark hover:text-white shadow-[0_4px_14px_-2px_rgba(170,199,55,0.55)]'
                  // §5.1 SECONDARY — transparent, green border + text
                  : 'bg-white text-sett-primary border-2 border-sett-primary hover:bg-sett-primary hover:text-sett-navy shadow-[0_4px_12px_-2px_rgba(7,28,66,0.12)]',
              )}
              aria-label={summaryCollapsed ? t.offer.showMoreDetails : t.offer.showLessDetails}
              aria-expanded={!summaryCollapsed}
            >
              <span>{summaryCollapsed ? t.offer.showMoreDetails : t.offer.showLessDetails}</span>
              {/* Chevron rotates in lockstep with the panel's ~420ms slide. */}
              <ChevronUp
                className={cn(
                  'w-4 h-4 shrink-0 transition-transform duration-[420ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                  summaryCollapsed ? 'rotate-180' : 'rotate-0',
                )}
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
          </div>

          {/* ════════════════════ HOTELS + SIDEBAR (no wrapping card) ════════════════════ */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Hotels + Services */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Hotels */}
              <div>
                <div
                  className="flex items-center justify-between mb-4 animate-sidebar-fade-up"
                  style={{ animationDelay: '320ms' }}
                >
                  <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary">{t.offer.hotels}</h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddHotelsClick}
                    isLoading={actionLoading}
                    disabled={[ 'approved', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
                  >
                    {t.offer.addHotel}
                  </Button>
                </div>

                {hotels.length === 0 ? (
                  <div
                    className="bg-sett-card rounded-card border border-sett-border p-6 text-center animate-sidebar-fade-up"
                    style={{ animationDelay: '400ms' }}
                  >
                    <p className="text-body text-sett-text-accent">
                      {t.offer.noHotels}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hotels.map((hotel, i) => (
                      <div
                        key={hotel.id}
                        className="animate-card-rise-in"
                        style={{ animationDelay: `${400 + Math.min(i, 5) * 80}ms` }}
                      >
                        <HotelCard
                          hotel={hotel}
                          proposalId={proposal!.id}
                          onPricingUpdate={handlePricingUpdate}
                          onRemove={() => setRemoveHotelTarget(hotel.id)}
                          onToggleIncluded={(v) => handleToggleHotelIncluded(hotel.id, v)}
                          proposalStatus={proposal!.status}
                          offerCount={offerHistory.length}
                          isSelectedForBreakdown={selectedHotelsForBreakdown.has(hotel.id)}
                          onToggleBreakdownSelection={() => toggleHotelBreakdownSelection(hotel.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Services — only show when hotels are added */}
              {hotels.length > 0 && <div>
                <div
                  className="flex items-center justify-between mb-4 animate-sidebar-fade-up"
                  style={{ animationDelay: '560ms' }}
                >
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
                  <div
                    className="bg-sett-card rounded-card border border-sett-border overflow-hidden animate-card-rise-in"
                    style={{ animationDelay: '640ms' }}
                  >
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full min-w-[860px]">
                        <thead>
                          <tr className="border-b border-sett-border bg-sett-fill">
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
                              {t.offer.service}
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
                              {t.services.dateFrom}
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
                              {t.services.dateTo}
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
                              {t.offer.net} &euro;
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
                              {t.offer.markup}
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
                              {t.offer.sell} &euro;
                            </th>
                            <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
                              {t.offer.qty}
                            </th>
                            <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2.5 font-medium whitespace-nowrap">
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
                              onToggleIncluded={(v) => handleToggleServiceIncluded(service.id, v)}
                              proposalStatus={proposal!.status}
                            />
                          ))}
                          {/* Subtotal row — visual parity with the hotel
                              breakdown. Sums only the services included in
                              the proposal total (excluded ones are dimmed
                              in the row above and skipped here). */}
                          <tr className="bg-sett-fill">
                            <td colSpan={7} className="px-4 py-3 text-right text-label text-sett-text-accent uppercase tracking-wide font-semibold">
                              {t.contract.subtotal}
                            </td>
                            <td className="px-4 py-3 text-right text-body font-bold text-sett-text-primary">
                              {formatPriceEU(
                                services
                                  .filter((s) => s.includedInTotal !== false)
                                  .reduce((sum, s) => sum + Number(s.sellPrice ?? 0) * (s.quantity ?? 1), 0)
                              )}
                            </td>
                            <td />
                          </tr>
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
                          onToggleIncluded={(v) => handleToggleServiceIncluded(service.id, v)}
                          proposalStatus={proposal!.status}
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
                {/* ─── Offer History ───
                    Brand-aligned redesign per SETT-Hub-Brand-Guidelines-v2:
                      §5.3 Panels — 8px radius, 1px #E0E0E0 border, soft
                        shadow, 3px green left accent on the card.
                      §2 Color discipline — no blue/orange/purple. Initial
                        offer uses navy chip; revisions use neutral white
                        chip with grey border; final offer uses brand-green
                        chip. The latest entry gets a subtle green-tinted
                        background to draw the eye.
                      §3 Typography — section title is H4-style: Montserrat
                        700, navy, 13px uppercase, 0.05em tracking.
                      §5.1 Buttons — Download CTA uses the brand secondary
                        button shape (transparent + 2px green border + green
                        text, uppercase, navy hover-fill). */}
                <div
                  className="relative bg-white rounded-[8px] border border-sett-border overflow-hidden animate-card-rise-in"
                  style={{
                    animationDelay: '480ms',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* §5.3 emphasis accent — 3px green stripe identifying
                      the panel as a key brand element on the sidebar. */}
                  <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-sett-primary" />

                  {/* Section header — icon + brand-spec H4 + count badge */}
                  <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-sett-border">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] bg-sett-light-green-bg border border-sett-primary/30">
                        <History className="w-3.5 h-3.5 text-sett-primary" strokeWidth={2.25} />
                      </span>
                      <h4 className="font-montserrat text-[13px] font-bold uppercase tracking-[0.05em] text-sett-navy">
                        {t.offer.offerHistory}
                      </h4>
                    </div>
                    {offerHistory.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-sett-navy text-white font-montserrat text-[11px] font-bold tabular-nums">
                        {offerHistory.length}
                      </span>
                    )}
                  </div>

                  {/* Loading skeleton — tighter pulse cards */}
                  {offerHistoryLoading && (
                    <div className="p-4 space-y-3">
                      {[1, 2].map((n) => (
                        <div key={n} className="rounded-[8px] border border-sett-border p-3 space-y-2 animate-pulse">
                          <div className="flex items-center justify-between gap-2">
                            <div className="h-5 w-24 rounded-full bg-sett-border-light" />
                            <div className="h-3 w-16 rounded bg-sett-border-light" />
                          </div>
                          <div className="h-3 w-full rounded bg-sett-border-light" />
                          <div className="h-3 w-2/3 rounded bg-sett-border-light" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state — navy-tinted illustration + brand copy */}
                  {!offerHistoryLoading && offerHistory.length === 0 && (
                    <div className="px-5 py-8 flex flex-col items-center text-center">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sett-fill border border-sett-border-light mb-3">
                        <Inbox className="w-5 h-5 text-sett-text-accent" strokeWidth={2} />
                      </span>
                      <p className="font-montserrat text-[13px] font-semibold text-sett-navy">
                        {t.offer.noOffersSent}
                      </p>
                    </div>
                  )}

                  {/* Timeline — vertical rail down the left edge of each
                      entry block. Most recent entry sits at the top and is
                      visually emphasized; older entries de-emphasize. */}
                  {!offerHistoryLoading && offerHistory.length > 0 && (
                    <div className="relative">
                      {offerHistory.map((entry, idx) => {
                        const isLatest = idx === 0;
                        // §2 brand-only color palette for the chip:
                        //  - initial   → navy chip
                        //  - revision  → light grey neutral chip
                        //  - final     → brand-green chip (signals "this
                        //    is the customer-facing winning offer")
                        const chipClass = entry.type === 'initial'
                          ? 'bg-sett-navy text-white border-sett-navy'
                          : entry.type === 'final'
                            ? 'bg-sett-primary text-sett-navy border-sett-primary'
                            : 'bg-sett-fill text-sett-navy border-sett-border';

                        const typeLabel = entry.type === 'initial'
                          ? t.offer.initialOffer
                          : entry.type === 'final'
                            ? t.offer.finalOffer
                            : `${t.offer.revision} #${entry.offerNumber - 2}`;

                        const hotelsLabel = entry.hotelCount === 1
                          ? t.offer.hotelsCount.replace('{n}', '1')
                          : t.offer.hotelsPluralCount.replace('{n}', String(entry.hotelCount));
                        const servicesLabel = entry.serviceCount === 1
                          ? t.offer.servicesCount.replace('{n}', '1')
                          : t.offer.servicesPluralCount.replace('{n}', String(entry.serviceCount));

                        // Recipients: show first email + "+N" overflow chip
                        // for the long-list case (full list available on
                        // hover via title attribute).
                        const recipients = entry.sentToEmails;
                        const recipientsLabel = recipients.length === 0
                          ? '—'
                          : recipients.length === 1
                            ? recipients[0]
                            : `${recipients[0]} +${recipients.length - 1}`;
                        const recipientsTooltip = recipients.join(', ');

                        // Hotel/service count as just the number — the
                        // singular/plural translation strings (e.g. "2
                        // hotels") wrapped to two lines in the narrow
                        // sidebar column. Pulling the count out as a tabular
                        // number + a short word keeps everything on one
                        // baseline.
                        const numberOnly = (label: string) => {
                          const m = label.match(/\d+/);
                          return m ? m[0] : label;
                        };
                        const hotelN = numberOnly(hotelsLabel);
                        const serviceN = numberOnly(servicesLabel);
                        // Short word — strip the leading number + space so
                        // we render "2 hotels" as "2  hotels" with our own
                        // spacing/alignment instead of relying on the
                        // i18n string's spaces which produced inconsistent
                        // wrapping.
                        const hotelWord = hotelsLabel.replace(/^\d+\s*/, '').toLowerCase();
                        const serviceWord = servicesLabel.replace(/^\d+\s*/, '').toLowerCase();

                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              'relative transition-colors duration-200',
                              isLatest
                                ? 'bg-sett-light-green-bg/40'
                                : 'hover:bg-sett-fill/60',
                              idx < offerHistory.length - 1 && 'border-b border-sett-border-light',
                            )}
                          >
                            {/* Comfortable per-entry padding so rows breathe. */}
                            <div className="px-5 py-4 space-y-3">
                              {/* ── Row 1 — Type chip + offer # · date ──
                                  Chip carries the offer-type semantic; the
                                  small "#1" and date sit right-aligned at the
                                  same y for a clean masthead. */}
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn(
                                  'inline-flex items-center px-2.5 py-1 rounded-full border font-montserrat text-[10px] font-bold uppercase tracking-[0.08em] leading-none whitespace-nowrap',
                                  chipClass,
                                )}>
                                  {typeLabel}
                                </span>
                                <div className="flex items-center gap-1.5 font-montserrat text-[11px] font-medium text-sett-text-secondary whitespace-nowrap tabular-nums">
                                  <span className="text-sett-text-accent">#{entry.offerNumber}</span>
                                  <span className="text-sett-border" aria-hidden>•</span>
                                  <span>{formatDate(entry.sentAt)}</span>
                                </div>
                              </div>

                              {/* ── Row 2 — Recipients ──
                                  Tiny uppercase label above the value gives
                                  the data a key/value affordance instead of
                                  "Sent to: x@y.com" running together. */}
                              <div className="space-y-0.5">
                                <p className="font-montserrat text-[10px] font-bold uppercase tracking-[0.06em] text-sett-text-accent">
                                  {t.offer.sentTo}
                                </p>
                                <p
                                  className="font-montserrat text-[13px] font-medium text-sett-navy truncate"
                                  title={recipientsTooltip}
                                >
                                  {recipientsLabel}
                                </p>
                              </div>

                              {/* ── Row 3 — Summary band ──
                                  Two stacked sub-rows inside one card:
                                    • counts (hotels · services) — smaller
                                    • price — full-width, dominant
                                  Splitting onto two lines fixed the price
                                  getting truncated when both items shared
                                  the same horizontal row at narrow sidebar
                                  widths. The price is the value staff care
                                  about most — it now gets its own row and
                                  the visual weight (16px extrabold) to
                                  match. */}
                              <div className="rounded-[6px] bg-white border border-sett-border-light overflow-hidden">
                                {/* Counts sub-row */}
                                <div className="flex items-center gap-3 px-3 py-2 font-montserrat text-[12px] text-sett-navy border-b border-sett-border-light">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-sett-text-accent" />
                                    <span className="font-bold tabular-nums">{hotelN}</span>
                                    <span className="text-sett-text-secondary">{hotelWord}</span>
                                  </span>
                                  <span className="w-px h-3 bg-sett-border" aria-hidden />
                                  <span className="inline-flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-sett-text-accent" />
                                    <span className="font-bold tabular-nums">{serviceN}</span>
                                    <span className="text-sett-text-secondary">{serviceWord}</span>
                                  </span>
                                </div>
                                {/* Price sub-row — full-width, label + value */}
                                {entry.totalPrice != null && (
                                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-sett-fill/60">
                                    <span className="font-montserrat text-[10px] font-bold uppercase tracking-[0.08em] text-sett-text-accent">
                                      {t.offer.total}
                                    </span>
                                    <span className="font-montserrat text-[16px] font-extrabold text-sett-navy whitespace-nowrap tabular-nums leading-none">
                                      {formatCurrencyEU(entry.totalPrice, entry.currency)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* ── Row 4 — Download CTA ──
                                  Compact secondary-style: green text on
                                  light-green tint, full-width, doesn't try
                                  to compete with the chip above. */}
                              {entry.pdfUrl ? (
                                <a
                                  href={entry.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-[6px] bg-sett-light-green-bg/70 border border-sett-primary/30 font-montserrat text-[12px] font-bold uppercase tracking-[0.06em] text-sett-green-dark hover:bg-sett-primary hover:text-sett-navy hover:border-sett-primary transition-colors duration-200 active:scale-[0.98]"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {t.modals.downloadPdf}
                                </a>
                              ) : (
                                <div className="inline-flex items-center justify-center gap-1.5 w-full h-9 rounded-[6px] bg-sett-fill border border-sett-border-light font-montserrat text-[11px] font-medium text-sett-text-accent">
                                  <AlertTriangle className="w-3 h-3" />
                                  {t.offer.pdfUnavailable}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Room Breakdown */}
                <div
                  className="bg-white flex flex-col animate-card-rise-in"
                  style={{ borderRadius: 14, border: '1px solid #D1D5DB', animationDelay: '560ms' }}
                >
                  {/* Title */}
                  <div className="px-5 pt-5 pb-5">
                    <h4 className="font-montserrat font-semibold text-[18px] leading-none tracking-normal text-[#1D1D1D]">
                      {t.offer.roomBreakdown}
                    </h4>
                  </div>
                  {/* Divider below title */}
                  <div className="mx-5" style={{ borderTop: '1px solid #D1D5DB' }} />
                  {/* Rows */}
                  <div className="px-5 pt-5 pb-5 flex flex-col gap-4">
                    {/* Selected Hotels Breakdowns */}
                    {selectedHotelsForBreakdown.size > 0 ? (
                      <>
                        {hotelBreakdowns
                          .filter((b) => selectedHotelsForBreakdown.has(b.hotelId))
                          .map((breakdown) => (
                            <div key={breakdown.hotelId} className="flex flex-col gap-3 p-3 rounded-[8px]" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                              <h5 className="font-montserrat font-semibold text-[13px] text-[#1D1D1D]">
                                {breakdown.hotelName}
                              </h5>
                              <div className="flex items-center justify-between">
                                <span className="font-montserrat text-[12px] font-medium text-[#686868]">{t.offer.purchase}</span>
                                <span className="font-montserrat font-semibold text-[14px]" style={{ color: '#071C42' }}>
                                  €{formatPriceEU(breakdown.buy)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-montserrat text-[12px] font-medium text-[#686868]">{t.offer.sell}</span>
                                <span className="font-montserrat font-semibold text-[14px]" style={{ color: '#071C42' }}>
                                  €{formatPriceEU(breakdown.sell)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #D1D5DB' }}>
                                <span className="font-montserrat text-[12px] font-medium text-[#686868]">{t.requests.margin}</span>
                                <span className="font-montserrat font-semibold text-[14px]" style={{ color: '#667F00' }}>
                                  €{formatPriceEU(breakdown.margin)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </>
                    ) : (
                      <p className="font-montserrat text-[14px] text-[#686868] text-center py-4">
                        Check hotel names to view breakdown details
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  className="grid grid-cols-2 lg:grid-cols-1 gap-3 animate-sidebar-fade-up"
                  style={{ animationDelay: '640ms' }}
                >
                  <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                    <Eye className="w-4 h-4" />
                    {t.offer.previewPdf}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSaveDraftOpen(true)}
                    disabled={['sent', 'accepted', 'declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
                  >
                    <Save className="w-4 h-4" />
                    {t.offer.saveDraft}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const status = (proposal?.status ?? request.status).toLowerCase();
                      if (status === 'approved') setApproveStepDone(true);
                      if (sendEmails.length === 0 && request.contactEmail) {
                        setSendEmails([request.contactEmail]);
                      }
                      setSendOpen(true);
                    }}
                    disabled={['declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
                  >
                    <Send className="w-4 h-4" />
                    {offerHistory.length === 0
                      ? t.offer.sendInitialOffer
                      : offerHistory.length === 1
                        ? t.offer.sendFinalOffer
                        : t.offer.sendRevision}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeclineOpen(true)}
                    disabled={['declined', 'cancelled', 'completed'].includes((proposal?.status ?? request.status).toLowerCase())}
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
            bookingStartDate={request.checkinDate}
            bookingEndDate={request.checkoutDate}
          />

          <AddServiceModal
            open={!!editingService}
            onClose={() => setEditingService(null)}
            onAdd={handleEditService}
            isLoading={actionLoading}
            initialData={editingService ?? undefined}
            bookingStartDate={request.checkinDate}
            bookingEndDate={request.checkoutDate}
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
          <ModalOverlay
            open={sendOpen}
            onClose={() => { setSendOpen(false); setSendError(''); setSendEmailError(''); setSendEmails([]); setEmailInput(''); setSendNotes(''); setApproveStepDone(false); }}
          >
              <div
                className="bg-white w-full max-w-md mx-4 flex flex-col overflow-hidden"
                style={{
                  borderRadius: 8, // §5.3 panel
                  border: '1px solid #E0E0E0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {/* §5.3 accent strip */}
                <div aria-hidden className="h-[3px] w-full bg-sett-primary" />
                <div className="px-5 py-5">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-montserrat text-[18px] font-bold text-sett-navy leading-tight">
                      {offerHistory.length === 0
                        ? t.offer.sendInitialOffer
                        : offerHistory.length === 1
                          ? t.offer.sendFinalOffer
                          : t.offer.sendRevision}
                    </h3>
                    <p className="font-montserrat text-[13px] text-sett-grey leading-snug">
                      {approveStepDone ? t.offer.resendMsg : t.offer.approveMsg}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSendOpen(false); setSendError(''); setSendEmailError(''); setSendEmails([]); setEmailInput(''); setSendNotes(''); setApproveStepDone(false); }}
                    className="p-1.5 rounded-[4px] hover:bg-[#F8F9FA] text-sett-grey hover:text-sett-navy transition-colors -mt-1"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {sendError && (
                  <div className="flex flex-col gap-2 mb-4 p-3 rounded-[4px]" style={{ background: '#FCEBEB', border: '1px solid #CC3333' }}>
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-[#CC3333] mt-0.5 shrink-0" />
                      <p className="font-montserrat text-[13px] text-[#CC3333]">{sendError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block font-montserrat text-[12px] font-semibold uppercase tracking-[0.05em] text-sett-navy mb-1.5">
                      {t.offer.emailsLabel} <span className="text-[#CC3333]">*</span>
                    </label>
                    {/* Multi-email chip input — §5.5 input */}
                    <div
                      className={`min-h-[41px] w-full px-2 py-1.5 rounded-[4px] border flex flex-wrap gap-1.5 cursor-text transition-[border-color,box-shadow] duration-150 ${sendEmailError
                        ? 'border-[#CC3333] focus-within:shadow-[0_0_0_3px_rgba(204,51,51,0.15)]'
                        : 'border-[#D0D0D0] focus-within:border-sett-primary focus-within:shadow-[0_0_0_3px_rgba(170,199,55,0.15)]'
                        }`}
                      onClick={() => emailInputRef.current?.focus()}
                    >
                      {sendEmails.map((email, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F9E8] border border-sett-primary text-sett-navy rounded-[4px] font-montserrat text-[13px] font-semibold max-w-full"
                        >
                          <span className="truncate max-w-[200px]">{email}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSendEmails((prev) => prev.filter((_, i) => i !== idx));
                              if (sendEmailError) setSendEmailError('');
                            }}
                            className="shrink-0 text-sett-navy hover:text-sett-green-dark ml-0.5 focus:outline-none"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {sendEmails.length < 20 && (
                        <input
                          ref={emailInputRef}
                          type="email"
                          value={emailInput}
                          onChange={(e) => { setEmailInput(e.target.value); if (sendEmailError) setSendEmailError(''); }}
                          onKeyDown={handleEmailInputKeyDown}
                          onBlur={handleEmailInputBlur}
                          placeholder={sendEmails.length === 0 ? t.offer.addEmailPlaceholder : ''}
                          className="flex-1 min-w-[180px] px-1 py-0.5 font-montserrat text-[14px] text-sett-navy placeholder:text-sett-grey focus:outline-none bg-transparent"
                        />
                      )}
                    </div>
                    {sendEmailError && (
                      <p className="mt-1 font-montserrat text-[12px] text-[#CC3333]">{sendEmailError}</p>
                    )}
                    <p className="mt-1 font-montserrat text-[12px] text-sett-grey">{t.offer.emailsMaxLimit}</p>
                  </div>
                  <div>
                    <label className="block font-montserrat text-[12px] font-semibold uppercase tracking-[0.05em] text-sett-navy mb-1.5">
                      {t.offer.adminNotes} <span className="font-normal text-sett-grey normal-case tracking-normal">{t.offer.adminNotesOptional}</span>
                    </label>
                    <textarea
                      value={sendNotes}
                      onChange={(e) => setSendNotes(e.target.value)}
                      placeholder={t.offer.notesPlaceholder}
                      rows={3}
                      className="w-full px-3 py-2 rounded-[4px] border border-[#D0D0D0] font-montserrat text-[14px] text-sett-navy placeholder:text-sett-grey focus:outline-none focus:border-sett-primary focus:shadow-[0_0_0_3px_rgba(170,199,55,0.15)] resize-none transition-[border-color,box-shadow] duration-150"
                    />
                  </div>
                </div>
                </div>
                <div className="h-px bg-[#E0E0E0] mx-5" />
                <div className="flex gap-3 px-5 py-4 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setSendOpen(false); setSendError(''); setSendEmailError(''); setSendEmails([]); setEmailInput(''); setSendNotes(''); setApproveStepDone(false); }}
                    disabled={actionLoading}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApproveAndSend}
                    isLoading={actionLoading}
                  >
                    <Send className="w-4 h-4" />
                    {offerHistory.length === 0
                      ? t.offer.sendInitialOffer
                      : offerHistory.length === 1
                        ? t.offer.sendFinalOffer
                        : t.offer.sendRevision}
                  </Button>
                </div>
              </div>
          </ModalOverlay>

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
              proposal={proposal}
              onClose={() => setEditRequestOpen(false)}
              onSaved={(updated) => { setRequest(updated); loadData(); }}
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
  const [error, setError] = useState('');
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
      setError('');
    };
    // Use capture phase so this fires before other dropdowns' handlers
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [open]);

  // Close on scroll so it doesn't float detached
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => { setOpen(false); setIsCustom(false); setError(''); };
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
    setError('');

    if (!customValue.trim()) {
      setError('Markup value is required');
      return;
    }

    const parsed = parseFloat(customValue);

    if (isNaN(parsed)) {
      setError('Please enter a valid number');
      return;
    }

    if (parsed < 0) {
      setError('Markup must be 0 or greater');
      return;
    }

    if (parsed > 999) {
      setError('Markup cannot exceed 999');
      return;
    }

    onChange(parsed);
    setOpen(false);
    setIsCustom(false);
    setCustomValue('');
  };

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded border border-sett-border hover:border-sett-primary text-body text-sett-text-primary bg-white transition-colors min-w-[72px] justify-between"
      >
        <span>{value % 1 === 0 ? Math.round(value) : value.toFixed(2)}%</span>
        <svg className="w-3 h-3 text-sett-text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open &&
        ReactDOM.createPortal(
          <div
            ref={panelRef}
            onMouseDown={(e) => e.stopPropagation()}
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
              <div className="px-3 py-1.5">
                <div className="flex items-center gap-1 mb-1.5">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    step="0.1"
                    value={customValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      // Prevent negative values from being entered
                      if (v === '' || parseFloat(v) >= 0) {
                        setCustomValue(v);
                        setError('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-') e.preventDefault();
                      if (e.key === 'Enter') handleCustomSubmit();
                      if (e.key === 'Escape') { setIsCustom(false); setOpen(false); }
                    }}
                    autoFocus
                    className={`w-24 px-1.5 py-0.5 border rounded text-body focus:outline-none transition-colors ${
                      error ? 'border-red-500 text-red-500 focus:border-red-500' : 'border-sett-border text-sett-text-primary focus:border-sett-primary'
                    }`}
                    placeholder="0-999.99"
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
                {error && <p className="text-[12px] text-red-500 font-montserrat">{error}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setIsCustom(true); setCustomValue(isPreset ? '' : String(value)); setError(''); }}
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
  onToggleIncluded,
  proposalStatus,
  offerCount,
  isSelectedForBreakdown,
  onToggleBreakdownSelection,
}: {
  hotel: ProposalHotel;
  proposalId: string;
  onPricingUpdate: (hotelId: string, updatedHotel: ProposalHotel) => void;
  onRemove: () => void;
  onToggleIncluded: (included: boolean) => void;
  proposalStatus: string;
  offerCount: number;
  isSelectedForBreakdown: boolean;
  onToggleBreakdownSelection: () => void;
}) {
  const { t } = useLanguage();
  const [localRooms, setLocalRooms] = useState<RoomData>(
    (hotel.rooms as RoomData) ?? {}
  );
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRoomsRef = useRef<RoomData>((hotel.rooms as RoomData) ?? {});

  // Sync local rooms only when the hotel identity changes (not on every price update)
  const hotelIdRef = useRef(hotel.id);
  useEffect(() => {
    if (hotelIdRef.current !== hotel.id) {
      hotelIdRef.current = hotel.id;
      setLocalRooms((hotel.rooms as RoomData) ?? {});
    }
  }, [hotel.id, hotel.rooms]);

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
          lastSavedRoomsRef.current = updatedRooms;
          onPricingUpdate(hotel.id, updatedHotel);
        } catch {
          // Revert on failure
          setLocalRooms(lastSavedRoomsRef.current);
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [proposalId, hotel.id, hotel.currency, computeTotalPrice, onPricingUpdate]
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

  // Before first send: default to included (no checkboxes shown anyway)
  // After first send: default to NOT included — staff must explicitly check the client's chosen hotel
  const isIncluded = offerCount > 0
    ? hotel.includedInTotal === true
    : hotel.includedInTotal !== false;
  const canToggle = offerCount > 0 && !['declined', 'cancelled', 'completed'].includes(proposalStatus.toLowerCase());

  const includeTooltip = !canToggle
    ? t.offer.cannotChangeClosedOffer
    : isIncluded
      ? t.offer.excludeFromOfferHint
      : t.offer.includeInOfferHint;

  // Compose a human-readable location string from whatever address parts the
  // backend persisted. Returns null if nothing meaningful is available.
  const locationLine = (() => {
    const parts = [hotel.address, hotel.addressCity, hotel.addressCountry]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  })();

  return (
    <div className={`bg-sett-card rounded-[16px] border transition-opacity overflow-hidden ${isIncluded ? 'border-sett-border opacity-100' : 'border-sett-border/50 opacity-60'}`}>
      {/* Unified navy header: identity (left) + controls (right) */}
      <div className="bg-[#1B2B44] rounded-t-[16px] px-3 sm:px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Identity: hotel name + stars.
            If the persisted hotel has a SETTHub deep link, render the name as
            a HotelName link (matches the Add Hotel card behavior); otherwise
            fall back to a plain heading. `HotelName` uses brand-green by
            default — overridden here with white text + subtle hover bg so it
            reads on the navy header surface. */}
        <div className="flex items-center gap-2 min-w-0 flex-1 min-h-[28px]">
          {hotel.sethubDetailsUrl ? (
            <HotelName
              hotel={{ hotelName: hotel.hotelName || hotel.hotelCode, sethubDetailsUrl: hotel.sethubDetailsUrl }}
              className="!text-white hover:!text-white active:!text-white hover:!bg-white/10 active:!bg-white/15 !text-body !font-bold min-w-0"
            />
          ) : (
            <h4 className="text-body font-bold text-white truncate">
              {hotel.hotelName || hotel.hotelCode}
            </h4>
          )}
          <div
            className="flex gap-0.5 shrink-0"
            aria-label={`${hotel.starRating ?? 0} of 5 stars`}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = i < (hotel.starRating ?? 0);
              return (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${filled ? 'fill-sett-primary text-sett-primary' : 'text-white/25'}`}
                />
              );
            })}
          </div>
          {saving && (
            <span className="text-caption text-white/70 ml-1 animate-pulse shrink-0">
              {t.common.loading}
            </span>
          )}
        </div>

        {/* Controls cluster — pill, breakdown toggle, remove */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {/* Include in offer — pill toggle, only visible after first send */}
          {offerCount > 0 && (
            <button
              type="button"
              role="switch"
              aria-checked={isIncluded}
              aria-label={includeTooltip}
              title={includeTooltip}
              disabled={!canToggle}
              onClick={() => canToggle && onToggleIncluded(!isIncluded)}
              className={`
                inline-flex items-center gap-2 h-7 pl-1.5 pr-3 rounded-full
                font-montserrat text-[12px] font-semibold transition-all
                ${isIncluded
                  ? 'bg-sett-primary/20 text-white ring-1 ring-inset ring-sett-primary/40 hover:bg-sett-primary/30'
                  : 'bg-white/[0.06] text-white/60 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1] hover:text-white/80'
                }
                ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-sett-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B2B44]
              `}
            >
              <span
                className={`
                  relative inline-block w-4 h-4 rounded-full transition-colors
                  ${isIncluded ? 'bg-sett-primary' : 'bg-white/20'}
                `}
                aria-hidden
              >
                {isIncluded && (
                  <Check className="absolute inset-0 m-auto w-3 h-3 text-white stroke-[3]" />
                )}
              </span>
              <span>
                {isIncluded ? t.offer.includeInOffer : t.offer.excludedFromOffer}
              </span>
            </button>
          )}

          {/* Show breakdown — lightweight UI toggle */}
          <label
            className="inline-flex items-center gap-2 h-7 px-2 rounded-md cursor-pointer text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors select-none"
            title={t.offer.showBreakdown}
          >
            <input
              type="checkbox"
              checked={isSelectedForBreakdown}
              onChange={onToggleBreakdownSelection}
              className="w-3.5 h-3.5 accent-sett-primary rounded cursor-pointer"
            />
            <span className="font-montserrat text-[12px] font-medium">
              {t.offer.showBreakdown}
            </span>
          </label>

          {/* Remove — divider then icon button */}
          <span className="w-px h-5 bg-white/15 mx-0.5" aria-hidden />
          <button
            type="button"
            onClick={onRemove}
            aria-label={t.common.remove}
            title={t.common.remove}
            className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-caption text-white/70 hover:text-white hover:bg-white/10 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{t.common.remove}</span>
          </button>
        </div>
      </div>

      {/* Room table — desktop */}
      {roomEntries.length > 0 ? (
        <>
          {/* Location bar — sits above the table column headers (desktop)
              and above the first room card (mobile) */}
          {locationLine && (
            <div className="bg-[#F7F7F7] h-[33px] px-5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#767676] shrink-0" aria-hidden />
              <span className="font-montserrat text-[14px] font-normal leading-none text-[#767676] truncate">
                {locationLine}
              </span>
            </div>
          )}
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
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.sell} &euro;
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.qty}
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.nights}
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-4 py-2 font-medium">
                    {t.offer.amount} &euro;
                  </th>
                </tr>
              </thead>
              <tbody>
                {roomEntries.map(([type, detail]) => {
                  const net = Number(detail.net ?? 0);
                  const sell = Number(detail.sell ?? 0);
                  const qty = detail.qty ?? 1;
                  const nights = detail.nights ?? 1;
                  // Only compute markup when net is meaningful (≥ 0.10) to avoid huge % from near-zero net prices
                  const markup = net >= 0.10 ? ((sell - net) / net) * 100 : 0;
                  const total = sell * qty * nights;
                  return (
                    <tr key={type} className="border-b border-sett-border last:border-0">
                      <td className="px-4 py-2.5 text-body text-sett-text-primary">{getRoomLabel(type, detail, t.addHotel)}</td>
                      <td className="px-4 py-2.5 text-body text-sett-text-primary text-right">
                        {formatPriceEU(net)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <MarkupDropdown value={markup} onChange={(m) => handleMarkupChange(type, m)} />
                      </td>
                      <td className="px-4 py-2.5 text-left">
                        <input
                          type="text"
                          value={formatPriceEU(sell)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value.replace(/\./g, '').replace(/,/g, '.'));
                            if (!isNaN(val) && val >= net) handleSellChange(type, val);
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
                        {formatPriceEU(total)}
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
              const markup = net >= 0.10 ? ((sell - net) / net) * 100 : 0;
              const total = sell * qty * nights;
              return (
                <div key={type} className="p-3 space-y-2">
                  <p className="text-body font-medium text-sett-text-primary">{getRoomLabel(type, detail, t.addHotel)}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.net}</span>
                      <p className="text-sett-text-primary mt-0.5">{formatPriceEU(net)}</p>
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
                          type="text"
                          value={formatPriceEU(sell)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value.replace(/\./g, '').replace(/,/g, '.'));
                            if (!isNaN(val) && val >= net) handleSellChange(type, val);
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
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.amount}</span>
                      <p className="text-sett-primary font-semibold mt-0.5">{formatPriceEU(total)}</p>
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
            {formatCurrencyEU(hotel.totalPrice, hotel.currency)}
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

      {/* Hotel Breakdown — Total Sell */}
      <div className="px-4 py-3 border-t border-sett-border/50 bg-[#F9FAFB]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-sett-text-accent font-medium">{t.offer.totalSell}</span>
          <span className="text-sett-text-primary font-semibold">€{formatPriceEU(
            Object.values(hotel.rooms as Record<string, { net: number; sell: number; qty: number; nights: number }> || {}).reduce(
              (sum, detail) => sum + Number(detail.sell ?? 0) * (detail.qty ?? 1) * (detail.nights ?? 1),
              0
            )
          )}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Service Row ─────────────── */

function ServiceRow({
  service,
  onEdit,
  onDelete,
  onToggleIncluded,
  proposalStatus,
}: {
  service: ProposalService;
  onEdit: () => void;
  onDelete: () => void;
  onToggleIncluded: (included: boolean) => void;
  proposalStatus: string;
}) {
  const buy = Number(service.buyPrice ?? 0);
  const sell = Number(service.sellPrice ?? 0);
  const qty = service.quantity ?? 1;
  const markup = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
  const total = sell * qty;
  const isIncluded = service.includedInTotal !== false;
  const canToggle = ['draft'].includes(proposalStatus.toLowerCase());

  return (
    <tr className={`border-b border-sett-border last:border-0 transition-opacity ${isIncluded ? 'opacity-100' : 'opacity-50'}`}>
      <td className="px-4 py-2.5 text-body text-sett-text-primary">
        <div className="flex items-center gap-2">
          <label
            className={`flex items-center ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            title={canToggle ? (isIncluded ? 'Exclude from total' : 'Include in total') : 'Cannot change on sent/approved proposal'}
          >
            <input
              type="checkbox"
              checked={isIncluded}
              disabled={!canToggle}
              onChange={(e) => onToggleIncluded(e.target.checked)}
              className="w-4 h-4 accent-sett-primary rounded"
            />
          </label>
          <span>{service.serviceName ?? '—'}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary whitespace-nowrap">{formatDate(service.dateFrom)}</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary whitespace-nowrap">{formatDate(service.dateTo)}</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary whitespace-nowrap">{formatPriceEU(buy)}</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary whitespace-nowrap">{formatPercentageEU(markup, 0)}</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary whitespace-nowrap">{formatPriceEU(sell)}</td>
      <td className="px-4 py-2.5 text-body text-sett-text-primary whitespace-nowrap">{qty}</td>
      <td className={`px-4 py-2.5 text-body text-right font-semibold ${isIncluded ? 'text-sett-primary' : 'text-sett-text-accent line-through'}`}>
        {formatPriceEU(total)}
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
  onToggleIncluded,
  proposalStatus,
}: {
  service: ProposalService;
  onEdit: () => void;
  onDelete: () => void;
  onToggleIncluded: (included: boolean) => void;
  proposalStatus: string;
}) {
  const { t } = useLanguage();
  const buy = Number(service.buyPrice ?? 0);
  const sell = Number(service.sellPrice ?? 0);
  const qty = service.quantity ?? 1;
  const markup = buy > 0 ? ((sell - buy) / buy) * 100 : 0;
  const total = sell * qty;
  const isIncluded = service.includedInTotal !== false;
  const canToggle = ['draft'].includes(proposalStatus.toLowerCase());

  return (
    <div className={`p-3 space-y-2 transition-opacity ${isIncluded ? 'opacity-100' : 'opacity-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <label
            className={`flex items-center shrink-0 ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            title={canToggle ? (isIncluded ? 'Exclude from total' : 'Include in total') : 'Cannot change on sent/approved proposal'}
          >
            <input
              type="checkbox"
              checked={isIncluded}
              disabled={!canToggle}
              onChange={(e) => onToggleIncluded(e.target.checked)}
              className="w-4 h-4 accent-sett-primary rounded"
            />
          </label>
          <p className="text-body font-medium text-sett-text-primary truncate">{service.serviceName ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={onEdit} className="text-sett-text-accent hover:text-sett-primary transition-colors">
            <SquarePen className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDelete} className="text-sett-text-accent hover:text-sett-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        {service.dateFrom && (
          <div>
            <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.services.dateFrom}</span>
            <p className="text-sett-text-primary mt-0.5">{formatDate(service.dateFrom)}</p>
          </div>
        )}
        {service.dateTo && (
          <div>
            <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.services.dateTo}</span>
            <p className="text-sett-text-primary mt-0.5">{formatDate(service.dateTo)}</p>
          </div>
        )}
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.net}</span>
          <p className="text-sett-text-primary mt-0.5">{formatPriceEU(buy)}</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.markup}</span>
          <p className="text-sett-text-primary mt-0.5">{formatPercentageEU(markup, 0)}</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.sell}</span>
          <p className="text-sett-text-primary mt-0.5">{formatPriceEU(sell)}</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.qty}</span>
          <p className="text-sett-text-primary mt-0.5">{qty}</p>
        </div>
        <div>
          <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.offer.total}</span>
          <p className="text-sett-primary font-semibold mt-0.5">{formatPriceEU(total)}</p>
        </div>
      </div>
    </div>
  );
}
