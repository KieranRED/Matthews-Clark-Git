# Feature Landscape: WhatsApp Business Integration

**Domain:** WhatsApp Business Cloud API integration for a premium car detailing studio CRM
**Researched:** 2026-06-22
**Milestone:** v1.2 WhatsApp Business Integration

---

## Overview

This document covers all 15 features in the milestone scope. Each feature is categorised as table stakes (must exist for the system to function), differentiator (what makes this worth building custom), or anti-feature (explicitly exclude). Feature dependencies map which features must exist before others can be built.

A critical policy note before any feature detail: **Meta banned general-purpose AI chatbots from the WhatsApp Business Platform effective January 15, 2026.** AI that performs specific, structured business tasks (scoring, detection, status updates, alerting) is explicitly permitted. AI that acts as an open-ended conversational agent is prohibited. All AI features below qualify as business-specific task automation and are compliant.

---

## Feature Categories

### Table Stakes

These features are prerequisites. Without them, the rest of the system cannot function. They represent the minimum viable wiring layer.

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| **F01 — Meta Cloud API webhook receiver** | Every other feature depends on receiving and storing conversations | Medium | Must return HTTP 200 immediately and process async. Must validate X-Hub-Signature-256 HMAC. Must handle at-least-once delivery (idempotency by wamid). Needs Neon Postgres for durable conversation storage — Redis/KV is inappropriate for append-only message history. |
| **F02 — Lead auto-linking by phone** | Conversations are useless without knowing which CRM lead they belong to | Low | Inbound webhook includes `wa_id` (E.164 phone number). Match against existing lead phone fields at ingest time. Unmatched conversations park in an "unlinked" queue for manual review. No human action required for matched conversations. |
| **F05 — CRM WhatsApp tab** | Team cannot act on conversations without a UI to view them | High | Thread list (sorted by last_message_at) + inline chat view. Must show message direction (inbound/outbound), timestamps, delivery/read receipts, and media previews. Two distinct views: thread list sidebar + message thread. Must allow team to send outbound messages directly (within 24hr service window: free-form text; outside window: template only). |
| **F03 — Team number management** | System cannot know which team member sent a message without registered numbers | Low | Admin UI to register eSIM business numbers with display names (e.g. "Matthew — Primary"). Each number maps to a WhatsApp phone_number_id in the WABA. Required before any per-number routing or attribution logic works. |
| **F04 — Web Push notifications** | Team must know when a new message arrives — they cannot be polling the CRM tab all day | Medium | PWA service worker + Push API. Requires VAPID key pair. Notification payload: sender name/number, message preview, timestamp. Click-to-focus opens CRM to the relevant thread. Notification permission granted per device at first login. iOS 16.4+ supports PWA push; Android full support. |

### Differentiators

These features deliver intelligence and automation that generic WhatsApp inboxes do not. They are the primary reason to build this custom rather than using a third-party platform.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **F06 — AI warmth scoring (1–10)** | Objectively rank lead intent without reading every conversation | Medium | LLM (GPT-4o-mini recommended for cost) analyses full conversation thread on each new message. Outputs score 1–10 + one-sentence reason. Score stored per conversation and surfaced on lead card. Industry pattern: 1–3 = cold, 4–7 = warm, 8–10 = hot. Refresh on each new inbound message. |
| **F07 — AI objection detection** | Catch price/timing/competitor objections before the lead goes cold | Medium | LLM classifies whether the latest message contains a detectable objection from a fixed taxonomy: `price`, `timing`, `competitor`, `none`. On objection detected: fire WhatsApp message to team numbers via the Cloud API (utility template, pre-approved). Alert includes lead name, objection type, and conversation excerpt. |
| **F08 — AI lead status auto-updates** | Reduce admin overhead; pipeline stages stay current without manual updates | Medium | LLM infers CRM stage from conversation content: `new → contacted → qualified → quoted → won → lost`. Only advances if confidence is high. Stale or ambiguous conversations do not trigger updates. Requires existing CRM stage model — maps to whatever stage names are already in use. |
| **F09 — AI follow-up timing inference** | Never miss a "call me Friday" signal buried in a long thread | Medium | LLM extracts explicit or implied timing commitments from messages (e.g. "I'll decide by end of week", "ping me after payday"). Outputs an ISO date. Stored as `follow_up_at` on the conversation. CRM surfaces these as a follow-up queue sorted by date. |
| **F10 — No-contact alert** | Guarantee every new lead gets a human response within 1 hour | Low | Vercel Cron runs every 15 minutes. Checks for leads where first inbound message arrived > 60 minutes ago and no outbound message exists from any team number. Fires WhatsApp alert to team numbers via template. Tracks `alert_sent_at` to prevent repeat alerts for the same lead. |
| **F11 — Morning briefing** | Team starts each day with full situational awareness without opening the CRM | Medium | Vercel Cron at 07:00 SAST (05:00 UTC). Generates summary: new leads since yesterday, leads awaiting response, high-warmth leads (score ≥ 7), upcoming follow-up dates (F09). Sends as WhatsApp message to all registered team numbers via approved template. Template must be pre-approved by Meta — plan 24–72hr review time. |
| **F12 — Aftercare scheduling** | Premium detailing studios live on repeat business; automated follow-up is standard practice | Medium | On job marked as `delivered` in CRM, schedule a WhatsApp follow-up at +14 days (PPF/wrap inspection invitation). Stored as a scheduled outbound job. Vercel Cron checks daily for due aftercare messages. Message via approved utility template (not marketing — utility qualifies as post-sale service communication). |
| **F13 — Broadcast campaigns** | Re-engage warm unconverted leads at scale without manual copy-paste | High | Manually triggered by admin from CRM. Audience: leads filtered by tag/stage/last-activity. Message: personalised template with `{{name}}`, `{{service}}` variables. Templating requires Meta pre-approval. Sending is rate-limited by WABA tier (default Tier 1: 1,000 unique recipients per 24 hours for a new account). Must include opt-out tracking. |
| **F14 — Competitor intelligence logging** | Surface market pricing data that the team currently loses to memory | Low | On AI processing pass (same LLM call as warmth/objection), extract competitor name and any stated price if present. Store as structured JSON on the conversation. Admin screen aggregates by competitor: mention count, avg stated price, last mentioned date. No external data source required — purely extracted from conversation content. |
| **F15 — Qualified lead scoring tied to utm_content** | Prove which specific ad ID generates revenue-worthy leads, not just form submissions | Medium | Existing CRM leads carry `utm_content` from form submission. When a lead is marked qualified (via AI status update or manual), record `qualified_at` and the `utm_content` value. Dashboard: qualified leads per utm_content, cost-per-qualified-lead (manual ad spend input or Meta Ads API). Depends on F02 (lead linking) and F08 (status updates). |

### Anti-Features

Explicitly out of scope. Each would add complexity, risk, or Meta policy exposure without proportional return.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| General-purpose AI chatbot (auto-reply) | Prohibited by Meta policy from January 15, 2026. Risks account suspension. | AI analyses conversations passively and alerts the team — humans send replies |
| WhatsApp-native message scheduling (built-in feature) | Native scheduling is for the WhatsApp app, not Cloud API. The API does not expose it. | Use Vercel Cron to trigger outbound messages at scheduled time |
| Bulk messaging outside approved templates | Sending non-template messages outside the 24-hr service window violates Meta policy | Pre-approve utility and marketing templates before any broadcast or automated outbound |
| Read receipt suppression workarounds | Any attempt to fake or suppress read receipts violates Meta ToS | Surface read/delivered status from webhook status events honestly |
| Storing media blobs in Postgres | WhatsApp media URLs expire within ~20 minutes of webhook delivery | Store only the media_id and message type; download and re-host to Vercel Blob if preview is needed, or accept that older media is inaccessible |
| Multi-WABA support | M&C operates one WhatsApp Business Account. Multi-WABA adds auth complexity with no current case | Single WABA, single system user token |
| Per-message per-recipient cost tracking | Meta switched to per-message pricing July 1, 2025. Tracking every message cost requires Finance-level accounting logic | Log message counts; accept that exact billing lives in Meta Business Manager |
| Competitor price scraping / external data | Requires scraping or third-party data APIs, adds legal/ToS risk | F14 extracts only what leads voluntarily share in conversation |

---

## Feature Dependencies

Dependencies flow top-to-bottom. A feature with an arrow cannot be built before its upstream is complete.

```
F01 (Webhook receiver + Neon storage)
  └── F02 (Lead auto-linking)
        └── F05 (CRM WhatsApp tab)
              └── F04 (Web Push notifications) — alerts link to threads
        └── F06 (AI warmth scoring)
        └── F07 (AI objection detection)
              └── F04 (Web Push / WhatsApp team alert depends on F03)
        └── F08 (AI lead status updates)
              └── F15 (Qualified lead scoring — needs qualified status)
        └── F09 (AI follow-up timing)
        └── F14 (Competitor intelligence logging)
  └── F10 (No-contact alert — needs inbound message timestamps)
        └── F03 (Team number management — to know where to send alert)
  └── F11 (Morning briefing — needs F06 warmth scores, F09 follow-ups)
        └── F03 (Team number management — to know who to brief)
  └── F12 (Aftercare scheduling — triggered from CRM job delivery status)
  └── F13 (Broadcasts — needs conversation history to identify warm unconverted leads)
        └── F02 (Lead linking — audience selection by lead attributes)

F03 (Team number management)
  → Required by F04, F07 alerts, F10, F11 before any outbound can route correctly

ALL AI features (F06, F07, F08, F09, F14):
  → Depend on F01 (conversation storage) for context window
  → Can share a single LLM analysis job triggered on each new inbound message
  → Running all five analyses in one LLM call is preferable (single prompt, structured JSON output)
    to five separate API calls — reduces cost and latency
```

**Critical path for MVP:**
F01 → F02 → F03 → F04 → F05
That sequence delivers usable WhatsApp inbox in the CRM with team notifications. Everything else layers on top.

---

## Complexity Notes by Feature

### F01 — Webhook Receiver (Medium)

The webhook endpoint must:
1. Verify `X-Hub-Signature-256` before any processing
2. Return HTTP 200 immediately — WhatsApp retries for 7 days on non-200 responses
3. Enqueue payload for async processing (a simple Neon write is fast enough; a full queue is only needed at > 80 msg/sec, which M&C will never reach)
4. Handle duplicate delivery: store `wamid` (WhatsApp message ID) as UNIQUE in Postgres
5. Handle message types: text, image, audio, document, video, reaction, location, interactive

Neon Postgres is the right storage choice here — Redis is inappropriate for conversation history (no relational queries, no message ordering, no full-text search). The existing Upstash KV stays for leads/jobs; Neon is additive for conversations only.

Webhook verification requires a one-time GET challenge (hub.challenge response) before Meta begins sending events. This is a setup step, not a runtime concern.

### F02 — Lead Auto-Linking (Low)

The `wa_id` field in every webhook payload is the sender's phone number in E.164 format. Matching against the lead's stored phone number works if phone numbers are stored consistently. Edge cases:
- South African numbers can arrive as `27XXXXXXXXX` (international) or stored as `0XXXXXXXXX` (local format) — normalisation to E.164 required on both sides at storage time
- One phone number may map to multiple leads (rare but possible if same person submitted twice)
- Unlinked conversations should surface in the UI for manual review, not silently drop

### F03 — Team Number Management (Low)

Straightforward admin CRUD. The WABA Phone Numbers API (`GET /WABA_ID/phone_numbers`) returns all registered numbers. The admin UI adds a `display_name` and `owner` field on top of what Meta already knows. No complex sync needed — M&C has 2–3 team numbers maximum.

### F04 — Web Push (Medium)

Web Push requires a service worker registered at the CRM admin origin. The implementation:
1. Generate VAPID key pair (once, stored in env)
2. On admin login, request Notification permission and POST subscription endpoint to save `PushSubscription` per device
3. When inbound message arrives (F01 processing), call Web Push API to notify all subscribed devices

iOS support requires the app to be added to Home Screen (iOS 16.4+ PWA push). If team uses Android, this is straightforward. The CRM should prompt "Add to Home Screen" on first admin login for iOS users.

### F05 — CRM WhatsApp Tab (High)

Highest UI complexity in the milestone. Requires:
- Thread list with real-time updates (polling or SSE — avoid WebSocket on Vercel serverless)
- Per-thread message view with direction styling (inbound left, outbound right)
- 24-hour window enforcement: show whether free-form reply is available or template required
- Media message handling: images/audio/video show inline; documents as download links
- Outbound send form: text input + send button (within window), template picker (outside window)
- Warmth score badge (from F06) on thread list items
- Lead card link from each thread

Server-Sent Events (SSE) is the recommended real-time pattern for Vercel — supports streaming responses natively. Full polling every 3 seconds is simpler and adequate for a 2–3 person team.

### F06, F07, F08, F09, F14 — AI Analysis Suite (Medium each, but share infra)

All five AI features can and should share a single LLM invocation triggered on each new inbound message. The prompt requests a structured JSON response with all five outputs simultaneously:

```json
{
  "warmth_score": 7,
  "warmth_reason": "Lead confirmed budget and asked for availability",
  "objection": "price",
  "objection_excerpt": "That's a bit more than I was expecting",
  "crm_stage": "qualified",
  "crm_stage_confidence": "high",
  "follow_up_date": "2026-06-27",
  "competitor": "Cape Coat Pro",
  "competitor_price": "R8500"
}
```

GPT-4o-mini is the right model: cheap enough to run on every message, capable enough for structured extraction from conversational text in South African English. Cost estimate at M&C's volume (estimated 20–50 conversations/day, ~5 messages each): < $1/day.

The AI context window should include: the full conversation thread (all messages, ordered by timestamp), the lead's service type, and the lead's current CRM stage. More context = better extraction accuracy.

### F10 — No-Contact Alert (Low)

Simple Cron query:
```sql
SELECT * FROM conversations
WHERE direction_first = 'inbound'
  AND first_message_at < NOW() - INTERVAL '1 hour'
  AND outbound_count = 0
  AND alert_sent_at IS NULL
```
Fire template to team numbers. Set `alert_sent_at`. Done. The only complexity is ensuring the template is pre-approved before the feature goes live.

### F11 — Morning Briefing (Medium)

Complexity is in the summary generation, not the sending. Two approaches:
1. **Template-based** (simpler, no LLM): compose structured template with variable substitution — lead counts, names, scores. Requires only a pre-approved template with variables.
2. **LLM-generated** (richer, more expensive): LLM writes natural language summary from structured data. Requires a utility template with a single free-text body variable, which Meta may or may not approve.

Recommendation: start with option 1 (template-based), upgrade to option 2 once volume justifies it.

### F12 — Aftercare Scheduling (Medium)

Complexity is the scheduling mechanism. Options:
1. **Vercel Cron (simplest)**: daily cron queries for jobs where `delivered_at` + 14 days <= today and `aftercare_sent = false`. Fire template. Works reliably at M&C's scale.
2. **Neon scheduled jobs (future)**: Neon's pg_cron extension can schedule per-row. Over-engineered for this use case.

Aftercare messages are utility (post-sale service), not marketing. Utility templates have lower approval friction and are free within the 24-hour window. The lead has given explicit consent by being a paying customer.

### F13 — Broadcasts (High)

Highest operational complexity:
1. Meta template pre-approval (24–72 hours, mandatory — cannot broadcast without it)
2. Audience selection UI (filter by tags, stage, last contact date)
3. Variable substitution per recipient (`{{name}}`, `{{service}}`, `{{last_contact}}`)
4. Rate limit compliance: at Tier 1 (new WABA), 1,000 unique recipients per 24 hours. M&C's warm lead list is unlikely to exceed this soon.
5. Opt-out tracking: must honour WhatsApp opt-outs. Store `opted_out_at` per lead.
6. Per-message billing: marketing templates are billed per message under the July 2025 pricing model. Estimate: ~R3–5 per message (Meta's per-message rate for South Africa).

### F15 — Qualified Lead Scoring tied to utm_content (Medium)

Complexity is in the dashboard, not the data collection. The UTM is already captured on lead creation (existing system). The new work:
1. Expose a "qualified leads by utm_content" view in the analytics dashboard
2. Optionally: allow manual ad spend entry per utm_content value to compute cost-per-qualified-lead
3. Meta Ads API integration for automatic spend pull is a significant scope expansion — treat as optional/future

The most valuable output is a simple ranked table: `utm_content | qualified_leads | total_leads | qualified_rate%`.

---

## WhatsApp-Specific Constraints (All Features)

These constraints cut across the entire milestone and must be factored into every feature:

| Constraint | Impact |
|------------|--------|
| 24-hour service window | Outside 60 minutes after last inbound message, only pre-approved templates can be sent. F05 chat UI must enforce this. F10, F11, F12 must use templates. |
| Template pre-approval | All outbound templates need Meta approval (24–72 hours typical). Start template submissions in Week 1 of the milestone. Required for: F07 alerts, F10 no-contact, F11 briefing, F12 aftercare, F13 broadcasts. |
| Per-message pricing (from July 1, 2025) | Marketing templates billed per message. Utility templates free within service window. Authentication always billed. |
| WABA messaging tier | New accounts start at Tier 1: 1,000 unique recipients per 24 hours across all phone numbers in the portfolio. Tier 2 (10,000) requires reaching 500 unique conversations in 7 days with a quality rating of Medium or High. |
| Media URL expiry | WhatsApp media URLs in webhooks expire in ~20 minutes. Must download and re-host immediately on ingest, or store only message type and accept loss of older media. |
| Message throughput default | 80 messages per second per phone number — far exceeds M&C's needs. Not a constraint at this scale. |
| On-Premises API end-of-life | As of October 2025, only Cloud API is available for new registrations. The project is already on Cloud API path. |
| WhatsApp number requirements | A number can only be registered to one WABA at a time. Team eSIM numbers being used personally must be migrated or new numbers acquired for business use. |

---

## MVP Recommendation

Build in this sequence:

**Phase 1 — Foundation (blocking everything else)**
1. F01 — Webhook receiver + Neon conversation storage
2. F02 — Lead auto-linking by phone
3. F03 — Team number management

**Phase 2 — Team Visibility**
4. F04 — Web Push notifications
5. F05 — CRM WhatsApp tab (thread list + chat)

**Phase 3 — AI Intelligence (single LLM job, five outputs)**
6. F06, F07, F08, F09, F14 — All five AI analyses (one implementation, one prompt)

**Phase 4 — Automation Outbound**
7. F10 — No-contact alert
8. F11 — Morning briefing
9. F12 — Aftercare scheduling

**Phase 5 — Growth Layer**
10. F13 — Broadcasts (requires template pre-approval lead time)
11. F15 — Qualified lead scoring tied to utm_content

**Template pre-approval must start in Week 1** regardless of which phase templates are needed for. Approval takes 1–3 business days but can block Phase 4 if submitted late.

---

## Sources

- [WhatsApp Cloud API Webhook Overview — Meta for Developers](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/)
- [Guide to WhatsApp Webhooks: Features and Best Practices — Hookdeck](https://hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices)
- [WhatsApp API Rate Limits Explained — WASenderApi](https://wasenderapi.com/blog/whatsapp-api-rate-limits-explained-how-to-scale-messaging-safely-in-2025)
- [WhatsApp API Pricing Update: Effective July 1, 2025 — YCloud](https://www.ycloud.com/blog/whatsapp-api-pricing-update)
- [WhatsApp Business Multiple Numbers — Blueticks](https://blueticks.co/blog/whatsapp-business-multiple-numbers)
- [Not All Chatbots Are Banned: WhatsApp's 2026 AI Policy Explained — respond.io](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban)
- [WhatsApp changes its terms to bar general-purpose chatbots — TechCrunch](https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform/)
- [How to Automatically Qualify Leads in WhatsApp with AI — Aurora Inbox](https://www.aurorainbox.com/en/2026/02/25/automatically-qualify-leads-whatsapp/)
- [WhatsApp AI Agent for Lead Management — respond.io](https://respond.io/blog/whatsapp-ai-chatbot-for-lead-management)
- [WhatsApp Automation: Cut Response Times — JustCall](https://justcall.io/blog/whatsapp-automation-to-improve-customer-engagement.html)
- [Setting Up SLA/Response-Time Alerts for WhatsApp — Bow Chat](https://bow.chat/use-cases/sla-response-time-alerts-whatsapp)
- [WhatsApp Schedule Message — Infobip](https://www.infobip.com/blog/whatsapp-schedule-message)
- [UTM Tracking for WhatsApp Campaigns — Kommo](https://www.kommo.com/support/messenger-apps/whatsapp-analytics-utms/)
- [WhatsApp Conversion Tracking Attribution Issues — Digital MicroEnterprise](https://digitalmicroenterprise.com/whatsapp-conversion-tracking)
- [WhatsApp Business API: 24-Hour Window and Templates — smsmode](https://www.smsmode.com/en/whatsapp-business-api-customer-care-window-ou-templates-comment-les-utiliser/)
- [Messaging Per Second (MPS) for WhatsApp — Insider One Academy](https://academy.insiderone.com/docs/messaging-per-second-mps-for-whatsapp)
- [Connect Next.js to Neon — Neon Docs](https://neon.com/docs/guides/nextjs)
