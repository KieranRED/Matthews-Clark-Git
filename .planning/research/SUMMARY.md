# Research Summary — v1.2 WhatsApp Business Integration

**Synthesized:** 2026-06-22
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Stack Additions

Only 3 new npm packages across the entire milestone:

```bash
npm install @neondatabase/serverless web-push @anthropic-ai/sdk
```

| Package | Version | Why |
|---------|---------|-----|
| `@neondatabase/serverless` | `^1.1.0` | Only Postgres driver that works over HTTP in Vercel serverless — TCP drivers fail |
| `web-push` | `^3.6.7` | VAPID push notifications; spec-stable despite 2yr maintenance freeze; official Next.js docs use it |
| `@anthropic-ai/sdk` | `^0.104.2` | Claude API for AI message analysis; `claude-sonnet-4-6` for nuanced conversation reading |

**Meta Cloud API:** Zero npm packages. Plain `fetch` + built-in `node:crypto` for HMAC verification.

**Ruled out:** Meta SDK (serverless-incompatible), Prisma/Drizzle (overkill for 3-table schema), Socket.io (impossible on serverless), next-pwa (adds complexity for always-online admin), Vercel AI SDK (abstraction layer over 2 API calls).

---

## Table Stakes Features

Must ship for the milestone to be useful at all:

- **F01 Webhook receiver** — inbound/outbound message logging to Neon Postgres
- **F02 Lead auto-linking** — match WhatsApp phone number to CRM lead (normalizePhone() already exists)
- **F03 Team number management** — register/name eSIM numbers in admin UI
- **F04 Web Push notifications** — inbound alerts to team phones (PWA, home screen install)
- **F05 CRM WhatsApp tab** — thread list + chat UI in existing admin shell (3 surgical edits to shell files)

---

## Differentiator Features

AI and automation that make this genuinely powerful:

- **F06–F09 + F14 (one LLM call)** — warmth scoring, objection detection, status inference, follow-up timing, competitor detection — all in a single Claude call per message event. Do not split into 5 separate calls.
- **F10 No-contact alert** — Vercel Cron every 15min; fire if no team message within 1 hour of lead creation
- **F11 Morning briefing** — daily Cron at 05:00 UTC (07:00 SAST — South Africa has no DST, UTC+2 fixed)
- **F12 Aftercare scheduling** — auto-schedule PPF/wrap follow-up on `delivered` status change
- **F13 Broadcast campaigns** — personalised outbound to warm unconverted leads; WABA Tier 1 = 1,000/day
- **F15 Qualified lead scoring** — score tied to `utm_content` → cost-per-qualified-lead metric per ad

---

## Critical Architecture Decisions

1. **Webhook acknowledges 200 immediately, defers all work** — Neon cold start (1.8s) + Claude (2-4s) exceeds Meta's 5s timeout. Pattern: verify HMAC → INSERT to Neon → fire Web Push → write AI job to KV → return 200. AI analysis runs in a separate 5-min cron.

2. **`@neondatabase/serverless` HTTP transport, pooler connection string** — Use `-pooler` endpoint from Neon for all runtime queries. Direct connection string only for migrations.

3. **Push subscriptions live in KV, not Neon** — keeps the hot path (webhook → push dispatch) in existing KV-first pattern without a Postgres round-trip.

4. **Single Claude call per conversation** — warmth + objections + status + timing + competitor in one structured JSON prompt. Triggered on thread open (streaming) or nightly batch (50% cheaper via Batch API).

5. **24-hour session window is a UI constraint** — the chat UI must visually show "free reply available" vs "template required" state. This is a design requirement in the CRM tab, not just backend logic.

6. **CRM tab = 3 surgical edits** — `shell.jsx` (nav item + parsePath), `app.jsx` (import + route branch), `shell-desktop.jsx` (nav item). No new Next.js page.

---

## Watch Out For (Top 5 Pitfalls)

1. **WABA subscription gap (silent — zero messages arrive)** — Meta's 2025 UI no longer auto-creates the webhook subscription. Must explicitly call `POST /{WABA_ID}/subscribed_apps` after webhook configuration. No error, no logs. Prevention: Phase 1 checklist item.

2. **Webhook timeout → duplicate processing** — Meta retries on any non-2xx or timeout. The 200 must return before any async work. Prevention: async pattern baked into Phase 1 architecture from day one.

3. **Template pre-approval lead time** — no-contact alerts, morning briefings, broadcasts, and aftercare all require pre-approved WhatsApp templates. Meta takes 24–72 hours. Prevention: submit all templates in Week 1, tracked as a non-code task.

4. **iOS Web Push requires PWA install — silent failure otherwise** — push subscription appears to succeed in a regular Safari tab but the endpoint is invalid. Prevention: subscribe button only renders when `display-mode: standalone` is detected.

5. **Phone number normalisation (27XXXXXXXXX vs 0XXXXXXXXX)** — WhatsApp delivers SA numbers as `27821234567`. CRM stores `0821234567`. String equality never matches. Prevention: normalise to E.164 at both write points in Phase 1 using existing `normalizePhone()`.

---

## Build Order

| Phase | Focus | Key output |
|-------|-------|------------|
| 1 | Foundation — Neon schema, webhook receiver, phone normalisation, WABA subscription | Messages flowing, leads auto-linked |
| 2 | Web Push — VAPID keys, service worker, push_subscriptions, subscribe flow | Team gets phone notifications |
| 3 | CRM WhatsApp tab — thread list, chat UI, send, 24hr window indicator | Team can read + reply in CRM |
| 4 | Team number management — admin UI to register/name eSIM numbers | Numbers manageable without code |
| 5 | AI intelligence — single Claude call: warmth/objection/status/timing/competitor | Intelligence on every lead card |
| 6 | Automated outbound — no-contact alert, morning briefing, aftercare scheduling | Proactive team alerts |
| 7 | Broadcasts + analytics — campaign UI, qualified lead scoring, cost-per-qualified-lead | Ad attribution closed loop |

---

## Open Questions for Phase Planning

1. **Neon suspend threshold** — set to never/1hr minimum given webhook frequency; cold starts hit 1.8s median if suspended.
2. **iOS fallback** — team members with EU App Store accounts cannot use iOS Web Push. Confirm Telegram fallback is acceptable.
3. **eSIM number count** — exact count affects `team_numbers` schema design.
4. **Template wording** — all automated outbound templates need agreed wording before Week 1 submission.
5. **Claude trigger timing** — streaming on thread open + nightly batch for all active threads (recommended).
