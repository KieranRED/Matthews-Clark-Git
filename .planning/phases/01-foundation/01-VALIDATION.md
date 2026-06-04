---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — manual + smoke via API endpoints |
| **Config file** | none |
| **Quick run command** | `curl -s http://localhost:3000/api/test-mediainfo` |
| **Full suite command** | Manual smoke test checklist (see below) |
| **Estimated runtime** | ~5 minutes manual |

No automated test framework exists in this project. All validation is manual UI testing or direct API endpoint smoke tests.

---

## Sampling Rate

- **After every task commit:** Manual check of the affected surface (UI or API endpoint)
- **After every plan wave:** Full smoke checklist for that wave's requirements
- **Before `/gsd:verify-work`:** All smoke endpoints green + manual checklist complete
- **Max feedback latency:** Wave-level (not per-task) given manual-only infra

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Validation Method |
|--------|----------|-----------|-------------------|
| UPLOAD-01 | Drag/drop + file picker | Manual | Open `/admin/content/new`; drag a .mp4 file onto the dropzone; verify upload starts |
| UPLOAD-02 | Blob URL saved to post record | Smoke | Check KV `content:{id}` hash in Upstash console after upload; `videoUrl` field non-empty |
| UPLOAD-03 | Quality check returns <10s | Smoke | `POST /api/admin/content/quality-check` with `{ "url": "<blob-url>" }`; verify response within 10s |
| UPLOAD-04 | Codec/res/aspect/bitrate/fps all evaluated | Smoke | Same endpoint; verify response includes `checks.codec`, `checks.resolution`, `checks.aspectRatio`, `checks.bitrate`, `checks.frameRate` |
| UPLOAD-05 | Quality tag renders correctly | Manual | After UPLOAD-03, verify tag shows "Optimised ✓" (green) or "Check export ⚠" (amber) in dropzone |
| UPLOAD-06 | PDF upload works | Manual | In `/admin/content/new`, use the PDF picker; verify filename appears |
| UPLOAD-07 | PDF text extracted | Smoke | Submit post with PDF; check KV `content:{id}.scriptText` is non-empty string |
| UPLOAD-08 | Blob cleanup deletes old files | Smoke | `GET /api/cron/blob-cleanup` with `Authorization: Bearer $CRON_SECRET`; verify `{ deleted: N }` response |
| SCHEDULE-01 | Post creation form saves | Manual | Fill form and submit; verify redirect to `/admin/content` with new post card visible |
| SCHEDULE-02 | KV record has correct shape | Smoke | Check `content:{id}` in Upstash console; verify `status: "pending"`, `scheduledAt`, `platforms`, `caption` fields present |
| SCHEDULE-03 | Queue grouped by status sections | Manual | Create posts with different statuses; verify Failed / Scheduled / Processing / Published section headers visible |
| SCHEDULE-04 | Cron picks up pending posts | Smoke | `GET /api/cron/post` with `Authorization: Bearer $CRON_SECRET`; verify pending post advances to `processing` |
| SCHEDULE-05 | Retry button resets failed post | Manual | Manually set a post to `failed` in KV; refresh UI; click "Retry Post"; verify card moves to Scheduled section |
| PUBLISH-01 | IG container created | Smoke | Trigger cron; verify `content:{id}.igContainerId` is non-empty in KV |
| PUBLISH-02 | State machine polls without blocking | Smoke | Trigger cron again on processing post; verify status logged without timeout |
| PUBLISH-03 | Published + igMediaId stored | Smoke | After FINISHED, verify `content:{id}.igMediaId` non-empty and `status: "published"` |
| PUBLISH-04 | Token refresh updates KV | Smoke | `GET /api/cron/token-refresh` with `Authorization: Bearer $CRON_SECRET`; verify `ig:access_token` updated |
| PUBLISH-05 | Distributed lock prevents double-fire | Smoke | Fire cron twice concurrently; verify second returns `{ skipped: true, reason: "lock-held" }` |

---

## Wave 0 Requirements

- [ ] `app/api/test-mediainfo/route.js` — validates mediainfo.js WASM loads and runs on Vercel production. **Gates UPLOAD-03 and UPLOAD-04 implementation.** Must be deployed and verified in production before building quality-check endpoint.

*No test framework install needed — all validation is manual/smoke via HTTP.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag/drop video UI | UPLOAD-01 | File interaction requires browser | Open `/admin/content/new`, drag .mp4 file |
| Quality tag renders | UPLOAD-05 | Visual rendering | After upload, inspect tag colour and copy |
| Post queue sections visible | SCHEDULE-03 | UI layout | Create posts in different states, check section headers |
| Retry Post button | SCHEDULE-05 | UI interaction | Set post to failed, click retry, verify queue update |

---

## Validation Sign-Off

- [ ] Wave 0: `/api/test-mediainfo` deployed and returns valid mediainfo result
- [ ] UPLOAD: Drag/drop works, quality tag appears within 10s, Blob URL in KV
- [ ] SCHEDULE: Post form saves, KV record correct shape, queue shows by status
- [ ] PUBLISH: Cron advances posts through state machine, igMediaId stored, lock prevents double-fire
- [ ] TOKEN: `/api/cron/token-refresh` updates `ig:access_token` in KV
- [ ] CLEANUP: `/api/cron/blob-cleanup` deletes blobs older than 7 days

**Approval:** pending
