---
phase: 07-quote-crm-share
plan: 03
subsystem: wrap-studio
tags: [download, share, canvas, watermark, url-state]
depends_on: ["07-02"]
provides: ["SHARE-01", "SHARE-02"]
affects:
  - public/wrap-studio/stage.jsx
  - public/wrap-studio/app.jsx
tech_stack:
  added: []
  patterns:
    - "window-registered helper from React component via useEffect"
    - "canvas watermark via 2d context drawImage + fillText"
    - "base64url encode/decode for URL state serialisation"
    - "navigator.clipboard.writeText for share link"
key_files:
  modified:
    - public/wrap-studio/stage.jsx
    - public/wrap-studio/app.jsx
decisions:
  - "Download helper registered on window from Stage (not app.jsx) — Stage owns displayUrl"
  - "useEffect keyed on displayUrl ensures closure always has latest image"
  - "Only displayUrl drawn to canvas — no external images, no taint risk"
  - "base64url (not base64) chosen for safe URL param embedding"
  - "sharedColors overrides localStorage for panelColors only — car photo not shared by design"
metrics:
  duration: 10min
  completed: "2026-06-10"
  tasks_completed: 2
  files_modified: 2
---

# Phase 07 Plan 03: Download & Share Summary

Watermarked PNG download (SHARE-01) and shareable colour-selection link (SHARE-02) wired into the wrap studio top bar — canvas watermark via 2d context on the local dataURL, share via base64url-encoded `panelColors` in a `?s=` URL param.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Register watermarked download helper from Stage | 6a31e58 | public/wrap-studio/stage.jsx |
| 2 | Wire Share (encode/decode) and Download buttons in app.jsx | debe643 | public/wrap-studio/app.jsx |

## What Was Built

**Stage download helper (`stage.jsx`):**
A `useEffect` keyed on `displayUrl` registers `window.__wrapDownload` — an async function that loads `displayUrl` into a canvas element, draws the "MATTHEWS / CLARK" watermark text at 2.5% of canvas width in the bottom-right corner, then triggers a PNG download as `mc-wrap-preview.png`. The effect cleanup removes the window handler on unmount.

**Share encode/decode (`app.jsx`):**
- Module-level `encodeSelection` / `decodeSelection` helpers using `btoa`/`atob` with base64url safe-char substitution.
- On load: `?s=` param decoded and used to seed `panelColors` and `selectedId` state (overrides localStorage for colour selection; car photo is never shared by design).
- Share button: encodes current `panelColors` into `?s=`, writes full URL to clipboard via `navigator.clipboard.writeText`.
- Download button: calls `window.__wrapDownload()` from Stage; guards for no car photo and helper not yet registered.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both SHARE-01 and SHARE-02 are fully wired.

## Self-Check: PASSED

- `public/wrap-studio/stage.jsx` — modified, contains `window.__wrapDownload`, `MATTHEWS / CLARK`, `mc-wrap-preview.png`
- `public/wrap-studio/app.jsx` — modified, contains `encodeSelection`, `decodeSelection`, `searchParams.get('s')`, `searchParams.set('s'`, `navigator.clipboard.writeText`, `window.__wrapDownload()`
- Commits 6a31e58 and debe643 exist in git log
