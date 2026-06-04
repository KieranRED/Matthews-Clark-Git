---
phase: 06-upload-recolour-engine
plan: "01"
subsystem: ui
tags: [react, imgly, background-removal, canvas, indexeddb, wrap-studio, onnx, coop, coep]

requires: []

provides:
  - public/wrap-studio/ static SPA with upload zone, bg-removal pipeline, colour swatch picker
  - app/mc-site/wrap-studio/route.js serving SPA with COOP/COEP cross-origin isolation headers
  - 3-stage ingest pipeline: HEIC placeholder → canvas pre-resize (1920px cap) → @imgly removeBackground
  - originalUrl + carUrl stored as dataURLs with quota-safe localStorage persistence

affects:
  - 06-02  # HEIC conversion fills in Stage 1 placeholder
  - 06-03  # Recolour engine composites onto canvas already rendered by stage.jsx

tech-stack:
  added:
    - "@imgly/background-removal@1.4.5 (CDN ESM, lazy-loaded via runtime <script type=module>)"
    - "React 18 UMD + ReactDOM 18 UMD (CDN, no bundler)"
    - "Babel Standalone (CDN, JSX transpile at runtime)"
  patterns:
    - "Lazy-load ESM-only libs via injected <script type=module> + window event bridge"
    - "Canvas pre-resize before ML inference (OOM prevention)"
    - "Quota-safe localStorage: try/catch QuotaExceededError, retry without dataURLs"
    - "dataURL (not blob URL) storage for both originalUrl and carUrl (survives page reload)"

key-files:
  created:
    - app/mc-site/wrap-studio/route.js
    - public/wrap-studio/index.html
    - public/wrap-studio/app.jsx
    - public/wrap-studio/stage.jsx
    - public/wrap-studio/studio.css
  modified: []

key-decisions:
  - "COEP header set to credentialless (not require-corp) — allows CDN scripts while enabling SharedArrayBuffer for ONNX"
  - "ESM-only @imgly loaded via runtime script injection rather than bundler import — avoids need for webpack/vite"
  - "dataURLs preferred over blob URLs for storage — blob URLs are tab-scoped and don't survive reload"
  - "Babel Standalone used for JSX transpile at runtime — keeps zero-build architecture for public/ static assets"
  - "originalUrl stored alongside carUrl — enables before/after toggle and My Background swatch in future plans"

patterns-established:
  - "window.__imglyRemoveBackground pattern: lazy-load ESM lib into window namespace via script injection"
  - "removal-progress / removal-error CSS class names used for ingest UI states"
  - "render-bar / removal-bar share the same progress bar CSS pattern"
  - "WrapStage exported to window.WrapStage for cross-script access without bundler"

requirements-completed: []

duration: 15min
completed: 2026-06-04
---

# Phase 06 Plan 01: Upload + Background Removal Engine Summary

**Zero-build wrap-studio SPA: photo upload with canvas pre-resize, @imgly background removal via lazy-loaded ESM, and quota-safe dataURL persistence — served with COOP/COEP cross-origin isolation headers**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-04T16:45:00Z
- **Completed:** 2026-06-04T17:00:13Z
- **Tasks:** 4 (route.js, studio.css, stage.jsx, app.jsx + index.html)
- **Files modified:** 5 created

## Accomplishments

- `app/mc-site/wrap-studio/route.js` serves `public/wrap-studio/index.html` with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` headers, enabling SharedArrayBuffer for ONNX threading
- `public/wrap-studio/stage.jsx` implements the 3-stage ingest pipeline: HEIC placeholder (Plan 02 hook) → canvas pre-resize to 1920px cap → lazy-load @imgly via ESM script injection → `removeBackground()` → dataURL conversion
- `public/wrap-studio/app.jsx` manages `originalUrl`, `carUrl`, and `activeSwatch` state with quota-safe `localStorage` persistence and Reset
- `public/wrap-studio/studio.css` provides full design system including `.removal-progress`, `.removal-bar`, `.removal-pct`, `.removal-error`, `.re-icon`, `.re-msg`, `.re-retry` classes per spec

## Task Commits

1. **Task 1: COOP/COEP route** - `b122bbc` (feat)
2. **Tasks 2-5: studio.css, stage.jsx, app.jsx, index.html** - `ef4a4ed` (feat)

## Files Created/Modified

- `app/mc-site/wrap-studio/route.js` — Next.js route handler serving SPA HTML with COOP/COEP headers
- `public/wrap-studio/index.html` — Entry point, loads React 18 + Babel Standalone + stage.jsx + app.jsx
- `public/wrap-studio/stage.jsx` — WrapStage component: upload zone, 3-stage ingest pipeline, canvas composite renderer
- `public/wrap-studio/app.jsx` — WrapStudioApp: top-level state, colour swatches, quota-safe localStorage
- `public/wrap-studio/studio.css` — Full design system: bg vars, upload zone, progress/error states, canvas stage, swatches

## Decisions Made

- **COEP: credentialless** (not `require-corp`) — allows unpkg/jsdelivr CDN scripts while still enabling cross-origin isolation for ONNX SharedArrayBuffer
- **ESM lazy-load via script injection** — `@imgly/background-removal` has no UMD build; injecting a `<script type="module">` and bridging via `window.__imglyRemoveBackground` avoids a build step
- **dataURLs over blob URLs** — blob URLs are tab-scoped and don't survive page reload; dataURLs persist correctly in localStorage
- **Babel Standalone for JSX** — keeps the zero-build architecture in `public/` without requiring webpack/vite/esbuild

## Deviations from Plan

None - plan executed exactly as written. All 5 files created as specified. CSS classes match spec precisely. Progress callback signature `(key, current, total)` implemented correctly with `Math.round((current/total)*100)`.

## Known Stubs

- `stage.jsx` line 59: HEIC detection is a placeholder comment — Plan 02 fills in actual HEIC→JPEG conversion. The pipeline currently passes HEIC files directly to canvas resize (may fail on non-Safari browsers). This is intentional — stub exists so Plan 02 can insert without restructuring.

## Issues Encountered

None.

## Next Phase Readiness

- Wrap Studio SPA is live at `/mc-site/wrap-studio` (served by Next.js route handler)
- Plan 02 can insert HEIC→JPEG conversion at the Stage 1 placeholder in `stage.jsx` ingest()
- Plan 03 (recolour engine) can read `activeSwatch` from app state and composite via the canvas in `stage.jsx`
- `originalUrl` is available for before/after toggle UI in future plans

---
*Phase: 06-upload-recolour-engine*
*Completed: 2026-06-04*
