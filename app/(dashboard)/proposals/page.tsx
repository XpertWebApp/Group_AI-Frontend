'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { proposalsApi } from '@/lib/api/proposals';
import type { Proposal } from '@/types';

export default function ProposalsListPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    proposalsApi.list().then((list) => {
      if (!cancelled) {
        setProposals(list);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Proposals" subtitle="View and manage your proposals" />
      <div className="bg-sett-card rounded-card shadow-card border border-sett-border overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-sett-border bg-sett-background">
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                ID
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                Request
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                Status
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                Total Sell
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                Created
              </th>
              <th className="text-left text-label text-sett-text-secondary uppercase tracking-wide px-4 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-body text-sett-text-secondary">
                  No proposals yet.
                </td>
              </tr>
            ) : (
              proposals.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-sett-border last:border-0 hover:bg-sett-background/50"
                >
                  <td className="px-4 py-3 text-body font-medium">#{p.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-body text-sett-text-secondary">
                    {p.requestId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusBadgeVariant(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-body">
                    {p.totalSell != null ? Number(p.totalSell).toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-3 text-body text-sett-text-secondary">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/proposals/${p.id}`}
                      className="text-body text-sett-primary font-medium hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
