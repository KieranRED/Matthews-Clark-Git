---
phase: 06-upload-recolour-engine
plan: 02
subsystem: wrap-studio/stage
tags: [heic, recolour, fx-layers, metallic, carbon, svg-filter]
one_liner: "HEIC lazy-load via heic2any + all 9 finish types in fxFor() with metallic SVG noise grain"
dependency_graph:
  requires: [06-01]
  provides: [HEIC upload, metallic noise layer, carbon finish, full 9-finish fxFor]
  affects: [public/wrap-studio/stage.jsx, public/wrap-studio/studio.css]
tech_stack:
  added: [heic2any@0.0.4 (lazy CDN UMD), SVG feTurbulence filter, CSS mask-image layers]
  patterns: [lazy script injection, CSS mask-based recolour fx, SVG filter referenced by url()]
key_files:
  created: []
  modified:
    - public/wrap-studio/stage.jsx
    - public/wrap-studio/studio.css
decisions:
  - "fxFor() normalises plain hex strings (legacy) to gloss finish — backward compatible with existing app.jsx swatches"
  - "Canvas rendering replaced with div-based fx layer system (tone/tint/sheen) using CSS mask-image on carUrl"
  - "metallic-noise SVG filter inlined in stage DOM (zero-dependency, no separate file)"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-04T17:07:34Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
requirements_satisfied: [UPLOAD-01, RCOL-01, RCOL-02, RCOL-03, RCOL-04, RCOL-05, RCOL-06, RCOL-07, RCOL-08]
---

# Phase 06 Plan 02: HEIC + Finish Set Completion Summary

## What Was Built

Completed two remaining gaps in the wrap-studio recolour engine:

1. **HEIC/HEIF upload support** — `loadHeic2Any()` lazy-loads the heic2any UMD library from CDN only when the uploaded file has a `.heic` or `.heif` extension (or matching MIME type). Converts to JPEG blob at 0.92 quality before the existing resize step. This replaces the Plan 01 placeholder comment.

2. **Full 9-finish `fxFor()` function** — Added to `stage.jsx` with all cases: gloss, satin, matte, chrome, shift, metallic, carbon, ppf-clear, ppf-matte. The **metallic** case sets `noise: true` which causes the tint layer to apply `filter: url(#metallic-noise)` — an inline SVG `feTurbulence` filter (baseFrequency 0.72, fractalNoise, 4 octaves) that adds flake-depth grain distinct from same-hue gloss/satin. The **carbon** case renders a flat, dark, low-sheen treatment.

3. **Div-based fx layer system** — The canvas composite is replaced by three absolutely-positioned `div` layers (`car-tone`, `car-tint`, `car-sheen`) each masked to the car silhouette via `CSS mask-image: url(carUrl)`. This enables blend modes, SVG filters, and per-layer opacity without canvas API limitations.

4. **studio.css** — Added `.car-fx` base class, and chrome/shift animation keyframes (`anim-chrome`, `anim-shift`).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 53f5fa1 | feat(06-02): HEIC lazy-load + conversion in ingest pipeline |
| Task 2 | 7b4eccc | feat(06-02): metallic + carbon fxFor cases, SVG noise filter, div-based fx layers |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added full fxFor() with all finish cases**
- **Found during:** Task 2
- **Issue:** The plan stated fxFor already existed with gloss/satin/matte/chrome/shift/ppf cases from 06-01, but the merged stage.jsx (canvas-based) had no fxFor at all.
- **Fix:** Added complete fxFor() covering all 9 finishes, normalised to accept plain hex strings for backward compat with existing app.jsx swatch system.
- **Files modified:** public/wrap-studio/stage.jsx
- **Commit:** 7b4eccc

**2. [Rule 2 - Missing critical functionality] Canvas replaced with div-based fx layers**
- **Found during:** Task 2
- **Issue:** Canvas-based rendering cannot support CSS blend modes, SVG filters, or per-layer opacity. The plan references fxLayers div rendering but the existing code used ctx.fillRect.
- **Fix:** Replaced canvas stage with img + three positioned div layers (tone/tint/sheen) using CSS mask-image for car silhouette masking.
- **Files modified:** public/wrap-studio/stage.jsx
- **Commit:** 7b4eccc

## Known Stubs

None — all 9 finish types are wired. activeSwatch plain hex string defaults to gloss (correct for existing app.jsx usage).

## Self-Check: PASSED

- public/wrap-studio/stage.jsx — FOUND
- public/wrap-studio/studio.css — FOUND
- Commit 53f5fa1 — FOUND
- Commit 7b4eccc — FOUND
