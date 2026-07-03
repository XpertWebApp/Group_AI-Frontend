# Room Availability Badge — Frontend Handover

**Audience:** Frontend developer (Shamandeep)
**Author:** Backend (Neha)
**Date:** 2026-07-04
**Scope:** Replace the vague "Limited Capacity" / "Not many rooms" chip on hotel search-result cards with an explicit room-count badge, per the client's Phase 1 feedback point 1.

---

## 1. Why this change is happening

The client raised in the Group AI Tool Report:

> *"The system must stop returning generic messages such as 'Limited availability' / 'Not many rooms'. These messages are not useful for group sales. We need the actual number of available rooms — or at least a reliable indication whether the requested room count can be fulfilled — otherwise we risk offering hotels that cannot accommodate the group."*

The backend already computes the exact numbers. The FE just isn't displaying them. This ticket surfaces the numbers the BE already returns.

---

## 2. No backend changes needed

Every field below is already on the hotel search-result row you receive from `POST /api/v1/requests/:id/hotel-search` (and the alternatives / additional-candidates variants). You're already parsing this response for the card layout; you just need to read a few more fields.

**Response shape (relevant fields only):**

```ts
interface HotelSearchResponse {
  requestId: string;
  sessionId: string;
  finished: boolean;
  totalRoomsRequested: number;   // ← total rooms the customer asked for
  results: HotelResult[];
  alternativeResults: HotelResult[];
  summary: {
    total: number;
    included: number;
    flagged: number;
    omitted: number;
  };
}

interface HotelResult {
  hotelCode: string;
  hotelName: string;

  /**
   * The capacity verdict for this hotel.
   *
   *  - 'include'  → hotel can confidently fulfil the requested room count.
   *                 Green/neutral badge. No warning needed.
   *  - 'flag'     → risky (BE says 70–100% coverage, inventory overlap
   *                 possible). Amber warning badge. This is the case
   *                 the client screenshot shows as "Limited Capacity".
   *  - 'omit'     → cannot fulfil the group size. You won't see these
   *                 rows in `results` (BE filters them out), but they
   *                 may appear in `alternativeResults` — treat as a
   *                 red warning.
   */
  status: 'include' | 'flag' | 'omit';

  /**
   * The number of rooms this hotel can confidently allocate to the
   * offer, after supplier caps and inventory-overlap safety checks.
   * Always populated. THIS IS THE X in "X of Y rooms available".
   */
  roomsAllocated: number;

  /**
   * Total supplier claim across all usable group-allowed suppliers
   * for this hotel — before overlap-safety trim. Usually equal to or
   * larger than `roomsAllocated`. Show as tooltip context if needed.
   */
  totalAvailableRooms: number;

  /**
   * Physical room count for the hotel from WBE static data. Often
   * null (BE data-quality gap — WBE doesn't reliably return this
   * field). When present, useful for the tooltip. Don't rely on it
   * being populated.
   */
  totalRooms: number | null;

  /**
   * True when supplier inventory feeds may overlap (i.e. two
   * suppliers reporting the same physical rooms). If the total
   * supplier claim exceeds this cap, the BE trims to protect against
   * double-booking. When true, add the muted "inventory overlap
   * possible" secondary line — see §3.2 State 2.
   */
  inventoryOverlapFlag: boolean;

  /**
   * Human-readable diagnostic from the BE explaining why the hotel
   * got the status it did. Use verbatim as tooltip text on the
   * warning icon. May be null for 'include' status.
   */
  note: string | null;

  /* …other fields you already use (hotelName, imageUrl, star rating,
     bestOption, supplierSplit, etc.) unchanged… */
}
```

**Where each number comes from:**

| Display need | Field |
|---|---|
| Total rooms requested (Y in "X of Y rooms") | `response.totalRoomsRequested` |
| Rooms this hotel can allocate (X) | `hotelResult.roomsAllocated` |
| Supplier-side upper bound (for tooltip) | `hotelResult.totalAvailableRooms` |
| Physical hotel room count (for tooltip, if not null) | `hotelResult.totalRooms` |
| Whether to show the overlap secondary line | `hotelResult.inventoryOverlapFlag` |
| Full BE explanation (tooltip on the icon) | `hotelResult.note` |
| Which status/color to render | `hotelResult.status` |

---

## 3. UI

### 3.1 Card badge — three visual states

**State 1 — Full coverage (`status === 'include'`):**

Show the existing card with no availability badge. This is the normal case; adding a "12 of 12 rooms available" chip everywhere would be noise. Optional: replace the current per-hotel "ROOMS" column value with the same number as `roomsAllocated` for consistency (it already should match).

**State 2 — Limited capacity (`status === 'flag'`):**

Replace the current "⚠ Limited Capacity" badge with:

```
⚠ Limited Capacity
   16 of 24 rooms available across our suppliers.
   Confirm remaining capacity with the hotel before booking.
```

Where `16 = roomsAllocated` and `24 = totalRoomsRequested`.

**State 3 — Overlap warning (`status === 'flag'` AND `inventoryOverlapFlag === true`):**

Add a muted secondary line below the two above:

```
⚠ Limited Capacity
   16 of 24 rooms available across our suppliers.
   Confirm remaining capacity with the hotel before booking.
   ⓘ Some supplier inventory may overlap — actual availability could be lower.
```

**State 4 — Cannot fulfil (`status === 'omit'`, only visible in `alternativeResults`):**

For alternative-hotels that WBE returned but that can't cover the group:

```
✗ Cannot fulfil group size
   Only 4 of 24 rooms available. This hotel is shown for reference; not bookable at requested size.
```

Style with a red/critical hue rather than amber; the operator needs to see immediately that this is an alternative-only row.

### 3.2 Tooltip on the warning icon

For all three warning states (`flag` or `omit`), a hover/tap tooltip on the `⚠` or `ⓘ` icon should show `hotelResult.note` verbatim. Example BE-generated notes:

- `"Only ~16 rooms across suppliers (requested 24). Inventory overlap possible."`
- `"Insufficient capacity: ~4 rooms available, 24 requested."`
- `"Room inventory unverified — confirm directly with hotel."`
- `"Inventory overlap detected — capped at 60% of hotel physical capacity (30 rooms)."`

These are already customer-conservative and staff-actionable. Don't reword them on the FE.

### 3.3 Where to put the badge on the card

Follow the visual weight of the existing "Free Cancellation" green chip on the top-right of each card. The availability badge should sit next to or below it — same chip width, same icon size, but in your amber/warning colour. If both cancellation and availability warnings are relevant, stack them vertically with the availability warning first (it's more actionable).

### 3.4 What NOT to show

- **Never show `supplierSplit`, `bestOption.supplierCode`, or per-supplier room counts** on the customer-facing card. Those are internal — the client wants a single availability answer, not a supplier breakdown. Keep the supplier chip you already render (e.g. "HBA", "EANRP") separate from the availability messaging.
- Don't display `totalAvailableRooms` as the primary number — it's the pre-safety-trim upper bound and can be misleading. Always show `roomsAllocated` as the headline count.
- Don't attempt to compute `X of Y` yourself from the room breakdown JSON — use the BE-provided `roomsAllocated` field. The BE runs supplier caps + overlap safety trims that the FE can't replicate.

---

## 4. Copy notes

| BE state | Old copy (drop) | New copy |
|---|---|---|
| `flag` | "Limited Capacity" | "**X of Y rooms available across our suppliers.** Confirm remaining capacity with the hotel before booking." |
| `flag` + `inventoryOverlapFlag` | (no secondary line) | "ⓘ Some supplier inventory may overlap — actual availability could be lower." |
| `omit` (alternative) | "Not enough rooms" | "**Only X of Y rooms available.** This hotel is shown for reference; not bookable at requested size." |
| `include` | (no badge) | (no badge) |

Keep the numbers bold so staff can scan the card and get the availability read in one glance.

**German version** — the BE hasn't localised these labels yet (they're client-facing strings you construct on the FE). Use:

| English | German |
|---|---|
| Limited Capacity | Begrenzte Kapazität |
| X of Y rooms available across our suppliers. | X von Y Zimmern über unsere Lieferanten verfügbar. |
| Confirm remaining capacity with the hotel before booking. | Bitte bestätigen Sie die verbleibende Kapazität direkt beim Hotel vor der Buchung. |
| Some supplier inventory may overlap — actual availability could be lower. | Einige Lieferantenkontingente könnten sich überschneiden — die tatsächliche Verfügbarkeit könnte niedriger sein. |
| Cannot fulfil group size | Gruppengröße nicht erfüllbar |
| Only X of Y rooms available. This hotel is shown for reference; not bookable at requested size. | Nur X von Y Zimmern verfügbar. Dieses Hotel dient nur zur Referenz und ist in der angefragten Gruppengröße nicht buchbar. |

---

## 5. Edge cases

| Case | What to do |
|---|---|
| `roomsAllocated === totalRoomsRequested` and `status === 'flag'` | Trust the BE — status is the source of truth, not the ratio. Show the warning badge. This happens when overlap is suspected but not confirmed. |
| `roomsAllocated > totalRoomsRequested` and `status === 'include'` | Display as normal include, no badge. The hotel has surplus capacity. |
| `roomsAllocated === 0` and `status === 'flag'` | Should be rare — treat visually as `omit` (red critical, "Cannot fulfil"). BE may occasionally return a zero-alloc row for edge-case display. |
| `totalRoomsRequested === 0` | Should never happen; if it does, log a console warning and hide the badge (don't show "X of 0"). |
| `note` is null on a `flag` row | Fallback tooltip: "Availability is limited — confirm with the hotel before booking." |
| `hotelResult.totalRooms` is null | Don't display it. Only surface the physical room count in the tooltip when the BE has it. |

---

## 6. Verification

After your changes ship, verify by:

1. Open a hotel search where at least one hotel returns with `status: 'flag'`. Confirm the card shows the new **"X of Y rooms available"** badge, not the old "Limited Capacity" copy.
2. Hover the ⚠ icon — the BE-provided `note` string should appear as a tooltip.
3. Open a search where a hotel returns `inventoryOverlapFlag: true`. Confirm the third muted line about supplier overlap appears.
4. Check an `include`-status hotel in the same result set. Confirm no availability badge is shown (only the existing Free Cancellation chip if applicable).
5. If your UI shows `alternativeResults`, confirm any `omit`-status card there displays the red "Cannot fulfil" badge with the exact room count.
6. Switch language to German. Confirm all four copy blocks render in German.
7. Change the search to request 6 rooms in a destination where hotels commonly have small inventory. Confirm the badge counts scale correctly (e.g. "4 of 6", not "4 of 24" from a previous search — the total should reflect THIS search's request).

If any of the above fails, share the API response JSON and I'll trace it.

---

## 7. Estimated FE work

- Read three new fields (`roomsAllocated`, `totalAvailableRooms`, `inventoryOverlapFlag`, `note`) from the existing response — 30 min
- Build the badge component with the four visual states — 1.5 h
- Wire the tooltip to `hotelResult.note` — 30 min
- German copy — 30 min
- QA + edge cases — 1 h

**Total: ~4 hours.**

---

## 8. Out of scope

- Changing the 70% BE threshold that decides `flag` vs `omit` — that's Oliver's call.
- Letting staff "force-add" an `omit`-status hotel to the offer — separate ticket if the client wants it.
- Showing per-supplier room counts (e.g. "6 rooms from HotelBeds + 10 rooms from HyperGuest") — deliberately not exposed to keep the customer-facing view clean, and the client explicitly asked for a single availability answer.
- Backend improvements to the `totalRooms` data quality — separate ticket (see: earlier finding that all 485k hotels have `total_rooms = NULL` because WBE doesn't return that field via any endpoint we currently sync from).

---

## 9. Anything to ask back?

If the design system already has a warning-chip convention that puts secondary text somewhere other than below the label (e.g. inside the chip like `⚠ 16/24 rooms`), use that pattern instead. The functional requirement is:

- **The count must be visible without hovering.**
- **The wording must reflect what the BE actually knows** (never invent numbers or hedge with vague copy).
- **The tooltip must expose the full BE `note`** for anyone digging deeper.
