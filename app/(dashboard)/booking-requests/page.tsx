'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { BookingRequestFilters } from '@/components/forms/BookingRequestFilters';
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

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await requestsApi.list({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
      setRequests(data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  /* client-side filtering */
  const filtered = useMemo(() => {
    let list = [...requests];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          customerName(r).toLowerCase().includes(q) ||
          (r.destinationName ?? '').toLowerCase().includes(q) ||
          String(r.referenceNumber ?? '').includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (dateRange) {
      list = list.filter((r) => matchesDateRange(r, dateRange));
    }

    return list;
  }, [requests, search, statusFilter, dateRange]);

  /* pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const start = (safeCurrentPage - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

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
    <div className="space-y-6">
      <Header title={t.requests.title} />

      {/* Card with filters + table */}
      <div className="bg-white rounded-[14px] border border-sett-border overflow-hidden">
        {/* Filter bar */}
        <div className="p-5">
          <BookingRequestFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-y border-sett-border">
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.offerId}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.customer}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.destination}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.checkInOut}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.rooms}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.totalSell}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.margin}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.status}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.createdOn}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.lastUpdated}</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading state */}
              {loading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center text-body text-sett-text-secondary"
                  >
                    {t.requests.loadingRequests}
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center text-body text-sett-text-secondary"
                  >
                    {t.requests.noRequests}
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading &&
                rows.map((row) => {
                  const rooms = totalRooms(row.rooms);
                  const { totalSell, margin } = getProposalTotals(row);

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-sett-border last:border-0 hover:bg-sett-fill/50 cursor-pointer transition-colors"
                    >
                      {/* Offer ID */}
                      <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                        <Link
                          href={`/booking-requests/${row.id}`}
                          className="hover:text-sett-primary"
                        >
                          #{row.referenceNumber ?? row.id.slice(0, 4)}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                        {customerName(row)}
                      </td>

                      {/* Destination */}
                      <td className="px-5 py-5 text-body text-sett-text-primary">
                        {row.destinationName ?? '—'}
                      </td>

                      {/* Check In / Out (stacked) */}
                      <td className="px-5 py-5 text-body text-sett-text-primary">
                        <span className="block">{formatDate(row.checkinDate)}</span>
                        <span className="block text-sett-text-secondary mt-0.5">
                          {formatDate(row.checkoutDate)}
                        </span>
                      </td>

                      {/* Rooms */}
                      <td className="px-5 py-5 text-body text-sett-text-primary">
                        {rooms ?? '—'}
                      </td>

                      {/* Total Sell */}
                      <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                        {totalSell != null ? `€${totalSell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>

                      {/* Margin */}
                      <td className="px-5 py-5 text-body font-medium text-sett-olive">
                        {margin != null ? `€${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-5">
                        <Badge variant={getStatusBadgeVariant(row.status)}>
                          {formatStatus(row.status)}
                        </Badge>
                      </td>

                      {/* Created On */}
                      <td className="px-5 py-5 text-body text-sett-text-secondary">
                        {formatDate(row.createdAt)}
                      </td>

                      {/* Last Updated */}
                      <td className="px-5 py-5 text-body text-sett-text-secondary">
                        {getLastUpdated(row)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-body text-sett-text-muted">
            {t.requests.showing} {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} {t.requests.of}{' '}
            {filtered.length} {t.requests.requestsLabel}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-2.5 h-8 rounded-lg text-body font-medium text-sett-text-accent disabled:opacity-40"
            >
              {t.requests.prev}
            </button>
            {renderPagination().map((p, i) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-sett-border bg-white text-body font-medium text-sett-text-secondary"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-body ${
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
              className="px-2.5 h-8 rounded-lg border border-sett-border bg-white text-body font-medium text-sett-text-secondary disabled:opacity-40 hover:bg-sett-background"
            >
              {t.requests.next}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
