# Requirements — Milestone v1.0 Social Content Scheduler

## Overview

Self-hosted content scheduler inside the M&C CRM. Auto-posts Reels to Instagram and TikTok via platform APIs. Checks video quality on upload. Pulls analytics back into the dashboard. Exports post data + scripts to an Obsidian second brain for content pattern intelligence.

---

## Active Requirements

### UPLOAD — Video & Script Intake

- [ ] **UPLOAD-01**: User can upload a video file (drag/drop or file picker) from the content post creation screen
- [ ] **UPLOAD-02**: Video is stored in Vercel Blob under a `social-videos/` prefix and the public URL is saved to the post record
- [ ] **UPLOAD-03**: After upload, the system runs a `mediainfo.js` quality check server-side and returns a result within 10 seconds
- [ ] **UPLOAD-04**: Quality check evaluates: codec (H.264/MP4 required), resolution + aspect ratio (1080×1920 / 9:16), bitrate (4–50 Mbps sweet spot), frame rate (29.97 or 60fps acceptable)
- [ ] **UPLOAD-05**: Quality result is displayed as a tag on the post — "Optimised ✓" (all checks pass) or "Check export ⚠" (any check fails) with a breakdown of which checks failed
- [ ] **UPLOAD-06**: User can upload a PDF script file alongside the video
- [ ] **UPLOAD-07**: System extracts text content from the uploaded PDF script and stores it in the post record
- [ ] **UPLOAD-08**: Vercel Blob auto-delete cron runs daily and deletes video files older than 7 days (platform has already downloaded them by then)

### SCHEDULE — Post Management UI

- [ ] **SCHEDULE-01**: User can create a new content post with: video upload, PDF script upload, caption, hashtags, platform toggles (Instagram / TikTok), and scheduled date/time
- [ ] **SCHEDULE-02**: Post record is saved to Upstash KV with status `pending` and `scheduledAt` timestamp
- [ ] **SCHEDULE-03**: User can view all posts in a feed grouped by status: Scheduled, Processing, Published, Failed
- [ ] **SCHEDULE-04**: Vercel Cron runs every 15 minutes and picks up posts where `scheduledAt ≤ now` and `status = pending`, advancing them to `processing`
- [ ] **SCHEDULE-05**: Failed posts display the error reason and allow the user to retry

### PUBLISH — Instagram

- [ ] **PUBLISH-01**: System creates an Instagram media container via Graph API using the Vercel Blob video URL as `video_url` with `media_type = REELS`
- [ ] **PUBLISH-02**: System polls the container status in subsequent cron runs until `status_code = FINISHED` (two-phase KV state machine — no blocking inline poll)
- [ ] **PUBLISH-03**: System publishes the container via `/{IG_USER_ID}/media_publish` and stores the returned `ig_media_id` on the post record
- [ ] **PUBLISH-04**: Long-lived Instagram access token is refreshed automatically every 50 days via a separate cron job (token expires at 60 days; no auto-refresh by Meta)
- [ ] **PUBLISH-05**: Posting cron uses a Redis distributed lock (SET NX EX) to prevent duplicate publishes if cron double-fires

### PUBLISH — TikTok

- [ ] **PUBLISH-06**: System posts to TikTok using chunked `FILE_UPLOAD` (not `PULL_FROM_URL` which rejects Vercel Blob domains)
- [ ] **PUBLISH-07**: TikTok posts in Inbox/draft mode (`UPLOAD_TO_INBOX`) as the default; `DIRECT_POST` activates automatically via a feature flag once app audit is approved
- [ ] **PUBLISH-08**: TikTok access token (24hr expiry) is refreshed proactively before each posting cron run using the stored refresh token
- [ ] **PUBLISH-09**: System stores the returned `tiktok_video_id` on the post record for later analytics fetching

### ANALYTICS — Metrics Pull

- [ ] **ANALYTICS-01**: Analytics cron runs daily and fetches metrics for all posts older than 48 hours that have a platform media ID but no metrics yet
- [ ] **ANALYTICS-02**: Instagram metrics fetched: `views`, `reach`, `impressions`, `saved`, `shares`, `video_views`, `follows` (profile visits from post)
- [ ] **ANALYTICS-03**: TikTok metrics fetched: `view_count`, `like_count`, `comment_count`, `share_count`, `average_time_watched`, `full_video_watched_rate`
- [ ] **ANALYTICS-04**: Link-in-bio click count is tracked for Instagram posts that include a UTM-tagged campaign URL (fetched via Graph API `website_clicks` field if available)
- [ ] **ANALYTICS-05**: Conversion attribution: post record stores count of M&C leads where `source = TIKTOK|INSTAGRAM` and `createdAt` falls within 7 days after `publishedAt` — computed at analytics pull time
- [ ] **ANALYTICS-06**: Content performance screen in the CRM shows all published posts with their metrics, signal scores, quality tag, and platform status

### VAULT — Obsidian Second Brain Export

- [ ] **VAULT-01**: Nightly cron renders a Markdown file per published post with YAML frontmatter (date, platform, car type, service, metrics, signal scores) and sections: Hook, Script, Performance Notes
- [ ] **VAULT-02**: Each post is scored 1–10 on three signals: `audience_score` (reach + profile visits + followers), `engagement_score` (saves + shares + completion rate), `conversion_score` (attributed leads + link clicks) — scores relative to the account median, not absolute thresholds
- [ ] **VAULT-03**: Files are pushed to a private GitHub repository via Octokit `createOrUpdateFileContents` — the repo is set up as an Obsidian vault synced via the `obsidian-git` plugin
- [ ] **VAULT-04**: A ZIP download endpoint in the admin CRM generates an archive of all post markdown files on demand (fallback / manual import)
- [ ] **VAULT-05**: Extracted PDF script text is included in the Markdown file under a `## Script` section
- [ ] **VAULT-06**: A README in the vault root contains a Dataview query template that lets M&C query high-scoring posts by signal type, service, car, and date range

---

## Future Requirements (deferred)

- AI-generated caption suggestions (too early — no established tone of voice data yet)
- Multi-account support (M&C is one account on each platform)
- Real-time analytics dashboard (48hr pull is sufficient at 1 post/day)
- Hashtag performance tracking (needs 3+ months of data to be meaningful)
- TikTok Direct Post (in scope as upgrade path post-audit, not a separate future req)
- Competitor content tracking (different product category)

---

## Out of Scope

| Item | Reason |
|---|---|
| Buffer / Later / Metricool integration | Replaced entirely by direct platform APIs |
| Video editing / trimming in browser | Out of scope — edit externally, upload finished file |
| Instagram Stories / Carousel | Reels only for v1.0 |
| TikTok Ads API | Organic posting only |
| Cross-posting to Facebook / YouTube | Two platforms first; validate approach |
| PULL_FROM_URL for TikTok | TikTok rejects Vercel Blob domains; FILE_UPLOAD used instead |

---

## Traceability

| REQ-ID | Phase |
|---|---|
| UPLOAD-01 | Phase 1 |
| UPLOAD-02 | Phase 1 |
| UPLOAD-03 | Phase 1 |
| UPLOAD-04 | Phase 1 |
| UPLOAD-05 | Phase 1 |
| UPLOAD-06 | Phase 1 |
| UPLOAD-07 | Phase 1 |
| UPLOAD-08 | Phase 1 |
| SCHEDULE-01 | Phase 1 |
| SCHEDULE-02 | Phase 1 |
| SCHEDULE-03 | Phase 1 |
| SCHEDULE-04 | Phase 1 |
| SCHEDULE-05 | Phase 1 |
| PUBLISH-01 | Phase 1 |
| PUBLISH-02 | Phase 1 |
| PUBLISH-03 | Phase 1 |
| PUBLISH-04 | Phase 1 |
| PUBLISH-05 | Phase 1 |
| PUBLISH-06 | Phase 2 |
| PUBLISH-07 | Phase 2 |
| PUBLISH-08 | Phase 2 |
| PUBLISH-09 | Phase 2 |
| ANALYTICS-01 | Phase 3 |
| ANALYTICS-02 | Phase 3 |
| ANALYTICS-03 | Phase 3 |
| ANALYTICS-04 | Phase 3 |
| ANALYTICS-05 | Phase 3 |
| ANALYTICS-06 | Phase 3 |
| VAULT-01 | Phase 4 |
| VAULT-02 | Phase 4 |
| VAULT-03 | Phase 4 |
| VAULT-04 | Phase 4 |
| VAULT-05 | Phase 4 |
| VAULT-06 | Phase 4 |
