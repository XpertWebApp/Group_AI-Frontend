/**
 * Free-cancellation date risk helpers.
 *
 * Background: the hotel-search backend filters to free-cancellation rates only.
 * Most hotels close their free-cancellation window 7–14 days before arrival,
 * so a request with a check-in date close to today silently loses inventory.
 *
 * These helpers compute how risky a given check-in date is so the UI can show
 * a graded contextual warning to the agent creating the request.
 */

/** Severity tiers used to pick the message + accent intensity in the banner. */
export type FreeCancellationRisk = 'none' | 'low' | 'medium' | 'high';

/**
 * Compute whole days from "today (local midnight)" to the check-in date.
 * Returns null when the date string is missing or unparsable.
 * Past dates return a negative number — callers should treat ≤ 0 as "today or past".
 */
export function daysUntilCheckin(checkInDateISO: string | null | undefined): number | null {
  if (!checkInDateISO) return null;
  const checkIn = new Date(checkInDateISO);
  if (Number.isNaN(checkIn.getTime())) return null;
  // Normalise both ends to local midnight so we count calendar days, not ms.
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * Map a days-until value to a risk tier:
 *   ≤ 3 days  → high   (most hotels won't honour free cancellation)
 *   4–7       → medium (many hotels start closing the window here)
 *   8–14      → low    (some hotels still offer it; nudge user)
 *   15+       → none   (passive hint only)
 *   null      → none
 */
export function freeCancellationRisk(daysAway: number | null): FreeCancellationRisk {
  if (daysAway === null || daysAway > 14) return 'none';
  if (daysAway <= 3) return 'high';
  if (daysAway <= 7) return 'medium';
  return 'low';
}
