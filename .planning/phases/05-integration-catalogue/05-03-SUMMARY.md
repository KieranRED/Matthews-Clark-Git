---
phase: 05-integration-catalogue
plan: "03"
subsystem: wrap-studio
tags: [catalogue, ui, swatch-imagery, pricing-cleanup, cta]
dependency_graph:
  requires: ["05-01", "05-02"]
  provides: ["CAT-02", "CAT-03", "CAT-04", "CAT-05", "INT-01"]
  affects: ["public/wrap-studio/catalogue-panel.jsx", "public/wrap-studio/app.jsx", "public/wrap-studio/studio.css", "app/mc-site/wrapping/page.jsx"]
tech_stack:
  added: []
  patterns: ["swatchUrl blob img with hex fallback", "hexConfidence low indicator", "tier-free quote flow"]
key_files:
  created: []
  modified:
    - public/wrap-studio/catalogue-panel.jsx
    - public/wrap-studio/studio.css
    - public/wrap-studio/app.jsx
    - app/mc-site/wrapping/page.jsx
decisions:
  - "Img rendered as first child of .sw-chip with position:absolute to sit behind chipInner overlays"
  - "sw-approx positioned at bottom-left to avoid clash with sw-tier at top-left"
  - "CTA uses existing link-arrow class to match site aesthetic without new styles"
  - "topTier/tierInfo/rank locals removed entirely from CataloguePanel"
metrics:
  duration: "12 minutes"
  completed: "2026-06-04"
  tasks: 3
  files: 4
---

# Phase 5 Plan 03: Swatch Imagery, Tier Removal, and Studio CTA Summary

**One-liner:** Blob swatch images with hex fallback, ~ low-confidence indicator, tier/pricing UI stripped from quote footer and modal, and Wrap Studio CTA added to wrapping page.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Swatch image rendering + low-confidence ~ indicator | adc7cc4 | catalogue-panel.jsx, studio.css |
| 2 | Remove all tier/pricing UI | b1ddce9 | catalogue-panel.jsx, app.jsx |
| 3 | Add Wrap Studio CTA to wrapping page | 4e082d8 | app/mc-site/wrapping/page.jsx |

## What Was Built

### Task 1 — Swatch imagery + ~ indicator
- In the `Swatch` component, added an `<img>` as the first child of `.sw-chip` when `sw.swatchUrl` is truthy. The img is `position:absolute` covering the full chip, with `objectFit:cover`. The `.sw-chip` background (`chipBg(sw)`) remains as hex fallback when `swatchUrl` is null.
- Added `sw-approx` span inside `.sw-chip` when `sw.hexConfidence === 'low'`, with a descriptive tooltip.
- Added `.sw-approx` CSS to `studio.css`: `position:absolute`, bottom-left of chip, monospace 8px, dark semi-transparent background matching `.sw-tier` style.

### Task 2 — Tier/pricing removal
- Deleted the `quote-tier` div block ("Price tier" + `tierInfo.name`) from the catalogue panel quote footer.
- Deleted the `quote-note` paragraph (`tierInfo.note` text).
- Removed unused `topTier`, `tierInfo`, `rank`, and `pool` locals from `CataloguePanel`.
- Removed the `qs-tier` badge span from the quote modal `q-sum-head`.
- Replaced `q-note` with: "We'll confirm availability and come back with a fixed price — usually same day."

### Task 3 — Wrapping page CTA
- Inserted `<a className="link-arrow" href="/mc-site/wrap-studio">Try the Wrap Studio →</a>` after the intro paragraph in the `svc-intro` section.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- Commits adc7cc4, b1ddce9, 4e082d8 all present
- All four target files modified with correct patterns
- Automated verify checks all pass
