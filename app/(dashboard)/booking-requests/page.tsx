'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { BookingRequestFilters } from '@/components/forms/BookingRequestFilters';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Loader';
// import { requestsApi } from '@/lib/api/requests'; // M4 — disabled for milestone1_2
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

  // M4 — requestsApi.list() disabled for milestone1_2, using dummy data
  const loadRequests = useCallback(async () => {
    const dummyRequests: BookingRequest[] = [
      {
        id: 'demo-001',
        referenceNumber: 1001,
        destinationId: 1,
        destinationName: 'Barcelona, Spain',
        checkinDate: '2026-04-15',
        checkoutDate: '2026-04-20',
        nights: 5,
        starRating: 4,
        rooms: { single: 5, double: 10, triple: 2, quadruple: 0 } as RoomsConfig,
        companyName: 'Acme Corp',
        firstName: 'John',
        lastName: 'Smith',
        contactEmail: 'john@acme.com',
        contactPhone: '+49 170 1234567',
        groupType: 'business',
        groupSize: 30,
        budgetRange: 'standard',
        breakfastPreference: 'BB',
        hotelLocation: 'central',
        status: 'pending',
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z',
        proposals: [],
      } as BookingRequest,
      {
        id: 'demo-002',
        referenceNumber: 1002,
        destinationId: 2,
        destinationName: 'Rome, Italy',
        checkinDate: '2026-05-10',
        checkoutDate: '2026-05-14',
        nights: 4,
        starRating: 5,
        rooms: { single: 2, double: 8, triple: 0, quadruple: 0 } as RoomsConfig,
        companyName: 'TravelGroup GmbH',
        firstName: 'Maria',
        lastName: 'Mueller',
        contactEmail: 'maria@travelgroup.de',
        contactPhone: '+49 160 9876543',
        groupType: 'leisure',
        groupSize: 20,
        budgetRange: 'premium',
        breakfastPreference: 'BB',
        hotelLocation: 'central',
        status: 'draft',
        createdAt: '2026-02-20T14:30:00Z',
        updatedAt: '2026-02-25T09:15:00Z',
        proposals: [],
      } as BookingRequest,
      {
        id: 'demo-003',
        referenceNumber: 1003,
        destinationId: 3,
        destinationName: 'Prague, Czech Republic',
        checkinDate: '2026-06-01',
        checkoutDate: '2026-06-05',
        nights: 4,
        starRating: 3,
        rooms: { single: 10, double: 5, triple: 3, quadruple: 1 } as RoomsConfig,
        companyName: 'SportTeam e.V.',
        firstName: 'Klaus',
        lastName: 'Weber',
        contactEmail: 'klaus@sportteam.de',
        contactPhone: '+49 151 5551234',
        groupType: 'sports',
        groupSize: 35,
        budgetRange: 'economy',
        breakfastPreference: 'RO',
        hotelLocation: 'outside_city_center',
        status: 'processing',
        createdAt: '2026-01-15T08:00:00Z',
        updatedAt: '2026-03-05T16:45:00Z',
        proposals: [],
      } as BookingRequest,
    ];
    setRequests(dummyRequests);
    setLoading(false);
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
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.totalSell}</th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-5 py-4 font-semibold">{t.requests.margin}</th>
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
                      <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                        {totalSell != null ? `€${totalSell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-5 py-5 text-body font-medium text-sett-olive">
                        {margin != null ? `€${margin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-5 py-5">
                        <Badge variant={getStatusBadgeVariant(row.status)}>
                          {formatStatus(row.status)}
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
                    <Badge variant={getStatusBadgeVariant(row.status)}>
                      {formatStatus(row.status)}
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
            {t.requests.showing} {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} {t.requests.of}{' '}
            {filtered.length} {t.requests.requestsLabel}
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
