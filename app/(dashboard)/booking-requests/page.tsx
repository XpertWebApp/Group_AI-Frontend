'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
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

  return (
    <div className="space-y-6">
      <Header
        title="Group Requests"
        actions={
          <Link href="/booking-requests/create">
            <Button variant="primary">+ Create Request</Button>
          </Link>
        }
      />
      <BookingRequestFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      <div className="bg-sett-card rounded-card shadow-card border border-sett-border overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-sett-border bg-sett-background">
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                OFFER ID
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                CUSTOMER
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                DESTINATION
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                CHECK IN/OUT
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                ROOMS
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                TOTAL SELL
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                MARGIN
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                STATUS
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-sett-border last:border-0 hover:bg-sett-background/50"
              >
                <td className="px-4 py-3 text-body text-sett-text-primary">
                  #{row.offerId}
                </td>
                <td className="px-4 py-3 text-body text-sett-text-primary">
                  {row.customer ?? '—'}
                </td>
                <td className="px-4 py-3 text-body text-sett-text-primary">
                  {row.destination ?? '—'}
                </td>
                <td className="px-4 py-3 text-body text-sett-text-secondary">
                  <span className="block">{row.checkIn}</span>
                  <span className="block">{row.checkOut}</span>
                </td>
                <td className="px-4 py-3 text-body text-sett-text-primary">
                  {row.rooms ?? '—'}
                </td>
                <td className="px-4 py-3 text-body text-sett-text-primary">
                  {row.totalSell != null ? `€${row.totalSell.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 text-body text-sett-primary font-medium">
                  {row.margin != null ? `€${row.margin.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusBadgeVariant(row.status)}>
                    {String(row.status).charAt(0).toUpperCase() + String(row.status).slice(1)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/booking-requests/${row.id}`}
                      className="text-body text-sett-primary font-medium hover:underline"
                    >
                      View
                    </Link>
                    <span className="text-sett-text-muted">|</span>
                    <Link
                      href={`/proposals?requestId=${row.id}`}
                      className="text-body text-sett-primary font-medium hover:underline"
                    >
                      Create Proposal
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-body text-sett-text-secondary">
          Showing {start + 1}-{Math.min(start + PAGE_SIZE, filtered.length)} of{' '}
          {filtered.length} requests
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-input border border-sett-border bg-white text-body disabled:opacity-50 hover:bg-sett-background"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-input text-body font-medium ${
                p === page
                  ? 'bg-sett-primary text-white'
                  : 'bg-white border border-sett-border hover:bg-sett-background'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-input border border-sett-border bg-white text-body disabled:opacity-50 hover:bg-sett-background"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
