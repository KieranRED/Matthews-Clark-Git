# GSD State — Matthews & Clark

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-29 — Milestone v1.0 Social Content Scheduler started

## Accumulated Context

- Project is a Next.js 15 App Router app on Vercel
- CRM runs client-side in `/app/(crm)/admin/(protected)/kit/` — all screens are React components fed from a single `/api/admin/crm-kit` endpoint that returns the full index
- Leads stored in Upstash Redis via `lib/leadStore.js`
- Vercel Blob already available (used for photos in job detail)
- Upstash KV env vars: `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`)
- TikTok Direct Post API requires app review (1–4 weeks) — build with Inbox fallback
- Instagram Graph API is ready to use with Facebook Business account setup
- Quality check: ffprobe must run server-side (API route) — not available in Edge runtime, needs Node.js function
- UTM attribution already in lead schema — wire social post campaigns to UTM links

## Blockers

None yet.
