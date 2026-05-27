/**
 * Localizer for the backend's `hotel.note` warning strings.
 *
 * Background (per BE handover): the search/probe response includes a `note`
 * field that's a plain English sentence with interpolated values. The BE
 * plans to migrate these to stable codes + params in a later milestone, but
 * for the current milestone we match the English string and swap in the
 * locale-appropriate template.
 *
 * Each entry maps a unique English pattern (regex) to:
 *   - the i18n key holding the localized template
 *   - the capture-group order that fills the {placeholders} in the template
 *
 * If no pattern matches we fall back to whatever the BE sent so untranslated
 * notes don't disappear from the UI.
 */

import type { TranslationKeys } from '@/lib/i18n/translations';

type AddHotelT = TranslationKeys['addHotel'];

interface Pattern {
  /** Regex that matches the BE English string. Capture groups become the
   *  ordered values for the {placeholders} in the localized template. */
  re: RegExp;
  /** Key inside t.addHotel whose value is the localized template. */
  key: keyof AddHotelT;
  /** Placeholder names in the template, in the same order as the regex
   *  capture groups. */
  params: string[];
}

// Patterns are NOT anchored to start/end of the string — the localizer scans
// the input iteratively and consumes whichever pattern matches at the current
// position. This way a concatenated note like
//   "Multiple suppliers ... directly. Total room count ... directly."
// (where the first sentence contains an internal period) still works, because
// the scanner consumes the full Multiple-suppliers match before advancing,
// then matches Total-room-count from the next position.
//
// Important: order matters when two patterns share a prefix. List longer /
// more-specific patterns first so they're tried before their shorter
// counterparts (e.g. the "Inventory overlap" multi-supplier variant must
// come before the "Inventory overlap capped at 60%" short variant).
const PATTERNS: Pattern[] = [
  // 1. Inventory overlap detected (multi-supplier overlap)
  {
    re: /Inventory overlap detected — supplier claims \(([^)]+)\) exceed verified hotel capacity \(([^)]+)\)\. Effective capacity capped to ([^.]+)\./,
    key: 'noteInventoryOverlapDetected',
    params: ['totalSupplierClaim', 'dbTotalRooms', 'effectiveCapacity'],
  },
  // 7. Inventory overlap capped at physical capacity (short variant)
  {
    re: /Inventory overlap detected — capped at 60% of hotel physical capacity \(([^)]+) rooms\)\./,
    key: 'noteInventoryOverlapCapped',
    params: ['hotelTotalRooms'],
  },
  // 2. Multiple suppliers — overlap discount applied
  // (Has TWO sentences inside the single message: "...channels. Verify...")
  {
    re: /Multiple suppliers found \(([^)]+)\) — allocation reduced by ([\d.]+)% to account for potential inventory overlap across channels\. Verify total capacity with hotel directly\./,
    key: 'noteMultipleSuppliers',
    params: ['uniqueSuppliersCount', 'percent'],
  },
  // 3. Total room count unverified
  {
    re: /Total room count unverified — confirm with hotel directly\./,
    key: 'noteTotalRoomCountUnverified',
    params: [],
  },
  // 4. Suppliers removed during validation
  {
    re: /([\d]+) supplier\(s\) removed during option detail validation — ([\d]+) remain\./,
    key: 'noteSuppliersRemoved',
    params: ['removedCount', 'remainingCount'],
  },
  // 5. Supplier caps limit allocation
  {
    re: /Supplier caps limit allocation to ([\d]+) of ([\d]+) requested rooms — verify additional supply with the hotel\./,
    key: 'noteSupplierCapsLimit',
    params: ['validatedRoomsAllocated', 'requestedRooms'],
  },
  // 6. Room availability equals requested amount
  {
    re: /Room availability equals requested amount — capacity should be verified with the hotel\./,
    key: 'noteRoomAvailabilityEqualsRequested',
    params: [],
  },
  // 8. Room inventory unverified (short form)
  {
    re: /Room inventory unverified — confirm directly with hotel\./,
    key: 'noteRoomInventoryUnverified',
    params: [],
  },
];

/** Replace every {placeholder} in `template` using `values`. */
function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (raw, k: string) => values[k] ?? raw);
}

/**
 * Translate a hotel.note string into the user's current locale.
 *
 * Strategy: iterative scan. We walk through the note from left to right,
 * try each pattern at the current position, and consume whichever one
 * matches first (i.e. matches earliest in the remaining string). This
 * avoids the split-first trap where a sentence containing an internal
 * period (like the "Multiple suppliers" message) would get cut in half
 * by a naive "split on . " heuristic.
 *
 * Behaviour:
 *   - Each matched fragment is replaced with its localized template.
 *   - Unmatched text between fragments is preserved verbatim (so BE
 *     strings the FE hasn't mapped yet still surface to QA, just in
 *     English). This is the brand-new design's "fail open" promise.
 *   - Output joins the localized + verbatim chunks on newlines so each
 *     warning renders on its own line in the UI.
 *
 * @param note    The raw English note from the API (may be empty/null).
 * @param tAddHotel  The `t.addHotel` slice of the i18n bundle.
 */
export function localizeHotelNote(
  note: string | null | undefined,
  tAddHotel: AddHotelT,
): string {
  if (!note) return '';
  const text = note.trim();
  if (!text) return '';

  const out: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    // Find the earliest-starting match across all patterns at/after the
    // cursor. If two patterns match at the same position, prefer the
    // longer match (catches the "Inventory overlap detected — supplier
    // claims..." long variant before the short "...capped at 60%" variant
    // when they share the same prefix).
    let bestStart = -1;
    let bestLength = 0;
    let bestPattern: Pattern | null = null;
    let bestMatch: RegExpMatchArray | null = null;
    const remaining = text.slice(cursor);
    for (const p of PATTERNS) {
      const m = remaining.match(p.re);
      if (!m || m.index == null) continue;
      const length = m[0].length;
      if (
        bestStart === -1 ||
        m.index < bestStart ||
        (m.index === bestStart && length > bestLength)
      ) {
        bestStart = m.index;
        bestLength = length;
        bestPattern = p;
        bestMatch = m;
      }
    }

    if (!bestPattern || !bestMatch) {
      // No more matches — flush remainder verbatim and stop.
      const tail = text.slice(cursor).trim();
      if (tail) out.push(tail);
      break;
    }

    // Preserve any text BEFORE the matched fragment (e.g. an
    // unrecognised sentence the FE doesn't know about yet).
    if (bestStart > 0) {
      const before = remaining.slice(0, bestStart).trim().replace(/^[.;,\s]+|[.;,\s]+$/g, '');
      if (before) out.push(before);
    }

    // Localize the matched fragment.
    const values: Record<string, string> = {};
    for (let i = 0; i < bestPattern.params.length; i++) {
      values[bestPattern.params[i]] = bestMatch[i + 1] ?? '';
    }
    const template = (tAddHotel as unknown as Record<string, unknown>)[bestPattern.key as string];
    if (typeof template === 'string') {
      out.push(interpolate(template, values));
    } else {
      // Template missing for some reason — fall back to BE's verbatim text
      // so the warning still surfaces.
      out.push(bestMatch[0]);
    }

    cursor += bestStart + bestLength;
  }

  return out.join('\n');
}

/**
 * Localized label for a `capacityStatus` enum value. Falls back to a sane
 * default string if the BE introduces a new status code we don't yet handle.
 */
export function localizeCapacityStatus(
  status: 'CONFIRMED' | 'LIMITED' | 'INSUFFICIENT' | null | undefined,
  tAddHotel: AddHotelT,
): string {
  switch (status) {
    case 'CONFIRMED': return tAddHotel.capacityConfirmed;
    case 'LIMITED': return tAddHotel.capacityLimited;
    case 'INSUFFICIENT': return tAddHotel.capacityInsufficient;
    default: return '';
  }
}
