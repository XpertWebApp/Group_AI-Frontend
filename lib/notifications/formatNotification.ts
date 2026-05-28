/**
 * Localized rendering for notification.title / notification.body.
 *
 * The backend ships notifications with English `title` and `body` strings
 * pre-filled. To support DE without a backend change, we map a stable
 * `notification.type` code (e.g. "BOOKING_REQUEST_CREATED") plus structured
 * `notification.metadata` placeholders to a template defined in the FE i18n
 * dictionary (`t.notifications.templates[<TYPE>]`).
 *
 * When the type isn't in the dictionary we fall back to whatever the BE
 * provided — that way unknown / new notification types still render the
 * server's English copy instead of breaking the UI.
 *

 * Placeholder syntax in templates: `{key}` — replaced by `metadata.key` (or
 * known top-level fields like `entityId`). If any placeholder is missing
 * from metadata we fall back to the BE-supplied string for that field rather
 * than render literal `{customer}` to the user.
 */

import type { Notification } from '@/types';
import type { TranslationKeys } from '@/lib/i18n/translations';

type NotificationTranslations = TranslationKeys['notifications'];

/** Output of localizing a single notification. */
export interface LocalizedNotification {
  title: string;
  body: string;
}

/** Pull a value out of metadata as a string. Coerces numbers, ignores objects. */
function metaValue(n: Notification, key: string): string | null {
  const meta = (n.metadata ?? {}) as Record<string, unknown>;
  // Look first in metadata, then at a few well-known top-level fields.
  const fromMeta = meta[key];
  if (typeof fromMeta === 'string') return fromMeta;
  if (typeof fromMeta === 'number') return String(fromMeta);
  if (key === 'entityId' && n.entityId) return n.entityId;
  if (key === 'entityType' && n.entityType) return n.entityType;
  return null;
}

/**
 * Replace every {placeholder} in a template using the notification's metadata.
 * Returns `null` when any referenced placeholder is missing — caller should
 * then fall back to the BE-supplied string instead of rendering a half-filled
 * template (avoids leaking literal "{customer}" / "#{reference}" to the user
 * when the BE notification's metadata is incomplete).
 */
function interpolate(template: string, n: Notification): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (raw, key: string) => {
    const v = metaValue(n, key);
    if (v == null) {
      missing = true;
      return raw;
    }
    return v;
  });
  return missing ? null : out;
}

/**
 * Normalize the notification's `type` so the dictionary can have stable keys
 * regardless of whether the BE sends "booking_request_created" or
 * "BookingRequestCreated".
 */
function canonType(type: string | undefined | null): string {
  return (type ?? '').toUpperCase().replace(/[-\s]+/g, '_');
}

/**
 * Alias mapping for BE type codes that have the same semantic meaning as one
 * of our canonical template keys. Keeps the FE dictionary minimal while
 * tolerating multiple BE naming conventions.
 *
 * When the BE eventually settles on a single canonical type per event, these
 * aliases can be deleted with no consumer changes.
 */
const TYPE_ALIASES: Record<string, string> = {
  // "Group request" wording → reuses the booking-request template.
  GROUP_REQUEST_RECEIVED: 'BOOKING_REQUEST_CREATED',
  GROUP_REQUEST_CREATED: 'BOOKING_REQUEST_CREATED',
  NEW_GROUP_REQUEST: 'BOOKING_REQUEST_CREATED',
  NEW_BOOKING_REQUEST: 'BOOKING_REQUEST_CREATED',
  REQUEST_CREATED: 'BOOKING_REQUEST_CREATED',
};

/**
 * Pattern-match the BE-supplied English title against known notification
 * shapes when neither the type code nor an alias hits the dictionary. This
 * is the last-resort path: when the BE introduces a new type code we
 * haven't mapped yet, we can still localize as long as the title looks
 * familiar.
 *
 * Returns the canonical template key + an extracted metadata dictionary,
 * or null if nothing matches.
 */
function matchTitlePattern(title: string | undefined | null): { key: string; meta: Record<string, string> } | null {
  if (!title) return null;
  // "New group request received (#280)" — pull the reference number.
  const groupRequestMatch = title.match(/^new\s+(group|booking)\s+request\s+(received|created)\s*\(#?(\d+)\)$/i);
  if (groupRequestMatch) {
    return {
      key: 'BOOKING_REQUEST_CREATED',
      meta: { reference: groupRequestMatch[3] },
    };
  }
  return null;
}

/**
 * Render a notification's `title` and `body` in the current locale.
 *
 * @param n The raw notification from the API.
 * @param tNotifications The `t.notifications` slice of the i18n bundle.
 */
export function formatNotification(
  n: Notification,
  tNotifications: NotificationTranslations,
): LocalizedNotification {
  const templates = tNotifications.templates ?? {};

  // Resolve the template key in this order:
  //   1. Direct match on the BE's normalized type code.
  //   2. Alias lookup (BE may use different naming for the same event).
  //   3. Title-pattern inference (catches new BE types we haven't mapped
  //      yet, as long as the title text shape is recognisable).
  // If none of these find a template, fall back to the BE's English strings.
  const directKey = canonType(n.type);
  let key: string | null = templates[directKey] ? directKey : null;
  let inferredMeta: Record<string, string> | null = null;

  if (!key && TYPE_ALIASES[directKey]) {
    key = TYPE_ALIASES[directKey];
  }
  if (!key) {
    const titleMatch = matchTitlePattern(n.title);
    if (titleMatch && templates[titleMatch.key]) {
      key = titleMatch.key;
      inferredMeta = titleMatch.meta;
    }
  }

  const tpl = key ? templates[key] : undefined;
  if (!tpl) {
    return { title: n.title ?? '', body: n.body ?? '' };
  }

  // If we inferred metadata from the title, expose those values to the
  // interpolator by temporarily extending the notification's metadata.
  const effectiveN: Notification = inferredMeta
    ? { ...n, metadata: { ...(n.metadata ?? {}), ...inferredMeta } as Notification['metadata'] }
    : n;

  // Per-field fallback: if a template's placeholders aren't all filled, use
  // the BE-supplied string for that field. Title and body fall back
  // independently so a working title isn't lost when only body metadata is
  // missing (and vice versa).
  const renderedTitle = tpl.title ? interpolate(tpl.title, effectiveN) : null;
  const renderedBody = tpl.body ? interpolate(tpl.body, effectiveN) : null;

  return {
    title: renderedTitle ?? n.title ?? '',
    body: renderedBody ?? n.body ?? '',
  };
}
