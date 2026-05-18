/**
 * Group-type canonical-code helpers.
 *
 * Backend canonical codes (lowercase, server-stored):
 *   business | leisure | sports | youth | school | family | wedding | mice | other
 *
 * Historical FE values that may exist on saved requests in the DB:
 *   business_group, leisure_group, sports_team, youth_group, school_group,
 *   mice_group, conference (deprecated — now mapped to mice)
 *
 * Always WRITE the canonical code. When READING from the API, normalize via
 * `toCanonicalGroupType` so old rows keep displaying correctly.
 */

import type { TranslationKeys } from '@/lib/i18n/translations';

/** All canonical codes the backend accepts. Order = display order in the form dropdown. */
export const GROUP_TYPE_CODES = [
  'business',
  'leisure',
  'sports',
  'youth',
  'school',
  'family',
  'wedding',
  'mice',
  'other',
] as const;

export type GroupTypeCode = typeof GROUP_TYPE_CODES[number];

/** Group types where Average Age is mandatory (per backend validation: 6–25 inclusive). */
export const AGE_REQUIRED_GROUP_TYPES: ReadonlySet<GroupTypeCode> = new Set<GroupTypeCode>(['youth', 'school']);

export const AVERAGE_AGE_MIN = 6;
export const AVERAGE_AGE_MAX = 25;

/**
 * Map any historical or canonical value coming from the API to the canonical code.
 * Returns `null` for unknown values so callers can decide on a fallback.
 */
export function toCanonicalGroupType(raw: string | null | undefined): GroupTypeCode | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  // Already canonical
  if ((GROUP_TYPE_CODES as readonly string[]).includes(v)) return v as GroupTypeCode;
  // Legacy underscore forms saved by older versions of this FE
  const legacy: Record<string, GroupTypeCode> = {
    business_group: 'business',
    leisure_group: 'leisure',
    sports_team: 'sports',
    sports_group: 'sports',
    youth_group: 'youth',
    school_group: 'school',
    family_group: 'family',
    mice_group: 'mice',
    other_group: 'other',
    // Deprecated → MICE per backend handover
    conference: 'mice',
  };
  return legacy[v] ?? null;
}

/** True if this group type requires Average Age. Accepts legacy values via normalization. */
export function groupTypeRequiresAge(raw: string | null | undefined): boolean {
  const code = toCanonicalGroupType(raw);
  return code !== null && AGE_REQUIRED_GROUP_TYPES.has(code);
}

/**
 * Map a canonical (or legacy) code to a localised display label using i18n.
 * Falls back to a title-cased rendering of the raw value for unknown codes.
 */
export function getGroupTypeLabel(
  raw: string | null | undefined,
  t: TranslationKeys,
): string {
  const code = toCanonicalGroupType(raw);
  if (!code) {
    if (!raw) return '—';
    return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const map: Record<GroupTypeCode, string> = {
    business: t.createForm.businessGroup,
    leisure: t.createForm.leisureGroup,
    sports: t.createForm.sportsGroup,
    youth: t.createForm.youthGroup,
    school: t.createForm.schoolGroup,
    family: t.createForm.familyGroup,
    wedding: t.createForm.wedding,
    mice: t.createForm.miceGroup,
    other: t.createForm.otherGroup,
  };
  return map[code];
}

/**
 * Build the form's group-type dropdown options in display order. Values are
 * canonical codes — what gets sent to the backend.
 */
export function buildGroupTypeOptions(t: TranslationKeys): Array<{ value: GroupTypeCode; label: string }> {
  return GROUP_TYPE_CODES.map((code) => ({
    value: code,
    label: getGroupTypeLabel(code, t),
  }));
}
