# Architecture Patterns: Social Content Scheduler

**Domain:** Social content scheduling integrated into an existing Next.js 15 CRM
**Researched:** 2026-05-29
**Overall confidence:** HIGH (KV patterns from source, API flows from official docs)

---

## Existing KV Schema (reference)

The codebase uses a consistent naming convention. Understanding it is required before adding content keys.

```
lead:{id}                    → lead object
leads:index                  → sorted set, score = createdAt ms

client:{id}                  → client object
clients:index                → sorted set, score = updatedAt ms
client:{id}:leads            → sorted set of lead IDs per client
client:{id}:jobs             → sorted set of job IDs per client
clientByPhone:{phoneNorm}    → clientId lookup
clientByEmail:{email}        → clientId lookup

job:{id}                     → job object
jobs:index                   → sorted set, score = updatedAt ms
```

All reads/writes go through `lib/kv.js` (REST API client for Upstash, not `@upstash/redis`). `kvGet`, `kvSet`, `kvDel`, `kvZAdd`, `kvZRevRange`, `kvZRem`, `kvKeys`, `kvIncr` are the available primitives.

---

## Content Post KV Schema

Follow the exact same conventions as leads and jobs.

### Keys

```
content:{post_id}            → post object (full record)
content:index                → sorted set, score = scheduled_at ms (for cron dispatch)
content:published:index      → sorted set, score = published_at ms (for analytics cron)
```

### Post Object Shape

```js
{
  id: "uuid",
  createdAt: "ISO",
  updatedAt: "ISO",

  // Content
  caption: "string",
  hashtags: ["string"],           // stored as array, joined on publish
  blobUrl: "string",              // Vercel Blob URL — public, no auth
  qualityTag: "optimised" | "check_export" | "pending",
  qualityMeta: {                  // written by ffprobe step
    codec: "string",              // e.g. "h264"
    resolution: "1920x1080",
    fps: 30,
    bitrate: 8000000,             // bps
    durationSec: 45
  },

  // Scheduling
  scheduledAt: "ISO",             // UTC, what the cron compares against
  status: "draft" | "scheduled" | "publishing" | "published" | "failed",
  failReason: "string | null",

  // Platform targets
  platforms: ["instagram", "tiktok"],

  // Platform-specific IDs (written after publish)
  igContainerId: "string | null",
  igMediaId: "string | null",
  tiktokPublishId: "string | null",

  // Analytics (written by daily analytics cron after 48hr)
  metrics: {
    instagram: {
      views: number,
      reach: number,
      likes: number,
      comments: number,
      shares: number,
      saved: number,
      avgWatchTimeSec: number,
      fetchedAt: "ISO"
    } | null,
    tiktok: {
      views: number,
      likes: number,
      comments: number,
      shares: number,
      fetchedAt: "ISO"
    } | null
  },

  // UTM attribution
  utm: {
    campaign: "string | null",    // maps to lead.utm.campaign
    content: "string | null"      // post ID or slug for tracking
  }
}
```

### Index Operations

```
// Write on create / schedule
kvZAdd("content:index", Date.parse(post.scheduledAt), post.id)

// Write on publish success
kvZAdd("content:published:index", Date.now(), post.id)
kvZRem("content:index", post.id)

// Cron dispatch: posts due now
kvZRevRange("content:index", 0, -1)  // fetch all, filter score <= Date.now()
// Better: use ZRANGEBYSCORE — add kvZRangeByScore to lib/kv.js (see below)
```

### Required KV Primitive Addition

The cron dispatch needs `ZRANGEBYSCORE` to fetch only posts due by now. Add to `lib/kv.js`:

```js
// GET posts with score <= maxScore (epoch ms)
export async function kvZRangeByScore(setKey, minScore, maxScore) {
  const res = await kvFetch(
    `/zrangebyscore/${encodeURIComponent(setKey)}/${minScore}/${maxScore}`
  );
  return Array.isArray(res) ? res.map(String) : [];
}
```

---

## New Store File

Create `lib/contentStore.js` following the exact pattern of `lib/jobStore.js`:

```
lib/contentStore.js
  createPost(data)        → validates, assigns id, writes content:{id} + content:index
  getPost(id)             → kvGet content:{id}
  updatePost(id, patch)   → merge-patch + kvSet + reindex if scheduledAt changed
  listPostIds({limit})    → kvZRevRange content:index (newest scheduled first)
  listPosts({limit,status})
  deletePost(id)          → kvDel + kvZRem from both indexes
  listDuePosts(nowMs)     → kvZRangeByScore content:index, 0, nowMs
  listPostsForAnalytics() → kvZRangeByScore content:published:index, 0, cutoffMs
                           where cutoffMs = Date.now() - 48hr in ms
                           filtered to posts where metrics.instagram is null OR
                           metrics.tiktok is null
```

---

## API Routes

### New routes (all under `/app/api/admin/content/`)

```
/api/admin/content/route.js
  GET   → list posts (calls listPosts)
  POST  → create draft post (no upload yet)

/api/admin/content/upload/route.js
  POST  → multipart: receive video file
          → put to Vercel Blob (public)
          → run mediainfo.js quality check on the buffer
          → return { blobUrl, qualityTag, qualityMeta }

/api/admin/content/[postId]/route.js
  GET    → getPost
  PATCH  → updatePost (caption, hashtags, scheduledAt, platforms, status)
  DELETE → deletePost + kvDel blob if blobUrl present (via Vercel Blob del())

/api/admin/content/[postId]/publish/route.js
  POST  → manual immediate publish trigger (calls same logic as cron)
```

### New cron routes

```
/api/cron/content-publish/route.js
  GET   → triggered every 15 min by Vercel cron
          → listDuePosts(Date.now())
          → for each: run publishPost(post)

/api/cron/content-analytics/route.js
  GET   → triggered daily (e.g. 06:00 UTC)
          → listPostsForAnalytics()
          → for each: fetch IG + TikTok metrics, store in post.metrics

/api/cron/content-obsidian/route.js
  GET   → triggered nightly (e.g. 02:00 UTC)
          → listPosts({ limit: 1000, status: "published" })
          → for each post: render markdown, upsert to GitHub via Octokit
```

### Modified routes

```
/api/admin/crm-kit/route.js
  → add content posts to the aggregated payload (or leave out — content screen
    can use its own fetch to /api/admin/content)
  Recommendation: content screen fetches independently. The crm-kit
  endpoint is already large; content data has different cache needs.
```

### Auth pattern (consistent with existing routes)

All `/api/admin/content/*` routes follow the same cookie auth check:

```js
import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

Cron routes use `CRON_SECRET` bearer token instead (Vercel injects automatically):

```js
export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

---

## ffprobe / Video Quality Check on Vercel

**Verdict: ffprobe binary is not viable on Vercel serverless. Use mediainfo.js (WASM).**

### Why ffprobe fails on Vercel

- `ffprobe-static` and `@ffprobe-installer/ffprobe` rely on `__dirname` for binary path resolution, which resolves incorrectly in Next.js App Router's `.next/server/` bundle context
- Installing either package pushes the serverless function over Vercel's 50 MB compressed bundle limit
- Vercel explicitly does not recommend ffmpeg/ffprobe for serverless functions
- Build compilation errors were documented in 2024 with `@ffprobe-installer` in Next.js 14+

### Recommended approach: mediainfo.js (WASM)

`mediainfo.js` is a WebAssembly port of MediaInfoLib. The WASM file is ~2.4 MB and works in both browser and Node.js. It returns codec, resolution, bitrate, fps, and duration — exactly what's needed for the quality tag.

**Quality check logic in `/api/admin/content/upload/route.js`:**

```js
import MediaInfo from "mediainfo.js";
import { put } from "@vercel/blob";

export async function POST(request) {
  // 1. Parse multipart body (Next.js 15: request.formData())
  const formData = await request.formData();
  const file = formData.get("video");
  const buffer = Buffer.from(await file.arrayBuffer());

  // 2. Upload to Vercel Blob first (gives us public URL)
  const blob = await put(`content/${crypto.randomUUID()}.mp4`, buffer, {
    access: "public",
    contentType: file.type
  });

  // 3. Run mediainfo quality check on the buffer
  const mi = await MediaInfo({ format: "JSON" });
  const result = await mi.analyzeData(buffer.length, (size, offset) =>
    buffer.subarray(offset, offset + size)
  );
  mi.close();

  const tracks = result?.media?.track ?? [];
  const video = tracks.find(t => t["@type"] === "Video") ?? {};
  const general = tracks.find(t => t["@type"] === "General") ?? {};

  const qualityMeta = {
    codec: video.Format?.toLowerCase() ?? null,         // "avc" = h264
    resolution: video.Width && video.Height
      ? `${video.Width}x${video.Height}` : null,
    fps: parseFloat(video.FrameRate) || null,
    bitrate: parseInt(video.BitRate, 10) || null,       // bps
    durationSec: parseFloat(general.Duration) || null
  };

  // 4. Determine quality tag
  // Optimised: h264/h265, >= 1080p, >= 24fps, >= 5Mbps, <= 90s (IG limit)
  const isOptimised = (
    ["avc", "hevc", "h264", "h265"].includes(qualityMeta.codec) &&
    parseInt(video.Height) >= 1080 &&
    qualityMeta.fps >= 24 &&
    qualityMeta.bitrate >= 5_000_000 &&
    qualityMeta.durationSec <= 90
  );
  const qualityTag = qualityMeta.codec ? (isOptimised ? "optimised" : "check_export") : "pending";

  return Response.json({ blobUrl: blob.url, qualityTag, qualityMeta });
}
```

**Installation:**
```bash
npm install mediainfo.js
```

**WASM loading in Next.js:** Next.js 15 supports WASM natively via `experimental.serverComponentsExternalPackages` or by treating it as a static asset. `mediainfo.js` loads its WASM from `node_modules/mediainfo.js/dist/MediaInfoModule.wasm`. Add to `next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mediainfo.js"]
  }
};
```

**Confidence:** MEDIUM. mediainfo.js is confirmed to support Node.js and WASM runtime. The `serverComponentsExternalPackages` config is needed for packages with native WASM. Validate this actually loads in Vercel's runtime in Phase 1.

---

## Instagram Container → Publish Flow

**Official source:** Meta Graph API v25.0, `graph.instagram.com`

### Complete flow

```
Step 1 — Create container
  POST https://graph.instagram.com/v25.0/{IG_USER_ID}/media
  Body (form or JSON):
    media_type = "REELS"
    video_url  = {blobUrl}      ← Vercel Blob public URL, Meta fetches it
    caption    = {caption + hashtags joined}
    share_to_feed = true
  Response: { id: "<IG_CONTAINER_ID>" }

Step 2 — Poll status (max 5 checks, 1 per minute)
  GET https://graph.instagram.com/v25.0/{IG_CONTAINER_ID}
    ?fields=status_code
    &access_token={INSTAGRAM_ACCESS_TOKEN}
  Response status_code values:
    IN_PROGRESS → keep polling
    FINISHED    → proceed to publish
    ERROR       → fail post, store failReason
    EXPIRED     → container expired (24hr TTL), must recreate
    PUBLISHED   → already published (shouldn't happen in this flow)

Step 3 — Publish
  POST https://graph.instagram.com/v25.0/{IG_USER_ID}/media_publish
  Body:
    creation_id = {IG_CONTAINER_ID}
    access_token = {INSTAGRAM_ACCESS_TOKEN}
  Response: { id: "<IG_MEDIA_ID>" }
  → Store ig_media_id in post record
```

### Key constraints
- `video_url` must be publicly accessible (Vercel Blob public URLs satisfy this)
- Rate limit: 100 API-published posts per rolling 24-hour window
- Reels eligible for Reels tab: 5–90 seconds, 9:16 aspect ratio
- Container expires after 24 hours if not published
- Access token: long-lived Page/Business token stored in `INSTAGRAM_ACCESS_TOKEN` env var

### Cron scheduling concern

The 15-minute cron starts Step 1 and Step 3. Step 2 (polling) needs to happen between them. Two options:

**Option A (simpler): Single-cron with inline polling**
The cron function polls status up to 5 times with `setTimeout`-equivalent delays. Vercel Pro function max duration is 60s (Fluid compute) / 300s for paid. Five 1-minute polls = 5 minutes, which fits within Pro limits but not Hobby (10s max on Hobby).

**Option B (recommended): Two-phase KV state machine**
- Cron run N: detects post due → POST container → set `status = "publishing"`, `igContainerId = X`
- Cron run N+1 (15 min later): finds `status = "publishing"` posts → polls status → if FINISHED, publishes
- Cleaner, no long-running function, works on Hobby

**Use Option B.** Add `igContainerId` to the post and handle the publishing state in the cron.

---

## TikTok URL-Based Upload Flow

**Official source:** TikTok Content Posting API v2, `open.tiktokapis.com`

### Complete flow (PULL_FROM_URL — recommended for Vercel)

```
Step 1 — Query creator info (once per session / cache)
  GET https://open.tiktokapis.com/v2/post/publish/creator_info/query/
  Headers: Authorization: Bearer {TIKTOK_ACCESS_TOKEN}
  Response: { privacy_level_options: [...], comment_disabled, duet_disabled, ... }
  → Cache result in KV for 1 hour: kv.set("tiktok:creator_info", data, {ex: 3600})

Step 2 — Initialize post
  POST https://open.tiktokapis.com/v2/post/publish/video/init/
  Headers: Authorization: Bearer {TIKTOK_ACCESS_TOKEN}
  Body (JSON):
    {
      "post_info": {
        "title": "{caption}",
        "privacy_level": "PUBLIC_TO_EVERYONE",  // or from creator_info
        "disable_duet": false,
        "disable_stitch": false,
        "disable_comment": false
      },
      "source_info": {
        "source": "PULL_FROM_URL",
        "video_url": "{blobUrl}"               // Vercel Blob public URL
      }
    }
  Response: { data: { publish_id: "...", upload_url: null } }
  → Store publish_id in post record

Step 3 — Poll status (same two-phase cron pattern as Instagram)
  GET https://open.tiktokapis.com/v2/post/publish/status/fetch/
  Body: { "publish_id": "{publish_id}" }
  Response status values:
    PROCESSING_DOWNLOAD → TikTok is fetching from blob_url, keep polling
    PUBLISH_COMPLETE    → success, post is live
    FAILED              → check fail_reason field
    SEND_TO_USER_INBOX  → fallback: user must finish in-app (Inbox flow)
```

### Key constraints
- `video.publish` scope required — must be approved via TikTok audit before posts are public
- Until audit approval: all posts are `SELF_ONLY` (private) in testing
- Domain verification: TikTok requires URL prefix ownership verification for `PULL_FROM_URL` — register `*.vercel-storage.com` or the specific Vercel Blob domain in TikTok dev portal
- Rate limit: 6 init requests per minute per user access token
- PULL_FROM_URL URL must be HTTPS, no redirects, accessible for up to 1 hour

### Vercel Blob URL compatibility
Vercel Blob generates URLs like `https://{account}.public.blob.vercel-storage.com/{path}`. These are HTTPS, publicly accessible, no redirects. Domain `public.blob.vercel-storage.com` needs to be registered as a verified domain in the TikTok developer portal before PULL_FROM_URL will work.

---

## Obsidian Export

**Verdict: GitHub API via Octokit is the only viable approach on Vercel. No filesystem, no git binary.**

### Why not filesystem or git binary

- Vercel serverless functions have a read-only filesystem (`/tmp` is writable but ephemeral, destroyed after each invocation)
- The Obsidian vault lives on a local machine, not a server path accessible to Vercel
- Running `git` as a subprocess in a serverless function requires a bundled binary — same size and path-resolution problems as ffprobe

### Recommended approach: GitHub Contents API via Octokit

The nightly cron pushes markdown files directly to a GitHub repository that is also the Obsidian vault (via the `obsidian-git` plugin on the client side). Obsidian pulls the repo on open/sync. No filesystem access required.

**Flow:**

```
1. Nightly cron fetches all published posts from KV
2. For each post: render a markdown file
3. Use @octokit/rest to call repos.createOrUpdateFileContents()
   - If file exists: GET current SHA first, pass in update call
   - If new: call with no SHA
4. Commit message: "content: update post YYYY-MM-DD {post_id}"
```

**Markdown file naming:**

```
content/posts/{YYYY}/{MM}/{post_id}.md
```

**Markdown frontmatter + body structure:**

```markdown
---
id: {post_id}
scheduled: {scheduledAt}
published: {publishedAt}
platforms: [instagram, tiktok]
quality: optimised
utm_campaign: {utm.campaign}
ig_media_id: {igMediaId}
tiktok_publish_id: {tiktokPublishId}
signal: audience-growth | conversion | non-performer | pending
---

# {first 60 chars of caption}

{full caption}

{hashtags joined with space}

## Metrics (48hr)

| Platform  | Views | Likes | Comments | Shares | Saves |
|-----------|-------|-------|----------|--------|-------|
| Instagram | {n}   | {n}   | {n}      | {n}    | {n}   |
| TikTok    | {n}   | {n}   | {n}      | {n}    | -     |
```

**Signal tagging logic (computed from metrics):**
- `audience-growth` → shares > 20 OR reach > 3x avg reach
- `conversion` → lead.utm.campaign matches this post's utm.campaign within 7 days
- `non-performer` → views < 500 after 48hr
- `pending` → metrics not yet fetched

**Required env vars for Obsidian export:**
```
GITHUB_TOKEN=ghp_...          # PAT with repo write scope
OBSIDIAN_REPO_OWNER=kieran    # GitHub username/org
OBSIDIAN_REPO_NAME=mc-vault   # Repository name
```

**Installation:**
```bash
npm install @octokit/rest
```

**New file:** `lib/obsidianExport.js` — exports `upsertPostToVault(post)` and `buildMarkdown(post)`.

---

## Vercel Cron Configuration

Create `vercel.json` at project root (currently absent):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/content-publish",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/content-analytics",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/content-obsidian",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Constraints:**
- Cron jobs only run on production deployment (not preview)
- Hobby plan: 2 cron max, timing varies ±1 hour — use Pro (already on Vercel based on project)
- `CRON_SECRET` is auto-injected by Vercel as a bearer token
- All schedules are UTC
- Each cron is a standard GET request to the route

---

## New CRM Screen

**File:** `app/(crm)/admin/(protected)/kit/screens-content.jsx`

Follows the identical pattern of `screens-leads.jsx`, `screens-job.jsx` etc — a client-side React component that reads from the CRM shell's data context, plus its own async fetch for content-specific data.

**Navigation:** Add `content` screen to `shell.jsx` nav items.

**Data fetch:** Content screen fetches from `/api/admin/content` independently (not via `crm-kit` aggregate endpoint). This is intentional — content data changes on a different cadence to leads/jobs.

**UI components needed:**
- Post list with status badge, quality tag, scheduled time, platform icons
- Schedule picker (datetime-local input)
- Video upload with drag-and-drop, quality result display
- Metrics table (shows after 48hr)
- Platform toggle (Instagram / TikTok / both)

---

## Data Flow Diagrams

### Upload Flow

```
Browser (drag video)
  → POST /api/admin/content/upload (multipart)
    → parse formData, get file buffer
    → put(buffer) → Vercel Blob
    → mediainfo.js(buffer) → qualityMeta
    → return { blobUrl, qualityTag, qualityMeta }
  ← { blobUrl, qualityTag, qualityMeta }
  → POST /api/admin/content (create post with blobUrl + quality)
  ← { post }
```

### Publish Flow (15-min cron)

```
Vercel Cron → GET /api/cron/content-publish
  → verifyAdminSession(CRON_SECRET)
  → listDuePosts(Date.now())

  For each post where status = "scheduled":
    → if "instagram" in platforms:
        POST /{IG_ID}/media (container creation)
        → update post: status="publishing", igContainerId=X

    → if "tiktok" in platforms:
        POST /v2/post/publish/video/init/ (PULL_FROM_URL)
        → update post: tiktokPublishId=X

  For each post where status = "publishing":
    → if igContainerId present:
        GET /{igContainerId}?fields=status_code
        if FINISHED → POST /{IG_ID}/media_publish → igMediaId
    → if tiktokPublishId present:
        GET /v2/post/publish/status/fetch/ → check status
        if PUBLISH_COMPLETE → tiktokPublishId confirmed
    → if all platforms done: status="published"
      → kvZAdd content:published:index
      → kvZRem content:index
```

### Analytics Flow (daily cron)

```
Vercel Cron → GET /api/cron/content-analytics
  → listPostsForAnalytics()  // published > 48hr ago, metrics null
  For each post:
    → if igMediaId:
        GET /{igMediaId}/insights?metric=views,reach,likes,comments,shares,saved,ig_reels_avg_watch_time
        → store in post.metrics.instagram
    → if tiktokPublishId:
        GET /v2/video/query/?fields=view_count,like_count,comment_count,share_count
        → store in post.metrics.tiktok
    → updatePost(id, { metrics, updatedAt })
```

### Obsidian Export Flow (nightly cron)

```
Vercel Cron → GET /api/cron/content-obsidian
  → listPosts({ limit: 500, status: "published" })
  For each post:
    → buildMarkdown(post)            // lib/obsidianExport.js
    → computeSignal(post)            // audience-growth | conversion | non-performer | pending
    → path = content/posts/{YYYY}/{MM}/{post.id}.md
    → octokit.repos.getContent(path) // get SHA if exists, null if new
    → octokit.repos.createOrUpdateFileContents({
        owner, repo, path,
        message: `content: ${post.id}`,
        content: base64(markdown),
        sha: existingFileSha || undefined
      })
```

---

## New vs Modified Files

### New files

```
lib/contentStore.js                                    # KV operations for posts
lib/obsidianExport.js                                  # markdown builder + Octokit upsert

app/api/admin/content/route.js                        # list + create posts
app/api/admin/content/upload/route.js                 # video upload + quality check
app/api/admin/content/[postId]/route.js               # get + patch + delete post
app/api/admin/content/[postId]/publish/route.js       # manual publish trigger

app/api/cron/content-publish/route.js                 # 15-min publish cron
app/api/cron/content-analytics/route.js               # daily analytics cron
app/api/cron/content-obsidian/route.js                # nightly Obsidian export cron

app/(crm)/admin/(protected)/kit/screens-content.jsx   # content screen component

vercel.json                                           # cron schedule config (new file)
```

### Modified files

```
lib/kv.js
  → add kvZRangeByScore(setKey, minScore, maxScore)

app/(crm)/admin/(protected)/kit/shell.jsx
  → add "Content" nav item linking to screens-content

next.config.js
  → add serverComponentsExternalPackages: ["mediainfo.js"]
```

### Files explicitly NOT modified

```
lib/leadStore.js          # no changes; UTM attribution is read-only link by campaign value
lib/jobStore.js           # no changes
app/api/admin/crm-kit/    # content data fetched separately; do not bundle into aggregate endpoint
```

---

## Build Order (dependency-respecting)

1. **KV schema + contentStore** — everything else depends on post CRUD
   - `lib/kv.js` (add kvZRangeByScore)
   - `lib/contentStore.js`

2. **Upload route + quality check** — needed before any post can have a blobUrl
   - `app/api/admin/content/upload/route.js`
   - Validate mediainfo.js loads correctly in Vercel's runtime

3. **Post CRUD routes** — needed before the screen or crons
   - `app/api/admin/content/route.js`
   - `app/api/admin/content/[postId]/route.js`

4. **Content CRM screen** — requires CRUD routes to be working
   - `app/(crm)/admin/(protected)/kit/screens-content.jsx`
   - `shell.jsx` nav update

5. **Publish cron + IG/TikTok publish logic** — requires posts to exist in KV
   - `app/api/cron/content-publish/route.js`
   - `vercel.json` (content-publish entry)

6. **Analytics cron** — requires published posts with platform IDs
   - `app/api/cron/content-analytics/route.js`
   - `vercel.json` (content-analytics entry)

7. **Obsidian export cron** — requires posts with metrics (can run earlier without metrics, writes pending signal)
   - `lib/obsidianExport.js`
   - `app/api/cron/content-obsidian/route.js`
   - `vercel.json` (content-obsidian entry)

---

## Vercel-Specific Constraints Summary

| Constraint | Detail |
|------------|--------|
| Function bundle size | 50 MB compressed max. ffprobe-static pushes over. mediainfo.js WASM is ~2.4 MB. |
| Function duration | Hobby: 10s max. Pro: 60s (standard), 300s (Fluid compute). Use two-phase cron, not inline polling. |
| Cron scheduling | Pro plan: up to 40 crons, exact timing. Hobby: 2 crons, ±1 hour variance. |
| Cron auth | Vercel auto-injects `CRON_SECRET` as `Authorization: Bearer ...` header. |
| Filesystem | Read-only except `/tmp`. No git binary, no local file persistence. |
| Blob URLs | Public URLs like `https://{acct}.public.blob.vercel-storage.com/{path}`. Valid for both IG video_url and TikTok PULL_FROM_URL (after domain verification in TikTok portal). |
| Cron only on production | Crons do not trigger on preview deployments. |

---

## Environment Variables Required

```bash
# Existing
KV_REST_API_URL
KV_REST_API_TOKEN
# (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)

# New: Instagram
INSTAGRAM_ACCESS_TOKEN=     # Long-lived business/page token
INSTAGRAM_BUSINESS_ID=      # IG user ID for the M&C account

# New: TikTok
TIKTOK_ACCESS_TOKEN=        # User access token with video.publish scope
TIKTOK_OPEN_ID=             # TikTok open_id for the M&C account

# New: Obsidian export
GITHUB_TOKEN=               # PAT, repo write scope
OBSIDIAN_REPO_OWNER=
OBSIDIAN_REPO_NAME=

# Auto-injected by Vercel (do not set manually)
CRON_SECRET
```

---

## Sources

- [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi) — confirmed via existing `lib/kv.js` source
- [Instagram Graph API: Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/) — HIGH confidence, official Meta docs
- [Instagram Media Insights](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/) — HIGH confidence, official Meta docs
- [TikTok Content Posting API: Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post) — HIGH confidence, official TikTok docs
- [TikTok Media Transfer Guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide) — HIGH confidence, official TikTok docs
- [TikTok Post Status Reference](https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status) — HIGH confidence, official TikTok docs
- [mediainfo.js GitHub](https://github.com/buzz/mediainfo.js) — MEDIUM confidence (Node.js support confirmed, Vercel serverless WASM loading needs runtime validation)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) — HIGH confidence, official Vercel docs
- [Octokit createOrUpdateFileContents](https://octokit.rest/PUT/repos/%7Bowner%7D/%7Brepo%7D/contents/%7Bpath%7D) — HIGH confidence, official Octokit docs
- [Vercel: ffmpeg/ffprobe not recommended](https://github.com/vercel/vercel/discussions/9561) — HIGH confidence, Vercel team response
- [Instagram Reels API Publishing Guide](https://postproxy.dev/blog/instagram-reels-api-publishing-guide/) — MEDIUM confidence, third-party but technically accurate
