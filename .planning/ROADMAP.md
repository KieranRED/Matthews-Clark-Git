# Roadmap: Matthews & Clark

## Milestones

- 🚧 **v1.0 Social Content Scheduler** - Phases 1-4 (in progress)
- 🚧 **v1.1 Wrap Visualisation Studio** - Phases 5-8 (in progress)

## Phases

<details>
<summary>🚧 v1.0 Social Content Scheduler (Phases 1-4) — In Progress</summary>

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
- [x] 01-01-PLAN.md — KV primitives (kvZRangeByScore) + lib/contentStore.js (post CRUD foundation)
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

</details>

---

### 🚧 v1.1 Wrap Visualisation Studio (In Progress)

**Milestone Goal:** A public-facing wrap visualisation tool at /wrap-studio where customers upload their car photo, choose from 375 real Avery/Hexis/STEK colours, see a mathematically accurate colour + finish preview, receive a GPT-Image-2 studio render, and fire a quote into the M&C CRM.

- [ ] **Phase 5: Integration & Catalogue** - Next.js route live, prototype integrated, full 375-colour catalogue browsable with brand/finish/search filtering
- [ ] **Phase 6: Upload & Recolour Engine** - Customer uploads car photo, background is removed in-browser, and selecting any colour applies a finish-accurate canvas preview instantly
- [ ] **Phase 7: GPT-Image-2 Render** - Customer triggers a studio render that blends their pre-coloured car into the M&C bay scene via GPT-Image-2, with before/after comparison
- [ ] **Phase 8: Quote & Distribution** - Customer submits a quote request that fires into the CRM and Telegram, and can download or share their visualisation

## Phase Details (v1.1)

### Phase 5: Integration & Catalogue
**Goal**: The wrap studio is live at /wrap-studio, the design system prototype is integrated into the repo, and customers can browse, filter, and search all 375 real wrap colours with accurate swatch imagery
**Depends on**: Phase 4
**Requirements**: INT-01, INT-02, INT-03, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06
**Success Criteria** (what must be TRUE):
  1. Customer can visit /wrap-studio on a phone or desktop without logging in and the studio loads within 3 seconds
  2. Customer can see all 375 wrap films (Avery, Hexis, STEK) in the catalogue, each showing the real product code, series name, finish type, and swatch image
  3. Customer can filter the catalogue by brand (All / Avery Dennison / Hexis / STEK) and by finish type (Gloss / Satin / Matte / Chrome / Colour-shift / Carbon / PPF) — results update immediately
  4. Customer can type a colour name or product code into the search box and the catalogue narrows to matching results
  5. The studio layout is usable on a phone screen — catalogue swatches, filters, and the main stage area are all accessible without horizontal scrolling
**Plans**: TBD
**UI hint**: yes

### Phase 6: Upload & Recolour Engine
**Goal**: Customers can upload a car photo, have its background removed entirely in-browser, and instantly see a finish-accurate colour preview on the masked car when they select any catalogue swatch — including per-panel colour assignment and a before/after comparison slider
**Depends on**: Phase 5
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04, RCOL-01, RCOL-02, RCOL-03, RCOL-04, RCOL-05, RCOL-06, RCOL-07, RCOL-08, RCOL-09, RCOL-10
**Success Criteria** (what must be TRUE):
  1. Customer can upload a JPG, PNG, or HEIC car photo by drag-and-drop or file picker, see a progress indicator while background removal runs, and receive a clean masked car image — all without any server round-trip
  2. Selecting a colour from the catalogue immediately updates the car preview on the canvas with the correct hue and finish treatment — gloss amplifies highlights, matte flattens specularity, satin dampens it by ~60%, chrome sweeps a gradient band, metallic adds grain noise, colour-shift animates a two-tone flip, and PPF applies a thin tint only
  3. Customer can assign different colours to individual panels (bonnet, roof, mirrors, pillars, boot, accents, full body) and see each panel coloured independently
  4. Customer can drag the before/after slider to compare the original uploaded photo against the wrapped preview
**Plans**: TBD
**UI hint**: yes

### Phase 7: GPT-Image-2 Render
**Goal**: Customers can trigger a studio render that sends their pre-coloured car composite to GPT-Image-2, which integrates it into the M&C studio bay scene — preserving the chosen colour and finish while matching studio lighting — and the result replaces the fast preview with a before/after comparison against the original
**Depends on**: Phase 6
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04, RENDER-05, RENDER-06
**Success Criteria** (what must be TRUE):
  1. Customer can click "Studio Render" and see a progress indicator for the 10–20 second render duration without the page becoming unresponsive
  2. The rendered image shows the customer's car composited into the M&C studio bay with matched lighting — the chosen finish character (gloss sheen, matte flatness, chrome sweep, etc.) is visibly preserved in the output
  3. After render completes, the stage shows the GPT-Image-2 output and the before/after slider compares the original uploaded car against the studio render
  4. If the render API call fails, the customer sees a clear error message and the fast preview canvas remains visible so they are not left with a blank stage
**Plans**: TBD

### Phase 8: Quote & Distribution
**Goal**: Customers can submit a quote request with their colour selection and panel breakdown pre-filled, which creates a CRM lead and fires a Telegram notification to M&C — and they can download a watermarked PNG or generate a shareable link to their visualisation
**Depends on**: Phase 7
**Requirements**: QUOTE-01, QUOTE-02, QUOTE-03, QUOTE-04, QUOTE-05, SHARE-01, SHARE-02
**Success Criteria** (what must be TRUE):
  1. Customer can open a quote modal with their selected colours and panel assignment already filled in, complete name, car details, and WhatsApp number, and receive a confirmation message on submission
  2. Submitting the quote form creates a lead record in the M&C KV store with colour selection, panel breakdown, and price tier attached — visible in the CRM pipeline
  3. M&C team receives a Telegram notification with the customer's details and colour selection immediately after submission
  4. Customer can download the current visualisation as a watermarked PNG with M&C branding applied
  5. Customer can generate a shareable link that opens the studio with their colour selection pre-loaded
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 1/9 | In progress | - |
| 2. TikTok | v1.0 | 0/TBD | Not started | - |
| 3. Analytics & Intelligence | v1.0 | 0/TBD | Not started | - |
| 4. Obsidian Vault | v1.0 | 0/TBD | Not started | - |
| 5. Integration & Catalogue | v1.1 | 0/TBD | Not started | - |
| 6. Upload & Recolour Engine | v1.1 | 0/TBD | Not started | - |
| 7. GPT-Image-2 Render | v1.1 | 0/TBD | Not started | - |
| 8. Quote & Distribution | v1.1 | 0/TBD | Not started | - |
