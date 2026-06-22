# Domain Pitfalls: WhatsApp Business Integration

**Domain:** Meta WhatsApp Cloud API + Neon Postgres + Web Push on Next.js 15 / Vercel
**Researched:** 2026-06-22
**Milestone:** v1.2 WhatsApp Business Integration

---

## Summary

This document catalogues the most likely failure modes when adding WhatsApp Business integration to the existing Matthews & Clark CRM. The system is Next.js 15 App Router on Vercel, using Upstash Redis (existing) and Neon Postgres (new, for conversation storage). The existing stack is serverless-native, which creates specific constraints for webhook handling, connection pooling, and background processing that differ from a traditional long-running server.

The three highest-risk areas are:

1. **Webhook receiver architecture** — Meta's 5-second response deadline combined with Vercel cold starts can cause silent message drops. The receiver must return 200 before doing any real work.
2. **WABA-to-App subscription** — A fragmented Meta dashboard step that is easy to miss silently prevents all inbound webhooks from arriving, with no error visible in the app.
3. **24-hour session window + template message approval** — Sending outbound messages to users who haven't written in the last 24 hours requires pre-approved templates. A missing template means the outbound message is silently rejected by Meta's API.

---

## Critical Pitfalls

These cause silent production failures, complete feature breakage, or data loss if not addressed.

---

### CRITICAL-01: WABA-to-App Subscription Is Not Automatic in 2025+ Meta UI

**Phase:** Phase 1 (Webhook receiver setup)
**Hard Blocker:** YES — no inbound messages will arrive without this

**What goes wrong:**
After creating a Meta App, adding a phone number to a WhatsApp Business Account (WABA), and configuring a webhook URL in the App Dashboard — no webhook events are delivered. Messages sent to the number appear to send on the sender's device, but the webhook endpoint receives nothing. No error appears anywhere.

This is the "Shadow Delivery" problem. In Meta's updated 2025 developer UI, the app-to-WABA subscription is no longer automatically established when you set up a webhook. It must be explicitly created via the Graph API.

**Why it happens:**
The App Dashboard configures where webhooks go. The WABA-to-App link is a separate subscription that controls whether the WABA sends events to that app at all. In the pre-2025 UI these steps were linked. They are now separate, and the subscription step has no obvious button in the developer UI.

**Consequences:**
- Zero inbound messages received despite correct webhook URL and valid verify token
- Developer spends hours debugging the webhook endpoint that is actually working fine
- Impossible to distinguish from a network/deployment issue without knowing this step exists

**Prevention:**
After setting up the app and phone number, explicitly subscribe the WABA to the app via Graph API Explorer:
```
POST /{WABA_ID}/subscribed_apps
Authorization: Bearer {System User Token}
```
Verify the subscription is active:
```
GET /{WABA_ID}/subscribed_apps
```
This step must be done once per WABA per app. It survives redeployments. Document the WABA ID and confirm this step is done before any end-to-end testing begins.

If the integration is ever moved to a new Meta App (e.g. during development), the subscription must be re-established for the new app — the old app loses it automatically.

**Confidence:** HIGH — confirmed in Meta developer documentation and multiple developer post-mortems (2025)

---

### CRITICAL-02: Webhook Must Return HTTP 200 Within 5 Seconds or Meta Retries

**Phase:** Phase 1 (Webhook receiver)
**Hard Blocker:** YES — causes duplicate message processing and potential data corruption

**What goes wrong:**
Meta's webhook system expects an HTTP 200 response within 5 seconds. If the response is slow (Vercel cold start + Neon cold start + Claude API call = easily 3–10 seconds) or returns a non-200 status, Meta marks the delivery as failed and retries with decreasing frequency for up to 7 days. Each retry re-delivers the same webhook payload to the endpoint.

Without deduplication logic, each retry creates a duplicate message in the database, fires duplicate Web Push notifications to the team, and may trigger duplicate Claude AI analysis calls.

**Why it happens:**
Developers implement the "obvious" approach: receive webhook → validate → write to DB → send push notification → return 200. On a warm Vercel function with a warm Neon connection, this might be 800ms. On a cold start (Vercel cold start ~1s + Neon cold start ~1.8s median), it exceeds 5 seconds.

**Consequences:**
- Duplicate messages stored in Neon for every cold-start invocation
- Duplicate Web Push notifications fired to team phones
- Claude AI called multiple times for the same message
- Conversation thread state corrupted (e.g. warmth score recalculated on stale data)

**Prevention:**
The webhook endpoint must use a two-phase pattern:
1. Validate the `X-Hub-Signature-256` header immediately using raw body text
2. Return HTTP 200
3. Then write to Neon, trigger push, call Claude — all after the response is sent

In Next.js App Router, use `waitUntil` from Vercel's functions package if available, or write to a Neon queue table synchronously before returning 200 (queue table writes are fast single-row inserts, not full business logic).

Additionally, implement deduplication by inserting with `ON CONFLICT (wamid) DO NOTHING` where `wamid` is the WhatsApp message ID. This makes all duplicate retries idempotent at the database level.

**Raw body must be read before any parsing:**
Call `request.text()` first, verify the HMAC-SHA256 signature against that exact string, then parse to JSON. Calling `request.json()` before signature verification means the raw body is consumed and the HMAC will fail or be unverifiable. Force the route to use Node.js runtime (not Edge runtime) to avoid body re-encoding issues.

**Confidence:** HIGH — confirmed in Meta developer docs (5-second deadline), Vercel docs (cold start latency), and Neon docs (cold start 1.8s median)

---

### CRITICAL-03: 24-Hour Session Window — Outbound Messages Silently Rejected Outside Window

**Phase:** Phase 1 (outbound messaging), Phase 3 (automated outbound), Phase 4 (broadcast)
**Hard Blocker:** YES for any proactive outbound feature

**What goes wrong:**
WhatsApp's Cloud API enforces a 24-hour "service window." Free-form messages (text, media, interactive) can only be sent to a user within 24 hours of their last inbound message. After that window closes, sending a free-form message returns an API error, but the message is silently not delivered — it may appear "sent" at the application layer while never reaching the user.

The 24-hour clock is measured from when the user's message was sent on their device, not when it was received by the webhook.

**What this blocks in the M&C roadmap:**
- No-contact alerts (automated follow-up to leads who haven't replied for X days) — these are by definition outside the 24-hour window
- Morning briefing messages — require templates if the lead hasn't written overnight
- Broadcast campaigns to warm leads — require templates

**Prevention:**
1. Store `last_user_message_at` per conversation in Neon. Before any outbound send, check if `now() - last_user_message_at < 24 hours`.
2. If inside the window: send free-form. If outside: use an approved template or queue for when user replies.
3. Build a utility function `canSendFreeForm(conversationId): boolean` that is called before every outbound API call.
4. All proactive outbound features must use approved templates. Plan and submit template approvals before building the automated outbound phases.
5. Template approval via Meta can take 24–72 hours. Template changes (even minor wording) require re-approval.

**Template submission strategy:**
Create and get approved: (a) a follow-up template, (b) a morning briefing template, (c) a broadcast marketing template. All must include an opt-out footer for marketing templates. Templates without opt-out that are used for marketing-category messages violate Meta policy and risk the phone number being flagged.

**Confidence:** HIGH — confirmed in Meta official documentation and multiple BSP guides

---

### CRITICAL-04: Phone Number Registration Is Not the Same as Adding to WABA

**Phase:** Phase 2 (eSIM number registration)
**Hard Blocker:** YES — number will show as "Pending" and reject all API calls

**What goes wrong:**
Adding a phone number to a WhatsApp Business Account in Business Manager (via OTP verification) completes account verification, but does NOT register the number for Cloud API use. Cloud API registration is a separate explicit step. Attempting to send or receive messages with an unregistered number returns "Account not registered" errors. The number shows as "Pending" in the WABA even though OTP was successfully verified.

This is specifically relevant when the eSIM numbers arrive and need to be registered. The sandbox test number already has registration completed — the migration to production numbers will surface this requirement.

**Prevention:**
After OTP verification of each eSIM number, explicitly call the registration endpoint:
```
POST /{Phone-Number-ID}/register
{
  "messaging_product": "whatsapp",
  "pin": "YOUR_6_DIGIT_PIN"
}
```
The PIN is the two-step verification PIN set during number setup. This step must be documented as a checklist item for when eSIM numbers arrive.

The Phone Number ID in code must also change when switching from sandbox to production. The sandbox has a different Phone Number ID from any production number. All environment variables referencing the phone number ID must be updated, and this must be done atomically (if some API calls use the old ID and some use the new, messages will silently route incorrectly).

**Confidence:** HIGH — confirmed in Meta Cloud API registration documentation

---

### CRITICAL-05: Neon Connection Pool Exhaustion Under Webhook Bursts

**Phase:** Phase 1 (Neon setup), ongoing
**Hard Blocker:** YES for sustained load — silent query failures under burst

**What goes wrong:**
Neon uses PgBouncer in transaction mode as its connection pooler. Each Vercel serverless function invocation opens a new database connection for the duration of the transaction. Under a burst of simultaneous inbound WhatsApp messages (e.g. a broadcast campaign generates many replies simultaneously), multiple concurrent webhook invocations each attempt to open a Neon connection. The default pool is sized at `0.9 × max_connections`, which on a 1 CU compute is approximately 377 active transactions. Exhausting this causes new connections to queue (up to 120 seconds) then error.

More practically: if direct connection strings (not the pooled connection string) are used, each serverless function invocation creates a real Postgres connection. Postgres's own limit on a 1 CU compute is ~107 connections. A burst of 108 concurrent webhook invocations exhausts Postgres connections entirely.

**Why it happens:**
Developers copy the direct connection string from Neon's dashboard (labeled "Connection string") rather than the pooled string (labeled "Pooled connection string" or "?pgbouncer=true"). The direct string bypasses PgBouncer.

**Prevention:**
1. Always use the pooled connection string (the one ending in `-pooler.neon.tech` or with `?pgbouncer=true`) for serverless functions.
2. Do NOT use session-level features with the pooled connection: `SET`, `LISTEN/NOTIFY`, prepared statements persisted across transactions, and `WITH HOLD CURSOR` all break in PgBouncer transaction mode.
3. Confirm which connection string is used in every database utility file. For this project, all DB access goes through one lib — enforce this at the lib level, not caller level.
4. For deduplication, use `INSERT ... ON CONFLICT DO NOTHING` (single atomic transaction) rather than SELECT-then-INSERT (two transactions that can race).

**Confidence:** HIGH — confirmed in Neon official documentation (connection pooling, PgBouncer transaction mode limitations)

---

### CRITICAL-06: Web Push on iOS Requires PWA Install — Silent Non-Delivery Otherwise

**Phase:** Phase 2 (Web Push notifications)
**Hard Blocker:** YES for any iOS device on the team not using the installed PWA

**What goes wrong:**
iOS Web Push only works when the site is installed as a PWA from Safari via "Add to Home Screen." A permission prompt shown in a regular Safari tab, or in Chrome/Firefox on iOS, will either be denied by the OS or silently fail to register a push subscription. The registration appears to succeed (no error thrown) but the push endpoint is invalid and no notifications will be delivered.

Additionally, in EU countries (iOS 17.4+), Apple removed standalone PWA support under the Digital Markets Act. Team members with EU App Store accounts or who travel to EU will lose push notifications.

**Why it happens:**
Developers test Web Push on Android (where it works from any browser without install) and assume iOS behaves the same way.

**Prevention:**
1. The Web Push permission prompt must only be shown after detecting the PWA install context: `window.matchMedia('(display-mode: standalone)').matches`.
2. Before showing the subscribe button, detect iOS + browser tab context and show an install prompt instead: "Add this app to your home screen to receive message notifications."
3. Document the install flow for every M&C team member's phone.
4. Test on an actual iPhone in Safari, installed as PWA, on iOS 16.4+. Do not treat Android testing as sufficient.
5. Fall back to Telegram notifications (already in the system) for any team member who cannot or won't install the PWA.

**EU note:** If any M&C team member uses an EU App Store account, push notifications will not work via PWA. The Telegram fallback is the only option for them.

**Confidence:** HIGH — confirmed in Apple developer documentation and multiple Web Push guides (2025–2026)

---

## Moderate Pitfalls

These cause bugs, data inconsistency, or degraded UX if not addressed, but don't stop the feature from working entirely.

---

### MOD-01: Phone Number Normalization — South African Numbers Have Multiple Valid Representations

**Phase:** Phase 1 (lead auto-linking), ongoing

**What goes wrong:**
The CRM stores lead phone numbers entered by customers in the lead form in various formats: `0821234567` (local), `+27821234567` (E.164), `27821234567` (E.164 without plus), `082 123 4567` (formatted). WhatsApp Cloud API delivers inbound messages with numbers in E.164 without the plus sign (e.g. `27821234567`). If lead-linking is done by string equality, numbers will not match and conversations will not auto-link to leads.

**South Africa specific:**
- Local format starts with `0` (e.g. `082...`, `071...`, `060...`)
- E.164 replaces the leading `0` with `+27`
- WhatsApp delivers as `27XXXXXXXXX` (no plus, no leading zero)

**Prevention:**
1. Implement a `normalizePhone(input): string` function that strips all non-digit characters, removes leading `0` for SA numbers, prepends `27` if not already present, and returns a consistent 11-digit string (e.g. `27821234567`).
2. Normalize all phone numbers at write time — both when saving lead phone numbers and when saving WhatsApp contact numbers.
3. Store the normalized form in a dedicated column in Neon (`phone_normalized`) alongside the raw input.
4. Run the normalization over existing lead data in Upstash Redis when the linking feature is built.
5. The auto-linking query should JOIN on the normalized column, not the raw column.

**Confidence:** HIGH — E.164 format requirements confirmed in official WhatsApp documentation; SA country code behavior confirmed

---

### MOD-02: Message Status Events Are High-Volume and Structurally Identical to Message Events

**Phase:** Phase 1 (webhook receiver)

**What goes wrong:**
The Meta webhook delivers multiple types of events in the same payload structure: inbound messages, outbound message status updates (sent, delivered, read, failed), and system notifications. Each outbound message generates 2–3 status webhooks (sent → delivered → read). If the webhook handler doesn't filter on `entry[].changes[].value.messages` vs `entry[].changes[].value.statuses`, it will attempt to treat delivery receipts as inbound messages, causing type errors and noise in the conversation log.

Additionally, a single webhook delivery can contain multiple entries and multiple changes per entry. Handlers that assume one message per webhook invocation will silently drop messages in bursts.

**Prevention:**
1. Parse the full payload structure: iterate `entry[]`, then `changes[]`, then check for `messages` vs `statuses` in `value`.
2. Handle both branches explicitly. Messages go to the conversation log. Status updates go to the message status table (or update the `status` column on the outbound message row).
3. Never assume one event per webhook — loop over all entries and changes.
4. Log the full raw payload to a `webhook_log` table with a short TTL (7 days) during development for debugging.

**Confidence:** HIGH — confirmed in Meta webhook reference documentation

---

### MOD-03: Claude API Call Cannot Block Webhook Response — Must Be Async

**Phase:** Phase 3 (AI intelligence)

**What goes wrong:**
Calling the Claude API to analyze a message (warmth scoring, objection detection) takes 1–4 seconds per call depending on prompt size and model. If this call is in the critical path of the webhook handler before returning HTTP 200, the handler will time out on cold starts and cause Meta to retry the webhook (see CRITICAL-02).

Even after the 200 is returned using a queue approach, calling Claude synchronously on every inbound message adds per-message cost at a rate that scales with conversation volume. An active conversation with 10 messages will cost 10× a single analysis.

**Prevention:**
1. Claude analysis must never be in the webhook response critical path. Queue the message ID, then process Claude analysis in a separate async step.
2. Use a Neon-based job queue: insert a row into `ai_analysis_queue` in the webhook handler (fast), then process from that queue in a Vercel Cron job (e.g. every minute).
3. Apply prompt caching for the system prompt and any static context (service descriptions, common objection patterns). The system prompt is the same for every message — cache it to reduce input token costs by 60–90%.
4. Only analyze messages that need it: skip status updates, system messages, and very short messages (e.g. "ok", "thanks"). Filter by message type and length before queuing.
5. Consider batching: analyze the last 3 messages of a conversation together rather than each individually. This gives richer context for warmth scoring at the same Claude API call cost.

**Confidence:** HIGH — Claude API latency confirmed in Anthropic documentation; caching behavior confirmed in official prompt caching docs

---

### MOD-04: Vercel Cron Will Not Retry on Failure — Scheduled Jobs Can Silently Miss

**Phase:** Phase 3 (automated outbound), Phase 4 (morning briefings, no-contact alerts)

**What goes wrong:**
If a Vercel Cron-triggered function throws an exception, times out (60-second max on Pro plan), or returns a 5xx response, Vercel does not retry it. The scheduled job is simply missed. Error logs are retained for 1 day. This is a known limitation that is easy to overlook when building scheduled automation.

A cron that fires every minute and takes more than 1 minute to run will overlap with the next invocation — Vercel will start a second instance while the first is still running. For no-contact alert sends, this can cause duplicate messages to leads.

**Prevention:**
1. All cron-triggered jobs must write a "job started" record to Neon at invocation start and a "job completed" record at the end. If "started" has no corresponding "completed" within 2× expected runtime, surface it in the CRM admin UI.
2. Use a Neon-based lock: `INSERT INTO cron_locks (job_name, locked_at) ON CONFLICT (job_name) DO NOTHING RETURNING id`. Only proceed if a row was inserted. Delete the row when done. This prevents concurrent invocations from running.
3. Break large jobs (e.g. sending 50 no-contact alerts) into a queue that the cron drains incrementally. Each invocation processes a bounded batch, stays well within 60 seconds.
4. Alert via Telegram when a job fails — never swallow errors silently.

**Confidence:** HIGH — confirmed in Vercel official documentation (no retry on failure, 60s timeout on Pro)

---

### MOD-05: Quality Rating Degradation from Unsolicited Outbound Campaigns

**Phase:** Phase 4 (broadcast campaigns)

**What goes wrong:**
WhatsApp monitors how recipients respond to messages. If a significant percentage of broadcast recipients tap "Block and Report" or simply block the number, the phone number's quality rating drops from Green → Yellow → Red. A Red quality rating can result in:
- The number being flagged and prevented from sending marketing messages
- Messaging tier being frozen (no tier upgrades while Red)
- In severe cases, the number being temporarily or permanently disabled

This is particularly dangerous for broadcast campaigns to "warm unconverted leads" — leads who never explicitly opted in to WhatsApp marketing.

**Prevention:**
1. Every broadcast template must include an explicit opt-out instruction: "Reply STOP to unsubscribe." This is both a policy requirement and a quality signal tool — users who opt out do not become block-and-reporters.
2. Maintain an opt-out list in Neon. Check it before sending any broadcast. Honor opt-outs immediately and permanently.
3. Limit broadcast frequency: no more than 1 broadcast per lead per week, regardless of campaign.
4. Monitor quality rating via the WhatsApp Manager API before each broadcast batch. If quality is Yellow, pause broadcasts until it recovers.
5. The Pair Rate Limit enforces 1 message every 6 seconds to the same user — respect this or risk rate errors.

**Confidence:** HIGH — confirmed in Meta quality rating documentation and WhatsApp Business compliance guides

---

### MOD-06: Duplicate Webhook Delivery Is Normal — Idempotency Is Mandatory

**Phase:** Phase 1 (webhook receiver), ongoing

**What goes wrong:**
Meta uses at-least-once delivery. Under normal operation (not just cold start failures), Meta may deliver the same webhook event more than once. A single inbound message can generate 2–3 identical webhook deliveries. Without deduplication, the same message appears twice in the conversation log, the team gets two push notifications, and Claude analyzes the same message twice.

**Prevention:**
1. Use the WhatsApp message ID (`wamid`) as the deduplication key. Each message has a globally unique `wamid` in the format `wamid.ID`.
2. The Neon messages table must have a `UNIQUE` constraint on `wamid`.
3. All inserts must use `INSERT ... ON CONFLICT (wamid) DO NOTHING`.
4. For status updates, use `INSERT ... ON CONFLICT (wamid, status) DO NOTHING` — the same message ID can have multiple statuses (delivered, then read), both of which should be stored.
5. The AI analysis queue should also deduplicate on `wamid` to prevent double Claude calls.

**Confidence:** HIGH — confirmed in Meta webhook documentation ("at-least-once delivery") and multiple implementation guides

---

### MOD-07: Neon Cold Starts Add 1.8s to First Connection — Affects UX for Chat UI

**Phase:** Phase 2 (CRM WhatsApp tab), Phase 3 (real-time chat)

**What goes wrong:**
Neon scales to zero after 5 minutes of inactivity (default on free and Starter plans). When the M&C team opens the WhatsApp tab in the CRM after the database has idled, the first query takes 1.8s median (95th percentile 2.6s) for Neon to wake. If the chat UI doesn't show a loading state, it appears broken. If the webhook handler triggers a cold start, it contributes to the 5-second Meta deadline (see CRITICAL-02).

**Prevention:**
1. Use the pooled connection string — PgBouncer keeps warm connections to Postgres and masks many cold starts.
2. Consider setting Neon's "suspend after inactivity" period to a longer window (e.g. 10 minutes or 30 minutes) during active development and in production for the WhatsApp feature, accepting slightly higher Neon compute costs.
3. For the CRM chat UI, always show a skeleton loading state on initial load — never a blank panel. Set a 3-second timeout that surfaces a "Reconnecting..." message if the first query doesn't return.
4. The webhook receiver should not block on Neon cold starts. The queue-and-process pattern (write to fast queue first, return 200, process later) decouples webhook response time from Neon wake time.

**Confidence:** HIGH — Neon cold start timings from Neon official documentation (2025 measurements)

---

## Minor Pitfalls

These cause friction, suboptimal behavior, or complexity if not planned for, but have straightforward mitigations.

---

### MIN-01: Sandbox → Production Number Switch Changes Phone Number ID in All Code Paths

**Phase:** Phase 2 (eSIM number registration)

**What goes wrong:**
The Meta sandbox test number has a Phone Number ID that is different from every production eSIM number's Phone Number ID. All API calls for sending messages, registering webhooks, and checking number status use the Phone Number ID. When switching from sandbox to production, if any code path still uses the sandbox Phone Number ID (e.g. hardcoded, not read from env), messages will be silently routed to the wrong number or fail with a permission error.

**Prevention:**
1. Never hardcode the Phone Number ID. Read it from a `WHATSAPP_PHONE_NUMBER_ID` environment variable in all API calls.
2. For a multi-number setup (one per eSIM/team member), store Phone Number IDs in Neon in the `team_numbers` table, not in environment variables.
3. Build the number registration admin UI (Phase 2) before registering production numbers — adding a number should always go through the UI, which stores the Phone Number ID in Neon automatically.

**Confidence:** HIGH — confirmed in Meta API documentation

---

### MIN-02: Template Message Approval Can Take 72+ Hours — Plan Ahead

**Phase:** Phase 3 (automated outbound)

**What goes wrong:**
WhatsApp message templates must be submitted for Meta review before they can be used for outbound messages outside the 24-hour session window. Review typically takes 24–72 hours but can take longer if the template is flagged for manual review (e.g. promotional language, vague wording, non-standard variables). Changes to approved templates require re-submission and full re-review.

**Prevention:**
1. Identify all required templates at the start of Phase 3 (not when building the feature): no-contact follow-up, morning briefing, aftercare scheduling, broadcast marketing.
2. Submit templates in Week 1 of the phase, write the code in parallel assuming they'll be approved.
3. Write templates to be clearly categorized: utility (transactional) vs marketing. Marketing templates have stricter review and cost more per conversation.
4. Store template names and IDs in Neon — templates are referenced by name in API calls, not by their content.

**Confidence:** HIGH — confirmed in Meta template management documentation

---

### MIN-03: Multi-Number Routing Requires Explicit Mapping — No Auto-Detection

**Phase:** Phase 2 (team number management)

**What goes wrong:**
When multiple eSIM numbers are registered under the same WABA, inbound webhooks contain the Phone Number ID of the receiving number. The CRM must use this ID to route the message to the correct "inbox" (which team member's number received it). Without explicit Phone Number ID → team member mapping, all conversations appear to come from one undifferentiated pool.

**Prevention:**
1. The `team_numbers` table in Neon stores `phone_number_id`, `display_name`, `e164_number`, and `registered_at`.
2. The webhook handler reads `value.metadata.phone_number_id` and joins to `team_numbers` to identify the recipient number.
3. Messages with an unrecognized `phone_number_id` should be logged to an `unrouted_messages` table with an alert — don't silently drop them.

**Confidence:** HIGH — confirmed in Meta webhook reference (metadata.phone_number_id field)

---

### MIN-04: Vercel Serverless Cannot Hold Long-Lived WebSocket for Real-Time Chat

**Phase:** Phase 2 (CRM chat UI)

**What goes wrong:**
A real-time chat UI ideally uses WebSockets or Server-Sent Events to push new messages to the browser without polling. Vercel serverless functions cannot hold persistent connections beyond the function execution duration. Attempting to use WebSockets from a Next.js API route on Vercel will either fail immediately or hold the connection open until the 60-second function timeout, then drop it.

**Prevention:**
Use polling instead of WebSockets for the CRM chat UI. A `setInterval` polling the `/api/admin/whatsapp/messages?after={lastMessageId}` endpoint every 3–5 seconds is sufficient for a small team. For a chat that sees 5–10 messages per minute, polling at 5-second intervals is imperceptible lag with negligible cost.

If real-time feel is required later: use Vercel's `waitUntil` for long-polling, or integrate a dedicated WebSocket service (Pusher, Ably) as a thin notification layer — the CRM still stores messages in Neon, but the browser gets notified to re-fetch.

**Confidence:** HIGH — fundamental Vercel serverless architecture constraint

---

### MIN-05: Upstash Redis and Neon Must Not Get Out of Sync for Lead Data

**Phase:** Phase 1 (lead auto-linking), ongoing

**What goes wrong:**
The existing CRM stores lead records in Upstash Redis. The new WhatsApp conversation system stores messages in Neon. The link between them (phone number → lead ID) lives in… one of the two stores, or possibly both. If this linkage is stored inconsistently (Redis says lead 123 = number 27821234567, but Neon doesn't have that mapping, or vice versa), auto-linking will silently fail and conversations will appear unlinked.

**Prevention:**
1. The source of truth for lead-to-phone-number linkage must be a single location. Recommendation: store it in Neon in a `conversation_lead_links` table, derived from lead data in Redis.
2. When a new conversation arrives with an unknown phone number, query Neon for a linked lead first. If not found, query Redis for a lead with a matching normalized phone number. If found, write the link to Neon.
3. Build a one-time migration script that reads all leads from Redis, normalizes phone numbers, and populates the Neon linking table on Phase 1 deploy.
4. Any lead update in Redis (phone number change) must also update the Neon link table — add this to the lead update code path.

**Confidence:** MEDIUM — derived from architectural constraints; specific Redis-Neon sync pattern is a design decision, not a documented gotcha

---

## Phase-Specific Warnings Summary

| Phase | Topic | Pitfall | Mitigation |
|-------|-------|---------|------------|
| Phase 1 | WABA setup | App subscription not established — zero webhooks received | Explicitly POST to `/{WABA_ID}/subscribed_apps` after setup |
| Phase 1 | Webhook response timing | Cold start exceeds 5s — Meta retries, duplicates created | Return 200 immediately; process asynchronously via queue |
| Phase 1 | Body parsing | `request.json()` before signature check — HMAC fails | Always `request.text()` first, verify HMAC, then parse |
| Phase 1 | Webhook payload | Single webhook can have multiple entries and statuses | Loop over all `entry[].changes[]` — never assume one event |
| Phase 1 | Message deduplication | At-least-once delivery causes duplicate messages | `INSERT ON CONFLICT (wamid) DO NOTHING` in all paths |
| Phase 1 | Neon connection string | Direct string instead of pooled — connection exhaustion | Always use pooled (`-pooler.neon.tech`) connection string |
| Phase 1 | Phone normalization | Lead phone doesn't match `27XXXXXXXX` from WhatsApp | Normalize all phones to `27XXXXXXXXX` at write time |
| Phase 1 | Session window | Outbound to leads not replied in 24h silently rejected | Check `last_user_message_at` before every outbound send |
| Phase 2 | iOS Web Push | Non-PWA install silently fails to subscribe | Show push prompt only when `display-mode: standalone` |
| Phase 2 | eSIM registration | Number added to WABA but not registered for Cloud API | Call `/register` endpoint after OTP, before any API use |
| Phase 2 | Sandbox → production | Phone Number ID changes — stale env var routes to wrong number | All Phone Number IDs from env var or Neon, never hardcoded |
| Phase 2 | Multi-number routing | Unrecognized `phone_number_id` drops messages | Log unrouted messages, alert team on new/unknown ID |
| Phase 2 | Real-time chat | WebSockets fail on Vercel — silent connection drops | Use polling at 3–5s interval; long-poll if needed later |
| Phase 3 | Claude API latency | AI call in webhook critical path → 5s breach | Claude analysis always async via queue table |
| Phase 3 | Template approval | Templates needed for automated outbound not pre-approved | Submit templates Week 1 of Phase 3, build in parallel |
| Phase 3 | Cron no retry | Scheduled job fails silently — no-contact alert missed | Neon-based job lock + completion log + Telegram error alert |
| Phase 4 | Broadcast quality | Block-and-report ratio degrades number quality rating | Mandatory opt-out footer, opt-out list, quality check before send |

---

## Hard Blockers — Must Address Before Phase Starts

| Blocker | Phase | Action Required |
|---------|-------|-----------------|
| WABA-to-App subscription confirmed active | Before Phase 1 testing | POST to Graph API, GET to verify, document WABA ID |
| Webhook returns 200 before any async work | Phase 1 (day 1) | Async queue pattern must be in the first commit of the receiver |
| Neon pooled connection string used everywhere | Phase 1 | Audit all DB utility code — no direct connection strings |
| All team iPhones have PWA installed | Before Phase 2 push testing | iOS install walkthrough documented and completed by team |
| eSIM number `/register` call documented as required step | Before Phase 2 | Add to team runbook for number registration flow |
| No-contact follow-up template submitted for approval | Week 1 of Phase 3 | Submit to Meta template manager before writing the feature code |

---

## Sources

- Meta Developer Docs — Webhooks Setup: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks/
- Meta Developer Docs — Webhook Status Messages Reference: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status/
- Meta Developer Docs — Phone Number Registration: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers
- Meta Developer Docs — Send Messages (Service Window): https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
- "Shadow Delivery Mystery" — Medium post on WABA subscription gap: https://medium.com/@siri.prasad/the-shadow-delivery-mystery-why-your-whatsapp-cloud-api-webhooks-silently-fail-and-how-to-fix-2c7383fec59f
- Hookdeck — WhatsApp Webhooks Best Practices: https://hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices
- Neon Docs — Connection Pooling: https://neon.com/docs/connect/connection-pooling
- Neon Docs — Choosing Your Connection Method: https://neon.com/docs/connect/choose-connection
- Apple Developer Docs — Web Push for Web Apps: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- Pushpad — iOS Special Requirements for Web Push: https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications
- WhatsApp API Rate Limits (2025): https://wasenderapi.com/blog/whatsapp-api-rate-limits-explained-how-to-scale-messaging-safely-in-2025
- WhatsApp Messaging Limits 2026: https://chatarmin.com/en/blog/whats-app-messaging-limits
- Anthropic Docs — Prompt Caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Vercel Docs — Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel Docs — Functions Limitations: https://vercel.com/docs/functions/limitations
- WhatsApp Opt-in Compliance (2025): https://www.wuseller.com/whatsapp-business-knowledge-hub/whatsapp-business-opt-in-rules-prevent-bans-grow-lists/
- Phone Number Normalization for WhatsApp: https://wassenger.com/blog/en/how-to-normalize-international-phone-numbers-for-whatsapp
