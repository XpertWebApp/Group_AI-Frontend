'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { StatCardSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Loader';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Plus } from 'lucide-react';
// import { dashboardApi } from '@/lib/api/dashboard'; // M4 — disabled for milestone1_2
import type { DashboardStatsResponse, RecentOffer } from '@/lib/api/dashboard';
import { useLanguage } from '@/lib/i18n/LanguageContext';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [offers, setOffers] = useState<RecentOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const STAT_CARDS = [
    { key: 'totalRequests' as const, label: t.dashboard.totalRequests, icon: '/icons/Icon (4).svg' },
    { key: 'pendingRequests' as const, label: t.dashboard.pendingRequests, icon: '/icons/mingcute_ai-line.svg' },
    { key: 'sentOffers' as const, label: t.dashboard.sentOffers, icon: '/icons/Icon (6).svg' },
    { key: 'declined' as const, label: t.dashboard.declined, icon: '/icons/Icon (1).svg' },
  ];

  // M4 — dashboard API disabled for milestone1_2, using dummy data
  useEffect(() => {
    const dummyStats: DashboardStatsResponse = {
      totalRequests: { value: 24, vsLastMonth: 12.5 },
      pendingRequests: { value: 8, vsLastMonth: -3.2 },
      sentOffers: { value: 12, vsLastMonth: 8.7 },
      declined: { value: 4, vsLastMonth: -15.0 },
    };
    const dummyOffers: RecentOffer[] = [
      {
        id: 'demo-001',
        referenceNumber: 1001,
        offerId: '1001',
        customer: 'Acme Corp',
        destination: 'Barcelona, Spain',
        checkinDate: '2026-04-15',
        nights: 5,
        totalRooms: 17,
        groupSize: 30,
        totalSell: 15200,
        totalBuy: 12800,
        margin: 2400,
        marginPct: 15.8,
        status: 'pending',
        proposalId: '',
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-16T10:00:00Z',
      },
      {
        id: 'demo-002',
        referenceNumber: 1002,
        offerId: '1002',
        customer: 'TravelGroup GmbH',
        destination: 'Rome, Italy',
        checkinDate: '2026-05-10',
        nights: 4,
        totalRooms: 10,
        groupSize: 20,
        totalSell: 9800,
        totalBuy: 8200,
        margin: 1600,
        marginPct: 16.3,
        status: 'draft',
        proposalId: '',
        createdAt: '2026-02-20T14:30:00Z',
        updatedAt: '2026-03-10T14:30:00Z',
      },
      {
        id: 'demo-003',
        referenceNumber: 1003,
        offerId: '1003',
        customer: 'SportTeam e.V.',
        destination: 'Prague, Czech Republic',
        checkinDate: '2026-06-01',
        nights: 4,
        totalRooms: 19,
        groupSize: 35,
        totalSell: 8500,
        totalBuy: 7100,
        margin: 1400,
        marginPct: 16.5,
        status: 'processing',
        proposalId: '',
        createdAt: '2026-01-15T08:00:00Z',
        updatedAt: '2026-03-14T08:00:00Z',
      },
      {
        id: 'demo-004',
        referenceNumber: 1004,
        offerId: '1004',
        customer: 'EventPro Solutions',
        destination: 'Vienna, Austria',
        checkinDate: '2026-04-28',
        nights: 3,
        totalRooms: 25,
        groupSize: 50,
        totalSell: 22500,
        totalBuy: 18900,
        margin: 3600,
        marginPct: 16.0,
        status: 'completed',
        proposalId: '',
        createdAt: '2026-02-10T09:15:00Z',
        updatedAt: '2026-03-12T09:15:00Z',
      },
      {
        id: 'demo-005',
        referenceNumber: 1005,
        offerId: '1005',
        customer: 'Müller Conferences',
        destination: 'Budapest, Hungary',
        checkinDate: '2026-07-12',
        nights: 6,
        totalRooms: 14,
        groupSize: 28,
        totalSell: 11200,
        totalBuy: 9400,
        margin: 1800,
        marginPct: 16.1,
        status: 'pending',
        proposalId: '',
        createdAt: '2026-03-05T16:45:00Z',
        updatedAt: '2026-03-08T16:45:00Z',
      },
    ];
    setStats(dummyStats);
    setOffers(dummyOffers);
    setLoading(false);
  }, []);

  return (
    <>
      <Header title={t.dashboard.title} />

      <div className="p-4 md:p-6 space-y-6">
      {/* Stats Cards */}
      {loading ? (
        <StatCardSkeleton cards={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => {
            const stat = stats?.[card.key];
            const value = stat?.value ?? 0;
            const change = stat?.vsLastMonth ?? 0;
            const trend = change >= 0 ? 'up' : 'down';

            return (
              <div
                key={card.key}
                className="bg-white rounded-[14px] shadow-[0_1px_4px_0_rgba(0,0,0,0.08)] p-5 border border-[#D5E39B] relative"
              >
                <div className="absolute top-4 right-4 flex items-center gap-[10px] p-2 rounded-[10px] border border-[#D5E39B] bg-[#F7FAEB]">
                  <Image src={card.icon} alt="" width={16} height={16} />
                </div>
                <p className="font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#4A4A4A]">
                  {card.label}
                </p>
                <p className="font-montserrat text-[32px] font-bold leading-normal text-[#1D1D1D] uppercase mt-1">
                  {value}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Image
                    src={trend === 'up' ? '/icons/Icon (5).svg' : '/icons/Icon.svg'}
                    alt={trend === 'up' ? 'Trending up' : 'Trending down'}
                    width={14}
                    height={14}
                  />
                  <span
                    className="font-montserrat text-[12px] font-bold leading-normal text-[#377F00]"
                  >
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                  <span className="font-montserrat text-[12px] font-medium leading-normal text-[#A3A3A3]">{t.dashboard.vsLastMonth}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Offers Section */}
      <section>
        <div className="bg-white rounded-[14px] shadow-[0_1px_4px_0_rgba(0,0,0,0.08)] border border-[#E6EAF0] overflow-hidden">
          <div className="flex justify-between items-start p-5 border-b border-[#E6EAF0]">
            <div className="flex items-start gap-3">
              <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
              <div>
                <h2 className="font-montserrat text-[18px] font-semibold leading-normal text-[#1D1D1D]">
                  {t.dashboard.recentOffers}
                </h2>
                <p className="font-montserrat text-[14px] font-normal leading-normal text-[#4A4A4A] mt-0.5">
                  {t.dashboard.recentOffersSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/booking-requests">
                <Button variant="outline" size="sm" className="!rounded-[14px] !border-[#AAC737] !bg-white !text-[#AAC737] font-montserrat !text-[16px] !font-semibold leading-normal !px-4 !py-3 gap-1">
                  <Eye className="w-4 h-4" />
                  {t.dashboard.viewAll}
                </Button>
              </Link>
              <Link href="/booking-requests/create">
                <Button variant="primary" size="sm" className="!rounded-[14px] font-montserrat !text-[16px] !font-semibold leading-normal !text-white !px-4 !py-3 gap-1 !bg-[#AAC737] !shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)]">
                  <Plus className="w-4 h-4" />
                  {t.dashboard.createRequest}
                </Button>
              </Link>
            </div>
          </div>
          {/* Loading skeleton */}
          {loading && (
            <>
              <div className="hidden md:block">
                <TableSkeleton rows={5} columns={8} />
              </div>
              <div className="md:hidden">
                <CardSkeleton cards={4} />
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && offers.length === 0 && (
            <div className="px-4 py-8 text-center text-body text-sett-text-accent">
              {t.dashboard.noRecentOffers}
            </div>
          )}

          {/* Desktop table */}
          {!loading && offers.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="h-[57px] border-t border-b border-[#E6EAF0]">
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.offerId}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.customer}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.destination}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.checkInOut}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.rooms}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.totalSell}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.margin}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.status}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.createdOn}</th>
                    <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-[#A3A3A3] px-4 py-3">{t.requests.lastUpdated}</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-sett-border last:border-0 hover:bg-sett-background/50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-body text-sett-text-primary font-medium">
                        <Link href={`/booking-requests/${row.id}`} className="hover:text-sett-primary">
                          #{row.offerId ?? row.referenceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-body text-sett-text-primary">
                        {row.customer}
                      </td>
                      <td className="px-4 py-3 text-body text-sett-text-primary">
                        {row.destination}
                      </td>
                      <td className="px-4 py-3 text-body text-sett-text-secondary">
                        {formatDate(row.checkinDate)}
                      </td>
                      <td className="px-4 py-3 text-body text-sett-text-primary">
                        {row.totalRooms ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-body text-sett-text-primary">
                        {row.totalSell != null && row.totalSell > 0
                          ? `\u20AC${row.totalSell.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-body font-medium text-sett-olive">
                        {row.margin != null && row.margin > 0
                          ? `\u20AC${row.margin.toLocaleString()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(row.status)}>
                          {row.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-body text-sett-text-secondary whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-body text-sett-text-secondary whitespace-nowrap">
                        {formatDate(row.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile card view */}
          {!loading && offers.length > 0 && (
            <div className="md:hidden divide-y divide-sett-border">
              {offers.map((row) => (
                <Link
                  key={row.id}
                  href={`/booking-requests/${row.id}`}
                  className="block p-4 hover:bg-sett-background/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-semibold text-sett-text-primary">
                      #{row.offerId ?? row.referenceNumber}
                    </span>
                    <Badge variant={getStatusBadgeVariant(row.status)}>
                      {row.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  </div>
                  <p className="text-body font-medium text-sett-text-primary truncate">{row.customer}</p>
                  <p className="text-sm text-sett-text-secondary truncate mt-0.5">{row.destination}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.checkIn}</span>
                      <p className="text-sett-text-secondary mt-0.5">{formatDate(row.checkinDate)}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.rooms}</span>
                      <p className="text-sett-text-primary mt-0.5">{row.totalRooms ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.totalSell}</span>
                      <p className="text-sett-text-primary font-medium mt-0.5">
                        {row.totalSell != null && row.totalSell > 0 ? `\u20AC${row.totalSell.toLocaleString()}` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.margin}</span>
                      <p className="text-sett-olive font-medium mt-0.5">
                        {row.margin != null && row.margin > 0 ? `\u20AC${row.margin.toLocaleString()}` : '—'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      </div>
    </>
  );
}
