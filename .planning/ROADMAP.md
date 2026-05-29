# Roadmap: Matthews & Clark — v1.0 Social Content Scheduler

## Overview

Four phases that close the loop between content production and business outcomes. Phase 1 builds the complete upload-to-Instagram pipeline, validating every technical assumption (mediainfo.js on Vercel, cron scheduling, KV data model) before adding complexity. Phase 2 adds TikTok posting once the core scheduler is proven. Phase 3 pulls analytics back into the CRM and attributes leads to posts. Phase 4 exports intelligence to an Obsidian vault for long-term content pattern discovery.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - KV content model, video upload + quality check, post creation UI, Instagram auto-posting via cron, token refresh, Blob TTL cleanup
- [ ] **Phase 2: TikTok** - Chunked FILE_UPLOAD posting, Inbox fallback, proactive token refresh, Direct Post feature flag
- [ ] **Phase 3: Analytics & Intelligence** - 48hr metrics cron for both platforms, signal scoring, UTM attribution, content performance CRM screen
- [ ] **Phase 4: Obsidian Vault** - Nightly GitHub export, per-post markdown, signal scores, PDF script, ZIP fallback, Dataview README

## Phase Details

### Phase 1: Foundation
**Goal**: Users can upload a video, check its quality, create a scheduled post, and have it auto-posted to Instagram — with the full cron pipeline, token refresh, and Blob cleanup running reliably in production
**Depends on**: Nothing (first phase)
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04, UPLOAD-05, UPLOAD-06, UPLOAD-07, UPLOAD-08, SCHEDULE-01, SCHEDULE-02, SCHEDULE-03, SCHEDULE-04, SCHEDULE-05, PUBLISH-01, PUBLISH-02, PUBLISH-03, PUBLISH-04, PUBLISH-05
**Success Criteria** (what must be TRUE):
  1. User can drag/drop or pick a video file and see an "Optimised ✓" or "Check export ⚠" quality tag with a breakdown of which checks failed, within 10 seconds of upload
  2. User can create a post with caption, hashtags, scheduled date/time, Instagram toggle, and optional PDF script — post appears in the queue with status "Scheduled"
  3. A scheduled post advances automatically to "Processing" then "Published" on Instagram at the scheduled time, with the ig_media_id stored on the record
  4. A failed post displays the error reason and offers a retry button; the team receives a Telegram notification on failure
  5. Video files older than 7 days are automatically deleted from Vercel Blob by the daily cleanup cron
**Plans**: 9 plans
Plans:
- [ ] 01-01-PLAN.md — KV primitives (kvZRangeByScore) + lib/contentStore.js (post CRUD foundation)
- [ ] 01-02-PLAN.md — Install mediainfo.js + unpdf; next.config.js WASM tracing; /api/test-mediainfo validation gate
- [ ] 01-03-PLAN.md — Upload token endpoint + mediainfo.js quality-check API + lib/pdfExtract.js
- [ ] 01-04-PLAN.md — Content CRUD API (GET/POST list+create, GET/PATCH/DELETE per-id, Retry contract)
- [ ] 01-05-PLAN.md — Shell nav wiring (Content slot + gear icon) + content queue screen (grouped, with Retry)
- [ ] 01-06-PLAN.md — Post creation screen (dropzone, async quality check, PDF, form, submit)
- [ ] 01-07-PLAN.md — vercel.json + lib/igPublish.js + /api/cron/post (15-min posting cron with IG state machine + lock)
- [ ] 01-08-PLAN.md — /api/cron/token-refresh + /api/cron/blob-cleanup (daily housekeeping)
- [ ] 01-09-PLAN.md — End-to-end UAT checkpoint covering all 18 requirements + 5 Success Criteria
**UI hint**: yes

### Phase 2: TikTok
**Goal**: Scheduled posts with the TikTok toggle enabled are posted to TikTok via chunked FILE_UPLOAD, with Inbox mode as the default and Direct Post activating automatically once the app audit approves
**Depends on**: Phase 1
**Requirements**: PUBLISH-06, PUBLISH-07, PUBLISH-08, PUBLISH-09
**Success Criteria** (what must be TRUE):
  1. A post with the TikTok toggle enabled is uploaded to TikTok's Inbox (draft) by the publish cron, with the tiktok_video_id stored on the post record
  2. The TikTok access token is refreshed proactively before each cron run — no posts fail due to expired 24hr tokens
  3. Once the Direct Post feature flag is enabled, TikTok posts appear publicly on the account without manual Inbox approval
  4. TikTok posting works correctly for videos of any size supported by the quality check (chunked upload handles the full range)
**Plans**: TBD

### Phase 3: Analytics & Intelligence
**Goal**: Published posts accumulate metrics from both platforms, are scored on three signals, and the content performance screen in the CRM shows the full picture alongside UTM-attributed lead counts
**Depends on**: Phase 2
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05, ANALYTICS-06
**Success Criteria** (what must be TRUE):
  1. For any post published more than 48 hours ago, the CRM shows platform metrics (views, reach, saves, shares for Instagram; view count, like count, completion rate for TikTok)
  2. Each published post displays three signal scores (1–10) for audience growth, engagement, and conversion — scores are visible on the content performance screen
  3. The content performance screen shows how many M&C leads were attributed to each post (leads where source = TIKTOK or INSTAGRAM, created within 7 days of publish date)
  4. Link-in-bio click count appears on Instagram posts that include a UTM-tagged campaign URL
**Plans**: TBD
**UI hint**: yes

### Phase 4: Obsidian Vault
**Goal**: Every published and signal-scored post is rendered as a structured Markdown file and committed nightly to a private GitHub repository that M&C syncs as an Obsidian vault — enabling Dataview queries over the content archive
**Depends on**: Phase 3
**Requirements**: VAULT-01, VAULT-02, VAULT-03, VAULT-04, VAULT-05, VAULT-06
**Success Criteria** (what must be TRUE):
  1. Every published post appears as a Markdown file in the private GitHub repo within 24 hours, with YAML frontmatter containing date, platform, metrics, and signal scores, and a Script section populated from the extracted PDF text
  2. Opening the vault in Obsidian with obsidian-git installed pulls the latest files automatically — no manual import needed
  3. The vault README contains a working Dataview query that returns high-performing posts filtered by signal type, service, and date range
  4. A ZIP download endpoint in the admin CRM generates an archive of all post markdown files on demand as a manual import fallback
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/9 | Not started | - |
| 2. TikTok | 0/TBD | Not started | - |
| 3. Analytics & Intelligence | 0/TBD | Not started | - |
| 4. Obsidian Vault | 0/TBD | Not started | - |
