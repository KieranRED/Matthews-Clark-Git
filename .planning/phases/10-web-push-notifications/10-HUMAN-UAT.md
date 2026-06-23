---
status: partial
phase: 10-web-push-notifications
source: [10-VERIFICATION.md]
started: 2026-06-23T00:00:00.000Z
updated: 2026-06-23T00:00:00.000Z
---

## Current Test

[awaiting human testing — requires live Meta WABA + HTTPS deployment + VAPID keys in Vercel]

## Tests

### 1. Subscribe button visible only in PWA standalone mode
expected: Settings → INTEGRATIONS shows "Enable notifications" row when CRM is installed as PWA (standalone mode); row is absent when browsing in a normal browser tab
result: [pending — requires HTTPS deployment]

### 2. Push notification arrives within 5 seconds of inbound WhatsApp
expected: After subscribing, sending a WhatsApp to the team test number triggers a system push notification on the subscribed device within 5 seconds
result: [pending — requires Meta WABA provisioning + VAPID keys in Vercel]

### 3. Tapping notification opens CRM
expected: Tapping the push notification opens the CRM app (at /admin or /admin/whatsapp?thread=...)
result: [pending — requires live push notification]

### 4. Telegram fallback fires for unsubscribed team members
expected: A team member who has NOT subscribed to push receives the same inbound WhatsApp alert via Telegram instead
result: [pending — requires Meta WABA provisioning]

### 5. VAPID key setup
expected: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY are set in Vercel env vars; keypair generated once and saved
result: [pending — manual setup required]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
