/**
 * Star-rating helpers.
 *
 * Backend now supports `starRatings: number[]` for multi-select hotel categories
 * alongside the legacy `starRating: number` single value. Always read via
 * `selectedStars()` so older rows (which only have `starRating`) keep working.
 *
 * Allowed values: 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6 (any 0.5 step from 1 to 6).
 */

export const MAX_STAR_RATINGS = 6;

/**
 * Resolve the user's selected star categories from a request, with legacy fallback.
 * Returns an empty array when neither field is present ("any rating").
 */
export function selectedStars(req: {
  starRatings?: number[] | null;
  starRating?: number | null;
}): number[] {
  if (Array.isArray(req.starRatings) && req.starRatings.length > 0) {
    return req.starRatings.map(Number);
  }
  return req.starRating != null ? [Number(req.starRating)] : [];
}

/**
 * Coerce any hotel's starRating (string or number, possibly with half-steps like "4.5")
 * to a whole-number bucket for comparison against the request's selection.
 */
export function hotelStarBucket(h: { starRating: number | string | null | undefined }): number {
  return Math.round(Number(h.starRating ?? 0));
}

/**
 * True if a hotel's star rating matches any of the user's selected categories.
 * Used to bucket main vs star-mismatch results on the Add Hotel page.
 */
export function hotelMatchesSelectedStars(
  hotel: { starRating: number | string | null | undefined },
  selected: number[],
): boolean {
  if (selected.length === 0) return true; // "any" — no filter
  const bucket = hotelStarBucket(hotel);
  return selected.some((s) => Math.round(s) === bucket);
}

/**
 * Format the selection for human-readable display. Examples:
 *   [3]      → "3★"
 *   [3, 4]   → "3★, 4★"
 *   []       → "Any"
 */
export function formatStarRatings(stars: number[], anyLabel = 'Any'): string {
  if (stars.length === 0) return anyLabel;
  return stars.map((s) => `${s}★`).join(', ');
}
