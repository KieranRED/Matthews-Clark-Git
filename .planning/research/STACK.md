# Technology Stack — v1.2 WhatsApp Business Integration

**Project:** Matthews & Clark CRM
**Milestone:** v1.2 WhatsApp Business Integration
**Researched:** 2026-06-22
**Scope:** NEW packages only. Existing stack (Next.js 15, Upstash KV, Vercel Blob, Telegram) not re-researched.

---

## Summary

Four new capability areas require packages. Three are clean additions with a single obvious package each. One (Web Push) has a maintenance caveat that does not affect functionality. No ORM is recommended — raw SQL via the Neon serverless driver is sufficient and keeps the bundle lean. The Meta Cloud API requires zero npm packages beyond Node's built-in `crypto`.

**Confidence:** HIGH for all four areas. Versions verified against npm registry and official documentation (June 2026).

---

## Recommended Stack Additions

### 1. Meta WhatsApp Business Cloud API

**Package:** None required.

Use the Graph API directly via `fetch`. No npm SDK needed.

| Item | Value | Source |
|------|-------|--------|
| API base URL | `https://graph.facebook.com/v25.0` | Graph API changelog (introduced 2026-02-18) |
| Send endpoint | `POST /{PHONE_NUMBER_ID}/messages` | Meta Developers docs |
| Webhook verification | `GET` handler, echo `hub.challenge` | Meta webhook handshake spec |
| Signature verification | `node:crypto` `createHmac('sha256', APP_SECRET)` on raw body | pons.chat implementation guide |
| Webhook header | `x-hub-signature-256` | Meta docs |

**Why no SDK:**
- Official Meta Node.js SDK (`whatsapp-nodejs-sdk`) is designed for single-process servers, not serverless/multi-instance deployments. Its own docs warn against it.
- The third-party `@great-detail/whatsapp` SDK adds abstraction over a simple REST API that needs no abstraction.
- The webhook POST body must be read as raw text before any parsing — something you control directly when using `fetch` + `req.text()`.

**Environment variables needed:**
```
WHATSAPP_PHONE_NUMBER_ID=      # from Meta App dashboard
WHATSAPP_ACCESS_TOKEN=         # permanent system user token
WHATSAPP_APP_SECRET=           # for HMAC verification (App Settings > Basic)
WHATSAPP_VERIFY_TOKEN=         # any string you choose, set in Meta webhook config
```

**Webhook route skeleton (no packages):**
```js
// app/api/webhooks/whatsapp/route.js
import { createHmac, timingSafeEqual } from 'node:crypto'

export async function GET(req) {
  const p = req.nextUrl.searchParams
  if (
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(p.get('hub.challenge'))
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req) {
  const raw = await req.text()
  const sig = req.headers.get('x-hub-signature-256') ?? ''
  const expected =
    'sha256=' +
    createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(raw).digest('hex')
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return new Response('Unauthorized', { status: 401 })
  }
  const body = JSON.parse(raw)
  // body.entry[].changes[].value.messages / .statuses
  return Response.json({ ok: true })
}
```

**Send message helper (no packages):**
```js
// lib/whatsapp.js
export async function sendWhatsAppMessage(to, text) {
  const res = await fetch(
    `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  )
  return res.json()
}
```

**Confidence:** HIGH — verified against Meta Developers docs and pons.chat implementation guide.

---

### 2. Neon Postgres — Conversation Storage

**Package:** `@neondatabase/serverless@^1.1.0`

| Item | Value |
|------|-------|
| npm package | `@neondatabase/serverless` |
| Version | `1.1.0` (latest as of June 2026) |
| Weekly downloads | ~554k (healthy adoption) |
| Transport | HTTP (single queries) + WebSocket (transactions) |
| Edge runtime | Yes — works in Vercel Edge and serverless functions |
| ORM | None recommended (see below) |

**Why this package over alternatives:**
- `pg` (node-postgres) uses TCP — blocked in Vercel serverless/edge runtimes.
- `postgres.js` similarly requires persistent TCP connections.
- `@neondatabase/serverless` communicates over HTTP for single queries, WebSocket for transactions. It is the only driver that works correctly in Vercel's serverless execution model, which is already used by the rest of this project.

**Why no ORM (Drizzle/Prisma):**
- The WhatsApp conversation schema is narrow and stable: messages, threads, push_subscriptions. Raw SQL is readable, transparent, and debuggable.
- The existing project uses raw KV operations throughout — an ORM introduces an unfamiliar abstraction to a solo/small team workflow.
- For migrations, a single `lib/neon-migrate.js` script with `CREATE TABLE IF NOT EXISTS` statements run once is sufficient. No CLI needed.
- Prisma is categorically excluded — its binary engine adds ~10MB to cold start and is incompatible with the project's serverless posture.

**Installation:**
```bash
npm install @neondatabase/serverless
```

**Usage pattern:**
```js
// lib/db.js
import { neon } from '@neondatabase/serverless'
export const sql = neon(process.env.DATABASE_URL)

// In any Server Component or Route Handler:
const messages = await sql`
  SELECT * FROM whatsapp_messages
  WHERE thread_id = ${threadId}
  ORDER BY created_at ASC
`
```

**Connection string format:**
```
DATABASE_URL=postgresql://user:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Environment variables needed:**
```
DATABASE_URL=   # from Neon dashboard (Vercel Marketplace integration auto-populates this)
```

**Note on `force-dynamic`:** Server Components that query Neon will be statically rendered at build time unless you add `export const dynamic = 'force-dynamic'` — required for any route that shows live conversation data.

**Confidence:** HIGH — verified against Neon official docs and npm registry.

---

### 3. Web Push Notifications (VAPID)

**Package:** `web-push@^3.6.7`

| Item | Value |
|------|-------|
| npm package | `web-push` |
| Version | `3.6.7` (latest — last published ~2 years ago) |
| Type definitions | bundled (no separate `@types/web-push` needed on modern versions) |
| Official Next.js endorsement | Yes — used verbatim in Next.js PWA guide (updated 2026-02-11) |

**Maintenance caveat:** `web-push@3.6.7` has not been updated in ~2 years. This is a concern on paper. In practice:
- The VAPID spec (RFC 8292) and Web Push Protocol (RFC 8030) are stable and not changing.
- Next.js official docs (updated February 2026) use `web-push` without qualification or alternative.
- 433+ downstream npm packages depend on it; it is the de-facto standard Node.js VAPID implementation.
- **Verdict: use it.** The maintenance freeze reflects spec stability, not abandonment.

**Why not a managed push service (OneSignal, Webpushr, etc.):**
- This is an internal team alert system for 2-5 people. A managed service adds a third-party dependency, a monthly cost, and a data residency question (WhatsApp conversation metadata leaving the system).
- Web Push is a browser standard; the entire stack fits in ~30 lines of server code.

**Installation:**
```bash
npm install web-push
```

**VAPID key generation (one-time, dev setup):**
```bash
npx web-push generate-vapid-keys
```

**Environment variables needed:**
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # exposed to client (safe — it's a public key)
VAPID_PRIVATE_KEY=              # server-side only
VAPID_SUBJECT=mailto:team@matthewsandclark.co.za
```

**Server-side send (in a Server Action or Route Handler):**
```js
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

await webpush.sendNotification(
  subscription, // PushSubscription object stored in Neon push_subscriptions table
  JSON.stringify({ title: 'New WhatsApp message', body: preview })
)
```

**Service worker (`public/sw.js`):**
```js
self.addEventListener('push', (event) => {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge.png',
    })
  )
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/admin'))
})
```

**Push subscriptions storage:** Store `PushSubscription` JSON objects in the Neon `push_subscriptions` table (keyed by team member ID). Each team member's browser registers once; the subscription is updated on each service worker re-registration.

**Browser support (2026):** Chrome, Firefox, Edge (all platforms), Safari 16.4+ on macOS/iOS when installed to home screen. This covers the M&C team's devices.

**Confidence:** HIGH — verified against Next.js PWA official docs (fetched 2026-06-22), npm registry, and web-push GitHub releases.

---

### 4. Claude API — AI Message Analysis

**Package:** `@anthropic-ai/sdk@^0.104.2`

| Item | Value |
|------|-------|
| npm package | `@anthropic-ai/sdk` |
| Version | `0.104.2` (latest as of June 2026, published ~3 days before research date) |
| Model | `claude-sonnet-4-6` (same model running this project) |
| Pricing (Sonnet 4.6) | $3 / MTok input, $15 / MTok output |
| Batch API discount | 50% off — $1.50 / MTok input, $7.50 / MTok output |
| Prompt cache discount | Up to 90% off on repeated system prompts |
| Context window | 1M tokens |
| Max output | 64k tokens |

**Why `claude-sonnet-4-6` and not a cheaper model:**
- Haiku 4.5 is faster/cheaper but warmth scoring and objection detection require nuanced reading of conversational South African English. Inference quality matters here.
- Opus 4.8 is overkill for classification/scoring tasks and costs 5x more per token.
- Sonnet 4.6 is the documented sweet spot for "best combination of speed and intelligence."
- Using the same model that runs this project avoids introducing a new model to reason about.

**Two usage modes for this milestone:**

**A. Streaming — for real-time analysis when a team member opens a thread:**
```js
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()

const stream = await client.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 512,
  system: [
    {
      type: 'text',
      text: ANALYSIS_SYSTEM_PROMPT, // cache the repeated system prompt
      cache_control: { type: 'ephemeral' },
    },
  ],
  messages: [{ role: 'user', content: conversationText }],
})
// Pipe stream to client via ReadableStream / Server-Sent Events
```

**B. Batch API — for background analysis of overnight or historical messages:**
```js
const batch = await client.beta.messages.batches.create({
  requests: messageGroups.map((g) => ({
    custom_id: `thread-${g.threadId}`,
    params: {
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: g.text }],
    },
  })),
})
// Most batches finish in < 1 hour; poll batch.id for completion status
```

**Prompt caching for repeated system prompts:**
With prompt caching on the shared analysis system prompt (~500 tokens), repeated calls cost ~10% of the base input token price for the cached portion. At scale this is the most meaningful cost lever.

**What the analysis system prompt should cover (for roadmap phases):**
- Warmth scoring (1-5 scale)
- Objection type detection (price, timing, partner approval, competitor)
- Suggested CRM status update (WARM, HOT, COLD, LOST, BOOKED)
- Follow-up timing recommendation

**Environment variables needed:**
```
ANTHROPIC_API_KEY=   # from console.anthropic.com
```

**Confidence:** HIGH — model IDs verified against Anthropic official docs (fetched 2026-06-22). SDK version from npm search (published June 2026).

---

## Complete Installation

```bash
# New packages for v1.2 (add to existing project)
npm install @neondatabase/serverless web-push @anthropic-ai/sdk
```

No new packages for Meta Cloud API — uses `node:crypto` (built-in) and `fetch` (built-in in Next.js 15 / Node 18+).

**Schema migrations for Neon:** Skip drizzle-kit. Write a `lib/neon-migrate.js` script with `CREATE TABLE IF NOT EXISTS` statements and run it once. The schema is small enough that a CLI is unnecessary overhead.

---

## Integration Notes

### Fits cleanly into existing patterns

| New capability | Integration point |
|----------------|-------------------|
| WhatsApp webhook | `app/api/webhooks/whatsapp/route.js` — same pattern as existing `app/api/lead/route.js` |
| Neon queries | `lib/db.js` — same import-and-call pattern as existing `lib/kv.js` |
| Web Push send | Called from same webhook handler that already fires Telegram notifications |
| Claude analysis | Called from `app/api/admin/` route handlers — same auth pattern as existing admin routes |

### Dual-notification pattern

The existing Telegram notification system should NOT be replaced. The recommended pattern:

```
Inbound WhatsApp message
  → store in Neon (primary record)
  → fire Telegram notification (existing pattern — immediate, reliable)
  → fire Web Push to subscribed team members (new — for phone home screen alerts)
  → queue Claude analysis async (warmth score appears when admin opens thread)
```

### Meta mTLS CA change (important)

Meta rotated its Certificate Authority for webhook mTLS on 2026-03-31. Vercel's Node runtime uses the system trust store, which was updated. No action required for new setups — but verify webhook delivery is working after initial configuration, especially if any existing webhook infra predates April 2026.

### Push subscription storage location

Store `PushSubscription` JSON in the Neon `push_subscriptions` table. This is preferred over Upstash KV for this data because:
- It is relational to team member records
- Full-text search and join queries against conversation data may reference it
- Keeps WhatsApp-related data co-located in one store

---

## What NOT To Add

| Package / Service | Reason to exclude |
|-------------------|-------------------|
| `whatsapp-nodejs-sdk` (official Meta SDK) | Designed for single-process servers; Meta docs warn it is "not intended for multi-instance environments" — breaks on Vercel serverless |
| `@great-detail/whatsapp` | Wraps a REST API that needs no wrapping; adds a dependency for zero benefit |
| `prisma` / `@prisma/client` | Binary engine adds ~10MB, breaks cold start budget, incompatible with edge runtime |
| `drizzle-orm` + `drizzle-kit` | Beneficial at scale; overkill for a 3-table conversation schema on a small team already comfortable with SQL |
| `socket.io` / `pusher` | Real-time chat in the admin UI can use SWR polling or SSE. Adding a WebSocket server on Vercel serverless is either impossible or requires paid add-ons |
| `next-pwa` / `serwist` | Full offline PWA is not needed. The CRM admin is always-online. These add webpack config complexity for unused offline caching |
| `ai` (Vercel AI SDK) | Adds the full Vercel AI SDK as a peer dependency for a task that is two `@anthropic-ai/sdk` calls — unnecessary abstraction layer |
| `@ai-sdk/anthropic` | Same reason as above |
| Any third-party WhatsApp BSP | The project explicitly uses direct Cloud API (no BSP) to avoid per-message BSP fees and data routing through third parties |
| Any push notification SaaS (OneSignal, Webpushr) | This is a 2-5 person internal tool. Managed services add recurring cost and external data dependencies |

---

## Open Questions

1. **Graph API version pinning:** v25.0 is current (introduced 2026-02-18). Meta depreciates Graph API versions on a rolling 2-year cycle. Pin the version string in `lib/whatsapp.js` as a named constant rather than hardcoding in every URL — makes future upgrades a one-line change.

2. **Conversation schema design:** Not researched here — left for phase-specific research. Key questions: how to efficiently query "all threads for a phone number" and "all messages in a thread sorted by time" with full-text search on message body. Neon supports `pg_trgm` and `tsvector` for full-text search natively.

3. **Claude analysis trigger timing:** On every inbound message (adds latency and cost) vs. on thread open (cheaper, slightly stale) vs. batch overnight. Recommended default: trigger on thread open (streaming) + nightly batch for all active threads. Defer the per-message trigger to a later phase when usage patterns are understood.

4. **`@anthropic-ai/sdk` version stability:** The SDK is at `0.104.2` and publishing frequently. Pin to a minor version range (`^0.104.0`) rather than exact to allow patch updates without manual intervention.

5. **iOS Web Push:** Safari 16.4+ on iOS supports Web Push only when the PWA is installed to the home screen (added to Home Screen). Team members need to install the admin PWA once. This is a UX setup step, not a code limitation.

---

## Sources

- [Meta Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog/) — v25.0 introduced 2026-02-18
- [WhatsApp Cloud API webhook implementation (pons.chat)](https://pons.chat/blog/whatsapp-cloud-api-webhook-nextjs) — GET/POST handler patterns verified
- [Meta: Messages endpoint reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/) — send message API
- [Neon Next.js guide (official)](https://neon.com/docs/guides/nextjs) — driver selection and serverless query pattern
- [@neondatabase/serverless npm](https://www.npmjs.com/package/@neondatabase/serverless) — v1.1.0, ~554k weekly downloads
- [Next.js PWA guide (official, updated 2026-02-11)](https://nextjs.org/docs/app/guides/progressive-web-apps) — web-push endorsement in official docs
- [web-push npm](https://www.npmjs.com/package/web-push) — v3.6.7
- [Anthropic models overview (official)](https://platform.claude.com/docs/en/about-claude/models/overview) — claude-sonnet-4-6 model ID, pricing, context window confirmed (fetched 2026-06-22)
- [Anthropic batch processing docs (official)](https://platform.claude.com/docs/en/build-with-claude/batch-processing) — 50% cost reduction, less than 1hr completion
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) — v0.104.2 (published June 2026)
