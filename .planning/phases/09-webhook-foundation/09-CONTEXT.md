# Phase 09: Webhook Foundation - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 09 delivers the inbound message pipeline: Meta Cloud API webhook receiver, Neon Postgres schema, phone normalisation, and lead auto-linking. No UI. Success = WhatsApp messages arrive in Neon and get attached to the correct CRM lead within 500ms of delivery.

</domain>

<decisions>
## Implementation Decisions

### Neon Schema Design
- Primary key: UUID for `whatsapp_messages` (matches Meta `wamid` format, globally unique)
- Denormalize `last_message_at` and `unread_count` onto `whatsapp_threads` to avoid expensive aggregates on every thread list render
- Single migration file `001-schema.sql` — simple, no ORM
- `crm_lead_id` nullable FK on `whatsapp_threads` — threads can exist unlinked, then get linked later when a CRM lead is found

### Webhook Receiver Pattern
- KV job queue (`whatsapp:job:{id}`) for async work after returning 200 — uses existing KV infrastructure, survives Vercel cold starts
- HMAC fail → 403 with `{ error: "invalid signature" }` — security standard
- Single route at `app/api/webhooks/whatsapp/route.js`: GET handles Meta's `hub.mode=subscribe` verification, POST handles message events
- Duplicate guard: check `message_id` uniqueness before insert AND rely on DB unique constraint (double safety — Meta retries)

### Lead Auto-Linking & WABA Setup
- Store messages even when no CRM lead matches (`crm_lead_id = null`) — team can see unknown contacts in the chat UI
- Phone normalisation handles all 3 forms: `+27821234567` → strip `+`; `0821234567` → `27821234567`; `27821234567` → unchanged
- WABA subscription activation: one-time `POST /api/admin/setup/waba-subscribe` endpoint with `WHATSAPP_WABA_ID` env guard — run once after Meta setup
- All runtime queries use the pooler connection string (`-pooler.neon.tech`); migration script comment documents the direct connection requirement

### Claude's Discretion
- Exact Neon table column names and indexes beyond the above
- Error logging format (console.error is fine for V1)
- KV job schema (what fields to include in the queued job)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/kv.js` — `hasKv()`, `kvFetch()` already abstract KV access with local no-op guard
- `lib/leadStore.js` — `normalizePhone()` function already exists; handles `0X` → `27X` conversion; `clientByPhone:{phone}` KV index already populated on lead creation
- `lib/crmKitAdapter.js` — existing pattern for CRM data access; follow same module shape for `lib/whatsappStore.js`
- `app/api/lead/route.js` — reference for async webhook pattern (fire-and-forget with env guards)

### Established Patterns
- Route handlers: Next.js App Router (`export async function GET/POST(req)`)
- No npm packages for Meta — plain `fetch` + built-in `node:crypto` for HMAC-SHA256
- `@neondatabase/serverless` with HTTP transport (not TCP) — already chosen in research
- Env var pattern: `process.env.WHATSAPP_APP_SECRET` — server-side only, never `NEXT_PUBLIC_`
- Error responses: `Response.json({ error: '...' }, { status: 4XX })`

### Integration Points
- `lib/leadStore.js:normalizePhone()` — call this for all phone normalisation; do not reimplement
- `clientByPhone:{normalizedPhone}` KV key → `clientId` — existing index to resolve phone → CRM lead
- New `lib/whatsappStore.js` module for all Neon read/write ops (keep route files thin)
- New `lib/neon.js` — single Neon client export using `@neondatabase/serverless`

</code_context>

<specifics>
## Specific Ideas

- Phone normalisation must also handle `+27` prefix (with plus sign): strip `+` to get `27821234567`
- WABA subscription endpoint needs an env var guard (refuse if `WHATSAPP_WABA_ID` or `WHATSAPP_ACCESS_TOKEN` not set) so it can't be accidentally called in dev
- Neon schema tables from FOUND-07: `whatsapp_messages`, `whatsapp_threads`, `team_numbers`, `push_subscriptions`, `lead_intelligence`, `aftercare_events`, `broadcast_campaigns` — create all tables in Phase 09 even though most aren't used until later phases (single migration is cleaner)

</specifics>

<deferred>
## Deferred Ideas

- AI job queue trigger from webhook (Phase 13)
- Push dispatch from webhook (Phase 10)
- Broadcast campaign tables (Phase 15) — BUT create them in the schema now per FOUND-07

</deferred>
