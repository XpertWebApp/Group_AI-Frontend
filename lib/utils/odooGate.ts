import type { BookingRequest } from '@/types';

/**
 * Cutover for the Odoo-link send-offer gate (§2.3). Requests created strictly
 * before this date are grandfathered and can be sent without an Odoo link.
 * Kept in sync with the backend's `ODOO_GATE_ACTIVE_SINCE` env var; if the
 * BE config changes, update this constant.
 */
export const ODOO_GATE_ACTIVE_SINCE = '2026-05-23T00:00:00Z';

/**
 * Returns true when the FE should block the Send Offer action because the
 * request was created on/after the cutover AND has no Odoo link yet.
 *
 * The backend enforces this at /proposals/:id/actions/send; the FE check is
 * for UX (disabling the button before the click) so users never see a 400.
 */
export function isOdooLinkRequired(
  request: Pick<BookingRequest, 'createdAt' | 'odooContactId'> | null | undefined,
): boolean {
  if (!request) return false;
  if (request.odooContactId != null) return false;
  const created = new Date(request.createdAt).getTime();
  const cutover = new Date(ODOO_GATE_ACTIVE_SINCE).getTime();
  return created >= cutover;
}

/**
 * Narrow check for the BE error returned when the gate fires. Backend body:
 *   { success: false, error: 'ODOO_CONTACT_REQUIRED', message: '…' }
 */
export function isOdooContactRequiredError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { response?: { data?: { error?: string } } };
  return e.response?.data?.error === 'ODOO_CONTACT_REQUIRED';
}
