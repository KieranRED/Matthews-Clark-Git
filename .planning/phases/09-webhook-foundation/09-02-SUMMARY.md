---
phase: 09-webhook-foundation
plan: 02
subsystem: database
tags: [neon, postgres, whatsapp, kv, phone-normalisation, idempotency]

requires:
  - phase: 09-01
    provides: Neon Postgres schema (whatsapp_threads, whatsapp_messages) and migration runner

provides:
  - lib/neon.js — db() factory (pooler, per-invocation) and hasNeon() guard
  - lib/whatsappStore.js — all Neon read/write ops for WhatsApp inbound pipeline
  - processInboundMessage() — single call to normalise, auto-link, upsert thread, insert message
  - resolveCrmLink() — phone -> clientId -> leadId via existing KV clientByPhone index
  - upsertThread(), insertInboundMessage(), linkThreadToLead(), findOrCreateThread(), getThreadMessages()

affects: [09-03, webhook-route, whatsapp-chat-ui, phase-10, phase-11, phase-13]

tech-stack:
  added: ["@neondatabase/serverless (already in package.json — no install needed)"]
  patterns:
    - "per-invocation neon() factory (no module-level singleton)"
    - "hasNeon()/hasKv() guard pattern mirroring lib/kv.js hasKv()"
    - "ON CONFLICT (wamid) DO NOTHING for Meta at-least-once delivery safety"
    - "relative imports in lib/ files that have co-located node:test tests"

key-files:
  created:
    - lib/neon.js
    - lib/whatsappStore.js
    - lib/whatsappStore.test.mjs
  modified: []

key-decisions:
  - "Relative imports (./neon.js, ./leadStore.js, ./kv.js) used in whatsappStore.js so node --test resolves them without Next.js; @/ alias only works under Next.js bundler"
  - "normalizePhone reused from lib/leadStore.js — not reimplemented (FOUND-04)"
  - "Auto-link resolves crm_lead_id via kvZRevRange(client:{id}:leads, 0, 0) — most-recent lead for the client"

patterns-established:
  - "Store modules: all Neon ops behind hasNeon() guard, no-op safely with no DATABASE_URL"
  - "TDD with node:test: source-text assertions for SQL strings; guard tests for no-op behaviour"

requirements-completed: [FOUND-01, FOUND-04, FOUND-05]

duration: 4min
completed: 2026-06-22
---

# Phase 09 Plan 02: Neon Data Layer Summary

**Neon client factory (db()/hasNeon()) and whatsappStore.js with phone normalisation, clientByPhone auto-linking, ON CONFLICT idempotency, and full guard pattern for local development**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-22T15:48:15Z
- **Completed:** 2026-06-22T15:52:15Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- `lib/neon.js` — per-invocation `db()` factory using pooler DATABASE_URL, `hasNeon()` guard mirroring `hasKv()` pattern
- `lib/whatsappStore.js` — complete inbound message pipeline: normalise phones (reuses `normalizePhone` from leadStore), auto-link to CRM via `clientByPhone:` KV index, upsert thread with `ON CONFLICT (contact_wa_id, team_wa_id)`, insert message with `ON CONFLICT (wamid) DO NOTHING`
- 12 passing tests in `lib/whatsappStore.test.mjs` covering all exported function shapes, guard behaviour, SQL idempotency strings, and auto-link source patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/neon.js client factory** - `0dab896` (feat)
2. **Task 2: RED — failing tests for whatsappStore** - `f353282` (test)
3. **Task 2: GREEN — implement lib/whatsappStore.js** - `1cff65c` (feat)

**Plan metadata:** (docs commit below)

_Note: TDD task has two commits (test RED -> feat GREEN)_

## Files Created/Modified

- `lib/neon.js` — `db()` returns `neon(process.env.DATABASE_URL)` per-invocation; `hasNeon()` guard
- `lib/whatsappStore.js` — `processInboundMessage`, `resolveCrmLink`, `upsertThread`, `insertInboundMessage`, `linkThreadToLead`, `findOrCreateThread`, `getThreadMessages`
- `lib/whatsappStore.test.mjs` — 12 node:test assertions (shapes, guards, SQL strings, import checks)

## Decisions Made

- **Relative imports in whatsappStore.js:** The `@/` path alias only resolves under the Next.js bundler. Since whatsappStore.js has a co-located `node --test` test file, relative imports (`./neon.js`, `./leadStore.js`, `./kv.js`) are used so tests run without Next.js. Runtime behaviour is identical.
- **Source-text assertions for SQL:** Node v20 lacks `mock.module` (added in v22). Tests use `readFile` + `String.prototype.includes` to verify SQL idempotency clauses deterministically without a live database.
- **getThreadMessages / findOrCreateThread added:** Both are called by the plan success criteria and by future phases. Added proactively as they follow the existing pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched from @/ path alias to relative imports**
- **Found during:** Task 2 (GREEN — running node --test)
- **Issue:** `import { db, hasNeon } from "@/lib/neon"` fails with `Cannot find package '@/lib'` under plain Node.js. The `@/` alias is resolved by the Next.js bundler — not by Node.js ESM loader.
- **Fix:** Changed all three imports to relative paths (`./neon.js`, `./leadStore.js`, `./kv.js`). Next.js resolves both relative and `@/` at runtime, so the change is transparent in production.
- **Files modified:** lib/whatsappStore.js
- **Verification:** `node --test lib/whatsappStore.test.mjs` passes 12/12
- **Committed in:** `1cff65c` (Task 2 feat commit)

**2. [Rule 3 - Blocking] Replaced mock.module() with source-text + guard-based tests**
- **Found during:** Task 2 (RED — initial test run)
- **Issue:** `mock.module` is a node:test feature introduced in Node v22. The project uses Node v20.9.0 — calling it throws `TypeError: mock.module is not a function`.
- **Fix:** Rewrote tests to use `readFile` + `String.prototype.includes` for SQL string assertions; guard tests (env vars absent -> functions return undefined/null) for behaviour coverage; shape tests for all exports.
- **Files modified:** lib/whatsappStore.test.mjs
- **Verification:** All 12 tests pass on Node v20.9.0
- **Committed in:** `f353282` (Task 2 test commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking)
**Impact on plan:** Both fixes necessary to make `node --test` pass. No scope creep. SQL idempotency and import patterns match plan spec exactly.

## Issues Encountered

- Node v20 incompatibility with `mock.module` — resolved via source-text testing strategy (see Deviations)

## User Setup Required

None — no external service configuration required for this plan. DATABASE_URL is populated by Vercel Marketplace integration (documented in 09-01 setup checklist).

## Known Stubs

None — all functions fully implemented. `getThreadMessages` returns `[]` when `hasNeon()` is false (intentional guard, not a stub).

## Next Phase Readiness

- Wave 3 (09-03): The webhook route (`app/api/webhooks/whatsapp/route.js`) can now call `processInboundMessage()` — it's a thin shell over this data layer
- `linkThreadToLead` is ready for the WABA subscription route (09-04) and future re-linking flows
- `getThreadMessages` is ready for the Phase 11 chat UI

---
*Phase: 09-webhook-foundation*
*Completed: 2026-06-22*
