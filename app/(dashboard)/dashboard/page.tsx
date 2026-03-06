'use client';

import { cn } from '@/lib/utils/cn';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Plus } from 'lucide-react';
import { mockDashboardStats, mockRecentOffers } from '@/lib/mock/data';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Header title="Dashboard" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockDashboardStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-sett-card rounded-card shadow-card p-4 border border-sett-border relative"
          >
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-sett-light-green-bg flex items-center justify-center">
              <Image
                src={stat.icon}
                alt=""
                width={16}
                height={16}
              />
            </div>
            <p className="text-label text-sett-text-secondary uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-sett-text-primary mt-1">
              {stat.value}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Image
                src={stat.trend === 'up' ? '/icons/Icon (5).svg' : '/icons/Icon.svg'}
                alt={stat.trend === 'up' ? 'Trending up' : 'Trending down'}
                width={14}
                height={14}
              />
              <span
                className={cn(
                  'text-caption font-medium',
                  stat.trend === 'up' ? 'text-sett-trend-up' : 'text-sett-trend-down'
                )}
              >
                {stat.change}
              </span>
              <span className="text-caption text-sett-text-muted">
                {stat.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Offers Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
            <div>
              <h2 className="text-heading-sm font-bold text-sett-text-primary">
                Recent Offers
              </h2>
              <p className="text-body text-sett-text-secondary mt-0.5">
                Latest group travel requests and offers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/booking-requests">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1.5" />
                View All
              </Button>
            </Link>
            <Link href="/booking-requests/create">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Request
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-sett-card rounded-card shadow-card border border-sett-border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-sett-border bg-sett-background">
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  OFFER ID
                </th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  CUSTOMER
                </th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  DESTINATION
                </th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  CHECK IN/OUT
                </th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  ROOMS
                </th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  TOTAL SELL
                </th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  MARGIN
                </th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">
                  STATUS
                </th>
              </tr>
            </thead>
            <tbody>
              {mockRecentOffers.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-sett-border last:border-0 hover:bg-sett-background/50"
                >
                  <td className="px-4 py-3 text-body text-sett-text-primary font-medium">
                    #{row.offerId}
                  </td>
                  <td className="px-4 py-3 text-body text-sett-text-primary">
                    {row.customer}
                  </td>
                  <td className="px-4 py-3 text-body text-sett-text-primary">
                    {row.destination}
                  </td>
                  <td className="px-4 py-3 text-body text-sett-text-secondary">
                    <div>{row.checkIn}</div>
                    <div>{row.checkOut}</div>
                  </td>
                  <td className="px-4 py-3 text-body text-sett-text-primary">
                    {row.rooms ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-body text-sett-text-primary">
                    {row.totalSell != null
                      ? `€${row.totalSell.toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-body font-medium text-sett-olive">
                    {row.margin != null
                      ? `€${row.margin.toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusBadgeVariant(row.status)}>
                      {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
