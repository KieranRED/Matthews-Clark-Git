# Architecture: WhatsApp Business Integration

**Milestone:** v1.2 WhatsApp Business Integration
**Researched:** 2026-06-22
**Confidence:** HIGH (all integration points verified against live source code)

---

## Existing Architecture Summary

The codebase is a Next.js 15 App Router monolith deployed on Vercel with the following conventions:

- All admin UI lives in one client-side React tree: `app/(crm)/admin/(protected)/kit/app.jsx`
- Routing inside that tree is client-side slug parsing (`shell.jsx::parsePath`), not Next.js pages. Adding a new screen = add a `slug[0] === "whatsapp"` branch in `parsePath` + import the screen component in `app.jsx`
- Data for the CRM shell is fetched by `useCrmKitData` polling `/api/admin/crm-kit` every 15 seconds. WhatsApp thread-list data should follow this same pattern: separate fetch, same polling approach
- API routes at `/api/admin/*` use the `verifyAdminSession` cookie check from `lib/adminAuth.js`. Cron routes use `Authorization: Bearer ${CRON_SECRET}` instead
- Notifications fire via `lib/telegram.js`. Web Push is additive alongside this — do not replace Telegram
- Storage: Upstash Redis KV via REST (`lib/kv.js`). No persistent connections. WhatsApp conversation data goes to Neon Postgres, not KV

---

## Neon Postgres in a Serverless/Edge Environment

**Recommended driver:** `@neondatabase/serverless` with the `neon()` HTTP function.

Use the HTTP transport (`neon()`) not WebSockets (`Pool/Client`) for Vercel Node.js serverless functions. Each route handler is a stateless invocation — there is no connection to reuse across requests. HTTP transport has ~3-4 round-trip setup cost vs ~8 for TCP, which is the right trade-off here.

```js
// lib/neon.js — shared factory, created per invocation
import { neon } from "@neondatabase/serverless";

export function db() {
  return neon(process.env.DATABASE_URL);
}
```

Use the **pooled** connection string (`-pooler` hostname from Neon dashboard). This routes through Neon's PgBouncer in transaction mode, preventing connection exhaustion when many serverless invocations run in parallel.

Do NOT double-pool (client-side pool + Neon PgBouncer). One layer is enough.

For **migrations** (schema changes only, not query traffic), use `DATABASE_URL_UNPOOLED` — Neon's PgBouncer in transaction mode does not support `SET search_path` or DDL session-level commands.

```bash
npm install @neondatabase/serverless
```

Add to `.env.local` (real values from Neon dashboard):
```
DATABASE_URL=postgres://user:pass@ep-xxx-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgres://user:pass@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

**Confidence:** HIGH — sourced from Neon official serverless driver documentation.

---

## Database Schema (Neon Postgres)

Five tables. All IDs are UUIDs. Phone numbers stored in E.164-without-plus format (matching `normalizePhone()` in `lib/leadStore.js`).

```sql
-- Registered team WhatsApp numbers
CREATE TABLE team_numbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id         TEXT UNIQUE NOT NULL,   -- e.g. "27821234567"
  display_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Every message in/out on every thread
CREATE TABLE conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wamid           TEXT UNIQUE NOT NULL,  -- Meta message ID, for deduplication
  thread_key      TEXT NOT NULL,          -- "{team_wa_id}:{contact_wa_id}"
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_wa_id      TEXT NOT NULL,
  to_wa_id        TEXT NOT NULL,
  message_type    TEXT NOT NULL,          -- text, image, audio, document, etc.
  body            TEXT,
  media_url       TEXT,
  timestamp_ms    BIGINT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  lead_id         TEXT,                   -- KV lead ID (nullable, auto-linked)
  client_id       TEXT,                   -- KV client ID (nullable, auto-linked)
  ai_analysed     BOOLEAN DEFAULT false
);

CREATE INDEX ON conversation_messages (thread_key, timestamp_ms DESC);
CREATE INDEX ON conversation_messages (from_wa_id);
CREATE INDEX ON conversation_messages (created_at);

-- AI-derived intelligence per thread, updated per message analysis
CREATE TABLE lead_intelligence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_key      TEXT UNIQUE NOT NULL,
  lead_id         TEXT,
  warmth_score    INT CHECK (warmth_score BETWEEN 1 AND 10),
  objections      JSONB DEFAULT '[]',     -- ["price", "timing"]
  status_signal   TEXT,                   -- "hot", "cold", "dead", "converted"
  follow_up_at    TIMESTAMPTZ,
  last_analysed   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Aftercare events (post-delivery follow-ups)
CREATE TABLE aftercare_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         TEXT NOT NULL,
  event_type      TEXT NOT NULL,          -- "7day", "30day", "review_request"
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending', -- pending, sent, failed
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON aftercare_events (status, scheduled_at);

-- Broadcast campaign records
CREATE TABLE broadcast_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_criteria JSONB NOT NULL,         -- {stage: "lost", inactive_days: 30}
  status          TEXT DEFAULT 'draft',   -- draft, running, done
  sent_count      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  run_at          TIMESTAMPTZ
);
```

**Push subscriptions** are stored in KV (not Postgres) to keep them consistent with the existing KV-first pattern and avoid a Postgres query on every push dispatch:

```
push:sub:{deviceId}     → { endpoint, keys: { p256dh, auth }, ua, createdAt }
push:subs:index         → sorted set, score = createdAt ms, member = deviceId
```

---

## Data Flows

### 1. Inbound Message: Webhook to DB to Push to CRM

```
Meta Cloud API
  → POST /api/whatsapp/webhook
      [1] Verify X-Hub-Signature-256 (HMAC-SHA256 of raw body with WHATSAPP_APP_SECRET)
      [2] Return 200 immediately (Meta retries if non-2xx)
      [3] Parse payload:
            entry[].changes[].value.messages[] → inbound messages
            entry[].changes[].value.statuses[] → delivery receipts (log, don't push)
      [4] For each message:
            a. Upsert to conversation_messages (wamid as dedup key — ON CONFLICT DO NOTHING)
            b. Derive thread_key = "{team_wa_id}:{contact_wa_id}"
            c. Phone lookup: normalizePhone(from_wa_id) → kvGet clientByPhone:{phone}
               → populate lead_id + client_id on the message row
            d. Dispatch Web Push to all subscribed devices (fire-and-forget, non-blocking)
            e. Enqueue AI analysis (write flag to KV: whatsapp:ai:queue:{wamid} = 1)
               → AI runs in a separate cron or deferred — NOT inline in webhook handler
      [5] Return 200

Web Push dispatch (step d):
  → kvZRevRange("push:subs:index", 0, -1) → all deviceIds
  → for each: kvGet push:sub:{deviceId}
  → webpush.sendNotification(subscription, JSON.stringify({ title, body, threadKey }))
  → if 410 Gone: kvDel push:sub:{deviceId} + kvZRem push:subs:index

CRM polling:
  → useCrmKitData polls /api/admin/crm-kit every 15s (existing)
  → WhatsApp tab fetches /api/admin/whatsapp/threads independently
  → New message badge on WhatsApp nav item driven by unread count from threads endpoint
```

### 2. AI Analysis: Async via Cron

```
Vercel Cron (every 5 min) → GET /api/cron/whatsapp-ai
  → kvKeys("whatsapp:ai:queue:*") → pending wamids
  → for each:
      SELECT message + last N messages in thread FROM conversation_messages
      → Claude API: analyze warmth, objections, status signal, follow-up timing
      → UPSERT lead_intelligence ON CONFLICT (thread_key) DO UPDATE
      → if status_signal = "hot": dispatch Web Push alert to team
      → if follow_up_at set: schedule aftercare_events row
      → kvDel whatsapp:ai:queue:{wamid}
```

### 3. Outbound Message from CRM

```
CRM chat UI → POST /api/admin/whatsapp/send
  → verifyAdminSession
  → call Meta Cloud API: POST https://graph.facebook.com/v20.0/{phone_number_id}/messages
  → on success: INSERT conversation_messages (direction='outbound')
  → return { ok, message }
```

### 4. Vercel Cron: Morning Briefing (daily 07:00 SAST = 05:00 UTC)

```
GET /api/cron/whatsapp-morning-briefing
  → Query last 24hr threads with unanswered inbound messages
  → Query all active leads with no WhatsApp contact in 3+ days
  → Build summary → telegramSendMessage (existing pattern) + Web Push
```

### 5. Vercel Cron: No-Contact Check (every 15 min)

```
GET /api/cron/whatsapp-no-contact
  → SELECT thread_keys where last inbound message > X hours ago and no outbound reply
  → Cross-reference with leads in "new" or "quoted" stage (KV lookup)
  → If threshold exceeded: dispatch Web Push + Telegram alert
  → Threshold: 4hr during business hours (08:00-18:00 SAST)
```

---

## New Files

### Library

```
lib/neon.js
  → db() factory: returns neon(process.env.DATABASE_URL)
  → Used by all WhatsApp route handlers and crons

lib/whatsappStore.js
  → insertMessage(msg)
  → listThreads({ limit, offset })              → thread summaries (last msg + unread count)
  → listMessages({ threadKey, limit, before })  → paginated message history
  → linkLeadToThread(threadKey, leadId, clientId)
  → upsertIntelligence(threadKey, data)
  → getIntelligence(threadKey)

lib/webPush.js
  → initVapid()                   → sets VAPID details once (call on module load)
  → saveSubscription(deviceId, sub)
  → removeSubscription(deviceId)
  → listSubscriptions()
  → dispatchPush(payload)         → sends to all saved subscriptions, cleans up 410s

lib/whatsappApi.js
  → sendMessage({ toWaId, fromPhoneId, body })  → Meta Cloud API call
  → verifyWebhookSignature(rawBody, signature)  → HMAC-SHA256 verification
```

### API Routes (all new)

```
app/api/whatsapp/webhook/route.js
  GET  → webhook verification (hub.mode, hub.verify_token, hub.challenge)
  POST → inbound message handler (described in data flow above)
  export const runtime = "nodejs"   ← required for crypto.createHmac

app/api/admin/whatsapp/threads/route.js
  GET  → list threads with last message, unread count, linked lead
  → verifyAdminSession

app/api/admin/whatsapp/threads/[threadKey]/messages/route.js
  GET  → paginated message history for a thread
  → verifyAdminSession

app/api/admin/whatsapp/send/route.js
  POST → send outbound message
  → verifyAdminSession

app/api/admin/whatsapp/numbers/route.js
  GET  → list team_numbers
  POST → register a new team number
  → verifyAdminSession

app/api/admin/whatsapp/numbers/[id]/route.js
  PATCH  → update display_name
  DELETE → remove number
  → verifyAdminSession

app/api/admin/whatsapp/intelligence/[threadKey]/route.js
  GET → get lead_intelligence for a thread
  → verifyAdminSession

app/api/push/subscribe/route.js
  POST → save Web Push subscription to KV
  → verifyAdminSession (only team members subscribe)

app/api/push/unsubscribe/route.js
  POST → remove subscription
  → verifyAdminSession

app/api/cron/whatsapp-ai/route.js
  GET → process AI analysis queue (CRON_SECRET auth)
  export const maxDuration = 60

app/api/cron/whatsapp-morning-briefing/route.js
  GET → daily morning summary (CRON_SECRET auth)

app/api/cron/whatsapp-no-contact/route.js
  GET → no-contact alert check (CRON_SECRET auth)
```

### CRM Screen

```
app/(crm)/admin/(protected)/kit/screens-whatsapp.jsx
  → Thread list (left panel on desktop, full screen on mobile)
  → Chat view (right panel on desktop, nested route on mobile)
  → Compose bar with send button
  → Lead link badge (shows linked lead name, links to /admin/jobs/{leadId})
  → AI intelligence sidebar (warmth score, objections, follow-up date)
  → "Register number" button (opens team_numbers management)

public/sw.js
  → Service worker for Web Push
  → Handles "push" event: show notification with title + body
  → Handles "notificationclick": focus existing tab or open /admin/whatsapp
```

### Migration

```
db/migrations/001_whatsapp.sql
  → All 5 CREATE TABLE statements above
  → Run once against DATABASE_URL_UNPOOLED before deploying routes
```

---

## Modified Files

### `vercel.json`

Add three new cron entries to the existing file (which already has 3 entries for social content):

```json
{
  "crons": [
    { "path": "/api/cron/post",               "schedule": "*/15 * * * *" },
    { "path": "/api/cron/token-refresh",      "schedule": "0 9 * * *" },
    { "path": "/api/cron/blob-cleanup",       "schedule": "0 3 * * *" },
    { "path": "/api/cron/whatsapp-no-contact",         "schedule": "*/15 * * * *" },
    { "path": "/api/cron/whatsapp-ai",                 "schedule": "*/5 * * * *" },
    { "path": "/api/cron/whatsapp-morning-briefing",   "schedule": "0 5 * * *" }
  ]
}
```

Note: existing vercel.json already has 3 crons — this brings the total to 6. Pro plan limit is 40.

### `app/(crm)/admin/(protected)/kit/shell.jsx`

Two changes:

1. Add `"whatsapp"` route to `parsePath`:
```js
if (slug[0] === "whatsapp") return { name: "whatsapp", params: { threadKey: slug[1] || null } };
```

2. Add WhatsApp nav item to the `items` array in `BottomNav` and mcNav in `DesktopSidebar`:
```js
{ id: "whatsapp", label: "WhatsApp", href: "/admin/whatsapp", ic: <Icon.whatsapp /> }
```

Add unread count badge: thread list endpoint returns `unreadCount` total → drive the `ct` prop on the nav item.

### `app/(crm)/admin/(protected)/kit/app.jsx`

Add WhatsApp screen import and route branch:

```js
import WhatsAppScreen from "./screens-whatsapp";

// In the route switch:
if (route.name === "whatsapp") body = <WhatsAppScreen index={index} params={route.params} />;
```

### `app/(crm)/admin/(protected)/kit/icons.jsx`

Add a `whatsapp` icon entry (SVG path, follow existing pattern of other icons in this file).

### `app/(crm)/admin/(protected)/layout.jsx`

Register the service worker on mount. This is the protected layout wrapping all admin screens — the right place since push subscriptions are team-only:

```jsx
useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
  }
}, []);
```

### `next.config.mjs`

Add `@neondatabase/serverless` to `serverExternalPackages` if Vercel's bundler struggles with it (test in Phase 1 — may not be needed since it's pure JS with no WASM):

```js
serverExternalPackages: ['mediainfo.js', '@imgly/background-removal-node', 'onnxruntime-node']
// Add '@neondatabase/serverless' only if build fails without it
```

### Files Explicitly NOT Modified

```
lib/kv.js        — no new primitives needed; push subscriptions use existing kvGet/kvSet/kvZAdd/kvZRem
lib/leadStore.js — no changes; phone normalization is read via normalizePhone() import
lib/telegram.js  — no changes; Telegram keeps running in parallel to Web Push
```

---

## Build Order (dependency-respecting)

### Phase 1: Database Foundation

Everything else reads from Postgres. This must exist first.

1. Write `db/migrations/001_whatsapp.sql`
2. Run migration against Neon (using `DATABASE_URL_UNPOOLED`)
3. Create `lib/neon.js` (db() factory)
4. Create `lib/whatsappStore.js` (query functions)
5. Smoke-test: write a test route that does `SELECT 1` via `neon()` and returns the result

### Phase 2: Webhook Receiver

The webhook must be live before any messages can flow in. Requires Phase 1.

6. Create `lib/whatsappApi.js` (verifyWebhookSignature + sendMessage)
7. Create `app/api/whatsapp/webhook/route.js` (GET verification + POST handler)
8. Register webhook URL in Meta Developer Console
9. Verify: send a WhatsApp message to the business number, confirm it appears in `conversation_messages`

### Phase 3: Web Push

Push dispatch is called from the webhook handler (Phase 2 depends on it being ready, or the webhook can log-and-skip push until this phase is done).

10. Generate VAPID keys: `npx web-push generate-vapid-keys`
11. Create `lib/webPush.js`
12. Create `public/sw.js` (service worker)
13. Create `app/api/push/subscribe/route.js` + `app/api/push/unsubscribe/route.js`
14. Register service worker in `app/(crm)/admin/(protected)/layout.jsx`
15. Verify: subscribe a browser, send a test push from a scratch route

### Phase 4: CRM WhatsApp Tab

Requires Phase 1 (data exists) and Phase 2 (messages flowing in).

16. Create `app/api/admin/whatsapp/threads/route.js`
17. Create `app/api/admin/whatsapp/threads/[threadKey]/messages/route.js`
18. Create `app/api/admin/whatsapp/send/route.js`
19. Create `app/api/admin/whatsapp/numbers/route.js` + `[id]/route.js`
20. Create `app/(crm)/admin/(protected)/kit/screens-whatsapp.jsx`
21. Modify `shell.jsx` (parsePath + nav items) and `app.jsx` (import + route branch) and `icons.jsx`

### Phase 5: AI Intelligence

Requires Phase 1 (data to analyse) and ideally Phase 4 (visible in CRM).

22. Create `app/api/cron/whatsapp-ai/route.js`
23. Create `app/api/admin/whatsapp/intelligence/[threadKey]/route.js`
24. Add intelligence panel to `screens-whatsapp.jsx`
25. Add `whatsapp-ai` cron to `vercel.json`

### Phase 6: Automated Outbound (Crons)

Requires Phase 2 (can send messages) and Phase 4 (CRM data context).

26. Create `app/api/cron/whatsapp-no-contact/route.js`
27. Create `app/api/cron/whatsapp-morning-briefing/route.js`
28. Add both to `vercel.json`
29. Add aftercare scheduling logic (writes to `aftercare_events`, no separate cron needed — `whatsapp-no-contact` can also check aftercare_events)

### Phase 7: Broadcast Campaigns

Requires Phases 2 + 4 + a UI to create campaigns.

30. Add `app/api/admin/whatsapp/broadcasts/route.js` + `[id]/route.js`
31. Add broadcast UI section to `screens-whatsapp.jsx`

---

## Serverless Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Webhook must return 200 in <20s | Meta retries on timeout, causing duplicate events | Return 200 immediately after signature check; do all DB writes + push dispatch inline but non-blocking. Use `wamid` UNIQUE constraint for dedup (ON CONFLICT DO NOTHING) |
| No persistent TCP | Neon connection setup cost on every invocation | `@neondatabase/serverless` HTTP transport: 3-4 roundtrips vs 8 for TCP. Use pooled connection string |
| Cron max duration | AI analysis cron processes potentially many messages | Set `export const maxDuration = 60` on AI cron. Limit batch size to 20 messages per invocation; KV queue handles the rest on next run |
| Web push `web-push` package | Uses Node.js `crypto` module — not available in Edge runtime | Set `export const runtime = "nodejs"` on the webhook route and any route that calls `dispatchPush` |
| Service worker scope | `/sw.js` must be served from root to cover `/admin/*` | Place in `public/sw.js` — Next.js serves `public/` at `/` automatically |
| VAPID private key is a secret | Must never be in client code | `VAPID_PRIVATE_KEY` env var (server-only). `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for the browser subscription call |
| Vercel function cold starts | First request after idle takes ~500-800ms | Neon HTTP transport is more tolerant of cold starts than TCP. Webhook handler is always hot (Meta sends messages constantly) |
| Cron only runs on production | Development testing requires local tunnel | Use `ngrok` or Vercel CLI `--prod` flag for webhook registration during development |

---

## Environment Variables Required

```bash
# Neon Postgres
DATABASE_URL=                    # Pooled connection string (runtime queries)
DATABASE_URL_UNPOOLED=           # Direct connection string (migrations only)

# Meta WhatsApp Cloud API
WHATSAPP_APP_SECRET=             # App secret from Meta Developer Console (for HMAC verification)
WHATSAPP_VERIFY_TOKEN=           # Your chosen token string for webhook GET verification
WHATSAPP_PHONE_NUMBER_ID=        # Phone number ID from Meta (for sending messages)
WHATSAPP_ACCESS_TOKEN=           # System user access token from Meta

# Web Push VAPID
VAPID_PRIVATE_KEY=               # Server-only
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # Browser-accessible (safe to expose)
VAPID_SUBJECT=                   # "mailto:your@email.com"

# Auto-injected by Vercel (do not set manually)
CRON_SECRET
```

Existing env vars (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `TELEGRAM_*`, `ADMIN_SESSION_SECRET`) are unchanged.

---

## Sources

- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver) — HIGH confidence, official Neon docs
- [Neon Vercel connection methods](https://neon.com/docs/guides/vercel-connection-methods) — HIGH confidence, official Neon docs
- [web-push npm package](https://www.npmjs.com/package/web-push) — HIGH confidence, official npm
- [Meta WhatsApp webhook verification](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/) — HIGH confidence, official Meta docs
- [Next.js PWA/Service Worker guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — HIGH confidence, official Next.js docs (updated Feb 2026)
- [Vercel cron limits and CRON_SECRET](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — HIGH confidence, official Vercel docs
- Existing codebase: `lib/kv.js`, `lib/adminAuth.js`, `lib/leadStore.js`, `lib/telegram.js`, `app/(crm)/admin/(protected)/kit/app.jsx`, `shell.jsx`, `useCrmKitData.jsx` — HIGH confidence, read directly
