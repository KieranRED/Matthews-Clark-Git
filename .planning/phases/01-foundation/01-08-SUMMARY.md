---
phase: 01-foundation
plan: 08
status: complete
completed_at: 2026-05-29
---

# Plan 01-08 Summary — Token Refresh + Blob Cleanup Crons

## What was built

Two new GET-only route files that complete the Phase 1 daily housekeeping cron triad alongside the existing `post` cron (Plan 07).

---

## `/api/cron/token-refresh`

**File:** `app/api/cron/token-refresh/route.js`

**Purpose:** Refreshes the Instagram long-lived access token before it expires (60-day TTL). Prevents post failures due to stale tokens (PUBLISH-04).

**Auth:** `Authorization: Bearer <CRON_SECRET>` — returns 401 if missing or wrong.

**Request:** `GET /api/cron/token-refresh`

**Logic:**
1. Reads current token from KV key `ig:access_token`; falls back to `process.env.IG_ACCESS_TOKEN` for first-run scenarios
2. Calls `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<current>`
3. On success: writes new token to `ig:access_token` and computed expiry ISO string to `ig:token_expires_at`

**KV keys touched:**
- `ig:access_token` — read then written with refreshed token
- `ig:token_expires_at` — written with `new Date(Date.now() + expires_in * 1000).toISOString()`

**Success response:**
```json
{
  "ok": true,
  "refreshedAt": "2026-05-29T09:00:00.000Z",
  "expiresAt": "2026-07-28T09:00:00.000Z",
  "expiresInSeconds": 5184000
}
```

**Error responses:**
- `401` — missing/wrong CRON_SECRET
- `500` — no token available in KV or env
- `502` — Instagram API error or returned no `access_token`

**Vercel cron schedule (vercel.json):** daily at 09:00 UTC

---

## `/api/cron/blob-cleanup`

**File:** `app/api/cron/blob-cleanup/route.js`

**Purpose:** Reclaims Vercel Blob storage by deleting uploaded social videos older than 7 days. By that point Instagram has already processed the video (UPLOAD-08).

**Auth:** `Authorization: Bearer <CRON_SECRET>` — returns 401 if missing or wrong.

**Request:** `GET /api/cron/blob-cleanup`

**Logic:**
1. Computes `cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000`
2. Paginates `@vercel/blob` `list()` with `prefix: "social-videos/"` and `limit: 1000` using a do-while cursor loop
3. Collects URLs of blobs where `uploadedAt < cutoffMs`
4. Calls `del(toDelete)` once with the full array (if non-empty)

**Blob prefix searched:** `social-videos/`

**TTL cutoff:** 7 days (`SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000`)

**Pagination:** do-while loop driven by `cursor` from `list()` response — handles arbitrarily large blob stores.

**Success response:**
```json
{
  "ok": true,
  "ranAt": "2026-05-29T03:00:00.000Z",
  "prefix": "social-videos/",
  "scanned": 42,
  "deleted": 5,
  "cutoff": "2026-05-22T03:00:00.000Z"
}
```

**Error responses:**
- `401` — missing/wrong CRON_SECRET
- `500` — `@vercel/blob` threw (e.g. missing `BLOB_READ_WRITE_TOKEN`)

**Vercel cron schedule (vercel.json):** daily at 03:00 UTC

---

## Phase 1 autonomous infrastructure status

With Plan 08 complete, all three daily cron endpoints are operational:

| Cron | Schedule | Endpoint | Purpose |
|------|----------|----------|---------|
| Post publisher | every 5 min | `/api/cron/post` | Publish scheduled IG posts |
| Token refresh | 09:00 UTC daily | `/api/cron/token-refresh` | Keep IG access token alive |
| Blob cleanup | 03:00 UTC daily | `/api/cron/blob-cleanup` | Delete videos >7 days old |

**The system can now run unattended.** Plan 09 performs end-to-end verification of the full triad.
