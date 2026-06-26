# PDF Preview logos — drop assets here

The PDF preview ([components/ui/ContractPreviewModal.tsx](../../components/ui/ContractPreviewModal.tsx)) expects two dedicated logos to match the BE-rendered PDF. Both currently fall back to `sett_logo.svg` until the dedicated SVGs are dropped at the paths below.

## 1. Header — `24h-group-offer.svg`

**Path:** `public/icons/24h-group-offer.svg`
**Render size:** ~56 px tall on the navy header band, top-left
**Brand spec:** navy outer frame, green inner pill, white serif "24 H GROUP OFFER" text, small "WORLDWIDE GROUP OFFERS" sub-label
**Reference:** see the top-left of any BE-generated offer PDF

Until this file exists, the header shows the standard green SETT wordmark at 36 px (sized down via `onError` fallback).

## 2. Footer — `sett-footer-logo.svg`

**Path:** `public/icons/sett-footer-logo.svg`
**Render size:** ~28 px tall on the navy footer band, top-left
**Brand spec:** green "SETT" wordmark on transparent background with optional small "SPORT & EVENTS TOURS & TRAVEL" sub-line
**Reference:** see the bottom-left of any BE-generated offer PDF

Until this file exists, the footer shows the standard green SETT wordmark at 28 px (no resize, same asset).

## How the fallback works

Each `<img>` has an `onError` handler that swaps the `src` to `/icons/sett_logo.svg` on first failure (with a `data-fallback="true"` flag so it doesn't loop). This means:

- **Before assets dropped:** existing SETT wordmark renders, no broken-image icon
- **After assets dropped:** dedicated logos render automatically, no code change

If you ever need to test the fallback, rename one of the SVGs and reload the modal.
