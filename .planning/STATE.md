# GSD State — Matthews & Clark

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** A single platform that runs the business — no spreadsheets, no duct-taped SaaS stack
**Current focus:** Phase 1: Foundation — ready to plan

## Current Position

Phase: 1 of 4 (Foundation)
Plan: — of — in current phase
Status: Ready to plan
Last activity: 2026-05-29 — Roadmap created, Phase 1 ready to plan

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: mediainfo.js (WASM) chosen over ffprobe-static — ffprobe fails on Vercel due to __dirname bug. MUST validate on Vercel production runtime before committing upload architecture.
- [Pre-Phase 1]: TikTok Direct Post audit must be submitted at Phase 1 start — 2–4 week review; Inbox fallback ships first so Phase 2 is not blocked.
- [Pre-Phase 1]: Client-side Blob upload for videos (Vercel 4.5 MB server request limit); quality check fires on returned Blob URL.
- [Pre-Phase 1]: Two-phase KV state machine for Instagram (container creation on cron N, poll+publish on cron N+1).

### Pending Todos

None yet.

### Blockers/Concerns

- Confirm Vercel plan is Pro (Hobby cannot run per-minute cron — scheduling architecture differs)
- Confirm M&C Instagram account is Business type (Creator accounts cannot use Graph API)
- Submit TikTok Direct Post app audit before or at Phase 1 start

## Session Continuity

Last session: 2026-05-29
Stopped at: Roadmap written, requirements traced, STATE.md initialised
Resume file: None
