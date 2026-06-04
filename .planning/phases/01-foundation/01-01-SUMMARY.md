---
phase: 01-foundation
plan: 01
subsystem: database
tags: [upstash, redis, kv, sorted-set, content-store, crud]

# Dependency graph
requires: []
provides:
  - "kvZRangeByScore export in lib/kv.js for sorted set range queries by score"
  - "lib/contentStore.js with full post CRUD surface: savePost, getPost, updatePost, listPosts, listPostIds, deletePost, getDuePostIds"
  - "content:schedule sorted set (score=scheduledAt ms) as single source of truth for cron pickup"
  - "content:index sorted set (score=updatedAt ms) for feed listing"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09, cron, content-api, content-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "KV CRUD store with dual sorted-set indexes (schedule + feed index) mirroring jobStore.js"
    - "updatePost as the only safe status transition path (manages content:schedule membership)"
    - "getDuePostIds via kvZRangeByScore('content:schedule', 0, nowMs) for cron due-post queries"

key-files:
  created:
    - lib/contentStore.js
  modified:
    - lib/kv.js

key-decisions:
  - "content:schedule is the single source of truth for cron pickup — only posts with status=pending and scheduledAt set are members"
  - "updatePost is the only safe way to transition status — it manages content:schedule membership by removing non-pending posts"
  - "kvZRangeByScore appended after kvIncr without modifying any existing kv.js exports"

patterns-established:
  - "Pattern: savePost adds to content:schedule only when status=pending AND scheduledAt is set"
  - "Pattern: updatePost removes from content:schedule for any non-pending status (processing/published/failed)"
  - "Pattern: deletePost always removes from both content:index and content:schedule with try/catch to avoid throwing on missing members"

requirements-completed: [SCHEDULE-02]

# Metrics
duration: 10min
completed: 2026-05-29
---

# Phase 01 Plan 01: KV Primitives and Content Store Summary

**kvZRangeByScore added to lib/kv.js and lib/contentStore.js created with full 7-function CRUD surface using dual sorted-set KV indexes for cron scheduling and feed display**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-29T17:55:41Z
- **Completed:** 2026-05-29T18:05:49Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `lib/kv.js` gains `kvZRangeByScore` export using Upstash REST `/zrangebyscore/<key>/<min>/<max>` path — enables cron to find all posts with `scheduledAt <= now` from the `content:schedule` sorted set
- `lib/contentStore.js` created with all 7 exports: `savePost`, `getPost`, `updatePost`, `listPosts`, `listPostIds`, `deletePost`, `getDuePostIds` — mirrors `jobStore.js` conventions exactly
- `updatePost` correctly manages `content:schedule` membership on status transitions — the critical invariant that prevents the cron from re-picking up posts already in processing or published states

## Task Commits

Each task was committed atomically:

1. **Task 1: Add kvZRangeByScore export to lib/kv.js** - `11bfefc` (feat)
2. **Task 2: Create lib/contentStore.js mirroring jobStore.js** - `5ccfe97` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `lib/kv.js` - Added `kvZRangeByScore(setKey, min, max)` export after `kvIncr`; all 11 existing exports untouched
- `lib/contentStore.js` - New file; full post CRUD store with dual sorted-set KV indexes

## Decisions Made
- `content:schedule` is the single source of truth for cron pickup. Only posts with `status=pending` AND a valid `scheduledAt` are members of this set. The cron queries it with `kvZRangeByScore('content:schedule', 0, Date.now())`.
- `updatePost` is the only safe way to transition post status — it atomically updates the KV hash and manages `content:schedule` membership. Direct `kvSet` calls bypassing `updatePost` would leave the schedule set in an inconsistent state.
- `deletePost` always removes from both `content:index` and `content:schedule` using try/catch to avoid throwing when a member is not present in either set.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. The contentStore functions are no-ops (`return null` / `return []`) when KV env vars are not configured.

## Next Phase Readiness

- Wave 2 plans (content API routes, quality check, cron) can now `import { savePost, getPost, updatePost, listPosts, listPostIds, deletePost, getDuePostIds } from "@/lib/contentStore"` without any further changes to this layer
- Wave 2 plans can `import { kvZRangeByScore } from "@/lib/kv"` directly if needed outside contentStore
- No blockers introduced — KV is no-op safe for local development without Upstash credentials

---
*Phase: 01-foundation*
*Completed: 2026-05-29*
