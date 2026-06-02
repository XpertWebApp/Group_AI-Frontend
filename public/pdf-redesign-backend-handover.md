# Offer PDF Redesign — Backend Handover

**Audience:** Backend developer
**Author:** Frontend (Shamandeep)
**Date:** 2026-06-02
**Frontend branch:** `milestone_5v3`
**Frontend reference:** [components/ui/ContractPreviewModal.tsx](../components/ui/ContractPreviewModal.tsx)
**Status:** Design is shipped on the FE preview modal. Server-side PDF needs to match it pixel-for-pixel.

---

## 1. Why this doc exists

The FE preview modal (the popup staff sees when they click **PREVIEW PDF**) was redesigned to follow the SETT Brand Guidelines v2 — navy header, green accents, dark tables, brand typography. The downloaded/sent PDF is still the **old** design.

That mismatch is bad because:

- Staff trusts what they see in Preview — they expect the customer to receive an identical document.
- The brand book is non-negotiable; the legacy PDF doesn't follow it.

**Goal of this doc:** give you everything needed to reproduce the new design server-side. No back-and-forth, no "what colour is that" Slack messages. If you can render HTML/CSS to PDF (WeasyPrint, wkhtmltopdf, Puppeteer/Playwright, Chromium-headless, any of them), you can build this directly from this spec.

If your renderer of choice can't quite match a spec value (e.g. `letter-spacing` rounds differently), tell me which line and we'll adjust — don't guess.

---

## 2. Where to look on the FE

The single source of truth is the React component at:

```
components/ui/ContractPreviewModal.tsx
```

If anything in this doc seems ambiguous, open that file and look at the JSX — it is hand-written, not generated, so the styles in the file are the spec.

The component's content is driven entirely by:

- `request: BookingRequest` — customer details, dates, destination, T&C, cancellation
- `proposal: Proposal` — hotels (with rooms), services, totals
- `pdfLanguage: 'en' | 'de'` — picks an EN or DE i18n bundle

All other strings come from `lib/i18n/translations.ts` under the `offer.contract.*` slice (see §10).

---

## 3. Page geometry

| Property | Value |
|---|---|
| Page size | **A4 portrait** (210 × 297 mm) |
| Page margin (left/right) | **0 mm** — the document chrome fills the full width |
| Page margin (top/bottom) | **0 mm** |
| Content area | The "document card" rendered inside the page. Outer border `1px solid #E0E0E0`, `border-radius: 8px`, full-width minus 24 px gutters when previewed on screen. **For the PDF, drop the outer border-radius and gutter and let the document fill the page** — the rounded corner is a screen-only nicety. |
| Document inner padding | **32 px (8 mm) horizontal on every section block**. Vertical padding varies per section (see §6). |
| Multi-page handling | Whenever content overflows one A4 page, the page break should fall **between sections, not inside a table row**. Use `page-break-inside: avoid` on every table block, hotel block, T&C block. The header is **only on page 1**; the footer is **only on the last page** (do not repeat). |

If your renderer supports running headers (e.g. WeasyPrint `@page :first` / `@page`), use them. If not, render the header/footer once inline at the top/bottom of the document body and trust pagination.

---

## 4. Colour tokens (the only colours the document uses)

| Token | Hex | Usage |
|---|---|---|
| `--sett-navy` | `#071C42` | Brand primary. Section headers, table header bg, footer bg, all body text. |
| `--sett-primary` (green) | `#AAC737` | Accent stripes, "OFFER" ribbon text, "Supplier"/"Customer" small-caps labels, grand total bar background, CTA buttons. |
| `--sett-green-dark` | `#7A9420` | Hover state for green buttons. Not relevant for PDF (no hover). |
| `--sett-green-light` | `#C8E050` | Border of the payment-due pill. |
| `--sett-grey` | `#686868` | Secondary text (T&C bullets, table sub-labels, meta-row labels). |
| Border colour | `#E0E0E0` | Every panel border, table border, divider between sections. |
| Light row bg | `#F8F9FA` | Subtotal row backgrounds inside tables. |
| Payment-due pill bg | `#F5F9E8` | The "Please pay … by …" highlight. |
| White | `#FFFFFF` | Document background, header/footer text, payment-pill text bg. |

**No other colours.** If you find yourself reaching for a third grey or a fourth green, stop and ask — it's wrong.

---

## 5. Typography

The brand font is **Montserrat**, weights 400/500/600/700/800. Embed it as a `@font-face` from Google Fonts or ship the `.ttf` files alongside the renderer.

Fallback stack: `Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

### Size & weight reference

These are the on-screen pixel sizes. Treat 1 px = 0.75 pt for print or use the exact values if your renderer accepts px in print CSS (Chromium-based ones do).

| Role | Size | Weight | Letter-spacing | Transform | Colour |
|---|---|---|---|---|---|
| Document title (modal only — N/A for PDF) | 18 px | 700 | normal | — | navy |
| Header — "OFFER" ribbon | 14 px | 700 | `0.08em` | uppercase | green |
| Header — "Document No. …" | 13 px | 600 | normal | — | white |
| Header — date under doc no. | 12 px | 400 | normal | — | white @ 85% opacity |
| Section heading (e.g. "Hotel Details") | 16 px | 700 | `0.05em` | uppercase | navy |
| Small-caps label ("Supplier", "Customer", "Trip Details") | 11 px | 700 | `0.08em` | uppercase | green |
| Bold value name (company name, customer name) | 14 px | 700 | normal | — | navy |
| Meta-row label ("EMAIL ADDRESS", etc.) | 10 px | 700 | `0.05em` | uppercase | `#686868` |
| Meta-row value (the actual email/phone) | 13 px | 400 | normal | — | navy |
| Table header (navy bar text) | 11 px | 700 | `0.05em` | uppercase | white |
| Table body cell | 13 px | 400 | normal | — | navy |
| Table body cell — last column (totals) | 13 px | 700 | normal | — | navy |
| Subtotal label | 12 px | 600 | `0.05em` | uppercase | `#686868` |
| Subtotal value | 14 px | 700 | normal | — | navy |
| Grand total label | 16 px | 700 | `0.08em` | uppercase | navy |
| Grand total value | 22 px | 700 | normal | — | navy |
| Body paragraph (cancellation, T&C) | 13 px | 400 | normal | — | `#686868` |
| T&C bullets | 12 px | 400 | normal | — | `#686868` (bullet itself is green) |
| Footer legal | 10 px | 400 | normal | — | white @ 80% opacity |
| Footer "ISSUED BY" label | 10 px | 700 | `0.08em` | uppercase | green |
| Footer "Issued by" name | 13 px | 600 | normal | — | white |

`line-height` for body text: **1.5**. For headings and table cells: **1.2**. For the table header bar (navy): **1** (cells already have padding, double leading looks loose).

---

## 6. Document structure — section by section

The document is one continuous white "card" containing the sections below, in order.
Every section is separated by a **`1px solid #E0E0E0` bottom border** unless noted otherwise.

The order is fixed. Empty sections must be **omitted entirely** (no empty headings). See §8 for the conditional rules.

### 6.1 HEADER — navy bar with logo + document meta

```
┌──────────────────────────────────────────────────────────┐
│  [LOGO white]                              OFFER         │  ← green small-caps, 14/700/0.08em
│                                            Document No.  │  ← white 13/600
│                                            475/2026      │
│                                            05/06/2026    │  ← white 12/400 @ 85% opacity
└──────────────────────────────────────────────────────────┘
█████████████████████████████████████████████████████████████ ← 3 px green accent bar
```

**Specs:**
- Background `#071C42`, padding **24 px horizontal**, **24 px vertical** (top + bottom).
- Logo: ship as **white SVG** at `36 px tall`. (FE achieves this by `filter: brightness(0) invert(1)` on the green logo. For PDF you should pre-render or ship a white-on-transparent SVG so you don't depend on CSS filters working in your engine.)
- Right column: 3 stacked lines, right-aligned, **4 px gap** between lines.
  - Line 1: "OFFER" (i18n key `contract.offer`) — green, uppercase, 14/700/0.08em
  - Line 2: "Document No. {code}" (i18n key `contract.documentNo`) — white, 13/600
  - Line 3: date the document was created (i18n: format via locale, EU style `dd.mm.yyyy`) — white 12/400 @ 85% opacity
- Document code format: `{referenceNumber || id.slice(0,8)}/{createdAt.year}` — e.g. `475/2026`.
- Immediately below the header: **3 px solid green bar** (`#AAC737`), full width, no padding.

### 6.2 TWO-COLUMN METADATA — Supplier (left) | Customer (right)

```
┌───────────────────────────────┬───────────────────────────────┐
│ SUPPLIER                      │ CUSTOMER                      │ ← green 11/700/0.08em uppercase
│ S-E-T-T WORLDWIDE …           │ John Doe                      │ ← navy 14/700
│ ASSIGNED PERSON               │ EMAIL ADDRESS                 │ ← grey 10/700/0.05em uppercase
│ Vincent Riefler               │ john.doe@example.com          │ ← navy 13/400
│ EMAIL ADDRESS                 │ PHONE NUMBER                  │
│ vincent@s-e-t-t.com           │ +49 …                         │
│ PHONE NUMBER                  │ ADDRESS                       │
│ +45 32 74 93 16               │ Berliner Straße 12, …         │
│ ADDRESS                       │                               │
│ Fujairah Creative Tower …     │                               │
│ TAX ID                        │                               │
│ 1001233897                    │                               │
└───────────────────────────────┴───────────────────────────────┘
```

**Specs:**
- Grid: **2 columns, equal width**, `gap: 24 px`.
- Padding: **32 px horizontal**, **24 px vertical**.
- Top of each column: small green label, then bold navy name, then a vertical stack of MetaRow blocks (`6 px` gap between rows).
- Each `MetaRow` has two lines: a 10/700/0.05em uppercase grey label, and a 13/400 navy value, separated by **2 px** vertical gap.
- **Supplier** rows (always the same hard-coded data — `SETT WORLDWIDE`):
  - Assigned Person: Vincent Riefler
  - Email: vincent@s-e-t-t.com
  - Phone: +45 32 74 93 16
  - Address: Fujairah Creative Tower, P.O. Box 4422, Fujairah, UAE
  - Tax ID: 1001233897
- **Customer** rows (from `request`):
  - Bold name = `firstName + ' ' + lastName` (fallback to `contactName`, else `—`)
  - Email: `request.contactEmail` (fallback `—`)
  - Phone: `request.contactPhone` (fallback `—`)
  - Address: `request.hotelLocation` || `request.destinationName` (fallback `—`)

### 6.3 TRIP DETAILS — full-width row

```
TRIP DETAILS                                                     ← green 11/700/0.08em
┌────────────────────┬────────────────────┬────────────────────┐
│ DESTINATION        │ CHECK IN/OUT       │ GUESTS             │
│ Palermo            │ 16.10.2026 — 17.10 │ 12                 │
└────────────────────┴────────────────────┴────────────────────┘
```

**Specs:**
- Padding: **32 px horizontal**, **20 px vertical**.
- Above the grid: small green "TRIP DETAILS" label, `12 px` margin-bottom.
- Grid: **3 equal columns**, `gap: 24 px`. Each cell is a MetaRow (label + value).
- Values:
  - Destination → `request.destinationName`
  - Check In/Out → `formatDate(checkinDate) + ' — ' + formatDate(checkoutDate)` (EU `dd.mm.yyyy`)
  - Guests → `request.groupSize`

### 6.4 HOTEL DETAILS

Rendered only if at least one hotel has `includedInTotal !== false`.

```
HOTEL DETAILS                                                    ← navy 16/700/0.05em
B&B Porta di Castro                       Reservation Ref. ABC123  ← navy 14/700  +  grey 12/400
┌───────────────────────────────────────────────────────────────┐
│ ROOM TYPE          SELL    QTY  NIGHTS    TOTAL                │ ← navy bg, white 11/700
├───────────────────────────────────────────────────────────────┤
│ Standard Double    €132.01   6     1     €792.06               │ ← navy 13/400
│ Single             €98.00    2     1     €196.00               │
├───────────────────────────────────────────────────────────────┤
│                                  SUBTOTAL          €988.06     │ ← bg #F8F9FA, navy 14/700
└───────────────────────────────────────────────────────────────┘
```

**Specs:**
- Section padding: **32 px horizontal**, **24 px vertical**.
- Title: navy 16/700/0.05em uppercase, **16 px margin-bottom**.
- **One block per hotel.** Between hotels: **20 px vertical gap**.
- Each hotel block:
  - **Header row** (above the table): two columns. Left = `hotelName ?? hotelCode`, navy 14/700. Right = `Reservation Ref. {hotelRef || tid || '#'+id.slice(0,8)}`, grey 12, with "Reservation Ref." bolded.
  - **8 px gap** between hotel-header row and the table.
- **Table** (one per hotel):
  - Outer: `border: 1px solid #E0E0E0`, `border-radius: 4 px`, `overflow: hidden`.
  - **Header row**: bg `#071C42`, padding `12 px 16 px`. Five columns:

    | Col | Label key | Width | Align |
    |---|---|---|---|
    | 1 | `roomType` | flex (fills remaining) | left |
    | 2 | `sell` | 80 px | right |
    | 3 | `qty` | 55 px | center |
    | 4 | `nights` | 65 px | center |
    | 5 | `total` | 100 px | right |

    All header cells: white, 11/700/0.05em, uppercase.
  - **Body rows**: padding `12 px 16 px`, `border-top: 1px solid #E0E0E0` between rows (no border on first row). Same column widths as header. Body text 13/400 navy; **last column 13/700**.
  - **Subtotal row** (always last): `border-top: 1px solid #E0E0E0`, `background: #F8F9FA`, padding `12 px 16 px`, content right-aligned. Label "SUBTOTAL" in grey 12/600/0.05em uppercase with `16 px` right-margin. Value navy 14/700 in a 100 px right-aligned column.
- **Room labels** come from `proposal.hotels[i].rooms` — see §9 for the rules on i18n + fallback.
- **Row total** = `sell × qty × nights`.
- **Subtotal** = sum of all row totals in that hotel block.
- If a hotel has **no rooms** (rare — manual hotel without room breakdown), skip the table and instead render a single grey line: `Total: €{formatCurrencyEU(totalPrice, currency)}`.

### 6.5 SERVICE DETAILS

Rendered only if at least one service has `includedInTotal !== false`.

```
SERVICE DETAILS
┌───────────────────────────────────────────────────────────────┐
│ SERVICE         DATE              QTY    SELL    TOTAL         │ ← navy bg, white 11/700
├───────────────────────────────────────────────────────────────┤
│ Airport Pickup  20.10.2026         1   €120.00  €120.00       │ ← navy 13/400
│ City Tour       21.10 — 22.10      2    €85.00  €170.00       │
├───────────────────────────────────────────────────────────────┤
│                                   SUBTOTAL          €290.00    │
└───────────────────────────────────────────────────────────────┘
```

**Specs:** identical chrome to the Hotel table; only the column set differs.

| Col | Label key | Width | Align |
|---|---|---|---|
| 1 | `service` | flex | left |
| 2 | `date` | 130 px | center |
| 3 | `qty` | 55 px | center |
| 4 | `sell` | 80 px | right |
| 5 | `total` | 100 px | right |

- Date label rules (matches `s.dateFrom`, `s.dateTo` on each service):
  - Both present and different → `dd.mm.yyyy — dd.mm.yyyy`
  - Only `dateFrom` (or both equal) → single date
  - Neither → `—`
  - The date cell uses **grey 12/400** (lighter than the other body cells) because it's metadata, not a value.
- Row total = `sellPrice × quantity`.
- Subtotal = sum of all row totals.

### 6.6 GRAND TOTAL

```
████████████████████████████████████████████████████████████████
█  GRAND TOTAL                                       €2,484.00 █  ← green bg, navy text
████████████████████████████████████████████████████████████████
```

**Specs:**
- Full-width row. Background `#AAC737`. Padding `20 px 32 px`. Bottom border `1px solid #E0E0E0`.
- Left: "GRAND TOTAL" (i18n key `grandTotal`), navy 16/700/0.08em uppercase.
- Right: value, navy 22/700, prefixed `€`, formatted EU style (`,` decimal, `.` thousands — see §11).
- Value = sum of all hotel `totalPrice` (for hotels with `includedInTotal !== false`) **plus** sum of `sellPrice × quantity` for all services (with same inclusion check).

### 6.7 PAYMENT DETAILS

```
PAYMENT DETAILS
┌─────────────────────────────────────────────────────────────────┐
│ Please pay €2,484.00 by 16.09.2026.                              │ ← payment-due pill
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ BANK NAME              Emirates NBD                              │ ← bank table
│ ACCOUNT HOLDER         S-E-T-T Worldwide Reservation FZE         │
│ IBAN                   AE12 0260 0010 1234 5678 901              │
│ SWIFT / BIC            EBILAEAD                                  │
└─────────────────────────────────────────────────────────────────┘

[ 💳  PAY BY CARD ]                                                ← green CTA
```

**Specs:**
- Section padding: **32 px horizontal**, **24 px vertical**.
- Title: navy 16/700/0.05em uppercase, **16 px margin-bottom**.
- **Payment-due pill** (the "Please pay …" highlight):
  - Background `#F5F9E8`, border `1px solid #C8E050`, border-radius `4 px`.
  - Padding `12 px 16 px`. Margin-bottom `16 px`.
  - Text: navy 13/400. Words "Please pay" and "by" come from i18n (`payPrompt`, `payBy`). The amount and the date are **bolded inline**.
  - Date format: EU dotted `dd.mm.yyyy`.
  - **Due date** = `checkoutDate - 30 days`. If `checkoutDate` is missing, render `—`.
- **Bank table**:
  - Outer: `border: 1px solid #E0E0E0`, `border-radius: 4 px`, `overflow: hidden`. Margin-bottom `16 px`.
  - Each row: padding `10 px 16 px`, `border-bottom: 1px solid #E0E0E0` (no border on last row).
  - Label column: fixed `180 px` wide, grey 11/600/0.05em uppercase.
  - Value column: flex, navy 13/600.
  - **Rows are hard-coded** (these are SETT's bank details, not customer data):
    - Bank Name → Emirates NBD
    - Account Holder → S-E-T-T Worldwide Reservation FZE
    - IBAN → AE12 0260 0010 1234 5678 901
    - SWIFT / BIC → EBILAEAD
- **PAY BY CARD button**:
  - Anchor styled as a button. Background `#AAC737`, height `41 px`, padding `0 24 px`, border-radius `4 px`.
  - Text: navy 13/700/0.08em uppercase. Credit-card icon to the left, `8 px` gap.
  - The href is a tokenised payment link from the BE. For now the FE renders `#` because the link isn't built yet — please coordinate with us before generating the link in the PDF so we agree on the URL shape.

### 6.8 CANCELLATION CONDITIONS

Rendered only if `request.cancellationConditions` is non-empty (HTML string).

- Title: navy 16/700/0.05em uppercase.
- Body: `request.cancellationConditions` is **untrusted user-authored HTML** from the BookingRequest. Render it with HTML sanitisation enabled (allow `<p>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<br>`; strip everything else, especially scripts and inline styles).
- Body text: 13/400, line-height 1.6, colour `#686868`.

### 6.9 TERMS & CONDITIONS

Always rendered.

- Title: same heading style as Cancellation.
- Optional `request.termsAndConditions` HTML rendered first (same sanitisation rules).
- Then a hard-coded bullet list (these strings live in the FE today; we'll move them to i18n once you're ready):

  > • Rates and availability is based on the booked number of rooms and passengers / nights only and can be subject to changes if any of these parameters is changed/amended
  > • Should there be any changes in the taxes/city taxes during the contract's validity, so will the rates be amended according to the resulting new tax/city taxes regulations
  > • All Rates are NET Rates (no commission included) and need to be paid without any deductions or bank fees.
  > • This document is printed out electronically and is valid without stamp and signature

- Bullets: `flex` row, **green bullet character** (`•` colour `#AAC737`), `8 px` gap, `8 px` between list items. Bullet font-size 12 px, body text colour `#686868`.

### 6.10 FOOTER

```
─────────────────────────────────────────────────────────────── ← 2 px green divider
████████████████████████████████████████████████████████████████
█  © 2026 S-E-T-T Worldwide Reservation FZE …       ISSUED BY  █  ← green 10/700/0.08em
█  This document is generated electronically …      Oliver R.  █  ← white 13/600
████████████████████████████████████████████████████████████████
```

**Specs:**
- Just **above** the footer: a **2 px green bar** (`#AAC737`), full width.
- Footer bar: bg `#071C42`, padding `20 px 32 px`, flex layout, `align-items: flex-end`, `justify-content: space-between`.
- **Left:** legal blurb (i18n key `footerLegal`). Text white @ 80% opacity, 10/400, line-height 1.5, max-width **520 px** so it doesn't run into the right column.
- **Right:** two stacked lines, right-aligned.
  - Line 1: "ISSUED BY" (i18n key `issuedBy`). Green 10/700/0.08em uppercase.
  - Line 2: "Oliver Riefler" (hard-coded today, will move to a config field later). White 13/600.

---

## 7. Reference HTML/CSS (copy-paste starting point)

This is a self-contained HTML template that renders close to the spec. Use it as a starting point — adjust spacing where your renderer diverges.

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  :root {
    --navy:#071C42; --green:#AAC737; --green-light:#C8E050;
    --grey:#686868; --border:#E0E0E0; --row-alt:#F8F9FA; --pill:#F5F9E8;
  }
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; font-family: 'Montserrat', sans-serif; color: var(--navy); -webkit-font-smoothing: antialiased; }
  .doc { background: #fff; }

  /* Header */
  .doc-header { background: var(--navy); padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
  .doc-header .logo { height: 36px; }
  .doc-header .meta { text-align: right; }
  .doc-header .meta .label { color: var(--green); font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .doc-header .meta .docno { color: #fff; font-size: 13px; font-weight: 600; margin-top: 4px; }
  .doc-header .meta .date { color: rgba(255,255,255,0.85); font-size: 12px; margin-top: 4px; }
  .accent-bar { height: 3px; background: var(--green); }

  /* Section base */
  .section { padding: 24px 32px; border-bottom: 1px solid var(--border); page-break-inside: avoid; }
  .section h3 { color: var(--navy); font-size: 16px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin: 0 0 16px; }
  .label-sm { color: var(--green); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; }

  /* Metadata two-column */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
  .meta-name { color: var(--navy); font-size: 14px; font-weight: 700; margin-bottom: 8px; }
  .meta-row + .meta-row { margin-top: 6px; }
  .meta-row .k { color: var(--grey); font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
  .meta-row .v { color: var(--navy); font-size: 13px; margin-top: 2px; }

  /* Tables */
  .tbl { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
  .tbl .thead { background: var(--navy); display: flex; padding: 12px 16px; }
  .tbl .thead .col { color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
  .tbl .row { display: flex; padding: 12px 16px; border-top: 1px solid var(--border); }
  .tbl .row:first-of-type { border-top: none; }
  .tbl .row .col { color: var(--navy); font-size: 13px; }
  .tbl .row .col.bold { font-weight: 700; }
  .tbl .subtotal { display: flex; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--border); background: var(--row-alt); }
  .tbl .subtotal .lbl { color: var(--grey); font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-right: 16px; }
  .tbl .subtotal .val { color: var(--navy); font-size: 14px; font-weight: 700; width: 100px; text-align: right; }

  .col.flex { flex: 1; text-align: left; }
  .col.w80  { width: 80px;  text-align: right; }
  .col.w55  { width: 55px;  text-align: center; }
  .col.w65  { width: 65px;  text-align: center; }
  .col.w100 { width: 100px; text-align: right; }
  .col.w130 { width: 130px; text-align: center; }

  /* Grand total */
  .grand { background: var(--green); padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
  .grand .lbl { color: var(--navy); font-size: 16px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .grand .val { color: var(--navy); font-size: 22px; font-weight: 700; }

  /* Payment */
  .pay-pill { background: var(--pill); border: 1px solid var(--green-light); border-radius: 4px; padding: 12px 16px; margin-bottom: 16px; color: var(--navy); font-size: 13px; }
  .pay-pill b { font-weight: 700; }
  .bank-tbl { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
  .bank-tbl .r { display: flex; padding: 10px 16px; border-bottom: 1px solid var(--border); }
  .bank-tbl .r:last-child { border-bottom: none; }
  .bank-tbl .k { width: 180px; color: var(--grey); font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
  .bank-tbl .v { flex: 1; color: var(--navy); font-size: 13px; font-weight: 600; }
  .btn-cc { display: inline-flex; align-items: center; gap: 8px; height: 41px; padding: 0 24px; border-radius: 4px; background: var(--green); color: var(--navy); font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-decoration: none; }

  /* T&C list */
  .terms ul { list-style: none; padding: 0; margin: 0; }
  .terms li { display: flex; gap: 8px; color: var(--grey); font-size: 12px; line-height: 1.6; }
  .terms li + li { margin-top: 8px; }
  .terms li .b { color: var(--green); flex-shrink: 0; margin-top: 2px; }

  /* Footer */
  .footer-divider { height: 2px; background: var(--green); }
  .doc-footer { background: var(--navy); padding: 20px 32px; display: flex; justify-content: space-between; align-items: flex-end; }
  .doc-footer .legal { color: rgba(255,255,255,0.8); font-size: 10px; line-height: 1.5; max-width: 520px; }
  .doc-footer .issued .lbl { color: var(--green); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .doc-footer .issued .name { color: #fff; font-size: 13px; font-weight: 600; margin-top: 2px; }

  /* Page-break hints */
  .section, .tbl, .grand, .pay-pill, .bank-tbl, .doc-footer { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="doc">

  <div class="doc-header">
    <img class="logo" src="sett_logo_white.svg" alt="SETT">
    <div class="meta">
      <div class="label">{{ t.offer }}</div>
      <div class="docno">{{ t.documentNo }} {{ documentCode }}</div>
      <div class="date">{{ createdAt | euDate }}</div>
    </div>
  </div>
  <div class="accent-bar"></div>

  <div class="section grid-2">
    <div>
      <div class="label-sm">{{ t.supplier }}</div>
      <div class="meta-name">{{ t.sectionTitle }}</div>
      <div class="meta-row"><div class="k">{{ t.assignedPerson }}</div><div class="v">Vincent Riefler</div></div>
      <div class="meta-row"><div class="k">{{ t.emailAddress }}</div><div class="v">vincent@s-e-t-t.com</div></div>
      <div class="meta-row"><div class="k">{{ t.phoneNumber }}</div><div class="v">+45 32 74 93 16</div></div>
      <div class="meta-row"><div class="k">{{ t.address }}</div><div class="v">Fujairah Creative Tower, P.O. Box 4422, Fujairah, UAE</div></div>
      <div class="meta-row"><div class="k">{{ t.taxId }}</div><div class="v">1001233897</div></div>
    </div>
    <div>
      <div class="label-sm">{{ t.customer }}</div>
      <div class="meta-name">{{ contactName }}</div>
      <div class="meta-row"><div class="k">{{ t.emailAddress }}</div><div class="v">{{ request.contactEmail or '—' }}</div></div>
      <div class="meta-row"><div class="k">{{ t.phoneNumber }}</div><div class="v">{{ request.contactPhone or '—' }}</div></div>
      <div class="meta-row"><div class="k">{{ t.address }}</div><div class="v">{{ request.hotelLocation or request.destinationName or '—' }}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="label-sm">{{ t.tripDetails }}</div>
    <div class="grid-3">
      <div class="meta-row"><div class="k">{{ t.destination }}</div><div class="v">{{ request.destinationName or '—' }}</div></div>
      <div class="meta-row"><div class="k">{{ t.checkInOut }}</div><div class="v">{{ checkinDate | euDate }} — {{ checkoutDate | euDate }}</div></div>
      <div class="meta-row"><div class="k">{{ t.guests }}</div><div class="v">{{ request.groupSize or '—' }}</div></div>
    </div>
  </div>

  {% if hotels %}
  <div class="section">
    <h3>{{ t.hotelDetails }}</h3>
    {% for hotel in hotels %}
    <div style="margin-bottom: 20px;">
      <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
        <span style="color: var(--navy); font-size: 14px; font-weight: 700;">{{ hotel.hotelName or hotel.hotelCode }}</span>
        {% if hotel.hotelRef or hotel.tid %}
        <span style="color: var(--grey); font-size: 12px;"><b>{{ t.reservationRef }}</b> {{ hotel.hotelRef or hotel.tid }}</span>
        {% endif %}
      </div>
      <div class="tbl">
        <div class="thead">
          <div class="col flex">{{ t.roomType }}</div>
          <div class="col w80">{{ t.sell }}</div>
          <div class="col w55">{{ t.qty }}</div>
          <div class="col w65">{{ t.nights }}</div>
          <div class="col w100">{{ t.total }}</div>
        </div>
        {% for type, room in hotel.rooms.items() %}
        <div class="row">
          <div class="col flex">{{ room_label(type, room) }}</div>
          <div class="col w80">€{{ room.sell | eu_price }}</div>
          <div class="col w55">{{ room.qty }}</div>
          <div class="col w65">{{ room.nights }}</div>
          <div class="col w100 bold">€{{ (room.sell * room.qty * room.nights) | eu_price }}</div>
        </div>
        {% endfor %}
        <div class="subtotal"><span class="lbl">{{ t.subtotal }}</span><span class="val">€{{ hotel_subtotal | eu_price }}</span></div>
      </div>
    </div>
    {% endfor %}
  </div>
  {% endif %}

  {# Services table follows the same shape — omitted here for brevity #}

  <div class="grand">
    <span class="lbl">{{ t.grandTotal }}</span>
    <span class="val">€{{ grandTotal | eu_price }}</span>
  </div>

  <div class="section">
    <h3>{{ t.paymentDetails }}</h3>
    <div class="pay-pill">
      {{ t.payPrompt }} <b>€{{ grandTotal | eu_price }}</b> {{ t.payBy }} <b>{{ paymentDueDate | euDate }}</b>.
    </div>
    <div class="bank-tbl">
      <div class="r"><div class="k">{{ t.bankName }}</div><div class="v">Emirates NBD</div></div>
      <div class="r"><div class="k">{{ t.accountHolder }}</div><div class="v">S-E-T-T Worldwide Reservation FZE</div></div>
      <div class="r"><div class="k">{{ t.iban }}</div><div class="v">AE12 0260 0010 1234 5678 901</div></div>
      <div class="r"><div class="k">{{ t.swiftBic }}</div><div class="v">EBILAEAD</div></div>
    </div>
    <a class="btn-cc" href="{{ paymentLink }}">💳 {{ t.payByCard }}</a>
  </div>

  {% if request.cancellationConditions %}
  <div class="section terms">
    <h3>{{ t.cancellationConditions }}</h3>
    <div style="color: var(--grey); font-size: 13px; line-height: 1.6;">{{ request.cancellationConditions | safe }}</div>
  </div>
  {% endif %}

  <div class="section terms">
    <h3>{{ t.termsConditions }}</h3>
    {% if request.termsAndConditions %}<div style="color: var(--grey); font-size: 13px; line-height: 1.6; margin-bottom: 16px;">{{ request.termsAndConditions | safe }}</div>{% endif %}
    <ul>
      <li><span class="b">•</span><span>Rates and availability is based on the booked number of rooms …</span></li>
      <li><span class="b">•</span><span>Should there be any changes in the taxes/city taxes during the contract's validity …</span></li>
      <li><span class="b">•</span><span>All Rates are NET Rates (no commission included) …</span></li>
      <li><span class="b">•</span><span>This document is printed out electronically and is valid without stamp and signature</span></li>
    </ul>
  </div>

  <div class="footer-divider"></div>
  <div class="doc-footer">
    <p class="legal">{{ t.footerLegal }}</p>
    <div class="issued"><div class="lbl">{{ t.issuedBy }}</div><div class="name">Oliver Riefler</div></div>
  </div>

</div>
</body>
</html>
```

The template syntax above is Jinja-style; adapt to whatever templating engine you're using. The CSS is what matters.

---

## 8. Conditional rendering rules

Order of sections is fixed. **Sections that have no data must be omitted entirely** — do not render an empty heading.

| Section | Render when |
|---|---|
| Header | always |
| Supplier / Customer | always |
| Trip Details | always |
| Hotel Details | `proposal.hotels` has at least one entry with `includedInTotal !== false` |
| Service Details | `proposal.services` has at least one entry with `includedInTotal !== false` |
| Grand Total | always |
| Payment Details | always |
| Cancellation Conditions | `request.cancellationConditions` is a non-empty string |
| Terms & Conditions | always (even if `request.termsAndConditions` is empty, the hard-coded bullets always render) |
| Footer | always |

When a section is omitted, the **section above it** still keeps its bottom border (so we don't end up with two adjacent borders).

---

## 9. Room-label translation

This is the only translation step that needs special care. The FE has a helper that maps API room codes to brand-translatable labels:

```ts
formatRoomType(raw, tAddHotel) {
  const normalized = raw.toLowerCase().replace(/[_\s]/g, '');
  const map = {
    twinbeds: tAddHotel.twinBed,
    twin: tAddHotel.twinBed,
    standarddoublebeds: tAddHotel.standardDoubleBed,
    single: tAddHotel.roomSingle,
    double: tAddHotel.roomDouble,
    triple: tAddHotel.roomTriple,
    quadruple: tAddHotel.roomQuadruple,
    suite: tAddHotel.roomSuite,
    suites: tAddHotel.roomSuites,
  };
  return map[normalized] ?? camelToTitleCase(raw);
}
```

Then:

```ts
getRoomLabel(type, detail, tAddHotel) {
  if (detail.actualDescriptions?.[0]) return detail.actualDescriptions[0]; // hotel-supplied label
  return formatRoomType(type, tAddHotel);
}
```

**Backend should replicate this exactly:**

1. If the room object has an `actualDescriptions` array with a first entry, use that string verbatim. It's the hotel's own room name and should NOT be translated.
2. Otherwise, normalise the room-type key (lowercase, strip underscores/spaces) and look it up in the i18n map.
3. If the normalised key isn't in the map, fall back to a CamelCase→Title-Case split of the raw key.

The i18n bundle for room types lives under `addHotel.*` on the FE. The keys you need from the BE side are:

| Key | EN | DE |
|---|---|---|
| `roomSingle` | Single Room | Einzelzimmer |
| `roomDouble` | Double Room | Doppelzimmer |
| `roomTriple` | Triple Room | Dreibettzimmer |
| `roomQuadruple` | Quadruple Room | Vierbettzimmer |
| `roomSuite` | Suite | Suite |
| `roomSuites` | Suites | Suiten |
| `standardDoubleBed` | Standard Double Bed | Standard-Doppelbett |
| `twinBed` | Twin Bed | Einzelbett |

If your BE translation infrastructure already has these, great. If not, hard-code them into a per-language constants file inside the PDF service.

---

## 10. i18n keys — full list

Every visible string in the PDF must be drawn from these keys (`offer.contract.*` slice in the FE bundle). For each key, the EN and DE values are below.

| Key | EN | DE (DeepL fallback OK; the FE doc has the agreed translations) |
|---|---|---|
| `offer` | OFFER | ANGEBOT |
| `documentNo` | Document No. | Dokument Nr. |
| `supplier` | Supplier | Lieferant |
| `customer` | Customer | Kunde |
| `sectionTitle` | S-E-T-T WORLDWIDE RESERVATION FZE | _do not translate_ |
| `assignedPerson` | Assigned Person | Zuständige Person |
| `emailAddress` | Email Address | E-Mail-Adresse |
| `phoneNumber` | Phone Number | Telefonnummer |
| `address` | Address | Adresse |
| `taxId` | Ontario Corporation Number | Ontario Corporation Number |
| `tripDetails` | Trip Details | Reisedetails |
| `destination` | Destination | Reiseziel |
| `checkInOut` | Check In/Out | Check-in/Check-out |
| `guests` | Guests | Gäste |
| `hotelDetails` | Hotel Details | Hoteldetails |
| `reservationRef` | Reservation Ref. | Reservierungs-Ref. |
| `roomType` | Room Type | Zimmertyp |
| `sell` | Sell | Preis |
| `qty` | Qty | Anz. |
| `nights` | Nights | Nächte |
| `total` | Total | Gesamt |
| `subtotal` | Subtotal | Zwischensumme |
| `serviceDetails` | Service Details | Servicedetails |
| `service` | Service | Service |
| `date` | Date | Datum |
| `grandTotal` | Grand Total | Gesamtsumme |
| `paymentDetails` | Payment Details | Zahlungsdetails |
| `payPrompt` | Please pay | Bitte zahlen Sie |
| `payBy` | by | bis |
| `bankName` | Bank Name | Bankname |
| `accountHolder` | Account Holder | Kontoinhaber |
| `iban` | IBAN | IBAN |
| `swiftBic` | SWIFT / BIC | SWIFT / BIC |
| `payByCard` | Pay by Card | Mit Karte zahlen |
| `cancellationConditions` | Cancellation Conditions | Stornierungsbedingungen |
| `termsConditions` | Terms & Conditions | Allgemeine Geschäftsbedingungen |
| `footerLegal` | © 2026 S-E-T-T Worldwide Reservation FZE. All rights reserved. This document is generated electronically and is valid without signature. | © 2026 S-E-T-T Worldwide Reservation FZE. Alle Rechte vorbehalten. Dieses Dokument wird elektronisch erstellt und ist auch ohne Unterschrift gültig. |
| `issuedBy` | Issued By | Ausgestellt von |

If you already have the strings translated via DeepL for the existing PDF, just keep using those — what matters is that the layout, fonts, colours, and spacing match this spec. The translations are the BE's existing responsibility.

---

## 11. Number & date formatting

| Type | Locale | Example |
|---|---|---|
| Date | EU dotted | `02.06.2026` |
| Currency | EU style | `€2.484,00` (period thousands, comma decimal) |
| Percentage | EU style | `18,17 %` |

EU price format reference (Python):

```python
def eu_price(n):
    s = f"{n:,.2f}"        # 2,484.00
    return s.replace(",", "X").replace(".", ",").replace("X", ".")
```

FE source for reference: `lib/numberFormatter.ts` (functions `formatPriceEU`, `formatCurrencyEU`, `formatPercentageEU`).

---

## 12. Assets the BE needs

| Asset | Path/source | Notes |
|---|---|---|
| Montserrat font | Google Fonts | Embed the 400/500/600/700/800 weights as `@font-face`. Or ship the `.ttf` files in the BE container. |
| SETT logo (white SVG) | FE repo `public/icons/sett_logo.svg` is the **green** version. The PDF needs a **white** version. | I'll export a white SVG and drop it next to this doc as `sett_logo_white.svg` if you can't recolour the green one. Tell me. |
| Credit-card icon | Currently a Lucide React `<CreditCard />`. | For PDF: use a simple monochrome credit-card SVG, navy colour, 16×16 px. Or use the unicode emoji `💳` — your call based on render fidelity. |

---

## 13. Verifying the result

Once you've built the new template, please:

1. Generate a PDF for a real proposal that has **at least 2 hotels with rooms** and **at least 1 service**, in both EN and DE.
2. Send me both PDFs.
3. I'll diff them against the FE preview screenshot section-by-section and flag anything that drifts more than a couple of pixels.

The simplest acceptance check: open the FE preview and the rendered PDF side-by-side, both in DE. If a non-technical person can't tell which is which, we're done.

---

## 14. Questions you might have

**Q: The FE renders this as React — can you just give me the HTML output?**
You can `View source` in the browser and grab the rendered HTML, but it'll have Tailwind classes and inline React artifacts. Better to use the reference template in §7 and treat that as the source.

**Q: Some of the spacing values feel arbitrary. Can I tweak them?**
Spacing in this spec follows the brand guidelines (multiples of 4 px). If you must adjust to fit your renderer, please keep the rhythm: padding values of 4, 8, 12, 16, 20, 24, 32, 40. Don't introduce 13 or 27.

**Q: What about the email body that delivers the PDF?**
Out of scope for this doc — covered in `bilingual-pdf-send-flow-fe.md`.

**Q: What if `request.cancellationConditions` contains nested HTML the sanitiser strips?**
Fall back to plain-text rendering of the stripped content. We'll triage on a case-by-case basis if a real customer hits this; for now, just don't crash.

**Q: Can I skip the white-SVG logo and tint the green one with CSS filter?**
On screen yes (`filter: brightness(0) invert(1)`). For print PDFs the filter support is hit-or-miss — some renderers ignore filters on `<img>`. Please ship the white SVG to be safe.

**Q: There's no signature block — is that intentional?**
Yes. The footer's "Issued by" line replaces the old signature block. The legal blurb explicitly says "valid without signature".

---

## 15. Out of scope for this redesign

These are intentionally **not** changing right now:

- The email body template (separate doc).
- The PDF filename convention.
- The DeepL translation pipeline (the strings come from the i18n bundle as before).
- Any non-offer documents (invoices, contracts, etc.) — only the customer-facing offer PDF.

---

## 16. Contacts

If anything in this doc is wrong, ambiguous, or contradicts the FE preview, **the FE preview is the source of truth**, not this doc.

Ping me (Shamandeep) and I'll either update the doc or correct the FE. We will not let them drift.
