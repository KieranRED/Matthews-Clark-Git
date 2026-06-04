---
phase: 06-upload-recolour-engine
plan: 03
subsystem: wrap-studio
tags: [before-after-slider, originalUrl, compare-button, per-panel-verification]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [before-after-slider-wired, compare-button-gated]
  affects: [public/wrap-studio/stage.jsx, public/wrap-studio/studio.css, public/wrap-studio/app.jsx]
tech_stack:
  added: []
  patterns: [clip-path-inset, z-index-layering, drag-to-scrub]
key_files:
  created: []
  modified:
    - public/wrap-studio/stage.jsx
    - public/wrap-studio/studio.css
    - public/wrap-studio/app.jsx
decisions:
  - "baActive/setBaActive hoisted to app.jsx as state, passed into WrapStage as props — keeps BA toggle logic in the app shell"
  - "car-base--original rendered only when originalUrl is set; unclipped at z-index 0 so it naturally shows on the left side of the slider without any additional clipping"
  - "Compare button uses inline style disable rather than HTML disabled attribute — allows aria-label to remain readable to assistive tech"
  - "Per-panel defect documented only, not silently fixed — scope is established prototype behaviour per plan instructions"
metrics:
  duration_seconds: 323
  completed_date: "2026-06-04"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 6 Plan 03: Before/After Slider Wiring + Per-Panel Verification Summary

Before/after slider wired with `originalUrl` as the unclipped "before" layer (z-index 0) behind the clipped cutout + fxLayers; Compare button gated on `originalUrl`; per-panel assignment defect documented.

---

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Wire car-base--original into before/after + gate Compare button | 2943acc | Complete |
| 2 | Verify per-panel colour assignment on the masked cutout | — | Defect documented |

---

## What Was Built

### Task 1 — Before/After Slider Wiring

**stage.jsx changes:**
- Added `baActive` and `setBaActive` props to `WrapStage`
- Added `baPos` state (0–100, default 50) + `stageRef` + `draggingRef`
- Added drag handlers: `handleDividerMouseDown`, `handleStageDrag`, `handleStageDragEnd`
- `clip` now computed: `baActive ? { clipPath: inset(0 ${100-baPos}% 0 0) } : {}`
- `car-base--original` img rendered first (z-index 0, unclipped) when `originalUrl` is set
- `.car-base` cutout receives `...clip` in its inline style (z-index 1)
- All three fxLayers already spread `...clip` (z-index 2–4)
- BA divider + knob rendered when `baActive && colored`
- `ba-tag--before` ("Original") and `ba-tag--after` ("Wrapped") positioned relative to `baPos`
- `stage-hud` HUD with Replace (label) and Compare (button) pill controls
- Compare button gated: `opacity: 0.4; cursor: default; pointerEvents: none` when `originalUrl === null`
- Compare button carries `aria-label="Toggle before/after comparison"`

**studio.css additions:**
- `.car-base--original` — `position:absolute; inset:0; width:100%; height:100%; object-fit:contain; z-index:0`
- `.car-base` — `z-index:1`
- `.ba-divider`, `.ba-knob` — vertical drag handle with circular knob
- `.ba-tag`, `.ba-tag--before`, `.ba-tag--after` — label overlays
- `.stage-hud`, `.pill-btn`, `.pill-btn.on` — bottom-right HUD controls

**app.jsx changes:**
- Added `baActive` / `setBaActive` state (default `false`)
- Passes `baActive` and `setBaActive` as props to `<WrapStage>`

---

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Deviation 1: BA slider machinery implemented (not pre-existing)

The plan stated the before/after slider machinery was "already built" (referencing the prior prototype). In the actual post-Plan-02 `stage.jsx`, `baActive`/`baPos` were NOT present — `clip` was an empty object `{}` and the component signature did not include `baActive`. The full drag-to-scrub implementation was added as part of Task 1 (not a deviation from the plan's required outcome, just from the assumed starting state).

---

## Task 2 — Per-Panel Assignment: Defect Found

**Finding: `panelColors` and `activePanel` are NOT present in `app.jsx` or `stage.jsx`.**

The automated verification check `grep -q "panelColors" public/wrap-studio/app.jsx` FAILS.

**Where the logic exists:** `public/wrap-studio/catalogue-panel.jsx` contains `panelColors`, `activePanel`, and `panels` props — the per-panel chip UI is wired into the catalogue panel component. However, this component is not connected to `app.jsx` or `stage.jsx` in the current codebase.

**Consequence:** Per-panel colouring (RCOL-09) is not yet functional end-to-end. The `activeSwatch` in `app.jsx` is a single global swatch applied uniformly to the entire car, not per panel.

**Action taken:** Documented here. No silent fix applied per plan instructions. RCOL-09 wiring (connecting `catalogue-panel.jsx`'s `panelColors`/`activePanel` to `stage.jsx`) is deferred to a subsequent plan.

---

## Known Stubs

None introduced by this plan. The per-panel defect above is a pre-existing gap, not a stub introduced here.

---

## Self-Check

Checking created/modified files and commits exist:

- `/public/wrap-studio/stage.jsx` — modified
- `/public/wrap-studio/studio.css` — modified
- `/public/wrap-studio/app.jsx` — modified
- Commit `2943acc` — Task 1

## Self-Check: PASSED
