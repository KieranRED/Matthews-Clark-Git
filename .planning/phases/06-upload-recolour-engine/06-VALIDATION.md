---
phase: 6
slug: upload-recolour-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing (no unit test framework — standalone UMD) |
| **Config file** | none |
| **Quick run command** | Hard refresh http://site.localhost:3000/wrap-studio and upload a test photo |
| **Full suite command** | Manual: upload JPG, PNG, HEIC, verify all finish previews, test before/after slider |
| **Estimated runtime** | ~60 seconds manual walkthrough |

---

## Sampling Rate

- **After each task:** Verify in browser at http://site.localhost:3000/wrap-studio
- **After each wave:** Full upload + recolour walkthrough
- **Before `/gsd:verify-work`:** Full suite including HEIC, before/after, all 9 finish types
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 6-01-01 | 01 | 1 | UPLOAD-01/02/04 | manual | Upload JPG → progress bar appears → car appears masked | ❌ W0 | ⬜ |
| 6-01-02 | 01 | 1 | UPLOAD-03 | manual | CSS mask clips blend layers to car silhouette only | ❌ W0 | ⬜ |
| 6-02-01 | 02 | 2 | UPLOAD-01 | manual | Upload .heic → converts, removes bg, shows car | ❌ W0 | ⬜ |
| 6-02-02 | 02 | 2 | RCOL-01..08 | manual | Select each finish type — preview updates instantly on masked car | ❌ W0 | ⬜ |
| 6-02-03 | 02 | 2 | RCOL-06 | manual | Metallic finish shows subtle grain noise vs gloss same colour | ❌ W0 | ⬜ |
| 6-03-01 | 03 | 3 | RCOL-10 | manual | Before/after slider shows original (with background) vs wrapped cutout | ❌ W0 | ⬜ |
| 6-03-02 | 03 | 3 | UPLOAD-02 | manual | No network requests to external server during bg removal | ❌ W0 | ⬜ |
| 6-04-01 | 04 | 4 | all | manual | Full UAT — 4 success criteria confirmed in browser | ❌ W0 | ⬜ |

---

## Wave 0 Requirements

- [ ] Test photos available locally:
  - `test-car.jpg` — a car photo for upload testing (use any car photo)
  - `test-car.heic` — HEIC format (capture from iPhone or convert)
- [ ] Dev server running: `npm run dev`

*No test framework install needed — manual browser verification only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| BG removal runs in-browser | UPLOAD-02 | Requires DevTools Network panel | Open Network tab, upload photo — no requests to external removal API |
| Progress bar percentage | UPLOAD-04 | Visual check | Upload photo, watch progress bar increment to 100% |
| All 9 finish types preview | RCOL-01..08 | Visual check | Select gloss/satin/matte/metallic/chrome/shift/carbon/ppf-clear/ppf-matte — each renders correctly |
| Metallic grain visible | RCOL-06 | Visual comparison | Select metallic vs gloss same hue — metallic has subtle grain texture |
| Before/after original side | RCOL-10 | Visual check | Drag slider left — shows original photo with real background |
| Session restore | UPLOAD-03 | Hard refresh | Upload car, select colour, hard refresh — car and selection persist |
| HEIC conversion | UPLOAD-01 | Device test | Upload .heic file — converts without error |

---

## Validation Sign-Off

- [ ] All tasks have verify or Wave 0 dependencies
- [ ] Wave 0 test photos available
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
