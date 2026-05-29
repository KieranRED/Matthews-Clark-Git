# Domain Pitfalls: Social Content Scheduler

**Domain:** Instagram Graph API + TikTok Content API integration on Next.js 15 / Vercel
**Researched:** 2026-05-29
**Milestone:** v1.0 Social Content Scheduler

---

## Critical Pitfalls

These cause silent production failures, rewrites, or hard blockers.

---

### CRITICAL-01: Instagram Token Silently Expires in Production

**Phase:** Phase 1 (Instagram posting setup)
**Hard Blocker:** YES — posting stops entirely with no user-visible error

**What goes wrong:**
Long-lived Instagram tokens expire after 60 days. There is no automatic refresh. If you build Instagram posting, deploy it, and don't build the refresh mechanism, the integration silently breaks two months later. The CRM will think it's posting but receive 400 errors. Token errors don't always surface in Telegram notifications unless you explicitly handle them.

**Why it happens:**
Developers implement the happy path (OAuth → get long-lived token → post), test it, and ship. The 60-day cliff isn't obvious during development. The refresh endpoint exists (`GET /refresh_access_token`) but requires you to call it before expiry — expired tokens cannot be refreshed and require full re-authentication.

**Consequences:**
- All scheduled posts silently fail after ~60 days
- Re-authentication requires going through the full OAuth flow again from the admin UI
- Token that has already expired cannot be refreshed via the API — it's permanently dead

**Prevention:**
1. Store the token acquisition timestamp alongside the token in Upstash Redis (`instagram:token`, `instagram:token_acquired_at`)
2. Build a weekly Vercel Cron job (`0 9 * * 1`) that checks `token_acquired_at` and calls the refresh endpoint if it's been more than 50 days
3. Refresh window: tokens can be refreshed any time after 24h but before 60 days — target day 50-55
4. On any 190 error (token expired/invalid) from the Graph API, write a `NEEDS_REAUTH` flag to Redis and surface it in the CRM admin UI
5. Test token refresh explicitly in dev, not just posting

**Detection:**
Graph API returns `{"error": {"code": 190, "type": "OAuthException"}}`. Watch for this error code in all API responses, not just publish calls.

**Confidence:** HIGH — confirmed in Meta official docs and multiple production post-mortems

---

### CRITICAL-02: ffprobe Binary Path Breaks in Vercel Serverless

**Phase:** Phase 1 (upload + quality check on video ingest)
**Hard Blocker:** YES — quality checker fails silently or with a cryptic path error

**What goes wrong:**
`ffprobe-static` and `ffmpeg-static` use `__dirname` internally to construct the path to their binaries. In Next.js App Router API routes deployed to Vercel, `__dirname` resolves to the compiled `.next/server` output directory — not `node_modules` — so the binary is never found. The function throws `Error: Cannot find module` or a silent path resolution failure. This is a documented but unresolved issue in Next.js (GitHub issue #53791).

**Why it happens:**
Next.js's output file tracing system bundles code but doesn't reliably carry native binary assets through `__dirname`-based path resolution. The App Router has less mature support for `outputFileTracingIncludes` than the Pages Router.

**Consequences:**
- Upload endpoint crashes on first video quality check
- Confusing error messages (path not found vs. ffprobe not found)
- Can cause function bundle to exceed 250 MB uncompressed limit if binaries are double-bundled

**Prevention:**
Option A (recommended for this use case — ffprobe only, not full ffmpeg):
Use `@microlink/ffprobe` instead of `ffprobe-static`. It provides an always-updated static binary with explicit Node.js path resolution designed for serverless environments.

Option B:
Add to `next.config.js`:
```js
experimental: {
  outputFileTracingIncludes: {
    '/api/admin/content/upload': ['./node_modules/ffprobe-static/bin/**/*'],
  },
}
```
This is documented as working inconsistently in App Router — test on a real Vercel deploy, not just locally.

Option C (fallback if both fail):
Shell out to a separate Vercel Function using the `maxDuration` config and pass the Blob URL. Avoid pulling the full binary into the primary function bundle.

**Never do:** Assume `path.resolve(process.cwd(), 'node_modules/...')` will work — Vercel's function execution environment has no guaranteed filesystem layout relative to `process.cwd()`.

**Confidence:** HIGH — reproduced in Next.js GitHub issues, confirmed with Vercel docs on bundle tracing

---

### CRITICAL-03: TikTok Direct Post Approval Takes 2–4 Weeks (No Expedited Track)

**Phase:** Phase 2 (TikTok posting)
**Hard Blocker:** YES — blocks shipping Phase 2 without the fallback strategy

**What goes wrong:**
TikTok's `video.publish` scope (Direct Post) requires a manual review process that takes 2–4 weeks with possible multiple feedback rounds. During review, all posts are automatically set to `SELF_ONLY` (private), and only 5 accounts can authorize your app per 24-hour window. There is no way to pay for faster review.

**Why it happens:**
TikTok manually audits all apps requesting Direct Post access and will reject applications for vague use cases, missing privacy policies, or failing their UX compliance checklist (creators must see their username/avatar before every post).

**Common rejection reasons:**
- Use case description too generic ("social media management tool")
- Privacy policy doesn't mention TikTok data handling
- App UI doesn't display creator's username and avatar before posting
- Requesting `user.info.basic` scope without needing it (scope inflation)
- No working demo or Loom walkthrough of the flow

**Consequences:**
- Phase 2 shipping blocked for a month if application isn't started early
- `SELF_ONLY` posts during review mean M&C can't verify real-world posting behavior

**Prevention:**
1. Submit the TikTok Direct Post application at the start of Phase 1 (in parallel with Instagram work)
2. Build the "Upload to Inbox" fallback first using `video.upload` scope — this requires a separate but faster approval and sends videos to TikTok as drafts for manual publishing
3. Write the application with M&C's specific use case: "single brand account, self-hosted, posts 1 Reel per day to @matthewsandclark"
4. Prepare the Loom demo walkthrough before submitting
5. Implement the UX requirement: show account name and avatar in the posting confirmation step

**Note on Upload to Inbox:** Posts arrive in TikTok's draft inbox and require a human to tap "Post" in the TikTok app. This is an acceptable MVP while waiting for Direct Post approval.

**Confidence:** HIGH — confirmed in TikTok developer docs and multiple third-party developer guides

---

### CRITICAL-04: Vercel Cron Cannot Fire at Exact Scheduled Time on Hobby Plan

**Phase:** Phase 1/2 (post scheduling)
**Hard Blocker:** YES on Hobby plan — requires plan decision before building scheduling logic

**What goes wrong:**
Vercel Hobby plan: cron jobs run at most once per day, and timing is imprecise (±59 minutes within the configured hour). `*/15 * * * *` or `0 * * * *` will fail at deployment with: "Hobby accounts are limited to daily cron jobs."

Vercel Pro plan: cron jobs run per-minute with per-minute precision. The project is already on Vercel (Pro is $20/month and likely already active based on production deployment).

**Even on Pro plan:** Vercel warns that the same cron event can be delivered more than once (via Amazon EventBridge Scheduler). A cron that fires twice for a post scheduled at 09:00 will attempt to publish the same Reel twice — one will succeed, one will get a duplicate error from Instagram/TikTok, but only if you handle idempotency.

**Consequences:**
- Hobby plan: scheduling more precisely than "once a day" is impossible
- Pro plan without idempotency: duplicate posts to Instagram/TikTok on rare occasions
- Post goes live at the wrong time if you schedule for "09:00 UTC" but fire hourly

**Prevention:**
1. Confirm project is on Pro plan (required for per-minute cron resolution)
2. Cron fires every minute (`* * * * *`) and queries Redis for posts where `scheduled_at <= now() AND status = 'pending'`
3. Immediately write `status = 'processing'` with a lock timestamp before any API call
4. Check lock age: if `processing` for > 10 minutes, reset to `pending` (stale lock recovery)
5. Use Redis `SET key value NX EX 600` (SET if Not eXists, expire in 10 minutes) as a distributed lock to prevent duplicate processing
6. Post state machine: `pending → processing → published | failed` — never re-process a non-pending post

**Confidence:** HIGH — sourced directly from Vercel official docs (last updated 2026-03-04)

---

### CRITICAL-05: Instagram Container Processing Is Async — Publishing Too Fast Causes Error 9007

**Phase:** Phase 1 (Instagram Reels publishing)
**Hard Blocker:** YES — the most common production error for Reels posting

**What goes wrong:**
Instagram Reels publishing is a three-step process: (1) create container, (2) poll until `FINISHED`, (3) publish. Step 2 is asynchronous and takes 30 seconds to 2+ minutes depending on video size and Meta server load. Calling the publish endpoint while the container is still `IN_PROGRESS` returns error 9007, which is uninformative and causes developers to assume their credentials are wrong.

**Container statuses:**
- `IN_PROGRESS` — processing, do not publish yet
- `FINISHED` — safe to publish
- `ERROR` — processing failed, create a new container
- `EXPIRED` — container not published within 24 hours

**Why it happens:**
Developers test with short videos that process quickly and never encounter the timing issue. Production Reels (15–60s, higher bitrate) take longer. Polling is skipped or has a fixed 5s delay that works in testing but not production.

**Consequences:**
- Error 9007 on every publish attempt for larger video files
- Container marked as failed, must create a new one (cannot retry same container)
- Scheduled post missed if retry logic isn't built

**Prevention:**
1. Never call `media_publish` immediately after container creation
2. Implement a polling loop: check container status every 30 seconds, up to 5 minutes total (Meta's own recommendation: once per minute for no more than 5 minutes)
3. If status is `ERROR` after polling: mark post as `failed` in Redis, send Telegram alert, do not retry the same container
4. If status is still `IN_PROGRESS` after 5 minutes: mark as `stalled`, alert via Telegram, retry with a new container on next cron cycle
5. Store `container_id` in Redis so polling can be resumed if the serverless function times out mid-poll

**Architecture note:** The polling loop within a single serverless function invocation is fine for this use case (1 post/day). A 5-minute maximum poll fits within Vercel's 300s default function duration.

**Confidence:** HIGH — confirmed in Meta developer docs and multiple developer guides

---

## Moderate Pitfalls

These cause bugs or require rework if not addressed, but don't kill the project.

---

### MOD-01: TikTok Requires Domain Ownership Verification for PULL_FROM_URL

**Phase:** Phase 2 (TikTok video upload)

**What goes wrong:**
TikTok's `PULL_FROM_URL` upload method (where TikTok fetches the video from your Blob URL) requires you to verify domain ownership in the TikTok Developer Portal. Vercel Blob URLs use the domain `blob.vercel-storage.com` — a domain you do not own and cannot add to TikTok's URL ownership registry. This results in a `url_ownership_unverified` error at upload time.

**Prevention:**
Use `FILE_UPLOAD` (chunked upload) instead of `PULL_FROM_URL`. Retrieve the video from Vercel Blob in the serverless function, then POST it in chunks to TikTok's `upload_url`. Chunks must be 5–64 MB each (except the final chunk). The `upload_url` is valid for 1 hour — stay well within that window.

Alternatively: proxy the Blob through a custom domain you control, verify that domain in TikTok's portal, then use `PULL_FROM_URL`. This adds complexity that isn't worth it for 1 post/day.

**Confidence:** HIGH — confirmed in TikTok developer docs + StackPosts documentation showing the exact error

---

### MOD-02: TikTok Access Token Expires Every 24 Hours

**Phase:** Phase 2 (TikTok token management)

**What goes wrong:**
Unlike Instagram's 60-day token, TikTok access tokens expire after 24 hours. The refresh token lasts 365 days. If your daily cron job for TikTok posting doesn't also refresh the access token, the token will be stale by the time it's needed.

**Prevention:**
1. Use the refresh token flow (`grant_type=refresh_token`) to get a fresh access token before every posting operation
2. Store both the access token and refresh token in Upstash Redis
3. On every posting cron invocation: call TikTok's token refresh endpoint first, store the new access token, then proceed with posting
4. If the refresh token itself is expired (365-day window): write `TIKTOK_NEEDS_REAUTH` to Redis and surface it in the CRM admin UI

**Note:** This is more frequent than Instagram but more automatable — no 60-day cliff to worry about.

**Confidence:** HIGH — confirmed in TikTok official OAuth documentation

---

### MOD-03: Instagram Requires Business Account (Not Creator Account)

**Phase:** Phase 1 — must be validated before any code is written

**What goes wrong:**
Instagram Reels API publishing only works with Instagram Business accounts linked to a Facebook Page. Creator accounts cannot publish Reels via the Graph API at all. If M&C's Instagram account is a Creator account, the entire Graph API posting approach fails silently or returns confusing permission errors.

**Additional constraint:** The Facebook Page linked to the Instagram Business account must have `instagram_basic` and `instagram_content_publish` permissions granted.

**Prevention:**
Before writing any Instagram API code: verify M&C's Instagram account type is Business (Settings → Account → Switch to Professional → Business). Then verify the Facebook Page link exists. This is a 5-minute check that prevents a wrong-direction build.

**Confidence:** HIGH — confirmed in Meta developer docs

---

### MOD-04: Instagram Reels Must Be Pre-Encoded Correctly or Won't Appear in Reels Tab

**Phase:** Phase 1 (quality checker definition)

**What goes wrong:**
Instagram accepts videos outside its preferred spec but silently publishes them as regular feed videos (not Reels). The API returns success, but the post doesn't appear in the Reels tab. Required for Reels tab: 9:16 aspect ratio, H.264 or HEVC codec, 5–90 seconds, moov atom at the front of the file (faststart encoding).

**The 8 MB limit is real:** Meta's API has an 8 MB file size limit for the uploaded video — this is not well-documented and catches developers off-guard when testing with real production exports.

**Prevention:**
The ffprobe quality checker (Phase 1) should validate:
- Aspect ratio is 9:16 (within tolerance)
- Codec is H.264 or HEVC
- Duration is 5–90 seconds
- Bitrate implies file size will be under 8 MB for the duration
- Audio codec is AAC

Surface a "Check export" warning for any file that doesn't meet these criteria before it's queued for posting. Do not allow posting of non-compliant files — the API will succeed but the Reel won't behave correctly.

**Confidence:** MEDIUM — 8 MB limit from community sources; other specs confirmed in Meta developer docs

---

### MOD-05: Vercel Cron Does Not Retry on Failure

**Phase:** Phase 1/2 (reliability)

**What goes wrong:**
If a cron-triggered posting function throws an unhandled exception, times out (504), or returns a 5xx, Vercel does not retry it. The scheduled post is simply missed. Error logs are retained for 1 day on Pro plan.

**Prevention:**
1. Cron should update post status to `processing` immediately upon start
2. Posts stuck in `processing` for more than 10 minutes should be treated as "stale" — a cleanup cron (runs daily) resets them to `pending` for retry on the next cycle
3. On any publish failure: write `status = 'failed'`, store the error code in Redis, send a Telegram notification to M&C
4. Never have a cron that silently swallows errors — all catch blocks must write to Redis and alert

**Confidence:** HIGH — confirmed in Vercel official docs

---

### MOD-06: Video Upload Body Size Exceeds Vercel's 4.5 MB Request Limit

**Phase:** Phase 1 (video upload flow)

**What goes wrong:**
Vercel Functions have a hard 4.5 MB request body limit. Uploading a 50 MB video directly to a Next.js API route returns a 413 error. This is not configurable.

**Prevention:**
Use Vercel Blob's client-side upload flow:
1. Client requests an upload token from the API route (`/api/admin/content/presign`)
2. Client uploads the video file directly to Vercel Blob from the browser
3. API route receives the Blob URL as a callback, then queues the post

The ffprobe quality check should run as a server-side step triggered by the Blob URL, not during the initial upload request. Fetch the blob in a separate function call after upload completes.

**Confidence:** HIGH — confirmed in Vercel official docs (4.5 MB payload limit explicitly documented)

---

### MOD-07: TikTok Video Spec Mismatch Causes Silent Downgrade

**Phase:** Phase 2 (quality checker extension for TikTok)

**What goes wrong:**
TikTok accepts videos that don't match its preferred specs but may apply quality downgrade flags. Specifically: bitrate below 5 Mbps triggers a quality warning; bitrate above 20 Mbps gets compressed. An H.265/HEVC file may fail TikTok's API despite being accepted by Instagram. Audio must be AAC-LC at 44.1 kHz — other formats may be rejected silently.

**Prevention:**
Extend the ffprobe quality checker (already built in Phase 1) with TikTok-specific thresholds. Flag files that would fail TikTok spec even if they pass Instagram spec. A single "Optimised ✓" badge should mean the file is good for both platforms.

**Confidence:** MEDIUM — video spec requirements from TikTok developer guides; exact API behavior from community sources

---

## Minor Pitfalls

These cause friction or suboptimal behavior but have straightforward fixes.

---

### MIN-01: UTM Attribution for Organic Social Is Inherently Limited

**Phase:** Phase 3 (analytics + UTM attribution)

**What goes wrong:**
UTM parameters only fire when someone clicks a tracked link. TikTok restricts in-video clickable links (bio link only); Instagram Reels have no clickable links in the caption. A significant portion of leads influenced by a Reel will arrive via direct search (typing "Matthews and Clark" into Google) or through the bio link without UTM context, appearing as "direct" traffic.

**Realistic expectation:**
UTM-attributed leads from organic social represent a lower bound, not a true count. The existing `source` field on leads (`TIKTOK`, `INSTAGRAM`, `WEBSITE`) captures what users self-select in the lead form — this is often more reliable than UTM attribution for organic social.

**Prevention:**
Don't build UTM attribution as if it were a precise measurement. Frame it in the CRM as "minimum attributed" rather than "total influenced." The Obsidian export should track which posts led to UTM-attributed leads, but the primary engagement signals are in-platform analytics (views, saves, shares), not click-through.

**Confidence:** HIGH — fundamental nature of organic social attribution

---

### MIN-02: Analytics Pull Must Respect 48-Hour Delay for Stable Metrics

**Phase:** Phase 3 (analytics cron)

**What goes wrong:**
Instagram and TikTok metrics for recent posts (last 24–48 hours) are not fully settled. If you pull analytics immediately after posting, you get inflated initial view counts that later normalize. If you report these numbers in the CRM, they'll change and look wrong.

**Prevention:**
Schedule the analytics pull cron to only fetch metrics for posts older than 48 hours. Pull on a daily cadence (`0 6 * * *`), fetching metrics for posts from 48+ hours ago. Store the pull timestamp alongside each metric snapshot in Redis.

**Confidence:** MEDIUM — common practice in analytics pipelines, based on platform API documentation

---

### MIN-03: Vercel Blob URLs Are Public — Video Content Is Accessible Without Auth

**Phase:** Phase 1 (storage)

**What goes wrong:**
Vercel Blob stores files at public URLs by default. Any video file uploaded to the scheduler is accessible to anyone with the URL (guessable only if URL is leaked). This is acceptable for content that will be published publicly anyway, but pre-published drafts are technically public.

**Prevention:**
Accept this as a known tradeoff for this use case. M&C is a small business posting brand content — the risk of a draft Reel being discovered before publishing is low and acceptable. The 7-day auto-delete cron ensures drafts don't accumulate. Do not store sensitive business content (client names, pricing) in Blob — that stays in Redis.

**Confidence:** HIGH — documented Vercel Blob behavior

---

### MIN-04: Obsidian Vault Cannot Use Vercel Filesystem (No Persistence)

**Phase:** Phase 3/4 (Obsidian export)

**What goes wrong:**
Vercel serverless functions have no persistent filesystem. Writing markdown files to disk from a serverless function will appear to succeed but the files are lost when the function execution ends. Developers who don't know this try to write to `./obsidian-vault/` and wonder why nothing appears.

**Prevention:**
The Obsidian export must write to an external destination. Two viable options:
1. **Vercel Blob** — write each post as a `.md` file to a Blob path, then download/sync to local Obsidian vault manually or via a sync script
2. **GitHub API** — commit markdown files directly to a Git repository that Obsidian syncs from via the Obsidian Git plugin

Option 2 is better for the "second brain" use case because Obsidian Git plugin auto-syncs from the repo on vault open. Build a `/api/admin/content/export-obsidian` endpoint that commits the markdown file to GitHub via the API. Use a fine-grained personal access token scoped to just the Obsidian vault repository.

**Confidence:** HIGH — fundamental Vercel serverless behavior

---

## Phase-Specific Warnings Summary

| Phase | Topic | Pitfall | Mitigation |
|-------|-------|---------|------------|
| Phase 1 | Video upload | 4.5 MB body limit | Client-side Blob upload, not server-side |
| Phase 1 | ffprobe quality check | Binary path fails in Next.js serverless | Use `@microlink/ffprobe` or `outputFileTracingIncludes` |
| Phase 1 | Instagram account setup | Creator account won't work | Validate Business account before writing code |
| Phase 1 | Container processing | Error 9007 if publishing too fast | Mandatory polling loop before publish |
| Phase 1 | Token management | 60-day expiry silent failure | Proactive refresh cron at day 50 |
| Phase 1 | Scheduling | Cron duplicate invocations | Redis distributed lock + idempotent state machine |
| Phase 2 | TikTok approval | 2–4 week review blocks Direct Post | Submit application in Phase 1, build Inbox fallback first |
| Phase 2 | TikTok upload | PULL_FROM_URL fails for Vercel Blob | Use chunked FILE_UPLOAD |
| Phase 2 | TikTok tokens | 24h expiry | Refresh token before every post operation |
| Phase 3 | Analytics | Recent metrics unstable | Only pull for posts older than 48 hours |
| Phase 3 | UTM attribution | Organic = unmeasurable clicks | Frame as lower bound, not true count |
| Phase 4 | Obsidian export | No persistent filesystem | Write to Blob or commit to GitHub repo |

---

## Hard Blockers — Must Address Before Phase Starts

| Blocker | Phase | Action Required |
|---------|-------|-----------------|
| M&C Instagram must be a Business account | Before Phase 1 | Check account type in Instagram settings |
| Vercel plan must be Pro for per-minute cron | Before Phase 1 | Confirm Pro plan active (scheduling architecture depends on this) |
| TikTok Direct Post application submitted | Phase 1 (during) | Submit application with M&C-specific use case; build Inbox fallback immediately |
| ffprobe deployment strategy decided | Phase 1 (before coding upload) | Test chosen approach on actual Vercel deploy, not just locally |

---

## Sources

- Meta Developer Docs — Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Meta Developer Docs — Token Refresh: https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/
- TikTok Developer Docs — Content Posting API: https://developers.tiktok.com/doc/content-posting-api-get-started
- TikTok Developer Docs — OAuth Token Management: https://developers.tiktok.com/doc/oauth-user-access-token-management
- TikTok Developer Docs — Media Transfer Guide: https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- Vercel Docs — Functions Limits (updated 2026-05-14): https://vercel.com/docs/functions/limitations
- Vercel Docs — Cron Jobs (updated 2026-04-21): https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Vercel Docs — Cron Usage & Pricing (updated 2026-03-04): https://vercel.com/docs/cron-jobs/usage-and-pricing
- Next.js GitHub Issue #53791 — ffprobe-static path resolution: https://github.com/vercel/next.js/issues/53791
- StackPosts Docs — TikTok url_ownership_unverified: https://doc.stackposts.com/docs/stackposts-v9/problems-solutions/failed-to-start-video-upload-url_ownership_unverified-please-review-our-url-ownership-verification-rules-at-https-developers-tiktok-com-doc-content-posting-api-media-transfer-guide-ezd_hashpull_f/
