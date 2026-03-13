'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Star,
  Pencil,
  Building2,
  FileText,
  Phone,
  Mail,
  Users,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/Loader';
import { requestsApi } from '@/lib/api/requests';
import type { BookingRequest } from '@/types';
import type { RoomsConfig } from '@/types/requests';

/* M3/M4/M5 — disabled imports for milestone1_2
import { useMemo, useRef } from 'react';
import { Eye, Save, Trash2, SquarePen, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddServiceModal } from '@/components/forms/AddServiceModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ContractPreviewModal } from '@/components/ui/ContractPreviewModal';
import { HotelMap } from '@/components/ui/HotelMap';
import { proposalsApi } from '@/lib/api/proposals';
import type { Proposal, ProposalHotel, ProposalService } from '@/types';
*/

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
  const [loading, setLoading] = useState(true);

  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const req = await requestsApi.get(id);
      if (req) setRequest(req);
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

  if (loading) {
    return <PageLoader message="Loading offer details..." />;
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <Header title="Create Request" />
        <p className="text-body text-sett-text-secondary">Request not found.</p>
        <button
          type="button"
          onClick={() => router.push('/booking-requests')}
          className="px-4 py-2 rounded-lg border border-sett-border text-body text-sett-text-primary hover:bg-sett-fill transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  const breakfastLabel =
    request.breakfastPreference === 'BB'
      ? 'With Breakfast'
      : request.breakfastPreference === 'RO'
        ? 'Without Breakfast'
        : '—';
  const locationLabel =
    request.hotelLocation === 'central'
      ? 'Central Location'
      : request.hotelLocation === 'outside_city_center'
        ? 'Outside City Center'
        : '—';

  return (
    <div className="space-y-6 pb-8">
      <Header title="Create Request" />

      {/* ── Breadcrumb ── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => router.push('/booking-requests')}
          className="flex items-center gap-1 text-body text-sett-text-secondary hover:text-sett-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-sett-border hidden sm:inline">|</span>
        <span className="text-heading-sm font-bold text-sett-text-primary">
          Offer #{request.referenceNumber ?? id.slice(0, 4)}
        </span>
        <Badge variant={getStatusBadgeVariant(request.status)}>
          {(request.status)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </Badge>
      </div>

      {/* ════════════════════ REQUEST SUMMARY CARD ════════════════════ */}
      <div className="bg-sett-card rounded-card border border-sett-border p-4 sm:p-6">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-heading-sm font-bold text-sett-text-primary">
                  Request Summary
                </h2>
                <Pencil className="w-4 h-4 text-sett-text-accent cursor-pointer hover:text-sett-text-primary" />
              </div>
              <p className="text-body text-sett-text-accent mt-0.5">
                Booking details for this offer
              </p>
            </div>
          </div>
        </div>

        {/* Collapsible content */}
        {!summaryCollapsed && (
          <>
        {/* ── Trip Details ── */}
        <div className="mb-6 mt-6">
          <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">Trip Details</h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 text-body text-sett-text-secondary">
                <MapPin className="w-4 h-4 text-sett-text-accent shrink-0" />
                {request.destinationName || '—'}
              </div>
              <span className="text-sett-text-accent hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5 text-body text-sett-text-secondary">
                <Calendar className="w-4 h-4 text-sett-text-accent shrink-0" />
                {formatDate(request.checkinDate)} - {formatDate(request.checkoutDate)}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-label text-sett-text-accent uppercase tracking-wide">
                  Hotel Category
                </p>
                <div className="flex items-center gap-1 mt-0.5 justify-center">
                  <span className="text-body text-sett-text-secondary">
                    ({request.starRating}-Star)
                  </span>
                  {request.starRating && <StarRating rating={request.starRating} />}
                </div>
              </div>
              <div className="text-center">
                <p className="text-label text-sett-text-accent uppercase tracking-wide">
                  Budget Range
                </p>
                <p className="text-body text-sett-text-secondary mt-0.5">
                  {request.budgetRange || '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-label text-sett-text-accent uppercase tracking-wide">
                  Group Type
                </p>
                <p className="text-body text-sett-text-secondary mt-0.5 capitalize">
                  {request.groupType || '—'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-label text-sett-text-accent uppercase tracking-wide">Guests</p>
                <p className="text-body text-sett-text-secondary mt-0.5">
                  {request.groupSize ?? '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-sett-border mb-6" />

        {/* ── Room & Accommodations ── */}
        <div className="mb-6">
          <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">
            Room & Accommodations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
            {[
              { label: 'SINGLE', value: rooms?.single },
              { label: 'DOUBLE', value: rooms?.double },
              { label: 'TRIPLE', value: rooms?.triple },
              { label: 'QUADRUPLE', value: rooms?.quadruple },
            ].map((room) => (
              <div
                key={room.label}
                className="border border-sett-border rounded-card p-4 text-center"
              >
                <p className="text-heading-sm font-bold text-sett-text-primary">
                  {room.value || '—'}
                </p>
                <p className="text-label text-sett-text-accent uppercase tracking-wide mt-0.5">
                  {room.label}
                </p>
              </div>
            ))}
          </div>

          {rooms?.extraRoomsNote && (
            <div className="bg-[#EDF4FE] rounded-card px-4 py-3 mb-4">
              <span className="font-semibold text-body text-sett-text-primary">Extras: </span>
              <span className="text-body text-sett-text-secondary">{rooms.extraRoomsNote}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div className="border border-sett-border rounded-card p-3 sm:p-4 text-center">
              <p className="text-body font-semibold text-sett-text-primary">{breakfastLabel}</p>
              <p className="text-label text-sett-text-accent uppercase tracking-wide mt-0.5">
                Breakfast Preference
              </p>
            </div>
            <div className="border border-sett-border rounded-card p-3 sm:p-4 text-center">
              <p className="text-body font-semibold text-sett-text-primary">{locationLabel}</p>
              <p className="text-label text-sett-text-accent uppercase tracking-wide mt-0.5">
                Hotel Location
              </p>
            </div>
          </div>

          {request.specialRequirements && (
            <div className="bg-[#EDF4FE] rounded-card px-4 py-3">
              <span className="font-semibold text-body text-sett-text-primary">
                Special requirement:{' '}
              </span>
              <span className="text-body text-sett-text-secondary">
                {request.specialRequirements}
              </span>
            </div>
          )}
        </div>

        <hr className="border-sett-border mb-6" />

        {/* ── Customer Details ── */}
        <div className="mb-6">
          <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">
            Customer Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-sett-text-accent" />
                <span className="text-label text-sett-text-accent uppercase tracking-wide">
                  Company Name
                </span>
              </div>
              <p className="text-body text-sett-text-primary font-medium">
                {request.companyName || '—'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-sett-text-accent" />
                <span className="text-label text-sett-text-accent uppercase tracking-wide">
                  Guest List
                </span>
              </div>
              {request.guestListFileKey ? (
                <a href="#" className="text-body text-sett-primary hover:underline font-medium">
                  {request.guestListFileKey}
                </a>
              ) : (
                <p className="text-body text-sett-text-secondary">—</p>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-sett-text-accent" />
                <span className="text-label text-sett-text-accent uppercase tracking-wide">
                  Contact Person
                </span>
              </div>
              <p className="text-body text-sett-text-primary font-medium">
                {[request.firstName, request.lastName].filter(Boolean).join(' ') ||
                  request.contactName ||
                  '—'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-sett-text-accent" />
                <span className="text-label text-sett-text-accent uppercase tracking-wide">
                  Email Address
                </span>
              </div>
              <p className="text-body text-sett-text-primary">{request.contactEmail || '—'}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-sett-text-accent" />
                <span className="text-label text-sett-text-accent uppercase tracking-wide">
                  Phone Number
                </span>
              </div>
              <p className="text-body text-sett-text-primary">{request.contactPhone || '—'}</p>
            </div>
          </div>
          {request.customerNotes && (
            <div className="bg-[#EDF4FE] rounded-card px-4 py-3 mt-3">
              <span className="font-semibold text-body text-sett-text-primary">
                Special requirement:{' '}
              </span>
              <span className="text-body text-sett-text-secondary">{request.customerNotes}</span>
            </div>
          )}
        </div>

        <hr className="border-sett-border mb-6" />

        {/* ── Policies ── */}
        <div>
          <h3 className="text-heading-sm font-bold text-sett-text-primary mb-3">Policies</h3>
          {request.termsAndConditions && (
            <div className="bg-sett-fill rounded-card px-4 py-3 mb-3 border border-sett-border/50">
              <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">
                Terms & Conditions
              </p>
              <p className="text-body text-sett-text-secondary whitespace-pre-line">
                {request.termsAndConditions}
              </p>
            </div>
          )}
          {request.cancellationConditions && (
            <div className="bg-sett-fill rounded-card px-4 py-3 border border-sett-border/50">
              <p className="text-label text-sett-text-accent uppercase tracking-wide mb-2">
                Cancellation Conditions
              </p>
              <p className="text-body text-sett-text-secondary whitespace-pre-line">
                {request.cancellationConditions}
              </p>
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

      {/* M3/M4/M5 — Hotels, Services, Sidebar, and Modals sections disabled for milestone1_2 */}
    </div>
  );
}

// M3/M4/M5 — MarkupDropdown, HotelCard, ServiceRow, ServiceCard sub-components
// removed for milestone1_2. Preserved in git history (milestone_4v2 branch).
