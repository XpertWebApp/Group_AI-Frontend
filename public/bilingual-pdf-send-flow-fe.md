# Bilingual Offer PDF — Send Flow (FE Handover)

**Audience:** Frontend developer
**Author:** Backend (Neha)
**Date:** 2026-06-02
**Backend branch:** `milestone_5v3`
**Backend status:** Complete and verified. Every endpoint described below works today.
**FE status:** Not started — please pick up from this doc.

This document supersedes the **Send Offer** section of [bilingual-pdf-fe.md](./bilingual-pdf-fe.md). The Preview and Download sections of that doc still apply unchanged.

---

## 1. Why we're doing this

### 1.1 The real-world problem

SETT Groups operates across Austria, Germany, and the wider EU. The customer base and the SETT staff don't always share a language:

- An English-speaking staff member is preparing an offer for a German-speaking customer.
- A German-speaking staff member is preparing an offer for an English-speaking customer.
- A customer requests their offer in their own language after seeing an English version first.

If we make the staff toggle the language with a small picker buried in a modal, **someone will forget at some point** and a German customer will receive an English offer — or vice versa. That's the failure mode we want to design *out*, not just *handle*.

### 1.2 The design solution

**Make the language choice the same act as the visual confirmation.** Staff sees both PDF renderings in the Send Offer modal — English on the left, German on the right — picks the version they want to send via a radio button on each pane, then clicks Send. The visible preview IS the choice.

This collapses two decisions into one:

- "Does this offer look correct?" (visual check)
- "Which language should I send?" (language selection)

If staff can SEE which language they're committing to, they can't accidentally send the wrong one.

### 1.3 What's in scope for THIS doc

- **Send Offer flow** — the side-by-side preview modal + send action.

### 1.4 What's NOT in scope for this doc

- **Preview-only flow** (the "Preview PDF" button on the proposal page) — keep the simple toggle from the original doc.
- **Download actions** (offer history table, single-offer download) — keep the simple toggle from the original doc.
- **Global UI translation** — irrelevant to this work. Only the offer PDF and the customer email body are translated.
- **Auto-detecting customer language** — not in v1. Staff explicitly picks.

---

## 2. The backend endpoints you'll call

All three of these are **already live on `milestone_5v3`**. You don't need anything new.

### 2.1 Preview a PDF in a specific language

```http
POST /api/v1/proposals/{proposalId}/actions/preview-pdf
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "language": "en"   // or "de"
}
```

**Response:** raw PDF bytes. `Content-Type: application/pdf`.

**Latency:** ~1–2 seconds the first time DeepL is called for that proposal's free-text fields. ~500ms–1s if no free text is involved.

**What you do with the bytes:** turn into a Blob URL, render in an `<iframe>` or PDF.js viewer.

### 2.2 Send the offer in the chosen language

```http
POST /api/v1/proposals/{proposalId}/actions/send
Authorization: Bearer {JWT}
Content-Type: application/json

{
  "sendToEmail": "customer@example.com",
  "language": "de"
}
```

**OR** (multiple recipients):

```json
{
  "sendToEmails": ["customer@example.com", "agent@example.com"],
  "language": "de"
}
```

The backend:
- Generates the PDF in `language`.
- Composes the customer-facing email with subject + body in `language`.
- Attaches the PDF.
- Sends via SMTP.
- Updates the proposal's `status` and writes the offer to the history table.

**Response on success:**

```json
{
  "success": true,
  "data": {
    "sent": true,
    "emailSent": true,
    "proposal": { /* …updated proposal… */ },
    "offer": {
      "id": "uuid",
      "offerNumber": 1,
      "type": "initial",
      "pdfUrl": "proposals/{id}/offer-1759..pdf",
      "sentAt": "2026-06-02T10:42:00.000Z"
    }
  }
}
```

**Failure response (structured by error code):**

| HTTP | code | What happened | UI |
|---|---|---|---|
| 400 | `ODOO_CONTACT_REQUIRED` | Request not linked to Odoo customer | Block with the dialog from the Odoo doc |
| 400 | `NO_RECIPIENT_EMAIL` | Empty recipients AND no contactEmail on request | "Add a recipient email and try again" |
| 400 | `validation_error` | Bad body shape | "Form validation failed" — should never happen with a correct picker |
| 409 | `PROPOSAL_NOT_MODIFIABLE` | Proposal was declined | "This offer was declined and cannot be re-sent" |
| 502 | `EMAIL_SEND_FAILED` | SMTP failed (rare) | "Email send failed — retry" with the `failure.message` text shown |
| 500 | `PDF_GENERATION_FAILED` | PDF rendering crashed | Generic "Failed to generate PDF" + retry |

### 2.3 Default behavior when `language` is omitted

If you forget to pass `language`, it defaults to `"en"`. **Always pass it explicitly** in this flow — you have the user's intent, don't rely on the default.

---

## 3. The UX you'll build

### 3.1 Where this lives

The existing "Send Offer" button on the proposal detail page (and the proposal-row action in the Group Requests list, if there's one there). When staff clicks Send Offer, instead of opening a small recipient-only modal, open the new side-by-side modal.

### 3.2 Layout

Roughly:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Send Offer — #2458 — Vienna, Austria                              [✕]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│   │   ENGLISH                   │  │   GERMAN                    │       │
│   │  ─────────────────────      │  │  ─────────────────────      │       │
│   │                             │  │                             │       │
│   │      [PDF iframe rendering  │  │      [PDF iframe rendering  │       │
│   │       the EN preview]       │  │       the DE preview]       │       │
│   │                             │  │                             │       │
│   │                             │  │                             │       │
│   │                             │  │                             │       │
│   │   ◉ Send this version       │  │   ◯ Send this version       │       │
│   └─────────────────────────────┘  └─────────────────────────────┘       │
│                                                                          │
│   Recipients                                                             │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │ customer@example.com                                       [✕] │     │
│   │ + Add another recipient                                        │     │
│   └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│   ℹ This re-renders both PDFs fresh from current proposal data.          │
│                                                                          │
│                            [Cancel]    [SEND IN ENGLISH]                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key design points:**

1. Two panes, equal width, with the EN pane on the LEFT and DE pane on the RIGHT (the most common SETT staff language is German, so the "less default" choice goes left as a deliberate prompt to look at it).
2. Each pane has its own radio button labeled "Send this version".
3. The Send button label dynamically reflects the selected language: **"SEND IN ENGLISH"** when EN is selected, **"SEND IN GERMAN"** when DE is selected. This is the most important UX detail — staff sees one final confirmation of language right next to where they click.
4. Recipients live below the panes (single source of truth — same recipients for either language).
5. The "ℹ" info line at the bottom warns that what's rendered reflects current proposal state, not a frozen snapshot. (See §6.2.)

### 3.3 Brand styling

Per the SETT Brand Guidelines v2:

- **Active pane border**: 3 px green (`#AAC737`), per §5.3 emphasis-card pattern.
- **Inactive pane border**: 1 px grey (`#E0E0E0`).
- **Pane header**: navy (`#071C42`) bold uppercase "ENGLISH" / "GERMAN" with a thin green underline.
- **Send button**: green (`#AAC737`) primary CTA, navy text, uppercase per §5.1.
- **Cancel button**: secondary outlined.
- **Modal background**: white. Body background: light grey (`#F8F9FA`).

### 3.4 Responsive behaviour

- **Desktop (≥ 1200 px)**: side-by-side as shown.
- **Tablet (768–1199 px)**: still side-by-side but reduce iframe height to ~400 px so the modal fits vertically.
- **Mobile (< 768 px)**: stack vertically — EN pane on top, DE below. Recipients section beneath both. The Send button stays sticky at the bottom of the modal.

### 3.5 Accessibility

- The two panes are wrapped in a `<fieldset role="radiogroup" aria-label="Choose offer language">`.
- Each radio has `aria-label="Send the English version"` / `"Send the German version"`.
- Pane header has `aria-hidden="true"` to avoid screen-reader echoing.
- Focus enters the modal on the EN radio. Tab cycle: EN radio → DE radio → recipients input → Cancel → Send.
- Esc closes the modal (after a "Discard changes?" confirm if recipients are not empty).
- The Send button has `aria-live="polite"` on its label so screen readers announce "Send in German" when the radio changes.

---

## 4. The interaction sequence — step by step

### 4.1 When the modal opens

1. **Modal mounts.** Both panes show a skeleton loader (a grey shimmer block sized roughly like an A4 PDF). The Send button is disabled. The cancel button is enabled.
2. **Fire the EN preview call** immediately (`POST /preview-pdf` with `{"language":"en"}`).
3. **Wait ~300 ms, then fire the DE preview call** (`POST /preview-pdf` with `{"language":"de"}`). The 300 ms stagger isn't critical — it just keeps the EN response feeling instant and prevents DeepL from getting two simultaneous requests for the same proposal.
4. **As each call resolves**, replace that pane's skeleton with a Blob URL `<iframe>` showing the PDF.
5. **EN radio is pre-selected** by default (whether the PDF has finished rendering or not — the radio is part of the FE state, not the PDF state).
6. **Once the EN pane has loaded**, enable the Send button (you can send EN even if DE is still loading or even failed).

### 4.2 When the user clicks the DE radio

- Switch the active border from EN pane to DE pane (the green 3 px frame).
- Update the Send button label from "SEND IN ENGLISH" to "SEND IN GERMAN".
- **If the DE preview hasn't loaded yet**, don't disable the Send button outright — but show a small spinner inside the Send button and wait for the DE preview to resolve before allowing the actual send. The staff member can't visually confirm a PDF they haven't seen yet, so we wait.

### 4.3 When the user clicks Send

1. **Validate recipients.** At least one valid email required. Show inline error if empty.
2. **Disable Send button**, show a spinner with the text "SENDING…".
3. **POST to `/actions/send`** with:
   ```json
   {
     "sendToEmail": "single@example.com",
     "language": "de"
   }
   ```
   or `sendToEmails` if multiple.
4. **On 2xx:**
   - Close the modal.
   - Toast: "Offer sent in German to customer@example.com" (with the language explicit in the toast — this is your last chance to surface what just happened).
   - Refresh the proposal data (the status moved to `sent`, a new row appeared in the offer history).
5. **On error:**
   - Keep the modal open.
   - Show the error message under the Send button.
   - Re-enable Send for retry.
   - For `ODOO_CONTACT_REQUIRED` specifically, show the inline "Link Odoo Customer" CTA per the Odoo doc.

### 4.4 If a preview call fails

Show a retry CTA INSIDE that pane only:

```
┌─────────────────────────────┐
│   ENGLISH                   │
│  ─────────────────────      │
│                             │
│   ⚠ Couldn't load the       │
│     English preview.        │
│                             │
│     [ Retry ]               │
│                             │
└─────────────────────────────┘
```

- The other pane still works. Staff can send in the working language.
- If BOTH panes fail, lock the Send button entirely and show a banner at the top: "Couldn't generate offer preview. Please try again, or reload the proposal."

---

## 5. Code skeleton

This is React-flavoured pseudocode. Adapt to your actual framework / state library.

```tsx
function SendOfferModal({ proposalId, customer, onClose, onSent }) {
  const [previews, setPreviews] = useState({
    en: { status: 'loading', blobUrl: null, error: null },
    de: { status: 'loading', blobUrl: null, error: null },
  });
  const [chosenLang, setChosenLang] = useState<'en' | 'de'>('en');
  const [recipients, setRecipients] = useState<string[]>(customer.email ? [customer.email] : []);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Lazy-fetch the two previews on mount
  useEffect(() => {
    fetchPreview('en');
    const t = setTimeout(() => fetchPreview('de'), 300);
    return () => clearTimeout(t);
  }, [proposalId]);

  async function fetchPreview(lang: 'en' | 'de') {
    setPreviews(p => ({ ...p, [lang]: { status: 'loading', blobUrl: null, error: null } }));
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/actions/preview-pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviews(p => ({ ...p, [lang]: { status: 'loaded', blobUrl, error: null } }));
    } catch (err) {
      setPreviews(p => ({ ...p, [lang]: { status: 'error', blobUrl: null, error: String(err) } }));
    }
  }

  // Cleanup blob URLs on unmount
  useEffect(() => () => {
    Object.values(previews).forEach(p => p.blobUrl && URL.revokeObjectURL(p.blobUrl));
  }, []);

  const canSend = recipients.length > 0
    && !sending
    && previews[chosenLang].status === 'loaded';

  async function handleSend() {
    setSending(true);
    setSendError(null);
    try {
      const body: any = { language: chosenLang };
      if (recipients.length === 1) body.sendToEmail = recipients[0];
      else body.sendToEmails = recipients;

      const res = await fetch(`/api/v1/proposals/${proposalId}/actions/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        // Handle error codes
        if (data.error === 'ODOO_CONTACT_REQUIRED') {
          showBlockingDialog({ /* ... */ });
        } else {
          setSendError(data.message || 'Failed to send');
        }
        return;
      }
      toast({
        severity: 'success',
        message: `Offer sent in ${chosenLang === 'de' ? 'German' : 'English'} to ${recipients.join(', ')}`,
      });
      onSent(data.data);
      onClose();
    } catch (err: any) {
      setSendError(err.message || 'Network error');
    } finally {
      setSending(false);
    }
  }

  const sendLabel = chosenLang === 'de' ? 'SEND IN GERMAN' : 'SEND IN ENGLISH';

  return (
    <Modal onClose={onClose}>
      <Header>Send Offer — #{proposalId} — {customer.destination}</Header>

      <div role="radiogroup" aria-label="Choose offer language" className="side-by-side">
        <Pane
          title="English"
          preview={previews.en}
          active={chosenLang === 'en'}
          onSelect={() => setChosenLang('en')}
          onRetry={() => fetchPreview('en')}
        />
        <Pane
          title="German"
          preview={previews.de}
          active={chosenLang === 'de'}
          onSelect={() => setChosenLang('de')}
          onRetry={() => fetchPreview('de')}
        />
      </div>

      <RecipientsInput value={recipients} onChange={setRecipients} />

      <p className="info-note">ℹ This re-renders both PDFs fresh from current proposal data.</p>

      {sendError && <ErrorBanner>{sendError}</ErrorBanner>}

      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleSend} disabled={!canSend} className="primary">
          {sending ? 'SENDING…' : sendLabel}
        </button>
      </Footer>
    </Modal>
  );
}
```

---

## 6. Edge cases & gotchas

### 6.1 Preview latency on first open

The first preview call hits DeepL. DeepL response time is usually 500–800 ms but can spike to 2–3 s during peak hours. **Don't tie the modal opening animation to the preview being ready** — open the modal instantly with skeletons, let the PDFs fill in.

If you want to optimise, you can pre-fetch the EN preview as soon as the staff hovers over the "Send Offer" button (with a `mouseenter` listener and a small debounce). Optional.

### 6.2 Re-rendered PDFs reflect CURRENT proposal data

This is the trade-off we made on the backend so we didn't have to maintain per-language stored snapshots. When you open the modal:

- The preview calls re-render from the CURRENT proposal state in the database.
- If staff has edited the proposal since the last send, the new preview includes those edits.
- This is fine for the Send action (staff is about to send right now).

For Download actions, the same caveat applies. The info line at the bottom of the modal communicates this to staff.

### 6.3 Recipients are independent of language

Don't tie recipients to language. A single recipient list applies to whichever language is selected. The customer's email address doesn't change with language.

### 6.4 DeepL failures

The backend gracefully degrades when DeepL is down — the PDF still renders, free-text fields (customer notes, special requirements) just stay in the source language. **You won't see a special error code on the FE.** The PDF arrives looking slightly mixed-language (English headings, English notes) but it's a valid PDF.

If you want to detect this and warn the user, you could compare the response time (DeepL outage → faster response) but it's flaky. Better: don't try to detect, trust the backend.

### 6.5 Closing the modal mid-send

If the user clicks Cancel or hits Esc while a send is in flight:

- **Don't abort the send.** Email has likely already left the server by then.
- Show a confirmation: "Send is in progress. Close anyway?" → if Yes, close the modal but show a follow-up toast when the send resolves ("Offer sent to …" or "Send failed").
- If the user is still waiting on the previews to load and clicks Cancel, abort the in-flight `fetch`es via AbortController to save the DeepL round-trip.

### 6.6 The proposal status changing under us

If staff has the modal open and someone else (or themselves in another tab) changes the proposal status to `declined`, the send will fail with `409 PROPOSAL_NOT_MODIFIABLE`. Show the error inline and let staff close the modal.

### 6.7 Browser PDF viewer differences

Chrome and Firefox both render PDFs inside `<iframe>` natively. Safari is OK but has spotty support for some PDF features. If you want best fidelity across browsers, use PDF.js. For v1 a plain `<iframe>` is fine.

### 6.8 Blob URL leaks

You MUST `URL.revokeObjectURL(blobUrl)` when the modal unmounts. Otherwise memory leaks across multiple modal opens.

---

## 7. Verification checklist

Before requesting QA, verify each of these:

1. **Happy path EN:** Open modal → EN preview shows → EN radio is pre-selected → Send button reads "SEND IN ENGLISH" → click Send → toast appears, offer in customer's inbox is English.
2. **Happy path DE:** Open modal → wait for DE preview → click DE radio → Send button updates to "SEND IN GERMAN" → click Send → toast says "Offer sent in German" → customer email + PDF are in German.
3. **Slow DE preview:** Throttle the network in DevTools, click DE radio while DE is still loading → Send button shows a spinner and waits for DE to finish → completes correctly.
4. **DE preview fails:** Mock a 500 on the DE call → DE pane shows retry CTA → EN pane is unaffected → can still send EN.
5. **Both previews fail:** Mock 500 on both → both panes show retry → Send button is locked → top banner appears.
6. **Empty recipients:** Clear the recipient input → Send button disabled → inline error "Add at least one recipient".
7. **ODOO_CONTACT_REQUIRED:** Use a proposal whose request isn't linked to Odoo → click Send → blocking dialog from the Odoo doc appears, modal stays open.
8. **Send failure (SMTP):** Mock a 502 response → error banner shows the error message → Send is re-enabled for retry.
9. **Mid-send cancel:** Click Send → immediately click Cancel → confirm dialog appears → on Yes, modal closes, toast appears when the request resolves.
10. **Mobile layout:** Resize to 375 px → panes stack vertically → Send button is sticky at bottom of modal.
11. **Keyboard nav:** Tab through EN radio → DE radio → recipients → Cancel → Send. Each focus state is visible.
12. **Screen reader:** Use VoiceOver / NVDA → switching radios announces "Send in German" / "Send in English".
13. **Memory:** Open and close the modal 10× → check DevTools memory profile → no Blob URL leaks.

---

## 8. Files / endpoints reference (backend, read-only)

The FE doesn't modify any of these; they exist for your reference.

- **Schemas:** [src/validation/requestSchemas.ts](../../src/validation/requestSchemas.ts) — see `SendProposalSchema` (accepts `language`) and `PreviewPdfSchema`.
- **Send controller:** [src/controllers/proposals.controller.ts:200](../../src/controllers/proposals.controller.ts) (`send` method).
- **Send service:** [src/services/proposals.service.ts:393](../../src/services/proposals.service.ts) (`sendProposal`).
- **Preview controller:** [src/controllers/proposals.controller.ts:235](../../src/controllers/proposals.controller.ts) (`previewPdf`).
- **Preview service:** [src/services/proposals.service.ts:656](../../src/services/proposals.service.ts) (`previewPdf`).
- **PDF generator:** [src/services/pdfGeneration.service.ts](../../src/services/pdfGeneration.service.ts) — takes `language` in `OfferPdfData`.
- **Email body template:** [src/services/emailTemplate.ts](../../src/services/emailTemplate.ts) — `buildOfferPdfEmail` accepts `language` and renders subject + body in EN or DE.
- **Translation service:** [src/services/translation.service.ts](../../src/services/translation.service.ts) — DeepL wrapper with graceful fallback.
- **Translation dictionary:** [src/i18n/pdfTranslations.ts](../../src/i18n/pdfTranslations.ts) — 37 PDF labels in EN + DE.

---

## 9. Open questions to flag back

Ping me if any of these are unclear before you start cutting code:

1. **The proposal-page Send button** — is there only one (on the detail page), or also a row-action button in the Group Requests list? The new modal should be reusable from both spots.
2. **Recipient validation** — what's the existing validation rule for email format in your form library? I assumed standard email regex.
3. **The customer's email field** — is it always pre-populated from the request's `contactEmail`, or does staff sometimes type it fresh? My code skeleton assumes pre-populated; adjust if not.
4. **Brand-spec exact green** — please confirm `#AAC737` (Brand Guidelines v2 §2) is the green token you're using elsewhere on the dashboard, so the active-pane border matches the rest of the UI.

Send me a screenshot once the first version is up and I'll do a walk-through with you.
