'use client';

import { cn } from '@/lib/utils/cn';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { mockDashboardStats, mockRecentOffers } from '@/lib/mock/data';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Header title="Dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockDashboardStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-sett-card rounded-card shadow-card p-4 border border-sett-border"
          >
            <p className="text-label text-sett-text-secondary uppercase tracking-wide">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-sett-text-primary mt-1">{stat.value}</p>
            <p
              className={cn(
                'text-caption mt-0.5 flex items-center gap-1',
                stat.trend === 'up' ? 'text-sett-success' : 'text-sett-destructive'
              )}
            >
              {stat.trend === 'up' ? (
                <span className="inline-block">↑</span>
              ) : (
                <span className="inline-block">↓</span>
              )}
              {stat.change}
            </p>
          </div>
        ))}
      </div>
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-heading-sm font-bold text-sett-text-primary">
              Recent Offers
            </h2>
            <p className="text-body text-sett-text-secondary mt-0.5">
              Latest 10 offers you have created/received
            </p>
          </div>
          <Link href="/booking-requests/create">
            <Button variant="primary">Create Proposal</Button>
          </Link>
        </div>
        <div className="bg-sett-card rounded-card shadow-card border border-sett-border overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-sett-border bg-sett-background">
                <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                  SR. NO.
                </th>
                <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                  PROPOSAL ID
                </th>
                <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                  DESTINATION
                </th>
                <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                  CREATED ON
                </th>
                <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                  STATUS
                </th>
                <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {mockRecentOffers.map((row, i) => (
                <tr
                  key={row.id}
                  className="border-b border-sett-border last:border-0 hover:bg-sett-background/50"
                >
                  <td className="px-4 py-3 text-body text-sett-text-primary">{i + 1}</td>
                  <td className="px-4 py-3 text-body text-sett-text-primary">{row.proposalId}</td>
                  <td className="px-4 py-3 text-body text-sett-text-primary">
                    {row.destination}
                  </td>
                  <td className="px-4 py-3 text-body text-sett-text-secondary">
                    {row.createdOn}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded-badge text-caption font-medium',
                        row.status === 'Pending' && 'bg-amber-100 text-amber-800',
                        row.status === 'Accepted' && 'bg-green-100 text-green-800',
                        row.status === 'Declined' && 'bg-red-100 text-red-800'
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/proposals/${row.id}`}
                      className="text-body text-sett-primary font-medium hover:underline"
                    >
                      VIEW PROPOSAL
                    </Link>
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
