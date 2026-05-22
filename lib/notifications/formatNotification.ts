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
 * known top-level fields like `entityId`). Missing keys leave the placeholder
 * intact so missing data is obvious during QA rather than silently dropping.
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

/** Replace every {placeholder} in a template using the notification's metadata. */
function interpolate(template: string, n: Notification): string {
  return template.replace(/\{(\w+)\}/g, (raw, key: string) => {
    const v = metaValue(n, key);
    return v ?? raw;
  });
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

  // TEMP DEBUG — log the actual BE type so we can map it.
  if (typeof window !== 'undefined') {
    console.log('[formatNotification] raw type=', JSON.stringify(n.type), 'canon key=', key, 'template found?', !!tpl, 'metadata=', n.metadata);
  }

  if (!tpl) {
    // Unknown type — fall back to whatever the backend already provided.
    return { title: n.title ?? '', body: n.body ?? '' };
  }

  return {
    title: tpl.title ? interpolate(tpl.title, n) : n.title ?? '',
    body: tpl.body ? interpolate(tpl.body, n) : n.body ?? '',
  };
}
