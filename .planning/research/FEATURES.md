# Feature Landscape: Social Content Scheduler

**Domain:** Self-hosted social content scheduler + content intelligence system for a small business posting 1 Reel/day across Instagram + TikTok
**Researched:** 2026-05-29
**Milestone:** v1.0 Social Content Scheduler

---

## Table Stakes

Features that must exist for the scheduler to be worth using at all. Missing any of these makes the system worse than just posting manually from the phone.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Video upload with preview | Verify what you're posting before it goes live | Low | Upload to Vercel Blob, return playable URL for inline preview |
| Per-platform caption field | TikTok and Instagram captions serve different audiences and algorithmic contexts | Low | Two separate text inputs. Copy from Instagram to TikTok as convenience only — not auto-sync |
| Hashtag input | Part of how Reels/TikToks get discovered | Low | Separate from caption body, applied consistently to both platforms |
| Scheduled date/time picker | The whole point of a scheduler | Low | Store in UTC, display in SAST (Africa/Johannesburg, UTC+2) |
| Platform toggles | Not every post goes to both platforms | Low | Checkboxes: Instagram, TikTok — both on by default |
| Queue / calendar view | See what's scheduled and when | Medium | Simple list sorted by scheduled_at is sufficient for 1 post/day. A calendar view is nice-to-have, not required |
| Post status tracking | Know whether a post went live successfully | Low | Statuses: draft, scheduled, publishing, published, failed |
| Error surfacing for failed posts | Silent failures destroy trust in the tool | Low | Show platform error message verbatim on failure. Telegram notification on failure |
| Manual re-trigger for failures | Recovery path when a post fails | Low | "Retry" button that re-calls the publish API with the same container |
| ffprobe quality check on upload | Know before scheduling whether the export will get recompressed by Instagram/TikTok | Medium | See Quality Check section for exact thresholds |
| 7-day Vercel Blob auto-delete | Keep storage costs negligible | Low | Vercel Cron job, runs daily, deletes blobs where `deleteAfter` timestamp has passed |

---

## Quality Check (Video Spec Verification)

This is a differentiating feature for M&C specifically because they produce their own footage and export from DaVinci Resolve or Premiere. A bad export silently loses quality through double-compression.

### Optimal Thresholds (ffprobe checks)

| Check | Optimal | Flag Condition | Why |
|-------|---------|---------------|-----|
| Codec | H.264 | HEVC, VP9, AV1, ProRes, DNxHD | Instagram and TikTok accept H.264 natively. Other codecs trigger platform re-encode. HEVC is borderline acceptable but adds risk. |
| Resolution | 1080x1920 (9:16) | Width != 1080, height != 1920, or aspect ratio != 9:16 | Off-ratio videos get letterboxed or cropped by the platform |
| Frame rate | 24–30 fps | < 24 fps or > 30 fps | Platform re-encodes at 30 fps if over; < 24 looks choppy on mobile |
| Bitrate | 4–10 Mbps | < 3 Mbps (too low) or > 15 Mbps (will be hard-capped) | Instagram recommends 4 Mbps minimum for Reels. TikTok recommends 6–8.5 Mbps at 30 fps |
| Duration | 5–90 seconds | < 5s or > 90s | Outside this range, Instagram won't place in Reels tab |
| Audio | AAC | Anything other than AAC | MP3 and other audio codecs trigger re-encode |
| Container | MP4 with moov atom at front | MOV, MKV, AVI, or MP4 with moov atom at end | Instagram Graph API requires fast-start MP4 |
| File size | < 100 MB | > 100 MB | Instagram Graph API hard limit |

**Result display:** Show one of two states only:
- **Optimised** (all checks pass) — green badge, post is ready
- **Check export** (any check fails) — amber badge, show which specific checks failed and what the detected value was (e.g. "Bitrate: 2.1 Mbps — minimum 4 Mbps")

**Do not block posting on a "Check export" badge.** The user may know what they're doing. Warn, don't block.

---

## Differentiators

Features that transform a scheduler into a content intelligence system. These are what make building this custom worth it over using Buffer.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Analytics pull (48hr cron) | Passive performance data collection without manual reporting | Medium | Pull 48hrs after `published_at`. Instagram: views, reach, saved, shares, avg_watch_time, reels_skip_rate. TikTok: views, likes, comments, shares, completion rate, profile visits |
| Content performance dashboard | See all posts ranked by signal in one screen | Medium | Three-column view: top performers, conversion posts, non-performers. Sortable by any pulled metric |
| UTM attribution linking | Close the loop between a specific post and leads it generated | Medium | Each post gets a unique `utm_content` value (e.g. `post_2026-05-29_detailing-reel`). When a lead submits with that utm_content, it's attributed to that post |
| Obsidian vault export | Extract learnable patterns across 50+ posts over time | Medium | See Obsidian Structure section. This is the highest long-term leverage feature |
| Signal tagging | Label each post's performance character for pattern discovery | Low | Three mutually non-exclusive tags: `audience-growth`, `conversion`, `non-performer`. Applied automatically from analytics thresholds |

### Signal Tagging Logic

Applied automatically when analytics are pulled:

| Tag | Condition |
|-----|-----------|
| `audience-growth` | Views > median OR saves > median OR (follows from post > 0 on TikTok) |
| `conversion` | Attributed UTM leads > 0 OR profile visits from post in top quartile |
| `non-performer` | Views < 25th percentile AND saves = 0 AND completion rate < 30% |

A post can carry multiple tags (e.g. high views + zero conversion = `audience-growth` only). A post with zero analytics after 48hrs gets `non-performer` by default.

Thresholds are relative (median, quartiles) rather than absolute so they adjust as the account grows.

---

## Obsidian Vault Structure

**Goal:** Enable pattern discovery at volume. After 50+ posts, M&C should be able to open the vault and ask "what types of hooks produce conversion?" without manually auditing spreadsheets.

### Folder Structure

```
Content-Intelligence/
  Posts/
    YYYY-MM-DD — [post-slug].md
  Signals/
    audience-growth.md
    conversion.md
    non-performer.md
  Patterns/
    (manually created by M&C when patterns emerge)
  index.md
```

### Per-Post Note: Frontmatter

Every post note must have machine-readable frontmatter so the vault is queryable by Obsidian Dataview (if installed) and by AI tools scanning the vault.

```yaml
---
title: "YYYY-MM-DD — [slug]"
date: YYYY-MM-DD
scheduled_at: "YYYY-MM-DDTHH:MM:00+02:00"
platforms: [instagram, tiktok]
service_type: "ceramic-coating | paint-correction | interior | full-detail | starlight | other"
hook_type: "before-after | process | result | reaction | educational | behind-scenes"
caption_theme: "[one-liner describing what the caption said]"
signals: [audience-growth, conversion, non-performer]

# Analytics (populated 48hrs after publish)
instagram_views: 0
instagram_reach: 0
instagram_saves: 0
instagram_shares: 0
instagram_avg_watch_time_s: 0
instagram_skip_rate_pct: 0
tiktok_views: 0
tiktok_likes: 0
tiktok_shares: 0
tiktok_comments: 0
tiktok_completion_rate_pct: 0
tiktok_profile_visits: 0

# Attribution
attributed_leads: 0
utm_content: "post_YYYY-MM-DD_[slug]"
---
```

### Per-Post Note: Body

The body is what makes the note useful for pattern analysis — it captures the human reasoning and creative choices that the metrics alone cannot explain.

```markdown
## Caption

[Full caption text, verbatim]

## Hashtags

[Full hashtag list]

## Creative Notes

[What was the hook? What visual was used? What made this different from other posts? 1-3 sentences. Written by M&C at scheduling time.]

## Performance

[Populated on analytics pull. One-sentence interpretation: "High saves, low skip rate — detailing process content performs well with existing audience." M&C writes this.]

## Links

[[audience-growth]] [[conversion]] [[non-performer]]
(whichever signal tags apply, linking to Signal files)
```

### Signal Files

`audience-growth.md`, `conversion.md`, `non-performer.md` are index files that contain:
- A brief definition of what the signal means
- A Dataview query block (if M&C uses Dataview) to list all posts with that tag
- A manually maintained "patterns emerging" section where M&C records observations

These files are the synthesis layer — they turn individual post notes into actionable insight.

### index.md

Top-level index with:
- Total posts logged
- Current signal distribution (how many audience-growth vs conversion vs non-performer)
- Link to each signal file
- A manually updated "current hypothesis" section (e.g. "Process videos perform 2x better than results-only clips")

### Export Mechanics

The CRM exports one `.md` file per post when analytics are pulled. The export should:
1. Create the file with full frontmatter on first export
2. Update only the analytics fields and signals on subsequent re-exports (if analytics improve or signal tags change)
3. Export to a configurable vault path (environment variable `OBSIDIAN_VAULT_PATH` pointing to the vault's `Content-Intelligence/Posts/` directory)
4. Use the filename format `YYYY-MM-DD — [slug].md` where slug is the first 40 characters of the caption, lowercased, with spaces replaced by hyphens

**Confidence: MEDIUM** — The export path approach is standard for local vault sync but assumes the server runs on the same machine as the vault, OR that the Obsidian vault is synced via Obsidian Sync/iCloud to a path accessible from the server's filesystem. For Vercel (serverless), this cannot write to a local filesystem. The correct implementation is: export the `.md` content as a downloadable file or ZIP that M&C manually drops into their vault, OR use the Obsidian Git plugin to push to a private GitHub repo where the CRM commits directly.

**Recommended approach for Vercel deployment:** Export generates a ZIP of all un-exported (or all) post notes, downloadable from the CRM admin. M&C drops the files into their vault manually or configures Obsidian Git to pull from a private repo that the CRM pushes to.

---

## Feature Dependencies

```
Video upload → ffprobe quality check (check runs server-side on upload)
Video upload → Vercel Blob storage → 7-day TTL cron
Scheduled date/time → Vercel Cron scheduler → Platform publish calls
Platform publish → Post status tracking → Failure notification (Telegram)
Published post → Analytics pull cron (runs 48hrs after published_at)
Analytics pull → Signal tagging logic
Analytics pull → Obsidian export
Lead submission with UTM → Post attribution (utm_content match)
Post attribution → conversion signal tag
All post signals → Content performance dashboard
```

---

## MVP Recommendation

Build in this order within the milestone:

**Phase 1 — Core Scheduler**
1. Video upload + ffprobe quality check (table stakes + differentiator in one)
2. Post creation form (caption, hashtags, platforms, scheduled_at)
3. Vercel Cron → Instagram publish (Graph API three-step flow)
4. Post status tracking + failure Telegram notification
5. 7-day Blob TTL cron

**Phase 2 — TikTok + Analytics**
6. TikTok Direct Post (or Inbox fallback if audit pending)
7. Analytics pull cron (48hr post-publish)
8. Signal tagging logic
9. Content performance dashboard screen

**Phase 3 — Intelligence Layer**
10. UTM attribution linking (post-to-lead)
11. Obsidian vault export (ZIP download)

**Rationale:** Instagram Graph API is faster to get live (no audit required for an existing Business account). TikTok requires an app audit that takes 2–6 weeks and can block Phase 2. Phase 3 delivers zero value until there are posts to analyse — defer until posts are accumulating.

---

## Anti-Features

Features to explicitly not build. Each one would add complexity, maintenance burden, or create false confidence without adding proportional value for a 1-post-per-day operation.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| AI caption generation | Captions for premium car detailing are short, personal, and brand-voice-specific. AI captions produce generic output. | Write the caption manually at scheduling time — it takes 90 seconds |
| Multi-account support | M&C has one Instagram and one TikTok. Multi-account adds auth complexity (multiple token stores, per-account rate limits) with no current use case | Hard-code single-account credentials in environment variables |
| Content approval workflow | No team review is needed when the business owner and content creator are the same person | Single-user publish flow only |
| Competitor benchmarking | Requires scraping or third-party data APIs, not available from official platform APIs without paid plans | Use own post performance trends only |
| Hashtag research tools | Hashtag optimisation for detailing content is already known. Building a research tool is a feature in its own right | Include a static "best performing hashtags" list as a text file M&C maintains manually |
| Instagram Stories scheduling | Stories require different API flow, different specs, different content strategy, and expire in 24hrs anyway | Reels only for v1.0. Stories are a separate milestone if ever needed |
| Pinterest / YouTube Shorts / LinkedIn | No attribution evidence that M&C's audience is on these platforms | Instagram + TikTok only |
| Real-time analytics (< 48hr pull) | Platform APIs impose rate limits and data is often unreliable before 48hrs post-publish. Views and reach continue accumulating for days | Pull once at 48hrs. Optional second pull at 7 days if needed later |
| A/B testing different captions | Too low volume (1 post/day) for A/B data to reach significance | Build pattern awareness through Obsidian vault instead |
| Suggested posting times based on analytics | Requires historical analytics data that doesn't exist yet. Premature optimisation | Post at a fixed time (e.g. 10:00 SAST) for v1.0. Revisit after 3+ months of data |
| Bulk import / bulk scheduling | 1 post/day means one post is scheduled at a time. Bulk tooling adds UI complexity for zero workflow gain | Single-post creation form only |
| Public embed / share links for scheduled posts | Unnecessary for an internal CRM tool | Keep all content scheduling behind admin auth |

---

## Defer to Future Milestones

| Feature | Reason to Defer |
|---------|----------------|
| TikTok Direct Post (if audit pending) | Use Inbox fallback in v1.0; upgrade to Direct Post once audit completes |
| 7-day re-pull of analytics | Nice-to-have for seeing posts with delayed virality; requires tracking which posts have been re-pulled |
| Obsidian Git push integration | Requires GitHub repo setup; ZIP download works for v1.0 |
| Signal threshold auto-calibration | Needs 30+ posts before median/quartile thresholds are meaningful |
| Instagram Story scheduling | Different API, different content strategy — separate milestone |
| Content calendar view (visual) | List view sufficient for 1 post/day; add calendar UI after v1.0 is validated |

---

## Platform API Constraints (HIGH Confidence)

These are non-negotiable constraints from official platform documentation that the requirements must work around.

**Instagram Graph API:**
- Business account required (not Creator account) — HIGH confidence, official docs
- `instagram_business_basic` + `instagram_business_content_publish` permissions required through Meta app review
- Three-step publish flow: create container → poll for FINISHED → publish — HIGH confidence
- Rate limit: 100 posts per rolling 24hrs (well above M&C's usage) — HIGH confidence
- No music library access via API — HIGH confidence
- Scheduling: Instagram Graph API has no native `scheduled_publish_time` for Reels in the standard Business API. Must implement as a Vercel Cron job that fires at the scheduled time — MEDIUM confidence (verify against latest Graph API docs before build)
- Reels must be 5–90 seconds; outside this range they publish as feed video not Reels tab — HIGH confidence
- Max file size 100 MB — HIGH confidence

**TikTok Content Posting API:**
- App audit required before Direct Post can publish publicly — HIGH confidence, official docs
- Audit takes 2–6 weeks — MEDIUM confidence
- No native server-side scheduling — HIGH confidence. Must implement as Vercel Cron
- Inbox (draft) flow available without audit — HIGH confidence
- Daily cap: 25 posts per account — well above M&C usage — HIGH confidence
- Upload URL valid for 1 hour only — HIGH confidence (relevant for scheduled posts: do not generate upload URL until post time)

---

## Sources

- [Instagram Graph API Reels Publishing Guide — Postproxy](https://postproxy.dev/blog/instagram-reels-api-publishing-guide/)
- [Instagram Media Insights — Meta for Developers](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights/)
- [TikTok Content Posting API — Direct Post Reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [TikTok Analytics Metrics — Sprout Social 2026](https://sproutsocial.com/insights/tiktok-metrics/)
- [Social Media Video Specs — Sprout Social 2026](https://sproutsocial.com/insights/social-media-video-specs-guide/)
- [Instagram Insights Metrics Deprecation April 2025 — Emplifi](https://docs.emplifi.io/platform/latest/home/instagram-insights-metrics-deprecation-april-2025)
- [Social Media Analytics Small Business — Later](https://later.com/blog/social-media-analytics-small-business/)
- [UTM Parameters Organic Social Posts — Attributer](https://attributer.io/blog/utm-parameters-organic-social-posts)
- [TikTok Scheduling via API — Postproxy](https://postproxy.dev/how-to/schedule-tiktok-posts/)
- [Mixpost — Self-Hosted Social Media Management](https://mixpost.app/) (reference for self-hosted scheduler patterns)
