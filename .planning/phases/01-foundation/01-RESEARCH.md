# Phase 1: Foundation - Research

**Researched:** 2026-05-29
**Domain:** Instagram Graph API, Vercel Blob client upload, mediainfo.js WASM, Upstash Redis sorted sets, Vercel Cron, PDF text extraction, Next.js 15 App Router CRM integration
**Confidence:** HIGH (all critical claims verified against official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| Area | Decision |
|------|----------|
| Video quality library | mediainfo.js WASM (not ffprobe-static). Validate on Vercel production runtime before committing upload architecture. |
| Upload path | Client-side Blob upload (`@vercel/blob/client` `upload()`). Vercel has a 4.5 MB server request limit. Quality check fires on returned Blob URL server-side. |
| Instagram scheduling | Two-phase KV state machine. Container creation on cron N, poll+publish on cron N+1. No blocking inline poll. |
| Content nav slot | Replace Settings in bottom nav with Content; gear icon in TopBar right side. |
| Settings entry | Gear icon in TopBar right side (alongside existing search + bell). |
| Post creation | Dedicated route `/admin/content/new`, not a modal. Navigate back to queue on save. |
| Quality check UX | Async on drop, non-blocking, never gates submit. `Checking…` state persists if user submits before result. |
| Post queue layout | Grouped scroll: Failed → Scheduled → Processing → Published. Empty sections hidden. |
| Token storage | KV (mutable). Seeded from env var `IG_ACCESS_TOKEN` on first run if KV key doesn't exist. |
| Cron lock | Redis SET NX EX 60 on `lock:cron:post`. |
| TikTok Phase 1 | Instagram only. TikTok is Phase 2. Both toggles rendered; TikTok visually disabled. |
| Cron schedule | 15 min posting, daily 9AM token refresh, 3AM blob cleanup. Requires Vercel Pro. |
| KV key schema | `content:{id}`, `content:schedule` (sorted set, score=scheduledAt ms), `content:index` (sorted set, score=updatedAt ms). |
| API routes | Under `app/api/admin/content/` and `app/api/cron/`. Follow existing `app/api/admin/` auth pattern. |

### Claude's Discretion

None noted in CONTEXT.md — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- TikTok posting (Phase 2)
- Analytics pull (Phase 3)
- Obsidian vault export (Phase 4)
- AI caption suggestions
- Multi-account support
- Real-time analytics dashboard
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLOAD-01 | User can upload a video file (drag/drop or file picker) from the content post creation screen | Vercel Blob `upload()` client-side; drag/drop via HTML5 File API + dragover/drop events |
| UPLOAD-02 | Video stored in Vercel Blob under `social-videos/` prefix; public URL saved to post record | Confirmed: `upload(filename, file, { access: 'public', handleUploadUrl: '...' })` returns `{ url }` |
| UPLOAD-03 | Quality check server-side via mediainfo.js within 10 seconds | mediainfo.js WASM analyzes via `analyzeData()` + fetch-to-ArrayBuffer; needs `serverExternalPackages` + `outputFileTracingIncludes` |
| UPLOAD-04 | Quality checks: codec (H.264), resolution+aspect (1080×1920/9:16), bitrate (4–50 Mbps), framerate (29.97/60fps) | mediainfo.js returns `Video` track with `Format`, `Width`, `Height`, `FrameRate`, `BitRate` fields |
| UPLOAD-05 | Quality result tag: "Optimised ✓" or "Check export ⚠" with check breakdown | Client polls or awaits quality-check API response; tag rendered in dropzone UI |
| UPLOAD-06 | User can upload a PDF script file alongside the video | Secondary Blob upload (PDF) via same token endpoint pattern; `allowedContentTypes` includes `application/pdf` |
| UPLOAD-07 | System extracts text from uploaded PDF and stores in post record | `unpdf` library: `getDocumentProxy()` + `extractText()` on Blob URL fetch → ArrayBuffer |
| UPLOAD-08 | Blob cleanup cron deletes video files older than 7 days | `@vercel/blob` `list({ prefix: 'social-videos/', limit: 1000 })` + `del()` on old blobs; daily cron at 3AM |
| SCHEDULE-01 | Create post with video, PDF, caption, hashtags, platform toggles, scheduled datetime | Form fields + two Blob uploads + POST to `/api/admin/content` |
| SCHEDULE-02 | Post record saved to KV with status `pending` and `scheduledAt` | `contentStore.js` `savePost()` — KV hash + sorted set zadd |
| SCHEDULE-03 | Feed grouped by status: Scheduled, Processing, Published, Failed | Client fetches GET `/api/admin/content`; groups client-side by `status` field |
| SCHEDULE-04 | Vercel Cron every 15 min picks up posts where `scheduledAt ≤ now`, status = pending | `kvZRangeByScore('content:schedule', 0, Date.now())` + status filter |
| SCHEDULE-05 | Failed posts show error + Retry button that resets status to pending | PATCH `/api/admin/content/{id}` `{ status: 'pending', igError: null }` |
| PUBLISH-01 | Create Instagram media container via Graph API with Blob video URL | `POST /v25.0/{IG_ID}/media` with `media_type=REELS`, `video_url`, `caption`, `access_token` |
| PUBLISH-02 | Poll container status in subsequent crons until `status_code = FINISHED` | GET `/{container_id}?fields=status_code`; state machine: `pending` → `processing` (container created) → poll → `published` |
| PUBLISH-03 | Publish container via `/{IG_USER_ID}/media_publish`; store `ig_media_id` | `POST /v25.0/{IG_ID}/media_publish?creation_id={container_id}&access_token=...` |
| PUBLISH-04 | Token auto-refresh every 50 days | `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=...` |
| PUBLISH-05 | Distributed Redis lock (SET NX EX) prevents duplicate publishes | `kvFetch('/set/lock:cron:post/1/NX/EX/60', { method: 'POST' })` — null result = lock held, skip run |
</phase_requirements>

---

## Summary

Phase 1 builds the entire social content pipeline from scratch: video upload, quality validation, post scheduling UI, and the automated Instagram publishing cron. Every piece is a new subsystem with no existing foundation in the codebase.

The three highest-risk technical items are: (1) mediainfo.js WASM on Vercel serverless — the `__dirname` bug that killed ffprobe-static does not affect WASM, but the WASM file must be explicitly included via `outputFileTracingIncludes` and the package must be listed in `serverExternalPackages`; a validation task gates this before the full quality check is built. (2) The Vercel Blob client upload pattern requires an authenticated server token endpoint — `onUploadCompleted` callbacks do not work locally without ngrok, so local development requires either ngrok or a simplified fallback. (3) The Instagram two-phase state machine must handle the `ERROR` and `EXPIRED` status codes from the container API to avoid posts getting silently stuck in `processing`.

The existing codebase is well-suited as a template: `lib/jobStore.js` provides the exact CRUD + sorted-set pattern for `lib/contentStore.js`; `lib/kv.js` needs only one addition (`kvZRangeByScore`); `app/(crm)/admin/(protected)/kit/shell.jsx` and `app.jsx` need targeted additions for the content route. All API routes follow the existing `verifyAdminSession(token)` + `Response.json()` pattern.

**Primary recommendation:** Build in this order: (1) KV + contentStore primitives, (2) navigation wiring in shell.jsx/app.jsx, (3) mediainfo.js validation task on Vercel, (4) upload token endpoint + quality check API, (5) post creation UI, (6) content queue UI, (7) posting cron + IG state machine, (8) token refresh cron, (9) blob cleanup cron.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | ^15.0.0 (installed: 16.2.6) | App Router framework | Already in project |
| `@vercel/blob` | 2.4.0 (latest) | Client-side video/PDF upload, blob cleanup | Already installed; `upload()` + `handleUpload()` + `list()` + `del()` |
| `mediainfo.js` | 0.3.7 (latest) | Server-side video quality analysis via WASM | Locked decision; ffprobe-static excluded |
| `unpdf` | 1.6.2 (latest) | PDF text extraction on serverless | Zero native deps; works on Vercel out of the box; no `serverExternalPackages` needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.23.8 (installed) | Request body validation | All API route POST/PATCH bodies — follows existing pattern |
| Upstash Redis REST | (via env) | KV sorted sets, distributed lock | Already in project via `lib/kv.js` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unpdf` | `pdf-parse` | pdf-parse frequently throws "Cannot find module 'pdfjs-dist/...'" on Vercel; needs `serverExternalPackages` config; unpdf is drop-in replacement with no issues |
| `unpdf` | `pdfjs-dist` directly | pdfjs-dist requires worker config that Vercel bundler mangles; build failures in production |
| `mediainfo.js` | `ffprobe-static` | ffprobe-static has a `__dirname` bug on Vercel — locked decision to use mediainfo.js |

**Installation:**
```bash
npm install mediainfo.js unpdf
```

**Version verification (run before planning tasks):**
```bash
npm view mediainfo.js version   # 0.3.7 verified 2026-05-29
npm view @vercel/blob version   # 2.4.0 verified 2026-05-29
npm view unpdf version          # 1.6.2 verified 2026-05-29
```

---

## Architecture Patterns

### Recommended Project Structure

```
lib/
├── kv.js                          # ADD: kvZRangeByScore export
├── contentStore.js                # NEW: mirrors jobStore.js pattern
app/
├── (crm)/admin/(protected)/
│   ├── [[...slug]]/page.jsx       # unchanged — catch-all routes to AdminCrmKitApp
│   └── kit/
│       ├── shell.jsx              # MODIFY: parsePath + isRoot + TopBar onSettings + BottomNav
│       ├── app.jsx                # MODIFY: import + route content/content-new + FAB logic
│       ├── screens-content.jsx    # NEW: post queue screen
│       ├── screens-content-new.jsx # NEW: post creation form
│       └── screens-content-new.module.css  # NEW: form styles
│       └── screens-content.module.css      # NEW: queue styles
app/api/
├── admin/content/
│   ├── route.js                   # GET list, POST create
│   ├── [id]/route.js              # GET one, PATCH update, DELETE
│   ├── quality-check/route.js     # POST { url } → quality result
│   └── upload-token/route.js      # handleUpload token endpoint
├── cron/
│   ├── post/route.js              # 15-min posting cron
│   ├── token-refresh/route.js     # daily IG token refresh
│   └── blob-cleanup/route.js      # daily blob TTL cleanup
├── test-mediainfo/route.js        # validation endpoint (Wave 0 gate)
vercel.json                        # NEW: cron schedule definitions
next.config.js                     # MODIFY: serverExternalPackages + outputFileTracingIncludes
```

### Pattern 1: contentStore.js (mirrors jobStore.js)

**What:** KV CRUD with two sorted-set indexes — `content:schedule` for cron queries, `content:index` for feed display.
**When to use:** All post create/read/update/delete operations.
**Example:**
```javascript
// Source: mirrors /lib/jobStore.js pattern exactly
import crypto from "node:crypto";
import { hasKv, kvDel, kvGet, kvSet, kvZAdd, kvZRem, kvZRevRange, maybeParseJson } from "@/lib/kv";

function contentKey(id) { return `content:${id}`; }

export async function savePost(post) {
  if (!hasKv()) return null;
  const record = {
    id: post.id || crypto.randomUUID(),
    createdAt: post.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: post.status || "pending",
    scheduledAt: post.scheduledAt || null,
    platforms: Array.isArray(post.platforms) ? post.platforms : ["instagram"],
    caption: post.caption || "",
    hashtags: post.hashtags || "",
    videoUrl: post.videoUrl || null,
    videoBlobPath: post.videoBlobPath || null,
    scriptPdfUrl: post.scriptPdfUrl || null,
    scriptText: post.scriptText || null,
    qualityResult: post.qualityResult || null,
    igContainerId: post.igContainerId || null,
    igMediaId: post.igMediaId || null,
    igError: post.igError || null,
    retryCount: post.retryCount ?? 0
  };
  await kvSet(contentKey(record.id), record);
  // Index by updatedAt for feed display
  await kvZAdd("content:index", Date.parse(record.updatedAt), record.id);
  // Index by scheduledAt for cron pickup (only pending posts)
  if (record.scheduledAt && record.status === "pending") {
    const score = Date.parse(record.scheduledAt);
    if (Number.isFinite(score)) await kvZAdd("content:schedule", score, record.id);
  }
  return record;
}
```

### Pattern 2: Vercel Blob Client Upload

**What:** File goes browser → Vercel Blob directly, bypassing the 4.5 MB server limit. Server provides a short-lived token via `handleUpload`.
**When to use:** All file uploads (video, PDF).

**Server token endpoint (`app/api/admin/content/upload-token/route.js`):**
```javascript
// Source: https://vercel.com/docs/vercel-blob/client-upload (verified 2026-03-27)
import { handleUpload } from '@vercel/blob/client';
import { cookies } from 'next/headers';
import { adminCookieName, verifyAdminSession } from '@/lib/adminAuth';

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'application/pdf'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ username: session.username })
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // onUploadCompleted does NOT fire locally without ngrok
        console.log('[content][upload-complete]', blob.url);
      }
    });
    return Response.json(jsonResponse);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
```

**Client-side upload (in `screens-content-new.jsx`):**
```javascript
// Source: https://vercel.com/docs/vercel-blob/client-upload (verified 2026-03-27)
import { upload } from '@vercel/blob/client';

const blob = await upload(`social-videos/${file.name}`, file, {
  access: 'public',
  handleUploadUrl: '/api/admin/content/upload-token'
});
// blob.url is now the Vercel Blob public URL — pass to quality-check API
```

### Pattern 3: mediainfo.js Quality Check

**What:** Fetch video from Blob URL to ArrayBuffer, analyze with mediainfo.js WASM using `analyzeData()` chunk-reading pattern.
**When to use:** `/api/admin/content/quality-check` POST handler.

**next.config.js changes required:**
```javascript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
// + https://dev.to/mfts/deploy-a-webassembly-powered-nextjs-app-on-vercel-serverless-functions-20b0
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['mediainfo.js'],
  experimental: {
    outputFileTracingIncludes: {
      '/api/admin/content/quality-check': ['./node_modules/mediainfo.js/dist/*.wasm'],
      '/api/test-mediainfo': ['./node_modules/mediainfo.js/dist/*.wasm']
    }
  }
};
export default nextConfig;
```

**Quality check handler pattern:**
```javascript
// Source: mediainfo.js API docs (https://mediainfo.js.org/api/class/MediaInfo/)
import mediaInfoFactory from 'mediainfo.js';

export async function POST(request) {
  const { url } = await request.json();
  
  // Fetch video to ArrayBuffer
  const videoRes = await fetch(url);
  if (!videoRes.ok) throw new Error('Failed to fetch video');
  const buffer = await videoRes.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  
  const mediainfo = await mediaInfoFactory({ format: 'object' });
  try {
    const result = await mediainfo.analyzeData(
      () => uint8.byteLength,
      (chunkSize, offset) => uint8.slice(offset, offset + chunkSize)
    );
    // result.media.track[] contains General, Video, Audio tracks
    const videoTrack = result?.media?.track?.find(t => t['@type'] === 'Video');
    // Fields: videoTrack.Format (e.g. "AVC"), videoTrack.Width, videoTrack.Height,
    //         videoTrack.FrameRate, videoTrack.BitRate, videoTrack.DisplayAspectRatio
    return Response.json({ ok: true, result });
  } finally {
    mediainfo.close();
  }
}
```

**Quality check criteria from UPLOAD-04:**
```javascript
function evaluateQuality(videoTrack) {
  const checks = {
    codec:      videoTrack?.Format === 'AVC',          // H.264 = AVC
    resolution: videoTrack?.Width === 1080 && videoTrack?.Height === 1920,
    aspectRatio: videoTrack?.DisplayAspectRatio === '0.562' || 
                 Math.abs((videoTrack?.Width / videoTrack?.Height) - (9/16)) < 0.01,
    bitrate:    Number(videoTrack?.BitRate) >= 4_000_000 && 
                Number(videoTrack?.BitRate) <= 50_000_000,
    frameRate:  ['29.970', '60.000', '29.97', '60'].includes(String(videoTrack?.FrameRate))
  };
  const allPass = Object.values(checks).every(Boolean);
  return { status: allPass ? 'optimised' : 'warn', checks };
}
```

### Pattern 4: Instagram Two-Phase State Machine

**What:** Cron N creates container and sets `status=processing` + `igContainerId`. Cron N+1 polls container status. When `FINISHED`, publishes and sets `status=published` + `igMediaId`.
**When to use:** `/api/cron/post/route.js`.

```javascript
// Source: https://developers.facebook.com/docs/instagram-platform/content-publishing/
const IG_API = 'https://graph.instagram.com/v25.0';

// Step 1: Create container (first cron fire for this post)
async function createIgContainer(post, accessToken, igUserId) {
  const params = new URLSearchParams({
    media_type: 'REELS',
    video_url: post.videoUrl,
    caption: `${post.caption}\n\n${post.hashtags}`.trim(),
    share_to_feed: 'true',
    access_token: accessToken
  });
  const res = await fetch(`${IG_API}/${igUserId}/media`, {
    method: 'POST',
    body: params
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || 'Container creation failed');
  return json.id; // igContainerId
}

// Step 2: Poll + publish (subsequent cron fires)
async function pollAndPublish(post, accessToken, igUserId) {
  const res = await fetch(
    `${IG_API}/${post.igContainerId}?fields=status_code&access_token=${accessToken}`
  );
  const json = await res.json();
  const statusCode = json?.status_code;
  
  if (statusCode === 'FINISHED') {
    // Publish
    const pubParams = new URLSearchParams({
      creation_id: post.igContainerId,
      access_token: accessToken
    });
    const pubRes = await fetch(`${IG_API}/${igUserId}/media_publish`, {
      method: 'POST',
      body: pubParams
    });
    const pubJson = await pubRes.json();
    if (!pubRes.ok || pubJson.error) throw new Error(pubJson.error?.message || 'Publish failed');
    return { published: true, igMediaId: pubJson.id };
  }
  if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
    throw new Error(`Container ${statusCode}: ${json.status || statusCode}`);
  }
  return { published: false }; // IN_PROGRESS — try again next cron
}
```

### Pattern 5: Distributed Cron Lock

**What:** Redis SET NX EX prevents double-fire within the same 15-minute window.
**When to use:** Start of every cron handler.

```javascript
// Source: Upstash REST API docs (https://upstash.com/docs/redis/features/restapi)
// SET lock:cron:post 1 NX EX 60 → returns "OK" if acquired, null if already held
async function acquireCronLock() {
  const result = await kvFetch('/set/lock%3Acron%3Apost/1/NX/EX/60', { method: 'POST' });
  return result === 'OK';
}

// In cron handler:
export async function GET(request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const locked = await acquireCronLock();
  if (!locked) return Response.json({ ok: true, skipped: true, reason: 'lock-held' });
  
  // ... rest of cron logic
}
```

### Pattern 6: kvZRangeByScore Addition

**What:** New export for `lib/kv.js` — queries sorted set members with scores between min and max.
**When to use:** Posting cron picks up all posts where `scheduledAt ≤ now`.

```javascript
// Source: Upstash REST API docs + CONTEXT.md locked decision
// URL format: /zrangebyscore/<key>/<min>/<max>
export async function kvZRangeByScore(setKey, min, max) {
  const res = await kvFetch(
    `/zrangebyscore/${encodeURIComponent(setKey)}/${min}/${max}`
  );
  return Array.isArray(res) ? res.map(String) : [];
}
```

### Pattern 7: Vercel Token Refresh

**What:** Daily cron refreshes the Instagram long-lived token (60-day expiry, refresh every 50 days).
**When to use:** `/api/cron/token-refresh/route.js`.

```javascript
// Source: https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/
async function refreshIgToken(currentToken) {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
  );
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || 'Token refresh failed');
  // json.access_token = new token, json.expires_in = seconds (~5184000 = 60 days)
  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000).toISOString()
  };
}
// Store result: kvSet('ig:access_token', newToken), kvSet('ig:token_expires_at', expiresAt)
```

### Pattern 8: Blob Cleanup Cron

**What:** Lists blobs under `social-videos/` prefix, deletes those older than 7 days.
**When to use:** `/api/cron/blob-cleanup/route.js`.

```javascript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk (last_updated: 2026-05-19)
import { list, del } from '@vercel/blob';

async function cleanupOldBlobs() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let cursor;
  const toDelete = [];
  do {
    const { blobs, cursor: nextCursor } = await list({
      prefix: 'social-videos/',
      limit: 1000,
      cursor
    });
    for (const blob of blobs) {
      if (new Date(blob.uploadedAt).getTime() < cutoff) {
        toDelete.push(blob.url);
      }
    }
    cursor = nextCursor;
  } while (cursor);
  
  if (toDelete.length > 0) await del(toDelete);
  return { deleted: toDelete.length };
}
```

### Pattern 9: unpdf Text Extraction

**What:** Fetch PDF from Blob URL, extract text using unpdf.
**When to use:** Post creation route after PDF upload completes.

```javascript
// Source: https://github.com/unjs/unpdf (verified 2026-05-29)
import { extractText, getDocumentProxy } from 'unpdf';

async function extractPdfText(pdfUrl) {
  const res = await fetch(pdfUrl);
  const buffer = await res.arrayBuffer();
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  await pdf.destroy();
  return typeof text === 'string' ? text : text.join('\n');
}
```

### Pattern 10: Shell + App Navigation Wiring

**What:** Minimal surgical changes to `shell.jsx` and `app.jsx` — add content route parsing, TopBar settings gear, BottomNav swap, content FAB.

**shell.jsx changes:**
```javascript
// In parsePath() — add before final return:
if (slug[0] === 'content' && slug[1] === 'new') return { name: 'content-new', params: {} };
if (slug[0] === 'content') return { name: 'content', params: {} };

// isRoot array — add 'content':
const isRoot = ["dashboard", "leads", "clients", "calendar", "settings", "pricing", "content"].includes(route.name);

// TopBar — add content/content-new breadcrumbs:
if (route.name === 'content') { title = 'Content'; crumbs = 'SOCIAL · QUEUE'; }
if (route.name === 'content-new') { title = 'New Post'; crumbs = 'SOCIAL · NEW POST'; }

// TopBar — add onSettings prop and third icon button in .right div:
// <button className="icon-btn" title="Settings" aria-label="Open settings" onClick={onSettings}>
//   <Icon.set />
// </button>

// BottomNav M&C items — replace settings entry with content:
{ id: 'content', label: 'Content', href: '/admin/content', ic: <Icon.cam /> }

// activeMap — add:
content: 'content',
'content-new': 'content'
```

**app.jsx changes:**
```javascript
// Import new screens:
import ContentScreen from './screens-content';
import ContentNewScreen from './screens-content-new';

// Route handler:
if (route.name === 'content') body = <ContentScreen />;
if (route.name === 'content-new') body = <ContentNewScreen onSaved={() => router.push('/admin/content')} />;

// TopBar — add onSettings handler:
<TopBar
  route={route}
  index={index}
  onSearch={() => setOverlay('search')}
  onBell={() => setOverlay('activity')}
  onSettings={() => router.push('/admin/settings')}
/>

// FAB — restrict to original routes only (content gets its own FAB in ContentScreen):
const showFab = !isIzimoto && ['dashboard', 'leads', 'clients'].includes(route.name);
```

### Anti-Patterns to Avoid

- **Inline polling in API route:** Never `while (status !== 'FINISHED') await sleep(n)` — serverless functions time out at 10–60 seconds, and Instagram container processing can take minutes. The two-phase KV state machine (locked) exists for this reason.
- **Server-side video upload:** Never pipe the video through a Next.js API route — Vercel rejects requests over 4.5 MB. Client-side `@vercel/blob/client` `upload()` is the only viable pattern.
- **Leaving the cron lock unset on error:** Always use `try/finally` — if the cron throws after acquiring the lock, the 60-second TTL will release it automatically, but do not `return` early without catching errors, as this leaves posts in limbo.
- **Depending on `onUploadCompleted` locally:** This webhook does not fire in `next dev` without ngrok. The quality check is triggered explicitly by the client after `upload()` resolves — not via `onUploadCompleted`.
- **Storing IG token in env vars:** Tokens expire and must be refreshed — env vars are immutable between deployments. Token lives in KV (`ig:access_token`), seeded once from `IG_ACCESS_TOKEN` env var.
- **Not removing from `content:schedule` on status change:** When a post transitions from `pending` to `processing`, it must be `kvZRem`'d from `content:schedule` to prevent the cron picking it up again.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video metadata extraction | Custom ffprobe wrapper | `mediainfo.js` (locked) | ffprobe has `__dirname` Vercel bug; mediainfo.js WASM is portable |
| PDF text extraction | Manual PDF binary parsing | `unpdf` | Mozilla PDF.js under the hood; handles encoding, multi-page, fonts |
| Vercel Blob token exchange | Custom presigned URL logic | `@vercel/blob/client` `handleUpload()` | Handles token signing, expiry, content-type enforcement |
| Cron auth | Manual shared-secret comparison | `CRON_SECRET` env var checked against `Authorization: Bearer` header | Vercel automatically injects this; standard pattern |
| Blob cursor pagination | Manual offset tracking | `list()` `cursor` field from response | API paginates automatically; `cursor` is opaque |

---

## Common Pitfalls

### Pitfall 1: WASM File Not Bundled on Vercel

**What goes wrong:** Quality check works locally, returns 500 in production with "Cannot find module" or "WASM file not found."
**Why it happens:** Vercel's serverless bundler does file-tracing and excludes `.wasm` files unless explicitly included. `serverExternalPackages: ['mediainfo.js']` prevents Next.js from bundling it, but the WASM binary must also be included in the deployment trace.
**How to avoid:** Add BOTH `serverExternalPackages: ['mediainfo.js']` AND `experimental.outputFileTracingIncludes` pointing to `./node_modules/mediainfo.js/dist/*.wasm` for the quality-check route. Gate Phase 1 implementation on the validation task (`/api/test-mediainfo`) passing in production.
**Warning signs:** Local works, Vercel deploy fails. Error mentions WASM or module path.

### Pitfall 2: Instagram Container Stuck in Processing

**What goes wrong:** Post advances to `processing` status but never publishes. `igContainerId` is set, but cron keeps polling and `status_code` never reaches `FINISHED`.
**Why it happens:** Instagram takes variable time to process Reels (30 seconds to several minutes). `ERROR` or `EXPIRED` (>24 hours) states can silently block the state machine if not handled explicitly.
**How to avoid:** Handle all five status codes: `FINISHED` → publish; `IN_PROGRESS` → leave in processing, try next cron; `ERROR` or `EXPIRED` → set `status=failed`, set `igError`; `PUBLISHED` → already done, update KV.
**Warning signs:** Posts stuck in `processing` for >1 hour.

### Pitfall 3: onUploadCompleted Not Firing Locally

**What goes wrong:** Quality check never fires after upload in local development.
**Why it happens:** `onUploadCompleted` is a server webhook called by Vercel Blob after upload completes — it requires a publicly reachable URL. `localhost` is not reachable from Vercel's servers.
**How to avoid:** The architecture already avoids this: quality check is triggered by the client explicitly calling `/api/admin/content/quality-check` after `upload()` resolves — not via `onUploadCompleted`. Do not rely on `onUploadCompleted` for the quality check trigger.
**Warning signs:** Developer wonders why quality check never runs locally.

### Pitfall 4: Sorted Set Pollution / Cron Pickup Loop

**What goes wrong:** Posts that have already been picked up by the cron keep getting picked up again.
**Why it happens:** `content:schedule` is only cleaned up on status change. If `kvZRem('content:schedule', id)` is missed (e.g., during error handling), the cron finds the same post every 15 minutes.
**How to avoid:** The cron must FIRST advance the post to `processing` (update KV hash + zrem from schedule) before attempting Instagram API calls. Use a status check: skip any post in `content:schedule` whose hash record shows `status !== 'pending'`.
**Warning signs:** Same post appearing with multiple `igContainerId` values, or duplicate publish errors from Instagram.

### Pitfall 5: Instagram API Rate Limit

**What goes wrong:** `POST /media` fails with a rate limit error during high-volume testing.
**Why it happens:** Instagram allows 100 API-published posts per 24-hour rolling window, and 400 container creations per 24 hours.
**How to avoid:** At M&C's volume (1 post/day) this is not a concern. Do not stress-test with many posts in quick succession. Log the API response body on non-200 to capture rate limit messages.
**Warning signs:** HTTP 400 response with `code: 32` or `code: 17` in the error body.

### Pitfall 6: Cron Not Firing on Hobby Plan

**What goes wrong:** Cron jobs never execute even after deploying `vercel.json`.
**Why it happens:** Vercel Hobby plan only supports cron intervals of once per day or less. The 15-minute posting cron requires Vercel Pro.
**How to avoid:** Confirm Pro plan at vercel.com/dashboard before deploying `vercel.json`. This is a documented hard blocker in CONTEXT.md.
**Warning signs:** Cron jobs silently not executing; no logs in Vercel Functions dashboard for cron invocations.

### Pitfall 7: Vercel Blob `list()` Requires BLOB_READ_WRITE_TOKEN

**What goes wrong:** Blob cleanup cron fails in production: "Missing BLOB_READ_WRITE_TOKEN."
**Why it happens:** Server-side `list()` and `del()` require `BLOB_READ_WRITE_TOKEN` env var, which is automatically set by Vercel when the store is connected to the project — but must be explicitly pulled for local dev (`vercel env pull`).
**How to avoid:** Verify `BLOB_READ_WRITE_TOKEN` is set in all Vercel environments (Production, Preview, Development). The client-side `upload()` uses a separate short-lived token from the token endpoint.
**Warning signs:** Cleanup cron works locally (if using `vercel env pull`) but fails on deploy if the env var was not included in the right environments.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | mediainfo.js WASM, unpdf | ✓ | v20.9.0 (project uses 24.x on Vercel) | — |
| `@vercel/blob` | Video/PDF upload, cleanup | ✓ (installed) | 2.4.0 | — |
| `zod` | API route validation | ✓ (installed) | ^3.23.8 | — |
| `next` | All routes | ✓ (installed) | 16.2.6 | — |
| Upstash Redis | KV storage | ✓ (env vars exist in project) | REST API | — |
| `mediainfo.js` | Quality check | ✗ (not installed) | 0.3.7 | **None — must install** |
| `unpdf` | PDF extraction | ✗ (not installed) | 1.6.2 | **None — must install** |
| Vercel Blob store | Upload storage | **Unconfirmed** | — | Cannot ship without it |
| Vercel Pro plan | 15-min cron | **Unconfirmed** | — | Daily cron only (degrades posting to once/day) |
| Instagram Business account | Graph API publish | **Unconfirmed** | — | No publish path |
| `IG_ACCESS_TOKEN` env var | Token seed | **Unconfirmed** | — | Cron fails on first run |
| `CRON_SECRET` env var | Cron security | **Unconfirmed** | — | Cron endpoint publicly callable |
| `BLOB_READ_WRITE_TOKEN` env var | Server-side blob ops | **Auto-set by Vercel** | — | `vercel env pull` for local |

**Missing dependencies with no fallback (blockers):**
- `mediainfo.js` — must `npm install mediainfo.js`
- `unpdf` — must `npm install unpdf`
- Vercel Blob store connected to project (check Storage tab in Vercel dashboard)
- Vercel Pro plan confirmed for 15-minute cron
- Instagram Business account confirmed (Creator accounts cannot use Graph API)
- `IG_ACCESS_TOKEN` env var set in Vercel dashboard
- `CRON_SECRET` env var set in Vercel dashboard (any 32-char random string)

**Missing dependencies with fallback:**
- If Vercel plan is Hobby: posting cron degrades to daily; schedule UX still works but posts are published once per day at most

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Instagram inline poll in same request | Two-phase KV state machine (container create, then poll in later runs) | ~2022 when IG video processing times increased | Required for serverless — can't hold connection open |
| pdf-parse for serverless | unpdf (pdfjs-dist serverless build) | 2024 | pdf-parse fails with native dep errors on Vercel; unpdf is zero-native |
| ffprobe-static for video metadata | mediainfo.js WASM | — (locked decision) | ffprobe has `__dirname` bug on Vercel |
| `vercel.json` v1 cron syntax | `"crons": [{ "path": ..., "schedule": ... }]` | Current | Required format for Vercel Pro crons |

**Deprecated/outdated:**
- Instagram Basic Display API: replaced by Instagram Graph API for Business accounts; cannot publish
- `PUT_TO_URL` approach for IG videos: not deprecated but Blob URLs must be publicly accessible at creation time — Vercel Blob `access: 'public'` satisfies this

---

## Open Questions

1. **Is the Vercel project on Pro plan?**
   - What we know: `.vercel/project.json` shows `team_8FjOCXjuhgC0wFoz5SKalbc8` as orgId (team org, not personal)
   - What's unclear: Whether the team has Pro plan active
   - Recommendation: Kieran must verify at vercel.com/dashboard before Wave 3 (cron task)

2. **Is the Instagram account Business type?**
   - What we know: Creator accounts cannot use Graph API for publishing
   - What's unclear: M&C account type
   - Recommendation: Kieran must check in Meta Business Suite before Wave 3

3. **Is the Vercel Blob store already connected to this project?**
   - What we know: `BLOB_READ_WRITE_TOKEN` would be set automatically if so; package is already installed
   - What's unclear: Whether a Blob store has been provisioned
   - Recommendation: Check Storage tab in Vercel dashboard; if not, create one before Wave 2

4. **mediainfo.js WASM path in deployed bundle**
   - What we know: `outputFileTracingIncludes` with `./node_modules/mediainfo.js/dist/*.wasm` is the correct pattern
   - What's unclear: Whether the exact file path is `MediaInfoModule.wasm` — needs confirmed after `npm install mediainfo.js`
   - Recommendation: The validation task (`/api/test-mediainfo`) in Wave 0 gates this; do not proceed to full quality-check implementation until it passes on Vercel production

5. **IG User ID (`IG_USER_ID`) env var**
   - What we know: All Graph API calls require `/{IG_USER_ID}/media` — this is the Instagram-scoped user ID, not the Facebook page ID
   - What's unclear: Whether Kieran has this value available
   - Recommendation: Add `IG_USER_ID` to the env var list in the cron implementation task

---

## Validation Architecture

No automated test infrastructure exists in this project (no `jest.config.*`, no `vitest.config.*`, no `test/` directory, no test scripts in `package.json`). Given the complexity of external API integrations, the validation strategy is manual smoke-testing via purpose-built diagnostic endpoints.

### Phase Requirements → Validation Map

| Req ID | Behavior | Test Type | Validation Method |
|--------|----------|-----------|-------------------|
| UPLOAD-01 | Drag/drop + file picker | Manual | Open `/admin/content/new` in browser |
| UPLOAD-02 | Blob URL saved to post record | Manual | Check KV `content:{id}` hash after upload |
| UPLOAD-03 | Quality check <10s | Smoke | `POST /api/test-mediainfo` with known video URL; verify <10s response |
| UPLOAD-04 | Codec/res/aspect/bitrate/fps checks | Smoke | `POST /api/admin/content/quality-check` with test video; verify all fields present |
| UPLOAD-05 | Quality tag renders | Manual | Visual check in `/admin/content/new` |
| UPLOAD-06 | PDF upload works | Manual | Upload a PDF in the form |
| UPLOAD-07 | PDF text extracted | Manual | Check KV `content:{id}.scriptText` is non-empty |
| UPLOAD-08 | Blob cleanup deletes old files | Manual | Trigger `GET /api/cron/blob-cleanup` directly with `Authorization: Bearer $CRON_SECRET`; verify response |
| SCHEDULE-01 | Post creation form saves | Manual | Submit form; check redirect to queue |
| SCHEDULE-02 | KV record correct | Manual | Check `content:{id}` in Upstash console |
| SCHEDULE-03 | Feed grouped by status | Manual | Create posts with different statuses; verify grouping |
| SCHEDULE-04 | Cron picks up pending posts | Smoke | Trigger `GET /api/cron/post` directly; verify post status advances |
| SCHEDULE-05 | Retry button works | Manual | Set a post to `failed` manually; click Retry; verify status reset |
| PUBLISH-01 | IG container created | Smoke | Trigger cron with a pending post; verify `igContainerId` set in KV |
| PUBLISH-02 | State machine polls | Smoke | Trigger cron again; verify status code logged |
| PUBLISH-03 | Published + igMediaId saved | Smoke | Full cron run to FINISHED state; verify `igMediaId` in KV |
| PUBLISH-04 | Token refresh | Smoke | `GET /api/cron/token-refresh` directly; verify `ig:access_token` updated in KV |
| PUBLISH-05 | Distributed lock prevents double-fire | Smoke | Fire cron twice simultaneously; verify second returns `skipped: true` |

### Wave 0 Gaps

- [ ] `app/api/test-mediainfo/route.js` — validates WASM works on Vercel production (gates UPLOAD-03/04 implementation)
- [ ] No test framework needed — all validation is manual/smoke via API endpoints

---

## Sources

### Primary (HIGH confidence)
- [Vercel Blob Client Upload docs](https://vercel.com/docs/vercel-blob/client-upload) — `handleUpload` + `upload()` API (last_updated: 2026-03-27)
- [Vercel Blob SDK reference](https://vercel.com/docs/vercel-blob/using-blob-sdk) — `list()`, `del()` API (last_updated: 2026-05-19)
- [Instagram Graph API: Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/) — three-step Reels flow
- [Instagram Graph API: User Media endpoint](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/) — container creation params
- [Instagram: Refresh Access Token](https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/) — token refresh endpoint
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) — cron expressions, CRON_SECRET, plan requirements (last_updated: 2025-06-25)
- [Vercel WASM docs](https://vercel.com/docs/functions/runtimes/wasm) — WASM in serverless functions (last_updated: 2025-12-08)
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages) — exclude packages from bundling
- [Upstash REST API](https://upstash.com/docs/redis/features/restapi) — command URL format, SET NX EX, ZRANGEBYSCORE
- [mediainfo.js API docs](https://mediainfo.js.org/api/class/MediaInfo/) — `analyzeData()` signature
- [unjs/unpdf GitHub](https://github.com/unjs/unpdf) — `extractText()`, `getDocumentProxy()` API
- Codebase: `lib/kv.js`, `lib/jobStore.js`, `app/(crm)/admin/(protected)/kit/shell.jsx`, `app/(crm)/admin/(protected)/kit/app.jsx`, `app/(crm)/admin/(protected)/kit/icons.jsx`, `app/api/admin/leads/[leadId]/route.js`, `app/(crm)/admin/(protected)/[[...slug]]/page.jsx`

### Secondary (MEDIUM confidence)
- [DEV Community: WASM on Vercel serverless](https://dev.to/mfts/deploy-a-webassembly-powered-nextjs-app-on-vercel-serverless-functions-20b0) — `outputFileTracingIncludes` pattern (verified against Vercel WASM docs)
- [Chudi.dev: unpdf vs pdf-parse](https://chudi.dev/blog/serverless-pdf-processing-unpdf-vs-pdfparse) — pdf-parse failure modes on Vercel (consistent with npm package reports)
- [postproxy.dev: Instagram Reels API Publishing Guide](https://postproxy.dev/blog/instagram-reels-api-publishing-guide/) — status_code values (consistent with official Meta docs)

### Tertiary (LOW confidence)
- None — all critical claims verified with PRIMARY sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm view 2026-05-29
- Architecture: HIGH — patterns derived from official docs + existing codebase patterns
- Pitfalls: HIGH — verified against official Vercel/Meta docs and confirmed known issues
- Instagram state machine: HIGH — official Meta docs + known production patterns
- mediainfo.js WASM config: MEDIUM — confirmed pattern exists but exact WASM filename needs post-install verification via the validation task

**Research date:** 2026-05-29
**Valid until:** 2026-06-28 (30 days — Instagram API and Vercel are moderately stable; re-verify if Vercel announces Node.js runtime changes or Meta deprecates API version)
