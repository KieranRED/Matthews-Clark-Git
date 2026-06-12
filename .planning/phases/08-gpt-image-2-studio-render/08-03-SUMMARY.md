---
phase: 08-gpt-image-2-studio-render
plan: "03"
subsystem: wrap-studio-client
tags: [render, client, fetch, canvas, before-after, progress]
dependency_graph:
  requires: ["08-02"]
  provides: ["RENDER-01", "RENDER-05", "RENDER-06"]
  affects: ["public/wrap-studio/stage.jsx", "public/wrap-studio/app.jsx"]
tech_stack:
  added: []
  patterns: ["window helper registration (clone __wrapDownload)", "FormData multipart POST", "RAF progress creep", "AbortController timeout"]
key_files:
  created: []
  modified:
    - public/wrap-studio/stage.jsx
    - public/wrap-studio/app.jsx
decisions:
  - "renderUrl is separate state — never overwrites displayUrl or carUrl; CSS preview untouched on failure"
  - "displayUrl precedence: props.renderUrl || recolouredUrl || carUrl — renderUrl wins for display"
  - "__wrapRenderCanvas captures CSS-composite at call time; renderUrl is null at that point so composite is recolouredUrl||carUrl (correct)"
  - "Client session render cap of 3 as first-line defence before server per-IP KV cap"
  - "Fake timer stub fully replaced — no setTimeout completes render without API response"
metrics:
  duration: 8min
  completed: "2026-06-12T16:44:00Z"
  tasks: 2
  files: 2
---

# Phase 08 Plan 03: Client Render Wire-up Summary

Real startRender fetch with FormData to /api/wrap-render, renderUrl state threaded to WrapStage, __wrapRenderCanvas canvas export helper, renderUrl-aware BA slider tags and progress veil copy.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Register __wrapRenderCanvas + renderUrl display in stage.jsx | 6fc2d43 | public/wrap-studio/stage.jsx |
| 2 | renderUrl state + real startRender fetch in app.jsx | fbc0e6a | public/wrap-studio/app.jsx |

## What Was Built

### stage.jsx changes
- Added `renderUrl` to Stage props destructure
- `displayUrl` precedence changed to `props.renderUrl || recolouredUrl || carUrl`
- New `__wrapRenderCanvas` useEffect: registers `window.__wrapRenderCanvas` that captures displayUrl as a canvas PNG blob — cleaned up on unmount (clones `__wrapDownload` pattern)
- BA tags now renderUrl-aware: `(colored || props.renderUrl)` activates slider; tags read `'Studio Render' / 'Original'` when renderUrl present, `'Wrapped' / 'No wrap'` otherwise
- Render veil copy updated: h3 → `'Rendering studio shot…'`, p → `'Compositing into the M&C studio bay — usually 15–30 seconds.'`, percentage label drops `~Ns` time suffix

### app.jsx changes
- Added `renderUrl` / `setRenderUrl` and `sessionRenderCount` / `setSessionRenderCount` state
- `setRenderUrl(null)` added to session Reset block
- Fake timer `startRender` stub fully replaced with real async fetch:
  - Guards: no carUrl, sessionRenderCount >= 3, __wrapRenderCanvas not ready
  - RAF creep: reaches ~90% at 45s (slow enough not to freeze before response)
  - Calls `window.__wrapRenderCanvas()` for PNG blob
  - POSTs `FormData(image, finish, colourName)` to `/api/wrap-render`
  - 55s AbortController client timeout
  - 429 branch: `'Too many renders — try again shortly'`
  - catch branch: `'Render failed — try again'`
  - Success: `setRenderUrl(data.renderUrl)`, increments session counter, flashes `'Studio render ready'`
- `renderUrl` threaded into WrapStage props

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All render paths are wired. renderUrl is null until a successful API response.

## Self-Check: PASSED
