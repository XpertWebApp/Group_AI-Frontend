'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { BookingRequestFilters } from '@/components/forms/BookingRequestFilters';
import { mockBookingRequests } from '@/lib/mock/data';

const PAGE_SIZE = 6;

export default function BookingRequestsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...mockBookingRequests];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.customer?.toLowerCase().includes(q) ||
          r.destination?.toLowerCase().includes(q) ||
          r.offerId?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);

  const renderPagination = () => {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i <= 3 || i === totalPages || Math.abs(i - page) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <Header title="Group Requests" />

      <div className="bg-white rounded-[14px] border border-sett-border overflow-hidden">
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-y border-sett-border">
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Offer ID
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Customer
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Destination
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Check In/OUT
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Rooms
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Total Sell
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Margin
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Status
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Created ON
                </th>
                <th className="text-left text-body text-sett-text-accent uppercase tracking-wide px-5 py-5 font-semibold">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-sett-border last:border-0 hover:bg-sett-fill/50 cursor-pointer ${
                    idx === 0 ? 'bg-sett-fill' : ''
                  }`}
                >
                  <td className="px-5 py-5 text-body font-medium text-sett-text-primary uppercase">
                    <Link href={`/booking-requests/${row.id}`}>
                      #{row.offerId}
                    </Link>
                  </td>
                  <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                    {row.customer ?? '—'}
                  </td>
                  <td className="px-5 py-5 text-body text-sett-text-primary">
                    {row.destination ?? '—'}
                  </td>
                  <td className="px-5 py-5 text-body text-sett-text-primary">
                    <span className="block">{row.checkIn}</span>
                    <span className="block mt-1.5">{row.checkOut}</span>
                  </td>
                  <td className="px-5 py-5 text-body text-sett-text-primary">
                    {row.rooms ?? '—'}
                  </td>
                  <td className="px-5 py-5 text-body font-medium text-sett-text-primary">
                    {row.totalSell != null ? `€${row.totalSell.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-5 text-body font-medium text-sett-primary-dark">
                    {row.margin != null ? `€${row.margin.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-5 py-5">
                    <Badge variant={getStatusBadgeVariant(row.status)}>
                      {String(row.status).charAt(0).toUpperCase() + String(row.status).slice(1)}
                    </Badge>
                  </td>
                  <td className="px-5 py-5 text-body text-sett-text-primary">
                    {row.createdOn ?? '—'}
                  </td>
                  <td className="px-5 py-5 text-body text-sett-text-primary">
                    {row.lastUpdated ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-body text-sett-text-muted">
          Showing {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of{' '}
          {filtered.length} requests
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-1 h-8 rounded-lg text-body font-semibold text-sett-text-accent disabled:opacity-50"
          >
            Prev
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
                  p === page
                    ? 'bg-sett-primary text-white font-extrabold'
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
            disabled={page >= totalPages}
            className="px-2.5 h-8 rounded-lg border border-sett-border bg-white text-body font-medium text-sett-text-secondary disabled:opacity-50 hover:bg-sett-background"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
