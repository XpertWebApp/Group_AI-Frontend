# Odoo Client Search — Frontend Handover

**Audience:** Frontend developer (you are seeing this requirement for the first time)
**Author:** Backend (Neha)
**Date:** 2026-05-22
**Branches:** backend changes are on `milestone_4v7` / will follow to `milestone_4v8`
**Backend:** complete, smoke-tested against live Odoo, no further BE changes needed
**FE Status:** Not started — please pick up from this doc

---

## 1. The requirement (from scratch)

Today, when staff create or receive a booking request, the **Company Name** field is plain free-text. Anyone can type anything — "Mueller Reisen", "muellr reissen", "MUELLER REISEN GMBH" — and three "different" customers end up in our records that are actually the same company. Over time the Odoo contacts database fills with junk, and we cannot compute meaningful per-client statistics.

Oliver (founder) confirmed the fix:

> *"Yes — with this we catch 2 things: (a) we avoid hundreds of lazy entries leading to chaos in contacts, (b) we can later see statistics of all client request-to-book ratio, (c) we will check all new contacts for CRM. If client is not in contacts it has to be created by staff member BEFORE we send offer. Company Name."*

Distilled into three rules:

1. **Search only, no auto-create.** The Group Tool must search Odoo's existing customer database. It must **not** create new Odoo contacts. If a client doesn't exist in Odoo, **staff** create them in Odoo first (outside our app), then come back and link.
2. **Free text allowed at request creation**, but the **offer cannot be sent** until the request is linked to an Odoo company. This is the gate.
3. **Search field: Company Name only.** Not contact name, email, or phone — just the company's `name` field on Odoo `res.partner`.

Why a name-only search: every Odoo customer has exactly one canonical Company Name, so it's the cleanest dedupe key. Searching across email/phone would surface individual contact people who don't represent the booking party.

---

## 2. The new backend surface (ready and live on localhost)

### 2.1 Live company autocomplete

```
GET /api/v1/odoo/customers/search?q={query}&limit={n}
```

**Auth:** Bearer JWT (same `Authorization` header as every other `/api/v1/*` route).
**Rate limit:** 60 requests / minute / IP. Plenty for a debounced autocomplete.
**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `q` | string | yes | At least 2 characters. The backend returns 400 for less — don't fire the request until the user has typed 2+ chars. Max 100 chars. |
| `limit` | int | no | Defaults to 20. Capped at 20 backend-side regardless of what you send. |

**200 OK response shape:**

```json
{
  "success": true,
  "data": [
    {
      "id": 41415,
      "name": "1 Step Away ApS",
      "email": "info@1stepaway.dk",
      "phone": "+45 70 90 00 90"
    },
    {
      "id": 42779,
      "name": "1A-ReiseCenter",
      "email": "info@1-a-reisecenter.de",
      "phone": "+49 2022801010"
    }
  ],
  "message": "Odoo customers retrieved"
}
```

Field caveats:

- `email` and `phone` may be `false` (boolean) — that's how Odoo represents "empty" through its JSON-RPC. Always render with `if (row.email && typeof row.email === 'string')` checks; treat anything else as "no email".
- `id` is the integer Odoo customer ID. **This is the value you store as `odooContactId` on the BookingRequest.**
- `name` is the Odoo Company Name — display this verbatim in the dropdown.

**Error responses you must handle:**

| HTTP | Body `error` code | Meaning | UI message |
|---|---|---|---|
| 400 | `validation_error` | `q` too short / too long | Don't fire below 2 chars; if it slips through, show "Type at least 2 characters" |
| 401 | `UNAUTHORIZED` | JWT missing/expired | Usual auth-redirect flow |
| 422 | `ODOO_API_ERROR` or Odoo-supplied code | Odoo accepted the call but rejected the domain (rare — unlikely to surface in normal use) | Show "Unable to search Odoo — please retry" |
| 429 | `rate_limited` | More than 60 requests / minute | Show subtle toast "Too many requests, slow down a moment" |
| 503 | `ODOO_UNAVAILABLE` | Odoo is unreachable (network / 5xx / down). The **Send Offer button stays blocked** even if a contactId is on the request. | Show "Odoo is temporarily unreachable. Please try again in a moment." Keep the Create Request flow working — the user can still save the request as a draft. |

### 2.2 Persisting the linked contact on a request

The BookingRequest now has a new column **`odooContactId: number | null`**. It rides through every existing endpoint.

**Where to set it:**

- `POST /api/v1/requests` — pass `odooContactId: 41415` in the body. Optional. If omitted, the request saves with `odooContactId: null` and is treated as "not yet linked" by the offer-send gate (see §2.3).
- `PATCH /api/v1/requests/:id` — pass `odooContactId: 41415` to link, or `odooContactId: null` to unlink. Already wired through the existing Update Request screen.

**Where it appears in responses:**

- `GET /api/v1/requests/:id` — top-level scalar field on the response object.
- `GET /api/v1/requests/:id/summary` — same.
- `GET /api/v1/requests` (list) — included on each row in the list.

So if you re-open an existing request, you'll find `odooContactId` on the response and can pre-fill the autocomplete chip with that linked company. (See §3.4 for re-hydration tips.)

### 2.3 The send-offer gate

```
POST /api/v1/proposals/:id/actions/send
```

This endpoint already exists; the only change is a new precondition.

**The gate fires when ALL of these are true:**

1. The proposal's underlying request was created **on or after** the cutover date `2026-05-23T00:00:00Z` (env-configurable as `ODOO_GATE_ACTIVE_SINCE`).
2. The request's `odooContactId` is `null`.

**When the gate fires the API returns:**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "data": null,
  "message": "This request must be linked to an Odoo company before the offer can be sent. Open the request, search the company in the Client field, and save.",
  "error": "ODOO_CONTACT_REQUIRED"
}
```

**What you should do on the FE:**

- Branch on `error === 'ODOO_CONTACT_REQUIRED'` and show a clear blocking message.
- Ideally also **pre-disable** the Send button when `request.odooContactId == null` and `new Date(request.createdAt) >= new Date('2026-05-23T00:00:00Z')`, so the user never gets to the failure. (The backend still enforces — this is just better UX.)
- Add a "Link Odoo Customer" CTA right next to the disabled Send button that scrolls to / opens the Company field autocomplete.
- If you can't pre-disable (e.g. you don't have the request data on the send screen), just handle the 400 gracefully when it comes back.

**Legacy requests are grandfathered.** Any request whose `createdAt` is strictly before the cutover is exempt — staff can send those without linking to Odoo. Your UI should treat those rows the same as today.

---

## 3. UI guidance for the Company Name field

### 3.1 Where this lives

The autocomplete replaces the **Company Name** free-text input on:

1. **Create Request — Step 3 (Customer Details)** — the multi-step Create Request form.
2. **Edit Request** — same field on the edit-request modal/page.
3. (Stretch goal, follow-up milestone) **Group Requests list** — the dashboard filter / search row could grow a "filter by Odoo company" affordance, but that's not in scope here.

### 3.2 The autocomplete pattern

A typical "live company picker" works like this:

```
┌──────────────────────────────────────────────────────────┐
│ Company Name *                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 1 Step|                                       🔍   │   │ ← user types
│ └────────────────────────────────────────────────────┘   │
│ ▼ Searching Odoo…                                        │ ← debounced 300ms
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 1 Step Away ApS                                    │   │ ← results from BE
│ │   info@1stepaway.dk · +45 70 90 00 90              │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ 1A-ReiseCenter                                     │   │
│ │   info@1-a-reisecenter.de · +49 2022801010         │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ Not in the list?                                         │
│   ⚠ Create the customer in Odoo first, then come back.   │ ← help text, not a CTA
└──────────────────────────────────────────────────────────┘
```

After the user picks an option, render the **selected company as a chip**:

```
┌──────────────────────────────────────────────────────────┐
│ Company Name *                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [✓ 1 Step Away ApS] · linked to Odoo · [✕ change]  │   │
│ └────────────────────────────────────────────────────┘   │
│   Odoo ID: 41415                                         │ ← optional sub-label, helps support
└──────────────────────────────────────────────────────────┘
```

Clicking `✕ change` clears the selection and shows the search input again.

### 3.3 Mechanics

- **Debounce:** 300 ms after the user stops typing. Aborts an in-flight request on each new keystroke (use `AbortController`).
- **Min query length:** 2 characters. Do NOT fire below that — the backend will 400 you. Show "Type at least 2 characters" as a hint.
- **Loading state:** small inline spinner / "Searching Odoo…" line.
- **Empty state** (200 OK with `data: []`):
  > "No matches in Odoo. Create the customer in Odoo first, then return here."
- **Error state** (503 ODOO_UNAVAILABLE):
  > "Odoo is temporarily unreachable. Please try again in a moment."
  >
  > User can still save the request as a draft; just can't link or send.
- **Keyboard navigation:** ↓/↑ to walk results, Enter to pick, Esc to close.
- **Accessibility:** `role="combobox"` + `aria-expanded` + `aria-activedescendant`, options as `role="option"`. Most modern combobox components (`react-aria`, `downshift`, `headlessui`, `shadcn/ui Command`) give this for free.

### 3.4 Storing + re-hydrating

On submit:

- **POST `/api/v1/requests`** body — include both:
  - `companyName` (string) — the human label, same as today. Useful for searching/displaying in lists without an extra Odoo round-trip.
  - `odooContactId` (number) — the picked id.

  Backend persists both. The string stays as the canonical display label; the id is the dedupe key.

- **If user typed something but never picked a match** (free-text fallback):
  - Send `companyName` = whatever they typed.
  - Send `odooContactId` = `null` (or omit).
  - The request will save fine, but Send Offer will be blocked later — that's by design.

On re-open / edit:

- `GET /api/v1/requests/:id` returns `companyName` and `odooContactId`.
- If `odooContactId != null`, render the **chip** state pre-filled. **No need to call `searchCompanies` again** — you already have the company name from `companyName`. (If you want to be paranoid and refresh the email/phone on hover, you could add a backend helper later; for v1 use what you have.)
- If `odooContactId == null`, render the search input state.

### 3.5 Wire it together — pseudocode

```ts
// hooks/useOdooCompanySearch.ts
function useOdooCompanySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OdooCompany[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'empty' | 'error' | 'unavailable'>('idle');
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    if (query.trim().length < 2) { setState('idle'); setResults([]); return; }
    setState('loading');

    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/v1/odoo/customers/search?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${jwt}` }, signal: ctrl.signal },
        );
        if (r.status === 503) { setState('unavailable'); return; }
        if (!r.ok) { setState('error'); return; }
        const body = await r.json();
        setResults(body.data);
        setState(body.data.length === 0 ? 'empty' : 'idle');
      } catch (e) {
        if ((e as any).name !== 'AbortError') setState('error');
      }
    }, 300);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, jwt]);

  return { query, setQuery, results, state };
}
```

```tsx
// On Send Offer click
async function handleSend(proposalId: string) {
  const r = await fetch(`/api/v1/proposals/${proposalId}/actions/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = await r.json();
  if (!r.ok) {
    if (body.error === 'ODOO_CONTACT_REQUIRED') {
      showBlockingDialog({
        title: 'Link Odoo Customer First',
        message: body.message, // already a complete user-facing sentence
        cta: { label: 'Open Request', onClick: () => navigate(`/requests/${request.id}#company`) },
      });
      return;
    }
    showToast({ severity: 'error', message: body.message });
    return;
  }
  showToast({ severity: 'success', message: 'Offer sent.' });
}
```

---

## 4. Edge cases to handle

| Situation | What the FE should do |
|---|---|
| User types a name, picks a match, then keeps typing (changes their mind) | Clear the chip back to free-text and re-search |
| User picks a match, then edits the chip text inline | Treat as "user is choosing a different one" — clear `odooContactId` and re-open the search |
| User pastes a long name with leading/trailing whitespace | Trim before searching; the backend already does case-insensitive substring match |
| Network drop mid-type | Show transient "Connection issue, retrying…" line; the AbortController + next keystroke will retry naturally |
| Backend returns 429 | Suppress further requests for the rate-limit window (1 minute). Show small "Slow down a moment" toast |
| Odoo returns a row with `email: false` | Render as `—` or just omit — never show the literal word "false" |
| User is editing a legacy request (`createdAt < 2026-05-23T00:00:00Z`) that has no `odooContactId` | Show the autocomplete normally; do NOT show the "Send blocked" warning even when `odooContactId` is null. These are grandfathered. |
| User wants to clear the Odoo link entirely | Provide a "Remove link" affordance on the chip → PATCH with `odooContactId: null`. (They'll have to relink before send if it's a post-cutover request.) |

---

## 5. Not in scope for this milestone

- **Creating Odoo customers from inside our app** — Oliver explicitly forbids. We only ever search.
- **Searching by email or phone** — Oliver said Company Name only. Don't add side-field search even if it would be convenient.
- **Searching individual contact persons** — only companies (the backend filters `is_company = true`).
- **Caching results locally** — always query live; companies are added/edited in Odoo all day.
- **Backfilling legacy requests** — they're grandfathered by `createdAt`. Don't try to retroactively link them unless staff specifically ask.

---

## 6. Verification checklist for FE (before requesting QA)

- [ ] Typing < 2 chars never fires a request.
- [ ] Typing ≥ 2 chars debounces by 300 ms.
- [ ] Each new keystroke aborts the previous in-flight request.
- [ ] Dropdown renders results from the API; no client-side filtering.
- [ ] Picking a result fills the chip + stores `odooContactId` in form state.
- [ ] Submitting POST `/api/v1/requests` includes `odooContactId` (when picked) and `companyName` (always).
- [ ] Submitting without a picked company saves the request — does NOT auto-block creation. (The block is at send-offer time.)
- [ ] Re-opening a request with `odooContactId != null` pre-renders the chip without an extra Odoo round-trip.
- [ ] Clicking "Send Offer" on a post-cutover request without `odooContactId` triggers the `ODOO_CONTACT_REQUIRED` flow and renders the staff-facing message exactly as returned by the API.
- [ ] Same Send Offer click on a pre-cutover request **succeeds** (no gate).
- [ ] 503 ODOO_UNAVAILABLE renders a non-scary "Try again in a moment" message and the rest of the form keeps working.
- [ ] 429 renders a slow-down toast without breaking the form.
- [ ] Keyboard navigation works (↓/↑/Enter/Esc).
- [ ] Screen reader announces the combobox state changes.
- [ ] No console errors when the BE returns `email: false`.

---

## 7. References (BE files, for context only — you do not need to modify any)

- [src/services/odoo.client.service.ts](../../src/services/odoo.client.service.ts) — JSON-RPC client (auth + searchCompanies + getCompanyById).
- [src/controllers/odoo.controller.ts](../../src/controllers/odoo.controller.ts) — the HTTP handler.
- [src/routes/odoo.routes.ts](../../src/routes/odoo.routes.ts) — route + rate limit.
- [src/services/proposals.service.ts](../../src/services/proposals.service.ts) (search for `ODOO_CONTACT_REQUIRED`) — the send-gate.
- [prisma/schema.prisma](../../prisma/schema.prisma) — `BookingRequest.odooContactId Int?` field.

---

## 8. Questions for the FE before you start

If any of the below is unclear, ping me **before** building so we don't waste a cycle:

1. Which combobox library is the rest of the form using today? (`react-select`, `downshift`, `headlessui`, `shadcn/ui Command`, custom?) I can adapt the snippets to match.
2. Where does the JWT live in your fetch layer — interceptor, hook, manual header? I'd like the autocomplete to inherit that, not reinvent it.
3. Does the existing form already have a "dirty-state" / autosave-draft mechanism? If yes, picking an Odoo company should mark dirty the same way.
4. The Send Offer screen — is it a modal, a separate page, or inline on the proposal detail? Determines where the blocking dialog should mount.

That's it. Ping me when you're ready to wire it up or if anything in this doc is ambiguous.
