# Default Markup % — Backend Handover

**Audience:** Backend developer (Neha)
**Author:** Frontend (Shamandeep)
**Date:** 2026-06-02
**Frontend branch:** `milestone_5v3`
**Companion docs:**
- [policies-rich-text-handover.md](./policies-rich-text-handover.md) — T&C rich text
- [pdf-redesign-backend-handover.md](./pdf-redesign-backend-handover.md) — full PDF spec
- [bilingual-pdf-send-flow-fe.md](./bilingual-pdf-send-flow-fe.md) — bilingual send flow

---

## 1. What the FE just did

The admin sets a **Default Markup %** in `Settings → General`. That value is stored as `defaultMarkupPercentage` on the General settings record.

Until today the FE ignored this field everywhere except the settings page itself. **Now (2026-06-02) the FE reads it live** and applies it to:

| Surface | Behaviour |
|---|---|
| Proposal page markup slider | Seeded from the live default when the proposal has no `markupSettings.percent` override. Once the user moves the slider, the proposal's own value takes over. |
| MarkupDropdown on booking-request detail | The live default appears as a chip in the dropdown (merged with the canonical 10/15/18/20/25 presets) and is labelled "Default". |
| Hotel search | **No FE change** — the FE never had a `markupPercent` lever on hotel search; the BE applies its own. See §3. |
| Add Hotel modal | **No FE change** — markup is computed per-room from net vs sell, not seeded from a default. |

Cache behaviour: the FE fetches `/settings/general` once and caches the value in module memory for 5 minutes across all consumers. When the admin saves a new default in Settings, the FE invalidates the cache immediately so the new value propagates to other open tabs/surfaces on next interaction.

---

## 2. What the BE needs to verify (or fix)

This doc is mostly a **request for the BE to mirror the FE behaviour** so the values stay in sync end-to-end. There are three places the BE touches markup:

### 2.1 Hotel search results (live FE today)

When the FE calls `/requests/{id}/hotel-search/*`, the BE returns `sellingPricePerRoomPerNight` — already post-markup.

**Question:** Where is that markup coming from on the BE today?

- If it's hardcoded (e.g. `18`), please switch it to read `defaultMarkupPercentage` from the General settings.
- If it's already reading from Settings, no change.

If the BE has a per-supplier override (`supplierLimits` table has `maxRooms`/`groupsAllowed` — maybe there's a markup column too?), document the precedence rule:

> 1. Supplier-specific markup if set
> 2. Otherwise General settings default
> 3. Otherwise 18 (legacy hardcoded fallback)

The FE has no view into precedence — it just shows what you return. As long as the number in the search results matches what the FE shows in the markup chip, staff will be happy.

### 2.2 Proposal creation

When a proposal is created (`POST /proposals` from the booking-request detail), the BE should snapshot the current default into `proposal.markupSettings.percent`:

```python
# pseudo-code
default_pct = settings.get_general().default_markup_percentage
proposal.markup_settings = {"percent": float(default_pct), "source": "settings_default"}
```

**Why snapshot at creation:**
- A proposal in flight shouldn't change its markup when the admin bumps the global default. The customer's quote needs to be reproducible.
- The FE already reads `proposal.markupSettings.percent` first and falls back to the live default only when that field is missing. Once the BE writes it on create, the live-fallback path becomes a one-time migration window for legacy proposals.

If you decide **not** to snapshot (live for every render), tell me — the FE will then prefer the live default on every render, ignoring `markupSettings.percent`. Whatever we do, please be explicit.

### 2.3 PDF / Send rendering

When `/proposals/{id}/actions/preview-pdf` and `/proposals/{id}/actions/send` are called, the BE must use:

```python
markup_pct = (
    proposal.markup_settings.get("percent")          # snapshot (preferred)
    or settings.get_general().default_markup_percentage  # legacy fallback
    or 18
)
```

This matches the FE's `proposal.markupSettings.percent ?? defaultMarkup ?? 18` precedence. If the BE deviates, the downloaded PDF total can differ from the on-screen total — a guaranteed customer complaint.

---

## 3. What endpoints already exist (no new endpoints needed)

| Endpoint | Verb | Used by FE today |
|---|---|---|
| `/settings/general` | GET | Yes — to fetch `defaultMarkupPercentage` |
| `/settings/general` | PUT | Yes — admin save |
| `/proposals/{id}/hotels/{hotelId}/adjust-pricing` | POST | Yes — per-room overrides |

The hook on the FE is at [hooks/useDefaultMarkup.ts](../hooks/useDefaultMarkup.ts). It's a thin wrapper over `GET /settings/general` with a 5-minute module-level cache.

---

## 4. Format on the wire

`defaultMarkupPercentage` is currently a **string** in the API contract:

```json
{ "defaultMarkupPercentage": "18" }
```

The FE parses it to a number with `Number(value)` and falls back to 18 if parsing fails. Please keep returning a string (changing to a number now would be a breaking change for nothing).

Allowed range: `0` to `100` (FE enforces this on the input field). The BE should reject `< 0` or non-numeric values with a 400; values `> 100` are technically valid (the admin can do whatever they want).

---

## 5. Verifying the result

Acceptance scenarios:

1. **Admin sets 22% in Settings → General → Save.**
2. Admin creates a new booking request and starts a proposal.
3. The proposal page markup slider should read **22%** by default (not 18, not 0).
4. The MarkupDropdown on the booking-request detail page should show **22%** as a chip with a "Default" label.
5. The downloaded PDF total should reflect the 22% markup applied to the buy prices.
6. Admin then changes the default to **25% → Save**.
7. Existing proposals don't change (snapshot). New proposals show 25%.

If any of those 7 fails, ping me with the details and I'll triage.

---

## 6. Snapshot vs live — the decision

This is the same question as the T&C handover doc (§8 there). Pick one approach and stick with it:

| Approach | Behaviour | Storage |
|---|---|---|
| **Live always** | Every preview/PDF re-reads `/settings/general`. Admin edits affect everything immediately, including sent offers. | `markupSettings.percent` is never written. |
| **Snapshot on create (Recommended)** | The proposal's markup % is locked in at creation time. Admin edits only affect new proposals. | `markupSettings.percent` is written once. |
| **Snapshot on send** | Drafts use live; the moment the offer is sent, the markup is frozen. | `markupSettings.percent` is written at send-time. |

The FE already supports all three because it prefers `markupSettings.percent` when present and falls back to live. So pick whichever fits your reproducibility requirements; the FE will Just Work either way.

My vote, for symmetry with how invoices work in most B2B systems: **Snapshot on create**.

---

## 7. Edge cases

### 7.1 Settings call fails

If `/settings/general` returns 500 or the value can't be parsed, the FE falls back to `18`. The BE should NOT 500 on a missing settings row — return `{ defaultMarkupPercentage: "18" }` as the default. We've already seen `(data.markupSettings as { percent?: number })?.percent` survive missing fields gracefully; please match that on the BE side.

### 7.2 Concurrent admin edits

Two admins save different values within seconds of each other. Last-writer-wins is fine — no need for optimistic locking on this field. The FE invalidates its cache on save, but if a stale tab has the old value cached, the worst case is one stale read until the next mount (≤ 5 min, since the cache TTL handles it).

### 7.3 Per-supplier override (future)

If you add a `markupPercent` column on `supplierLimits` later, the FE can surface it as a third chip in the MarkupDropdown ("Supplier X: 12%"). Tell me when that lands and I'll wire it.

---

## 8. Out of scope

- Per-room markup overrides — already work, no change needed
- Per-service markup — already work, no change needed
- Markup currency conversion (the markup is a pure %, not a currency-bound value)

---

## 9. Contacts

Markup math diverges between the FE preview total and the PDF total → ping me with one proposal ID + the two totals, I'll trace it.

The FE hook is at [hooks/useDefaultMarkup.ts](../hooks/useDefaultMarkup.ts). The two consumer surfaces are:
- [app/(dashboard)/proposals/[id]/page.tsx](../app/(dashboard)/proposals/[id]/page.tsx) — proposal slider seed
- [app/(dashboard)/booking-requests/[id]/page.tsx](../app/(dashboard)/booking-requests/[id]/page.tsx) — MarkupDropdown chip highlight
