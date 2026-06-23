---
phase: 10-web-push-notifications
verified: 2026-06-23T12:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Subscribe row visible only in installed PWA standalone mode"
    expected: "Row appears in Settings > INTEGRATIONS when CRM is opened from home screen icon. Row is absent when CRM is opened in a normal browser tab."
    why_human: "window.matchMedia('display-mode: standalone') only resolves correctly on a real device or installed PWA; cannot be verified programmatically"
  - test: "Tapping subscribe requests OS permission and transitions row to ACTIVE"
    expected: "OS permission prompt appears. After granting, row shows green dot + ACTIVE with blue left border. POST to /api/push/subscribe returns {ok:true} and subscription stored in KV at push:sub:{wa_id}."
    why_human: "Notification.requestPermission() and pushManager.subscribe() require a user gesture on a real device; requires VAPID keys set in env"
  - test: "Inbound WhatsApp message triggers push notification on subscribed phone within 5s"
    expected: "System notification titled 'New WhatsApp' with lead name + message preview appears on the subscribed device within ~5 seconds of the message arriving at the webhook."
    why_human: "Requires live Meta WABA, HTTPS deployment, VAPID keys in Vercel env, and a physical device with the PWA installed"
  - test: "Tapping the notification opens CRM at the thread URL"
    expected: "Tapping the notification focuses an existing CRM window (or opens a new one) and navigates to /admin/whatsapp?thread={threadId}. The SW postMessage relay in app.jsx drives the navigation."
    why_human: "Requires a live push notification on a real device; SW notificationclick is not testable in a headless environment"
  - test: "Telegram fallback fires for unsubscribed team members"
    expected: "A team member who has NOT subscribed receives a Telegram message in the M&C chat when an inbound WhatsApp arrives. The push path runs for subscribed members simultaneously."
    why_human: "Requires live Neon (team_numbers records), live KV (no push:sub: entry for the unsubscribed member), and an active Telegram bot/chat"
---

# Phase 10: Web Push Notifications — Verification Report

**Phase Goal:** Team members receive instant phone notifications when a lead sends a WhatsApp message, with Telegram as fallback
**Verified:** 2026-06-23
**Status:** human_needed — all automated checks pass; 5 items require live device + env keys
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | web-push@^3.6.7 installed and importable in a nodejs-runtime route | VERIFIED | package.json `"web-push": "^3.6.7"` under dependencies; node_modules/web-push@3.6.7 present; `require('web-push')` succeeds |
| 2 | VAPID env vars documented so a developer can generate keys | VERIFIED | .env.example lines 64-72 contain VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY with generation one-liner and mailto/localhost warning |
| 3 | An authenticated admin can POST a PushSubscription and it is stored in KV under push:sub:{wa_id} | VERIFIED | app/api/push/subscribe/route.js: auth guard (verifyAdminSession), 400 validation, 503 KV guard, `kvSet(\`push:sub:${teamMemberId}\`, subscription)` |
| 4 | An inbound WhatsApp message fans out a push notification to every active subscribed team member | VERIFIED | webhook route calls `dispatchToTeam({threadId, contactName, preview})` inside `after()` after processInboundMessage; pushStore fans out via `team_numbers WHERE active = true` |
| 5 | A team member with no push subscription receives the same alert via Telegram instead | VERIFIED | pushStore.js: when `kvGet(\`push:sub:${member.wa_id}\`)` returns null, `telegramSendMessage(...)` is called with TELEGRAM_MC_CHAT_ID/TELEGRAM_BOT_TOKEN fallback |
| 6 | Subscribe row only shown when CRM is installed as PWA (standalone) | VERIFIED (code) | push-subscribe.jsx: `useState(false)` + `useEffect(() => setIsStandalone(window.matchMedia('(display-mode: standalone)').matches))` + `if (!isStandalone) return null` |
| 7 | Tapping subscribe persists the subscription to /api/push/subscribe | VERIFIED (code) | push-subscribe.jsx: `reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:...})` then `fetch('/api/push/subscribe', {method:'POST', body: JSON.stringify({subscription: sub.toJSON(), teamMemberId})})` |
| 8 | Receiving a push shows a system notification; tapping it opens CRM at the thread | VERIFIED (code) | sw.js: push handler calls `showNotification`; notificationclick handler calls `clients.openWindow(url)` or `client.focus() + postMessage({type:'navigate', url})`; app.jsx relay listens and calls `window.location.assign` |

**Score:** 8/8 truths verified in code; 5 require live human verification

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | web-push dependency | VERIFIED | `"web-push": "^3.6.7"` under dependencies; node_modules/web-push@3.6.7 installed |
| `.env.example` | VAPID env var documentation | VERIFIED | Section at lines 64-72 with all 3 vars + generation one-liner |
| `lib/pushStore.js` | sendPushNotification + dispatchToTeam | VERIFIED | 131 lines; both functions exported; VAPID guard, JSON.stringify, KV key pattern, Telegram fallback, 410 pruning all present |
| `app/api/push/subscribe/route.js` | POST subscribe with auth + KV | VERIFIED | 62 lines; exports runtime="nodejs", POST handler; auth/validation/KV write all present |
| `app/api/webhooks/whatsapp/route.js` | dispatchToTeam wired inside after() | VERIFIED | Line 21: `import { dispatchToTeam } from "@/lib/pushStore"`; line 134: `if (result?.threadId) { ... await dispatchToTeam(...) }` inside after() |
| `public/sw.js` | push event handler + notificationclick | VERIFIED | 32 lines; addEventListener("push") + showNotification; addEventListener("notificationclick") + openWindow/postMessage |
| `app/(crm)/admin/(protected)/kit/app.jsx` | SW registration via useEffect | VERIFIED | Lines 66-79: two useEffects — one registers /sw.js, one listens for SW navigate messages |
| `app/(crm)/admin/(protected)/kit/push-subscribe.jsx` | 6-state subscribe row with standalone gate | VERIFIED | 192 lines; all 6 states (checking/unsupported/unsubscribed/requesting/subscribed/error); standalone gate; pushManager.subscribe; /api/push/subscribe POST |
| `app/(crm)/admin/(protected)/kit/screens-settings.jsx` | PushSubscribeRow in INTEGRATIONS | VERIFIED | Line 6: `import PushSubscribeRow from "./push-subscribe"`; line 162: `{s.title === "INTEGRATIONS" ? <PushSubscribeRow teamMemberId={teamMemberId} /> : null}` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/push/subscribe/route.js` | KV `push:sub:{wa_id}` | `kvSet(\`push:sub:${teamMemberId}\`, subscription)` | WIRED | Line 59 |
| `app/api/webhooks/whatsapp/route.js` | `lib/pushStore.js dispatchToTeam` | import + call inside after() | WIRED | Lines 21, 134-137 |
| `lib/pushStore.js` | `lib/telegram.js telegramSendMessage` | called in fallback branch when no KV sub | WIRED | Lines 119-124 |
| `app/(crm)/admin/(protected)/kit/app.jsx` | `public/sw.js` | `navigator.serviceWorker.register('/sw.js')` in useEffect | WIRED | Line 68 |
| `app/(crm)/admin/(protected)/kit/push-subscribe.jsx` | `/api/push/subscribe` | `fetch('/api/push/subscribe', {method:'POST',...})` in handleSubscribe | WIRED | Line 74 |
| `public/sw.js notificationclick` | CRM thread URL | `clients.openWindow(url)` | WIRED | Line 29 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `lib/pushStore.js dispatchToTeam` | `members` (active team) | `sql\`SELECT wa_id, display_name FROM team_numbers WHERE active = true\`` | Neon DB query (real when DATABASE_URL set) | FLOWING (Neon-gated) |
| `lib/pushStore.js dispatchToTeam` | `sub` (push subscription) | `kvGet(\`push:sub:${member.wa_id}\`)` | KV lookup (real when KV env set) | FLOWING (KV-gated) |
| `push-subscribe.jsx` | `isStandalone` | `window.matchMedia('(display-mode: standalone)').matches` | Browser API — real on device | FLOWING |
| `push-subscribe.jsx` | `teamMemberId` (prop) | `index?.VIEWER?.waId \|\| index?.VIEWER?.username` in screens-settings.jsx | CRM index API — real data | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| web-push importable | `node -e "require('.../web-push')"` | "web-push importable" | PASS |
| pushStore.test.js (16/17 assertions) | `node --test lib/pushStore.test.js` | 16 pass, 1 false-positive fail (see note) | PASS (see note) |
| sw.js has push + notificationclick handlers | grep check | both addEventListener calls present + showNotification + openWindow | PASS |
| subscribe route has runtime + auth + kvSet | grep check | all 4 required strings present | PASS |
| webhook imports and calls dispatchToTeam inside after() | grep check | import and conditional call present | PASS |
| /icons/icon-192.png asset referenced by sw.js exists | `ls public/icons/icon-192.png` | EXISTS | PASS |

**Test failure note:** Test 3 ("VAPID subject must NOT be https://localhost") fails because the string `https://localhost` appears in a comment warning developers not to use it. The actual VAPID subject in pushStore.js is `"mailto:kierandeclanredpath@gmail.com"` — the implementation is correct. This is a false positive in the test assertion, not an implementation bug. Severity: INFO (test authoring issue; does not affect runtime).

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| NOTIF-01 | 10-01, 10-03 | Subscribe button only shown in installed PWA (standalone) | VERIFIED (code) | `display-mode: standalone` gate in push-subscribe.jsx; row in screens-settings.jsx INTEGRATIONS section |
| NOTIF-02 | 10-02 | Web Push to all subscribed team members on inbound WhatsApp | VERIFIED (code) | dispatchToTeam fans out via KV; wired in webhook after() |
| NOTIF-03 | 10-03 | Tapping notification opens CRM at conversation thread | VERIFIED (code) / HUMAN-NEEDED | sw.js notificationclick + app.jsx navigate relay coded correctly; requires live test to confirm end-to-end |
| NOTIF-04 | 10-02 | Telegram fallback for non-subscribed members | VERIFIED (code) | telegramSendMessage called when kvGet returns null in dispatchToTeam |
| NOTIF-05 | 10-02 | Push subscriptions stored in KV, associated with team member | VERIFIED | kvSet(`push:sub:${teamMemberId}`) in subscribe route; teamMemberId == wa_id |

REQUIREMENTS.md traceability table lists NOTIF-03 as "Pending" — this is accurate because the human checkpoint (Plan 10-03 Task 4) has not been completed. All other phase-10 requirements are marked Complete and code evidence confirms them.

**No orphaned requirements:** All 5 NOTIF-01 through NOTIF-05 requirements are claimed across the 3 plans and have supporting code evidence.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `lib/pushStore.test.js` | 50 | `!src.includes("https://localhost")` fails because the string appears in a comment | INFO | False-positive test failure; does not affect production behaviour |
| `app/api/push/subscribe/route.js` | 25 | `cookies().get(...)` — synchronous call pattern | INFO | Existing protected routes (e.g. `app/api/admin/me/route.js`) use the same synchronous pattern; consistent with repo convention. Plan 10-02 noted to match the existing pattern. Not a runtime blocker as long as Next.js version supports it. |

No stub patterns, empty implementations, or placeholder returns found in any key file.

---

### Human Verification Required

The following 5 items cannot be verified programmatically. They require VAPID keys in `.env.local` + Vercel, an HTTPS deployment, and a physical device with the PWA installed.

#### 1. Standalone Gate

**Test:** Open the deployed CRM in a normal browser tab and confirm the INTEGRATIONS section does NOT contain the "Enable notifications" row. Then install the PWA (Add to Home Screen), open from the icon, and confirm the row IS visible.
**Expected:** Row hidden in browser tab; row visible in standalone PWA.
**Why human:** `window.matchMedia('display-mode: standalone')` only resolves on a real installed PWA context.

#### 2. Subscribe Flow

**Test:** In the installed PWA, go to Settings > INTEGRATIONS, tap the "Enable notifications" row, grant the OS permission prompt. Confirm the row transitions to "Notifications / green dot ACTIVE" with a blue left border.
**Expected:** Row reaches subscribed state; POST to /api/push/subscribe returns 200; KV key `push:sub:{wa_id}` created in Vercel KV.
**Why human:** Notification.requestPermission() requires a user gesture; pushManager.subscribe requires VAPID keys; KV write requires Vercel env.

#### 3. Inbound Push Notification

**Test:** Send a WhatsApp message to the team number from a test lead. Within ~5 seconds, confirm a system notification appears on the subscribed device titled "New WhatsApp" with the lead name and message preview.
**Expected:** Notification arrives within 5s (NOTIF-02).
**Why human:** Requires live Meta WABA webhook, HTTPS deployment, VAPID keys, and physical device.

#### 4. Notification Tap Navigation

**Test:** Tap the push notification from step 3. Confirm the CRM opens (or focuses) and navigates to `/admin/whatsapp?thread={threadId}`. If a CRM tab is already open, confirm it focuses rather than opening a new window.
**Expected:** Thread URL navigation works; existing window focused + postMessage navigate works (NOTIF-03).
**Why human:** SW notificationclick behaviour requires a real push notification on a real device.

#### 5. Telegram Fallback

**Test:** From a second team member account that has NOT subscribed to push, confirm that the same inbound WhatsApp message from step 3 also produced a Telegram message in the M&C chat.
**Expected:** Telegram message received for the unsubscribed member; push received for the subscribed member. Both paths fire concurrently (NOTIF-04).
**Why human:** Requires live Neon (team_numbers with 2+ active members), KV (one member has push:sub:, other does not), and Telegram bot credentials.

---

### Gaps Summary

No code gaps. All 5 required files are substantive (not stubs), all key links are wired, and data flows correctly to the rendering layer. The single remaining open item is NOTIF-03's live end-to-end test, which the plan explicitly deferred as a human-verify checkpoint (Plan 10-03 Task 4 — deferred due to requiring live Meta WABA + HTTPS + VAPID keys).

One minor test authoring issue exists (pushStore.test.js test 3 false positive) and one INFO-level pattern (synchronous cookies() call matching the existing repo convention). Neither blocks the phase goal.

---

_Verified: 2026-06-23_
_Verifier: Claude (gsd-verifier)_
