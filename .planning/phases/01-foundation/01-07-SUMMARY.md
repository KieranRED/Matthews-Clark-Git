---
phase: 01-foundation
plan: 07
status: complete
committed: true
---

# Plan 01-07 Summary — IG State Machine + Posting Cron + vercel.json

## What Was Built

Three new files — no existing files modified.

| File | Purpose |
|------|---------|
| `lib/igPublish.js` | Instagram API helpers + distributed cron lock + token getter |
| `app/api/cron/post/route.js` | 15-minute posting cron with two-phase state machine |
| `vercel.json` | Cron schedule declarations (all three Phase 1 crons) |

---

## Environment Variables Required

| Var | Where | Required? | Notes |
|-----|-------|-----------|-------|
| `CRON_SECRET` | Vercel project env | **Required** | Any 32+ char random string. Vercel injects it as `Authorization: Bearer <CRON_SECRET>` on each cron hit. Cron returns 401 without it. |
| `IG_ACCESS_TOKEN` | Vercel project env | **Required (first run)** | Instagram long-lived token. Seeded into KV key `ig:access_token` on first cron run if KV key is absent. After first seed, the token-refresh cron (Plan 08) keeps KV updated. |
| `IG_USER_ID` | Vercel project env | **Required** | Instagram-scoped User ID (not the Facebook Page ID). Used in all three Graph API calls (`/{IG_USER_ID}/media`, `/{IG_USER_ID}/media_publish`). Cron returns 500 without it. |
| `TELEGRAM_MC_CHAT_ID` | Vercel project env | Optional | Fallback: `TELEGRAM_CHAT_ID`. If unset, failure notifications are silently skipped. |
| `TELEGRAM_MC_BOT_TOKEN` | Vercel project env | Optional | Fallback: `TELEGRAM_BOT_TOKEN`. If unset, failure notifications are silently skipped. |
| `KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` | Already present | Required | Existing env var — powers `lib/kv.js`. |
| `KV_REST_API_TOKEN` / `UPSTASH_REDIS_REST_TOKEN` | Already present | Required | Existing env var — powers `lib/kv.js`. |

---

## Instagram Container Status Code Outcomes

| `status_code` | Cron Action | Post `status` After |
|--------------|-------------|---------------------|
| `FINISHED` | Calls `publishIgContainer`, stores `igMediaId` | `published` |
| `IN_PROGRESS` | No-op — leaves post in `processing`, retries next run | `processing` (unchanged) |
| `ERROR` | Marks failed, sets `igError`, sends Telegram alert | `failed` |
| `EXPIRED` | Marks failed, sets `igError`, sends Telegram alert | `failed` |
| `PUBLISHED` | Reconciliation — already published, updates KV only | `published` |

---

## Distributed Lock

- Key: `lock:cron:post`
- TTL: 60 seconds (SET NX EX 60)
- If lock is held: returns `{ ok: true, skipped: true, reason: "lock-held" }` immediately
- If `kvFetch` throws during lock acquisition: `acquireCronLock` returns `false` (never throws) — cron skips this run safely

---

## vercel.json — Three Crons Declared

```json
{
  "crons": [
    { "path": "/api/cron/post", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/token-refresh", "schedule": "0 9 * * *" },
    { "path": "/api/cron/blob-cleanup", "schedule": "0 3 * * *" }
  ]
}
```

The `token-refresh` and `blob-cleanup` routes are declared here but not yet implemented (Plan 08). Until Plan 08 lands, Vercel will hit those paths and receive 404 — cron logs will show 404 errors but no post publishing is affected. This is the expected intermediate wave state.

**Requires Vercel Pro plan** — the `*/15` schedule is not supported on Hobby plan.

---

## State Machine Flow

```
pending (dueIds) →
  createIgContainer → status: processing + igContainerId stored → [next cron]
  
processing (dueIds with igContainerId) →
  pollIgContainer →
    FINISHED     → publishIgContainer → status: published + igMediaId stored
    IN_PROGRESS  → no-op, try next cron
    ERROR        → status: failed + igError + Telegram alert
    EXPIRED      → status: failed + igError + Telegram alert
    PUBLISHED    → status: published (reconciliation)
    
Any throw    → status: failed + igError + Telegram alert
```

---

## Acceptance Criteria — All Passed

- `node --check lib/igPublish.js` — ✓
- `node --check app/api/cron/post/route.js` — ✓
- `vercel.json` parses as valid JSON with exactly 3 crons — ✓
- All five IG status codes handled in cron route — ✓
- Distributed lock via `SET NX EX 60` — ✓
- All failure branches invoke `notifyFailure` → `telegramSendMessage` — ✓
- Telegram env pattern mirrors `app/api/portal/leads/route.js` exactly — ✓
