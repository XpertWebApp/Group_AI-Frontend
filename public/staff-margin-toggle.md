# Staff Margin Toggle on Search Results Card — Frontend Handover

**Audience:** Frontend developer (Shamandeep)
**Author:** Backend (Neha)
**Date:** 2026-06-26
**Scope:** Add a collapsible "View margin" section to each hotel card on the Hotel Search Results / Add to Offer page. Surfaces net rate, markup %, and margin amount to staff without leaking those to customers if they happen to be looking at the screen.

---

## 1. Why

When staff compare our portal's prices to Hub's, they need to see the underlying numbers — the net rate WBE charges us and the markup we're adding — to understand whether a gap is markup-driven or something else. Right now the card shows only the customer-facing sell price (e.g. €377/night), and the rest of the math is invisible. This blocks any informed price comparison or "what would this look like at 18% instead of 22.5%?" type questions.

The card is staff-only — customers should never see it directly — but we'd rather not have the net rate and margin permanently splashed on the screen in case a customer joins a call mid-screenshare. So: **collapsible**.

---

## 2. The BE already has everything

No BE changes. The data is already available on the FE — you're already calling these endpoints today and have the values in component state:

| Field | Source | Example value |
|---|---|---|
| `sellPrice` | Already shown as "€377.00 / night" | 377.00 |
| `buyingPrice` (a.k.a. net) | Returned by `POST /api/v1/requests/:id/hotel-search/calculate-price` alongside sell | 308.16 |
| `markupPercent` | Same response, same call | 22.5 |
| `currency` | On the hotel result row | "EUR" |
| `nights` | From the request (already loaded for the search) | 2 |
| `roomsAllocated` | On the hotel result row (or shown in the "ROOMS" column) | 4 |

If you currently throw away `buyingPrice` and `markupPercent` after computing the sell display value, **stop throwing them away** — keep them on the card's local state. That's the only data-flow change needed.

---

## 3. UI behaviour

### 3.1 Default (collapsed) state — looks identical to today

```
─────────────────────────────────────────────────────────────────────────────
  Palazzo Segreti                                       [ADD TO OFFER]
  ★★★★☆                                                 ✓ Free Cancellation
  📍 Via San Tomaso 8, 20121 Milano                       CANCEL BEFORE: 23.11.2026
  This hotel is located in the heart of Milan.

  [Internet] [Bathroom with Shower] [Tea/Coffee] [Safe] [TV] [Restaurant] [Bar] [AC]

  ┌──────────────────────────────────────────────────────────────────────┐
  │ ROOM TYPE                       ROOMS  RATE BASIS       PER NIGHT    │
  │ Standard Double Rooms             4    Free Breakfast    €377.00     │
  │ ↳ Deluxe Double Room, City View                                      │
  └──────────────────────────────────────────────────────────────────────┘

  [▸ View margin]                                              [View Details ⓘ]
─────────────────────────────────────────────────────────────────────────────
```

- One small text link **`▸ View margin`** at the bottom-left of the card (or wherever fits cleanly without crowding the existing footer).
- Use a chevron icon (`▸` / `▾`) to signal expandability.
- Subtle styling — small font, muted color (e.g. `text-gray-500` or your equivalent). It should not steal attention from the sell price.

### 3.2 Expanded state — staff can read the math

```
  [▾ Hide margin]                                              [View Details ⓘ]

  ┌─ Staff view — not shown to customer ───────────────────────────────────┐
  │                                                                        │
  │  Net rate per room/night       €308.16                                 │
  │  Markup applied                +22.5%        (configurable in Settings)│
  │  Sell rate per room/night      €377.00                                 │
  │                                                                        │
  │  ─────────────────────────────────────────────                         │
  │                                                                        │
  │  Margin per room/night         €68.84                                  │
  │  Total margin (4 rooms × 2 nights)   €550.72                           │
  │                                                                        │
  └────────────────────────────────────────────────────────────────────────┘
```

- Slide-down animation if your design system already has one — otherwise an instant show/hide is fine.
- Light-grey background (`bg-gray-50` or similar) to visually separate it from the customer-facing card content.
- A small banner at the top: **"Staff view — not shown to customer"** in slightly muted text. This is the single most important UX cue — it sets the expectation that this section is private.
- Persist the open/closed state in component-local state only — **do NOT** persist to localStorage or URL. Every page load defaults to collapsed so a forgotten screenshare from a previous session can't leak margin.

### 3.3 Computations the FE does

All client-side, no extra API calls:

```ts
const netPerNight     = buyingPrice;                                  // 308.16
const markupPct       = markupPercent;                                // 22.5
const sellPerNight    = sellPrice;                                    // 377.00
const marginPerNight  = sellPerNight - netPerNight;                   // 68.84
const totalMargin     = marginPerNight * roomsAllocated * nights;     // 550.72
const currencySymbol  = currency === 'EUR' ? '€' : currency;          // €
```

Format prices with 2 decimal places (same as the existing per-night display). Round only on display, not in storage — the underlying numbers are already integers-after-psychology so there shouldn't be floating-point oddities, but use `toFixed(2)` defensively.

### 3.4 Edge cases

| Case | What to do |
|---|---|
| `markupPercent` is missing from the response (defensive) | Hide the toggle entirely — don't show "View margin" if you can't compute margin. Log a console warning so we can spot it in QA. |
| `buyingPrice === sellPrice` (zero-markup edge case, e.g. settings misconfigured) | Show the section anyway. "Margin per room/night €0.00" is a useful signal that something is off. |
| `buyingPrice > sellPrice` (would be a bug — sell should never be below net) | Show a red warning icon next to the margin row: "Margin is negative — flag to BE". This should be impossible, but cheap insurance. |
| Card is in an "omitted" status (greyed out, can't add to offer) | Hide the toggle entirely. Margin isn't actionable on a non-bookable card. |
| User screenshots the expanded view and shares with a customer | Out of FE scope. The "Staff view" banner is the documented warning; rest is staff responsibility. |

### 3.5 Where this also applies

The same toggle should appear on **every** card that shows a sell price to staff:

- Main hotel-search results list (Palazzo Segreti card in your screenshot)
- "Alternative hotels" section (cards at adjacent star ratings)
- Re-runs / "Show more" pagination
- The "Added Hotels" panel on the Request Summary page (after a hotel has been added to the offer)

Do NOT add it to:

- The Send Offer dual-preview modal (that view is meant to simulate what the customer sees — adding margin there defeats its purpose)
- The customer-facing PDF preview
- Any email preview

If in doubt: "is this view ever shown directly to the customer?" → if yes, no toggle.

---

## 4. Visual states cheat sheet

**Collapsed (default):**
```
  ┌────────────────────────────┐
  │  ▸ View margin             │
  └────────────────────────────┘
```

**Expanded:**
```
  ┌────────────────────────────────────────────────────┐
  │  ▾ Hide margin                                     │
  │                                                    │
  │  ⚠ Staff view — not shown to customer              │
  │  ─────────────────────────────────────             │
  │  Net rate per room/night     €308.16              │
  │  Markup applied              +22.5%               │
  │  Sell rate per room/night    €377.00              │
  │  Margin per room/night       €68.84               │
  │  Total margin                €550.72              │
  └────────────────────────────────────────────────────┘
```

---

## 5. Verification

After your change ships:

1. Open the Hotel Search results page on any request. Confirm cards look identical to today, except for a small `▸ View margin` link at the card footer.
2. Click `View margin` on one card. Confirm the section expands, the "Staff view — not shown to customer" banner is visible, and the five values render correctly.
3. Verify the math: `Sell − Net = Margin per night`. `Margin per night × rooms × nights = Total margin`.
4. Refresh the page. Confirm the section is collapsed by default (no localStorage persistence).
5. Open Settings, change `defaultMarkupPercentage` from 22.5 to 18. Save. Re-run a hotel search. Confirm the margin section on each card now shows the new markup % and the recomputed margin.
6. Check an "omitted" card (one that's greyed out because it can't fulfil the group size). Confirm there's no `View margin` toggle on that card.

If any of the above fails, paste the network response (search results + calculate-price call) and I'll trace it.

---

## 6. Estimated work

| Task | Estimate |
|---|---|
| Add expand/collapse state to the existing card component | 30 min |
| Persist `buyingPrice` + `markupPercent` in card-local state (if you currently discard them) | 30 min |
| Render the expanded margin block + the "Staff view" banner | 1 h |
| Apply the same toggle to alternative-hotels list + Added Hotels panel | 1 h |
| Edge cases (missing markup, negative margin, omitted cards) | 30 min |
| QA against the verification matrix | 1 h |

**Total: ~4.5 hours, less than a working day.**

---

## 7. Out of scope

- **Editing the markup from the card.** That stays in the Settings page. If staff want a what-if calculator on the card ("show me this hotel at 15% markup"), separate ticket.
- **Per-hotel or per-supplier markup overrides.** Not supported today. The card always shows the current global markup. Separate feature.
- **Margin display on the customer-facing PDF or email.** Never. Customers should never see net or markup.
- **Margin visibility permissions** (e.g. "only managers can see margin, sales reps see only sell"). Currently all staff see the same things; if Oliver wants role-based visibility later, that's a separate ticket and probably a BE change too.

---

## 8. Anything to ask back?

If the "Staff view" banner wording is too clinical for the design system, suggest an alternative ("Internal pricing", "For staff only", etc.) and I'll align. The exact wording matters less than the visual cue.

If you'd prefer the toggle to be a full-width row below the price table rather than a small footer link, that's fine — it's a design-system call. The functional behaviour is what matters.
