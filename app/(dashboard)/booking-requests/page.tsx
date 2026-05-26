'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { BookingRequestFilters } from '@/components/forms/BookingRequestFilters';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Loader';
import { requestsApi } from '@/lib/api/requests';
import { getCurrentUserId } from '@/lib/auth/getCurrentUser';
import { formatDateEU } from '@/lib/dateFormatter';
import type { BookingRequest, RoomsConfig } from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getGroupTypeLabel, groupTypeRequiresAge } from '@/lib/utils/groupType';
import { useRefreshOnNotification } from '@/lib/notifications/useRefreshOnNotification';

const PAGE_SIZE = 6;

/* ───── helpers ───── */

function formatDate(iso: string | null | undefined): string {
  return formatDateEU(iso);
}

function totalRooms(rooms: RoomsConfig | null | undefined): number | null {
  if (!rooms) return null;
  const sum =
    (rooms.single ?? 0) +
    (rooms.double ?? 0) +
    (rooms.twin ?? 0) +
    (rooms.triple ?? 0) +
    (rooms.quadruple ?? 0) +
    (rooms.suites ?? 0);
  return sum > 0 ? sum : null;
}

function customerName(r: BookingRequest): string {
  if (r.companyName) return r.companyName;
  const parts = [r.firstName, r.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (r.contactName) return r.contactName;
  return '—';
}



function getProposalTotals(r: BookingRequest): { totalSell: number | null; margin: number | null } {
  const p = r.proposals?.[0];
  if (!p) return { totalSell: null, margin: null };
  const sell = p.totalSell != null ? Number(p.totalSell) : null;
  const buy = p.totalBuy != null ? Number(p.totalBuy) : null;
  if (sell == null || isNaN(sell)) return { totalSell: null, margin: null };
  const margin = buy != null && !isNaN(buy) ? sell - buy : null;
  return { totalSell: sell, margin };
}

function getLastUpdated(r: BookingRequest): string {
  const p = r.proposals?.[0];
  // Use sentAt if proposal was sent, otherwise updatedAt, otherwise createdAt
  const date = p?.sentAt || r.updatedAt || r.createdAt;
  return formatDate(date);
}

/**
 * Convert the date-range dropdown value into a `createdAt` window for the
 * backend. Returns ISO timestamps inclusive of the period boundaries; empty
 * for the "all time" value so the request stays unfiltered.
 *
 * Pushing this to the backend (rather than filtering in memory) is what lets
 * the totals/pagination reflect the active filter.
 */
function dateRangeToWindow(range: string): { createdFrom?: string; createdTo?: string } {
  if (!range) return {};
  // Use the user's *local* year/month to figure out which calendar period they
  // mean, then construct the window in UTC so the ISO strings we send don't
  // get shifted by the timezone offset on the way out (e.g. IST users picking
  // "This Month" in May used to send a window that started on April 30 UTC).
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (range) {
    case 'this_month': {
      const from = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
      const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      return { createdFrom: from.toISOString(), createdTo: to.toISOString() };
    }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3;
      const from = new Date(Date.UTC(y, qStart, 1, 0, 0, 0, 0));
      const to = new Date(Date.UTC(y, qStart + 3, 0, 23, 59, 59, 999));
      return { createdFrom: from.toISOString(), createdTo: to.toISOString() };
    }
    case 'this_year': {
      const from = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      const to = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      return { createdFrom: from.toISOString(), createdTo: to.toISOString() };
    }
    default:
      return {};
  }
}

/* ───── page ───── */

export default function BookingRequestsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      pending: t.requests.pending,
      draft: t.requests.draft,
      sent: t.requests.sent,
      declined: t.requests.declined,
      processing: t.requests.processing,
      ai_generated: t.requests.aiGenerated,
      completed: t.requests.completed,
      cancelled: t.requests.cancelled,
      approved: t.requests.approved,
      needs_manual_handling: t.requests.needsManualHandling,
    };
    return map[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [page, setPage] = useState(1);
  const [serverPagination, setServerPagination] = useState<{
    total: number;
    totalPages: number;
  } | null>(null);
  const [claimingRequestId, setClaimingRequestId] = useState<string | null>(null);
  const [currentUserId] = useState(() => getCurrentUserId());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Silent auto-refresh (triggered by a notification) opts out of the
      // global error toast — a background failure shouldn't pop a banner at
      // the user since they didn't initiate the call. Foreground loads still
      // surface errors normally.
      // The toolbar's "This Month / Quarter / Year" filter is meant to filter
      // by when the request was CREATED (createdAt), not by the trip's
      // check-in date. `createdFrom`/`createdTo` are the explicit backend
      // params; the legacy `dateFrom`/`dateTo` remain a check-in filter.
      const { createdFrom, createdTo } = dateRangeToWindow(dateRange);
      const result = await requestsApi.list(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          createdFrom,
          createdTo,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
        { silent },
      );
      setRequests(result.requests);
      if (result.pagination) {
        setServerPagination({
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        });
      } else {
        // Some non-paginated payload shape — reset so the UI falls back to
        // the client-side count of the returned rows instead of stale totals.
        setServerPagination(null);
      }
    } catch {
      // keep empty
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, statusFilter, dateRange]);

  // Auto-refresh when a notification arrives that relates to a booking request
  // or proposal/offer (a new offer == a new request from this list's POV).
  useRefreshOnNotification(
    () => loadRequests(true),
    { match: /booking|request|proposal|offer/i },
  );

  const handleClaimRequest = useCallback(async (requestId: string) => {
    setClaimingRequestId(requestId);
    try {
      const response = await requestsApi.claim(requestId);
      // Optimistically update the row
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, assignedUser: response.owner } : r
        )
      );
      toast.success('Request claimed successfully');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { data?: { owner?: unknown } } } };
      if (error.response?.status === 409) {
        // Someone else claimed it
        const owner = (error.response.data?.data as { owner?: { firstName?: string; lastName?: string } } | undefined)?.owner;
        const ownerName = owner && (owner.firstName || owner.lastName)
          ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
          : 'another user';
        toast.success(`Already owned by ${ownerName}`);
        // Update the row with the owner who claimed it
        if (owner) {
          setRequests((prev) =>
            prev.map((r) =>
              r.id === requestId ? { ...r, assignedUser: owner as never } : r
            )
          );
        }
      } else {
        toast.error('Failed to claim request');
      }
    } finally {
      setClaimingRequestId(null);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadRequests();
      toast.success('Requests updated');
    } catch {
      toast.error('Failed to refresh requests');
    } finally {
      setIsRefreshing(false);
    }
  }, [loadRequests]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /* Pagination — every filter (search, status, dateRange) is pushed to the
     backend, so server pagination is the source of truth. The client-side
     fallback is for when the API returns a non-paginated payload. */
  const totalPages = serverPagination?.totalPages ?? Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const totalItems = serverPagination?.total ?? requests.length;
  const safeCurrentPage = Math.min(page, totalPages);
  const rows = serverPagination
    ? requests
    : requests.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
  const start = (safeCurrentPage - 1) * PAGE_SIZE;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateRange]);

  const renderPagination = () => {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i <= 3 || i === totalPages || Math.abs(i - safeCurrentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <>
      <Header title={t.requests.title} />

      <div className="p-4 md:p-6 space-y-6">
        {/* Card with filters + table.
            `overflow-hidden` clips the inner list/table's corners against the
            wrapper's 14px radius — without it the last row's bottom corners
            poked past the rounded border and read as a faded/uneven edge. */}
        <div className="bg-white rounded-[14px] border border-sett-border animate-card-rise-in overflow-hidden">
          {/* Toolbar — sequential reveal, one control at a time:
                200ms  Search bar
                480ms  All Time dropdown
                760ms  All Status dropdown
                1040ms Refresh button (jelly-pop)
                1320ms Create Request button (jelly-pop)
              280ms stride between controls is wide enough that each lands
              visibly before the next starts — feels deliberate rather than
              "everything at once". */}
          <div className="relative z-10 p-3 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <div className="flex-1 min-w-0">
              <BookingRequestFilters
                search={search}
                onSearchChange={setSearch}
                status={statusFilter}
                onStatusChange={setStatusFilter}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                searchAnimationDelay={200}
                dateAnimationDelay={480}
                statusAnimationDelay={760}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 lg:ml-auto">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                className="shrink-0 inline-flex items-center justify-center gap-2 h-[41px] px-3 sm:px-4 rounded-lg border border-sett-border bg-white text-body font-medium text-sett-text-primary hover:bg-sett-fill hover:border-sett-primary/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 animate-jelly-pop"
                style={{ animationDelay: '1040ms' }}
                title={t.requests.refresh || 'Refresh requests'}
              >
                <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t.requests.refresh || 'Refresh'}</span>
              </button>
              <Link href="/booking-requests/create" className="shrink-0 animate-jelly-pop" style={{ animationDelay: '1320ms' }}>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 h-[41px] px-4 rounded-lg bg-sett-primary text-sett-navy hover:bg-sett-green-dark hover:text-white font-montserrat text-[13px] font-bold uppercase tracking-[0.04em] shadow-[0_2px_8px_0_rgba(170,199,55,0.25)] transition-all duration-200 active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.nav.createRequest}</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <>
              <div className="hidden xl:block border-t border-sett-border overflow-hidden">
                <TableSkeleton rows={PAGE_SIZE} columns={10} />
              </div>
              <div className="xl:hidden border-t border-sett-border overflow-hidden">
                <CardSkeleton cards={PAGE_SIZE} />
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && requests.length === 0 && (
            <div
              className="px-5 py-12 text-center text-body text-sett-text-secondary border-t border-sett-border animate-sidebar-fade-up"
              style={{ animationDelay: '2100ms' }}
            >
              {t.requests.noRequests}
            </div>
          )}

          {/* ── Desktop Table (xl and up) ── */}
          {!loading && rows.length > 0 && (
            <div className="hidden xl:block overflow-x-auto overflow-hidden">
              <table className="w-full min-w-[950px] 2xl:min-w-[1100px]">
                <thead>
                  {/* §5.2 Header row: Navy background, white text, Montserrat 600–700.
                      Each column label fades up individually L→R starting at
                      600ms with a 50ms stride — same pattern as the
                      Dashboard's Recent Offers table. */}
                  <tr className="bg-sett-navy">
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2100ms' }}>{t.requests.offerId}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2150ms' }}>{t.requests.customer}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2200ms' }}>{t.requests.destination}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2250ms' }}>{t.requests.checkInOut}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2300ms' }}>{t.requests.rooms}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2350ms' }}>{t.requests.group}</span></th>
                    <th className="text-right font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2400ms' }}>{t.requests.totalSell}</span></th>
                    <th className="text-right font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2450ms' }}>{t.requests.margin}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2500ms' }}>{t.requests.owner}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2550ms' }}>{t.requests.status}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2600ms' }}>{t.requests.createdOn}</span></th>
                    <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-3 2xl:px-5 py-3"><span className="inline-block animate-label-fade-up" style={{ animationDelay: '2650ms' }}>{t.requests.lastUpdated}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const rooms = totalRooms(row.rooms);
                    const { totalSell, margin } = getProposalTotals(row);

                    return (
                      <tr
                        key={row.id}
                        className={`group border-b border-sett-border-light last:border-0 cursor-pointer transition-colors duration-180 ease-sett-out hover:bg-sett-light-green-bg/60 active:bg-sett-light-green-bg animate-sidebar-item-in ${
                          // §5.2 Alternating row: #F8F9FA
                          i % 2 === 1 ? 'bg-sett-table-alt-row' : 'bg-white'
                        }`}
                        style={{ animationDelay: `${2700 + Math.min(i, 6) * 60}ms` }}
                        onClick={() => router.push(`/booking-requests/${row.id}`)}
                      >
                        <td className="relative px-3 2xl:px-5 py-4 text-body font-medium text-sett-text-primary">
                          {/* Left accent bar — slides in on row hover */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-sett-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-280 ease-sett-out"
                          />
                          <Link
                            href={`/booking-requests/${row.id}`}
                            className="inline-flex items-center gap-1 transition-all duration-180 ease-sett-out group-hover:text-sett-primary group-hover:translate-x-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{row.referenceNumber ?? row.id.slice(0, 4)}
                          </Link>
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body font-medium text-sett-text-primary">
                          {customerName(row)}
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body text-sett-text-primary">
                          {row.destinationName ?? '—'}
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body text-sett-text-primary">
                          <span className="block">{formatDate(row.checkinDate)}</span>
                          <span className="block text-sett-text-secondary mt-0.5">
                            {formatDate(row.checkoutDate)}
                          </span>
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body text-sett-text-primary">
                          {rooms ?? '—'}
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body text-sett-text-primary">
                          <span className="block">{getGroupTypeLabel(row.groupType, t)}</span>
                          {groupTypeRequiresAge(row.groupType) && row.averageAge != null && (
                            <span className="block text-sett-text-accent text-[12px] font-medium mt-0.5">
                              {t.offer.averageAge}: {row.averageAge}
                            </span>
                          )}
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body font-medium text-sett-text-primary text-right">
                          {totalSell != null ? `€${totalSell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body font-semibold text-sett-primary text-right">
                          {margin != null ? `€${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body text-sett-text-primary">
                          {row.assignedUser ? (
                            <span className={row.assignedUser.id === currentUserId ? 'font-semibold text-sett-primary' : ''}>
                              {row.assignedUser.id === currentUserId
                                ? t.requests.you
                                : row.assignedUser.firstName && row.assignedUser.lastName
                                  ? `${row.assignedUser.firstName} ${row.assignedUser.lastName}`
                                  : row.assignedUser.email}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClaimRequest(row.id);
                              }}
                              disabled={claimingRequestId === row.id}
                              className="inline-flex items-center px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-sett-navy bg-sett-primary rounded-button hover:bg-sett-green-dark hover:text-white active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
                            >
                              {claimingRequestId === row.id ? (
                                <>
                                  <span className="inline-block w-3 h-3 mr-1.5 border-2 border-transparent border-t-sett-navy rounded-full animate-spin" />
                                  {t.requests.claim}
                                </>
                              ) : (
                                t.requests.claim
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-3 2xl:px-5 py-4">
                          <Badge variant={getStatusBadgeVariant(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body text-sett-text-secondary">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-3 2xl:px-5 py-4 text-body text-sett-text-secondary">
                          {getLastUpdated(row)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Mobile/Tablet Card View (below xl) ──
              Compact, three-column metric grid keeps the card short even with
              long content. Secondary fields (Last Updated, Owner) are folded
              into a small footer line so they don't bloat each row's height. */}
          {!loading && rows.length > 0 && (
            <div className="xl:hidden divide-y divide-sett-border border-t border-sett-border overflow-hidden">
              {rows.map((row, i) => {
                const rooms = totalRooms(row.rooms);
                const { totalSell, margin } = getProposalTotals(row);
                const ownerLabel = row.assignedUser
                  ? row.assignedUser.id === currentUserId
                    ? t.requests.you
                    : (row.assignedUser.firstName && row.assignedUser.lastName
                        ? `${row.assignedUser.firstName} ${row.assignedUser.lastName}`
                        : row.assignedUser.email)
                  : null;

                return (
                  <Link
                    key={row.id}
                    href={`/booking-requests/${row.id}`}
                    className="group relative block px-4 py-3 transition-colors duration-180 ease-sett-out hover:bg-sett-light-green-bg/60 active:bg-sett-light-green-bg animate-sidebar-item-in"
                    style={{ animationDelay: `${2700 + Math.min(i, 6) * 60}ms` }}
                  >
                    {/* Left accent bar — slides in on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-sett-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-280 ease-sett-out"
                    />

                    {/* Top row: ID + customer + destination on the left, status badge on the right */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-body font-semibold text-sett-text-primary transition-all duration-180 ease-sett-out group-hover:text-sett-primary group-hover:translate-x-0.5">
                            #{row.referenceNumber ?? row.id.slice(0, 4)}
                          </span>
                          <span className="text-sett-text-accent">·</span>
                          <span className="text-body font-medium text-sett-text-primary truncate">
                            {customerName(row)}
                          </span>
                        </div>
                        <p className="text-sm text-sett-text-secondary truncate mt-0.5">
                          {row.destinationName ?? '—'}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(row.status)}>
                        {statusLabel(row.status)}
                      </Badge>
                    </div>

                    {/* Primary metrics: 3 columns at sm+, 2 at xs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 text-sm mt-2">
                      <div className="min-w-0">
                        <span className="text-sett-text-accent uppercase tracking-wide text-[10px] font-semibold leading-none">{t.requests.checkInOut}</span>
                        <p className="text-sett-text-primary text-[12px] mt-0.5 truncate">
                          {formatDate(row.checkinDate)} — {formatDate(row.checkoutDate)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sett-text-accent uppercase tracking-wide text-[10px] font-semibold leading-none">{t.requests.rooms}</span>
                        <p className="text-sett-text-primary text-[12px] mt-0.5">{rooms ?? '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sett-text-accent uppercase tracking-wide text-[10px] font-semibold leading-none">{t.requests.totalSell}</span>
                        <p className="text-sett-text-primary font-medium text-[12px] mt-0.5 truncate">
                          {totalSell != null ? `€${totalSell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-sett-text-accent uppercase tracking-wide text-[10px] font-semibold leading-none">{t.requests.margin}</span>
                        <p className="text-sett-primary font-semibold text-[12px] mt-0.5 truncate">
                          {margin != null ? `€${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Footer line: group · owner · created/updated dates. Small
                        secondary metadata so it doesn't add visual weight. */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-sett-text-secondary">
                      <span>
                        <span className="text-sett-text-accent uppercase tracking-wide font-semibold mr-1">{t.requests.group}:</span>
                        {getGroupTypeLabel(row.groupType, t)}
                        {groupTypeRequiresAge(row.groupType) && row.averageAge != null && (
                          <span className="text-sett-text-accent"> ({t.offer.averageAge}: {row.averageAge})</span>
                        )}
                      </span>
                      {ownerLabel && (
                        <span>
                          <span className="text-sett-text-accent uppercase tracking-wide font-semibold mr-1">{t.requests.owner}:</span>
                          <span className={row.assignedUser?.id === currentUserId ? 'font-semibold text-sett-primary' : ''}>
                            {ownerLabel}
                          </span>
                        </span>
                      )}
                      <span className="ml-auto">
                        {formatDate(row.createdAt)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalItems > 0 && (
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 animate-sidebar-fade-up"
            style={{ animationDelay: '3200ms' }}
          >
            <p className="text-sm sm:text-body text-sett-text-muted text-center sm:text-left">
              {t.requests.showing} {start + 1}-{Math.min(start + PAGE_SIZE, totalItems)} {t.requests.of}{' '}
              {totalItems} {t.requests.requestsLabel}
            </p>
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="px-2 sm:px-2.5 h-8 rounded-lg text-sm sm:text-body font-medium text-sett-text-accent transition-all duration-180 ease-sett-out hover:text-sett-primary active:scale-95 disabled:opacity-40 disabled:hover:text-sett-text-accent"
              >
                {t.requests.prev}
              </button>
              {renderPagination().map((p, i) =>
                p === '...' ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-sett-border bg-white text-sm sm:text-body font-medium text-sett-text-secondary"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-lg text-sm sm:text-body transition-all duration-180 ease-sett-out active:scale-90 ${p === safeCurrentPage
                      ? 'bg-sett-primary text-sett-navy font-bold shadow-[0_2px_6px_0_rgba(170,199,55,0.35)]'
                      : 'bg-white border border-sett-border text-sett-text-secondary font-medium hover:bg-sett-light-green-bg/40 hover:border-sett-primary/40 hover:text-sett-primary'
                      }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="px-2 sm:px-2.5 h-8 rounded-lg border border-sett-border bg-white text-sm sm:text-body font-medium text-sett-text-secondary transition-all duration-180 ease-sett-out hover:bg-sett-light-green-bg/40 hover:border-sett-primary/40 hover:text-sett-primary active:scale-95 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-sett-text-secondary"
              >
                {t.requests.next}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
