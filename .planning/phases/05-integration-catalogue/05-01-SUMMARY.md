---
phase: 05-integration-catalogue
plan: "01"
subsystem: wrap-studio
tags: [route-handler, static-assets, prototype-integration]
dependency_graph:
  requires: []
  provides: [wrap-studio-route, wrap-studio-static-assets]
  affects: [INT-01, INT-02]
tech_stack:
  added: []
  patterns: [next-route-handler-html-response, react-umd-babel-standalone]
key_files:
  created:
    - app/mc-site/wrap-studio/route.js
    - public/wrap-studio/app.jsx
    - public/wrap-studio/catalogue-panel.jsx
    - public/wrap-studio/catalogue.js
    - public/wrap-studio/icons.jsx
    - public/wrap-studio/stage.jsx
    - public/wrap-studio/studio.css
    - public/wrap-studio/tweaks-panel.jsx
  modified: []
decisions:
  - Route handler (route.js GET export) used instead of page.jsx to fully bypass mc-site layout nesting
  - DEMO_CAR_SRC set to null so studio shows empty drop-car-photo state on load
  - React 18.3.1 development builds used with integrity hashes matching the design system HTML entry point
  - catalogue.js loaded as plain script (no type=text/babel) — must precede JSX files referencing window.WRAP_CATALOGUE
metrics:
  duration: "~5 minutes"
  completed: "2026-06-04T15:37:07Z"
  tasks_completed: 2
  files_changed: 8
---

# Phase 05 Plan 01: Wrap Studio Route + Static Asset Scaffold Summary

Route handler at `/mc-site/wrap-studio` serving standalone HTML shell that loads React UMD + Babel-compiled JSX from `/wrap-studio/` static paths, with demo car nulled for the empty-state production flow.

## What Was Built

**Task 1: Copy prototype files into public/wrap-studio/**

Copied 7 files verbatim from the design system prototype at `/tmp/mc-wrap-studio/wrap-studio/` into `public/wrap-studio/`. Patched `app.jsx` line 31 to set `DEMO_CAR_SRC = null` — the studio now shows the "Drop your car photo" empty state instead of the demo Toyota GR86. The demo PNG was not copied.

Commit: `2309f24`

**Task 2: Create the route handler serving the standalone HTML shell**

Created `app/mc-site/wrap-studio/route.js` exporting an async `GET()` that returns a `Response` with `Content-Type: text/html; charset=utf-8`. The HTML shell loads all studio assets in Babel-safe order: React 18.3.1 UMD, ReactDOM 18.3.1 UMD, Babel 7.29.0 standalone (all from unpkg with SRI integrity hashes matching the design system HTML reference), then `catalogue.js` as a plain `<script>` (exposes `window.WRAP_CATALOGUE`), followed by the 5 JSX files as `type="text/babel"` scripts. No `export const metadata` (not supported in route handlers) — the `noindex` meta tag handles SEO.

Commit: `34ef543`

## Deviations from Plan

**1. [Rule 1 - Minor correction] div id="root" used instead of plan-specified "app"**
- **Found during:** Task 2
- **Issue:** Plan action text specified `<div id="app"></div>` but both the prototype HTML entry point and app.jsx ReactDOM.createRoot call use "root"
- **Fix:** Used `<div id="root"></div>` to match the actual prototype code
- **Files modified:** app/mc-site/wrap-studio/route.js

**2. [Rule 1 - Minor correction] Used development React builds to match integrity hashes**
- **Found during:** Task 2
- **Issue:** The HTML entry point (authoritative source for CDN URLs/integrity hashes) uses .development.js builds. The integrity hashes only match the development builds.
- **Fix:** Used development builds with exact integrity hashes from the reference HTML
- **Files modified:** app/mc-site/wrap-studio/route.js

## Known Stubs

- `public/wrap-studio/catalogue.js` — demo wrap catalogue data. Will be replaced by the real build script in Plan 02 (INT-03).

## Self-Check: PASSED

Files exist:
- app/mc-site/wrap-studio/route.js: FOUND
- public/wrap-studio/app.jsx: FOUND
- public/wrap-studio/catalogue.js: FOUND
- public/wrap-studio/studio.css: FOUND

Commits exist:
- 2309f24: FOUND
- 34ef543: FOUND
