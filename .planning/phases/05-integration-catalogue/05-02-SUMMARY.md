---
phase: 05-integration-catalogue
plan: 02
subsystem: wrap-studio
tags: [catalogue, vercel-blob, data-pipeline]
dependency_graph:
  requires: ["05-01"]
  provides: ["public/wrap-studio/catalogue.js with 375 real entries"]
  affects: ["app/wrap-studio/page.tsx"]
tech_stack:
  added: ["@vercel/blob put() with allowOverwrite"]
  patterns: ["ESM build script", "IIFE global assignment", "blob CDN swatch hosting"]
key_files:
  created:
    - scripts/build-catalogue.mjs
    - scripts/validate-catalogue.mjs
  modified:
    - public/wrap-studio/catalogue.js
decisions:
  - "allowOverwrite: true added to put() to handle idempotent re-runs"
  - "hex2 defaults to null (real data has no second colour)"
  - "proTip uses entry.notes if present, else finish-based fallback"
metrics:
  duration: "~8 min"
  completed: "2026-06-04"
  tasks: 2
  files: 3
---

# Phase 05 Plan 02: Build Real Catalogue from wrap-colours.json Summary

ESM build script reads 375-entry JSON, uploads 18 STEK swatch PNGs to Vercel Blob, and writes the production catalogue.js IIFE with real codes, series, finishes, and blob URLs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write build-catalogue.mjs | ac54c6c | scripts/build-catalogue.mjs |
| 2 | validate-catalogue.mjs + run build + run validate | e797c5b | scripts/validate-catalogue.mjs, public/wrap-studio/catalogue.js |

## Validation Results

- Entries: 375
- Swatch URLs: 18 (all STEK colour PPF + colour-shift)
- Low-confidence hex entries: 72
- Finishes: 9 (gloss, satin, matte, metallic, chrome, shift, carbon, ppf-clear, ppf-matte)
- Brands: Avery Dennison, Hexis, STEK

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing public/wrap-studio directory in worktree**
- Found during: Task 2 build run
- Issue: The worktree did not have public/wrap-studio/ — writeFileSync threw ENOENT
- Fix: mkdir -p public/wrap-studio before re-running

**2. [Rule 1 - Bug] Vercel Blob rejects duplicate uploads without allowOverwrite**
- Found during: Task 2 build re-run
- Issue: Second run on same blob paths failed with 400 Bad Request
- Fix: Added allowOverwrite: true to put() options so the script is idempotent
- Files modified: scripts/build-catalogue.mjs
- Commit: e797c5b

**3. [Rule 3 - Blocking] .env.local not present in worktree**
- Found during: Task 2 first build attempt
- Fix: Created symlink .env.local pointing to parent repo's .env.local

## Known Stubs

None. All 375 entries have real codes, series, finish keys, tier, and specs. 18 entries have real blob swatchUrls.

## Self-Check: PASSED
