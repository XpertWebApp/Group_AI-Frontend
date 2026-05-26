'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { StatCardSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Loader';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Eye, Plus } from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard';
import type { DashboardStatsResponse, RecentOffer } from '@/lib/api/dashboard';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateEU } from '@/lib/dateFormatter';
import { useRefreshOnNotification } from '@/lib/notifications/useRefreshOnNotification';

function formatDate(dateStr: string | null | undefined): string {
  return formatDateEU(dateStr);
}

export default function DashboardPage() {
  const router = useRouter();
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
      needs_manual_handling: t.requests.needsManualHandling,
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

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // When `silent` is true (background refresh triggered by a notification),
      // suppress the global error-toast for these calls too — the user didn't
      // explicitly ask for the refresh, so a transient failure shouldn't pop
      // a banner. The initial page load still surfaces errors normally.
      const [statsData, offersData] = await Promise.all([
        dashboardApi.getStats({ silent }),
        dashboardApi.getRecentOffers(10, { silent }),
      ]);
      if (statsData) setStats(statsData);
      setOffers(offersData);
    } catch {
      // fallback to empty
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  useRefreshOnNotification(
    () => loadDashboard(true),
    { match: /booking|request|proposal|offer/i },
  );

  return (
    <>
      <Header title={t.dashboard.title} />

      <div className="p-4 md:p-6 space-y-6">

        {/* Stats Cards */}
        {loading ? (
          <StatCardSkeleton cards={4} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS.map((card, index) => {
              const raw = stats?.[card.key] ?? (card.key === 'pending' ? stats?.pendingRequests : undefined);
              // Handle both flat number and nested { value, vsLastMonth } formats
              const value = typeof raw === 'object' && raw !== null && 'value' in raw
                ? (raw as { value: number }).value
                : (typeof raw === 'number' ? raw : 0);
              const trend = typeof raw === 'object' && raw !== null && 'vsLastMonth' in raw
                ? (raw as { vsLastMonth: number }).vsLastMonth
                : null;

              // Sequential per-card reveal — each card waits until the
              // previous one has finished its main entrance (card rise +
              // label + badge ≈ 350ms) before starting. The number count-up
              // continues in the background after the next card has already
              // begun, so the cascade still feels lively rather than slow.
              //
              // Per-card timing:
              //   - card rise:        0
              //   - label fade:    +160ms
              //   - badge pop:     +200ms
              //   - number count:  +280ms (runs 900ms internally)
              //   - trend fade:    +480ms
              //
              // Stride between cards: 360ms — long enough that each card
              // visibly lands before the next one starts; short enough that
              // the full sequence completes in ~1.5s for 4 cards.
              const cardDelay = index * 360;
              const labelDelay = cardDelay + 160;
              const badgeDelay = cardDelay + 200;
              const valueAnimDelay = cardDelay + 280;
              const trendDelay = cardDelay + 480;

              const trendPositive = trend != null && trend > 0;

              return (
                <div
                  key={card.key}
                  className="group relative bg-white rounded-[14px] shadow-card p-5 border border-sett-border animate-card-rise-in transition-all duration-280 ease-sett-out hover:-translate-y-0.5 hover:shadow-[0_4px_16px_0_rgba(7,28,66,0.10)]"
                  style={{ animationDelay: `${cardDelay}ms` }}
                >
                  {/* §5.3 optional green left-border accent */}
                  <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-sett-primary" />

                  <div
                    className="absolute top-4 right-4 flex items-center gap-[10px] p-2 rounded-[10px] border border-sett-primary/40 bg-sett-light-green-bg animate-badge-pop-in transition-transform duration-280 ease-sett-spring group-hover:scale-110 group-hover:rotate-3"
                    style={{ animationDelay: `${badgeDelay}ms` }}
                  >
                    <Image src={card.icon} alt="" width={16} height={16} />
                  </div>
                  {/* §7.3 Label — fades up shortly after the card lands. */}
                  <p
                    className="font-montserrat text-[13px] font-normal leading-normal uppercase tracking-[0.08em] text-sett-text-secondary pr-10 break-words min-h-[2.625rem] animate-label-fade-up"
                    style={{ animationDelay: `${labelDelay}ms` }}
                  >
                    {card.label}
                  </p>
                  {/* §7.3 Big number — fades in via animate-value-count-in
                      AND counts up to the real value via AnimatedNumber.
                      The wrapper animates opacity/translateY at valueAnimDelay,
                      then AnimatedNumber begins the count-up internally at
                      the same delay so the two land in sync. */}
                  <p
                    className="font-montserrat text-[32px] font-extrabold leading-tight text-sett-text-primary mt-1 animate-value-count-in tabular-nums"
                    style={{ animationDelay: `${valueAnimDelay}ms` }}
                  >
                    <AnimatedNumber value={value} delay={valueAnimDelay} duration={900} />
                  </p>
                  {/* §7.3 Trend — appears after the number has been counting
                      up for a beat, so user's eye lands on the big value
                      first and the supporting trend second. */}
                  {trend != null && trend !== 0 && (
                    <p
                      className={`mt-1 inline-flex items-center gap-1 font-montserrat text-[12px] font-semibold tabular-nums animate-trend-fade-in ${
                        trendPositive ? 'text-sett-primary' : 'text-sett-destructive'
                      }`}
                      style={{ animationDelay: `${trendDelay}ms` }}
                    >
                      {trendPositive ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                      {trendPositive ? '+' : '-'}
                      <AnimatedNumber value={Math.abs(trend)} delay={trendDelay} duration={900} decimals={Number.isInteger(trend) ? 0 : 1} />
                      % {t.dashboard.vsLastMonth}
                    </p>
                  )}
                  {trend === 0 && (
                    <p
                      className="mt-1 font-montserrat text-[12px] font-medium text-sett-text-accent animate-trend-fade-in"
                      style={{ animationDelay: `${trendDelay}ms` }}
                    >
                      0% {t.dashboard.vsLastMonth}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Offers Section.
            Deferred until all four stat cards have finished their cascade
            (which completes around 2260ms — see cardDelay calc above).
            Starts at 2400ms for a small breathing pause, then its own
            internal cascade begins from this base. */}
        <section>
          <div
            className="bg-white rounded-[14px] shadow-[0_1px_4px_0_rgba(0,0,0,0.08)] border border-sett-border-light overflow-hidden animate-card-rise-in"
            style={{ animationDelay: '2400ms' }}
          >
            {/* Header bar — texts inside cascade individually:
                  - Title at 2580ms
                  - Subtitle at 2680ms
                  - Action buttons at 2760ms
                The outer wrapper no longer animates as a block (removed
                animate-sidebar-fade-up) so the child cascade is the only
                motion — avoids the title sliding in twice. */}
            <div className="flex flex-col gap-3 p-5 border-b border-sett-border-light sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
                <div>
                  <h2
                    className="font-montserrat text-[22px] font-extrabold leading-tight text-sett-text-primary animate-label-fade-up"
                    style={{ animationDelay: '2580ms' }}
                  >
                    {t.dashboard.recentOffers}
                  </h2>
                  <p
                    className="font-montserrat text-[14px] font-normal leading-normal text-sett-text-secondary mt-0.5 animate-label-fade-up"
                    style={{ animationDelay: '2680ms' }}
                  >
                    {t.dashboard.recentOffersSubtitle}
                  </p>
                </div>
              </div>
              {/* Outer cluster fades up at 2760ms, then each button
                  jelly-pops in sequence: View All at 2820ms, Create Request
                  at 2920ms. The 100ms stride is short enough they feel like
                  a single playful "two-pop" gesture rather than two
                  unrelated animations. */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link href="/booking-requests" className="flex-1 sm:flex-none animate-jelly-pop" style={{ animationDelay: '2820ms' }}>
                  <Button variant="outline" size="sm" fullWidth>
                    <Eye className="w-4 h-4" />
                    {t.dashboard.viewAll}
                  </Button>
                </Link>
                <Link href="/booking-requests/create" className="flex-1 sm:flex-none animate-jelly-pop" style={{ animationDelay: '2920ms' }}>
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
              <div
                className="px-4 py-8 text-center text-body text-sett-text-accent animate-sidebar-fade-up"
                style={{ animationDelay: '2900ms' }}
              >
                {t.dashboard.noRecentOffers}
              </div>
            )}

            {/* Desktop table */}
            {!loading && offers.length > 0 && (
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    {/* §5.2 Header row: Navy background, white text, Montserrat 600–700.
                        Each column label fades up individually L→R starting
                        at 2820ms with a 60ms stride, so the header reveals
                        as a wave before the rows begin streaming in. */}
                    <tr className="h-[48px] bg-sett-navy">
                      <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-4 py-3">
                        <span className="inline-block animate-label-fade-up" style={{ animationDelay: '2820ms' }}>{t.requests.offerId}</span>
                      </th>
                      <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-4 py-3">
                        <span className="inline-block animate-label-fade-up" style={{ animationDelay: '2880ms' }}>{t.requests.customer}</span>
                      </th>
                      <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-4 py-3">
                        <span className="inline-block animate-label-fade-up" style={{ animationDelay: '2940ms' }}>{t.requests.destination}</span>
                      </th>
                      <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-4 py-3">
                        <span className="inline-block animate-label-fade-up" style={{ animationDelay: '3000ms' }}>{t.requests.checkInOut}</span>
                      </th>
                      <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-4 py-3">
                        <span className="inline-block animate-label-fade-up" style={{ animationDelay: '3060ms' }}>{t.requests.status}</span>
                      </th>
                      <th className="text-left font-montserrat text-[13px] font-semibold leading-normal uppercase tracking-wide text-white px-4 py-3">
                        <span className="inline-block animate-label-fade-up" style={{ animationDelay: '3120ms' }}>{t.requests.createdOn}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((row, i) => (
                      <tr
                        key={row.id}
                        onClick={() => router.push(`/booking-requests/${row.requestId ?? row.id}`)}
                        className={`group border-b border-sett-border-light last:border-0 cursor-pointer transition-colors duration-180 ease-sett-out hover:bg-sett-light-green-bg/60 active:bg-sett-light-green-bg animate-sidebar-item-in ${
                          // §5.2 Alternating row: #F8F9FA
                          i % 2 === 1 ? 'bg-sett-table-alt-row' : 'bg-white'
                        }`}
                        style={{ animationDelay: `${3200 + Math.min(i, 6) * 60}ms` }}
                      >
                        <td className="relative px-4 py-3 text-body text-sett-text-primary font-medium">
                          {/* Left accent bar — slides in on row hover */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-sett-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-280 ease-sett-out"
                          />
                          <Link
                            href={`/booking-requests/${row.requestId ?? row.id}`}
                            className="inline-flex items-center gap-1 transition-all duration-180 ease-sett-out group-hover:text-sett-primary group-hover:translate-x-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                {offers.map((row, i) => (
                  <Link
                    key={row.id}
                    href={`/booking-requests/${row.requestId ?? row.id}`}
                    className="group block p-4 rounded-[14px] border border-sett-border-light hover:bg-sett-light-green-bg/40 hover:border-sett-primary/40 transition-all duration-280 ease-sett-out hover:-translate-y-0.5 hover:shadow-[0_4px_16px_0_rgba(7,28,66,0.08)] active:scale-[0.985] active:translate-y-0 active:shadow-none active:duration-100 animate-card-rise-in"
                    style={{ animationDelay: `${3200 + Math.min(i, 6) * 60}ms` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-body font-semibold text-sett-text-primary transition-colors duration-180 ease-sett-out group-hover:text-sett-primary">
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
