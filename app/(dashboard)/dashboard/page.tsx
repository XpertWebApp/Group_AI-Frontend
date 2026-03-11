'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
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
    <div className="space-y-6">
      <Header title={t.dashboard.title} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const stat = stats?.[card.key];
          const value = stat?.value ?? 0;
          const change = stat?.vsLastMonth ?? 0;
          const trend = change >= 0 ? 'up' : 'down';

          return (
            <div
              key={card.key}
              className="bg-sett-card rounded-card shadow-card p-4 border border-sett-border relative"
            >
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-sett-light-green-bg flex items-center justify-center">
                <Image src={card.icon} alt="" width={16} height={16} />
              </div>
              <p className="text-label text-sett-text-secondary uppercase tracking-wide">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-sett-text-primary mt-1">
                {loading ? '—' : value}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Image
                  src={trend === 'up' ? '/icons/Icon (5).svg' : '/icons/Icon.svg'}
                  alt={trend === 'up' ? 'Trending up' : 'Trending down'}
                  width={14}
                  height={14}
                />
                <span
                  className={cn(
                    'text-caption font-medium',
                    trend === 'up' ? 'text-sett-trend-up' : 'text-sett-trend-down'
                  )}
                >
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
                <span className="text-caption text-sett-text-muted">{t.dashboard.vsLastMonth}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Offers Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-1 h-10 bg-sett-primary rounded-full mt-0.5" />
            <div>
              <h2 className="text-heading-sm font-bold text-sett-text-primary">
                {t.dashboard.recentOffers}
              </h2>
              <p className="text-body text-sett-text-secondary mt-0.5">
                {t.dashboard.recentOffersSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/booking-requests">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1.5" />
                {t.dashboard.viewAll}
              </Button>
            </Link>
            <Link href="/booking-requests/create">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                {t.dashboard.createRequest}
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-sett-card rounded-card shadow-card border border-sett-border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-sett-border bg-sett-background">
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.offerId}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.customer}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.destination}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.checkIn}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.rooms}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.totalSell}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.margin}</th>
                <th className="text-left text-label text-sett-text-accent uppercase tracking-wide px-4 py-3">{t.requests.status}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-body text-sett-text-accent">
                    {t.common.loading}
                  </td>
                </tr>
              )}
              {!loading && offers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-body text-sett-text-accent">
                    {t.dashboard.noRecentOffers}
                  </td>
                </tr>
              )}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
