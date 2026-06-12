---
phase: 08-gpt-image-2-studio-render
plan: "02"
subsystem: wrap-render-api
tags: [openai, gpt-image-1, rate-limiting, upstash-kv, api-route]
dependency_graph:
  requires: ["08-01"]
  provides: ["RENDER-02", "RENDER-03", "RENDER-04"]
  affects: ["wrap-studio-frontend"]
tech_stack:
  added: ["openai images.edit"]
  patterns: ["multipart formData parse", "per-IP KV rate cap with TTL", "b64_json dataURL return"]
key_files:
  created:
    - app/api/wrap-render/route.js
  modified: []
decisions:
  - "model is gpt-image-1 (exact string) — images.edit() not images.generate()"
  - "Rate cap is per-IP daily via kvIncr+kvExpire(90000s) — KV failure is non-fatal, does not block render"
  - "Response is b64_json dataURL string — not blob/expiring URL, survives page reload"
  - "size 1536x1024 landscape matches wrap-studio stage aspect ratio"
metrics:
  duration: "5min"
  completed: "2026-06-12"
  tasks_completed: 1
  files_created: 1
---

# Phase 08 Plan 02: Wrap Render API Route Summary

**One-liner:** GPT-Image-1 studio render endpoint with per-IP daily rate cap returning base64 dataURL.

## What Was Built

`POST /api/wrap-render` — App Router route that:
1. Enforces a per-IP daily cap (10 renders) via Upstash KV using `kvIncr` + `kvExpire` (25h TTL). KV failure is non-fatal.
2. Parses multipart body for `image` (PNG blob), `finish`, and `colourName` fields.
3. Calls `client.images.edit({ model: 'gpt-image-1', size: '1536x1024', quality: 'standard', n: 1 })` with a finish-aware prompt referencing the M&C workshop bay.
4. Returns `{ ok: true, renderUrl: 'data:image/png;base64,...' }`.
5. Returns 429 on quota exceeded, 500 on OpenAI error, 400 on bad/missing body.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create /api/wrap-render route with rate limiting | cbb15b8 | app/api/wrap-render/route.js |

## Deviations from Plan

**Pre-task merge:** The worktree branch was behind `main` (missing 08-01 commits including `kvExpire` in lib/kv.js). Merged `main` into the worktree branch before creating the route. Normal worktree sync, not a plan deviation.

No other deviations — plan executed as written.

## Known Stubs

None — route is fully wired. Frontend integration is the responsibility of 08-03/08-04.

## Self-Check: PASSED

- `app/api/wrap-render/route.js` contains all required strings: `gpt-image-1`, `images.edit`, `1536x1024`, `b64_json`, `runtime`, `maxDuration`, `kvExpire`, `429`.
- Commit `cbb15b8` verified in git log.
