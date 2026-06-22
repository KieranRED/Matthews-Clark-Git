# Phase 09: Webhook Foundation - Research

**Researched:** 2026-06-22
**Domain:** Meta WhatsApp Cloud API webhooks + Neon Postgres (serverless) + Next.js App Router
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Neon Schema Design**
- Primary key: UUID for `whatsapp_messages` (matches Meta `wamid` format, globally unique)
- Denormalize `last_message_at` and `unread_count` onto `whatsapp_threads` to avoid expensive aggregates
- Single migration file `001-schema.sql` — simple, no ORM
- `crm_lead_id` nullable FK on `whatsapp_threads` — threads can exist unlinked, then get linked later

**Webhook Receiver Pattern**
- KV job queue (`whatsapp:job:{id}`) for async work after returning 200 — uses existing KV infrastructure
- HMAC fail → 403 with `{ error: "invalid signature" }`
- Single route at `app/api/webhooks/whatsapp/route.js`: GET handles `hub.mode=subscribe` verification, POST handles message events
- Duplicate guard: check `message_id` uniqueness before insert AND rely on DB unique constraint

**Lead Auto-Linking & WABA Setup**
- Store messages even when no CRM lead matches (`crm_lead_id = null`)
- Phone normalisation handles all 3 forms: `+27821234567` → strip `+`; `0821234567` → `27821234567`; `27821234567` → unchanged
- WABA subscription activation: one-time `POST /api/admin/setup/waba-subscribe` endpoint with env guard
- All runtime queries use the pooler connection string (`-pooler.neon.tech`); migration script comment documents the direct connection requirement

**Env vars needed:** `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`

### Claude's Discretion
- Exact Neon table column names and indexes beyond the above
- Error logging format (console.error is fine for V1)
- KV job schema (what fields to include in the queued job)

### Deferred Ideas (OUT OF SCOPE)
- AI job queue trigger from webhook (Phase 13)
- Push dispatch from webhook (Phase 10)
- Broadcast campaign tables (Phase 15) — BUT create them in the schema now per FOUND-07
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | System receives and stores all inbound WhatsApp messages via Meta Cloud API webhook, verifying HMAC signature before processing | HMAC verification pattern documented below; payload structure fully mapped |
| FOUND-02 | System receives and stores all outbound WhatsApp messages sent by team members via the CRM chat UI | Out of scope for Phase 09 (outbound send route is Phase 11); schema must accommodate `direction` column |
| FOUND-03 | Webhook returns HTTP 200 immediately and defers all processing asynchronously to avoid Meta retries | `after()` from `next/server` is the correct Next.js 15.1+ pattern; KV queue as fallback documented |
| FOUND-04 | System normalises all phone numbers to E.164 format (`27XXXXXXXXX`) at write time | `normalizePhone()` in `lib/leadStore.js` covers 0X→27X; research confirms `+27` case requires `replace(/[^\d]/g,'')` which already strips `+`; verified gap identified |
| FOUND-05 | System automatically links a WhatsApp conversation to a CRM lead by matching normalised phone number | `clientByPhone:{normalizedPhone}` KV index exists in `lib/leadStore.js:getClientIdByPhoneNorm()` — use directly |
| FOUND-06 | System explicitly calls `POST /{WABA_ID}/subscribed_apps` after webhook configuration | Exact Graph API call documented; required permissions `whatsapp_business_management` + `whatsapp_business_messaging`; returns `{"success": true}` |
| FOUND-07 | Neon Postgres schema created with all 7 tables | All table definitions below; CONTEXT.md mandates creating all tables in Phase 09 even if not all are used until later phases |
</phase_requirements>

---

## Summary

Phase 09 wires Meta's Cloud API webhooks into Neon Postgres and links inbound conversations to existing CRM leads. The work is entirely server-side: no UI, no outbound messaging, no AI or push dispatch (those are later phases). The entire phase delivers one end-to-end flow: Meta sends a WhatsApp message → webhook verifies HMAC → stores in Neon → auto-links to CRM lead by phone → returns 200 within 500ms.

All key architectural decisions are locked in CONTEXT.md. The research confirms those decisions are sound and fills in the implementation-level details the planner needs: exact payload structure, exact HMAC verification code, exact Neon driver pattern, exact WABA subscription call, and the `normalizePhone()` gap with `+27` prefix handling.

The biggest implementation-level surprise: Next.js 15.1+ ships `after()` from `next/server` which is purpose-built for "return 200 fast, do async work later" — this is cleaner than the KV-queue-only pattern and should be used as the primary async mechanism, with the KV queue as the durable job record.

**Primary recommendation:** Use `after()` from `next/server` to schedule the Neon write + KV job enqueue after the 200 response is sent. The KV job (`whatsapp:job:{id}`) is the durable record; `after()` is the execution vehicle.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@neondatabase/serverless` | `^1.1.0` | Postgres over HTTP from Vercel serverless | Only Postgres driver that works without TCP in Vercel Node.js functions; verified as `latest` on npm |
| `node:crypto` (built-in) | Node.js built-in | HMAC-SHA256 verification | No package needed; `crypto.createHmac` + `crypto.timingSafeEqual` |
| `after` from `next/server` | Stable in Next.js 15.1 | Run async work after response sent | Purpose-built for "return 200 fast" webhook pattern; no extra package |

### Supporting (already in repo, reused)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `lib/kv.js` | KV job queue writes | Writing `whatsapp:job:{id}` after message arrival |
| `lib/leadStore.js:normalizePhone()` | Phone normalisation | Call for all incoming `from` fields |
| `lib/leadStore.js:getClientIdByPhoneNorm()` (internal) | Phone → clientId lookup | Called via KV pattern in auto-link logic |

### Not Needed (confirmed)

| Item | Reason |
|------|--------|
| Meta SDK / WhatsApp npm packages | Zero npm packages — plain `fetch` + `node:crypto` per locked decision |
| Prisma / Drizzle | Overkill for this schema; raw SQL via `neon()` |
| `web-push` | Phase 10 only |
| `@anthropic-ai/sdk` | Phase 13 only |

**Installation (only one new package for Phase 09):**
```bash
npm install @neondatabase/serverless
```

**Version verified:**
```
@neondatabase/serverless@1.1.0  — confirmed latest via npm registry 2026-06-22
```

---

## Architecture Patterns

### Recommended File Structure

```
lib/
├── neon.js                          # db() factory — returns neon(DATABASE_URL)
├── whatsappStore.js                 # all Neon read/write ops (thin route handlers call this)
├── leadStore.js                     # unchanged — normalizePhone() reused from here
└── kv.js                            # unchanged — kvSet/kvGet for job queue

app/api/
├── webhooks/
│   └── whatsapp/
│       └── route.js                 # GET (hub.challenge) + POST (message handler)
└── admin/
    └── setup/
        └── waba-subscribe/
            └── route.js             # one-time WABA subscription activation

db/
└── migrations/
    └── 001-schema.sql               # all 7 tables, run once against DATABASE_URL_UNPOOLED
```

### Pattern 1: Neon Client Factory

Use `neon()` HTTP transport (not `Pool`/`Client`). Create the `sql` tag inside each function — not at module level. The function is lightweight; there is no socket or connection to warm up.

```js
// lib/neon.js
import { neon } from "@neondatabase/serverless";

export function db() {
  return neon(process.env.DATABASE_URL);
}
```

Call it per-function:
```js
import { db } from "@/lib/neon";

export async function insertMessage(msg) {
  const sql = db();
  await sql`
    INSERT INTO whatsapp_messages (id, wamid, thread_id, direction, from_wa_id, to_wa_id, message_type, body, timestamp_ms)
    VALUES (gen_random_uuid(), ${msg.wamid}, ${msg.threadId}, 'inbound', ${msg.from}, ${msg.to}, ${msg.type}, ${msg.body}, ${msg.timestampMs})
    ON CONFLICT (wamid) DO NOTHING
  `;
}
```

**Why not module-level singleton:** Serverless functions are stateless invocations. The `neon()` function does not open a persistent connection — it's just a tagged-template function that fires HTTPS requests. Creating it per-call is correct and adds negligible overhead.

**Pooler vs direct:** Always use `DATABASE_URL` (pooled, `-pooler.neon.tech`). Only use `DATABASE_URL_UNPOOLED` for running the migration script via psql/node CLI.

### Pattern 2: Webhook Handler — Return 200 First, Async Work After

`after()` from `next/server` is stable in Next.js 15.1. The project uses Next.js `^15.0.0` — confirm exact version is 15.1+. If not yet on 15.1, the fallback pattern is fire-and-forget Promise (no await, logged on error).

```js
// app/api/webhooks/whatsapp/route.js
import { after } from "next/server";
import crypto from "node:crypto";
import { processInboundMessage } from "@/lib/whatsappStore";
import { kvSet } from "@/lib/kv";

export const runtime = "nodejs"; // required — crypto.createHmac not in Edge

export async function POST(request) {
  // 1. Read raw body BEFORE any JSON parsing
  const rawBody = await request.text();

  // 2. Verify HMAC signature
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: "invalid signature" }, { status: 403 });
  }

  // 3. Return 200 immediately
  // 4. Do all real work after the response is sent
  after(async () => {
    try {
      const payload = JSON.parse(rawBody);
      await handlePayload(payload);
    } catch (err) {
      console.error("[webhook][whatsapp][after-error]", err);
    }
  });

  return Response.json({ ok: true });
}

function verifySignature(rawBody, signature) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false; // length mismatch → not equal
  }
}
```

### Pattern 3: GET Hub Challenge Verification

```js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return Response.json({ error: "forbidden" }, { status: 403 });
}
```

### Pattern 4: Payload Parsing — Full Structure

Meta delivers a nested structure. A single POST can contain multiple entries, each with multiple changes. Always loop — never assume one message per delivery.

```js
async function handlePayload(payload) {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;

      // Inbound messages
      for (const msg of value?.messages ?? []) {
        await handleInboundMessage(msg, phoneNumberId, value.contacts ?? []);
      }

      // Status updates (delivery receipts — log only in Phase 09)
      for (const status of value?.statuses ?? []) {
        console.log("[webhook][status]", status.id, status.status);
      }
    }
  }
}
```

### Pattern 5: WABA Subscription — One-Time Setup Endpoint

```js
// app/api/admin/setup/waba-subscribe/route.js
import { verifyAdminSession } from "@/lib/adminAuth";

export async function POST(request) {
  await verifyAdminSession(request);

  const wabaId = process.env.WHATSAPP_WABA_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!wabaId || !token) {
    return Response.json({ error: "WHATSAPP_WABA_ID or WHATSAPP_ACCESS_TOKEN not set" }, { status: 400 });
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  // Verify subscription is active
  const check = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const checkData = await check.json();

  return Response.json({ subscribe: data, verify: checkData });
}
```

**Required access token permissions:** `whatsapp_business_management` + `whatsapp_business_messaging`. Use the System User permanent token — not the 24-hour developer token.

### Anti-Patterns to Avoid

- **`request.json()` before signature check:** Consumes the body stream. HMAC will fail or be unverifiable. Always `request.text()` first.
- **Module-level `neon()` singleton:** Not wrong, but unnecessary. Per-function creation is fine and avoids subtle state issues across hot module reloads in dev.
- **Assuming one message per webhook POST:** Meta can batch multiple events. Always iterate `entry[].changes[].value.messages[]`.
- **Blocking `await` in webhook critical path:** Any `await` before `return Response.json()` adds latency toward the 5-second Meta deadline. Signature check + JSON parse is fast; Neon writes are not.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Phone normalisation | Custom `normalizePhone()` | `lib/leadStore.js:normalizePhone()` | Already handles 0X→27X; strip non-digits handles +27; tested in production |
| Phone → clientId lookup | Custom KV lookup | `kvGet('clientByPhone:${phoneNorm}')` | Index already populated on every lead save; exact key format confirmed in source |
| Timing-safe comparison | Manual string compare | `crypto.timingSafeEqual()` | Prevents timing attacks; required by security standard |
| DB idempotency | SELECT-then-INSERT | `INSERT ... ON CONFLICT (wamid) DO NOTHING` | Atomic; handles Meta's at-least-once delivery; no race condition |
| Async-after-response | Promise chains / background fetch | `after()` from `next/server` | Purpose-built; extends Vercel function lifetime; no extra package |

**Key insight:** The existing `lib/leadStore.js` already handles two of the hardest problems (phone normalisation and the clientByPhone index). Phase 09 should import from it, not duplicate it.

---

## Meta Webhook Payload Reference

### Inbound Text Message (complete verified structure)

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "102290129340398",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "27821234567",
          "phone_number_id": "106540352242922"
        },
        "contacts": [{
          "profile": { "name": "Sheena Nelson" },
          "wa_id": "27821234567"
        }],
        "messages": [{
          "from": "27821234567",
          "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQzQTRBNjU5OUFFRTAzODEwMTQ0RgA=",
          "timestamp": "1749416383",
          "type": "text",
          "text": { "body": "Does it come in another color?" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

### Status Update Event (delivery receipt)

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "102290129340398",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
        "statuses": [{
          "id": "wamid.HBgLMTY1MDM4Nzk0MzkVAgA=",
          "status": "delivered",
          "timestamp": "1749416400",
          "recipient_id": "27821234567",
          "conversation": { "id": "abc123", "origin": { "type": "service" } },
          "pricing": { "billable": true, "pricing_model": "CBP", "category": "service" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Key fields for Phase 09:**
- `entry[].changes[].value.messages[].from` — sender's WhatsApp ID (normalise with `normalizePhone()`)
- `entry[].changes[].value.messages[].id` — wamid, the deduplication key
- `entry[].changes[].value.messages[].type` — `"text"`, `"image"`, `"audio"`, `"document"`, `"video"`, `"sticker"`, `"location"`, `"interactive"`, `"reaction"`, `"order"`, `"system"`
- `entry[].changes[].value.messages[].text.body` — plain text body (only for `type === "text"`)
- `entry[].changes[].value.metadata.phone_number_id` — identifies which team number received it
- `entry[].changes[].value.statuses` — delivery receipts; check for this key to distinguish from messages

---

## HMAC-SHA256 Verification — Exact Implementation

**Header:** `x-hub-signature-256` (lowercase in Next.js `request.headers.get()`)
**Format:** `sha256=<hex_digest>`
**Signed content:** Raw request body as UTF-8 string (before any JSON parsing)
**Secret:** `WHATSAPP_APP_SECRET` — the App Secret from Meta Developer Console (not the access token)
**Algorithm:** `crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")`
**Comparison:** `crypto.timingSafeEqual()` — mandatory for constant-time comparison

**Critical caveat:** Meta uses escaped Unicode encoding for special characters when generating the signature. The raw body must be used verbatim — do not re-serialize the parsed JSON for signature verification.

**The correct sequence in the route handler:**
1. `const rawBody = await request.text()` — consume body as string
2. Compute HMAC and compare with `timingSafeEqual`
3. If mismatch: `return Response.json({ error: "invalid signature" }, { status: 403 })`
4. Call `after()` to schedule async processing
5. `return Response.json({ ok: true })` — 200 sent immediately
6. Inside `after()`: `const payload = JSON.parse(rawBody)` — parse now

---

## Neon Schema — All 7 Tables (FOUND-07)

CONTEXT.md specifies creating all 7 tables in Phase 09. Table names per CONTEXT.md are: `whatsapp_messages`, `whatsapp_threads`, `team_numbers`, `push_subscriptions`, `lead_intelligence`, `aftercare_events`, `broadcast_campaigns`.

The ARCHITECTURE.md research from milestone planning used different table names (`conversation_messages` etc.). The CONTEXT.md names (decided by the user) take precedence — these are the locked names.

```sql
-- db/migrations/001-schema.sql
-- Run against DATABASE_URL_UNPOOLED (direct connection — DDL requires session-level access)
-- After running: use DATABASE_URL (pooler) for all runtime queries

-- Team WhatsApp numbers (eSIM numbers registered with Meta)
CREATE TABLE IF NOT EXISTS team_numbers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id         TEXT UNIQUE NOT NULL,   -- "27821234567"
  phone_number_id TEXT UNIQUE NOT NULL, -- Meta Phone Number ID for API calls
  display_name  TEXT NOT NULL,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- One thread per unique sender <> team number pair
CREATE TABLE IF NOT EXISTS whatsapp_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_wa_id   TEXT NOT NULL,              -- normalised sender phone: 27XXXXXXXXX
  team_wa_id      TEXT NOT NULL,              -- team number that received/will send
  crm_lead_id     TEXT,                       -- nullable FK: KV lead ID (linked on match)
  crm_client_id   TEXT,                       -- nullable FK: KV client ID
  contact_name    TEXT,                       -- from Meta contacts[].profile.name
  last_message_at TIMESTAMPTZ,               -- denormalised for thread list sorting
  last_message_preview TEXT,                 -- denormalised for thread list display
  unread_count    INT DEFAULT 0,             -- denormalised — avoids COUNT(*) on list render
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_wa_id, team_wa_id)
);

CREATE INDEX ON whatsapp_threads (last_message_at DESC);
CREATE INDEX ON whatsapp_threads (crm_lead_id) WHERE crm_lead_id IS NOT NULL;

-- Every inbound and outbound message
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wamid           TEXT UNIQUE NOT NULL,       -- Meta message ID, dedup key
  thread_id       UUID NOT NULL REFERENCES whatsapp_threads(id),
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_wa_id      TEXT NOT NULL,
  to_wa_id        TEXT NOT NULL,
  message_type    TEXT NOT NULL,              -- text, image, audio, document, video, sticker, etc.
  body            TEXT,                       -- null for non-text types in Phase 09
  media_url       TEXT,                       -- for media types (Phase 11+)
  timestamp_ms    BIGINT NOT NULL,            -- Unix ms from Meta payload timestamp field
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON whatsapp_messages (thread_id, timestamp_ms DESC);
CREATE INDEX ON whatsapp_messages (created_at DESC);

-- Web Push subscriptions (Phase 10, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id       TEXT UNIQUE NOT NULL,
  endpoint        TEXT NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- AI-derived intelligence per thread (Phase 13, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS lead_intelligence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID UNIQUE NOT NULL REFERENCES whatsapp_threads(id),
  warmth_score    INT CHECK (warmth_score BETWEEN 1 AND 10),
  objections      JSONB DEFAULT '[]',
  status_signal   TEXT,
  follow_up_at    TIMESTAMPTZ,
  last_analysed   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Aftercare follow-up events (Phase 14, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS aftercare_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_lead_id     TEXT NOT NULL,
  event_type      TEXT NOT NULL,              -- "2week_inspection", "1month_checkin"
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',     -- pending, sent, failed
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON aftercare_events (status, scheduled_at);

-- Broadcast campaigns (Phase 15, but table created here per FOUND-07)
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  template_name   TEXT NOT NULL,
  target_criteria JSONB NOT NULL,
  status          TEXT DEFAULT 'draft',       -- draft, running, done
  sent_count      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  run_at          TIMESTAMPTZ
);
```

---

## Phone Normalisation — Gap Analysis

`lib/leadStore.js:normalizePhone()` (confirmed by reading source):

```js
export function normalizePhone(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");  // strips + and all non-digits
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}
```

**Coverage analysis for all 3 required forms:**

| Input | After `replace(/[^\d]/g, "")` | Length/prefix check | Output | Correct? |
|-------|-------------------------------|---------------------|--------|----------|
| `+27821234567` | `27821234567` | length=11, not 10 starting with 0 | `27821234567` | YES |
| `0821234567` | `0821234567` | length=10 starting with 0 → prepend 27 | `27821234567` | YES |
| `27821234567` | `27821234567` | length=11, not 10 starting with 0 | `27821234567` | YES |

**Conclusion:** The existing `normalizePhone()` already handles all 3 forms correctly. The `+` is stripped by `replace(/[^\d]/g, "")`. No modification needed. CONTEXT.md's note about handling `+27` is already satisfied.

**Use it directly:** `import { normalizePhone } from "@/lib/leadStore"` — do NOT reimplement.

---

## Lead Auto-Linking Flow

```
inbound message arrives
  ↓
normalizePhone(msg.from) → "27821234567"
  ↓
kvGet("clientByPhone:27821234567") → clientId or null
  ↓
if clientId found:
  → upsert whatsapp_threads with crm_client_id = clientId
  → resolve crm_lead_id from client's latest lead (optional in Phase 09)
if clientId not found:
  → upsert whatsapp_threads with crm_client_id = null, crm_lead_id = null
  → store message anyway (visible as unknown contact in Phase 11 UI)
```

The `clientByPhone:{phoneNorm}` KV key format is confirmed in `lib/leadStore.js:saveClient()`. The key is set on every client creation and update. It maps to `clientId` (not `leadId`). If the planner wants to also store `crm_lead_id` on the thread: use `kvZRevRange("client:{clientId}:leads", 0, 0)` to get the most recent lead ID.

---

## WABA Subscription — Exact Graph API Call

```
POST https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps
Authorization: Bearer {SYSTEM_USER_ACCESS_TOKEN}
(no request body required)

Success response: {"success": true}

Verify: GET https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps
Success shows: {"data": [{"id": "<APP_ID>", "name": "<APP_NAME>", ...}]}
Failure (not subscribed): {"data": []}
```

**Required token permissions:** `whatsapp_business_management` + `whatsapp_business_messaging`
**Token type:** System User permanent token (not the 24-hour developer temporary token)
**Frequency:** One-time per WABA per Meta App. Survives redeployments. Must be re-run if moved to a new Meta App.

The `/api/admin/setup/waba-subscribe` endpoint (locked in CONTEXT.md) must guard against missing env vars and must be admin-auth protected. It should also call the GET to return confirmation that the subscription is now active.

---

## Common Pitfalls

### Pitfall 1: `request.json()` Before Signature Verification
**What goes wrong:** Body stream consumed before HMAC calculation. Either HMAC throws or you must re-serialize parsed JSON (which changes byte encoding and breaks the comparison).
**Why it happens:** Developers follow the "parse JSON first" habit from non-webhook routes.
**How to avoid:** Always `request.text()` first. Document this in a code comment on the route file.
**Warning signs:** HMAC always fails even with the correct secret.

### Pitfall 2: WABA Subscription Gap (Silent — Zero Messages Arrive)
**What goes wrong:** Webhook URL is configured and verified, but no messages arrive. No error anywhere.
**Why it happens:** Meta no longer auto-creates the app-to-WABA subscription in the 2025+ dashboard.
**How to avoid:** Call `POST /{WABA_ID}/subscribed_apps` and verify with GET before end-to-end testing.
**Warning signs:** Test message sends on sender's device but webhook endpoint receives nothing.

### Pitfall 3: Blocking Await Before 200 Response
**What goes wrong:** Neon write or KV write in critical path → cold start (Neon 1.8s median) + function overhead exceeds Meta's 5-second deadline → Meta retries → duplicate messages.
**Why it happens:** "Obvious" implementation awaits all work before returning.
**How to avoid:** `after()` schedules all work after `return Response.json({ ok: true })`. HMAC verify + `after()` call + return should all complete in <50ms warm.
**Warning signs:** Duplicate rows in `whatsapp_messages` table.

### Pitfall 4: At-Least-Once Delivery — Duplicates Are Normal
**What goes wrong:** Same message appears twice in the DB, team gets duplicate notifications.
**Why it happens:** Meta delivers every webhook at least once; retries after 5s timeout; network blips.
**How to avoid:** `INSERT ... ON CONFLICT (wamid) DO NOTHING` on `whatsapp_messages`. The UNIQUE constraint on `wamid` is the final safety net even if the application-level duplicate check fails.
**Warning signs:** `wamid` column is missing its UNIQUE constraint (check migration).

### Pitfall 5: DDL Via Pooled Connection String
**What goes wrong:** Running migration via `DATABASE_URL` (pooler) fails with errors about `SET search_path` or transaction semantics.
**Why it happens:** Neon's PgBouncer in transaction mode does not support session-level DDL commands.
**How to avoid:** Migration script must use `DATABASE_URL_UNPOOLED`. Comment this in `001-schema.sql`.
**Warning signs:** `ERROR: SET LOCAL is not allowed in transaction blocks` or similar PgBouncer errors.

### Pitfall 6: `timingSafeEqual` Buffer Length Mismatch
**What goes wrong:** `crypto.timingSafeEqual()` throws if the two buffers are different lengths. An attacker can probe this.
**Why it happens:** If the incoming signature is malformed (not `sha256=...`), the length differs from the expected value.
**How to avoid:** Check `signature.startsWith("sha256=")` first; wrap `timingSafeEqual` in try/catch and return `false` on throw.
**Warning signs:** Uncaught TypeError in webhook route.

### Pitfall 7: `after()` Requires Next.js 15.1+
**What goes wrong:** If the project is on Next.js 15.0.x, `after()` is `unstable_after` and may not be importable as stable.
**Why it happens:** `after()` became stable in 15.1.0.
**How to avoid:** Check `package.json` — currently `"next": "^15.0.0"`. If the actual installed version is 15.0.x, either update to 15.1+ or use the fire-and-forget pattern as fallback.
**Fallback pattern (if after() unavailable):**
```js
// fire-and-forget — no await
processPayloadAsync(rawBody).catch(err => console.error("[webhook][bg-error]", err));
return Response.json({ ok: true });
```
This is less safe (function may terminate before work completes on Vercel) but acceptable because the KV job record ensures durability.

---

## Environment Variables Required

```bash
# Neon Postgres (auto-populated by Vercel Marketplace integration)
DATABASE_URL=           # Pooler connection string for runtime queries
DATABASE_URL_UNPOOLED=  # Direct connection string for migrations only

# Meta WhatsApp Cloud API
WHATSAPP_APP_SECRET=           # App Secret (for HMAC verification — NOT the access token)
WHATSAPP_VERIFY_TOKEN=         # Chosen string for hub.challenge verification (any secret string)
WHATSAPP_PHONE_NUMBER_ID=      # Phone Number ID from Meta (for sending — Phase 11, but declare now)
WHATSAPP_ACCESS_TOKEN=         # System User permanent token (for WABA subscription + sending)
WHATSAPP_WABA_ID=              # WhatsApp Business Account ID (for WABA subscription)
```

**Not needed in Phase 09 (declare for later):** `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `waitUntil()` from `@vercel/functions` package | `after()` from `next/server` (built-in) | Next.js 15.1.0 (stable) | No extra package needed for async-after-response |
| `unstable_after` | `after` (stable) | Next.js 15.1.0 | Safe to use in production without the `unstable_` prefix |
| Manual Promise fire-and-forget | `after()` | 2025 | `after()` extends Vercel function lifetime; fire-and-forget can race |

**Deprecated/outdated:**
- Using `context.waitUntil()` in Next.js App Router route handlers: This was a workaround. `after()` is now the standard.
- `unstable_after`: The stable version is just `after` from `next/server`.

---

## Environment Availability

Step 2.6: All dependencies for Phase 09 are either built-in to Node.js (`node:crypto`), already in the project (`lib/kv.js`, `lib/leadStore.js`), or a single npm install (`@neondatabase/serverless`). No external CLI tools needed. No external services needed beyond Meta and Neon (both provisioned manually before this phase).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node:crypto` | HMAC verification | Yes (built-in) | Node.js 18+ | — |
| `@neondatabase/serverless` | Neon queries | Not yet installed | 1.1.0 (latest) | — (required) |
| `after()` from `next/server` | Async webhook pattern | Requires Next.js 15.1+ | Check installed version | Fire-and-forget Promise |
| Neon database instance | Schema + queries | Yes (Vercel Marketplace, pre-provisioned) | Postgres 16 | — |
| Meta WABA (Cloud API) | Webhook delivery | Manual setup required | — | Dev uses ngrok + test number |

**Missing dependencies with no fallback:**
- `@neondatabase/serverless` must be installed (`npm install @neondatabase/serverless`)
- Neon `DATABASE_URL` and `DATABASE_URL_UNPOOLED` env vars must be set in Vercel dashboard

**Missing dependencies with fallback:**
- If Next.js < 15.1: use fire-and-forget Promise instead of `after()` (confirmed fallback pattern above)

---

## Open Questions

1. **Next.js version — `after()` vs fallback**
   - What we know: `package.json` has `"next": "^15.0.0"`. The `^` allows 15.x.
   - What's unclear: Exact installed version on Vercel deployment. `after()` needs 15.1+.
   - Recommendation: First task in Wave 0 — `npm list next` to confirm installed version. If 15.0.x, run `npm install next@latest` to get 15.1+, or use the fire-and-forget fallback pattern.

2. **KV job schema for `whatsapp:job:{id}`**
   - What we know: CONTEXT.md says this is Claude's discretion.
   - Recommendation: `{ wamid, from, to, type, body, threadId, timestamp, receivedAt }` — everything needed to process or retry without re-fetching from Meta.

3. **`crm_lead_id` on thread — how to resolve from `crm_client_id`**
   - What we know: `clientByPhone:{phone}` → `clientId`. Then `client:{clientId}` has `vehicles[]` and last lead info, but no direct `latestLeadId` field.
   - What's unclear: How to get the most recent lead for a client to populate `crm_lead_id`.
   - Recommendation: Use `kvZRevRange("client:{clientId}:leads", 0, 0)` to get the most recent lead ID. Store it on `whatsapp_threads.crm_lead_id`. This is already documented in ARCHITECTURE.md.

4. **WHATSAPP_VERIFY_TOKEN — value and env setup**
   - What we know: Must match what's entered in Meta Developer Console when registering the webhook URL.
   - Recommendation: Generate a random 32-char string, add to Vercel env vars, enter the same string in Meta webhook setup. Document in Wave 0 checklist.

5. **`next.config.mjs` — does `@neondatabase/serverless` need `serverExternalPackages`?**
   - What we know: ARCHITECTURE.md says "test in Phase 1 — may not be needed since it's pure JS with no WASM."
   - Recommendation: Do not add it upfront. If `next build` fails with a bundling error related to neon, add `'@neondatabase/serverless'` to `serverExternalPackages`. This is a Wave 1 or 2 check.

---

## Sources

### Primary (HIGH confidence)
- Official Meta Webhook reference — messages and statuses payload structures confirmed
- Hookdeck WhatsApp Webhooks guide — HMAC verification steps and GET challenge flow confirmed
- Next.js `after()` official docs (version 16.2.9, lastUpdated 2026-03-13) — stable since 15.1.0
- Neon serverless driver official docs — HTTP vs WebSocket choice, per-invocation `neon()` pattern
- Source code (`lib/leadStore.js`) — `normalizePhone()` function read directly, coverage verified

### Secondary (MEDIUM confidence)
- Medium "Shadow Delivery" article — WABA subscription gap confirmed; POST endpoint and required permissions confirmed
- Meta Graph API reference for `subscribed_apps` — `{"success": true}` response confirmed; no required body fields

### Tertiary (LOW confidence)
- None — all findings verified against primary or secondary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@neondatabase/serverless` 1.1.0 verified on npm; `after()` confirmed stable in Next.js 15.1 official docs
- HMAC verification: HIGH — implementation pattern confirmed from official Meta documentation and multiple practitioner sources
- Payload structure: HIGH — JSON structure confirmed from official Meta webhook reference
- WABA subscription: HIGH — Graph API call confirmed; permissions confirmed; response format confirmed
- Phone normalisation: HIGH — source code read directly, coverage tested against all 3 input forms
- Architecture: HIGH — `after()` pattern confirmed in official Next.js docs with Route Handler example

**Research date:** 2026-06-22
**Valid until:** 2026-09-22 (90 days — Meta API versioning is stable; `after()` is now stable Next.js API)
