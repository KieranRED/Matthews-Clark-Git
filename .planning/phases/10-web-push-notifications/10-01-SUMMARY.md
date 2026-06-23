---
phase: 10-web-push-notifications
plan: 01
subsystem: infra
tags: [web-push, vapid, pwa, notifications, npm]

# Dependency graph
requires:
  - phase: 09-webhook-foundation
    provides: Neon DB + webhook route already set up; this plan adds push infra on top
provides:
  - web-push@^3.6.7 installed and importable in Node.js runtime routes
  - VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY documented in .env.example
  - VAPID keypair generation one-liner documented for setup
affects: [10-02-PLAN, 10-03-PLAN]

# Tech tracking
tech-stack:
  added: [web-push@^3.6.7]
  patterns: [VAPID env var naming convention (NEXT_PUBLIC_ copy for browser-readable key)]

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - .env.example

key-decisions:
  - "web-push@^3.6.7 locked as the sole VAPID library — no alternatives"
  - "VAPID subject must be mailto: (not https://localhost) — Safari/iOS rejects localhost with BadJwtToken"
  - "NEXT_PUBLIC_VAPID_PUBLIC_KEY is a duplicate of VAPID_PUBLIC_KEY — required because browser subscribe code cannot read non-prefixed env vars"
  - "VAPID keypair must be generated once and reused across all deployments — changing invalidates all subscriptions"

patterns-established:
  - "VAPID setup: generate once via node -e one-liner, add to .env.local + Vercel, never commit real keys"

requirements-completed: [NOTIF-01]

# Metrics
duration: 4min
completed: 2026-06-23
---

# Phase 10 Plan 01: web-push install + VAPID env documentation Summary

**web-push@^3.6.7 installed and VAPID keypair env vars documented — Plans 10-02 and 10-03 can now import web-push and reference the env vars without re-establishing infrastructure.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-23T11:34:14Z
- **Completed:** 2026-06-23T11:38:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Installed web-push@^3.6.7 under production dependencies — verified via require() in Node.js context
- Documented all three VAPID env vars in .env.example with generation one-liner and mailto: subject warning
- Established the env var naming pattern: VAPID_PUBLIC_KEY (server) + NEXT_PUBLIC_VAPID_PUBLIC_KEY (browser bundle)

## User Setup Required

The user must complete this setup before any end-to-end push test can succeed:

1. Generate a VAPID keypair (run once):
   node -e "const wp=require('web-push'); console.log(JSON.stringify(wp.generateVAPIDKeys(),null,2))"
2. Add the output keys to .env.local:
   - VAPID_PUBLIC_KEY=<publicKey>
   - VAPID_PRIVATE_KEY=<privateKey>
   - NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey> (same value as VAPID_PUBLIC_KEY)
3. Add the same three env vars to Vercel (Settings > Environment Variables)

Important: Never regenerate the keypair after production subscriptions exist — it invalidates all stored subscriptions.

## Task Commits

1. **Task 1: Install web-push@^3.6.7** - 843d77d (chore)
2. **Task 2: Document VAPID env vars in .env.example** - 8733e36 (chore)

## Files Created/Modified

- package.json - Added web-push@^3.6.7 to dependencies
- package-lock.json - Updated lock file with web-push and its 11 transitive deps
- .env.example - Added Web Push (Phase 10) section with VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, generation one-liner, and mailto: subject note

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- package.json contains web-push@^3.6.7 under dependencies: confirmed
- node require('web-push') succeeds: confirmed
- .env.example contains VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, generateVAPIDKeys: confirmed
- No real key material committed: confirmed (all values are empty placeholders)
- Commits 843d77d and 8733e36 exist on wrap-studio-overhaul branch: confirmed
