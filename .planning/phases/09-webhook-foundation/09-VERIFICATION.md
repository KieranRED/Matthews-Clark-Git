---
phase: 09-webhook-foundation
verified: 2026-06-22T16:30:00Z
status: human_needed
score: 8/8 must-haves verified
human_verification:
  - test: "Send a real WhatsApp message to the registered test number and confirm a row appears in whatsapp_messages within 2 seconds"
    expected: "SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 1 returns the sent message with correct wamid, from_wa_id (normalised 27XXXXXXXXX), and thread_id"
    why_human: "Requires live Meta WABA provisioning, WHATSAPP_APP_SECRET set in Vercel env, and a real phone number delivering over Cloud API"
  - test: "Send an HTTP POST to /api/webhooks/whatsapp with a deliberately wrong x-hub-signature-256 header"
    expected: "Response is HTTP 403 {\"error\":\"invalid signature\"}"
    why_human: "Requires a deployed Vercel instance with WHATSAPP_APP_SECRET set — cannot forge a valid or invalid HMAC against a blank local env"
  - test: "Call POST /api/admin/setup/waba-subscribe (admin-authed) after webhook is registered in Meta Dashboard"
    expected: "Response body contains ok:true and verify.data[] listing the active app subscription; messages begin arriving at the webhook"
    why_human: "Requires live WHATSAPP_WABA_ID + WHATSAPP_ACCESS_TOKEN with whatsapp_business_management permission"
  - test: "Confirm .env.example staged modification does not land in the next commit"
    expected: ".env.example on main/wrap-studio-overhaul branch retains the Neon Postgres and Meta WhatsApp Cloud API sections added by commit 80ddeb4"
    why_human: "A staged-but-uncommitted modification (git status shows M .env.example) currently queued to replace the Phase 09 WhatsApp/Neon vars with MCP/pixel vars — this is a merge artefact from worktree-agent-a5d35b21c635be02f that needs manual review before the next commit"
---

# Phase 09: Webhook Foundation — Verification Report

**Phase Goal:** Messages from WhatsApp arrive in the system, are verified, stored in Neon, and automatically linked to CRM leads
**Verified:** 2026-06-22T16:30:00Z
**Status:** human_needed — all automated checks pass; live Meta credential testing and one working-tree hygiene item require human action
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 7 Neon tables exist after running the migration | VERIFIED | `grep -c "CREATE TABLE IF NOT EXISTS" db/migrations/001-schema.sql` returns 7; tables in correct FK order (threads before messages) |
| 2 | wamid has a UNIQUE constraint (dedup safety net) | VERIFIED | `wamid TEXT UNIQUE NOT NULL` present on line 36 of 001-schema.sql |
| 3 | @neondatabase/serverless is installed and importable | VERIFIED | `"@neondatabase/serverless": "^1.1.0"` in package.json dependencies; `node --check lib/neon.js` passes |
| 4 | An inbound message can be persisted to Neon with thread upserted in a single store call | VERIFIED | `processInboundMessage` in lib/whatsappStore.js calls `upsertThread` then `insertInboundMessage`; 12/12 tests pass |
| 5 | Phone numbers are normalised to 27XXXXXXXXX before any thread/message write | VERIFIED | `normalizePhone` imported from lib/leadStore.js (not reimplemented); applied to `from` and `to` before every write |
| 6 | A thread is auto-linked to a CRM client/lead when clientByPhone resolves | VERIFIED | `resolveCrmLink` calls `kvGet("clientByPhone:{contactWaId}")` then `kvZRevRange("client:{id}:leads", 0, 0)`; returns null ids when KV absent |
| 7 | GET /api/webhooks/whatsapp echoes hub.challenge when verify token matches; 403 otherwise | VERIFIED | GET handler reads hub.mode/hub.verify_token/hub.challenge; returns `new Response(challenge, {status:200})` on match, `{status:403}` otherwise |
| 8 | POST /api/webhooks/whatsapp rejects invalid HMAC with 403; returns 200 immediately via after() | VERIFIED | `verifySignature` uses `crypto.timingSafeEqual` on raw body; 403 on fail; `after()` from next/server defers all Neon writes; 200 returned before any DB call |

**Score:** 8/8 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `db/migrations/001-schema.sql` | DDL for all 7 tables per FOUND-07 | VERIFIED | 7 CREATE TABLE IF NOT EXISTS; FK ordering correct; indexes present |
| `scripts/run-migration.mjs` | ESM runner with DATABASE_URL_UNPOOLED guard | VERIFIED | Guard exits 1 with clear message when env absent; reads 001-schema.sql; `npm run migrate` wired |
| `package.json` | @neondatabase/serverless dependency + migrate script | VERIFIED | `"@neondatabase/serverless": "^1.1.0"` in dependencies; `"migrate": "node scripts/run-migration.mjs"` in scripts |
| `lib/neon.js` | db() factory + hasNeon() guard | VERIFIED | Exports `db()` returning `neon(process.env.DATABASE_URL)` per-invocation; exports `hasNeon()`; no DATABASE_URL_UNPOOLED at runtime; `node --check` passes |
| `lib/whatsappStore.js` | processInboundMessage, upsertThread, insertInboundMessage, resolveCrmLink, linkThreadToLead | VERIFIED | All 5 functions exported; ON CONFLICT clauses present; normalizePhone imported not reimplemented; min_lines exceeded (230 lines); `node --check` passes |
| `lib/whatsappStore.test.mjs` | 12 passing tests | VERIFIED | `node --test lib/whatsappStore.test.mjs` — 12 pass, 0 fail, 0 skipped |
| `app/api/webhooks/whatsapp/route.js` | GET hub verify + POST HMAC + after() | VERIFIED | `export const runtime = "nodejs"`; rawBody read before JSON.parse; timingSafeEqual; after() defers processInboundMessage; 403 on HMAC fail; `node --check` passes |
| `app/api/admin/setup/waba-subscribe/route.js` | Admin-authed WABA subscription endpoint | VERIFIED | verifyAdminSession guard (401); WHATSAPP_WABA_ID/ACCESS_TOKEN env guard (400); POST + GET to graph.facebook.com/{WABA_ID}/subscribed_apps; Bearer token auth; `node --check` passes |
| `.env.example` (HEAD) | All WhatsApp + Neon env vars declared | VERIFIED (HEAD) | Commit 80ddeb4 appended DATABASE_URL, DATABASE_URL_UNPOOLED, and 5 WHATSAPP_* vars; HEAD contains all 7 entries. WARNING: working tree has a staged modification removing these vars — see human verification item 4 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/whatsappStore.js` | `lib/neon.js` | `import { db, hasNeon } from "./neon.js"` | WIRED | Relative import; both `db()` and `hasNeon()` used in store functions |
| `lib/whatsappStore.js` | `lib/leadStore.js:normalizePhone` | `import { normalizePhone } from "./leadStore.js"` | WIRED | Used in `processInboundMessage` for both `from` and `to` normalisation |
| `lib/whatsappStore.js` | KV clientByPhone index | `kvGet("clientByPhone:{contactWaId}")` | WIRED | Calls `kvGet` + `kvZRevRange`; guarded by `hasKv()` for local dev |
| `app/api/webhooks/whatsapp/route.js` | `lib/whatsappStore.js:processInboundMessage` | `import { processInboundMessage } from "@/lib/whatsappStore"` | WIRED | Called inside `after()` callback — deferred correctly |
| `app/api/webhooks/whatsapp/route.js` | node:crypto HMAC | `crypto.createHmac + timingSafeEqual` on raw body | WIRED | Raw body read via `request.text()` before parse; HMAC computed; `timingSafeEqual` with length-mismatch catch |
| `app/api/admin/setup/waba-subscribe/route.js` | graph.facebook.com/{WABA_ID}/subscribed_apps | `fetch POST + GET with Bearer token` | WIRED | Both subscribe POST and verify GET present; try/catch returns 502 on fetch error |

---

## Data-Flow Trace (Level 4)

`whatsappStore.js` is the data layer, not a render component — no JSX/props. Data flows:

1. Meta POST webhook payload -> `rawBody = await request.text()` -> HMAC verified -> `JSON.parse(rawBody)` inside `after()`
2. `handlePayload` loops `entry[].changes[]` -> calls `processInboundMessage({ wamid, from, to, ... })`
3. `processInboundMessage` -> `normalizePhone(from)` -> `resolveCrmLink(contactWaId)` -> `upsertThread(...)` -> `insertInboundMessage(...)`
4. Neon writes use `db()` which calls `neon(process.env.DATABASE_URL)` — real DB connection when DATABASE_URL is set

Data flow is CONNECTED. No hardcoded returns or empty stubs in the write path.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Migration exits 1 without DATABASE_URL_UNPOOLED | `node scripts/run-migration.mjs` (no env) | Exit 1, prints guard message | PASS |
| lib/neon.js syntax valid | `node --check lib/neon.js` | Exit 0 | PASS |
| lib/whatsappStore.js syntax valid | `node --check lib/whatsappStore.js` | Exit 0 | PASS |
| webhook route syntax valid | `node --check app/api/webhooks/whatsapp/route.js` | Exit 0 | PASS |
| waba-subscribe route syntax valid | `node --check app/api/admin/setup/waba-subscribe/route.js` | Exit 0 | PASS |
| whatsappStore tests | `node --test lib/whatsappStore.test.mjs` | 12 pass, 0 fail | PASS |
| Schema table count | `grep -c "CREATE TABLE IF NOT EXISTS" db/migrations/001-schema.sql` | 7 | PASS |
| HMAC uses timingSafeEqual | grep check | Present | PASS |
| after() defers processing | grep check | Present | PASS |
| rawBody read before JSON.parse | grep check | Present | PASS |
| subscribed_apps in WABA route | grep check | Present | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FOUND-01 | 09-02, 09-03 | Receive and store inbound messages via HMAC-verified webhook | SATISFIED | HMAC in route.js; processInboundMessage in whatsappStore.js; ON CONFLICT (wamid) DO NOTHING |
| FOUND-02 | 09-03 | Schema accommodates outbound messages | SATISFIED | `direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound'))` in whatsapp_messages table; direction column exists for Phase 11 outbound use |
| FOUND-03 | 09-03 | Webhook returns 200 immediately; async processing deferred | SATISFIED | `after()` from next/server wraps all processInboundMessage calls; `return Response.json({ ok: true })` before any DB work |
| FOUND-04 | 09-02 | Normalise phones to 27XXXXXXXXX at write time | SATISFIED | `normalizePhone` from lib/leadStore.js applied to `from` and `to` in processInboundMessage before any Neon write |
| FOUND-05 | 09-02 | Auto-link conversation to CRM lead via clientByPhone | SATISFIED | `resolveCrmLink` queries `clientByPhone:{contactWaId}` KV index; thread rows store crm_client_id/crm_lead_id; COALESCE preserves existing links |
| FOUND-06 | 09-03 | Explicitly call POST /{WABA_ID}/subscribed_apps to activate delivery | SATISFIED | app/api/admin/setup/waba-subscribe/route.js POSTs to graph.facebook.com/v21.0/{wabaId}/subscribed_apps |
| FOUND-07 | 09-01 | Neon schema with all 7 required tables | SATISFIED | 001-schema.sql defines team_numbers, whatsapp_threads, whatsapp_messages, push_subscriptions, lead_intelligence, aftercare_events, broadcast_campaigns with IF NOT EXISTS |

**Coverage: 7/7 FOUND requirements satisfied**

No orphaned requirements — all FOUND-01 through FOUND-07 are mapped to phase plans and verified in code.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `.env.example` (working tree) | Staged modification removes all Phase 09 WhatsApp/Neon vars (7 lines deleted by merge artefact) | WARNING | If committed as-is, the `.env.example` will no longer document DATABASE_URL, DATABASE_URL_UNPOOLED, or any WHATSAPP_* var — developers cloning the repo will have no env template for Phase 09+ features |

No TODO/FIXME/placeholder comments, no return null stubs, no empty handler implementations found in Phase 09 files.

---

## Human Verification Required

### 1. Live Inbound Message Delivery

**Test:** With WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN set in Vercel env and the webhook URL registered in Meta App Dashboard, send a WhatsApp message from a real phone to the registered test number.
**Expected:** Within 2 seconds, `SELECT * FROM whatsapp_messages ORDER BY created_at DESC LIMIT 1` returns the message row with correct wamid, from_wa_id normalised to 27XXXXXXXXX, thread_id linked to a whatsapp_threads row, direction = 'inbound'.
**Why human:** Requires live Meta WABA provisioning, real phone number, and Vercel deployment with env vars — cannot mock the full Meta webhook delivery loop.

### 2. HMAC 403 Rejection (Live)

**Test:** POST to `https://<deployed>/api/webhooks/whatsapp` with body `{"test":true}` and header `x-hub-signature-256: sha256=deadbeef`.
**Expected:** HTTP 403 `{"error":"invalid signature"}`.
**Why human:** WHATSAPP_APP_SECRET must be set in Vercel env for verifySignature to compare against anything. The logic is fully implemented and verified by code inspection; live confirmation requires the deployed environment.

### 3. WABA subscribed_apps Activation

**Test:** After webhook is verified in Meta Dashboard, call `POST /api/admin/setup/waba-subscribe` with a valid admin session cookie.
**Expected:** Response `{"ok":true,"subscribe":{"success":true},"verify":{"data":[{"name":"...","link":"..."}]}}`. Subsequent WhatsApp messages arrive at the webhook without manual Meta intervention.
**Why human:** Requires WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN with whatsapp_business_management + whatsapp_business_messaging permissions — live Meta credentials only.

### 4. Working Tree .env.example — Staged Modification Review

**Test:** Run `git status` and `git diff --cached -- .env.example` to review the staged modification.
**Expected:** Either (a) the staged change is discarded (`git restore --staged .env.example`) so the Phase 09 WhatsApp/Neon vars remain, or (b) the file is manually merged so both the MCP/pixel vars from the wrap-studio branch AND the WhatsApp/Neon vars from Phase 09 coexist in the committed .env.example.
**Why human:** This is a merge artefact from worktree-agent-a5d35b21c635be02f that replaced the Phase 09 env var section. Only a human can decide which staged changes to keep and commit. The HEAD state is correct; the staged modification should not be committed without review.

---

## Gaps Summary

No gaps blocking goal achievement. All 8 must-haves are verified at all four levels (exists, substantive, wired, data-flowing). The three human items above are live-system tests requiring Meta credentials; the fourth is a working-tree hygiene issue that does not affect committed code.

The one working-tree warning (staged .env.example modification) is not a gap in the committed Phase 09 implementation — HEAD is correct. It is a pending commit risk that the developer should address before the next commit.

---

_Verified: 2026-06-22T16:30:00Z_
_Verifier: Claude (gsd-verifier)_
