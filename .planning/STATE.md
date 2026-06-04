# Project State

## Current Position

- **Phase:** 06-upload-recolour-engine
- **Current Plan:** 04 of 4
- **Status:** Complete

## Progress

[██████████████████████████████] 4/4 plans complete

## Decisions

- baActive/setBaActive hoisted to app.jsx, passed to WrapStage — BA toggle logic in the app shell
- car-base--original at z-index 0 unclipped so it reveals naturally as left side of before/after slider
- RCOL-09 deferred — panel assignments tracked for quote flow, simultaneous visual rendering requires canvas segmentation (future phase)
- fxFor() accepts plain hex string (defaults to gloss) for backward compat with app.jsx swatch system
- metallic-noise SVG filter inlined in stage DOM — zero dependency, referenced via url(#metallic-noise)
- Canvas composite replaced with CSS mask-image div layers to enable blend modes + SVG filters
- @imgly CDN replaced with server-side /api/wrap-remove-bg using @imgly/background-removal-node — ONNX binaries cannot be webpack-bundled
- dataURLs over blob URLs — persist across page reload in localStorage
- Babel Standalone for zero-build JSX transpile in public/ static assets
- Before/after slider clipping moved to car-wrap level — fixes lag and background bleed
- user-select:none + draggable:false on slider elements prevents text/image selection during drag

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 06-upload-recolour-engine | 01 | 15min | 4 | 5 |
| 06-upload-recolour-engine | 02 | 8min | 2 | 2 |
| 06-upload-recolour-engine | 03 | 5min | 2 | 3 |
| 06-upload-recolour-engine | 04 | UAT | 1 | 0 |

## Session

- **Last session:** 2026-06-04T00:00:00Z
- **Stopped at:** Completed 06-upload-recolour-engine/06-04-PLAN.md (Phase 6 UAT approved)
