# Payment Deadline on Proposal — Frontend Handover

**Audience:** Frontend developer (Shamandeep)
**Author:** Backend (Neha)
**Date:** 2026-06-26
**Backend branch:** `milestone_5v3`
**Scope:** UI to set/clear the customer **payment deadline** on a proposal — per the client's request in *Group AI Tool Report 1b*, point 4: *"We need options to customize the payment deadline."*

This is the sibling feature to the cancellation deadline override (see [cancellation-override-fe-handover.md](cancellation-override-fe-handover.md)). Same audit/lock semantics, but **one date for the whole proposal** instead of per-hotel.

---

## 1. What we built (BE side, ready)

Additive feature on the proposal:

- New nullable columns on `Proposal`: `paymentDeadline`, `paymentDeadlineSetBy`, `paymentDeadlineSetAt`
- New endpoint: `PATCH /api/v1/proposals/:id/payment-deadline`
- The customer-facing PDF and offer email now use the staff-set deadline. The redesigned PDF's "Payment Details" block (which already showed a "Please pay … by …" line) now reads from `paymentDeadline` instead of the hard-coded `checkoutDate − 30 days` legacy default.
- **The Send Offer flow now refuses to send when `paymentDeadline` is null** (for proposals created on/after 2026-06-26). This is the same protective pattern as the Odoo gate.
- Audit log entry on every payment-deadline change.

**Critical business rule:** the payment deadline must be **earlier than the earliest cancellation deadline** across all hotels on the proposal. Customer must pay before any hotel's cancellation window closes — otherwise SETT eats the supplier penalty when the customer doesn't pay in time and the free-cxl window has already elapsed.

---

## 2. API contract

### 2.1 GET `/api/v1/proposals/:id` — new fields on the response

The proposal response now includes three payment-related fields at the top level:

```json
{
  "id": "461addf9-bdba-4852-971f-7c4ab2c3f9e7",
  "status": "draft",
  "...": "...",
  "paymentDeadline":      "2026-11-15T23:59:59.000Z",
  "paymentDeadlineSetBy": "19026c5d-553d-4da9-882a-daeaeb07cb33",
  "paymentDeadlineSetAt": "2026-06-26T11:18:37.838Z",
  "hotels": [ ... ]
}
```

When unset:

```json
{
  "paymentDeadline":      null,
  "paymentDeadlineSetBy": null,
  "paymentDeadlineSetAt": null
}
```

**Which field to use where:**

| FE need | Field |
|---|---|
| Default value in the date picker | `paymentDeadline` (when null, picker is empty) |
| "Payment due: 15 Nov 2026" display on the proposal summary card | Format `paymentDeadline` to `dd.mm.yyyy` — matches the PDF + customer view |
| "Set by [name] on [date]" attribution | `paymentDeadlineSetBy` (user UUID — resolve via your existing user-cache, same pattern as cancellation override) + `paymentDeadlineSetAt` |
| Max date for the date picker | The minimum across `effectiveCancelDeadline` on every hotel in `proposal.hotels`, minus 1 day. (Each hotel already exposes `effectiveCancelDeadline` from §2.1 of the cancellation handover.) |
| Min date | Today |

### 2.2 PATCH `/api/v1/proposals/:id/payment-deadline`

**Request body** — set the deadline:

```json
{ "paymentDeadline": "2026-11-15T23:59:59.000Z" }
```

**Request body** — clear it:

```json
{ "paymentDeadline": null }
```

**Response on success (200):**

```json
{
  "success": true,
  "data": {
    "id": "461addf9-bdba-4852-971f-7c4ab2c3f9e7",
    "paymentDeadline":      "2026-11-15T23:59:59.000Z",
    "paymentDeadlineSetBy": "19026c5d-553d-4da9-882a-daeaeb07cb33",
    "paymentDeadlineSetAt": "2026-06-26T11:18:37.838Z",
    "...": "rest of the Proposal row"
  },
  "message": "Proposal payment deadline updated"
}
```

**Error responses:**

| Status | `errorCode` | When | UX |
|---|---|---|---|
| 400 | `PAYMENT_DEADLINE_IN_PAST` | Date is before today | "Date cannot be in the past." Reset picker to today. |
| 400 | `PAYMENT_DEADLINE_AFTER_CANCELLATION` | Date is on/after the earliest hotel cancellation deadline | Show inline error: "This is on or after the earliest cancellation deadline (23 Nov). Pick an earlier date." The error response includes `earliestCancellationDeadline` for reference. |
| 400 | `validation_error` | Body shape wrong (not an ISO 8601 string and not `null`) | "Invalid date format" — should never happen if FE uses a date picker. |
| 401 | `UNAUTHORIZED` | No auth token / no user | Standard auth-redirect flow. |
| 404 | `NOT_FOUND` | Proposal doesn't exist | "Proposal not found — refresh and try again." |
| 409 | `PROPOSAL_NOT_MODIFIABLE` | Proposal is in `sent` / `approved` / `declined` state | "This proposal can no longer be edited. The payment deadline can only be changed while the proposal is in draft." |
| 409 | `PROPOSAL_LOCKED` | Another user has the proposal locked | Standard lock-conflict toast, same as cancellation override. |

### 2.3 Send Offer — new gate

`POST /api/v1/proposals/:id/send` (existing endpoint) will now return:

```json
{
  "success": false,
  "status": 400,
  "code": "PAYMENT_DEADLINE_REQUIRED",
  "message": "Set a payment deadline on this proposal before sending. The customer-facing PDF and email both display \"Payment due by <date>\" and cannot be sent without it."
}
```

…if `paymentDeadline` is null **AND** the proposal was created on/after `2026-06-26`. Legacy proposals created before the cutover date still send successfully — the PDF falls back to the old "checkoutDate − 30 days" default for those.

**FE handling for this 400:** Disable the Send Offer button when `paymentDeadline === null` (don't even let staff trigger the error). If they somehow do (e.g. the proposal was created in another tab), show the BE message as a toast and scroll to the Payment Deadline field.

---

## 3. UI / UX

### 3.1 Where to put it

On the Proposal / Request Summary page, in the **proposal-level metadata section** (not on hotel cards — this is one date for the whole offer). The natural spot is next to the existing offer-level fields like "Reference Number", "Total Price", "Status". A row like:

```
Reference: SETT-54-002
Status: Draft
Total: €5,952.00
Payment Deadline: 15 Nov 2026  [pencil icon]   ⓘ Required before sending
```

If `paymentDeadline === null`, replace the date with an empty-state CTA:

```
Payment Deadline: — Not set —  [Set deadline]   ⚠ Required before sending
```

### 3.2 Edit interaction

Two designs, pick whichever fits your design system. The **modal approach** (Option B) is recommended for symmetry with the cancellation-override modal:

**Option A — Inline edit on click:**

```
Payment Deadline: 15 Nov 2026  [pencil icon]
                        ↓ click
Payment Deadline: [date picker: 15 Nov 2026]  [Save] [Cancel]
```

**Option B — Modal trigger (recommended):**

```
Payment Deadline: 15 Nov 2026  [pencil icon → opens modal]

Modal:
┌─────────────────────────────────────────────────────────────────┐
│  Set payment deadline                                        ✕  │
│                                                                 │
│  This is the date the customer must pay by. It appears in       │
│  the offer PDF and customer email.                              │
│                                                                 │
│  Earliest cancellation deadline on this proposal: 23 Nov 2026   │
│                                                                 │
│  Payment due by:  [date picker: 15 Nov]                         │
│                                                                 │
│  ⚠ Must be earlier than the earliest cancellation deadline      │
│    so the customer pays before any hotel's free-cancellation    │
│    window closes.                                               │
│                                                                 │
│  [Clear deadline]                  [Cancel]  [Save]             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 The date picker

- **Default value when opening:** `paymentDeadline` if set, otherwise empty (no default — staff must pick).
- **Min date:** today.
- **Max date:** compute client-side from `proposal.hotels[].effectiveCancelDeadline`:

  ```ts
  const earliestCxl = proposal.hotels
    .map(h => h.effectiveCancelDeadline)
    .filter(Boolean)
    .map(d => new Date(d))
    .reduce((min, d) => d < min ? d : min, new Date(8.64e15));
  // payment deadline max = earliestCxl - 1 day
  const maxDate = new Date(earliestCxl.getTime() - 24 * 60 * 60 * 1000);
  ```

  If `proposal.hotels` is empty (no hotels added yet), there's nothing to bound against — disable the picker entirely with a tooltip: "Add at least one hotel before setting the payment deadline."

- **Time component:** drop it. Show date only in the picker. Send to the BE with `T23:59:59.000Z` for end-of-day semantics — same convention as the cancellation override.
- **Validation onChange:** re-check the max-date constraint client-side and disable Save if violated. Don't rely on the BE 400 alone.

### 3.4 The "Clear deadline" button

Inside the modal (Option B) or as a secondary action (Option A) — sends `{ paymentDeadline: null }`. After clearing, the card reverts to the "Not set" empty state and Send Offer becomes disabled again.

### 3.5 Concurrency edge case

If two staff edit the same proposal at the same time, the second user gets the 409 `PROPOSAL_LOCKED` error. Surface this with the same toast you use for the cancellation override.

### 3.6 Send Offer button state

Update the Send Offer button's enabled/disabled logic to require `paymentDeadline !== null`:

```ts
const canSend =
  proposal.hotels.length > 0
  && proposal.paymentDeadline !== null
  && /* existing conditions */;
```

When disabled because of missing payment deadline, the tooltip should read: *"Set a payment deadline before sending the offer."*

---

## 4. Audit display

`paymentDeadlineSetBy` is a user UUID — resolve it to a display name the same way you do for the cancellation override (`cancelDeadlineOverriddenBy`). If your user-cache doesn't already cover it, hide the attribution and just show "Last updated DD MMM YYYY".

---

## 5. Where this also appears

The deadline propagates automatically:

| Surface | Behaviour after deadline is set |
|---|---|
| FE proposal preview modal (sidebar) | You add the field per §3.1 above |
| Send Offer dual-preview PDF | PDF "Payment Details" callout shows the new date |
| Downloaded PDF | Same |
| Customer email body | Email now shows a "Payment due by: DD.MM.YYYY" row in the details card alongside Reference + Destination |

No special handling needed in any of these — they all read `paymentDeadline` from the same proposal response.

---

## 6. Verification

After your changes ship, verify by:

1. Open any proposal with at least one hotel that has `freeCancellation: true` and a `cancelDeadline` more than 30 days out.
2. Confirm `paymentDeadline` shows as "Not set" (or empty) and the Send Offer button is disabled with the right tooltip.
3. Click the edit icon, change the date to 7 days before the earliest cancellation deadline, save.
4. Reload the page — confirm the new date is shown and Send Offer is now enabled.
5. Open the Send Offer modal — confirm the PDF preview shows the new payment deadline in the "Payment Details" callout.
6. Send the offer to yourself — confirm the email body shows "Payment due by: DD.MM.YYYY" in the details card and the attached PDF matches.
7. Click edit again, try to set a date AFTER the earliest cancellation deadline — confirm you see the inline error and can't save.
8. Click "Clear deadline" — confirm the card reverts to "Not set" and Send Offer is disabled again.
9. Open a legacy proposal created BEFORE today's date with `paymentDeadline === null`. Confirm Send Offer is still enabled (legacy fallback) and the PDF shows the old "checkoutDate − 30 days" calculated date.

If any of those fail, paste back the network response and I'll trace it.

---

## 7. Estimated FE work

- Proposal-level metadata row layout changes: ~30 min
- Edit modal component (re-use the cancellation modal as template): ~1.5 h
- Date-picker constraints + validation: ~1 h
- Wire up the PATCH + GET refresh: ~30 min
- Send Offer button disabled state + tooltip: ~30 min
- Email body verification (renders correctly on Gmail / Outlook): ~30 min
- QA + edge cases: ~1.5 h

**Total: ~6 hours, or 1 working day.**

---

## 8. Future changes worth flagging

- **Per-hotel payment deadlines.** If product wants different payment terms per hotel (e.g. one supplier demands payment earlier than another), it's a non-trivial change — would require moving the fields to `ProposalHotel` and aggregating in the PDF. Current scope is one-deadline-per-proposal per Oliver's direction.
- **Auto-compute from supplier deadlines.** We could default the deadline to (earliest cancellation deadline − N days) where N is a Settings value. Currently no automatic default — staff picks. Easy 1-day addition later if Oliver wants it.
- **Relax the "earlier than cancellation" rule.** If product wants to allow payment deadlines later than cancellation (with a warning), it's a 1-line BE change in `proposals.service::updatePaymentDeadline`. Right now we ship the safer-default to avoid accidental SETT-side losses.

---

## 9. Anything to ask back?

If the API shape is awkward for the FE — for example, you'd prefer the BE to compute and return `effectivePaymentDeadline` and `maxAllowedPaymentDeadline` so the FE doesn't have to derive `max` from hotels — say so and we'll adjust. Right now I've defaulted to "FE derives the max from hotels[].effectiveCancelDeadline" because that data is already in the proposal response.
