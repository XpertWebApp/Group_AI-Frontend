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
  const key = canonType(n.type);
  const tpl = templates[key];

  if (!tpl) {
    // Unknown type — fall back to whatever the backend already provided.
    return { title: n.title ?? '', body: n.body ?? '' };
  }

  // Per-field fallback: if a template's placeholders aren't all filled, use
  // the BE-supplied string for that field. Title and body fall back
  // independently so a working title isn't lost when only body metadata is
  // missing (and vice versa).
  const renderedTitle = tpl.title ? interpolate(tpl.title, n) : null;
  const renderedBody = tpl.body ? interpolate(tpl.body, n) : null;

  return {
    title: renderedTitle ?? n.title ?? '',
    body: renderedBody ?? n.body ?? '',
  };
}
