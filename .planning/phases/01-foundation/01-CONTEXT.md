# Phase 1 Foundation — Context

_Decisions locked in discuss-phase session. Downstream agents (researcher, planner) must not re-ask these._

---

## Phase Goal

Users can upload a video, check its quality, create a scheduled post, and have it auto-posted to Instagram — with the full cron pipeline, token refresh, and Blob cleanup running reliably in production.

---

## UX Decisions

### Navigation

**Bottom nav becomes: Today | Pipeline | Clients | Pricing | Content**

- Settings is removed from the bottom nav
- Settings is accessible via a **gear icon in the TopBar** (right side, alongside search and bell — three icon buttons)
- `shell.jsx` TopBar must gain an `onSettings` prop; app.jsx routes it to the settings screen
- `parsePath` and `activeMap` in `shell.jsx` must handle the `content` route

### Content Screen Entry Point

- Route: `/admin/content` — the content queue (post feed)
- Route: `/admin/content/new` — post creation screen
- Both registered in `parsePath` in `shell.jsx`
- `isRoot` includes `content` so the TopBar shows the M&C mark + breadcrumb (not back button)

### Post Creation

**Pattern: dedicated full-page route `/admin/content/new`**

- Not a modal — complex form with drag/drop upload doesn't suit modal constraints on mobile
- Navigate back to `/admin/content` queue after successful save
- A `+` FAB on the content queue screen navigates to `/admin/content/new` (not the global new-lead FAB)
- The global FAB in `app.jsx` only shows for `["dashboard", "leads", "clients"]` routes — content gets its own FAB scoped to the content screen

### Quality Check

**Async on drop, non-blocking**

- File drop → client-side upload to Vercel Blob (`@vercel/blob/client` `upload()`) starts immediately
- On Blob upload complete, call `/api/admin/content/quality-check` with the returned Blob URL
- Quality result appears as an inline tag in the upload dropzone area (`Optimised ✓` or `Check export ⚠` + breakdown)
- Submit/Schedule button is **never hard-blocked** by quality check — user can schedule regardless of result
- If quality check is still pending when user submits, the tag shows a `Checking…` state and the result is stored async

### Post Queue Layout

**Grouped scroll — single feed, status section headers**

- Section order (top to bottom): **Failed** (red accent, urgent) → **Scheduled** → **Processing** → **Published**
- Empty sections are hidden (no "nothing here" filler for Processing/Failed when queue is clean)
- Each post card shows: platform badges (IG/TT), scheduled time, quality tag, status, caption preview
- Failed cards show the error reason inline and a **Retry** button that resets status to `pending`

---

## Technical Decisions

### KV Additions Required

Add `kvZRangeByScore` to `lib/kv.js`:

```js
// ZRANGEBYSCORE key min max -> /zrangebyscore/<key>/<min>/<max>
export async function kvZRangeByScore(setKey, min, max) {
  const res = await kvFetch(`/zrangebyscore/${encodeURIComponent(setKey)}/${min}/${max}`);
  return Array.isArray(res) ? res.map(String) : [];
}
```

Used by the posting cron to find posts where `scheduledAt ≤ now` from the `content:schedule` sorted set (scored by scheduledAt ms timestamp).

### Content Store (`lib/contentStore.js`)

Follows `lib/jobStore.js` pattern exactly. Key schema:

- `content:{id}` — post hash (all fields)
- `content:schedule` — sorted set, score = scheduledAt ms, member = id (for cron ZRANGEBYSCORE queries)
- `content:index` — sorted set, score = updatedAt ms, member = id (for feed listing)

Post record shape:
```js
{
  id,
  createdAt, updatedAt,
  status: "pending" | "processing" | "published" | "failed",
  scheduledAt,           // ISO string
  platforms: ["instagram", "tiktok"],
  caption,
  hashtags,              // string (appended to caption on publish)
  videoUrl,              // Vercel Blob URL
  videoBlobPath,         // for TTL deletion
  scriptPdfUrl,          // Vercel Blob URL (optional)
  scriptText,            // extracted text from PDF
  qualityResult: {       // null until checked
    status: "optimised" | "warn",
    checks: { codec, resolution, aspectRatio, bitrate, frameRate }
  },
  igContainerId,         // set after Instagram container creation
  igMediaId,             // set after Instagram publish
  igError,               // set on Instagram failure
  retryCount: 0
}
```

### Cron Configuration

Create `vercel.json` at project root:
```json
{
  "crons": [
    { "path": "/api/cron/post", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/token-refresh", "schedule": "0 9 * * *" },
    { "path": "/api/cron/blob-cleanup", "schedule": "0 3 * * *" }
  ]
}
```

**Requires Vercel Pro plan** — 15-minute resolution is not available on Hobby. This is a confirmed hard requirement.

### next.config.mjs Changes

Add `serverExternalPackages` for mediainfo.js WASM:
```js
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['mediainfo.js']
};
```

### Instagram Token Storage

Tokens stored in **KV, not env vars** — tokens must be mutable (refreshed by cron every 50 days):

- `ig:access_token` — current long-lived token string
- `ig:token_expires_at` — ISO timestamp of expiry
- Token is seeded from env var `IG_ACCESS_TOKEN` on first run if KV key doesn't exist

### Distributed Lock for Cron

Redis `SET NX EX` pattern via raw KV HTTP:
```js
// Upstash REST: SET key value NX EX seconds
// /set/<key>/<value>?nx=true&ex=<seconds>
```

Lock key: `lock:cron:post`, TTL: 60 seconds (cron runs every 15 min, lock prevents double-fire within the same window).

### API Routes

Following existing `app/api/admin/` pattern:
- `app/api/admin/content/route.js` — GET list, POST create
- `app/api/admin/content/[id]/route.js` — GET one, PATCH update, DELETE
- `app/api/admin/content/quality-check/route.js` — POST with `{ url }`, returns quality result
- `app/api/cron/post/route.js` — the 15-min posting cron
- `app/api/cron/token-refresh/route.js` — 50-day Instagram token refresh
- `app/api/cron/blob-cleanup/route.js` — daily Blob TTL cleanup

### Vercel Blob Upload Pattern

Client-side upload using `@vercel/blob/client`:
```js
import { upload } from '@vercel/blob/client';
const blob = await upload(filename, file, {
  access: 'public',
  handleUploadUrl: '/api/admin/content/upload-token'
});
```

Requires a token endpoint `app/api/admin/content/upload-token/route.js` that calls `handleUpload` server-side. Video files stored under `social-videos/` prefix.

### mediainfo.js Validation

Before the full upload architecture is built, Plan 1 should include a **validation task**: deploy a minimal `/api/test-mediainfo` endpoint that runs mediainfo.js on a known test URL and returns the result. Gate proceeding to the full quality check implementation on this passing in production. This de-risks the `ffprobe-static` alternative decision.

---

## Pending Human Actions (blockers before Phase 1 can go live)

1. **Verify Vercel Pro plan** — 15-min cron requires Pro. Check at vercel.com/dashboard → team settings → plan.
2. **Verify Instagram Business account** — Creator accounts cannot use Graph API. Check in Meta Business Suite.
3. **Submit TikTok Direct Post app audit** — 2–4 week review; submit at Phase 1 start so Phase 2 isn't blocked.
4. **Provide Instagram long-lived access token** — needed for seeding `ig:access_token` in KV on first cron run.

---

## What's Locked vs Still Open

| Area | Status | Decision |
|------|--------|----------|
| Video quality library | ✅ Locked | mediainfo.js WASM (not ffprobe-static) |
| Upload path | ✅ Locked | Client-side Blob upload (Vercel 4.5MB limit) |
| Instagram scheduling | ✅ Locked | Two-phase KV state machine (no inline poll) |
| Content nav slot | ✅ Locked | Replace Settings; gear icon in TopBar |
| Settings entry | ✅ Locked | Gear icon in TopBar right side |
| Post creation | ✅ Locked | Dedicated route /admin/content/new |
| Quality check UX | ✅ Locked | Async on drop, non-blocking, never gates submit |
| Post queue layout | ✅ Locked | Grouped scroll (Failed → Scheduled → Processing → Published) |
| Token storage | ✅ Locked | KV (mutable), seeded from env var on first run |
| Cron lock | ✅ Locked | Redis SET NX EX 60 on `lock:cron:post` |
| TikTok Phase 1 | ✅ Locked | Instagram only in Phase 1; TikTok is Phase 2 |
