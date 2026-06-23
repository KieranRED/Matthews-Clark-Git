# Phase 10: Web Push Notifications - Research

**Researched:** 2026-06-23
**Domain:** Web Push API (VAPID), Service Workers, Next.js 15 App Router, KV storage
**Confidence:** HIGH — all findings verified against codebase files or official sources

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `web-push@^3.6.7` for VAPID crypto (server-side only)
- VAPID keys as env vars: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`
- Service worker at `public/sw.js`
- Subscribe API: `POST /api/push/subscribe` (verifyAdminSession auth)
- Push subscriptions in KV as `push:sub:{teamMemberId}`
- Push dispatch inside `after()` in `app/api/webhooks/whatsapp/route.js`
- Telegram fallback if no KV `push:sub` for a team member
- Query `team_numbers` Neon table for active team members
- SW notificationclick → `clients.openWindow` with thread URL
- No unsubscribe endpoint in this phase

### Claude's Discretion
- Exact Settings screen implementation (existing screen or new section)
- Service worker registration location (can be in the CRM layout file)
- Error handling for push send failures (silent fail + console.error is fine for V1)

### Deferred Ideas (OUT OF SCOPE)
- Unsubscribe endpoint (DELETE /api/push/subscribe) — future phase
- Per-thread muting / snooze for notifications
- VAPID key rotation strategy (invalidates all subscriptions — needs migration plan)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIF-01 | VAPID key generation and env var setup | web-push 3.6.7 `generateVAPIDKeys()` one-liner confirmed |
| NOTIF-02 | Browser subscribe flow: permission → pushManager → POST | applicationServerKey Uint8Array conversion pattern documented below |
| NOTIF-03 | Service worker push event handler + notificationclick | SW push event shape + showNotification options documented below |
| NOTIF-04 | POST /api/push/subscribe — auth + KV store | verifyAdminSession return shape confirmed; kvSet signature confirmed |
| NOTIF-05 | dispatchPushNotifications inside after() with Telegram fallback | exact insertion point in route.js identified; team_numbers.active column confirmed |
</phase_requirements>

---

## Summary

Phase 10 adds web push notifications to the CRM PWA. When a WhatsApp message arrives, the webhook's existing `after()` callback dispatches push notifications to all active team members. Each team member has a subscription stored in KV under `push:sub:{teamMemberId}`. If no subscription exists, Telegram fallback fires using the existing `telegramSendMessage()` pattern from `lib/telegram.js`.

The stack is straightforward: `web-push@3.6.7` (server-side VAPID crypto only, not yet in package.json), a vanilla JS service worker at `public/sw.js`, and a client component in the CRM settings screen for the subscribe button. All three layers are independent and can be built in sequence.

**Primary recommendation:** Follow the locked decisions exactly. The codebase patterns (KV, adminAuth, telegram, after()) are all confirmed and fit the plan without adaptation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| web-push | 3.6.7 (latest) | VAPID signing + sendNotification server-side | Only mature Node.js VAPID library; locked decision |
| Web Push API (browser) | native | pushManager.subscribe + PushSubscription | No npm package needed browser-side |
| Service Worker API | native | SW registration, push event, notificationclick | Built into browsers; no library |

**Installation (not yet in package.json):**
```bash
npm install web-push@^3.6.7
```

**Version verified:** `npm view web-push version` returns `3.6.7` (2026-06-23). This is also the latest version — no newer release exists.

---

## Architecture Patterns

### Recommended File Structure
```
public/
└── sw.js                         # Service worker (push handler + notificationclick)

lib/
└── pushNotifications.js          # dispatchPushNotifications() — server-side dispatch

app/api/push/
└── subscribe/
    └── route.js                  # POST /api/push/subscribe

app/(crm)/admin/(protected)/kit/
└── screens-settings.jsx          # Add "Notifications" row to INTEGRATIONS section (already exists)
└── push-subscribe.jsx            # Client component: permission + pushManager.subscribe
```

### Pattern 1: VAPID Setup (server-side, called once at module level)
```javascript
// lib/pushNotifications.js
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:kierandeclanredpath@gmail.com",   // subject — NOT localhost; Safari rejects localhost
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
```

**Pitfall:** If `subject` is `https://localhost`, Safari on iOS rejects with `BadJwtToken`. Use `mailto:` or the production domain.

### Pattern 2: sendNotification call shape
```javascript
// Source: web-push README (github.com/web-push-libs/web-push)
const subscription = {
  endpoint: "https://fcm.googleapis.com/...",   // from PushSubscription.toJSON()
  keys: {
    p256dh: "...",
    auth: "..."
  }
};

const payload = JSON.stringify({
  title: "💬 New WhatsApp",
  body: "John Smith: Hey I'm interested...",
  data: { threadId: "uuid", url: "/admin/whatsapp?thread=uuid" }
});

await webpush.sendNotification(subscription, payload);
// sendNotification(pushSubscription, payload, options?)
// payload MUST be JSON.stringify()'d — it's a string, not an object
```

**Critical:** `payload` is `string | Buffer`. Pass `JSON.stringify(obj)`, never a raw object.

### Pattern 3: Browser subscribe flow
```javascript
// Source: MDN + iOS 16.4 verified pattern
// 1. Request permission (must be inside a user gesture — button click)
const permission = await Notification.requestPermission();
if (permission !== "granted") return;

// 2. Base64url → Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// 3. Subscribe
const sw = await navigator.serviceWorker.ready;
const sub = await sw.pushManager.subscribe({
  userVisibleOnly: true,                                       // required — false throws in all browsers
  applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
});

// 4. POST subscription JSON to API
const subJson = sub.toJSON();
// subJson shape: { endpoint: string, keys: { p256dh: string, auth: string } }
await fetch("/api/push/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ subscription: subJson, teamMemberId: "..." })
});
```

**iOS 16.4+ requirements:**
- App MUST be installed to Home Screen (standalone mode) — CSS gate `@media (display-mode: standalone)` is correct
- `requestPermission()` MUST be called inside a user gesture (button click) — async chains that start outside a gesture fail silently
- iOS 16.x requires user to manually enable: Settings > Safari > Advanced > Experimental Features > Notifications
- iOS 17+ has it on by default in standalone PWAs

### Pattern 4: Service worker push event handler
```javascript
// public/sw.js

self.addEventListener("push", (event) => {
  // event.data.json() parses the JSON.stringify()'d payload
  const data = event.data?.json() ?? {};
  const title = data.title ?? "New message";
  const options = {
    body: data.body ?? "",
    data: data.data ?? {},          // arbitrary data passed to notificationclick
    icon: "/icon-192.png",          // optional — use a real icon path or omit
    badge: "/icon-192.png"          // optional — small monochrome icon on Android
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin/whatsapp";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.focus();
          // Navigate to thread URL in existing window
          client.postMessage({ type: "navigate", url });
          return;
        }
      }
      // No existing window — open new one
      return clients.openWindow(url);
    })
  );
});
```

**`event.data.json()` shape:** Whatever was `JSON.stringify()`'d as payload. With the locked payload shape it returns:
```json
{ "title": "...", "body": "...", "data": { "threadId": "...", "url": "..." } }
```

### Pattern 5: Next.js 15 App Router SW registration
```javascript
// Client component — e.g. app/(crm)/admin/(protected)/kit/push-register.jsx
"use client";
import { useEffect } from "react";

export function PushServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;            // guards SSR — useEffect never runs server-side
    if (!("serviceWorker" in navigator)) return;          // guards non-SW browsers
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  }, []);
  return null;
}
```

**SSR safety:** `useEffect` runs only in the browser. `navigator.serviceWorker` is never accessed during SSR. No `typeof window` guard is technically required inside `useEffect`, but the explicit check is defensive and harmless.

**Registration location:** The CRM protected layout (`app/(crm)/admin/(protected)/layout.jsx`) is a Server Component. It cannot use `useEffect`. Options:
1. Add `<PushServiceWorkerRegistrar />` as a `"use client"` child of the protected layout (cleanest)
2. Add to `app/(crm)/admin/(protected)/kit/app.jsx` which is already `"use client"` and imported by the protected pages

Option 2 is lower effort — `app.jsx` already uses `useEffect`.

### Anti-Patterns to Avoid
- **Calling `navigator.serviceWorker` outside `useEffect`:** Causes `ReferenceError` during SSR in Next.js
- **Raw object as sendNotification payload:** Must `JSON.stringify()` the payload — web-push sends a string
- **`userVisibleOnly: false`:** Throws `NotSupportedError` in all browsers — always `true`
- **Setting VAPID subject to `https://localhost`:** Safari/iOS rejects with `BadJwtToken` at push send time
- **Reading `push:sub:{teamMemberId}` and assuming it's an object:** `kvGet` calls `maybeParseJson` — values stored via `kvSet` with `JSON.stringify` round-trip correctly, but verify the stored shape is `{ endpoint, keys: { p256dh, auth } }`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VAPID signing | Custom EC key crypto | `web-push` | ECDH, JWT, encryption — 200+ lines of crypto |
| Base64url → Uint8Array | Custom decoder | 8-line `urlBase64ToUint8Array()` inline | Simple enough to inline; no package needed |
| Telegram dispatch | New HTTP wrapper | `telegramSendMessage()` from `lib/telegram.js` | Already exists, tested, handles parse_mode HTML |

---

## KV Function Signatures (from lib/kv.js — verified)

```javascript
// lib/kv.js — confirmed function signatures

kvSet(key, value)
// Serialises value via JSON.stringify internally (see kvFetch body)
// Returns the Upstash REST result string on success
// key: string, value: any (will be JSON.stringify'd)

kvGet(key)
// Returns maybeParseJson(result) — auto-parses JSON strings, objects, arrays
// Returns null if key not found

kvKeys(pattern)
// Returns string[] of matching keys (glob pattern via Upstash KEYS command)

hasKv()
// Returns boolean — false when KV_REST_API_URL / KV_REST_API_TOKEN not set
```

**Storage pattern for subscriptions:**
```javascript
// Store:
await kvSet(`push:sub:${teamMemberId}`, { endpoint, keys: { p256dh, auth } });
// kvSet JSON.stringify's the value internally

// Read:
const sub = await kvGet(`push:sub:${teamMemberId}`);
// kvGet auto-parses via maybeParseJson — returns the object directly
// sub is { endpoint, keys: { p256dh, auth } } or null
```

**No TTL:** `kvSet` does NOT accept a TTL option (no third argument). Push subscriptions are permanent until explicitly deleted. This matches the locked decision (no unsubscribe in Phase 10). If a subscription expires/becomes invalid, the push send will throw a 410 Gone — catch and `kvDel` the stale key.

---

## Exact Insertion Point in route.js (from app/api/webhooks/whatsapp/route.js — verified)

```javascript
// Current after() callback (lines 54-61):
after(async () => {
  try {
    const payload = JSON.parse(rawBody);
    await handlePayload(payload);
  } catch (err) {
    console.error("[webhook][whatsapp][after-error]", err);
  }
});
```

`handlePayload()` calls `processInboundMessage()` which returns `{ threadId, crmLeadId, crmClientId }`.

**Insertion point:** Modify `handlePayload` to return the result from `processInboundMessage`, then call `dispatchPushNotifications()` with that data:

```javascript
// In handlePayload — after processInboundMessage returns:
const result = await processInboundMessage({ ... });
if (result?.threadId) {
  await dispatchPushNotifications({
    threadId: result.threadId,
    contactName: contactName,
    preview: preview   // already computed in processInboundMessage as (body || `[${type}]`).slice(0, 200)
  });
}
```

Or alternatively, call `dispatchPushNotifications()` in the `after()` callback directly alongside `handlePayload()`, passing the raw message fields. Both approaches work — parallel to processInboundMessage is cleaner for Phase 10 since dispatch doesn't depend on DB write completing.

**Caution:** `after()` runs inside the same `runtime = "nodejs"` context, so `web-push` (Node.js crypto) is available.

---

## team_numbers Schema (from db/migrations/001-schema.sql — verified)

```sql
CREATE TABLE IF NOT EXISTS team_numbers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id           TEXT UNIQUE NOT NULL,     -- "27821234567"
  phone_number_id TEXT UNIQUE NOT NULL,     -- Meta Phone Number ID
  display_name    TEXT NOT NULL,
  active          BOOLEAN DEFAULT true,     -- <-- confirmed column name
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

**Active filter query:**
```sql
SELECT id, wa_id, display_name FROM team_numbers WHERE active = true;
```

**Column name confirmed: `active` (BOOLEAN).** Not `is_active`. The CONTEXT.md said "query team_numbers for active team members" — the column is `active`.

**Important:** `team_numbers` stores team phone numbers, not team member user IDs. The KV key `push:sub:{teamMemberId}` uses `teamMemberId`. The dispatch loop must decide how to map `wa_id` → `teamMemberId` for the KV lookup. The cleanest approach: use `wa_id` as the `teamMemberId` key component (i.e., `push:sub:{wa_id}`), or store a mapping. This requires a decision in planning — see Open Questions.

---

## Telegram Send Pattern (from lib/telegram.js + app/api/lead/route.js — verified)

```javascript
// lib/telegram.js exports:
export async function telegramSendMessage({ chatId, text, replyMarkup, disableWebPagePreview, token })
// - chatId: string (from env var)
// - text: string (HTML, parse_mode is always "HTML")
// - replyMarkup: optional inline_keyboard object
// - token: optional — falls back to process.env.TELEGRAM_BOT_TOKEN

// For the WhatsApp notification fallback, use:
import { telegramSendMessage } from "@/lib/telegram";

await telegramSendMessage({
  chatId: process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID,
  token: process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN,
  text: `💬 <b>New WhatsApp</b>\n<b>${contactName}</b>: ${preview}\n\n<a href="${threadUrl}">Open thread</a>`
});
```

**Env vars (from app/api/lead/route.js — verified):**
- `TELEGRAM_MC_CHAT_ID` (primary) or `TELEGRAM_CHAT_ID` (fallback)
- `TELEGRAM_MC_BOT_TOKEN` (primary) or `TELEGRAM_BOT_TOKEN` (fallback)

The WhatsApp fallback should use the M&C bot (not the Izimoto bot) since these are team notifications, not quote notifications.

---

## verifyAdminSession Return Shape (from lib/adminAuth.js — verified)

```javascript
export async function verifyAdminSession(token) {
  // Returns null on failure (invalid token, expired, missing secret)
  // Returns { username: string, exp: number } on success
}
```

**Critical finding: `verifyAdminSession` does NOT return a team member ID.** It returns `{ username, exp }` where `username` is the string stored in the session cookie payload field `u`.

**For `POST /api/push/subscribe`:** The route cannot derive `teamMemberId` from the session alone. Options:
1. The client sends `teamMemberId` in the POST body (client knows its own ID from the index data)
2. The username is used as the key: `push:sub:{username}`

The CONTEXT.md says `push:sub:{teamMemberId}` — if the subscribe endpoint needs to map to a team member, the client must send the ID. The subscribe API should accept `{ subscription, teamMemberId }` in the POST body, and verify that the `teamMemberId` belongs to the authenticated session (or accept any authenticated admin session to subscribe for themselves).

**How to read the token in an API route:**
```javascript
// app/api/push/subscribe/route.js
import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const { subscription, teamMemberId } = body;
  // session.username is available but not the teamMemberId
  // teamMemberId comes from the client POST body
  ...
}
```

---

## KV vs Neon for Subscriptions (confirmed correct call)

The schema (`db/migrations/001-schema.sql` lines 51-60) has a `push_subscriptions` Neon table created "per FOUND-07" (schema created ahead of time). However, the CONTEXT.md explicitly locks KV as the store for `push:sub:{teamMemberId}`.

**KV is the right call for Phase 10.** Reasons:
1. The locked decision is explicit and intentional
2. KV lookups are O(1) by key — faster than a Neon query per team member in the dispatch loop
3. The `clientByPhone` and session patterns already use KV for exactly this kind of fast lookup
4. The Neon `push_subscriptions` table was pre-created per FOUND-07 (schema-forward migration strategy) but is NOT used in this phase
5. The Neon table stores by `device_id` (not `teamMemberId`), which is a different data model — it would require a JOIN or secondary lookup

**Conclusion:** Use `kvGet("push:sub:{teamMemberId}")` for dispatch. Ignore the Neon table in Phase 10.

---

## Settings Screen Integration (from screens-settings.jsx — verified)

The existing settings screen has an `INTEGRATIONS` section with a "Telegram" row. The subscribe button should be added to this section as a "Push notifications" row.

The component accepts no props for push state — a new row handler will need to:
1. Check `Notification.permission` (and `window.matchMedia("(display-mode: standalone)")`)
2. Call the subscribe flow on click

The `sections` array is built inline in the component — adding a row is a straightforward array push to the INTEGRATIONS section. The CSS class pattern (`set-row`, `ic`, `lbl`, `name`, `meta`) is established.

---

## Common Pitfalls

### Pitfall 1: VAPID Subject is localhost
**What goes wrong:** Safari on iOS rejects push send with `BadJwtToken` error
**Why it happens:** Apple's APNs validates the JWT subject; `localhost` is not a valid HTTPS origin for production
**How to avoid:** Use `mailto:` address as subject in `setVapidDetails()`
**Warning signs:** Push sends work on Chrome/Android but fail silently (or throw) on iOS Safari

### Pitfall 2: payload is not JSON.stringify'd
**What goes wrong:** `event.data.json()` throws in the service worker; notification shows empty or crashes
**Why it happens:** `sendNotification` sends the payload as-is; if it's an object, it sends `[object Object]`
**How to avoid:** Always `JSON.stringify()` the payload object before passing to `sendNotification`

### Pitfall 3: kvSet does not support TTL
**What goes wrong:** Developer tries `kvSet(key, value, { ex: 86400 })` — third argument is silently ignored
**Why it happens:** `lib/kv.js kvSet` takes exactly two arguments; no options object
**How to avoid:** For TTL-gated keys, call `kvExpire(key, seconds)` after `kvSet`

### Pitfall 4: userVisibleOnly: false throws
**What goes wrong:** `NotSupportedError: The subscribe() method requires a userVisibleOnly: true option`
**Why it happens:** All major browsers mandate this — background/silent pushes are rejected
**How to avoid:** Always pass `userVisibleOnly: true`

### Pitfall 5: SW registration on Server Component
**What goes wrong:** `navigator` is not defined during RSC render
**Why it happens:** `app/(crm)/admin/(protected)/layout.jsx` is a Server Component — no browser globals
**How to avoid:** Registration must be in a `"use client"` component inside `useEffect`

### Pitfall 6: iOS requires standalone mode + user gesture
**What goes wrong:** `requestPermission()` silently fails or returns `denied` on iOS
**Why it happens:** iOS only allows push permission in an installed PWA, and only from a direct user gesture
**How to avoid:** Gate subscribe button behind `window.matchMedia("(display-mode: standalone)").matches`; ensure the button click directly calls `requestPermission()`

### Pitfall 7: team_numbers has no user/session link
**What goes wrong:** dispatch loop queries team_numbers rows but can't derive KV key without knowing how `teamMemberId` maps to `wa_id`
**Why it happens:** team_numbers stores WhatsApp phone numbers, not CRM user IDs
**How to avoid:** Use `wa_id` as the teamMemberId in `push:sub:{wa_id}`, or document the mapping at subscribe time (client sends its own `wa_id` in the POST body)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | web-push (server) | Yes | runtime env | — |
| web-push npm package | VAPID server send | No (not installed) | — | Must install: `npm install web-push@^3.6.7` |
| VAPID_PUBLIC_KEY env var | subscribe flow | Needs generation | — | Generate with one-liner below |
| VAPID_PRIVATE_KEY env var | sendNotification | Needs generation | — | Generate with one-liner below |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | browser subscribe | Needs generation | — | Same key as VAPID_PUBLIC_KEY, different env var name |
| Neon DATABASE_URL | team_numbers query | Yes (Vercel) / No (local) | — | Skip dispatch locally (hasNeon() guard) |
| KV env vars | subscription storage | Yes (Vercel) / No (local) | — | Skip dispatch locally (hasKv() guard) |

**Missing dependencies with no fallback:**
- `web-push` npm package — must be installed before implementation (`npm install web-push@^3.6.7`)
- VAPID keys — must be generated and added to Vercel env vars before testing

**VAPID key generation one-liner (from CONTEXT.md):**
```bash
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(JSON.stringify(k,null,2))"
```
Run after `npm install web-push`. Add output to `.env.local` (dev) and Vercel dashboard (prod).

---

## Open Questions

1. **teamMemberId mapping in dispatch loop**
   - What we know: `team_numbers` has `wa_id` (phone), not a CRM user ID. The KV key is `push:sub:{teamMemberId}`.
   - What's unclear: Should `teamMemberId` == `wa_id` (phone number), or is there a separate team member ID in KV/index data?
   - Recommendation: Use `wa_id` as the `teamMemberId`. At subscribe time, the client sends its own `wa_id` (it knows which team number it manages from the index). Planner should confirm this mapping and document it in the plan.

2. **One subscription per team member vs per device**
   - What we know: CONTEXT says `push:sub:{teamMemberId}` — one entry per member, not per device
   - What's unclear: If a team member subscribes from two devices (phone + tablet), the second subscribe overwrites the first
   - Recommendation: Accept this limitation in Phase 10 (V1). It matches the locked decision. Note in plan that a future phase can add `push:subs:{teamMemberId}` as a set.

---

## Sources

### Primary (HIGH confidence)
- `lib/kv.js` — verified kvSet/kvGet signatures, confirmed no TTL option in kvSet
- `lib/adminAuth.js` — verified verifyAdminSession returns `{ username, exp }`, confirmed no teamMemberId in return value
- `app/api/webhooks/whatsapp/route.js` — confirmed after() structure, identified exact insertion point
- `db/migrations/001-schema.sql` — confirmed team_numbers.active BOOLEAN column; confirmed push_subscriptions Neon table exists but is not used
- `app/api/lead/route.js` — confirmed telegramSendMessage import pattern, Telegram env var names
- `lib/telegram.js` — confirmed telegramSendMessage signature
- `lib/whatsappStore.js` — confirmed processInboundMessage return shape `{ threadId, crmLeadId, crmClientId }`
- `app/(crm)/admin/(protected)/kit/screens-settings.jsx` — confirmed sections/rows data structure for INTEGRATIONS section
- `app/(crm)/admin/(protected)/layout.jsx` — confirmed it's a Server Component (no useEffect possible)
- npm registry (`npm view web-push version`) — confirmed 3.6.7 is current latest

### Secondary (MEDIUM confidence)
- [web-push README](https://github.com/web-push-libs/web-push/blob/master/README.md) — sendNotification signature, subscription shape, setVapidDetails
- [iOS/iPadOS PWA Notifications](https://monogram.io/blog/notifications-from-ios-and-ipados-pwas) — iOS 16.4 gotchas, standalone requirement

### Tertiary (LOW confidence)
- None — all critical claims verified against codebase files or official sources

---

## Metadata

**Confidence breakdown:**
- KV functions: HIGH — read directly from source
- adminAuth shape: HIGH — read directly from source
- Webhook insertion point: HIGH — read directly from source
- team_numbers schema: HIGH — read directly from source
- Telegram pattern: HIGH — read directly from source
- web-push sendNotification: HIGH — verified against README
- Browser subscribe flow: HIGH — MDN + web-push README
- iOS 16.4 gotchas: MEDIUM — multiple community sources, consistent findings

**Research date:** 2026-06-23
**Valid until:** 2026-09-23 (stable APIs; iOS PWA support may evolve faster — re-check if targeting iOS 17+ features)
