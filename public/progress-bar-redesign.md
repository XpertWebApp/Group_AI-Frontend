# Add-Hotel Page — Progress Bar Redesign (FE Handover)

**Author:** Backend (Neha) → Frontend
**Date:** 2026-05-21
**Status:** Ready to build — no backend changes required for v1
**Scope:** Visual + UX redesign of the "search progress" widget on the Add Hotel page only.

---

## 1. Background — why we are redoing this

QA's remark on the current widget:

> "The user might get confused about the **Remaining** counter, because we search in batches of 200 and sometimes the number may change as the search widens to other star categories."

That's a real issue. The "Remaining" number today is computed as `cursor.totalCandidates − probedCount`, but `totalCandidates` is **only the candidate count inside the current star band**. When the search auto-widens (e.g. requested 3★ → expands to 3.5★ → 4★ → 2.5★ → 2★ per Oliver's expanding-ring rule), `totalCandidates` is **replaced**, not added to, so the user sees the bar "reset" without explanation. That's confusing.

Oliver also wants the widget to **reflect the SETT brand** (Brand Guidelines v2, §2 / §5 / §7) — green/navy palette, animation, modern polish, the feel of a delivery-tracker.

The redesign solves both: a delivery-tracker style timeline that **never lies about totals** (no "Remaining N" number; instead progress is shown by **steps** + **viable hotels found**) and that uses the SETT palette/typography/motion per the brand spec.

The data the FE needs is already produced by the backend. **This is a pure FE task.**

---

## 2. What you can rely on from the backend (no changes needed)

### 2.1 Polling endpoint — the primary data source

`GET /api/v1/requests/:id/hotel-search/status`

**Auth:** Bearer JWT (same as everywhere else)
**Recommended poll interval while phase = `in_progress`:** 1.5 s
**Stop polling when:** `summary.phase === 'settled' || summary.phase === 'exhausted'`. After that, only re-poll on user-driven events (Search More click).

**Response shape (verbatim from [hotelSearch.controller.ts:247](../../src/controllers/hotelSearch.controller.ts#L247)):**

```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "summary": {
      "total":     12,
      "queued":    0,
      "running":   3,
      "completed": 6,
      "skipped":   2,
      "failed":    1,
      "phase":     "in_progress"
    },
    "jobs": [ /* per-hotel probe rows, see §2.2 */ ],
    "canSearchMore": false
  },
  "message": "Probe status"
}
```

**Field meanings:**

| Field | What it means | UI use |
|---|---|---|
| `summary.total` | Probe-jobs ever queued for this search | Denominator if you want a "X / Y probed" pill — see §3 cautions |
| `summary.queued` | Waiting to start | Counts toward "in flight" |
| `summary.running` | Actively probing WBE right now | Counts toward "in flight" — animate these |
| `summary.completed` | **Viable** — hotel responded with availability we can sell. **This is the success metric.** |
| `summary.skipped` | Hotel responded but couldn't fit the group (capacity/policy). Not a failure, just not usable for this request |
| `summary.failed` | API error / supplier blocked / not group-allowed |
| `summary.phase` | Lifecycle signal. `in_progress` = search active. `settled` = search ended with at least 1 viable. `exhausted` = search ended with **zero** viable, request flagged for manual handling | Drives header copy + bar state |
| `canSearchMore` | If true, render the **Search More Hotels** button. Backend computes this exactly (see §2.4). **Do not compute it yourself.** |

**Derived counts you can compute client-side:**

```ts
const inFlight = summary.running + summary.queued;
const evaluated = summary.completed + summary.skipped + summary.failed; // terminal probes
const viable = summary.completed;
const successRate = summary.total > 0 ? viable / summary.total : 0;
```

### 2.2 The `jobs[]` array — per-hotel detail rows

Each job is a `HotelProbeJob` row with enriched `resultJson`. Shape (the fields the FE cares about):

```ts
type ProbeJob = {
  id: string;
  hotelCode: string;
  status: 'QUEUED' | 'PROBING' | 'COMPLETED' | 'SKIPPED_INSUFFICIENT' | 'FAILED' | 'RUNNING';
  startedAt: string | null;   // ISO
  completedAt: string | null; // ISO
  note: string | null;        // sometimes populated on SKIPPED/FAILED with the reason
  resultJson: {
    hotelCode: string;
    hotelName?: string;
    starRating?: number;        // the hotel's actual star rating
    imageUrl?: string | null;   // already a proxied /api/v1/hotels/image?key=... URL
    imageUrls?: string[];       // GIATA + WBE fallbacks, priority order
    descriptions?: { en?: string; de?: string };
    capacityStatus?: 'CONFIRMED' | 'LIMITED'; // when COMPLETED
    // …pricing fields when COMPLETED
  } | null;
};
```

**Status display mapping (use exactly these labels):**

| API status | FE label | Color | Icon |
|---|---|---|---|
| `QUEUED` | "Queued" | grey #686868 | hourglass outline |
| `PROBING` / `RUNNING` | "Checking…" | navy #071C42 | pulsing dot or spinner |
| `COMPLETED` | "Available" | green #AAC737 | check |
| `SKIPPED_INSUFFICIENT` | "Not available for this group" | grey #686868 | dash |
| `FAILED` | "Couldn't reach" | grey #686868 (de-emphasize) | small alert outline |

### 2.3 SSE live stream — optional but recommended

`GET /api/v1/requests/:id/hotel-search/events` (text/event-stream)

The backend emits **only three event types**, all keyed by `requestId`:

| Event | Payload | When |
|---|---|---|
| `connected` | `{ requestId, message }` | On initial subscribe |
| `searchRelaxed` | `{ requestId, fromLevel, toLevel, iteration }` | Star band just widened (ring tier advance) |
| `searchSettled` | `{ requestId, finalLevel, successCount, totalCount }` | Search ended with viable results |
| `searchExhausted` | `{ requestId, finalLevel }` | Search ended with zero viable |

Plus a keep-alive `: ping` comment every 20 s.

**Important:** there is **no per-probe SSE event** today. Per-hotel updates only arrive when you poll `/status`. SSE is for the **lifecycle transitions** — use it to:

1. Show a brief "Widening search to include 3.5★ hotels…" toast on `searchRelaxed`.
2. Immediately flip the bar to the **settled** or **exhausted** end-state without waiting for the next poll tick.

**Wiring pattern:**

```ts
const es = new EventSource(`/api/v1/requests/${id}/hotel-search/events`);
es.addEventListener('searchRelaxed', (e) => {
  const { fromLevel, toLevel } = JSON.parse(e.data);
  showRelaxToast(fromLevel, toLevel);
  refreshStatus(); // immediate re-poll
});
es.addEventListener('searchSettled', () => { refreshStatus(); stopPolling(); });
es.addEventListener('searchExhausted', () => { refreshStatus(); stopPolling(); });
// fall back to polling if SSE drops; don't double-act on the same event
```

EventSource auto-reconnects. JWT can't be set as a header — if your gateway needs auth on SSE, append `?token=…` and verify server-side, **or** rely on cookie auth. (Backend SSE endpoint currently accepts the same auth middleware as the rest of `/api/v1/requests/:id/*`.)

### 2.4 Search More endpoint

`POST /api/v1/requests/:id/hotel-search/more`
Body: `{}` (empty is fine; backend reads cursor)

Returns one of:

```ts
{ decision: 'queued',                 queuedCount, nextOffset, sseEndpoint, statusEndpoint }
{ decision: 'destination_exhausted',  message, queuedCount: 0, nextOffset }
{ decision: 'in_progress',            message }   // another search already running
{ decision: 'no_cursor',              message }   // no fresh search has run yet
{ decision: 'exhausted',              message }   // phase already exhausted
```

On `queued`: flip the bar back to **in_progress** state, resume polling. Backend re-broadcasts `searchSettled` when the new batch finishes.

`canSearchMore` (from `/status`) is the single source of truth for whether to render the button. If it's `true`, show; if `false`, hide. Don't second-guess with your own arithmetic — the backend already handles the ring-widening case (`canSearchMore` is true when the current band is drained but a wider star tier is still available).

---

## 3. Cautions — why the old "Remaining" was misleading

This is the heart of QA's complaint. Read this before designing.

1. **`summary.total` grows as the search widens.** Each ring-tier expansion enqueues more probes. A request that started at 3★ with 60 candidates can balloon to 200 → 400 as we widen to 3.5★ → 4★ → 2.5★ → 2★. A naive "X / Y probed" pill where Y changes mid-flight will feel like a regression.
2. **`completed` is what the user actually cares about.** They want hotels they can offer to the customer. "12 hotels found" is a meaningful number; "evaluated 47 / 60 candidates" is engineering trivia.
3. **Skipped is not failure.** Capacity-skips are normal (a 3-room boutique can't host a 40-person group). Don't let those drag the bar down or look red.
4. **The search auto-widens silently** unless you surface `searchRelaxed`. The user sees the bar progress reset and gets nervous. Surface the widening clearly — "expanding search to 3.5★" is good news, not bad.

**Recommendation for v1:** drop the "Remaining" number entirely. Replace with a **"Hotels found"** count (= `summary.completed`) as the headline, plus a small "still checking N hotels" line under it (= `inFlight`). When that "still checking" hits zero AND phase flips to `settled`/`exhausted`, the search is done.

---

## 4. The redesigned widget

### 4.1 Look & feel — locked to Brand Guidelines v2

From the brand guide [SETT-Hub-Brand-Guidelines-v2 (1).pdf](../../src/publicfiles/SETT-Hub-Brand-Guidelines-v2%20(1).pdf), pinned values:

```css
:root {
  --sett-green:       #AAC737;  /* primary accent, viable count, success */
  --sett-green-dark:  #7A9420;  /* hover, depth */
  --sett-green-light: #C8E050;  /* gradient highlight, glow */
  --sett-green-tint:  #F5F9E8;  /* active row bg (§5.2) */
  --sett-navy:        #071C42;  /* primary bg for hero / sidebar / track */
  --sett-grey:        #686868;  /* body text, muted labels */
  --sett-bg-light:    #F8F9FA;  /* alt rows, content surface (§7.1) */
  --sett-border:      #E0E0E0;  /* 1px borders */
  --sett-white:       #FFFFFF;
}

/* §2 forbidden — never use red, orange, purple anywhere in this widget */
```

**Typography** (Montserrat throughout per §3):

| Element | Weight | Size | Color | Notes |
|---|---|---|---|---|
| Headline ("Searching for hotels") | 800 | 22–28 px | navy | sentence case |
| Big viable count ("12") | 800 | 48 px | green | KPI hero number |
| "Hotels found" label | 600 | 11–13 px | navy | UPPERCASE, letter-spacing 0.1em |
| Step labels | 600 | 12 px | navy / grey | UPPERCASE, letter-spacing 0.05em |
| Tooltip body | 400 | 13 px | grey #686868 | |
| Per-job row hotel name | 600 | 14 px | navy | |
| Per-job row status | 400 | 12 px | grey | |

### 4.2 Layout — "delivery tracker" pattern

The widget sits at the top of the Add Hotel page (where the current progress bar lives). It has three stacked zones:

```
┌────────────────────────────────────────────────────────────────────┐
│ ZONE A — HERO STAT                                                 │
│                                                                    │
│   ┌──────┐                                                         │
│   │ 1 2  │   HOTELS FOUND                  [Search More Hotels]   │
│   │      │   Searching 3★, 3.5★ hotels in Berlin…                  │
│   └──────┘                                                         │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ZONE B — STEP TIMELINE (the "tracking" part)                       │
│                                                                    │
│   ● ─────── ● ─────── ◐ ─ ─ ─ ─ ○ ─ ─ ─ ─ ○                       │
│   STARTED   SEARCHING  WIDENING   FINDING    READY                 │
│             WBE        STARS      DEALS                            │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│ ZONE C — LIVE LIST (existing per-hotel rows, restyled)             │
│                                                                    │
│   🏨 Hotel A           ✓ Available           €1,240/night          │
│   🏨 Hotel B           ⟳ Checking…                                 │
│   🏨 Hotel C           — Not available for this group              │
│   …                                                                │
└────────────────────────────────────────────────────────────────────┘
```

**Zone A — Hero stat**

- **Big number** on the left: `summary.completed`. Color #AAC737. Animate it counting up when it increments (e.g. Framer Motion `animate={{ scale: [1, 1.15, 1] }}` on change, 250 ms).
- **Label below the number:** uppercase `HOTELS FOUND`.
- **Sub-line:** "Searching `<starRating>` hotels in `<destinationName>`…" while in progress. On settled: "Found <N> hotels in <destination>." On exhausted: "No hotels matched — flagging for manual handling."
- **Right side:** the **Search More Hotels** button (existing CTA). Only render when `canSearchMore === true`.

**Zone B — Step timeline**

This is the "delivery tracker" feel. **Five fixed steps**, never changing labels (this avoids the "Remaining" confusion entirely — no mutable totals are shown):

| # | Label | Active when |
|---|---|---|
| 1 | STARTED | Always immediately on page load (always green) |
| 2 | SEARCHING WBE | `summary.total > 0` (probes have been enqueued) |
| 3 | WIDENING STARS | Last `searchRelaxed` SSE event fired within last 30 s, OR `cursor.starRatings.length > requestedStars.length` (BE doesn't expose this yet — for v1, just light it up on `searchRelaxed`) |
| 4 | FINDING DEALS | `summary.completed > 0` |
| 5 | READY | `summary.phase === 'settled'` |

**Step visual states:**

- **Complete** — filled green circle (#AAC737) with white check, solid green line trailing to it.
- **Active** — green circle outlined, filled with soft green pulse animation (1.5 s `box-shadow` ripple using `--sett-green-light` at 30 % alpha). Dashed line trailing.
- **Pending** — grey outline circle (#E0E0E0), dashed grey line.

For `phase === 'exhausted'`: step 5 becomes a **navy** circle (not green) labeled "MANUAL REVIEW" — clear signal that auto-search didn't satisfy, a human will pick up.

**Step animation** — sequence is irreversible (once green, stays green). When advancing, animate:
1. The connecting line fills from left to right (300 ms ease-out).
2. The destination circle pulses once (scale 1 → 1.15 → 1, 200 ms).
3. The next active step starts its pulse.

**Zone C — Live list**

Already exists in some form on the page. Apply the brand restyle:

- Card per hotel, navy left-border 3 px (per §5.3 "accent emphasis cards") only on `COMPLETED` rows; grey border for others.
- Row background `#FFFFFF`; on hover, `#F5F9E8` (active-row tint per §5.2).
- Status pill, right-aligned, color-coded per §2.2 table.
- Hotel thumbnail on the left (use `resultJson.imageUrl`; falls back through `imageUrls[]` automatically — render the first that loads, with the standard placeholder if all fail).
- Star rating shown as small filled-star icons (#AAC737).

### 4.3 Hover interactions

Per the user's request — hovering should reveal more detail with animation. Two layers:

**(a) Hovering a step in Zone B**

A tooltip slides down from the step (200 ms ease-out, slight blur backdrop). Content varies by step:

| Step | Tooltip content |
|---|---|
| STARTED | "Search started at HH:MM. Looking for `<N>`-star hotels in `<destination>` for `<groupSize>` guests." |
| SEARCHING WBE | "We're querying our supplier network. <N> hotels checked, <inFlight> still in flight." |
| WIDENING STARS | "Started with `<requestedStars>`★. Now also checking `<wider>`★ to find more options for the group." |
| FINDING DEALS | "<viable> hotels available so far. Top match: <topHotelName>." |
| READY | "Search complete. Pick a hotel below to add to the offer." OR (exhausted) "No viable hotels at this destination/dates/budget. Try editing the request or use Show Alternatives." |

Tooltip styling: navy background `#071C42`, white text, 8 px radius, drop shadow `0 4px 16px rgba(0,0,0,0.12)`, max-width 320 px, arrow pointing to the step.

**(b) Hovering a hotel row in Zone C**

The row gently elevates (translate-y −2 px, shadow grows from `0 1px 2px rgba(0,0,0,0.04)` to `0 6px 18px rgba(7,28,66,0.10)`, 180 ms). On `COMPLETED` rows, a small expand chevron appears on the right — clicking opens the existing hotel detail drawer.

### 4.4 3D / depth touches

The brand guidelines don't prescribe 3D, but they do allow **subtle elevation** (§5.3 "subtle shadow `0 2px 8px rgba(0,0,0,0.08)`"). Suggested 3D-feeling polish, **without leaving brand**:

- **Hero card** — soft gradient bg `linear-gradient(135deg, #FFFFFF 0%, #F5F9E8 100%)`, 1 px border `#E0E0E0`, shadow `0 4px 24px rgba(7,28,66,0.06)`. Big number gets a very subtle text-shadow `0 2px 0 rgba(122,148,32,0.12)` to lift it.
- **Step circles** — radial gradient on the filled state: `radial-gradient(circle at 30% 30%, #C8E050, #AAC737 70%)` so each circle reads as a slightly raised "bead" on the track.
- **Track line** — under the steps, a 2-pixel groove (top 1 px `#E0E0E0`, bottom 1 px `#FFFFFF`) gives the line a recessed feel; the progress fill paints over it in `#AAC737`.

**Do not** add: drop shadows in red/orange/purple, neumorphism with heavy shadows, glassmorphism with off-brand color tints, animated illustrations beyond Lottie checkmarks. Brand guide §2 forbids non-palette colors anywhere.

### 4.5 Icons — use Lucide (matches the existing toolset)

| Concept | Icon |
|---|---|
| Search started | `Rocket` or `Search` |
| Searching WBE | `Globe` |
| Widening stars | `Star` (animated outline → filled) |
| Finding deals | `BadgeCheck` |
| Ready | `CheckCircle2` |
| Manual review (exhausted) | `Hand` |
| Hotel row available | `CheckCircle2` (filled, green) |
| Hotel row checking | small spinner (`Loader2` with `animate-spin`) |
| Hotel row not for group | `MinusCircle` (outline, grey) |
| Hotel row failed | `AlertCircle` (outline, grey — not red, per §2) |

### 4.6 Group Offer logo

Per §4.5 and §4.2 of the brand guide, the **AI Group Booking Tool UI** uses the **24H Group Offer logo** (`Group-offer--big-2.png`). If the Add Hotel page header doesn't already show it, this is a chance to put it in the top of the widget card at small size (height ≤ 32 px). Don't crop or stretch — original is 1875×625, 3:1 aspect.

### 4.7 The Search More button

Existing button — restyle per §5.1:

```css
background: #AAC737;
color: #071C42;
font-weight: 700;
padding: 14px 32px;
border-radius: 4px;
text-transform: uppercase;
letter-spacing: 0.08em;

/* hover */
background: #7A9420;
transition: background 0.2s ease;
```

After clicking, switch the button to a **disabled "Searching for more…"** state while polling resumes; re-enable when `canSearchMore` becomes true again (or hide if it stays false → destination exhausted).

---

## 5. State machine the widget should implement

```ts
type WidgetState =
  | { kind: 'idle' }                                                // page just opened, no search yet
  | { kind: 'initializing' }                                        // POST /hotel-search fired, awaiting first /status
  | { kind: 'searching'; activeStep: 1|2|3|4 }                      // phase=in_progress
  | { kind: 'settled'; viableCount: number; canSearchMore: boolean }
  | { kind: 'exhausted' }                                           // manual handling needed
  | { kind: 'searchingMore' };                                      // user clicked Search More
```

**Transitions:**

| From | Event | To |
|---|---|---|
| idle | user submits request → POST /hotel-search returns 202 | initializing |
| initializing | first /status with `summary.total > 0` | searching (step 2) |
| searching | SSE `searchRelaxed` | searching (step 3) |
| searching | /status `summary.completed > 0` | searching (step 4) |
| searching | SSE `searchSettled` OR /status `phase=settled` | settled |
| searching | SSE `searchExhausted` OR /status `phase=exhausted` | exhausted |
| settled | user clicks Search More → POST /more returns `queued` | searchingMore |
| searchingMore | SSE `searchSettled` OR /status `phase=settled` | settled (refresh counts) |
| searchingMore | /more returns `destination_exhausted` | exhausted |
| settled | user clicks Search More → /more returns `destination_exhausted` | settled (hide button, optional toast "No more hotels available") |

### 5.1 Polling discipline

- Open `/events` EventSource immediately.
- Poll `/status` every **1500 ms** while widget state ∈ {initializing, searching, searchingMore}.
- Stop polling on settled / exhausted.
- On any SSE event, re-poll `/status` immediately (1 tick) to refresh counts, then reset the 1500 ms cadence.
- On page hide (`document.visibilitychange`), pause polling; resume on show.
- Backoff to **4 s** if `/status` errors twice in a row, with a small "Connection issue — retrying…" subline (grey text, no scary banner).

---

## 6. Edge cases / what to show

| Situation | Detection | Widget shows |
|---|---|---|
| User opens page before any search has run | first /status returns `summary.total === 0 && phase === null` | "Search not started yet" hero, steps all pending, no Search More button |
| Search returns zero viable hotels | `phase=exhausted` | Hero number `0` in **navy** (not green) + "No hotels matched" subline + the existing **Show Alternatives** CTA + a soft alert tile suggesting "Edit Request" |
| Search was relaxed multiple times | multiple `searchRelaxed` events | Step 3 stays active and the tooltip says "Now checking 3★, 3.5★, 4★ hotels" (concatenate via `cursor.starRatings` exposed in nothing today — so for v1, just track tiers client-side from the SSE payloads) |
| Stale / orphaned in_progress (rare; BE has a watchdog) | `phase=in_progress` but no completed/queued/running movement for > 90 s | Show a soft warning under the steps: "Taking longer than usual — refresh the page if it stays here for another minute." Don't block. |
| User leaves and comes back | mount-time /status returns `phase=settled` | Skip the animation; render the end state directly with no step pulses |
| Network drop | EventSource auto-reconnects; polling errors | Subtle grey "Reconnecting…" text under hero; no full-page error |
| Search More clicked then 409 / in_progress | /more returns `{ decision: 'in_progress' }` | Button briefly shakes (200 ms x-translate ±3 px); toast "A search is already running." Disable button until next settled. |

---

## 7. Accessibility (please don't skip)

- `role="status"` + `aria-live="polite"` on the hero stat — viable-count changes are announced.
- Each step is a `<li>` in an ordered list. Active step has `aria-current="step"`.
- Tooltips are `role="tooltip"`, focusable via keyboard (steps are `<button>` so Tab + Enter / Space opens; Esc closes).
- All color signals also have icon/text — don't rely on green-vs-grey alone.
- Reduced-motion: respect `prefers-reduced-motion`. Replace pulses and slides with instant transitions; keep the data the same.

---

## 8. What is explicitly NOT in scope

- ❌ **No new backend endpoints** for v1. Everything you need is already on `/status` + `/events`.
- ❌ **No changes to the existing hotel detail drawer.** Just hover-elevate the row and keep the existing click-to-open.
- ❌ **No new translation keys** — reuse existing FE i18n, or hard-code en/de if the page doesn't have i18n hooks yet (we'll add to the next pass).
- ❌ **No 3D WebGL / Lottie-heavy graphics** — subtle CSS shadows + Framer Motion only. Performance must stay snappy on a 4-row list and a 20-row list alike.

---

## 9. If you (FE) decide you need more backend data

We have not exposed these fields today but can in a follow-up if the UI needs them. Ping me with a one-liner request and I'll add them in a small PR:

- **`ringTier`** — `{ requested: number[], current: number[], maxReached: number[] }` so step 3 tooltip can show exactly which stars are in scope right now.
- **`destination.name`** — already on the request object, but if it's not in the status response you can pull it from `GET /api/v1/requests/:id` (cached).
- **`startedAt` / `elapsedMs`** — for the "Search started at HH:MM" tooltip; for v1 you can compute on the FE from the first /status response.
- **Per-probe SSE event** — currently no per-job push. Adding `hotelProbed` events is feasible (small backend lift) if 1.5 s polling feels too laggy.

---

## 10. Verification checklist for FE

Before requesting QA review:

- [ ] Hero number animates from 0 → final count smoothly, never decreases mid-search.
- [ ] All five steps light up in order (STARTED → SEARCHING WBE → WIDENING STARS [if relaxation happens] → FINDING DEALS → READY).
- [ ] On `phase=exhausted`, step 5 is navy not green, copy says "Manual Review", and Show Alternatives CTA is rendered.
- [ ] No "Remaining N" number anywhere on the widget.
- [ ] Hovering each step opens its tooltip; tab through steps with keyboard works.
- [ ] Hovering a hotel row lifts it; click opens the existing detail drawer unchanged.
- [ ] Search More button respects `canSearchMore` exactly (no client-side guessing).
- [ ] Forbidden colors absent (no red, orange, purple anywhere). Verify with browser inspector on every state.
- [ ] Reduced-motion media query disables pulses + slides.
- [ ] SSE drops and 502s don't crash the widget; it falls back to polling and recovers.
- [ ] EN and DE labels render at correct lengths without wrapping the steps.
- [ ] Lighthouse a11y score ≥ 95 for the widget area.

---
