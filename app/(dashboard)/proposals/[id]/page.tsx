'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { AddHotelModal } from '@/components/forms/AddHotelModal';
import { AddServiceModal } from '@/components/forms/AddServiceModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { proposalsApi } from '@/lib/api/proposals';
import { OdooLinkRequiredModal } from '@/components/ui/OdooLinkRequiredModal';
import { SendOfferDualPreviewModal, type SendOfferResult } from '@/components/ui/SendOfferDualPreviewModal';
import { useDefaultMarkup } from '@/hooks/useDefaultMarkup';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateEU } from '@/lib/dateFormatter';
import type { Proposal, ProposalHotel, ProposalService } from '@/types';

export default function ProposalPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [markupPercent, setMarkupPercent] = useState(0);
  // Whether the current markup value came from the proposal's own override
  // (proposal.markupSettings.percent). When false, the slider is "tracking"
  // the live Settings default — we keep it in sync until the user touches
  // the slider, after which it locks to whatever they picked.
  const [hasMarkupOverride, setHasMarkupOverride] = useState(false);
  const { markup: defaultMarkup } = useDefaultMarkup();
  const [addHotelOpen, setAddHotelOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ type: 'hotel' | 'service'; id: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Odoo gate (§2.3) — opened reactively when the BE returns 400 ODOO_CONTACT_REQUIRED.
  // This page doesn't have direct access to the request, so we rely on the
  // BE-supplied message verbatim and route staff back to the booking-request
  // detail to link a company.
  const [odooGateOpen, setOdooGateOpen] = useState(false);
  const [odooGateMessage, setOdooGateMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await proposalsApi.get(id);
        if (!cancelled && data) {
          setProposal(data);
          const pct = (data.markupSettings as { percent?: number })?.percent;
          if (typeof pct === 'number') {
            setMarkupPercent(pct);
            setHasMarkupOverride(true);
          }
        }
      } catch {
        if (!cancelled) setProposal(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // Seed the slider from Settings → General once the default arrives, but
  // only if the proposal didn't already carry its own markup override.
  // Stops tracking the moment the user moves the slider.
  useEffect(() => {
    if (hasMarkupOverride) return;
    if (defaultMarkup == null) return;
    setMarkupPercent(defaultMarkup);
  }, [defaultMarkup, hasMarkupOverride]);

  const totals = useMemo(() => {
    if (!proposal) return { hotelSubtotal: 0, serviceSubtotal: 0, totalBuy: 0, totalSell: 0 };
    const hotels = proposal.hotels ?? [];
    const services = proposal.services ?? [];
    const hotelSubtotal = hotels.reduce((s, h) => s + Number(h.totalPrice ?? 0), 0);
    const serviceSubtotal = services.reduce(
      (s, sv) => s + (Number(sv.sellPrice ?? 0) * (sv.quantity ?? 1)),
      0
    );
    const totalBuy = hotelSubtotal + services.reduce((s, sv) => s + (Number(sv.buyPrice ?? 0) * (sv.quantity ?? 1)), 0);
    const totalSell = hotelSubtotal + serviceSubtotal;
    const withMarkup = totalBuy * (1 + markupPercent / 100);
    return {
      hotelSubtotal,
      serviceSubtotal,
      totalBuy,
      totalSell: totalSell || withMarkup,
    };
  }, [proposal, markupPercent]);

  const handleAddHotel = async (payload: Parameters<typeof proposalsApi.addHotel>[1]) => {
    setActionLoading(true);
    try {
      const added = await proposalsApi.addHotel(id, payload);
      setProposal((p) =>
        p ? { ...p, hotels: [...(p.hotels ?? []), added] } : null
      );
      setAddHotelOpen(false);
      toast.success(t.toasts.hotelAdded);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddService = async (payload: Parameters<typeof proposalsApi.addService>[1]) => {
    setActionLoading(true);
    try {
      const { service } = await proposalsApi.addService(id, payload);
      setProposal((p) =>
        p ? { ...p, services: [...(p.services ?? []), service] } : null
      );
      setAddServiceOpen(false);
      toast.success(t.toasts.serviceAdded);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveHotel = async (hotelId: string) => {
    setActionLoading(true);
    try {
      await proposalsApi.removeHotel(id, hotelId);
      setProposal((p) =>
        p ? { ...p, hotels: (p.hotels ?? []).filter((h) => h.id !== hotelId) } : null
      );
      setRemoveTarget(null);
      toast.success(t.toasts.hotelRemoved);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveService = (serviceId: string) => {
    setProposal((p) =>
      p ? { ...p, services: (p.services ?? []).filter((s) => s.id !== serviceId) } : null
    );
    setRemoveTarget(null);
  };

  const handleSaveDraft = async () => {
    setActionLoading(true);
    try {
      const updated = await proposalsApi.saveDraft(id);
      setProposal(updated);
      toast.success(t.toasts.draftSaved);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLock = async () => {
    setActionLoading(true);
    try {
      const updated = await proposalsApi.lock(id);
      setProposal(updated);
      toast.success(t.toasts.proposalLocked);
    } catch (err: unknown) {
      const axios = await import('axios');
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const owner = (err.response?.data as { error?: { owner?: string } })?.error?.owner;
        toast.error(owner ? t.toasts.proposalLockedByAnother : t.toasts.proposalLockedGeneric);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Post-send: refresh local proposal from the BE response and surface the
  // language-explicit toast. All error handling lives inside the dual-preview
  // modal — staff can fix recipients and retry without re-opening anything.
  const handleAfterSend = (result: SendOfferResult) => {
    const payload = result.data as { proposal?: Proposal } | null;
    if (payload?.proposal) setProposal(payload.proposal);
    setSendOpen(false);
    const recipientsLabel = result.recipients.join(', ');
    const toastMsg =
      result.language === 'de'
        ? t.offer.sendOfferSentInGermanToast.replace('{recipients}', recipientsLabel)
        : t.offer.sendOfferSentInEnglishToast.replace('{recipients}', recipientsLabel);
    toast.success(toastMsg);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="space-y-6">
        <Header title="Proposal" />
        <p className="text-body text-sett-text-secondary">Proposal not found.</p>
        <Link href="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isLocked = !!proposal.lockedBy;
  const isSent = ['sent', 'accepted', 'declined', 'cancelled', 'completed'].includes(proposal.status?.toLowerCase());

  return (
    <div className="space-y-8 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-heading-md font-bold text-sett-text-primary">
            Proposal #{id.slice(0, 8)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStatusBadgeVariant(proposal.status)}>
              {proposal.status}
            </Badge>
            {isLocked && (
              <span className="text-caption text-sett-text-secondary">
                Locked
                {proposal.lockedByUser &&
                  ` by ${[proposal.lockedByUser.firstName, proposal.lockedByUser.lastName].filter(Boolean).join(' ')}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
        <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
          Proposal Header
        </h2>
        <p className="text-body text-sett-text-secondary">
          Request: {proposal.requestId ?? '—'} • Created {formatDateEU(proposal.createdAt)}
        </p>
      </section>

      <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-sm font-bold text-sett-text-primary">
            Hotels
          </h2>
          {!isLocked && (
            <Button variant="primary" size="sm" onClick={() => setAddHotelOpen(true)}>
              Add Hotel
            </Button>
          )}
        </div>
        {(!proposal.hotels || proposal.hotels.length === 0) ? (
          <p className="text-body text-sett-text-secondary py-4">No hotels added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-sett-border">
                  <th className="text-left text-label text-sett-text-secondary uppercase px-4 py-3">Hotel</th>
                  <th className="text-right text-label text-sett-text-secondary uppercase px-4 py-3">Total</th>
                  <th className="text-left text-label text-sett-text-secondary uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(proposal.hotels ?? []).map((h) => (
                  <tr key={h.id} className="border-b border-sett-border last:border-0">
                    <td className="px-4 py-3 text-body">{h.hotelName ?? h.hotelCode}</td>
                    <td className="px-4 py-3 text-body text-right">{h.currency} {Number(h.totalPrice).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget({ type: 'hotel', id: h.id })}
                          className="text-body text-sett-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading-sm font-bold text-sett-text-primary">
            Services
          </h2>
          {!isLocked && (
            <Button variant="primary" size="sm" onClick={() => setAddServiceOpen(true)}>
              Add Service
            </Button>
          )}
        </div>
        {(!proposal.services || proposal.services.length === 0) ? (
          <p className="text-body text-sett-text-secondary py-4">No services added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-sett-border">
                  <th className="text-left text-label text-sett-text-secondary uppercase px-4 py-3">Service</th>
                  <th className="text-left text-label text-sett-text-secondary uppercase px-4 py-3">Qty</th>
                  <th className="text-right text-label text-sett-text-secondary uppercase px-4 py-3">Buy</th>
                  <th className="text-right text-label text-sett-text-secondary uppercase px-4 py-3">Sell</th>
                  <th className="text-left text-label text-sett-text-secondary uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(proposal.services ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-sett-border last:border-0">
                    <td className="px-4 py-3 text-body">{s.serviceName ?? '—'}</td>
                    <td className="px-4 py-3 text-body">{s.quantity ?? 1}</td>
                    <td className="px-4 py-3 text-body text-right">{Number(s.buyPrice ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-body text-right">{Number(s.sellPrice ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget({ type: 'service', id: s.id })}
                          className="text-body text-sett-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-sett-card rounded-card shadow-card border border-sett-border p-6 max-w-md">
        <h2 className="text-heading-sm font-bold text-sett-text-primary mb-4">
          Pricing Summary
        </h2>
        <dl className="space-y-2 text-body">
          <div className="flex justify-between">
            <dt className="text-sett-text-secondary">Hotel Subtotal</dt>
            <dd>{totals.hotelSubtotal.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sett-text-secondary">Services Subtotal</dt>
            <dd>{totals.serviceSubtotal.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between items-center gap-2">
            <dt className="text-sett-text-secondary">Markup %</dt>
            <dd>
              {isLocked ? (
                <span>{markupPercent}%</span>
              ) : (
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={markupPercent}
                  onChange={(e) => {
                    setMarkupPercent(Number(e.target.value) || 0);
                    setHasMarkupOverride(true);
                  }}
                  className="w-20 px-2 py-1 rounded-input border border-sett-border text-body"
                />
              )}
            </dd>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-sett-border">
            <dt>Total Buy</dt>
            <dd>{totals.totalBuy.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total Sell</dt>
            <dd>{totals.totalSell.toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <div className="fixed bottom-0 left-0 right-0 lg:left-sidebar bg-sett-card border-t border-sett-border p-4 flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={actionLoading || isLocked || isSent}
        >
          Save Draft
        </Button>
        <Button
          variant="secondary"
          onClick={handleLock}
          disabled={actionLoading || isLocked}
        >
          Lock
        </Button>
        <Button
          variant="primary"
          onClick={() => setSendOpen(true)}
          disabled={actionLoading || isLocked}
        >
          Send
        </Button>
      </div>

      <AddHotelModal
        open={addHotelOpen}
        onClose={() => setAddHotelOpen(false)}
        onAdd={handleAddHotel}
        isLoading={actionLoading}
      />
      <AddServiceModal
        open={addServiceOpen}
        onClose={() => setAddServiceOpen(false)}
        onAdd={handleAddService}
        isLoading={actionLoading}
      />
      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          if (removeTarget.type === 'hotel') handleRemoveHotel(removeTarget.id);
          else handleRemoveService(removeTarget.id);
        }}
        title="Remove item?"
        message="This action cannot be undone."
      />
      <OdooLinkRequiredModal
        open={odooGateOpen}
        onClose={() => setOdooGateOpen(false)}
        onOpenRequest={() => {
          if (proposal?.requestId) router.push(`/booking-requests/${proposal.requestId}`);
        }}
        bodyOverride={odooGateMessage}
      />
      {sendOpen && (
        <SendOfferDualPreviewModal
          open={sendOpen}
          proposalId={proposal.id}
          initialRecipients={[]}
          onSent={handleAfterSend}
          onClose={() => setSendOpen(false)}
        />
      )}
    </div>
  );
}
