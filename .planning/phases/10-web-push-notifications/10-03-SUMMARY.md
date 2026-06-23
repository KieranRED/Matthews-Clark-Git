---
phase: 10-web-push-notifications
plan: 03
subsystem: ui
tags: [web-push, service-worker, pwa, notifications, vapid]

# Dependency graph
requires:
  - phase: 10-01
    provides: NEXT_PUBLIC_VAPID_PUBLIC_KEY env var and VAPID setup
  - phase: 10-02
    provides: POST /api/push/subscribe endpoint and dispatchToTeam server-side dispatch
provides:
  - public/sw.js: vanilla service worker handling push events (showNotification) and notificationclick (openWindow/postMessage navigate)
  - SW registration in CRM shell (app.jsx useEffect + navigate message relay)
  - push-subscribe.jsx: standalone-gated 6-state subscribe row component
  - Settings screen INTEGRATIONS section includes the push subscribe row
  - viewer.waId exposed from crm-kit API for teamMemberId identification
affects: [phase-11-whatsapp-tab, push-notifications, crm-settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Service worker registered in a "use client" component useEffect (never in Server Component)
    - SW postMessage relay for notificationclick navigate in existing window
    - Standalone PWA gate via window.matchMedia("(display-mode: standalone)").matches
    - 6-state UI state machine (checking/unsupported/unsubscribed/requesting/subscribed/error) for subscribe flow

key-files:
  created:
    - public/sw.js
    - app/admin/(protected)/kit/push-subscribe.jsx
  modified:
    - app/admin/(protected)/kit/app.jsx
    - app/admin/(protected)/kit/screens-settings.jsx
    - app/api/admin/crm-kit/route.js

key-decisions:
  - "icon path: /icons/icon-192.png (not /icon-192.png — file exists at public/icons/, not public/ root)"
  - "teamMemberId: prefers viewer.waId (= viewer.phone from teamStore), falls back to viewer.username — waId is viewer.phone exposed via crm-kit/route.js"
  - "PushSubscribeRow self-gates to null (returns null when !isStandalone) — rendered directly in INTEGRATIONS set-list, not via separate wrapper"

patterns-established:
  - "SW registration: useEffect with guard (!('serviceWorker' in navigator)) in existing 'use client' CRM component — no new component needed"
  - "SW navigate relay: second useEffect listens for e.data.type === 'navigate' and calls window.location.assign"
  - "Push subscribe state machine: checking -> unsubscribed (or unsupported) on mount, requesting on click, subscribed/error on resolve"

requirements-completed: [NOTIF-01, NOTIF-02, NOTIF-03]

# Metrics
duration: ~6min
completed: 2026-06-23
---

# Phase 10 Plan 03: Client Push Layer Summary

**Vanilla service worker (showNotification + openWindow), CRM SW registration, and a 6-state standalone-gated subscribe row wired into Settings INTEGRATIONS — completing the client half of the end-to-end push loop**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-06-23T11:50:00Z
- **Completed:** 2026-06-23T11:56:32Z
- **Tasks:** 3 of 4 complete (Task 4 is human-verify checkpoint — paused)
- **Files modified:** 5

## Accomplishments

- Service worker at public/sw.js handles `push` (showNotification with payload-driven title/body/tag/icon) and `notificationclick` (focus existing /admin window + postMessage navigate, or openWindow for new tab)
- CRM shell (app.jsx) registers /sw.js in a useEffect and relays SW navigate postMessages to window.location.assign
- push-subscribe.jsx: 6-state component (checking/unsupported/unsubscribed/requesting/subscribed/error), gated to null outside standalone PWA, runs full permission -> pushManager.subscribe -> POST flow inside click gesture per iOS requirement
- Settings INTEGRATIONS section now renders PushSubscribeRow adjacent to Telegram row — self-hides in normal browser tab

## Task Commits

1. **Task 1: Create public/sw.js** - `085cc1b` (feat)
2. **Task 2: Register SW in app.jsx** - `fa92db5` (feat)
3. **Task 3: push-subscribe.jsx + settings integration** - `9b0da2c` (feat)
4. **Task 4: Human verify** - PAUSED at checkpoint (awaiting verification)

## Files Created/Modified

- `public/sw.js` — Service worker: push handler (showNotification) + notificationclick (focus/openWindow + postMessage navigate)
- `app/admin/(protected)/kit/push-subscribe.jsx` — 6-state subscribe row component, standalone gate, urlBase64ToUint8Array helper inline
- `app/admin/(protected)/kit/app.jsx` — Added two useEffects: SW registration + SW navigate message relay
- `app/admin/(protected)/kit/screens-settings.jsx` — Imported PushSubscribeRow, renders inside INTEGRATIONS set-list
- `app/api/admin/crm-kit/route.js` — Exposes viewer.waId (= viewer.phone from teamStore) for teamMemberId

## Decisions Made

**teamMemberId identifier:** Used `viewer.waId` (= `viewer.phone` stored in KV teamStore) as the primary identifier, falling back to `viewer.username`. The `crm-kit/route.js` now exposes `waId: viewer.phone || null` in the safeViewer object. In practice, a team member must have their WhatsApp phone number stored as their `phone` field in teamStore for push subscriptions to correctly match the KV key (`push:sub:{wa_id}`) used by the dispatch loop in Plan 10-02. If `phone` is null, the system falls back to `username` — push dispatches will NOT find the subscription if username does not match what the dispatch loop expects (wa_id from team_numbers table). This gap should be resolved by ensuring team members' phone numbers are populated when they are created/edited.

**Icon path:** `/icons/icon-192.png` used (not `/icon-192.png`) — the file exists at `public/icons/icon-192.png`, not `public/icon-192.png`. This is correct for production.

**Standalone gate placement:** PushSubscribeRow self-gates to null (returns null when !isStandalone). Rendered directly in INTEGRATIONS set-list rather than wrapping the entire component call — the return null pattern achieves the same result as an outer wrapper.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Exposed viewer.waId in crm-kit API**
- **Found during:** Task 3 (push-subscribe.jsx)
- **Issue:** The `VIEWER` object from crm-kit did not expose `phone`/`wa_id`, making teamMemberId impossible to source from client state without an additional API call
- **Fix:** Added `waId: viewer.phone || null` to safeViewer in crm-kit/route.js. screens-settings.jsx reads `index.VIEWER.waId` and passes it as `teamMemberId` prop to PushSubscribeRow.
- **Files modified:** app/api/admin/crm-kit/route.js, app/admin/(protected)/kit/screens-settings.jsx
- **Committed in:** 9b0da2c (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical data exposure)
**Impact on plan:** Necessary for correctness — without waId, teamMemberId would always be null. No scope creep.

## Known Stubs

None — the subscribe flow is fully wired. However there is a **data gap** (not a stub):

- `viewer.waId` is sourced from `viewer.phone` (teamStore field). If a team member's `phone` is not populated, `teamMemberId` falls back to their `username`. The dispatch loop uses `wa_id` from the `team_numbers` Neon table. If phone != wa_id OR phone is null, push dispatches for that member will fail silently (key mismatch). Resolution: ensure team member creation/edit flow saves their WA phone number in the `phone` field.

## Issues Encountered

None during implementation. The plan's instruction to check for `/icon-192.png` was handled — it does not exist at public root, but `/icons/icon-192.png` does and was used instead.

## Next Phase Readiness

- Phase 10 is functionally complete pending: (1) human-verify checkpoint passing, (2) VAPID keys set in Vercel env
- Phase 11 (WhatsApp tab) can proceed — the notificationclick target URL `/admin/whatsapp?thread={threadId}` is already wired in the SW and will route correctly once the tab ships
- Team member phone fields should be populated to ensure push:sub:{wa_id} KV keys match dispatch loop lookups

---
*Phase: 10-web-push-notifications*
*Completed: 2026-06-23 (partial — paused at checkpoint Task 4)*
