---
phase: 09-webhook-foundation
plan: 01
subsystem: database
tags: [neon, postgres, serverless, sql, migration, whatsapp]

# Dependency graph
requires: []
provides:
  - "@neondatabase/serverless driver installed and importable"
  - "db/migrations/001-schema.sql: DDL for all 7 Neon tables (FOUND-07)"
  - "scripts/run-migration.mjs: runner that applies schema against DATABASE_URL_UNPOOLED"
  - "npm run migrate wired"
affects:
  - 09-02-webhook-handler
  - 09-03-store-layer
  - "all phases writing to whatsapp_threads, whatsapp_messages, team_numbers, push_subscriptions, lead_intelligence, aftercare_events, broadcast_campaigns"

# Tech tracking
tech-stack:
  added:
    - "@neondatabase/serverless@^1.1.0 (Neon HTTP driver, pure JS)"
  patterns:
    - "DDL applied via DATABASE_URL_UNPOOLED (direct connection); runtime uses DATABASE_URL (pooler)"
    - "Migration files in db/migrations/ with numeric prefix for ordering"
    - "ESM migration runner (scripts/*.mjs) with guard on required env var"

key-files:
  created:
    - db/migrations/001-schema.sql
    - scripts/run-migration.mjs
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use DATABASE_URL_UNPOOLED for migration runner (DDL incompatible with Neon PgBouncer pooler)"
  - "CREATE TABLE IF NOT EXISTS for all 7 tables — idempotent re-runs safe"
  - "wamid TEXT UNIQUE NOT NULL — dedup safety net for Meta at-least-once delivery semantics"
  - "sql.query() raw string form (not tagged template) for multi-statement migration splitting"
  - "Do NOT add serverExternalPackages to next.config — neon is pure JS, no WASM"

patterns-established:
  - "Migration runner pattern: read SQL file, split on semicolons, filter blanks/comments, execute sequentially"
  - "Env guard pattern: check required env var, print actionable message, exit 1 (never let neon throw unhandled connection error)"

requirements-completed: [FOUND-07]

# Metrics
duration: 8min
completed: 2026-06-22
---

# Phase 09 Plan 01: Webhook Foundation — DB Schema Summary

**@neondatabase/serverless installed and 7-table Neon schema authored (team_numbers, whatsapp_threads, whatsapp_messages, push_subscriptions, lead_intelligence, aftercare_events, broadcast_campaigns) with idempotent DDL, wamid UNIQUE dedup constraint, and a guarded ESM migration runner**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-22T15:34:00Z
- **Completed:** 2026-06-22T15:42:27Z
- **Tasks:** 3
- **Files modified:** 4 (package.json, package-lock.json, db/migrations/001-schema.sql, scripts/run-migration.mjs)

## Accomplishments

- Installed @neondatabase/serverless@^1.1.0 — importable from Node (verified via require())
- Authored db/migrations/001-schema.sql with all 7 FOUND-07 tables using CREATE TABLE IF NOT EXISTS, correct FK ordering (whatsapp_threads before whatsapp_messages), wamid UNIQUE NOT NULL dedup constraint, and 5 performance indexes
- Created scripts/run-migration.mjs: ESM runner with DATABASE_URL_UNPOOLED guard (exits 1 with clear message when absent), splits SQL on semicolons, executes via sql.query(), and added "npm run migrate" to package.json

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @neondatabase/serverless** - `41a8ebd` (chore)
2. **Task 2: Author db/migrations/001-schema.sql with all 7 tables** - `b6b0d84` (feat)
3. **Task 3: Author scripts/run-migration.mjs and apply the schema** - `260a2ad` (feat)

## Files Created/Modified

- `db/migrations/001-schema.sql` - DDL for all 7 WhatsApp/CRM tables with indexes and constraints
- `scripts/run-migration.mjs` - ESM runner: reads SQL, guards on DATABASE_URL_UNPOOLED, executes statements sequentially
- `package.json` - Added @neondatabase/serverless dependency + "migrate" npm script
- `package-lock.json` - Updated lockfile (+73 packages)

## Decisions Made

- Used sql.query() raw string form (not tagged template literal) for splitting multi-statement SQL — tagged template form does not accept raw strings
- No serverExternalPackages in next.config — neon is pure JS with no WASM; only add if next build fails
- Filtered comment-only SQL fragments after semicolon split to avoid empty statement errors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before running "npm run migrate", developer must:

1. Provision Neon Postgres via Vercel Marketplace (populates DATABASE_URL automatically)
2. Copy the direct (unpooled) connection string from Vercel Dashboard -> Storage -> Neon
3. Set in shell: export DATABASE_URL_UNPOOLED="postgres://..." (the -pooler.neon.tech URL does NOT work for DDL)
4. Run: npm run migrate
5. Verify in Neon console that all 7 tables appear in the default database

## Next Phase Readiness

- Phase 09-02 (Webhook Handler) can now import @neondatabase/serverless and write to the schema
- Phase 09-03 (Store Layer) has all 7 table definitions to write against
- Schema is idempotent — safe to re-run migrate if needed

---
*Phase: 09-webhook-foundation*
*Completed: 2026-06-22*
