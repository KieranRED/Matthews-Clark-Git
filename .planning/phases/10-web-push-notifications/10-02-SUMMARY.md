---
phase: 10-web-push-notifications
plan: "02"
subsystem: notifications
tags: [web-push, vapid, telegram-fallback, kv, neon, webhook]
dependency_graph:
  requires: ["10-01"]
  provides: ["pushStore", "push-subscribe-api", "webhook-dispatch"]
  affects: ["app/api/webhooks/whatsapp/route.js", "lib/pushStore.js", "app/api/push/subscribe/route.js"]
tech_stack:
  added: ["web-push@^3.6.7 (server-side VAPID)"]
  patterns: ["KV push:sub:{wa_id} subscription store", "Telegram fallback when no KV sub", "source-text assertions (Phase 09 pattern)"]
key_files:
  created:
    - lib/pushStore.js
    - lib/pushStore.test.js
    - app/api/push/subscribe/route.js
    - app/api/webhooks/whatsapp/route.js
    - lib/neon.js
    - lib/whatsappStore.js
  modified: []
decisions:
  - "teamMemberId == wa_id: KV key is push:sub:{wa_id}; subscribe client must POST its wa_id in the request body"
  - "VAPID subject is mailto:kierandeclanredpath@gmail.com — NOT https://localhost (Safari/iOS rejects localhost)"
  - "sendPushNotification returns { ok, gone } — dispatchToTeam calls kvDel on gone=true to prune stale 410 subscriptions"
  - "dispatchToTeam has per-member try/catch — one bad member cannot abort the fan-out loop"
  - "cookies() called without await — matches existing pattern in app/api/admin/me/route.js (Next 15.0.0)"
metrics:
  duration_minutes: 5
  completed_date: "2026-06-23"
  tasks_completed: 3
  files_created: 6
  tests_passing: 17
---

# Phase 10 Plan 02: Server-Side Push Layer Summary

**One-liner:** VAPID push dispatch (lib/pushStore.js) + KV subscribe endpoint + webhook wiring fans out to subscribed team members via web push with Telegram fallback for unsubscribed members.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for pushStore | d694d10 | lib/pushStore.test.js |
| 1 (GREEN) | lib/pushStore.js implementation | 1e33c42 | lib/pushStore.js, lib/neon.js, package.json |
| 2 | POST /api/push/subscribe route | 6b9c118 | app/api/push/subscribe/route.js |
| 3 | Wire dispatchToTeam into webhook | a48b50b | app/api/webhooks/whatsapp/route.js, lib/whatsappStore.js |

## Key Interfaces

### dispatchToTeam signature
```javascript
// lib/pushStore.js
export async function dispatchToTeam({ threadId, contactName, preview })
// threadId: string (UUID from processInboundMessage)
// contactName: string | null
// preview: string (message text or "[type]" for media)
```

### KV key format
```
push:sub:{wa_id}
// Example: push:sub:27821234567
// Value: { endpoint: string, keys: { p256dh: string, auth: string } }
```

### teamMemberId mapping (CRITICAL for Plan 10-03)
teamMemberId == wa_id. The subscribe button in Plan 10-03 must POST the team
member's wa_id as teamMemberId in the request body. This is the phone number
from team_numbers.wa_id (e.g. "27821234567").

### Notification payload shape (locked)
```javascript
{
  title: "New WhatsApp",
  body: `${contactName ?? "Lead"}: ${preview.slice(0, 80)}`,
  data: { threadId, url: `/admin/whatsapp?thread=${threadId}` }
}
```

## Success Criteria Met

- [x] NOTIF-02: inbound WhatsApp fans out push notifications to subscribed active team members
- [x] NOTIF-04: team members without a subscription get Telegram fallback instead
- [x] NOTIF-05: subscriptions persisted to KV at push:sub:{teamMemberId} (teamMemberId == wa_id)
- [x] All work runs inside existing after() deferral — webhook returns 200 in <500ms
- [x] 17/17 node --test tests pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Brought neon.js + whatsappStore.js into worktree**
- **Found during:** Task 1 (import resolution for node --test)
- **Issue:** Worktree branched from initial commit (c071aea); Phase 09 files absent
- **Fix:** Copied neon.js and whatsappStore.js from main repo into worktree
- **Files modified:** lib/neon.js (new), lib/whatsappStore.js (new)
- **Commit:** 1e33c42 (neon.js), a48b50b (whatsappStore.js)

**2. [Rule 1 - Bug] Fixed VAPID source-text test assertion**
- **Found during:** Task 1 GREEN phase run
- **Issue:** Test checked !src.includes("https://localhost") but pushStore.js has a comment mentioning "https://localhost" to explain why it must not be used. The test tripped on the comment.
- **Fix:** Changed assertion to regex-match the actual setVapidDetails() first argument, not a raw string search
- **Files modified:** lib/pushStore.test.js

## Known Stubs

None. dispatchToTeam no-ops locally via hasNeon/hasKv guards — this is intentional design, not a stub.

## Self-Check

## Self-Check: PASSED

All 6 created files confirmed on disk. All 4 task commits confirmed in git log.
