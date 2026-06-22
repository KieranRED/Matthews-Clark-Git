# Phase 10: Web Push Notifications - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 delivers the notification layer: a service worker, VAPID-based Web Push subscription flow (PWA-only), push dispatch from the webhook's after() callback, and Telegram fallback for team members without a push subscription. Success = an inbound WhatsApp triggers a phone notification on a team member's installed CRM PWA within 5 seconds.

</domain>

<decisions>
## Implementation Decisions

### PWA + Subscribe Flow
- Subscribe button shown only when `@media (display-mode: standalone)` — CSS gate prevents confusion when browsing normally in Safari/Chrome
- Subscribe button lives in the CRM Settings screen (team-facing, not in Phase 11's WhatsApp tab)
- VAPID keys are env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) — must be consistent across all Vercel deployments; changing them invalidates all subscriptions. Document one-liner: `node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k,null,2))"`
- Push subscriptions stored in KV as `push:sub:{teamMemberId}` → JSON PushSubscription object (follows clientByPhone KV pattern)

### Push Dispatch & Telegram Fallback
- Push dispatch happens inside `after()` in the webhook route — alongside `processInboundMessage()`, add `dispatchPushNotifications(threadId, contactPhone)` call
- Notification payload: `{ title: "💬 New WhatsApp", body: "{leadName}: {messagePreview}", data: { threadId, url: "/admin/whatsapp?thread={threadId}" } }`
- Telegram fallback: if no `push:sub:{memberId}` found in KV for a team member → fall back to existing Telegram notification (reuse existing Telegram send logic from lib/telegram.js or similar)
- Query `team_numbers` Neon table to get all active team members for dispatch loop

### Service Worker & Notification Tap
- Service worker at `public/sw.js` — registered via `navigator.serviceWorker.register('/sw.js')` in CRM layout
- `notificationclick` event handler: `clients.openWindow('/admin/whatsapp?thread={threadId}')` — opens specific thread
- Subscribe API: `POST /api/push/subscribe` — requires team member session auth (verifyAdminSession), saves subscription to KV
- Unsubscribe deferred to future phase — just subscribe for now

### VAPID Package
- `web-push@^3.6.7` — install in Phase 10 (not yet in package.json)

### Claude's Discretion
- Exact Settings screen implementation (existing screen or new section)
- Service worker registration location (can be in the CRM layout file)
- Error handling for push send failures (silent fail + console.error is fine for V1)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/kv.js` — `hasKv()`, `kvGet()`, `kvSet()` — same pattern for push:sub:{teamMemberId}
- `app/api/webhooks/whatsapp/route.js` — `after()` callback already set up; add dispatchPushNotifications() call here
- `lib/whatsappStore.js` — `processInboundMessage()` already exists; dispatch is a parallel call, not dependent on it
- `lib/leadStore.js` — KV patterns, normalizePhone reference

### Established Patterns
- KV key pattern: `{entity}:{qualifier}:{id}` — use `push:sub:{teamMemberId}`
- Admin auth: `verifyAdminSession(request)` for protected endpoints
- Route handlers: Next.js App Router, return `Response.json()`
- No npm packages for APIs unless necessary — but `web-push` is required for VAPID crypto

### Integration Points
- `app/api/webhooks/whatsapp/route.js` — add dispatchPushNotifications() inside existing after() callback
- `db/migrations/001-schema.sql` — `team_numbers` table already exists (created in Phase 09) — query it for team member list
- Settings screen in CRM — add subscribe button section (check existing settings screen first)
- CRM layout file — register service worker via useEffect in a client component

</code_context>

<specifics>
## Specific Ideas

- VAPID one-liner for setup: `node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k,null,2))"`
- Telegram fallback reuses whatever Telegram notification pattern already exists in the codebase (check app/api/lead/route.js for the pattern)
- The `push:sub:{teamMemberId}` key should store the full PushSubscription JSON: `{ endpoint, keys: { p256dh, auth } }`
- For dispatch, iterate active team members from Neon, check each for a KV push subscription, send push if found, Telegram if not

</specifics>

<deferred>
## Deferred Ideas

- Unsubscribe endpoint (DELETE /api/push/subscribe) — future phase
- Per-thread muting / snooze for notifications
- VAPID key rotation strategy (invalidates all subscriptions — needs migration plan)

</deferred>
