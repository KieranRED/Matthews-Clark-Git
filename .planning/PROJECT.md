# Matthews & Clark — Project

## What This Is

A self-hosted business platform for Matthews & Clark, a premium car detailing studio in Cape Town. The platform covers the full customer lifecycle (lead capture → quoting → invoicing → client portal) and the internal ops workflow (CRM, task management, calendar, vendor quoting via Izimoto). A social content scheduler is being added to close the loop between content production and lead attribution.

## Core Value

A single platform that runs the business — no spreadsheets, no duct-taped SaaS stack. Every lead, quote, job, and piece of content tracked in one place, owned entirely by M&C.

## Who It's For

- **M&C team** (Matthews & Clark staff) — CRM, pipeline, job management, content scheduling
- **Izimoto** (vendor partner) — receives quote requests, submits per-service pricing
- **Clients** — lead form, invoice portal, booking flow

## Tech Stack

- **Framework**: Next.js 15 App Router (deployed on Vercel)
- **Storage**: Upstash Redis (KV) for leads/jobs/clients, Vercel Blob for media
- **Notifications**: Telegram bots (M&C group + Izimoto group)
- **Auth**: Custom cookie-based admin auth + token-protected public links
- **Styling**: Custom CSS modules (dark, monospace-accented CRM aesthetic)
- **Deployment**: Vercel (production at matthewsandclark.co.za)

## Current Milestone: v1.2 WhatsApp Business Integration

**Goal:** Add a WhatsApp conversation layer to the CRM that logs all team conversations, links them to CRM leads, fires AI-powered alerts, and surfaces conversation intelligence on lead cards.

**Target features:**
- Meta Cloud API webhook receiver + Neon Postgres conversation storage
- Web Push notifications (PWA) so team gets phone alerts on inbound messages
- CRM WhatsApp tab — thread list + chat UI (new tab in existing admin)
- Lead auto-linking by phone number (automatic, no manual linking)
- Team number management (register/name eSIM numbers in admin UI)
- AI intelligence: warmth scoring, objection detection, status auto-updates, follow-up timing
- Automated outbound: no-contact alerts, morning briefings, aftercare scheduling
- Competitor intelligence logging + qualified lead scoring tied to ad attribution
- Broadcast campaigns to warm unconverted leads

## Previous Milestone: v1.1 Wrap Visualisation Studio (shipped)

**Goal:** Ship a public-facing wrap visualisation tool at /wrap-studio where customers upload their car photo, choose from 375 real Avery/Hexis/STEK colours, see a mathematically-accurate colour + finish preview, and get a GPT-Image-2 studio render — then fire a quote straight into the M&C CRM.

## v1.0 Social Content Scheduler (in progress)

**Goal:** Build a self-hosted content scheduling system that auto-posts Reels to Instagram and TikTok via platform APIs, checks video export quality on upload, pulls analytics back into the CRM dashboard, and exports post data to an Obsidian second brain for script intelligence.

## Validated Requirements (existing system)

### Lead Capture
- [x] **LEAD-01**: Customer can submit a lead via the public lead form with service selection, vehicle details, and contact info
- [x] **LEAD-02**: System captures UTM parameters (source, medium, campaign, content, term) on every lead submission
- [x] **LEAD-03**: System records source platform (TIKTOK, INSTAGRAM, WEBSITE) on lead

### Vendor Quoting
- [x] **QUOTE-01**: M&C can send a secure quote link to Izimoto
- [x] **QUOTE-02**: Izimoto can submit per-service pricing (ex VAT) via the vendor quote form
- [x] **QUOTE-03**: Quote submission triggers Telegram notification to M&C with full service breakdown
- [x] **QUOTE-04**: System supports starlight and interior service types in quotes

### Wrap Studio (Validated in Phase 07: Quote, CRM Integration & Share/Download)
- [x] **RCOL-09**: Per-panel colour assignment wired into quote breakdown (canvas segmentation deferred to future phase)
- [x] **QUOTE-01 (wrap)**: Customer can open a quote request modal with colour selection pre-filled
- [x] **QUOTE-02 (wrap)**: Quote form captures name, car, WhatsApp/phone, notes
- [x] **QUOTE-03 (wrap)**: Submission creates lead in KV store with colour selection and panel breakdown
- [x] **QUOTE-04 (wrap)**: Telegram notification fires to M&C group with colour selection and customer details
- [x] **QUOTE-05 (wrap)**: Customer sees confirmation toast after successful submission
- [x] **SHARE-01**: Customer can download watermarked PNG (M&C branding applied client-side)
- [x] **SHARE-02**: Customer can generate shareable link that reopens studio with colour selection pre-loaded

### Admin CRM
- [x] **CRM-01**: M&C team can view all leads in a pipeline with stage tracking
- [x] **CRM-02**: Admin can manage leads, jobs, clients, calendar, and settings from mobile CRM
- [x] **CRM-03**: Pricing Guide screen shows per-service quote history, acceptance rates, and conversion funnel

### Client-Facing
- [x] **CLIENT-01**: Client can view and pay invoice via portal
- [x] **CLIENT-02**: Client can confirm booking
- [x] **CLIENT-03**: Commission and invoice generation supported

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage | Upstash Redis | Serverless-native, no connection pooling |
| Hosting | Vercel | Existing, Blob + Cron native |
| Social posting | Direct platform APIs (no SaaS) | Full control, no recurring SaaS cost, same quality |
| Video storage | Vercel Blob (7-day TTL) | Platform downloads original; cost negligible |
| TikTok fallback | Upload to Inbox while Direct Post approval pending | Avoids blocking Phase 2 |
| Quality check | ffprobe server-side on upload | Single check, shows tag before posting |

## Architecture

```
app/
  (crm)/admin/(protected)/kit/   — CRM screens (client-side React)
  api/admin/                     — Admin API routes
  api/lead/                      — Public lead + quote routes
  mc-site/                       — Public marketing site
components/LeadFlow/              — Customer-facing lead form
lib/                             — leadStore, adminAuth, telegram, linkToken
```

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-22 — Milestone v1.2 started (WhatsApp Business Integration)*
