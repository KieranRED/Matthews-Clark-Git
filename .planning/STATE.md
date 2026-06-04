# Project State

## Current Position

- **Phase:** 06-upload-recolour-engine
- **Current Plan:** 04
- **Status:** In Progress

## Progress

[████████████████████░░░░░░░░░░] 3/4 plans complete

## Decisions

- baActive/setBaActive hoisted to app.jsx, passed to WrapStage — BA toggle logic in the app shell
- car-base--original at z-index 0 unclipped so it reveals naturally as left side of before/after slider
- Per-panel (panelColors/activePanel) not yet wired in app.jsx/stage.jsx — exists in catalogue-panel.jsx only; RCOL-09 deferred to 06-04
- fxFor() accepts plain hex string (defaults to gloss) for backward compat with app.jsx swatch system
- metallic-noise SVG filter inlined in stage DOM — zero dependency, referenced via url(#metallic-noise)
- Canvas composite replaced with CSS mask-image div layers to enable blend modes + SVG filters
- COEP: credentialless (not require-corp) — allows CDN scripts while enabling ONNX SharedArrayBuffer threading
- ESM lazy-load via runtime script injection for @imgly/background-removal (no UMD build available)
- dataURLs over blob URLs — persist across page reload in localStorage
- Babel Standalone for zero-build JSX transpile in public/ static assets

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 06-upload-recolour-engine | 01 | 15min | 4 | 5 |
| 06-upload-recolour-engine | 02 | 8min | 2 | 2 |
| 06-upload-recolour-engine | 03 | 5min | 2 | 3 |

## Session

- **Last session:** 2026-06-04T17:16:34Z
- **Stopped at:** Completed 06-upload-recolour-engine/06-03-PLAN.md
