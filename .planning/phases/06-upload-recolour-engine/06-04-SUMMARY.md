---
phase: 06-upload-recolour-engine
plan: 04
subsystem: wrap-studio
tags: [uat, sign-off, upload, recolour, before-after-slider]
requires: [06-01, 06-02, 06-03]
provides: [phase-6-sign-off]
affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified: []
decisions:
  - "@imgly CDN replaced with server-side /api/wrap-remove-bg route using @imgly/background-removal-node — ONNX binaries cannot be webpack-bundled"
  - "RCOL-09 per-panel simultaneous visual rendering deferred — panel assignments tracked in state for quote flow, canvas segmentation required for simultaneous visual is future-phase work"
  - "Before/after slider clipping moved to car-wrap level to fix lag and background bleed"
  - "user-select:none + draggable:false on slider elements prevents text/image selection during drag"
metrics:
  duration: checkpoint
  completed: 2026-06-04
  tasks: 1
  files: 0
---

# Phase 06 Plan 04: UAT Sign-Off Summary

Phase 6 UAT completed and approved by the user on 2026-06-04. All 4 success criteria confirmed in browser.

## What Was Verified

**Success Criterion 1 — Upload pipeline (UPLOAD-01/02/03/04):** JPG/PNG/HEIC upload works via button and drag-and-drop. Server-side background removal via `/api/wrap-remove-bg` runs with animated sweep progress bar. Masked car displays correctly after removal.

**Success Criterion 2 — All 9 finishes (RCOL-01..08):** Gloss, satin, matte, metallic, chrome, colour-shift, carbon, ppf-clear, ppf-matte all render correctly on the masked car silhouette. Each updates instantly on colour selection.

**Success Criterion 3 — Panel chip assignment (RCOL-09 partial):** Per-panel colour assignments (bonnet vs full body) are tracked independently and persist for the quote flow. Simultaneous visual rendering of multiple colours is deferred.

**Success Criterion 4 — Before/after slider (RCOL-10):** Dragging the slider shows wrapped car on the left and original uncoloured car on the right. Compare button is correctly disabled before any upload. No text/image selection occurs during drag.

## Notable Fixes Applied During UAT

**1. [Rule 3 - Blocking] @imgly CDN replaced with server-side route**
- Found during: Task 1 (UAT)
- Issue: @imgly CDN ESM loading failed due to ONNX binary bundling with webpack
- Fix: Created `/api/wrap-remove-bg` route using `@imgly/background-removal-node`; added `serverExternalPackages` for `@imgly` in Next.js config
- Files modified: `app/api/wrap-remove-bg/route.js`, `next.config.js`

**2. [Rule 1 - Bug] Phase 5 UI restored**
- Found during: Task 1 (UAT)
- Issue: Phase 6 executors had rewritten app.jsx from scratch, losing Phase 5 catalogue and UI shell
- Fix: Restored full Phase 5 UI and integrated Phase 6 features into it

**3. [Rule 1 - Bug] Before/after slider clipping fixed**
- Found during: Task 1 (UAT)
- Issue: Slider clipping applied at wrong level causing lag and background bleed
- Fix: Moved clipping to car-wrap layer

**4. [Rule 2 - UX] Drag selection prevention**
- Found during: Task 1 (UAT)
- Issue: Dragging slider caused browser text/image selection
- Fix: Applied `user-select:none` and `draggable:false` to slider elements

## Deferred Items

**RCOL-09 — Per-panel simultaneous visual rendering:** Panel colour assignments are tracked per-panel in state and will flow through to the quote form. Rendering each panel in a different colour simultaneously requires canvas segmentation (masking per panel region). This is deferred to a future phase. The quote flow is unaffected — panel assignments are captured correctly.

## Requirements Status

The following requirements were confirmed met in this UAT:
- UPLOAD-01: Upload via button and drag-and-drop (JPG, PNG, HEIC)
- UPLOAD-02: Background removal via server-side route (replaces in-browser WASM per approved deviation)
- UPLOAD-03: Background-removed result used as pixel mask
- UPLOAD-04: Progress indicator shown during removal
- RCOL-01 through RCOL-08: All 8 recolour engine finishes verified
- RCOL-10: Before/after slider functional

RCOL-09 (per-panel simultaneous visual rendering) remains deferred — panel assignment for quote flow is implemented, visual segmentation is not.

## Self-Check: PASSED

UAT is a human-verify checkpoint with no code commits. All 4 success criteria confirmed by user sign-off on 2026-06-04.
