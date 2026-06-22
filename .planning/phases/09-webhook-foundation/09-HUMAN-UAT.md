---
status: partial
phase: 09-webhook-foundation
source: [09-VERIFICATION.md]
started: 2026-06-22T00:00:00.000Z
updated: 2026-06-22T00:00:00.000Z
---

## Current Test

[awaiting human testing — requires live Meta WABA credentials]

## Tests

### 1. WhatsApp message arrives in Neon table
expected: A WhatsApp message sent to the test number appears in the `whatsapp_messages` Neon table within 2 seconds of delivery
result: [pending — requires Meta WABA provisioning]

### 2. Invalid HMAC returns 403
expected: POST to /api/webhooks/whatsapp with an incorrect X-Hub-Signature-256 header returns HTTP 403
result: [pending — requires live webhook call]

### 3. WABA subscription activates message delivery
expected: Calling POST /api/admin/setup/waba-subscribe after Meta webhook registration causes WhatsApp messages to flow
result: [pending — requires WABA provisioning at Meta Business Manager]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
