---
phase: 09-webhook-foundation
plan: "03"
subsystem: api
tags: [whatsapp, webhook, hmac, meta, next-server, after, crypto, graph-api, env]

requires:
  - phase: 09-02
    provides: lib/whatsappStore.js processInboundMessage and lib/neon.js db factory

provides:
  - GET /api/webhooks/whatsapp — hub.challenge verification for Meta webhook registration
  - POST /api/webhooks/whatsapp — HMAC-verified inbound message receiver with after() deferred processing
  - POST /api/admin/setup/waba-subscribe — one-time WABA subscription activation (closes silent delivery gap)
  - .env.example declarations for all 5 WHATSAPP_* vars and DATABASE_URL/DATABASE_URL_UNPOOLED

affects:
  - phase-09-testing
  - phase-11-outbound-messaging
  - phase-10-push-notifications

tech-stack:
  added: []
  patterns:
    - "Raw body BEFORE JSON.parse: request.text() called first in POST handler; HMAC computed on raw bytes"
    - "after() from next/server: defers all Neon writes until after 200 is flushed (FOUND-03)"
    - "crypto.timingSafeEqual in try/catch: length-mismatch throws caught, returns false"
    - "Admin auth gate verbatim from seed route: cookies() + adminCookieName + verifyAdminSession + 401"

key-files:
  created:
    - app/api/webhooks/whatsapp/route.js
    - app/api/admin/setup/waba-subscribe/route.js
  modified:
    - .env.example

key-decisions:
  - "export const runtime = 'nodejs' on both routes — crypto.createHmac is not available in Edge"
  - "after() as primary async mechanism — extends Vercel function lifetime, cleaner than fire-and-forget"
  - "HMAC check before after() — signature verification must be synchronous in the critical path"
  - "WABA subscribe returns both POST and GET results — caller can confirm subscription is live immediately"

patterns-established:
  - "Webhook pattern: rawBody = await request.text() -> verify HMAC -> after(() => { JSON.parse + process }) -> return 200"
  - "Always loop payload.entry[].changes[] — Meta can batch multiple events per POST"

requirements-completed: [FOUND-01, FOUND-02, FOUND-03, FOUND-06]

duration: 4min
completed: 2026-06-22
---

# Phase 09 Plan 03: Webhook Route + WABA Subscribe Summary

**HMAC-verified WhatsApp webhook receiver with after()-deferred Neon writes, plus admin-authed WABA subscription endpoint that closes the silent message delivery gap**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-22T15:58:10Z
- **Completed:** 2026-06-22T16:01:20Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Webhook GET handler echoes hub.challenge (Meta registration step); 403 on token mismatch
- Webhook POST verifies HMAC-SHA256 using timingSafeEqual (403 on fail), returns 200 immediately, defers all processInboundMessage calls to after()
- WABA subscribe endpoint: admin-authed, env-guarded, POSTs to graph.facebook.com/{WABA_ID}/subscribed_apps and verifies with GET
- All 5 WHATSAPP_* vars and both DATABASE_URL vars declared in .env.example without disturbing existing content

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the webhook route (GET verify + POST HMAC + after())** - `7cdd91e` (feat)
2. **Task 2: Create the WABA subscription activation endpoint** - `9078238` (feat)
3. **Task 3: Declare all new env vars in .env.example** - `80ddeb4` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/api/webhooks/whatsapp/route.js` - GET hub verification + POST HMAC receiver with after() deferred processing
- `app/api/admin/setup/waba-subscribe/route.js` - One-time WABA subscription activation (admin-authed, env-guarded)
- `.env.example` - Appended DATABASE_URL, DATABASE_URL_UNPOOLED, and 5 WHATSAPP_* vars

## Decisions Made

- `export const runtime = "nodejs"` on both routes — `crypto.createHmac` is not in the Edge runtime
- `after()` from `next/server` chosen as primary async mechanism over fire-and-forget Promise — extends Vercel function lifetime, is purpose-built for this pattern, and is stable in Next.js 15.5.15 (installed)
- HMAC verification runs synchronously before `after()` is called — security check must block the response path; only processing deferred
- WABA endpoint returns both POST subscribe result and GET verify result so callers can confirm delivery is live in one call
- Prerequisite lib files (neon.js, whatsappStore.js) brought from 09-02 sibling worktree branch, committed as `chore(09-03)` to give this worktree branch the required imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Brought neon.js and whatsappStore.js from 09-02 sibling branch**
- **Found during:** Pre-execution setup
- **Issue:** This worktree branch only had the initial commit; whatsappStore.js (created in 09-02) was not present, so the webhook route's import of processInboundMessage would fail node --check
- **Fix:** Staged lib/neon.js and lib/whatsappStore.js from cherry-pick, committed as chore prerequisite
- **Files modified:** lib/neon.js, lib/whatsappStore.js
- **Verification:** node --check passes on both route files
- **Committed in:** `4bada78` (pre-task prerequisite commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking: missing prerequisite file)
**Impact on plan:** Required to make imports resolve; no scope creep; files are exact 09-02 outputs.

## Issues Encountered

None beyond the prerequisite file import noted above.

## User Setup Required

External services require manual configuration before Phase 09 can be tested end-to-end:

**Meta WhatsApp Cloud API:**
- `WHATSAPP_APP_SECRET` — Meta App Dashboard -> Settings -> Basic -> App Secret
- `WHATSAPP_VERIFY_TOKEN` — Any random 32-char string (enter same value in Meta webhook setup)
- `WHATSAPP_ACCESS_TOKEN` — Meta Business Manager -> System Users -> permanent token
- `WHATSAPP_PHONE_NUMBER_ID` — Meta Business Manager -> WhatsApp -> API Setup -> Phone number ID
- `WHATSAPP_WABA_ID` — Meta Business Manager -> WhatsApp Business Account ID

**Meta Dashboard Config:**
1. Register webhook URL (https://<deploy>/api/webhooks/whatsapp) and verify token in Meta App Dashboard -> WhatsApp -> Configuration -> Webhook; subscribe to "messages" field
2. After webhook verified, call POST /api/admin/setup/waba-subscribe (admin-authed) once to activate message delivery

## Known Stubs

None — all functionality is wired. The webhook will skip processing silently when DATABASE_URL is not set (hasNeon() guard in whatsappStore.js), which is the intended local-dev behaviour.

## Next Phase Readiness

- Webhook route is production-ready pending env vars and Meta dashboard configuration
- WABA subscription endpoint ready; call it once after webhook is registered
- Phase 09 fully satisfies FOUND-01, FOUND-02 (schema has direction column), FOUND-03, FOUND-06
- Phase 10 (push notifications) and Phase 11 (outbound messaging) can build on the thread/message tables already in Neon schema

---
*Phase: 09-webhook-foundation*
*Completed: 2026-06-22*
