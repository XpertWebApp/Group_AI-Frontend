# Email Configuration Settings — Backend → Frontend Handover

**Audience:** Frontend developer (Shamandeep)
**Author:** Backend (Neha)
**Date:** 2026-06-02
**Backend branch:** `milestone_5v3`
**Companion docs:**
- [policies-rich-text-handover.md](./policies-rich-text-handover.md) — rich-text policies (same DB-editable / env-fallback pattern is reused here)
- [pdf-redesign-backend-handover.md](./pdf-redesign-backend-handover.md) — PDF design spec (unchanged, included for cross-reference)

---

## 1. Why this doc exists

The client has dropped the Google OAuth flow for sending email. All outbound now goes through **Brevo** (SMTP relay) via `nodemailer` — see [src/services/notification.service.ts](./src/services/notification.service.ts).

The current Settings → Email Configuration page in the FE still reflects the old Google-OAuth design: it shows a list of connected Gmail users, a "Connect Gmail" button, and one editable field (`fromName`). All of that needs to be replaced with a panel that reflects the **actual Brevo SMTP pipeline** the BE is using today.

This doc spells out what fields the new page should show, which are editable, and what API shape the BE will expose so the FE can build against it.

---

## 2. What the BE actually uses today

Reality check, so the FE knows what's load-bearing:

| Thing | Where it lives now | Used by |
|---|---|---|
| `SMTP_HOST` | `.env` (`smtp-relay.brevo.com`) | `notification.service.ts` `createTransport()` |
| `SMTP_PORT` | `.env` (`587`) | same |
| `SMTP_SECURITY` | `.env` (`STARTTLS` / `SSL`) | same |
| `SMTP_USERNAME` | `.env` (Brevo SMTP user — looks like `8a****@smtp-brevo.com`) | same |
| `SMTP_PASSWORD` | `.env` (Brevo SMTP key) | same |
| `SMTP_FROM_NAME` | `.env` (`SETT Groups`) | `resolveFrom()` |
| `SMTP_FROM_EMAIL` | `.env` (`groups@s-e-t-t.com`) | `resolveFrom()` |
| `SMTP_REPLY_TO` | `.env` (`groups@s-e-t-t.com`) | `resolveReplyToFallback()` |
| `STAFF_NOTIFICATION_EMAIL` | `.env` | webhook flow, offer-generation failures, new-request alerts |
| `EMAIL_INTERCEPT_TO` | `.env` (only set on local/QA) | every outbound mail (QA safety net) |
| `fromName` | DB (`settings.email.fromName`) | NOT actually consulted today — only stored. We'll fix this. |

The DB-stored `fromName` is currently a dead field: the page lets you save it, but `notification.service.ts` reads `SMTP_FROM_NAME` from env and ignores the DB value. We're going to invert this — DB wins, env is the boot-time default.

---

## 3. New Email Configuration page — three sections

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  Settings  ›  Email Configuration                                        │
 ├──────────────────────────────────────────────────────────────────────────┤
 │                                                                          │
 │  ┌─ Sender Identity ─────────────────────────────────────────────────┐   │
 │  │                                                                   │   │
 │  │  Sender Name           [SETT Groups                           ]   │   │
 │  │  Sender Email          [groups@s-e-t-t.com                    ]   │   │
 │  │  Reply-To Email        [groups@s-e-t-t.com                    ]   │   │
 │  │  Staff Alerts Email    [ops@s-e-t-t.com                       ]   │   │
 │  │                                                                   │   │
 │  │                                                    [Save changes] │   │
 │  └───────────────────────────────────────────────────────────────────┘   │
 │                                                                          │
 │  ┌─ Brevo Connection ────────────────────────────────────────────────┐   │
 │  │   ● Connected  ·  Last tested 2 min ago                           │   │
 │  │                                                                   │   │
 │  │   Provider:          Brevo (SMTP relay)                           │   │
 │  │   Host / Port:       smtp-relay.brevo.com  :  587 (STARTTLS)      │   │
 │  │   Username:          8a****@smtp-brevo.com                        │   │
 │  │   Password:          ••••••••••••                                 │   │
 │  │                                                                   │   │
 │  │   Send test email to: [test@example.com   ]   [Send test]         │   │
 │  │                                                                   │   │
 │  │   ⓘ  Credentials are managed in the server environment.           │   │
 │  │      Contact the dev team to rotate them.                         │   │
 │  └───────────────────────────────────────────────────────────────────┘   │
 │                                                                          │
 │  ┌─ QA & Safety ─────────────────────────────────────────────────────┐   │
 │  │   ⚠  Email intercept is ACTIVE                                    │   │
 │  │      All outbound emails are being rerouted to:                   │   │
 │  │      shamandeepkaur924@gmail.com                                  │   │
 │  │                                                                   │   │
 │  │      This is a QA safety net. Disable by removing                 │   │
 │  │      EMAIL_INTERCEPT_TO from .env on the server.                  │   │
 │  └───────────────────────────────────────────────────────────────────┘   │
 │                                                                          │
 └──────────────────────────────────────────────────────────────────────────┘
```

The QA & Safety section only renders when `EMAIL_INTERCEPT_TO` is active. In production it stays hidden — no banner, no empty card.

---

## 4. API contracts

### 4.1 `GET /api/v1/settings/email`

Returns the current state of all three sections in one call.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "senderIdentity": {
      "fromName":               "SETT Groups",
      "fromEmail":              "groups@s-e-t-t.com",
      "replyToFallback":        "groups@s-e-t-t.com",
      "staffNotificationEmail": "ops@s-e-t-t.com"
    },
    "connection": {
      "provider":        "Brevo (SMTP relay)",
      "host":            "smtp-relay.brevo.com",
      "port":            587,
      "security":        "STARTTLS",
      "usernameMasked":  "8a****@smtp-brevo.com",
      "passwordMasked":  "••••••••••••",
      "configured":      true,
      "status":          "connected",
      "statusError":     null,
      "lastTestedAt":    "2026-06-02T11:42:08.123Z"
    },
    "intercept": {
      "active": true,
      "target": "shamandeepkaur924@gmail.com"
    }
  }
}
```

**Notes for each block:**

#### `senderIdentity`
- All four fields are strings. Empty string means "not set"; in that case the BE falls back to the env default at send time.
- These are the **only fields the admin can edit.**
- For new fields, expect the BE to seed initial values from the matching env vars on first load — so a freshly-deployed instance shows the env values immediately.

#### `connection`
- Everything in this block is **read-only**. Don't render edit affordances for any of it.
- `configured` is true when the env has `SMTP_HOST` set (i.e. the BE can actually create a transport). Show the section as "Not configured — contact dev team" if false.
- `status` is one of `"connected"`, `"error"`, `"untested"`. Drives the dot colour (green / red / grey).
- `statusError` is a human-readable string when `status === "error"` (e.g. `"535 5.7.8 Authentication credentials invalid"`). Display below the status line, truncate to one line.
- `lastTestedAt` is ISO 8601, or `null` if never tested. Format as "Last tested 2 min ago" (use your existing relative-time helper).
- `usernameMasked` and `passwordMasked` are pre-masked by the BE. **Do not** ask the BE for the unmasked values — that's deliberately not exposed over HTTP.

#### `intercept`
- `active: true` ⇒ render the warning card.
- `active: false` ⇒ omit the entire QA & Safety section. Don't render an empty "intercept off" card; that's noise.
- `target` is the address all outbound mail is being rerouted to. Display verbatim.

---

### 4.2 `PUT /api/v1/settings/email`

Save the editable fields (`senderIdentity` only). Partial updates allowed — send only the fields the admin changed.

**Request body:**

```json
{
  "fromName":               "SETT Groups",
  "fromEmail":              "groups@s-e-t-t.com",
  "replyToFallback":        "groups@s-e-t-t.com",
  "staffNotificationEmail": "ops@s-e-t-t.com"
}
```

All four fields are optional. Validation rules:
- `fromName`: 1–80 chars, no newlines.
- `fromEmail`, `replyToFallback`, `staffNotificationEmail`: must be valid email per Zod's `z.string().email()`.
- Empty string `""` is **accepted** for any field and means "clear this; fall back to env at send time". Useful for resetting after a typo.

**Response (200):** same shape as `GET /settings/email` (so the FE can re-render off the response without a second round-trip).

**Errors:**
- `400 INVALID_EMAIL` — one of the email fields didn't parse.
- `400 VALIDATION_ERROR` — generic Zod failure (e.g. `fromName` > 80 chars).

---

### 4.3 `GET /api/v1/settings/email/test-status`

Pings the live SMTP transport (`transporter.verify()`) and returns the current connection state. Used by the "● Connected" dot in the Brevo Connection card.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "configured":   true,
    "status":       "connected",
    "statusError":  null,
    "lastTestedAt": "2026-06-02T11:42:08.123Z"
  }
}
```

Or on failure:

```json
{
  "success": true,
  "data": {
    "configured":   true,
    "status":       "error",
    "statusError":  "535 5.7.8 Authentication credentials invalid",
    "lastTestedAt": "2026-06-02T11:42:08.123Z"
  }
}
```

The endpoint always returns 200 even if the transport is broken — the connection state is *data*, not an error. Use the `status` field, not the HTTP status, to decide what to show.

**Caching:** the BE caches the result for 60 s to avoid hammering Brevo on every page open. If the admin really wants a fresh ping, they can use the "Send test email" button (§4.4) which always re-verifies.

---

### 4.4 `POST /api/v1/settings/email/test-send`

Sends a small test email to a target address via the live Brevo transport. Used by the "Send test" button in the Brevo Connection card.

**Request body:**

```json
{ "to": "test@example.com" }
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "delivered":  true,
    "messageId":  "<a8f4e2c1...@smtp-brevo.com>",
    "sentAt":     "2026-06-02T11:43:12.567Z"
  }
}
```

**Errors:**
- `400 INVALID_EMAIL` — `to` not a valid email.
- `429 RATE_LIMITED` — one test per minute per IP. Show: "Please wait before sending another test email."
- `502 SMTP_ERROR` — Brevo rejected the message. Body includes `error: "<smtp error string>"` — display it inline in the card.
- `503 NOT_CONFIGURED` — `SMTP_HOST` is missing. Show: "Email is not configured. Contact the dev team."

The test email body is fixed by the BE — a short "If you can read this, the SETT Hub email configuration is working" with the brand header. The FE doesn't need to compose it.

---

## 5. UX details that matter

### 5.1 Status dot semantics

| `status` | Dot colour | Sub-label |
|---|---|---|
| `connected` | green | `Last tested {relative}` |
| `error` | red | `Failed: {statusError}` (truncate to one line, full text on hover) |
| `untested` | grey | `Not tested yet` |

When `configured: false`, override everything: render a grey dot with `Not configured — contact dev team`.

### 5.2 Save button behaviour

- Disabled until at least one field in the form has changed (compare to the initial GET response).
- On successful PUT: toast "Saved", then re-fetch (or use the PUT response directly) so any BE-side transformations (trimming, casing) reflect in the form.
- On 400: keep the form values, show inline errors next to the offending field. The Zod error response includes the field path so you can target it.

### 5.3 Test-send button

- Has its own input field for `to` (default empty — do **not** pre-fill with the admin's logged-in email; force them to type it consciously to avoid accidentally testing to a real customer address).
- Disabled while a test is in flight; show a spinner inside the button.
- After success: green inline "Sent to {to} ✓" below the button, dismissable.
- After error: red inline error text, full message visible.
- Don't auto-clear the input on success; keep it so the admin can re-send if they're iterating.

### 5.4 Editing sender email is a bigger deal than it looks

When the admin changes `fromEmail` to something that isn't the Brevo-verified sender (`groups@s-e-t-t.com`), Brevo will silently rewrite the `From:` header to the verified one anyway — but it WILL look weird in the customer's inbox (the visible name might differ from the actual sending domain).

**Recommend:** show an inline warning under the `fromEmail` field when the value differs from `groups@s-e-t-t.com`:

> ⚠ Brevo only delivers from verified senders. Emails will still be sent from `groups@s-e-t-t.com` regardless of this value. Change this only if a different sender has been verified in the Brevo dashboard.

The BE will accept the change either way — this is purely an FE-side warning.

### 5.5 Intercept banner placement

- Use a yellow warning style (not red — it's intentional, not broken).
- Sticky inside the Email Configuration page, NOT a global app-wide banner. Reason: intercept is set on local/QA environments where every dev expects to see it. A global banner would be noisy.

---

## 6. Edge cases

### 6.1 `SMTP_HOST` not set at all (fresh install)

`GET /settings/email` returns:

```json
{
  "connection": {
    "provider":        "Brevo (SMTP relay)",
    "configured":      false,
    "host":            null,
    "port":            null,
    "security":        null,
    "usernameMasked":  null,
    "passwordMasked":  null,
    "status":          "untested",
    "statusError":     null,
    "lastTestedAt":    null
  }
}
```

FE: render "Brevo Connection" section in a disabled state with one line: "Not configured — contact the dev team to set up SMTP credentials." Test-send button is hidden (not just disabled) in this case.

### 6.2 Admin tries to PUT an obviously broken email

Zod catches it before the BE writes anything. Inline field error. No partial save.

### 6.3 Admin clears `staffNotificationEmail` (sends empty string)

BE stores empty string. At alert time, `notification.service.ts` sees empty and falls back to `STAFF_NOTIFICATION_EMAIL` from env. If env is also empty, **the alert is skipped silently** (logged at WARN level so ops can see it in PM2 logs). This is the existing behaviour — not a new edge case.

### 6.4 Concurrent admins editing

Last write wins. We don't expect more than one ops person editing settings concurrently, and the consequences of a race are mild (one of two values applies). If this turns out to matter, we'll add an ETag — not before.

### 6.5 The page is opened during a Brevo outage

`GET /settings/email` does NOT block on the live verify call — it reads the cached `lastTestedAt` / `status` and returns immediately. The dot may show stale state. The "Send test" button is the way to force a fresh check.

If you also call `GET /settings/email/test-status` on page mount to refresh the dot, expect it to take up to ~10 s when Brevo is unreachable (TCP timeout). Show the dot in `untested` (grey) while loading, then update.

---

## 7. What the BE will do for this milestone

Reference, so you know what to expect:

1. Add three new keys to the `settings.email` category in the DB: `fromEmail`, `replyToFallback`, `staffNotificationEmail`.
2. Migrate `notification.service.ts` to read from DB first, env as fallback (same precedence as `/settings/policies` — admin edit wins).
3. Build the four endpoints above (§4.1–§4.4).
4. Mask credentials before they go on the wire.
5. Delete the dead Google OAuth code path from `getEmailConfig()` and remove the `/email/disconnect/:userId` route.
6. Implement 60 s cache for `test-status`, 1/min rate limit for `test-send` (per IP).
7. Implement the EMAIL_INTERCEPT_TO transparency block.

No Brevo SDK is being added — we continue to use `nodemailer` with SMTP. Brevo's REST API isn't needed for the current feature set.

---

## 8. Verifying the result

1. Open Settings → Email Configuration. Three sections render (or two if intercept is off).
2. Edit "Sender Name" → save → page reflects new value immediately.
3. Edit "Sender Email" to a non-verified address → inline warning appears below the field (not blocking). Save succeeds.
4. Connection card shows green dot, host, port, masked username + password.
5. Click "Send test" with your own email → mail arrives within ~10 s with subject "SETT Hub email configuration test".
6. Type an invalid email in the test field → 400 inline error.
7. Hit the test button 3× quickly → second and third attempt show 429 rate-limit message.
8. On the local dev environment with `EMAIL_INTERCEPT_TO` set, send a real offer email from a proposal → it lands in the intercept inbox, not the customer's, and the QA & Safety banner shows the intercept target.

If any of those fails, the issue is on the BE — flag it back.

---

## 9. Out of scope

- **Editing SMTP host / port / credentials in the UI.** Stays env-only forever; rotated via deployment, not the web.
- **Sending from any provider other than Brevo.** The transport code already supports any SMTP relay, but the UI hard-codes "Brevo (SMTP relay)" as the provider label. If we switch providers, that's a one-line code change + a copy-only doc update.
- **Per-staff sender identity** (e.g. "send as the assigned agent's address"). The handover earlier explicitly said the sender stays fixed at `groups@s-e-t-t.com`. Not changing that here.
- **Email template editing.** Templates remain in code ([src/services/emailTemplate.ts](./src/services/emailTemplate.ts)). If/when product wants admin-editable templates, that's its own settings page.
- **Audit trail of who changed what.** The existing audit-log infra is plumbed into the request layer; we'll add audit entries on the PUT endpoint as part of the implementation, but the UI doesn't need to surface them yet.

---

## 10. Questions you might have

**Q: Why no "Connect to Brevo" button like the old Gmail UI had?**
Because there's nothing to connect — SMTP creds live in env, set once at deploy time. The "Brevo Connection" card is a status panel, not an auth flow.

**Q: Can I get the unmasked password via the API for an "edit password" flow?**
No. The BE explicitly never exposes the raw credentials over HTTP. Rotation is a deployment-time operation: edit `.env`, restart PM2.

**Q: What if the admin wants to set up a completely different email provider?**
Out of scope for this milestone. Tell me which provider, and we'll either add it as a transport option (no UI change) or expose a provider picker (UI + BE change). Don't loosen the current panel to "any SMTP server" without that conversation.

**Q: The intercept banner is a security thing. Can it be in production by mistake?**
Only if someone sets `EMAIL_INTERCEPT_TO` in the production `.env`. The banner makes that mistake visible the moment the admin opens the page. That's the intended safety net.

**Q: Why use a 60 s cache on test-status if the data is stale?**
Brevo's verify endpoint is rate-limited on their end. Without the cache, opening the page (or hitting it from a polling FE) would burn through Brevo's quota and trip false-negative "disconnected" errors. The "Send test" button bypasses the cache when the admin needs ground truth.

---

## 11. Contacts

Backend: Neha. Hand me the FE designs (or a Figma link) before you start so I can sanity-check the field names and confirm the API shape. If you find the BE-returned data doesn't match what the design needs, ping me **before** building around the gap — adjusting the response shape is cheap before the FE ships, expensive after.
