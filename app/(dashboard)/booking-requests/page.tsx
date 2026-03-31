'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { BookingRequestFilters } from '@/components/forms/BookingRequestFilters';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Loader';
import { requestsApi } from '@/lib/api/requests';
import type { BookingRequest, RoomsConfig } from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const PAGE_SIZE = 6;

/* ───── helpers ───── */

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // already formatted
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function effectiveStatus(r: BookingRequest): string {
  return r.proposals?.[0]?.status ?? r.status;
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

function matchesDateRange(r: BookingRequest, range: string): boolean {
  if (!range) return true;
  const now = new Date();
  const created = new Date(r.createdAt);
  if (isNaN(created.getTime())) return true;

  switch (range) {
    case 'this_month':
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      const cq = Math.floor(created.getMonth() / 3);
      return cq === q && created.getFullYear() === now.getFullYear();
    }
    case 'this_year':
      return created.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

/* ───── page ───── */

export default function BookingRequestsPage() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [page, setPage] = useState(1);
  const [serverPagination, setServerPagination] = useState<{
    total: number;
    totalPages: number;
  } | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const result = await requestsApi.list({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setRequests(result.requests);
      if (result.pagination) {
        setServerPagination({
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        });
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /* client-side filtering for dateRange only (not supported by backend) */
  const filtered = useMemo(() => {
    if (!dateRange) return requests;
    return requests.filter((r) => matchesDateRange(r, dateRange));
  }, [requests, dateRange]);

  /* pagination — prefer server pagination, fallback to client */
  const totalPages = serverPagination?.totalPages ?? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const totalItems = serverPagination?.total ?? filtered.length;
  const safeCurrentPage = Math.min(page, totalPages);
  const rows = serverPagination ? filtered : filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);
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
      {/* Card with filters + table */}
      <div className="bg-white rounded-[14px] border border-sett-border overflow-hidden">
        {/* Filter bar */}
        <div className="p-3 sm:p-5">
          <BookingRequestFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Loading skeleton */}
        {loading && (
          <>
            <div className="hidden lg:block border-t border-sett-border">
              <TableSkeleton rows={PAGE_SIZE} columns={10} />
            </div>
            <div className="lg:hidden border-t border-sett-border">
              <CardSkeleton cards={PAGE_SIZE} />
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-body text-sett-text-secondary border-t border-sett-border">
            {t.requests.noRequests}
          </div>
        )}

        {/* ── Desktop Table (lg and up) ── */}
        {!loading && rows.length > 0 && (
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-y border-sett-border">
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.offerId}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.customer}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.destination}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.checkInOut}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.rooms}</th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.totalSell}</th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.margin}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.status}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.createdOn}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.lastUpdated}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rooms = totalRooms(row.rooms);
                  const { totalSell, margin } = getProposalTotals(row);

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-sett-border last:border-0 hover:bg-sett-fill/50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                        <Link href={`/booking-requests/${row.id}`} className="hover:text-sett-primary">
                          #{row.referenceNumber ?? row.id.slice(0, 4)}
                        </Link>
                      </td>
                      <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                        {customerName(row)}
                      </td>
                      <td className="px-5 py-5 text-body text-sett-text-primary">
                        {row.destinationName ?? '—'}
                      </td>
                      <td className="px-5 py-5 text-body text-sett-text-primary">
                        <span className="block">{formatDate(row.checkinDate)}</span>
                        <span className="block text-sett-text-secondary mt-0.5">
                          {formatDate(row.checkoutDate)}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-body text-sett-text-primary">
                        {rooms ?? '—'}
                      </td>
                      <td className="px-5 py-5 text-body font-medium text-sett-text-primary text-right">
                        {totalSell != null ? `€${totalSell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-5 py-5 text-body font-medium text-sett-olive text-right">
                        {margin != null ? `€${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-5 py-5">
                        <Badge variant={getStatusBadgeVariant(effectiveStatus(row))}>
                          {formatStatus(effectiveStatus(row))}
                        </Badge>
                      </td>
                      <td className="px-5 py-5 text-body text-sett-text-secondary">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-5 py-5 text-body text-sett-text-secondary">
                        {getLastUpdated(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Mobile/Tablet Card View (below lg) ── */}
        {!loading && rows.length > 0 && (
          <div className="lg:hidden divide-y divide-sett-border border-t border-sett-border">
            {rows.map((row) => {
              const rooms = totalRooms(row.rooms);
              const { totalSell, margin } = getProposalTotals(row);

              return (
                <Link
                  key={row.id}
                  href={`/booking-requests/${row.id}`}
                  className="block p-4 hover:bg-sett-fill/50 transition-colors"
                >
                  {/* Top row: ID + Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-semibold text-sett-text-primary">
                      #{row.referenceNumber ?? row.id.slice(0, 4)}
                    </span>
                    <Badge variant={getStatusBadgeVariant(effectiveStatus(row))}>
                      {formatStatus(effectiveStatus(row))}
                    </Badge>
                  </div>

                  {/* Customer & Destination */}
                  <p className="text-body font-medium text-sett-text-primary truncate">
                    {customerName(row)}
                  </p>
                  <p className="text-sm text-sett-text-secondary truncate mt-0.5">
                    {row.destinationName ?? '—'}
                  </p>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.checkInOut}</span>
                      <p className="text-sett-text-primary mt-0.5">
                        {formatDate(row.checkinDate)} — {formatDate(row.checkoutDate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.rooms}</span>
                      <p className="text-sett-text-primary mt-0.5">{rooms ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.totalSell}</span>
                      <p className="text-sett-text-primary font-medium mt-0.5">
                        {totalSell != null ? `€${totalSell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.margin}</span>
                      <p className="text-sett-olive font-medium mt-0.5">
                        {margin != null ? `€${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.createdOn}</span>
                      <p className="text-sett-text-secondary mt-0.5">{formatDate(row.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.lastUpdated}</span>
                      <p className="text-sett-text-secondary mt-0.5">{getLastUpdated(row)}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-body text-sett-text-muted text-center sm:text-left">
            {t.requests.showing} {start + 1}-{Math.min(start + PAGE_SIZE, totalItems)} {t.requests.of}{' '}
            {totalItems} {t.requests.requestsLabel}
          </p>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-2 sm:px-2.5 h-8 rounded-lg text-sm sm:text-body font-medium text-sett-text-accent disabled:opacity-40"
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
                  className={`w-8 h-8 rounded-lg text-sm sm:text-body ${
                    p === safeCurrentPage
                      ? 'bg-sett-primary text-white font-bold'
                      : 'bg-white border border-sett-border text-sett-text-secondary font-medium hover:bg-sett-background'
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
              className="px-2 sm:px-2.5 h-8 rounded-lg border border-sett-border bg-white text-sm sm:text-body font-medium text-sett-text-secondary disabled:opacity-40 hover:bg-sett-background"
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
