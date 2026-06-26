import type { Proposal } from '@/types';

/**
 * Cutover for the payment-deadline send-offer gate (handover §2.3 in
 * public/payment-deadline.md). Proposals created strictly before this
 * date are grandfathered and can be sent without a payment deadline —
 * the PDF falls back to the legacy `checkoutDate − 30 days` default.
 * Kept in sync with the backend's cutover; if BE changes it, update
 * this constant.
 */
export const PAYMENT_DEADLINE_GATE_ACTIVE_SINCE = '2026-06-26T00:00:00Z';

/**
 * Returns true when the FE should block the Send Offer action because
 * the proposal was created on/after the cutover AND has no payment
 * deadline yet.
 *
 * The backend enforces this at /proposals/:id/actions/send with a 400
 * PAYMENT_DEADLINE_REQUIRED; the FE check is for UX (disabling the
 * button before the click) so users never see the 400.
 *
 * Mirrors `isOdooLinkRequired` from `./odooGate.ts` so the two gates
 * compose cleanly in the Send Offer button's disabled prop.
 */
export function isPaymentDeadlineRequired(
  proposal: Pick<Proposal, 'createdAt' | 'paymentDeadline'> | null | undefined,
): boolean {
  if (!proposal) return false;
  if (proposal.paymentDeadline != null) return false;
  const created = new Date(proposal.createdAt).getTime();
  const cutover = new Date(PAYMENT_DEADLINE_GATE_ACTIVE_SINCE).getTime();
  return created >= cutover;
}

/**
 * Narrow check for the BE error returned when the gate fires. Backend body:
 *   { success: false, code: 'PAYMENT_DEADLINE_REQUIRED', message: '…' }
 *
 * Note the BE uses both `error` and `code` keys on the error envelope in
 * different endpoints — check both for resilience. Handover §2.3 uses
 * `code` for this specific error.
 */
export function isPaymentDeadlineRequiredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { response?: { data?: { error?: string; errorCode?: string; code?: string } } };
  const codes = [
    e.response?.data?.error,
    e.response?.data?.errorCode,
    e.response?.data?.code,
  ];
  return codes.includes('PAYMENT_DEADLINE_REQUIRED');
}
