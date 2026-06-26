# Cancellation Deadline Override — Frontend Handover

**Audience:** Frontend developer (Shamandeep)
**Author:** Backend (Neha)
**Date:** 2026-06-25
**Backend branch:** `milestone_5v3`
**Scope:** UI to edit the per-hotel cancellation deadline on the Request Summary / Added Hotels page (Group AI Tool Report 1b — Issue #5)

---

## 1. What we built (BE side, ready)

A small additive feature on the proposal:

- New nullable columns on `ProposalHotel`: `cancelDeadlineOverride`, `cancelDeadlineOverriddenBy`, `cancelDeadlineOverriddenAt`
- New endpoint: `PATCH /api/v1/proposals/:proposalId/hotels/:hotelId/cancellation`
- The customer-facing PDF and FE proposal endpoint now use the override when set, supplier's date otherwise
- Audit log entry on every override change

**Critical business rule:** an override can only be **earlier** than the supplier's actual cancellation date. Staff can promise the customer "you can cancel up to 18 Dec" when the supplier allows 23 Dec (more conservative), but they **cannot** promise 28 Dec when the supplier only allows 23 Dec — that would expose SETT to the supplier's cancellation penalty.

---

## 2. API contract

### 2.1 GET `/api/v1/proposals/:id` — what's already on each `hotels[i]`

The response shape now includes four cancellation-related fields per hotel:

```json
{
  "id": "461addf9-bdba-4852-971f-7c4ab2c3f9e7",
  "hotelName": "Art Hotel Villa Agape",
  "freeCancellation": true,
  "cancelDeadline":           "2026-12-23T19:59:59.000Z",
  "cancelDeadlineOverride":   null,
  "cancelDeadlineOverriddenBy": null,
  "cancelDeadlineOverriddenAt": null,
  "effectiveCancelDeadline":  "2026-12-23T19:59:59.000Z"
}
```

After staff sets an override to 18 Dec:

```json
{
  "cancelDeadline":           "2026-12-23T19:59:59.000Z",
  "cancelDeadlineOverride":   "2026-12-18T19:59:59.000Z",
  "cancelDeadlineOverriddenBy": "19026c5d-553d-4da9-882a-daeaeb07cb33",
  "cancelDeadlineOverriddenAt": "2026-06-25T07:55:44.904Z",
  "effectiveCancelDeadline":  "2026-12-18T19:59:59.000Z"
}
```

**Which field to use where:**

| FE need | Field |
|---|---|
| Default value shown to staff in the edit-field on the page | `effectiveCancelDeadline` (BE picks override if present, supplier otherwise) |
| "Cancel before…" green badge text on the card | Format `effectiveCancelDeadline` to `dd.mm.yyyy` — matches what the PDF + the customer see |
| Audit row: "Supplier: 23 Dec / Override: 18 Dec" | Show both `cancelDeadline` and `cancelDeadlineOverride` when override is non-null |
| Max date for the date picker | `cancelDeadline` minus 1 day (override must be EARLIER than supplier date) |
| "Edited by [name] on [date]" attribution line | `cancelDeadlineOverriddenBy` (user UUID — need to resolve to staff name via existing user-cache) + `cancelDeadlineOverriddenAt` |

### 2.2 PATCH `/api/v1/proposals/:proposalId/hotels/:hotelId/cancellation`

**Request body** — set an override:

```json
{ "cancelDeadlineOverride": "2026-12-18T19:59:59.000Z" }
```

**Request body** — clear the override (revert to supplier date):

```json
{ "cancelDeadlineOverride": null }
```

**Response on success (200):**

```json
{
  "success": true,
  "data": {
    "id": "461addf9-bdba-4852-971f-7c4ab2c3f9e7",
    "cancelDeadline": "2026-12-23T19:59:59.000Z",
    "cancelDeadlineOverride": "2026-12-18T19:59:59.000Z",
    "cancelDeadlineOverriddenBy": "19026c5d-553d-4da9-882a-daeaeb07cb33",
    "cancelDeadlineOverriddenAt": "2026-06-25T07:55:44.904Z",
    "...": "rest of the ProposalHotel row"
  },
  "message": "Hotel cancellation deadline updated"
}
```

**Error responses:**

| Status | `errorCode` | When | UX |
|---|---|---|---|
| 400 | `CXL_OVERRIDE_TOO_LATE` | Override date is on or after the supplier's `cancelDeadline` | Show inline error: "This is later than the supplier's deadline of 23 Dec. Pick a date before that." Disable Save until fixed. The error response includes `supplierDeadline` field for reference. |
| 400 | `CXL_OVERRIDE_IN_PAST` | Override date is in the past | "Date cannot be in the past." Reset picker to today's date. |
| 400 | `validation_error` | Body shape wrong (e.g. not an ISO 8601 string and not `null`) | "Invalid date format" — should never happen if FE uses a date picker. |
| 401 | `UNAUTHORIZED` | No auth token / token expired | Standard auth-redirect flow. |
| 404 | `NOT_FOUND` | Proposal or hotel doesn't exist | "Hotel not found on this proposal — refresh and try again." |
| 409 | `PROPOSAL_NOT_MODIFIABLE` | Proposal is in `sent` / `approved` / `declined` state | "This proposal can no longer be edited. The cancellation deadline can only be changed while the proposal is in draft." |
| 409 | `PROPOSAL_LOCKED` | Another user has an active edit lock on this proposal | Standard lock-conflict toast pattern, same as existing edit-locking UX. |

---

## 3. UI / UX

### 3.1 Where to put it on the Request Summary / Added Hotels page

Looking at the screenshot you shared (the Hotels accordion with Donatello / Novotel / Royal cards):

The current line:

```
Free cancellation until 23 Dec 2026
```

Should become an editable area. Two ways to handle this — pick whichever fits your design system:

**Option A — inline edit on click (recommended for compactness):**

```
Free cancellation until 23 Dec 2026  [pencil icon]
                        ↓ click
Free cancellation until [date picker: 18 Dec 2026]  [Save] [Cancel]
                        ↓ save
Free cancellation until 18 Dec 2026  ⓘ (supplier: 23 Dec — set by Vincent)
                                        [pencil icon to edit again]
```

**Option B — modal trigger:**

```
Free cancellation until 23 Dec 2026  [pencil icon → opens modal]

Modal:
┌─────────────────────────────────────────────────┐
│  Edit cancellation deadline                  ✕  │
│                                                 │
│  Supplier deadline:    23 Dec 2026 (read-only)  │
│                                                 │
│  Override to:          [date picker: 18 Dec]    │
│                                                 │
│  ⚠ Must be earlier than the supplier deadline.  │
│    Staff can promise an earlier cancellation    │
│    date than the supplier, never later.         │
│                                                 │
│  [Clear override]  [Cancel]  [Save]             │
└─────────────────────────────────────────────────┘
```

Option B is more discoverable and gives space to explain the constraint upfront.

### 3.2 Visual states

Three card states the FE needs to render:

**State 1 — Free cancellation, supplier date (no override):**

```
✓ Free Cancellation until 23 Dec 2026  [edit icon]
```

**State 2 — Free cancellation, override active:**

```
✓ Free Cancellation until 18 Dec 2026  [edit icon]
   Supplier: 23 Dec • Override by Vincent · 25 Jun
```

The second line (audit trail) should be small, grey, 11px — informational. Hovering it could show the full timestamp tooltip.

**State 3 — Hotel doesn't allow free cancellation:**

```
✗ Not refundable
```

(No edit icon — there's nothing to override.)

### 3.3 The date picker

- **Default value** when opening: `effectiveCancelDeadline` (so if override exists, that's shown; otherwise supplier's date is the starting point).
- **Min date**: today.
- **Max date**: `cancelDeadline - 1 day` (must be strictly earlier than supplier). If supplier is `2026-12-23T19:59:59Z`, max is `2026-12-22`.
- **Time component**: drop it. Show date only in the picker. Send to the BE with time `T23:59:59.000Z` for end-of-day semantics — same convention WBE uses.
- **Validation onChange**: re-check the max-date constraint client-side and disable Save if violated. Don't rely on the BE 400 alone.

### 3.4 The "Clear override" button

Inside the modal (Option B) or as a secondary action (Option A) — sends `{ cancelDeadlineOverride: null }`. After clearing, the card reverts to State 1 with the supplier's date.

### 3.5 Concurrency edge case

If two staff edit the same proposal at the same time (existing lock pattern), the second user gets the 409 `PROPOSAL_LOCKED` error. Surface this with the same toast you use today for other edit conflicts.

---

## 4. Audit display

`cancelDeadlineOverriddenBy` is a user UUID — you'll need to resolve it to a display name. Two ways:

- **If your FE already has a users-by-id cache** (we use one elsewhere for assigned-user display): use it.
- **Otherwise**: ignore the attribution and just show "Override active" without a name. The BE has the full audit trail in `audit_events` if anyone needs to dig into "who set this when."

Prefer the first option if it's cheap to wire — the audit attribution is genuinely useful for staff coordination.

---

## 5. Where this also appears

The override propagates automatically:

| Surface | Behaviour after override is set |
|---|---|
| Request Summary / Added Hotels card | Shows override date in the Free cancellation badge (this page) |
| FE proposal preview modal (sidebar) | Same — reads `effectiveCancelDeadline` |
| Send Offer dual-preview PDF | PDF "Free Cancellation / Cancel before…" badge shows the override date |
| Downloaded PDF | Same |
| Customer email | Same (PDF attachment carries the override) |

No special handling needed in any of these — they all read `effectiveCancelDeadline` from the same proposal response.

---

## 6. Verification

After your changes ship, verify by:

1. Open any proposal with a hotel that has `freeCancellation: true` and a `cancelDeadline` more than 7 days out.
2. Click the edit icon, change the date to 3 days earlier than the supplier date, save.
3. Reload the page — confirm the new date is shown.
4. Open the Send Offer modal — confirm the PDF preview shows the override date.
5. Click edit again, try to set a date AFTER the supplier date — confirm you see the inline error and can't save.
6. Click "Clear override" — confirm the card reverts to the supplier's date.

If any of those fail, paste back the network response and I'll trace it.

---

## 7. Estimated FE work

- Card layout changes: ~1 h
- Edit modal or inline-edit component: ~2 h
- Date-picker constraints + validation: ~1 h
- Wire up the PATCH + GET refresh: ~1 h
- Audit attribution line (if cheap to add): ~30 min
- QA + edge cases: ~1.5 h

**Total: ~7 hours, or 1 working day.**

---

## 8. Future change worth flagging

If product wants to relax the "must be earlier" rule (option 2 in the QA report — "let staff override later with a warning"), it's a 1-line BE change in `proposals.service.ts updateHotelCancellation`. Easy switch later if Oliver wants it. Right now we ship the safer-default to avoid accidental SETT-side losses.

---

## 9. Anything to ask back?

If any of the API shape is awkward for the FE — for example, you'd prefer the `effectiveCancelDeadline` to NOT be added by the BE and the FE computes it client-side — say so and we'll adjust. Right now I've defaulted to "BE computes the derived value" so you can render one field directly without conditional logic.
