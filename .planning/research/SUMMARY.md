# Research Summary — Matthews & Clark Social Content Scheduler v1.0

**Synthesised:** 2026-05-29
**From:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Consumer:** gsd-roadmapper (phase planning)

---

## Executive Summary

Matthews & Clark's social content scheduler is a narrow, well-scoped problem: one brand account, one Reel per day, two platforms (Instagram and TikTok), integrated into an existing Next.js 15 / Upstash KV / Vercel Blob / Vercel Cron stack. The research confirms this is buildable entirely with native platform REST APIs and no third-party SaaS — no Meta SDK, no TikTok SDK, no scheduling middleware. The differentiated value over tools like Buffer is the closed-loop intelligence: video quality gating at upload time, analytics pulled back into the CRM, UTM attribution linking posts to CRM leads, and Obsidian vault export for pattern discovery at volume.

The most significant technical finding is that `ffprobe-static` is not viable on Vercel serverless. ARCHITECTURE research resolves this definitively in favour of `mediainfo.js` (WASM, ~2.4 MB), which avoids the `__dirname` bundle path bug and stays well inside Vercel's 50 MB compressed function limit. The Instagram publish flow requires a two-phase KV state machine (create container on cron run N, poll and publish on cron run N+1) because inline polling across a 2–5 minute async processing window is incompatible with short-lived serverless functions. TikTok's `PULL_FROM_URL` upload method fails for Vercel Blob URLs due to domain ownership verification requirements — chunked `FILE_UPLOAD` is the correct implementation path. The Obsidian export has one viable approach on Vercel: commit markdown files to a GitHub repository via the GitHub Contents API (Octokit), which Obsidian then syncs locally via the obsidian-git plugin.

Four hard blockers exist that are external to code and must be resolved before or during Phase 1: confirming the Vercel plan is Pro (required for per-minute cron), verifying M&C's Instagram account is a Business account (not Creator — Creator accounts cannot use the Graph API), submitting the TikTok Direct Post app audit early (2–4 week review, no expedited track), and validating that `mediainfo.js` loads correctly in Vercel's production runtime. None of these are solvable by writing code.

---

## Key Findings

### Stack — Confirmed Additions

| Package | Purpose |
|---------|---------|
| `mediainfo.js` | Video quality check (WASM, replaces ffprobe-static) |
| `@octokit/rest` | GitHub Contents API for Obsidian vault export |
| Instagram Graph API v25.0 | Reels posting via raw `fetch` — no npm client |
| TikTok Content Posting API v2 | Video posting via raw `fetch` — no npm client |

No other new dependencies. Vercel Blob, Upstash KV, and Vercel Cron are already provisioned.

Critical `next.config.js` addition:
```js
experimental: { serverComponentsExternalPackages: ["mediainfo.js"] }
```

New env vars required:
```
INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID
TIKTOK_ACCESS_TOKEN, TIKTOK_OPEN_ID
GITHUB_TOKEN, OBSIDIAN_REPO_OWNER, OBSIDIAN_REPO_NAME
```
`CRON_SECRET` is auto-injected by Vercel — do not set manually.

---

### Features — Table Stakes vs Differentiators

**Table stakes** (missing any one makes the tool worse than posting from the phone):

- Video upload with inline preview
- Per-platform caption fields (Instagram and TikTok copy authored separately)
- Hashtag input
- Scheduled date/time picker (SAST display, UTC storage)
- Platform toggles (Instagram / TikTok / both)
- Post queue list with status badges
- Error surfacing for failed posts + Telegram notification on failure
- Manual retry button for failed posts
- mediainfo.js quality check on upload (Optimised or Check export badge)
- 7-day Vercel Blob auto-delete cron

**Differentiators** (what makes this worth building over Buffer):

- Analytics pull cron at 48 hours post-publish (Instagram + TikTok metrics)
- Signal tagging: `audience-growth`, `conversion`, `non-performer` (auto-tagged from analytics thresholds)
- Content performance dashboard in admin CRM
- UTM attribution linking post to CRM leads via `utm_content` value match
- Obsidian vault export — per-post markdown with full frontmatter, queryable by Dataview

**Explicit anti-features** (do not build in v1.0):

AI caption generation, multi-account support, content approval workflow, Instagram Stories scheduling, hashtag research tooling, bulk scheduling, A/B testing, suggested posting times.

**Deferred:**

TikTok Direct Post promotion (Inbox fallback ships first), 7-day analytics re-pull, Obsidian Git push (ZIP download acceptable for v1.0), calendar view (list view sufficient for 1 post/day).

---

### Architecture — Key Decisions

**1. mediainfo.js (WASM) replaces ffprobe-static**
`ffprobe-static` fails in Next.js App Router on Vercel due to `__dirname` binary path resolution bug (GitHub issue #53791, unresolved as of May 2026). `mediainfo.js` WASM is 2.4 MB, Node.js-compatible, no binary path issues. Confidence: MEDIUM — needs runtime validation on Vercel in Phase 1 before any other upload work proceeds.

**2. Two-phase KV state machine for Instagram publishing**
Container creation (Step 1) runs on cron iteration N. Status polling and publish call (Steps 2–3) run on cron iteration N+1 (15 minutes later). This avoids a 2–5 minute blocking poll inside a single function invocation and fits within Vercel's function duration limits on all plans.

**3. TikTok uses chunked FILE_UPLOAD, not PULL_FROM_URL**
`PULL_FROM_URL` requires domain ownership verification. Vercel Blob URLs use `blob.vercel-storage.com`, which M&C does not own and cannot register in TikTok's developer portal — this produces a `url_ownership_unverified` error. The serverless function fetches the Blob buffer and POSTs it in 5–64 MB chunks to TikTok's `upload_url`.

**4. Obsidian export via GitHub Contents API (Octokit)**
Vercel's ephemeral filesystem makes local file writes impossible. The nightly cron calls `octokit.repos.createOrUpdateFileContents()` to commit markdown files directly to a private GitHub repository. Obsidian syncs from that repository via the obsidian-git plugin on the client machine.

**5. KV schema follows existing conventions**
New keys: `content:{id}`, `content:index` (sorted set, score = scheduledAt ms), `content:published:index` (score = publishedAt ms). New store: `lib/contentStore.js` modelled on `lib/jobStore.js`. New KV primitive: `kvZRangeByScore` added to `lib/kv.js`.

**6. Content screen fetches independently**
The existing `crm-kit` aggregate endpoint is not extended. The content screen (`screens-content.jsx`) fetches from `/api/admin/content` on its own cadence. Content data changes on a different cadence to leads/jobs.

**7. Client-side Blob upload for videos**
Vercel's 4.5 MB request body limit makes server-side video ingestion impossible. The browser uploads directly to Vercel Blob; the API route receives the Blob URL and triggers the mediainfo quality check on the returned buffer.

---

### Top 5 Pitfalls

| # | Pitfall | One-line prevention |
|---|---------|---------------------|
| 1 | Instagram long-lived token silently expires at 60 days | Weekly refresh cron targeting day 50–55; surface `NEEDS_REAUTH` in CRM on Graph API error code 190 |
| 2 | ffprobe-static binary fails on Vercel (`__dirname` bug) | Use `mediainfo.js` WASM; validate on actual Vercel deploy before any other upload work |
| 3 | TikTok Direct Post audit takes 2–4 weeks | Submit at start of Phase 1; build Inbox fallback first so Phase 2 ships before audit completes |
| 4 | Instagram error 9007 — publishing before container is FINISHED | Two-phase cron state machine; never call `media_publish` in same cron run as container creation |
| 5 | TikTok `PULL_FROM_URL` fails for Vercel Blob domain | Use chunked `FILE_UPLOAD`; fetch Blob buffer in function and chunk-POST to TikTok's `upload_url` |

---

## Hard Blockers — Must Resolve Before Phase 1

| Blocker | Who | Action |
|---------|-----|--------|
| Confirm Vercel plan is Pro | Kieran | Check Vercel dashboard — Hobby plan cannot run per-minute cron; scheduling architecture depends on this |
| Confirm M&C Instagram is a Business account | Kieran | Instagram Settings → Account type — Creator accounts cannot use Graph API |
| Submit TikTok Direct Post app audit | Kieran | Start in parallel with Phase 1 Instagram work; 2–4 week review has no fast-track |
| Validate `mediainfo.js` loads on Vercel production runtime | Dev | Deploy isolated test function before committing upload route architecture |

---

## Implications for Roadmap

### Recommended Build Order: 4 Phases

**Phase 1 — Core Scheduler (Instagram only)**
Build the complete upload-to-publish pipeline for Instagram. Shippable and immediately useful before TikTok is added.

Delivers: video upload, quality check, post creation, Instagram auto-posting via cron, failure notifications, Blob TTL cleanup.

Key files: `lib/kv.js` (add `kvZRangeByScore`), `lib/contentStore.js`, upload route, post CRUD routes, `screens-content.jsx`, 15-min publish cron, token refresh cron, `vercel.json`.

Pitfalls to avoid: do not build upload until `mediainfo.js` is validated on Vercel; confirm Pro plan and Business account before first commit.

**Phase 2 — TikTok Posting**
Add TikTok to the publish pipeline using chunked FILE_UPLOAD. Use Inbox fallback if Direct Post audit is still pending. TikTok audit clock should already be running from Phase 1.

Delivers: TikTok chunked upload, Inbox fallback flow, proactive token refresh, promotion path to Direct Post post-audit.

Pitfalls to avoid: do not attempt PULL_FROM_URL; always refresh TikTok access token before each post operation.

**Phase 3 — Analytics and Signal Intelligence**
Add analytics pull and signal tagging. Zero value until published posts exist in KV — defer until Phase 1 is live and posts are accumulating.

Delivers: daily analytics cron (48hr gate), signal tagging logic, content performance dashboard, UTM attribution link to CRM leads.

Pitfalls to avoid: do not pull analytics earlier than 48 hours post-publish.

**Phase 4 — Obsidian Intelligence Export**
Nightly GitHub export. Only delivers value once signal-tagged posts exist — defer until Phase 3 has been running for a few weeks.

Delivers: `lib/obsidianExport.js`, nightly Obsidian cron, per-post markdown files committed to private GitHub repo, obsidian-git sync on client.

Prerequisites: GITHUB_TOKEN env var, private vault repository created, obsidian-git plugin configured on M&C's machine.

---

### Research Flags for Phase Planning

| Phase | Research needed | Reason |
|-------|----------------|--------|
| Phase 1 | YES — validate `mediainfo.js` on Vercel runtime | MEDIUM confidence; WASM loading in Vercel serverless not definitively confirmed |
| Phase 1 | YES — confirm Pro plan status | Scheduling architecture differs fundamentally on Hobby |
| Phase 2 | YES — TikTok chunked upload working implementation | Chunk boundary handling and `Content-Range` headers need validated reference before cron build |
| Phase 3 | NO | Analytics pull pattern is confirmed in official API docs |
| Phase 4 | NO | Octokit GitHub Contents API is well-documented and high confidence |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|-----------|-------|
| Instagram Graph API v25.0 publish flow | HIGH | Official Meta docs fetched directly |
| Instagram token expiry and refresh | HIGH | Official docs + multiple post-mortems |
| TikTok Content Posting API v2 | HIGH | Official TikTok docs |
| TikTok audit requirement | HIGH | Official docs + community confirmation |
| TikTok PULL_FROM_URL domain blocker | HIGH | Official docs + confirmed `url_ownership_unverified` error reports |
| Vercel Cron plan limits | HIGH | Official docs, March 2026 update |
| Vercel function bundle limit (50 MB compressed) | HIGH | Official docs, May 2026 |
| Vercel 4.5 MB request body limit | HIGH | Official docs |
| Two-phase KV state machine pattern | HIGH | Derived directly from Vercel function duration constraints |
| `mediainfo.js` WASM in Vercel serverless | MEDIUM | Node.js confirmed; Vercel production runtime needs validation |
| Signal classification thresholds | LOW | Starting values reasonable; calibrate after first 20 posts |
| Instagram container TTL | LOW | Meta does not document it; empirical validation needed |

**Overall: MEDIUM-HIGH.** All critical path items are HIGH confidence. Two MEDIUM/LOW items have known validation steps that belong at the start of Phase 1.

---

## Gaps to Address During Planning

1. **mediainfo.js Vercel runtime** — Deploy an isolated test function before committing upload architecture. Fallback: probe the Blob URL via remote HTTP call rather than in-memory buffer analysis.

2. **Instagram container TTL** — Meta's docs do not state how long an unpublished container persists. The two-phase 15-minute gap is safe for same-day scheduling, but validate that containers created hours or days in advance do not expire before the publish cron fires.

3. **TikTok chunked upload implementation** — Chunk size constraints (5–64 MB per chunk), `Content-Range` header format, and error recovery on partial uploads need a validated reference implementation before Phase 2 cron build.

4. **Signal threshold calibration** — Initial thresholds (save rate > 2%, reach > 5000 for `audience-growth`) are starting points. Plan a review after 20+ posts with real data.

---

## Sources

- Meta: Instagram Platform Content Publishing — https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Meta: Instagram Refresh Access Token — https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token/
- Meta: Instagram Media Insights — https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/
- TikTok: Content Posting API Overview — https://developers.tiktok.com/products/content-posting-api/
- TikTok: Video Upload Reference — https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
- TikTok: Media Transfer Guide — https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- TikTok: OAuth User Access Token Management — https://developers.tiktok.com/doc/oauth-user-access-token-management
- Vercel: Cron Jobs — https://vercel.com/docs/cron-jobs
- Vercel: Functions Limits (May 2026) — https://vercel.com/docs/functions/limitations
- Vercel: @vercel/blob SDK — https://vercel.com/docs/vercel-blob/using-blob-sdk
- Next.js: serverExternalPackages — https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
- GitHub: ffprobe-static path bug in Next.js — https://github.com/vercel/next.js/issues/53791
- mediainfo.js — https://github.com/buzz/mediainfo.js
- Vercel: ffmpeg/ffprobe not recommended — https://github.com/vercel/vercel/discussions/9561
- StackPosts: TikTok url_ownership_unverified error — https://doc.stackposts.com/docs/stackposts-v9/problems-solutions/failed-to-start-video-upload-url_ownership_unverified
