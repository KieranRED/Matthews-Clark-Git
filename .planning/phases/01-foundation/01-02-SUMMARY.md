---
phase: 01-foundation
plan: 02
subsystem: infra
tags: [mediainfo.js, wasm, vercel, next.config.js, serverless, video-quality]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: contentStore.js KV primitives that Wave 2 quality-check will write results to
provides:
  - mediainfo.js@0.3.7 and unpdf@1.6.2 installed in package.json
  - next.config.js serverExternalPackages + outputFileTracingIncludes for WASM bundling
  - GET /api/test-mediainfo validation endpoint
affects: [01-03, 01-04, quality-check, upload, wave-2]

# Tech tracking
tech-stack:
  added: [mediainfo.js@0.3.7, unpdf@1.6.2]
  patterns:
    - "serverExternalPackages prevents Next.js from bundling WASM-shipping packages"
    - "experimental.outputFileTracingIncludes forces Vercel deploy tracer to include .wasm for specific routes"
    - "export const runtime = 'nodejs' required for WASM routes (not edge)"
    - "export const maxDuration = 30 for cold-start + fetch + analyze budget"

key-files:
  created:
    - app/api/test-mediainfo/route.js
  modified:
    - next.config.js
    - package.json
    - package-lock.json

key-decisions:
  - "WASM file confirmed present at node_modules/mediainfo.js/dist/MediaInfoModule.wasm — outputFileTracingIncludes glob './node_modules/mediainfo.js/dist/*.wasm' matches it"
  - "test-mediainfo endpoint intentionally unauthenticated — returns no sensitive data, designed for curl smoke testing from any terminal"
  - "maxDuration=30 chosen to survive cold start + remote video fetch + WASM analyze within Vercel's default Node function cap"

patterns-established:
  - "Pattern: mediainfo.js WASM integration — always pair serverExternalPackages with outputFileTracingIncludes"

requirements-completed: [UPLOAD-03]

# Metrics
duration: 2min
completed: 2026-05-29
---

# Phase 01 Plan 02: mediainfo.js WASM Probe Summary

**mediainfo.js@0.3.7 and unpdf@1.6.2 installed; Next.js configured with serverExternalPackages + WASM trace includes; /api/test-mediainfo endpoint deployed — awaiting Vercel production verification**

## Performance

- **Duration:** ~2 min (Tasks 1-2 only; Task 3 is human-verify checkpoint)
- **Started:** 2026-05-29T18:08:11Z
- **Completed (Tasks 1-2):** 2026-05-29T18:09:28Z
- **Tasks:** 2 of 3 (Task 3 is checkpoint:human-verify — awaiting user)
- **Files modified:** 4

## Accomplishments
- mediainfo.js@0.3.7 and unpdf@1.6.2 installed; WASM file confirmed present at `node_modules/mediainfo.js/dist/MediaInfoModule.wasm`
- `next.config.js` updated with `serverExternalPackages: ['mediainfo.js']` and `experimental.outputFileTracingIncludes` for both `/api/test-mediainfo` and `/api/admin/content/quality-check` routes
- `/api/test-mediainfo` endpoint created — fetches Big Buck Bunny 1MB H.264 sample, runs mediainfo.js WASM via `analyzeData()`, returns `{ ok: true, trackCount, videoTrack }` with `runtime='nodejs'` and `maxDuration=30`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install mediainfo.js + unpdf and update next.config.js** - `bad72d2` (chore)
2. **Task 2: Create /api/test-mediainfo validation endpoint** - `603d7a4` (feat)
3. **Task 3: Human verifies /api/test-mediainfo on Vercel** - PENDING (checkpoint:human-verify)

## Files Created/Modified
- `next.config.js` - Added `serverExternalPackages: ['mediainfo.js']` + `experimental.outputFileTracingIncludes` for WASM tracing
- `package.json` - Added `mediainfo.js@^0.3.7` and `unpdf@^1.6.2` dependencies
- `package-lock.json` - Updated lock file (87 new packages)
- `app/api/test-mediainfo/route.js` - New GET endpoint; fetches video, runs WASM analyzeData(), returns videoTrack

## Decisions Made
- WASM glob `./node_modules/mediainfo.js/dist/*.wasm` confirmed correct — `MediaInfoModule.wasm` is the exact file name
- Endpoint is intentionally unauthenticated to allow `curl` smoke testing without cookies
- Default test URL: `https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4` (sub-1MB H.264, publicly accessible)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- npm EBADENGINE warnings for `yargs@18.0.0` and `yargs-parser@22.0.0` (transitive deps of mediainfo.js CLI tools) — these are CLI-only and do not affect the WASM runtime. All Node 20.9 acceptance criteria pass.

## User Setup Required

**Task 3 (checkpoint:human-verify) requires manual Vercel verification before Wave 2 can proceed.**

Steps:
1. Merge/push the `worktree-agent-a694b4c7d82dc04b0` branch (or ensure commits land on the deployed branch)
2. Wait for Vercel preview/production build to complete
3. Run: `curl -s "https://YOUR_VERCEL_URL/api/test-mediainfo" | head -c 400`
4. Expected: `{"ok":true,"url":"https://test-videos.co.uk/...","durationMs":...,"trackCount":3,"videoTrack":{"@type":"Video","Format":"AVC",...}}`
5. Verify `videoTrack` contains `Format`, `Width`, `Height`, `BitRate`, `FrameRate` keys
6. Verify `durationMs < 25000`
7. Reply "approved" with the deployed URL (or paste curl output) to unblock Wave 2

**If Vercel returns `{"ok":false,"error":"Cannot find module..."}` or mentions WASM:** The `outputFileTracingIncludes` glob is not matching. Re-investigate `next.config.js` experimental config and recheck the exact WASM file path in the deployed bundle.

## Next Phase Readiness
- Tasks 1+2 complete — Wave 2 (Plan 03: upload token + quality-check endpoint) is architecturally unblocked locally
- Wave 2 CANNOT start until Task 3 (Vercel production verification) is approved by user
- The Vercel URL used and `durationMs` from production should be recorded here once verified (for cold-start budgeting)

**Vercel verification result (fill in after Task 3):**
- Deployed URL: _TBD_
- durationMs on Vercel: _TBD_
- Approved: _PENDING_

---
*Phase: 01-foundation*
*Completed: 2026-05-29 (Tasks 1-2 only; Task 3 pending human verification)*
