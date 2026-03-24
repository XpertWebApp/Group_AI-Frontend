'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { StatCardSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Loader';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Plus } from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard';
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

  useEffect(() => {
    async function load() {
      try {
        const [statsData, offersData] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getRecentOffers(10),
        ]);
        if (statsData) setStats(statsData);
        setOffers(offersData);
      } catch {
        // fallback to empty
      } finally {
        setLoading(false);
      }
    }
    load();
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
