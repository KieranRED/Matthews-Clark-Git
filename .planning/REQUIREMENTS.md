# Requirements: Matthews & Clark — v1.2 WhatsApp Business Integration

## Milestone Goal
Add a WhatsApp conversation layer to the CRM that logs all team conversations, links them to CRM leads, fires AI-powered alerts, and surfaces conversation intelligence on lead cards — using Meta Cloud API directly (no BSP), Neon Postgres for storage, and Web Push for team phone notifications.

---

## Active Requirements

### Foundation (FOUND)

- [ ] **FOUND-01**: System receives and stores all inbound WhatsApp messages via Meta Cloud API webhook, verifying HMAC signature before processing
- [ ] **FOUND-02**: System receives and stores all outbound WhatsApp messages sent by team members via the CRM chat UI
- [ ] **FOUND-03**: Webhook returns HTTP 200 immediately and defers all processing (Neon write, push dispatch, AI queue) asynchronously to avoid Meta retries
- [ ] **FOUND-04**: System normalises all phone numbers to E.164 format (`27XXXXXXXXX`) at write time to match WhatsApp's delivery format against CRM lead records
- [ ] **FOUND-05**: System automatically links a WhatsApp conversation to a CRM lead by matching the normalised phone number (using existing `clientByPhone` KV index)
- [ ] **FOUND-06**: System explicitly calls `POST /{WABA_ID}/subscribed_apps` after webhook configuration to activate message delivery (Meta no longer auto-creates this)
- [ ] **FOUND-07**: Neon Postgres schema is created with tables: `whatsapp_messages`, `whatsapp_threads`, `team_numbers`, `push_subscriptions`, `lead_intelligence`, `aftercare_events`, `broadcast_campaigns`

### Notifications (NOTIF)

- [ ] **NOTIF-01**: Team member can subscribe to Web Push notifications from the CRM admin (subscribe button only shown when running as installed PWA — `display-mode: standalone`)
- [ ] **NOTIF-02**: System sends a Web Push notification to all subscribed team members when an inbound WhatsApp message arrives
- [ ] **NOTIF-03**: Tapping the push notification opens the CRM WhatsApp tab at the relevant conversation thread
- [ ] **NOTIF-04**: System falls back to Telegram notification for team members who are not subscribed to Web Push
- [ ] **NOTIF-05**: Push subscriptions are stored in KV (fast path) and associated with a team member record

### CRM Chat UI (CHAT)

- [ ] **CHAT-01**: CRM admin has a WhatsApp tab accessible from the existing navigation (shell.jsx, app.jsx, shell-desktop.jsx edits only — no new Next.js page)
- [ ] **CHAT-02**: WhatsApp tab shows a thread list with lead name, last message preview, timestamp, and unread count
- [ ] **CHAT-03**: Team member can open a conversation thread and read the full message history in chronological order
- [ ] **CHAT-04**: Team member can send a WhatsApp message to a lead from within the CRM chat UI
- [ ] **CHAT-05**: Chat UI visually indicates whether the 24-hour session window is active ("free reply") or expired ("template required") for each thread
- [ ] **CHAT-06**: Chat UI shows the matched lead name, car, and pipeline status alongside the conversation
- [ ] **CHAT-07**: WhatsApp tab shows an "Unclaimed" section listing new leads who have not yet been contacted by any team member, sorted by recency
- [ ] **CHAT-08**: Team member can click "Claim" on an unclaimed lead to see the lead's full quote details (car, service, coverage, film type, etc.) before sending the first message
- [ ] **CHAT-09**: Claiming a lead sends a simple pre-approved opener template — "Hey [leadFirstName], I'm [teamMemberName] reaching out from Matthews & Clark about the enquiry you just submitted." — with lead name and team member name auto-filled; team member then types freely once the 24-hour session window is open
- [ ] **CHAT-10**: After claiming, the thread moves from Unclaimed to the team member's active threads and is attributed to them in the CRM

### Team Number Management (TEAM)

- [ ] **TEAM-01**: Admin can register a new team WhatsApp number (eSIM number) with a display name in the admin settings UI
- [ ] **TEAM-02**: Admin can deactivate or remove a registered team number
- [ ] **TEAM-03**: Registered team numbers are stored in the `team_numbers` Neon table and used to attribute outbound messages to specific team members
- [ ] **TEAM-04**: CRM WhatsApp tab shows which team member sent each outbound message

### AI Intelligence (AI)

- [ ] **AI-01**: System analyses each conversation with a single Claude API call covering: warmth score (1–10 with reason), objection type (price/timing/competitor/partner), suggested CRM status (warm/hot/cold/lost/booked), follow-up timing recommendation, and competitor mentions
- [ ] **AI-02**: AI analysis is triggered when a team member opens a conversation thread (streaming, real-time) and also runs as a nightly batch for all active threads (50% cost saving via Batch API)
- [ ] **AI-03**: Warmth score and one-line reason are visible on the CRM lead card (tooltip on desktop, expandable inline on mobile)
- [ ] **AI-04**: Detected objections are visible on the lead card alongside suggested handling based on historical closed deal context
- [ ] **AI-05**: System fires a WhatsApp alert to the handling team member when a price, timing, or competitor objection is detected
- [ ] **AI-06**: System proposes a CRM status update when conversation signals a clear intent change (e.g. "let's do it" → `closing`, "went elsewhere" → `lost`); team member confirms before status changes
- [ ] **AI-07**: Competitor names and prices mentioned in conversations are logged to `lead_intelligence` and visible per-lead and in aggregate

### Automated Outbound (AUTO)

- [ ] **AUTO-01**: System sends a WhatsApp alert to all registered team numbers if no team member has messaged a new lead within 1 hour of lead creation (Vercel Cron every 15 minutes)
- [ ] **AUTO-02**: System sends a daily morning briefing to all registered team numbers at 07:00 SAST (05:00 UTC) containing: leads needing follow-up, outstanding quotes, leads gone quiet (48h+ no reply), overnight replies, referral nudges
- [ ] **AUTO-03**: When a PPF or wrap job is marked `delivered`, system auto-schedules a follow-up inspection 2 weeks out and sends WhatsApp reminders to the team 1 week and 1 day before
- [ ] **AUTO-04**: All automated outbound messages use pre-approved Meta message templates (template IDs configurable in admin settings, not hardcoded)

### Broadcast + Analytics (BCAST)

- [ ] **BCAST-01**: Admin can create a broadcast campaign targeting leads who enquired about a specific service within a date range but never booked (`delivered` or `lost` excluded)
- [ ] **BCAST-02**: Admin can preview the recipient list before sending a broadcast
- [ ] **BCAST-03**: System sends personalised WhatsApp messages to each recipient using a pre-approved template with lead name and car interpolated
- [ ] **BCAST-04**: Each lead receives a qualification score based on: car make/model tier, service requested, and quote value
- [ ] **BCAST-05**: Qualification score is tied to `utm_content` (ad ID) and surfaces a cost-per-qualified-lead metric per ad alongside standard CPL in the CRM dashboard

---

## Future Requirements (deferred from v1.2)

- Canvas segmentation for per-panel WhatsApp share images
- Read receipt / delivery status display in chat UI
- WhatsApp catalog integration for service menu
- VAPID key rotation strategy (all subscriptions invalidated on rotation — needs migration plan)
- Per-thread muting / snooze for team notifications

---

## Out of Scope

| Item | Reason |
|------|--------|
| WhatsApp Business App on team phones | Mutually exclusive with Cloud API webhooks on same number |
| Third-party BSP (Wati, Twilio, etc.) | Direct Cloud API avoids per-message BSP fees and external data routing |
| AI auto-reply to leads | Meta Jan 2026 policy bans general-purpose AI chatbots; team reviews all AI suggestions before sending |
| Prisma / Drizzle ORM | Overkill for 3-table conversation schema; raw SQL via Neon serverless driver |
| Socket.io / Pusher real-time | Impossible on Vercel serverless; SWR polling or SSE sufficient for chat UI |
| Managed push services (OneSignal) | Internal 2-5 person tool; managed services add cost + external data dependency |

---

## Traceability

*(To be filled by roadmapper)*

---

## Notes

- Meta WABA provisioning (Meta Business Manager → WhatsApp product → phone number registration) is a one-time manual setup, not a code task. Takes 1–3 business days.
- eSIM numbers must be registered via Meta Cloud API (not WhatsApp Business App) — these are mutually exclusive on the same number.
- Message template wording must be agreed and submitted to Meta before automated outbound phases can go live. 24–72hr approval time.
- Neon Postgres provisioned via Vercel Marketplace (auto-populates `DATABASE_URL` env var).
- South Africa does not observe DST — UTC+2 is fixed year-round. Cron times are stable.
