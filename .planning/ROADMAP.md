# Roadmap: Matthews & Clark

## Milestones

- ✅ **v1.1 Wrap Visualisation Studio** - Phases 06-08 (shipped 2026-06-22)
- 🚧 **v1.2 WhatsApp Business Integration** - Phases 09-15 (in progress)

## Phases

<details>
<summary>✅ v1.1 Wrap Visualisation Studio (Phases 06-08) - SHIPPED 2026-06-22</summary>

## Phase 07: Quote, CRM Integration & Share/Download
**Goal:** Complete the commercial loop — per-panel colour assignment, quote form → CRM lead, Telegram notification, and watermarked download + shareable link.

**Requirements:** RCOL-09, QUOTE-01, QUOTE-02, QUOTE-03, QUOTE-04, QUOTE-05, SHARE-01, SHARE-02

**UI hint:** yes

**Plans:** 3/3 plans complete

Plans:
- [x] 07-01-PLAN.md — /api/wrap-quote route: persist wrap lead + Telegram notification (QUOTE-03, QUOTE-04)
- [x] 07-02-PLAN.md — Wire QuoteModal to API; controlled form + panel breakdown (RCOL-09, QUOTE-01/02/05)
- [x] 07-03-PLAN.md — Watermarked download + shareable colour link (SHARE-01, SHARE-02)

| Plan | Name | Status | Plans | Summaries |
|------|------|--------|-------|-----------|
| 01 | /api/wrap-quote route + Telegram notification | Complete | 1 | 1 |
| 02 | QuoteModal controlled form + panel breakdown | Complete | 1 | 1 |
| 03 | Watermarked download + shareable colour link | Complete | 1 | 1 |

## Phase 08: GPT-Image-2 Studio Render
**Goal:** Add the AI studio render pass — send the canvas composite to GPT-Image-1 (images.edit), integrate the car into the M&C studio bay scene, and surface the result with a before/after comparison.

**Requirements:** RENDER-01, RENDER-02, RENDER-03, RENDER-04, RENDER-05, RENDER-06

**UI hint:** yes

**Plans:** 4 plans

Plans:
- [x] 08-01-PLAN.md — Wave 0 infra: install openai, OPENAI_API_KEY, kvExpire helper, studio bay asset
- [ ] 08-02-PLAN.md — /api/wrap-render route: gpt-image-1 images.edit + per-IP rate limit (RENDER-02/03/04)
- [ ] 08-03-PLAN.md — Canvas helper + renderUrl state + real startRender fetch + BA slider (RENDER-01/05/06)
- [ ] 08-04-PLAN.md — Human-verify live studio render end-to-end (RENDER-04/06)

| Plan | Name | Status | Plans | Summaries |
|------|------|--------|-------|-----------|
| 01 | Wave 0 infra (openai + env + kvExpire + asset) | Complete | 1 | 1 |
| 02 | /api/wrap-render route + rate limit | Planned | 1 | 0 |
| 03 | Canvas helper + renderUrl wiring | Planned | 1 | 0 |
| 04 | Human-verify live render | Planned | 1 | 0 |

## Phase 06: Upload + Recolour Engine

| Plan | Name | Status | Plans | Summaries |
|------|------|--------|-------|-----------|
| 01 | Upload + Background Removal Engine | Complete | 1 | 1 |
| 02 | HEIC Support + Finish Set | Complete | 1 | 1 |
| 03 | Before/After Slider Wiring + Per-Panel Verification | Complete | 1 | 1 |
| 04 | Phase 6 UAT Sign-Off | Complete | 1 | 1 |

</details>

---

### 🚧 v1.2 WhatsApp Business Integration (In Progress)

**Milestone Goal:** Add a WhatsApp conversation layer to the CRM — logging all team conversations, linking them to CRM leads, firing AI-powered alerts, and surfacing conversation intelligence on lead cards. Meta Cloud API direct (no BSP), Neon Postgres for storage, Web Push for team notifications.

## Phase Checklist

- [x] **Phase 09: Webhook Foundation** - Neon schema, webhook receiver, phone normalisation, WABA subscription, lead auto-linking (completed 2026-06-22)
- [ ] **Phase 10: Web Push Notifications** - Service worker, VAPID, subscribe flow, push dispatch, Telegram fallback
- [ ] **Phase 11: CRM Chat UI** - WhatsApp tab, thread list, chat view, send, claim flow, 24hr indicator, template composer
- [ ] **Phase 12: Team Number Management** - Admin UI to register and name eSIM numbers
- [ ] **Phase 13: AI Intelligence** - Single Claude call per thread — warmth, objections, status, timing, competitor signals
- [ ] **Phase 14: Automated Outbound** - No-contact alert, morning briefing, aftercare scheduling, template config
- [ ] **Phase 15: Broadcast + Analytics** - Campaign UI, qualified lead scoring, cost-per-qualified-lead metric

## Phase Details

### Phase 09: Webhook Foundation
**Goal**: Messages from WhatsApp arrive in the system, are verified, stored in Neon, and automatically linked to CRM leads
**Depends on**: Phase 08 (Neon provisioned separately via Vercel Marketplace as part of setup)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07
**Success Criteria** (what must be TRUE):
  1. A WhatsApp message sent to the test number appears in the `whatsapp_messages` Neon table within 2 seconds of delivery
  2. The webhook endpoint verifies HMAC signature and rejects invalid requests with 403
  3. Webhook returns HTTP 200 within 500ms regardless of Neon or downstream latency
  4. The inbound message's thread is auto-linked to the matching CRM lead by normalised phone number (27XXXXXXXXX format)
  5. Sending `POST /{WABA_ID}/subscribed_apps` after webhook config causes messages to flow (WABA subscription gap resolved)
**Plans**: 3 plans
Plans:
- [x] 09-01-PLAN.md — Install @neondatabase/serverless + 7-table migration + runner (FOUND-07)
- [x] 09-02-PLAN.md — lib/neon.js + lib/whatsappStore.js: store, normalise, auto-link (FOUND-01/04/05)
- [ ] 09-03-PLAN.md — Webhook route (HMAC + after()) + WABA subscribe + env (FOUND-01/02/03/06)
**UI hint**: no

### Phase 10: Web Push Notifications
**Goal**: Team members receive instant phone notifications when a lead sends a WhatsApp message, with Telegram as fallback
**Depends on**: Phase 09
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05
**Success Criteria** (what must be TRUE):
  1. Team member installs the CRM as a PWA (add to home screen) and sees a subscribe button that is hidden in the browser tab
  2. After subscribing, a WhatsApp sent to the test number triggers a push notification on the team member's phone within 5 seconds
  3. Tapping the notification opens the CRM directly to the relevant conversation thread
  4. A team member without a push subscription receives the same inbound alert via Telegram instead
  5. Push subscription endpoints are stored in KV (not Neon) and associated with the correct team member record
**Plans**: 3 plans
Plans:
- [x] 10-01-PLAN.md — Install web-push + VAPID env vars (NOTIF-01 infra)
- [ ] 10-02-PLAN.md — lib/pushStore.js + subscribe API + webhook dispatch + Telegram fallback (NOTIF-02/04/05)
- [ ] 10-03-PLAN.md — public/sw.js + SwRegistrar + subscribe button in Settings (NOTIF-01/02/03)
**UI hint**: yes

### Phase 11: CRM Chat UI
**Goal**: Team members can read, claim, and reply to WhatsApp conversations from within the CRM admin — without ever leaving the platform
**Depends on**: Phase 10
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, CHAT-07, CHAT-08, CHAT-09, CHAT-10
**Success Criteria** (what must be TRUE):
  1. A WhatsApp tab is accessible from the existing CRM navigation (shell.jsx, app.jsx, shell-desktop.jsx edits only — no new Next.js page created)
  2. The tab shows an Unclaimed section with new leads sorted by recency, each showing lead name, last message preview, timestamp, and unread count
  3. Team member clicks Claim, reviews the lead's full quote details, then the claim sends the pre-approved opener template with lead name and team member name auto-filled
  4. After claiming, the thread moves to the team member's active threads and is attributed to them in the CRM
  5. The chat view shows the full message history and visually distinguishes "free reply" (24hr window open) from "template required" (window expired)
  6. The chat view shows the matched lead name, car, and pipeline status alongside the conversation
**Plans**: TBD
**UI hint**: yes

### Phase 12: Team Number Management
**Goal**: Admin can register, name, and deactivate team WhatsApp numbers (eSIMs) without touching code
**Depends on**: Phase 09
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04
**Success Criteria** (what must be TRUE):
  1. Admin opens settings UI and registers a new eSIM number with a display name — it appears immediately in the team_numbers Neon table
  2. Admin can deactivate a registered number and it stops being used for outbound attribution
  3. In the CRM chat UI, outbound messages display the sending team member's name derived from the registered number attribution
**Plans**: TBD
**UI hint**: yes

### Phase 13: AI Intelligence
**Goal**: Every open conversation thread shows warmth score, detected objections, and status signals on the lead card — powered by a single Claude API call
**Depends on**: Phase 11
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07
**Success Criteria** (what must be TRUE):
  1. Opening a conversation thread triggers a single Claude API call returning warmth score (1-10 with reason), objection type, suggested CRM status, follow-up timing, and competitor mentions — all in one structured JSON response
  2. Warmth score and one-line reason are visible on the CRM lead card (tooltip on desktop, expandable inline on mobile)
  3. Detected objections appear on the lead card alongside suggested handling; a WhatsApp alert fires to the handling team member when a price, timing, or competitor objection is found
  4. When the AI detects a clear intent change (e.g. "let's do it" or "went elsewhere"), the system proposes a CRM status update and waits for team member confirmation before changing it
  5. Competitor names and prices logged to lead_intelligence are visible both per-lead and in aggregate across all conversations
  6. A nightly batch runs Claude over all active threads using the Batch API (50% cost saving vs real-time calls)
**Plans**: TBD
**UI hint**: yes

### Phase 14: Automated Outbound
**Goal**: The system proactively alerts the team when leads go quiet and sends scheduled WhatsApp messages using pre-approved templates — without manual intervention
**Depends on**: Phase 12
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04
**Success Criteria** (what must be TRUE):
  1. A new lead created in the CRM with no team message sent within 1 hour triggers a WhatsApp alert to all registered team numbers (Vercel Cron running every 15 minutes)
  2. At 07:00 SAST (05:00 UTC) daily, all registered team numbers receive a morning briefing covering leads needing follow-up, outstanding quotes, leads gone quiet, overnight replies, and referral nudges
  3. When a PPF or wrap job is marked delivered, a follow-up inspection reminder is auto-scheduled 2 weeks out with WhatsApp reminders to the team 1 week and 1 day before
  4. All automated outbound messages use pre-approved Meta message templates whose IDs are configurable in admin settings (not hardcoded)
**Plans**: TBD
**UI hint**: yes

### Phase 15: Broadcast + Analytics
**Goal**: Admin can run personalised WhatsApp broadcast campaigns to warm unconverted leads, and the CRM surfaces a cost-per-qualified-lead metric tied to ad attribution
**Depends on**: Phase 14
**Requirements**: BCAST-01, BCAST-02, BCAST-03, BCAST-04, BCAST-05
**Success Criteria** (what must be TRUE):
  1. Admin creates a broadcast targeting leads who enquired about a specific service within a date range but never booked — the system previews the recipient list before sending
  2. Each recipient in the broadcast receives a personalised WhatsApp using a pre-approved template with their lead name and car interpolated
  3. Each lead has a qualification score based on car make/model tier, service requested, and quote value — visible on the lead card
  4. The CRM dashboard shows cost-per-qualified-lead per ad (utm_content) alongside standard CPL, giving the team a direct signal on ad quality vs ad volume
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 06. Upload + Recolour Engine | v1.1 | 4/4 | Complete | 2026-06-22 |
| 07. Quote, CRM Integration & Share | v1.1 | 3/3 | Complete | 2026-06-22 |
| 08. GPT-Image-2 Studio Render | v1.1 | 1/4 | In progress | - |
| 09. Webhook Foundation | v1.2 | 2/3 | Complete    | 2026-06-22 |
| 10. Web Push Notifications | v1.2 | 1/3 | In Progress|  |
| 11. CRM Chat UI | v1.2 | 0/? | Not started | - |
| 12. Team Number Management | v1.2 | 0/? | Not started | - |
| 13. AI Intelligence | v1.2 | 0/? | Not started | - |
| 14. Automated Outbound | v1.2 | 0/? | Not started | - |
| 15. Broadcast + Analytics | v1.2 | 0/? | Not started | - |
