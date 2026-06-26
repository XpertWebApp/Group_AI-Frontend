# Nationality Field on Create Request — Frontend Handover

**Audience:** Frontend developer (Shamandeep)
**Author:** Backend (Neha)
**Date:** 2026-06-26
**Backend branch:** `milestone_5v3`
**Scope:** Add a required **Nationality** dropdown to the Create Request form (Step 1 — Trip Details), wire it into the existing `POST /api/v1/requests` flow, and surface the same field on the Edit Request modal.

---

## 1. Why this work is happening

While investigating the QA report "our portal prices don't match Hub," we traced the root cause to the backend silently defaulting to **'HU' (Hungarian)** whenever a request had no nationality. WBE returns different rate cards by nationality — so every search lacking explicit nationality has been pricing as if the group is Hungarian. That's wrong for ~95% of our requests.

The fix is to **collect nationality at request-creation time** and stop the silent default.

What I already changed on the backend:

- Validation: `POST /api/v1/requests` **now rejects** any payload missing `nationalityCode` with a 400.
- Hotel search: removed the four `?? 'HU'` defaults. New requests without nationality will throw `400 NATIONALITY_REQUIRED` when staff tries to search. Legacy requests (created before today) are grandfathered.
- New endpoint: `GET /api/v1/nationalities` returns the WBE list, cached in our DB.
- Wix webhook: accepts `nationality_code` in the payload (Wix form change is a separate task).

**Your job:** add the dropdown so staff can pick a nationality on the Create Request form — and the same on Edit Request so they can fix legacy null rows.

---

## 2. API contract

### 2.1 GET `/api/v1/nationalities`

**Auth:** none (same posture as `GET /api/v1/destinations/search`).

**Request:** no parameters.

**Response (200):**

```json
{
  "success": true,
  "data": [
    { "code": "AE", "name": "United Arab Emirates" },
    { "code": "AT", "name": "Austria" },
    { "code": "DE", "name": "Germany" },
    { "code": "ES", "name": "Spain" },
    { "code": "HU", "name": "Hungary" },
    { "code": "IT", "name": "Italy" }
    // … ~200 entries total, alphabetically sorted by name
  ],
  "message": "Nationalities retrieved"
}
```

**What the BE guarantees:**

- The list is **already alphabetically sorted by `name`** — don't re-sort on the FE.
- `code` is the WBE-canonical ISO-style code (2-letter most of the time; max 10 chars). This is the exact string we send to WBE in the search call.
- `name` may be `null` for a small number of entries. In that case render the `code` as the label and treat it as the same field for both display and search.
- The list is served from our DB, seeded from a curated static list that matches the Hub portal's nationality dropdown exactly. The contract is the same regardless of source — once WBE provides a working endpoint we'll swap the seed source with no FE change. First-ever call after deploy auto-seeds the table (one extra ~1s on the first request, then sub-50ms after).

**Cache this on the FE for the session.** It's static reference data — no need to refetch on every page navigation. A single fetch on app boot (or first time the Create Request form is opened) is enough.

### 2.2 POST `/api/v1/requests` — Create Request

**New required field:** `nationalityCode` (string, 1–10 chars).

**Sending a valid payload:**

```json
{
  "destinationId": 12345,
  "destinationName": "Madrid",
  "checkinDate": "2026-10-15",
  "checkoutDate": "2026-10-18",
  "nights": 3,
  "currencyCode": "EUR",
  "nationalityCode": "DE",
  // … the rest of the existing payload unchanged
  "rooms": { … },
  "companyName": "Acme Tours",
  "firstName": "Jane",
  "lastName": "Doe",
  "contactEmail": "jane@acme.com",
  "contactPhone": "+49 …"
}
```

**Sending an invalid payload (missing nationality):**

```json
// Request body — no nationalityCode
{ … }
```

```json
// Response (400)
{
  "success": false,
  "errorCode": "validation_error",
  "errors": [
    {
      "path": ["nationalityCode"],
      "message": "Required"
    }
  ]
}
```

You should never see this error in practice if the FE disables Submit until a nationality is picked, but it's the safety net.

### 2.3 PATCH `/api/v1/requests/:id` — Edit Request

`nationalityCode` is **optional** on the update payload (so partial edits work). When the user changes it via the Edit modal, send only the changed fields:

```json
PATCH /api/v1/requests/abc123
{ "nationalityCode": "FR" }
```

The BE persists it and the next hotel search uses the new value.

### 2.4 Hotel search behaviour

You don't call this directly — it's triggered by the existing search flow — but it's useful to know:

- If `nationalityCode` is set on the request, every search call (`POST /api/v1/requests/:id/hotel-search`, alternatives, auto-offer, additional candidates) uses it.
- If `nationalityCode` is null **AND** the request was created BEFORE 2026-06-26, the BE falls back to `'HU'` and logs a warning.
- If `nationalityCode` is null **AND** the request was created on/after 2026-06-26, the BE **throws 400** with `errorCode: NATIONALITY_REQUIRED`:

```json
{
  "success": false,
  "status": 400,
  "code": "NATIONALITY_REQUIRED",
  "message": "This request has no nationality set. Open the request, pick a nationality on the Trip Details panel, then re-run the search."
}
```

**FE handling for this error:** show the BE message in a toast/banner, and offer a "Edit Request" CTA that opens the Edit Request modal focused on the Nationality field. After the user picks a value and saves, they can retry the search.

---

## 3. UI / UX

### 3.1 Where on the Create Request form

Step 1 — **Trip Details** panel. The existing layout has:

```
[Destination*]          [Check-in*]   [Check-out*]   (nights auto)
[Star rating]           [Group type]  [Group size]   [Average age]
[Budget range]          [Currency]                   [— add here —]
```

Add **Nationality** as a required field in the same grid, ideally next to **Currency** (both are dropdowns of similar weight). Mark it with the same `*` asterisk you use for other required fields.

### 3.2 The dropdown component

The list is ~200 entries — a plain `<select>` is unusable. Use a **searchable combobox** (the same component you already use for Destination search is the closest analogue). Behaviour:

- Type-ahead filter: matches both `name` (primary) and `code` (secondary). e.g. typing "ger" should surface "Germany", typing "DE" should also surface "Germany".
- Default display: the `name`. Show the `code` as a smaller, muted suffix — useful for staff who know the codes:
  ```
  Germany (DE)
  United Arab Emirates (AE)
  Spain (ES)
  ```
- Placeholder: `"Select nationality…"`.
- Disable Submit until a value is selected. Don't pre-select anything — we deliberately removed all silent defaults.

### 3.3 Edit Request modal

Same dropdown, same behaviour, with one difference: **pre-select the current value** from the request's `nationalityCode`. If the existing request has `nationalityCode: null` (a legacy row), show the placeholder and let the staff pick.

Show a small info note for legacy null rows:

```
ⓘ This request was created before the nationality field was required.
   Pick a nationality so future searches use the correct WBE rate card.
```

You can detect legacy rows by checking `nationalityCode === null` on the loaded request — no extra API needed.

### 3.4 Submit behaviour on Create Request

- Disable the Submit button until `nationalityCode` is truthy.
- Submitting without nationality should never reach the BE — the FE form-level validation catches it first.
- If somehow the BE returns the 400 (e.g. someone bypassed the FE), surface the error against the Nationality field, not as a generic toast.

### 3.5 Existing form-state handling

If you persist Create Request draft state to localStorage (or however your current draft mechanism works), include `nationalityCode` in the persisted shape so half-filled forms restore correctly.

---

## 4. Implementation checklist

- [ ] On app boot (or first time Create Request opens), fetch `GET /api/v1/nationalities` and cache the result for the session.
- [ ] Add the Nationality field to the Create Request form (Step 1, required).
- [ ] Wire the selected `code` into the request body as `nationalityCode`.
- [ ] Add the same field to the Edit Request modal, pre-populated from the request's current value.
- [ ] Disable Submit on Create Request until a value is selected.
- [ ] Handle the search-time `NATIONALITY_REQUIRED` 400 with a "Edit Request" CTA.
- [ ] (Optional but nice) Show the `code` next to the `name` in the dropdown so power users can search by code.

---

## 5. Edge cases

| Case | What to do |
|---|---|
| `GET /api/v1/nationalities` returns an empty list | This means the WBE sync hasn't run yet. The BE auto-warms on first call, so a single retry should fix it. If still empty, show a non-blocking warning and let staff submit free-text — actually, no, just block submit and surface "Nationality list unavailable, please refresh." |
| User picks a value, then unpicks (clears the combobox) | Treat as "not selected" — disable Submit again. Don't fall back to a previous value. |
| Edit Request modal opens on a legacy row with `nationalityCode: null` | Show the info note (§3.3), pre-select nothing, require a pick before Save. Or — if your modal allows partial saves — let them save without it, but show a warning that future searches will fail. |
| Same hotel search is retried multiple times after an `NATIONALITY_REQUIRED` 400 | The error is purely client-state — once nationality is saved on the request, retrying the same search call succeeds. No special handling needed beyond the CTA. |
| Two staff edit the same request, one sets nationality, the other doesn't see it | Standard reload-on-conflict pattern — same as today. Nationality is a normal request field, not specially locked. |

---

## 6. Verification

Once your changes ship:

1. **Open Create Request.** Confirm the Nationality dropdown appears in Step 1 with a `*` and is empty by default.
2. **Try to Submit without a nationality.** Submit button stays disabled.
3. **Type "ger" in the dropdown.** "Germany (DE)" appears in the filtered list.
4. **Pick "Germany"** and Submit. Network tab → request body includes `nationalityCode: "DE"`. Response 201.
5. **Open the created request, trigger a hotel search.** Worker logs (BE side) should show `NationalityCode=DE` going to WBE.
6. **Open the same request's Edit modal.** Confirm "Germany" is pre-selected. Change to "United Arab Emirates" and save. Re-trigger search. WBE call now uses `AE`.
7. **Open a legacy request (created before today's date)** that has `nationalityCode: null`. Confirm the info note appears in the Edit modal. Pick a nationality and save.
8. **Edge case:** create a request without nationality via direct API call (bypassing the FE). The BE should return 400 with `validation_error`. (Just confirm the 400 happens — your form should prevent this naturally.)

If anything in steps 1–8 fails, paste the network response and I'll trace it.

---

## 7. What I'm NOT asking you to build

- **Separate Country/Residence field.** Hub asks for nationality + country of residence as two separate fields. Our portal only models nationality for now. If product wants both, separate ticket.
- **Per-search nationality override UI.** The BE `WbeHotelSearchSchema` accepts an optional `nationalityCode` override at search time, but we don't expose it in the UI. The request-level value is the source of truth.
- **Backfilling legacy null rows.** Oliver said leave them. The Edit modal lets staff fix them one at a time as needed.
- **Settings-page allowlist** for nationalities. Out of scope — we surface the full WBE list.

---

## 8. Estimated FE work

| Task | Estimate |
|---|---|
| Add searchable combobox to Step 1 + form state wiring | 2 h |
| Same field on Edit Request modal + pre-populate | 1 h |
| Fetch + session-cache `GET /api/v1/nationalities` | 30 min |
| Submit disable + form validation | 30 min |
| `NATIONALITY_REQUIRED` 400 handling + CTA | 1 h |
| QA + edge cases | 1.5 h |

**Total: ~6.5 hours, or ~1 working day.**

---

## 9. Coordination notes

- **Wix form update is a separate task.** I've wired the BE to accept `nationality_code` from the Wix payload, but the Wix form itself needs the field added. Flag this to whoever owns the Wix integration so it lands in parallel — otherwise webhook-created requests will keep coming in with null nationality and the BE will warn in the logs.
- **No DB migration.** All columns already exist.
- **No new env vars you need to set.** The optional `NATIONALITY_FALLBACK_CUTOFF_DATE` env var defaults to `2026-06-26T00:00:00Z` — leave it unset.

---

## 10. Anything to ask back?

If the API shape is awkward for the FE — for example, you'd prefer the dropdown to return `{ value, label }` instead of `{ code, name }`, or you want grouping by region — say so and I'll adjust. Right now I've matched the WBE-native shape so the data flows through unchanged.

Same for the error code on the search-time 400: if `NATIONALITY_REQUIRED` should be a more specific HTTP status (e.g. 409 Conflict) so it doesn't get caught by your generic 400 handler, that's a 1-line BE change.
