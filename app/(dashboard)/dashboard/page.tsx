'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { formatDateEU } from '@/lib/dateFormatter';
import toast from 'react-hot-toast';

function formatDate(dateStr: string | null | undefined): string {
  return formatDateEU(dateStr);
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

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
    };
    return map[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [offers, setOffers] = useState<RecentOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const STAT_CARDS = [
    { key: 'totalRequests' as const, label: t.dashboard.totalRequests, icon: '/icons/Icon (4).svg' },
    { key: 'pending' as const, label: t.dashboard.pendingRequests, icon: '/icons/mingcute_ai-line.svg' },
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

  useEffect(() => {
    const googleParam = searchParams.get('google');
    if (!googleParam) return;
    if (googleParam === 'connected') {
      toast.success(t.dashboard.googleConnect.successToast);
    } else if (googleParam === 'denied') {
      toast.error(t.dashboard.googleConnect.deniedToast);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('google');
    window.history.replaceState({}, '', url.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      <Header title={t.dashboard.title} />

      <div className="p-4 md:p-6 space-y-6">

        {/* Stats Cards */}
        {loading ? (
          <StatCardSkeleton cards={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS.map((card) => {
              const raw = stats?.[card.key] ?? (card.key === 'pending' ? stats?.pendingRequests : undefined);
              // Handle both flat number and nested { value, vsLastMonth } formats
              const value = typeof raw === 'object' && raw !== null && 'value' in raw
                ? (raw as { value: number }).value
                : (typeof raw === 'number' ? raw : 0);

              return (
                <div
                  key={card.key}
                  className="bg-white rounded-[14px] shadow-[0_1px_4px_0_rgba(0,0,0,0.08)] p-5 border border-sett-primary/40 relative"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-[10px] p-2 rounded-[10px] border border-sett-primary/40 bg-sett-light-green-bg">
                    <Image src={card.icon} alt="" width={16} height={16} />
                  </div>
                  <p className="font-montserrat text-[14px] font-semibold leading-normal uppercase text-sett-text-secondary pr-10 break-words min-h-[2.625rem]">
                    {card.label}
                  </p>
                  <p className="font-montserrat text-[32px] font-bold leading-normal text-sett-text-primary uppercase mt-1">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Offers Section */}
        <section>
          <div className="bg-white rounded-[14px] shadow-[0_1px_4px_0_rgba(0,0,0,0.08)] border border-sett-border-light overflow-hidden">
            <div className="flex flex-col gap-3 p-5 border-b border-sett-border-light sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
                <div>
                  <h2 className="font-montserrat text-[18px] font-semibold leading-normal text-sett-text-primary">
                    {t.dashboard.recentOffers}
                  </h2>
                  <p className="font-montserrat text-[14px] font-normal leading-normal text-sett-text-secondary mt-0.5">
                    {t.dashboard.recentOffersSubtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link href="/booking-requests" className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" fullWidth>
                    <Eye className="w-4 h-4" />
                    {t.dashboard.viewAll}
                  </Button>
                </Link>
                <Link href="/booking-requests/create" className="flex-1 sm:flex-none">
                  <Button variant="primary" size="sm" fullWidth>
                    <Plus className="w-4 h-4" />
                    {t.dashboard.createRequest}
                  </Button>
                </Link>
              </div>
            </div>
            {/* Loading skeleton */}
            {loading && (
              <>
                <div className="hidden xl:block">
                  <TableSkeleton rows={5} columns={8} />
                </div>
                <div className="xl:hidden">
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
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="h-[57px] border-t border-b border-sett-border-light">
                      <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-sett-text-accent px-4 py-3">{t.requests.offerId}</th>
                      <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-sett-text-accent px-4 py-3">{t.requests.customer}</th>
                      <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-sett-text-accent px-4 py-3">{t.requests.destination}</th>
                      <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-sett-text-accent px-4 py-3">{t.requests.checkInOut}</th>
                      <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-sett-text-accent px-4 py-3">{t.requests.status}</th>
                      <th className="text-left font-montserrat text-[14px] font-semibold leading-normal uppercase text-sett-text-accent px-4 py-3">{t.requests.createdOn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => router.push(`/booking-requests/${row.requestId ?? row.id}`)}
                        className="border-b border-sett-border last:border-0 hover:bg-sett-background/50 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-body text-sett-text-primary font-medium">
                          <Link href={`/booking-requests/${row.requestId ?? row.id}`} className="hover:text-sett-primary">
                            #{row.referenceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-body text-sett-text-primary">
                          {row.customer || row.companyName || row.contactName || '—'}
                        </td>
                        <td className="px-4 py-3 text-body text-sett-text-primary">
                          {row.destination || row.destinationName || '—'}
                        </td>
                        <td className="px-4 py-3 text-body text-sett-text-secondary">
                          {formatDate(row.checkinDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-body text-sett-text-secondary whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile/Tablet card view */}
            {!loading && offers.length > 0 && (
              <div className="xl:hidden p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {offers.map((row) => (
                  <Link
                    key={row.id}
                    href={`/booking-requests/${row.requestId ?? row.id}`}
                    className="block p-4 rounded-[14px] border border-sett-border-light hover:bg-sett-background/50 hover:border-sett-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-body font-semibold text-sett-text-primary">
                        #{row.referenceNumber}
                      </span>
                      <Badge variant={getStatusBadgeVariant(row.status)}>
                        {statusLabel(row.status)}
                      </Badge>
                    </div>
                    <p className="text-body font-medium text-sett-text-primary truncate">{row.customer || row.companyName || row.contactName || '—'}</p>
                    <p className="text-sm text-sett-text-secondary truncate mt-0.5">{row.destination || row.destinationName || '—'}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm">
                      <div>
                        <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.checkIn}</span>
                        <p className="text-sett-text-secondary mt-0.5">{formatDate(row.checkinDate)}</p>
                      </div>
                      <div>
                        <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">{t.requests.createdOn}</span>
                        <p className="text-sett-text-secondary mt-0.5">{formatDate(row.createdAt)}</p>
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
