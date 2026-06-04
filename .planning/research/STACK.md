# Technology Stack — Social Content Scheduler

**Project:** Matthews & Clark Social Content Scheduler
**Researched:** 2026-05-29
**Milestone:** v1.0 Social Content Scheduler (subsequent milestone on existing Next.js 15 App Router + Vercel + Upstash KV + Vercel Blob stack)

---

## Existing Stack (Validated — Do Not Re-Evaluate)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 App Router | Deployed on Vercel |
| KV Store | Upstash Redis | All lead/job/client data |
| Media Store | Vercel Blob | Already in use for photos |
| Notifications | Telegram bots | M&C group + Izimoto group |
| Auth | Custom cookie-based | Admin + token-protected public links |

---

## New Dependencies Required

### 1. Instagram Graph API — Reels Posting

**API version:** v25.0 (current as of May 2026, verified from official Meta docs)
**Base URL:** `https://graph.instagram.com`

**No npm client library needed.** The Meta SDKs are heavyweight and add no meaningful value over native `fetch`. Use the raw REST API directly with `fetch` in Node.js route handlers.

#### Complete container-to-publish flow

```
1. POST /v25.0/{ig-user-id}/media
   Required: media_type=REELS, video_url=<public URL>, access_token
   Returns: ig-container-id

2. GET /v25.0/{ig-container-id}?fields=status_code
   Poll until status_code = FINISHED (poll every 5-10s, max 5 min)

3. POST /v25.0/{ig-user-id}/media_publish
   Required: creation_id={ig-container-id}, access_token
   Returns: ig-media-id
```

For video upload, Meta's server fetches from the `video_url` directly — this means the Vercel Blob public URL is used as `video_url`. The resumable upload endpoint (`rupload.facebook.com`) is only needed for files over 100 MB or unreliable hosting — not required here since Vercel Blob is the source.

**Note on `scheduled_publish_time`:** The Graph API v25.0 documentation does not expose a native schedule parameter for Reels. Scheduling is handled in-app: store the desired publish time in Upstash KV, and let the Vercel Cron job call `media_publish` at the correct time.

**Note on `media_type` return value:** After publishing, querying the media's `media_type` field returns `VIDEO` — check `media_product_type` to confirm it is a Reel.

#### Access token management

| Token type | TTL | Refresh |
|-----------|-----|---------|
| Short-lived user token | ~1 hour | Not refreshable |
| Long-lived user token | 60 days | Refreshable after 24h, before 60d |

**Implementation requirement:** A cron job or startup check must refresh the long-lived token every 50-55 days. Store it in Upstash KV. Endpoint:
```
GET /v25.0/refresh_access_token
   ?grant_type=ig_refresh_token
   &access_token={long-lived-token}
```

**Rate limits:**
- 100 API-published posts per 24-hour window per IG account (Reels + feed + stories combined)
- Check usage: `GET /v25.0/{ig-user-id}/content_publishing_limit`

**Required permissions:** `instagram_business_content_publish` (Instagram Login flow) or `instagram_content_publish` (Facebook Login flow). Standard or Advanced Access tier required.

**Analytics endpoint for 48hr pull:**
```
GET /v25.0/{ig-media-id}/insights
   ?metric=plays,reach,likes,saves,comments,shares
   &access_token=...
```
New metrics as of Dec 2025: skip_rate (% who scrolled past in first 3s), reposts_count. Skip rate requires a statistical minimum view count — low-reach Reels may return null.

---

### 2. TikTok Content Posting API — Video Posting

**API version:** v2 (current)
**Base URL:** `https://open.tiktokapis.com/v2/post/publish/`

**No npm client library needed.** Use native `fetch`.

#### Auth and OAuth

| Token type | TTL | Refresh |
|-----------|-----|---------|
| User access token | 24 hours (86400s) | Refresh using refresh_token |
| Refresh token | 365 days | Requires new OAuth flow after expiry |

**Refresh endpoint:**
```
POST https://open.tiktokapis.com/v2/oauth/token/
Body: client_key, client_secret, grant_type=refresh_token, refresh_token
```

This is the most common production failure point: the access token expires daily. Implement proactive refresh (via cron) rather than reactive 401 handling.

**Required scope:** `video.publish`

**App audit:** All posts from unaudited apps are forced to private. Audit submission requires privacy policy URL, demo video of OAuth + upload flow, and data handling description. Community reports suggest 1-4 weeks for first-pass approval. Build with Inbox (draft) fallback so the feature ships before audit completes.

#### Direct Post flow (requires audit approval)

```
1. POST /v2/post/publish/creator_info/query/
   Header: Authorization: Bearer {access_token}
   Returns: available privacy levels for user

2. POST /v2/post/publish/video/init/
   Body: {
     post_info: { title, privacy_level, ... },
     source_info: { source: "PULL_FROM_URL", video_url: <public URL> }
       OR
     source_info: { source: "FILE_UPLOAD", video_size, chunk_size, total_chunk_count }
   }
   Returns: publish_id, upload_url (for FILE_UPLOAD only)

3. For FILE_UPLOAD: PUT chunks to upload_url
   Headers: Content-Type: video/mp4, Content-Range: bytes {start}-{end}/{total}
   upload_url expires 1 hour after issuance

4. POST /v2/post/publish/status/fetch/
   Body: { publish_id }
   Poll until status = PUBLISH_COMPLETE
```

#### Inbox (draft) fallback flow — for pre-audit or fallback

```
1. POST /v2/post/publish/inbox/video/init/
   (same body shape as Direct Post)
   Returns: publish_id, upload_url

2. [Same upload flow]

3. Poll /v2/post/publish/status/fetch/ until SEND_TO_USER_INBOX
   → TikTok sends in-app notification to creator to review and publish
```

**Upload method recommendation:** Use `PULL_FROM_URL` with the Vercel Blob public URL. This avoids chunked upload complexity and re-uses the same Blob URL used for Instagram. Domain verification is required — the `vercel-storage.com` domain needs verifying once in the TikTok developer console.

**Rate limits:**
- 6 init requests per minute per user access token
- Max 5 pending shares per user in any 24-hour window
- Status polling: 30 requests per minute per user access token

---

### 3. Server-Side Video Quality Check (ffprobe on Vercel)

This is the most constrained piece of the stack. The situation is nuanced.

#### The problem

`ffprobe-static` uses `__dirname` to locate its bundled binary. Next.js 15 App Router bundles server code into `.next/server/`, causing `__dirname` to resolve to the wrong path. This is a documented open bug (GitHub issue #53791). The combined `ffprobe-static` + `fluent-ffmpeg` package weight (~60-70 MB uncompressed) also risks pushing the function over the 250 MB uncompressed function limit when combined with other dependencies.

**Confidence on exact resolved size: LOW** — needs measurement at implementation time.

#### Recommended approach

Install both packages and use `serverExternalPackages` + `outputFileTracingIncludes` in `next.config.js` to prevent bundling and force correct path resolution:

```js
// next.config.js
module.exports = {
  serverExternalPackages: ['fluent-ffmpeg', 'ffprobe-static'],
  experimental: {
    outputFileTracingIncludes: {
      '/api/upload/probe': ['./node_modules/ffprobe-static/bin/**/*'],
    },
  },
}
```

Set the binary path explicitly at runtime (avoids the `__dirname` resolution bug):

```js
import ffprobe from 'fluent-ffmpeg'
import ffprobeStatic from 'ffprobe-static'

ffprobe.setFfprobePath(ffprobeStatic.path)
```

**Packages:**
- `fluent-ffmpeg` — fluent API wrapper for ffprobe/ffmpeg metadata extraction
- `ffprobe-static` — precompiled ffprobe binary for Linux x64 (Vercel runtime), macOS (local dev), Windows (local dev)

**Note:** Only `ffprobe` is needed for metadata extraction — **do not install `ffmpeg-static` or `@ffmpeg-installer/ffmpeg`**. Full ffmpeg (transcoding) is not required and the binary is much larger.

**What to extract per video:**

| Field | ffprobe stream key | Why |
|-------|------------------|-----|
| Codec | `codec_name` | Must be `h264` for both platforms |
| Resolution | `width`, `height` | Minimum 1080×1920 (9:16) recommended |
| Frame rate | `r_frame_rate` or `avg_frame_rate` | 23.98–60 fps acceptable |
| Bitrate | `bit_rate` (stream) or container | Min 8 Mbps for 1080p Reel quality |
| Duration | `duration` | Instagram: 5–90s; TikTok: 3s–10min |
| Audio codec | `codec_name` on audio stream | Must be `aac` |

**Vercel function constraints for the probe route:**
- Maximum function size: 250 MB uncompressed (confirmed from official docs, May 2026)
- Maximum duration: 300s Hobby / 800s Pro — probe runs in <1s, no concern
- Request body limit: 4.5 MB — video files cannot be uploaded via request body; use Vercel Blob multipart upload first, then probe the Blob URL or a temp file path

**Fallback if binary approach fails on Vercel:** Run the probe from a signed Blob URL using `ffprobe.input(blobUrl)` — ffprobe can probe remote URLs without downloading the full file (it reads headers and a small initial segment). This is the production-safe approach since no file I/O is needed on the function's ephemeral filesystem.

---

### 4. Vercel Cron + Blob for Scheduled Posting

#### Cron — Plan Constraints (CRITICAL)

| Plan | Max cron jobs | Min frequency | Precision |
|------|-------------|--------------|-----------|
| Hobby | 100 | Once per day | ±59 minutes |
| Pro | 100 | Once per minute | Per-minute |

**The project is currently on Hobby (inferred from existing deployment — verify before implementation).** Hobby limits cron to once per day, and expressions that resolve more frequently than daily fail at deployment. **Pro plan is required for the scheduled posting and analytics pull features.**

Minimum cron expressions needed:
- Posting dispatcher: `*/15 * * * *` (every 15 min) — requires Pro
- Analytics pull: `0 */2 * * *` (every 2 hours) — requires Pro

#### Cron configuration in `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/post-dispatcher",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/analytics-pull",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/cron/blob-cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Security:** Cron requests include `vercel-cron/1.0` user agent and `x-vercel-cron-schedule` header. Protect routes by checking `CRON_SECRET` env var (Vercel sets this automatically for cron-authenticated requests on Pro). Pattern:

```js
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ...
}
```

**Scheduling model:** Since no native `scheduled_publish_time` exists in either platform API, scheduled posts are stored in Upstash KV with a target Unix timestamp. The dispatcher cron runs every 15 minutes, queries KV for posts due within the current window, and calls the platform publish endpoints.

KV key pattern: `scheduled_post:{id}` with fields: `platform`, `blob_url`, `caption`, `publish_at`, `status`, `ig_container_id` (pre-created), `tiktok_publish_id`.

**Pre-creating the Instagram container:** Instagram containers can be created at upload time, so the 2-step create→poll→publish flow is front-loaded. At dispatch time, only `media_publish` needs to be called (assuming status is already `FINISHED`). This keeps the cron function fast.

#### Vercel Blob — 7-Day Cleanup

Vercel Blob has no native TTL. Implement cleanup via a daily cron:

```js
import { list, del } from '@vercel/blob'

// In /api/cron/blob-cleanup
const { blobs } = await list({ prefix: 'social-videos/' })
const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
const stale = blobs.filter(b => new Date(b.uploadedAt).getTime() < cutoff)
if (stale.length) await del(stale.map(b => b.url))
```

`list()` returns `uploadedAt` date — use this to identify blobs older than 7 days. `del()` accepts an array of URLs for batch deletion.

**Important:** Vercel Blob has no native TTL mechanism (confirmed from official docs and community, August 2025). The cron-based cleanup is the only supported approach.

#### Blob storage — using existing store

Vercel Blob is already provisioned. Store social videos under a namespaced prefix: `social-videos/{post-id}/{filename}`. Use `access: 'public'` so the URL is usable as `video_url` for both Instagram and TikTok PULL_FROM_URL. Use `multipart: true` on `put()` for files over ~5 MB.

---

### 5. Obsidian-Compatible Markdown Export

**No npm package required.** Obsidian's format is plain markdown with a YAML frontmatter block. Generate it with a template function.

#### Format specification

```markdown
---
title: "Post title or caption excerpt"
date: 2026-05-29
tags:
  - instagram
  - reels
  - growth-signal
platform: instagram
post_id: "17841234567890"
published_at: "2026-05-29T10:00:00Z"
reach: 4200
plays: 8100
likes: 312
saves: 47
shares: 28
comments: 14
skip_rate: 0.38
signal: growth
utm_campaign: "detailing-reel-may"
blob_url: "https://....public.blob.vercel-storage.com/social-videos/.../clip.mp4"
---

## Caption

[Full caption text here]

## Performance Notes

[Auto-generated summary: "High save rate (47) suggests tutorial/process content performs well"]

## Script Intelligence

[Hook used, content type, audience response pattern]
```

**Required fields per post type:**

| Field | Type | Purpose |
|-------|------|---------|
| `title` | string | Obsidian note title |
| `date` | YYYY-MM-DD | Obsidian date property (sort/filter) |
| `tags` | list | Platform, signal type (growth-signal / conversion-signal / non-performer) |
| `platform` | string | `instagram` or `tiktok` |
| `post_id` | string (quoted) | Platform media ID (quoted to prevent numeric truncation) |
| `published_at` | ISO 8601 string | For timeline queries |
| `reach`, `plays`, `likes`, `saves`, `shares`, `comments` | number | Analytics snapshot |
| `skip_rate` | number (0–1) | Instagram Reels only, may be null |
| `signal` | enum: `growth` / `conversion` / `non-performer` | The core classification |
| `utm_campaign` | string | Links to CRM lead attribution |

**Signal classification logic (implement in export function):**

```js
function classifySignal({ reach, saves, likes, plays }) {
  const saveRate = saves / plays
  const engagementRate = (likes + saves + comments + shares) / reach
  if (saveRate > 0.02 || reach > 5000) return 'growth'
  if (engagementRate > 0.05) return 'conversion'
  return 'non-performer'
}
```
Threshold values are starting points — refine after first 20 posts.

**Export destination:** Write files to a git-tracked directory (e.g. `obsidian-vault/posts/YYYY-MM/`) that can be synced via Obsidian Git plugin, or write directly to the filesystem if the vault is mounted. For a Vercel-hosted app, the practical path is: export generates the markdown string, writes it to Vercel Blob under `obsidian-export/posts/YYYY-MM/{post-id}.md`, then a separate sync mechanism (Obsidian Git, webhook, or scheduled download) pulls it into the local vault. Alternatively, write to a GitHub repo via the GitHub REST API from the cron job — this is the cleanest serverless-compatible approach.

---

## Installation

```bash
# Social platform API — no client libraries needed, use native fetch

# Video probe (ffprobe only, not full ffmpeg)
npm install fluent-ffmpeg ffprobe-static
npm install -D @types/fluent-ffmpeg

# Vercel Blob — already installed
# Upstash KV — already installed
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Instagram API client | Raw fetch | `instagram-graph-api` npm package | Adds 80KB+ for thin wrapper; fetch + typed interfaces is sufficient |
| TikTok API client | Raw fetch | None credible exists | No official Node.js SDK; community packages are outdated |
| Video validation | ffprobe-static + fluent-ffmpeg | Full ffmpeg-static | ffprobe-only is ~25 MB smaller; no transcoding needed |
| Video validation | ffprobe-static + fluent-ffmpeg | Remote probe service (e.g. AWS MediaInfo) | Adds SaaS dependency and latency; unnecessary for metadata-only check |
| Scheduling | Vercel Cron + Upstash KV | Vercel Queues | Vercel Queues is in preview and overkill for 1-post-at-a-time dispatching |
| Scheduling | Vercel Cron + Upstash KV | External cron service (e.g. Trigger.dev) | Adds SaaS dependency; Vercel Cron is sufficient on Pro plan |
| Obsidian export | Generated markdown string | `obsidian` npm package | No such package exists with meaningful functionality |
| Obsidian export dest | GitHub API write | Local filesystem write from Vercel | Vercel functions have ephemeral filesystem; GitHub write survives restarts |

---

## Key Vercel Constraints Summary

| Constraint | Value | Impact |
|-----------|-------|--------|
| Function size (uncompressed) | 250 MB | ffprobe-static adds ~25-30 MB; monitor total |
| Request body limit | 4.5 MB | Videos cannot be sent via request body — upload to Blob first |
| Cron min frequency (Hobby) | Once per day | **Pro plan required** for 15-min posting dispatcher |
| Cron min frequency (Pro) | Once per minute | Sufficient |
| Function max duration (Hobby) | 300s | No concern for probe or API calls |
| Blob TTL | None native | Cron-based cleanup required |
| Blob public URL | `*.public.blob.vercel-storage.com` | Usable as video_url for both IG and TikTok |

---

## Token Storage Pattern (Upstash KV)

Store social API tokens in KV with explicit expiry tracking:

```
kv key: "social:instagram:token"
value: { token: "...", expires_at: <unix ms>, refreshed_at: <unix ms> }

kv key: "social:tiktok:access_token"
value: { token: "...", expires_at: <unix ms> }

kv key: "social:tiktok:refresh_token"
value: { token: "...", expires_at: <unix ms> }  // 365 day TTL
```

A token-refresh cron (or check-on-use with proactive refresh window) handles both platforms.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|-----------|--------|
| Instagram Graph API v25.0 flow | HIGH | Official Meta developer docs (fetched directly) |
| Instagram token expiry / refresh | HIGH | Official Meta reference + multiple corroborating sources |
| Instagram analytics metrics | HIGH | Official docs + Dec 2025 Meta announcement |
| TikTok Content API v2 endpoints | HIGH | Official TikTok developer docs (fetched directly) |
| TikTok token TTL (24h access, 365d refresh) | HIGH | Official TikTok OAuth docs |
| TikTok audit requirement | HIGH | Official docs + community reports |
| Vercel Cron plan limits | HIGH | Official Vercel docs (fetched directly, updated March 2026) |
| Vercel function size limit (250 MB) | HIGH | Official Vercel docs (fetched directly, updated May 2026) |
| Vercel Blob no native TTL | HIGH | Official docs + community forum (August 2025) |
| ffprobe-static on Vercel (serverExternalPackages fix) | MEDIUM | GitHub issue open, workaround reported but not officially confirmed resolved |
| ffprobe binary size budget on Vercel | LOW | Needs measurement at implementation time |
| TikTok PULL_FROM_URL domain verification for vercel-storage.com | LOW | Process confirmed, but specific domain approval is an open action |

---

## Open Risks Requiring Phase-Specific Validation

1. **ffprobe on Vercel** — The `serverExternalPackages` + `outputFileTracingIncludes` fix resolves the `__dirname` bug in theory, but the GitHub issue is still open. Validate in an isolated branch before committing to this approach. Fallback: probe via remote URL (`ffprobe.input(blobUrl)`) which avoids the binary path issue entirely.

2. **TikTok app audit** — Direct Post requires audit approval (1-4 weeks). Build the Inbox fallback first and plan for a post-audit promotion to Direct Post.

3. **Vercel plan upgrade** — Confirm current plan before implementing cron-based scheduling. If on Hobby, the posting cron will fail at deployment.

4. **TikTok PULL_FROM_URL domain** — `*.public.blob.vercel-storage.com` may need to be added to TikTok's domain verification list before PULL_FROM_URL works. Verify during TikTok app setup, not at implementation time.

5. **Instagram scheduled_publish_time** — The Graph API does not natively schedule Reels. The in-app cron + pre-created container approach is the correct pattern. Confirm container status does not expire if created hours before publish (Meta does not document container TTL — validate empirically).

---

## Sources

- [Meta: Instagram Platform Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Meta: Instagram Refresh Access Token](https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/)
- [Meta: Instagram User Insights](https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights/)
- [TikTok: Content Posting API Overview](https://developers.tiktok.com/products/content-posting-api/)
- [TikTok: Video Upload Reference](https://developers.tiktok.com/doc/content-posting-api-reference-upload-video)
- [TikTok: Status Management](https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status)
- [TikTok: OAuth User Access Token Management](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [Vercel: Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel: Cron Jobs Usage and Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) (updated March 2026)
- [Vercel: Functions Limits](https://vercel.com/docs/functions/limitations) (updated May 2026)
- [Vercel: @vercel/blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk) (updated May 2026)
- [Next.js: serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [GitHub: ffprobe-static path resolution bug in Next.js](https://github.com/vercel/next.js/issues/53791)
- [Obsidian Properties / Frontmatter](https://curiouslychase.com/posts/obsidian-properties-markdown-frontmatter-enhanced/)
