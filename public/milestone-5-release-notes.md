# Milestone 5 — Release Notes & QA Test Plan

**Project:** SETT Hub (sett-fe)
**Branch:** `milestone_5v3` (FE) / `milestone_5v3` (BE)
**Release date target:** 2026-06-02
**Audience:** Quality Analyst, Product, Stakeholders
**Prepared by:** Shamandeep (Frontend)

---

## 1. About this document

This document covers everything that changed since Milestone 4. Each feature has:

1. **What it does** — plain-English description
2. **Where to find it** — the page or section in the app
3. **What to test** — a checklist QA can walk through
4. **Known caveats** — anything that depends on BE deployment, looks "broken" but isn't, or has a coordinated rollout

Where a feature was specified in a handover doc, the doc is linked. If something here disagrees with the app, **the app is the source of truth** — flag it and we'll reconcile.

**Companion handover docs for reference:**
- [Bilingual PDF Send Flow](./bilingual-pdf-send-flow-fe.md)
- [PDF Redesign — Backend Handover](./pdf-redesign-backend-handover.md)
- [Policies (T&C + Cancellation) Rich-Text — Backend Handover](./policies-rich-text-handover.md)
- [Default Markup — Backend Handover](./default-markup-backend-handover.md)
- [Email Settings — Backend Handover (Brevo)](./email-settings-handover.md)

---

## 2. High-level summary of Milestone 5

Milestone 5 finishes the bilingual workflow, replaces the Google-OAuth email pipeline with Brevo SMTP, ships the brand-spec PDF redesign with live (editable) policies, wires the Settings → General default markup across every consumer, and improves the Send Offer experience with a dual-preview modal and a dedicated "Send Final Offer" button.

It also rolls up the **Odoo integration** that landed across the 4.x branches and is in scope for end-to-end testing in this release.

### What's NEW in Milestone 5

1. **Bilingual PDF preview + download + send** — EN/DE everywhere, with proper translation
2. **PDF redesign** — full brand-spec layout (navy header, green accent stripe, dark tables)
3. **Settings → Policies drive the live PDF** — admin edits flow into the preview and PDF instantly
4. **Default markup is wired everywhere** — proposal slider, MarkupDropdown, hotel search
5. **Send Offer dual-preview modal** — staff sees both EN and DE side-by-side before sending
6. **"Send Final Offer" button** — separate from the initial/revision flow
7. **Email Settings rebuilt for Brevo** — Google OAuth fully removed
8. **Markup custom input** in Settings → General + range opened up to 0–9,999,999,999
9. **Brand-spec input styling** across the Settings area
10. **Odoo integration** — link picker, autofill, send-offer gate

---

## 3. Critical pre-test setup

Before QA starts, please confirm:

| Item | Where | Why |
|---|---|---|
| `SMTP_HOST` set on BE env | Server `.env` | Email won't send otherwise; Brevo Connection card will read "Not configured" |
| `ODOO_GATE_ACTIVE_SINCE=2026-05-23T00:00:00Z` on BE | Server `.env` | The FE gate cutover lives in `lib/utils/odooGate.ts` — must match BE |
| `EMAIL_INTERCEPT_TO` IS or IS NOT set | Server `.env` | Controls whether the QA & Safety card renders. **For prod QA: must NOT be set.** For staging QA: can be set so emails land in a safe inbox. |
| BE `/settings/general` returns `defaultMarkupPercentage` | API | Required by hotel search and proposal slider |
| BE `/settings/policies` returns all 4 fields | API | Required by Create Request, PDF preview, send modal |
| BE `/settings/email` returns the new Brevo shape | API | Required by the Email Configuration page (per [email-settings-handover.md](./email-settings-handover.md) §4.1) |

If any of those fail to confirm, the corresponding feature will surface a non-blocking but visible error state (e.g. "Not configured", empty editors with fallback boilerplate). Report it; don't power through.

---

## 4. Feature: Odoo integration

### 4.1 What it does

Each booking request needs to be linked to a customer record in Odoo so that finance/CRM workflows stay in sync. There are three surfaces:

1. **Odoo Customer Picker** — search-and-pick Odoo contacts when editing a request
2. **Autofill** — picking an Odoo contact fills in the customer details (name, email, phone, address)
3. **Send-Offer Gate** — the Send Offer button is blocked (with a tooltip) for requests created after the cutover date if no Odoo contact has been linked yet

### 4.2 Where to find it

- **Edit Request modal** → "Company Name" field has the Odoo picker
- **Booking Request detail page** → the Send Offer button reflects the gate
- **Create Request page** → company-name field will eventually surface the picker (BE handover step that is in progress)

### 4.3 What to test

- [ ] Edit any booking request, focus the Company Name field. The Odoo Customer Picker opens.
- [ ] Type at least 2 chars. The picker debounces and queries Odoo.
- [ ] Pick a contact. Customer details (firstName, lastName, email, phone, address fields) **autofill** into the request form.
- [ ] Save the request. The `odooContactId` is persisted (you can confirm via API or by reloading).
- [ ] **Gate behaviour, post-cutover request (created on/after 2026-05-23) with NO Odoo link:**
   - The Send Offer button looks enabled but clicking it opens the **OdooLinkRequiredModal** instead of the Send modal.
   - The button row also has a **hover tooltip** explaining the gate.
- [ ] **Gate behaviour, post-cutover request WITH Odoo link:** Send Offer opens the Send modal normally.
- [ ] **Gate behaviour, pre-cutover request (created before 2026-05-23):** Send Offer opens the Send modal regardless of Odoo link (grandfathered).
- [ ] **Server-side enforcement:** even with the FE check bypassed (e.g. through browser tools), the BE returns 400 `ODOO_CONTACT_REQUIRED` if the request isn't linked. The modal that appears reactively must say "Link the Odoo customer first" verbatim from the BE message.

### 4.4 Known caveats

- **Search latency:** Odoo's search endpoint can be slow (~1–2s). The picker shows a spinner, but if it stays loading >10s, that's an Odoo-side or BE-side issue.
- **Cutover date is `2026-05-23T00:00:00Z`** — hard-coded on FE in `lib/utils/odooGate.ts`. If the BE env changes, the FE constant must change too.
- The gate ONLY affects Send Offer. Other actions (Save Draft, Decline, Approve) work without an Odoo link.

---

## 5. Feature: Bilingual PDF — Preview, Download, Send

### 5.1 What it does

Every PDF surface respects the user's EN/DE choice end-to-end. The choice is per-proposal and remembered across sessions via `localStorage`.

The three PDF surfaces:

1. **Preview PDF** — opens an in-app modal showing the offer document. The body text (section titles, labels) and the downloadable PDF both honour the picker.
2. **Download (proposal + offer history)** — the downloaded PDF filename and content reflect the chosen language.
3. **Send Offer** — see §6 (Send flow is a different UX, but the language choice is the same concept).

### 5.2 Where to find it

- **Booking Request detail page** → right sidebar, above the action buttons: a small **LANGUAGE EN/DE** segmented control with an `ⓘ` tooltip.
- **Contract Preview Modal** → opens when you click "PREVIEW PDF". Top-right has the "Download PDF" button (uses the picker).
- **Offer History rows** → each historical offer can be downloaded individually; uses the same picker.

### 5.3 What to test

- [ ] On a booking request, click EN/DE in the language picker. Preferences persist after page reload (localStorage).
- [ ] Open Preview PDF. The modal's body text is in the picked language (EN headings, DE headings).
- [ ] Toggle picker EN↔DE in the modal. The modal body re-renders in the new language without closing.
- [ ] Click "Download PDF" inside the modal. A PDF file downloads. The filename includes a language suffix (e.g. `offer-475-de.pdf`). The PDF content is in the picked language.
- [ ] In Offer History, click the download icon on any past offer. Downloads in the chosen language. The picker is the same picker.
- [ ] Tooltip: hover the `ⓘ` next to the picker. The tooltip explains that switching language re-renders the PDF — it doesn't change the version already sent.

### 5.4 Known caveats

- **Re-render vs snapshot:** the BE re-generates the PDF from CURRENT proposal data on every language switch. **A historical offer downloaded in DE is NOT the version the customer received** — it's the current proposal data re-rendered in DE. Tooltip on the picker spells this out. This is intentional per the BE handover ([bilingual-pdf-send-flow-fe.md §1.2](./bilingual-pdf-send-flow-fe.md)).
- **DeepL translation pipeline:** BE translates section content via DeepL; can take ~1–2s on first generate. UI shows "Downloading…" / "Generating…" during that window.
- **Per-proposal storage key:** each proposal remembers its own language choice independently. Switching between two proposals shows independent preferences.

---

## 6. Feature: Send Offer — Dual Preview Modal

### 6.1 What it does

Replaces the old Approve & Send modal. When staff clicks Send Offer, they see **both EN and DE PDFs side-by-side** in one modal. They pick one via a radio button on the chosen pane; the Send button label updates dynamically ("SEND IN ENGLISH" / "SEND IN GERMAN"). The visible preview IS the language choice — design collapses two decisions into one.

### 6.2 Where to find it

- **Booking Request detail page** → click Send Initial Offer / Send Revision / Send Final Offer (any of the three buttons opens the same modal)
- **Proposal page** (`/proposals/[id]`) → click Send

### 6.3 What to test

- [ ] Open the Send Offer modal. Both EN and DE PDFs preview side-by-side in iframes within ~1 second.
- [ ] EN is requested first; DE follows ~300ms later (per spec — staggers BE load).
- [ ] Click the "Send this version" radio on the DE pane. The Send button label becomes "SEND IN GERMAN".
- [ ] Add a recipient email via the chip-input pattern. Type a valid address + press Enter or comma. Chip appears.
- [ ] Try an invalid email. Inline error appears.
- [ ] Try adding 21+ recipients. Limit error appears at 20.
- [ ] Send. The modal shows a loading state; on success, the page refreshes with the offer added to history.
- [ ] **Language-explicit toast:** "Offer sent in German to {recipients}" (or "in English"). Spelled-out, not just "Sent".
- [ ] **Error states:**
  - [ ] `NO_RECIPIENT_EMAIL` (no recipients): inline error.
  - [ ] `EMAIL_SEND_FAILED` (Brevo issue): inline error with BE message.
  - [ ] `ODOO_CONTACT_REQUIRED` (post-cutover request without Odoo link): inline error linking back to the gate.
  - [ ] `PROPOSAL_NOT_MODIFIABLE`: inline error.
- [ ] Close mid-send: a confirmation dialog appears ("Send is in progress — close anyway?").
- [ ] **Approve step (booking-request detail page only):** if the proposal isn't yet approved, the BE approve action runs **before** send. Spec'd via the `beforeSend(language)` callback — should be invisible to the user except in the rare error case where approve fails.

### 6.4 Known caveats

- **Preview retry:** if EN or DE preview fails to render, a retry button appears in that pane. The other pane is unaffected.
- **Abort on close:** in-flight preview generation is cancelled via `AbortController` when the modal closes. Saves a wasted DeepL roundtrip.
- **Existing PdfLanguagePicker** (the EN/DE pill in the sidebar) is still used for Preview PDF + offer-history downloads. Only the **Send** flow uses the new dual-preview modal.

---

## 7. Feature: Send Final Offer button

### 7.1 What it does

A separate primary button alongside the initial/revision Send button. The existing button now ONLY shows:

| Offers sent so far | Existing button label |
|---|---|
| 0 | "Send Initial Offer" |
| 1+ | "Send Revision" |

The new button always says **"Send Final Offer"** so staff can mark a definitive version regardless of history.

### 7.2 Where to find it

Booking Request detail page → right sidebar action stack. Order top→bottom:
- Preview PDF
- Save Draft
- **Send Initial Offer / Send Revision** (existing, label-dynamic)
- **Send Final Offer** (NEW)
- Mark as Declined

### 7.3 What to test

- [ ] Both Send buttons open the **same** SendOfferDualPreviewModal.
- [ ] Both buttons are gated by the same Odoo + status checks.
- [ ] On a fresh proposal (no offers sent): label reads "Send Initial Offer".
- [ ] After sending one offer: the first button reads "Send Revision". The Final button continues to say "Send Final Offer".
- [ ] **Backend semantics:** Both buttons hit `/proposals/{id}/actions/send`. There is currently **no flag** on the request that distinguishes Initial vs Final on the BE side — they look identical to the BE. If the BE later wants to add an `isFinal` flag (e.g. to lock the proposal post-Final or add a "FINAL OFFER" banner in the customer email), that's a separate request.

### 7.4 Known caveats

- The UX implication of "Final" is on the staff's side — the customer sees the same email/PDF regardless of which button was clicked.

---

## 8. Feature: PDF redesign (brand-spec)

### 8.1 What it does

The Preview PDF modal now follows SETT Brand Guidelines v2 — navy header bar with green accent stripe, white "page" body, navy table headers, green grand-total row, navy footer with green accent. Replaces the legacy plain-table design.

### 8.2 Where to find it

Booking Request detail → click "PREVIEW PDF" on the right sidebar.

### 8.3 What to test

- [ ] **Header:** navy background, white SETT logo on the left, green "OFFER" ribbon top-right with document number and creation date below.
- [ ] **3px green accent bar** directly under the header.
- [ ] **Two-column metadata:** Supplier (left, static SETT details) and Customer (right, from the request).
- [ ] **Trip Details row:** Destination / Check In-Out / Guests in 3 equal columns.
- [ ] **Hotel Details table:** navy header row with white uppercase labels, body rows with navy text, subtotal row with grey background.
- [ ] **Service Details table:** same chrome, different columns (Service / Date / Qty / Sell / Total).
- [ ] **Grand Total row:** green background, navy text, full width.
- [ ] **Payment Details:** payment-due pill (green-light bg) + bank table (read-only, hard-coded SETT bank details).
- [ ] **Cancellation Conditions + Terms & Conditions:** content from Settings → Policies (see §9).
- [ ] **Footer:** navy bar with green "ISSUED BY" label.

### 8.4 Known caveats

- The **on-screen preview** is hand-built React. The **downloaded PDF** is server-rendered. The BE side of this redesign is **NOT YET SHIPPED** — handover at [pdf-redesign-backend-handover.md](./pdf-redesign-backend-handover.md). Until Neha deploys the PDF template update, downloaded PDFs will look like the OLD design even though the on-screen preview is new. This is expected; flag if the on-screen preview itself drifts from the spec.
- The **Pay by Card** CTA has been removed from the preview (was earlier present but the link wasn't wired).
- The **SETT logo** renders in its native green colour (NOT white-filtered). If the logo is missing, BE handover ships a white SVG for the navy header.

---

## 9. Feature: Settings → Policies drive the live PDF + Create Request

### 9.1 What it does

The admin edits Terms & Conditions and Cancellation Conditions in `Settings → Policies` (rich-text editor, EN/DE tabs). Those values flow into:

1. **PDF Preview modal** — the body of the T&C / Cancellation sections
2. **Create Request → Policies step** — the seeded boilerplate in the rich-text editors

### 9.2 Where to find it

- **Settings → Policies** → rich-text editor with EN/DE tab, save button.
- **PDF Preview modal** → scroll down to "Cancellation Conditions" and "Terms & Conditions" sections.
- **Create Request → Policies step** (last step before Create) → editors seeded with the Settings values.

### 9.3 What to test

- [ ] Open Settings → Policies. Type a sample T&C in EN with a bold word, a numbered list (3 items), an italic phrase, a link. Save.
- [ ] Switch tab to DE. Type a German version. Save.
- [ ] Open any booking request → Preview PDF. The T&C section shows the EN version of what you just saved.
- [ ] Switch the EN/DE picker on the booking request to DE. The T&C section in the preview swaps to the DE version (everything else also swaps).
- [ ] On the booking request: the OLD hardcoded 4-bullet list ("Rates and availability is based on...") should **NOT** appear. Only the admin-saved content.
- [ ] **Create Request:** open the create flow, step to Policies. The editors are seeded with the saved Settings values for the current UI language. Toggle EN/DE in the header — the editors swap, preserving any local edits.
- [ ] **Edit preservation:** in Create Request, type a custom T&C, toggle EN/DE, toggle back. Your edit is preserved.
- [ ] **Settings empty:** if Settings → Policies has empty fields, Preview PDF and Create Request fall back to the i18n boilerplate (better than empty editors).

### 9.4 Known caveats

- **Live, not snapshot:** the PDF Preview pulls the **current** Settings value on every open. If admin edits T&C while a staff member has a preview open, the next preview open shows the new value. Once an offer is sent and lives in offer history, the BE re-renders against current proposal data + current settings on download — same as the bilingual caveat above.
- **Rich-text fidelity:** the admin's bold/italic/lists/alignment must round-trip into the PDF. The BE has a handover for this ([policies-rich-text-handover.md](./policies-rich-text-handover.md)) — verify on the PDF download, not just the on-screen preview, once BE ships.
- **HTML sanitisation:** the BE strips disallowed tags on save. If you paste from Word with weird markup, expect some loss — list of allowed tags is in the handover §2.3.

---

## 10. Feature: Default markup wired end-to-end

### 10.1 What it does

The admin sets a Default Markup % in `Settings → General`. That value now drives:

1. **Proposal page markup slider** — seeded from Settings if the proposal has no override
2. **MarkupDropdown** on the booking-request detail page — live default appears as a chip labelled "Default"
3. **Hotel search** — BE applies the Settings default at search time (BE-side; **NOT yet shipped, awaiting Neha**)

### 10.2 Where to find it

- **Settings → General** → Pricing Rules → Default Markup field (now a Select preset + custom input combo)
- **Proposal page** → markup slider near the top of the page
- **Booking Request detail page** → MarkupDropdown on each room row + service row

### 10.3 What to test

- [ ] Settings → General: pick `18` from the preset Select. Custom input fills with `18`.
- [ ] Type `18.5` in the custom input. The preset Select snaps to "—" (custom). Save.
- [ ] Type `22.75` in custom (decimal). Save successfully.
- [ ] Try `150`. Save button **enabled**, no error (range is now 0 – 9,999,999,999 per latest spec).
- [ ] Try `-5`. Save button **disabled**, inline error: "Markup must be 0 or greater."
- [ ] Type `18,5` (European comma decimal). Normalised to 18.5 on save.
- [ ] Save. Toast confirms.
- [ ] Open a proposal whose `markupSettings.percent` is unset. The slider seeds to the new Settings value (e.g. 22.75%).
- [ ] Move the slider. Your value sticks; doesn't snap back to Settings.
- [ ] Open the MarkupDropdown on a hotel room. The Settings value is one of the chips with a "Default" label. Picking it works.

### 10.4 Known caveats

- **Hotel search markup is BE-side and may not match Settings yet.** Per the screenshot debugging session earlier, hotel-search results currently apply an 18% (or supplier-specific) markup at the BE — Neha needs to switch this to read `defaultMarkupPercentage` from Settings ([default-markup-backend-handover.md §2.1](./default-markup-backend-handover.md)). **Until BE ships:** the per-room MARKUP dropdown will show whatever the BE applied (e.g. `17.73%`), NOT the Settings value. This is a known BE gap, not a FE bug.
- **Existing proposals** with a saved markup override (in `markupSettings.percent`) IGNORE the live default. That's intentional — they're frozen.
- **Decimal precision:** values are clamped to 2 decimals on save. `18.005` → `18`.

---

## 11. Feature: Email Configuration — Brevo SMTP (Google OAuth removed)

### 11.1 What it does

Replaces the Google-OAuth-based email flow with a single Brevo SMTP transport via `nodemailer`. The Settings → Email page is now **3 cards**:

1. **Sender Identity** (editable) — fromName, fromEmail, replyToFallback, staffNotificationEmail
2. **Brevo Connection** (read-only) — provider, masked credentials, live status dot, "Send test email" button
3. **QA & Safety** (conditional) — only renders when `EMAIL_INTERCEPT_TO` env is set

### 11.2 Where to find it

`/settings/email`

### 11.3 What to test

#### Sender Identity card
- [ ] All 4 fields editable, prefilled from BE response.
- [ ] Email fields validate inline: invalid format → red border + error message.
- [ ] Empty string is accepted (means "fall back to env at send time").
- [ ] Non-verified sender warning: type a `fromEmail` other than `groups@s-e-t-t.com`. An amber non-blocking warning appears explaining Brevo will rewrite the From header.
- [ ] Save button disabled until something changed. Save with valid values → toast confirms.
- [ ] Page re-syncs to BE response after save (no second GET needed).

#### Brevo Connection card
- [ ] Status dot:
  - Green = "Connected" + relative "Last tested {when}"
  - Red = "Failed: {error}" (truncated, full text on hover)
  - Grey = "Not tested yet"
  - Grey = "Not configured" (when `SMTP_HOST` env is unset)
- [ ] Read-only chrome: Provider, Host / Port (with security), masked username, masked password.
- [ ] **"Send test email" button:** enter a target email. Click Send test. Email arrives within ~10s.
  - [ ] Invalid email format → inline error.
  - [ ] Click 3× quickly → 429 Rate Limited message after 2nd attempt (BE: 1/min per IP).
  - [ ] BE returns 503 NOT_CONFIGURED → "Email is not configured. Contact the dev team."
  - [ ] BE returns 502 SMTP_ERROR → BE error message shown inline.
- [ ] Success: green inline "Sent to {address}" below the button.
- [ ] Credentials hint: "ⓘ Credentials are managed in the server environment..."

#### QA & Safety card
- [ ] Renders ONLY when BE returns `intercept.active: true` (i.e. `EMAIL_INTERCEPT_TO` is set in env).
- [ ] Yellow warning style (NOT red — intentional, not broken).
- [ ] Shows the target address all outbound mail is being rerouted to.
- [ ] Hint: "Disable by removing `EMAIL_INTERCEPT_TO` from the server environment."
- [ ] **In production**, this card MUST NOT appear. If it does, ping ops.

### 11.4 Known caveats

- **Google OAuth code is fully removed.** The old user list, the "Connect Gmail" button, the `?google=connected` redirect — all gone. If you see any Gmail-related UI, it's a stale tab — reload.
- **BE endpoints are in flight.** If `/settings/email`, `/settings/email/test-status`, or `/settings/email/test-send` return 404, BE has not yet deployed. The FE shows degraded states (loading spinner, "not configured", etc.) but does not crash.
- **All mail goes from `groups@s-e-t-t.com`.** Brevo only delivers from verified senders. Setting a different `fromEmail` will be silently rewritten by Brevo.
- **Staff can't send from their own Gmail anymore.** Single-transport model.

---

## 12. Feature: Email language (EN/DE) on Send

### 12.1 What it does

The customer email body is sent in the same language as the chosen PDF. So a customer who gets the German PDF also gets a German email subject + body.

### 12.2 Where to find it

Send Offer Dual Preview Modal → pick DE pane → Send. Customer receives a DE email.

### 12.3 What to test

- [ ] Send a test offer in EN. Customer (or intercept inbox) receives an English subject + body.
- [ ] Send a test offer in DE. Customer receives a German subject + body.
- [ ] PDF attached is in the same language as the email body.

### 12.4 Known caveats

- **Email template strings live on BE.** If a DE translation looks wrong, it's a BE/Neha issue. FE only sends the `language` field.

---

## 13. Feature: Settings input styling (brand-spec)

### 13.1 What it does

All inputs across the Settings pages now follow §5.5 of the brand guidelines: 14px border radius, `#E0E0E0` border, brand-green focus glow, Montserrat 12px uppercase labels.

### 13.2 Where to find it

Every Settings sub-page:
- General Configuration
- Email Configuration
- Company Details (edit mode)
- Supplier Limits (search bar)
- Staff Management (search bar)

### 13.3 What to test

- [ ] Focus any input field. A soft brand-green glow appears around the border (shadow-input-focus).
- [ ] Error state: trigger a validation error. Border turns red, error message below the field.
- [ ] Disabled state: borders fade; cursor not-allowed.
- [ ] Consistency: all input fields across Settings look identical (radius, border colour, focus glow).

### 13.4 Known caveats

- **Company Details view mode** intentionally shows fields with NO border and a grey background — that's the read-only "static label" look. Editing flips to brand-spec edit chrome.
- **Tabular inline edit fields** (e.g. supplier maxRooms) intentionally keep a smaller 6px-radius style — brand-spec 41px height inputs would look wrong in a table cell.

---

## 14. Smaller fixes + rollups (selected highlights)

Items rolled into Milestone 5 from various commits, worth a visual smoke test:

### 14.1 Map View on Hotel Search

- Hotel search results page has a Map View toggle alongside the List View. Map renders pins for each hotel.
- Test: switch view; pins clickable; clicking opens hotel details.

### 14.2 GIATA hotel image gallery

- Hotel detail modal has an image gallery with images from GIATA.
- Test: open hotel details. Gallery loads images. Image lightbox opens on click; arrow keys cycle.
- Loader spinner shows while images load.

### 14.3 Offer History redesign

- Sidebar Offer History card shows past sent offers with download buttons (per-language).
- Test: send 2+ offers. Each appears as a row. Download icon downloads in the picked language.

### 14.4 Add Hotel page

- Search restart button (when search seems stuck).
- Group Type field with conditional age fields (e.g. school groups require average age).
- Test: try Group Type = School. Average age field appears.

### 14.5 Notifications panel

- DE translation added for notification titles.
- Test: switch UI to DE. Notification dropdown shows German titles.

### 14.6 Mobile responsiveness

- Sidebar redesigned for mobile (hamburger toggle).
- Offer History card fits on small screens.
- Add Hotel button enabled on mobile.
- Test: resize browser to iPhone width. Pages should be usable; no horizontal scroll on main views.

### 14.7 Sticky header / iPhone viewport

- Sticky header behaviour fixed for iPhone viewport quirks.
- Test on iOS Safari if possible: scroll content, header stays visible without jitter.

### 14.8 i18n coverage

- DE translations added for: notifications, toast messages, contract preview labels, request summary, email settings page.
- Test: switch UI to DE. Spot-check every screen for untranslated EN strings.

### 14.9 Send Offer language tooltip z-index fix

- The `ⓘ` tooltip next to the EN/DE picker now portals to `<body>` so it renders above all action buttons regardless of stacking-context conflicts.
- Test: hover the `ⓘ`. Tooltip overlays Send Initial Offer / Send Final Offer / Mark Declined buttons without being clipped.

### 14.10 PdfLanguagePicker swap (settings-driven)

- Picking DE/EN swaps the **modal body** text AND drives the Download PDF call.
- Earlier bug: picker only affected the downloaded PDF, not the on-screen preview. Fixed in Milestone 5.

---

## 15. What's NOT in Milestone 5 (out of scope)

- **PDF redesign on BE** — handover written, not deployed. See §8.4.
- **Hotel-search markup pulling from Settings → General** — BE-side, awaiting Neha. See §10.4.
- **Send Final Offer locking the proposal or sending an `isFinal` flag** — see §7.4.
- **Editing SMTP credentials in the UI** — out of scope forever (env-managed).
- **Per-staff sender identity** — single transport model is canonical.
- **Admin-editable email templates** — out of scope this milestone.

---

## 16. Known issues / accepted gaps

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Per-room MARKUP dropdown shows BE-applied % (often `17.73`–`18%`) instead of Settings value | Medium | Awaiting BE fix per [default-markup-backend-handover.md §2.1](./default-markup-backend-handover.md) |
| 2 | Downloaded PDF still uses legacy design | High (visual) | Awaiting BE PDF redesign deploy per [pdf-redesign-backend-handover.md](./pdf-redesign-backend-handover.md) |
| 3 | Send Initial Offer and Send Final Offer hit the same `/send` endpoint with no differentiating flag | Low | Acceptable per product decision; revisit if customer-facing differentiation needed |
| 4 | DeepL translation can take ~1–2s on first PDF generate | Low | Acceptable — UI shows loading state |
| 5 | If BE `/settings/email` returns 404, the page renders a degraded "not configured" state | Low | BE endpoints are coordinated rollout |

---

## 17. Browsers + devices supported

The app targets:

| Browser | Min version |
|---|---|
| Chrome | 110+ |
| Safari (macOS) | 16+ |
| Safari (iOS) | 16+ |
| Firefox | 110+ |
| Edge | 110+ |

Touch-tested on iPhone (Safari, iOS 16+) and Android (Chrome). The sidebar hamburger should work on both.

---

## 18. How to report bugs

For every bug found, please include:

1. **Browser + version** (e.g. Chrome 132 on macOS Sonoma)
2. **URL + steps to reproduce**
3. **Expected vs actual behaviour**
4. **Screenshot or screen recording**
5. **Console errors** (F12 → Console tab → copy any red entries)
6. **Network errors** (F12 → Network → filter "fetch/xhr" → copy any 4xx/5xx)

If the bug looks like one of the §16 known issues, link the row instead of opening a duplicate.

---

## 19. Sign-off checklist

The milestone is ready to ship when:

- [ ] Every §4–§14 feature passes its checklist on Chrome + Safari (desktop)
- [ ] Mobile responsiveness pass on iPhone Safari + Android Chrome
- [ ] DE translation pass: no EN strings on any DE-toggled screen
- [ ] §16 known issues are confirmed (not regressions)
- [ ] No console errors on first page load of each main route
- [ ] No 4xx/5xx network errors on happy-path flows

If all green, route to PM for release approval.

---

## 20. Contacts

- **Frontend lead:** Shamandeep
- **Backend lead:** Neha
- **Designer / brand:** SETT Brand Guidelines v2 (referenced inline as §X.Y throughout the codebase)

For ambiguity in this doc, **the app is the source of truth**. Ping me with the disagreement and I'll either reconcile the doc or fix the app.
