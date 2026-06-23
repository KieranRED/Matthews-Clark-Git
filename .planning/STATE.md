---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: WhatsApp Business Integration
status: executing
stopped_at: Paused at 10-03-PLAN.md Task 4 (human-verify checkpoint — awaiting PWA verification)
last_updated: "2026-06-23T11:56:32Z"
last_activity: 2026-06-23
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 6
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-22)

**Core value:** A single platform that runs the M&C business — no spreadsheets, no duct-taped SaaS stack
**Current focus:** Phase 10 — web-push-notifications

## Current Position

Phase: 10 (web-push-notifications) — EXECUTING
Plan: 3 of 3
Status: Paused at checkpoint — awaiting human verification
Last activity: 2026-06-23

Progress: [░░░░░░░░░░] 0% (v1.2)

## Performance Metrics

**Velocity:**

- Total plans completed (v1.2): 0
- Average duration: —
- Total execution time: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

- [Setup]: Neon Postgres (Vercel Marketplace) for conversation storage — KV not suited for full-text conversation queries
- [Setup]: Push subscriptions stored in KV (not Neon) to keep hot path (webhook → push) off Postgres
- [Setup]: Single Claude call per conversation covers all 5 AI signals — never split into separate calls
- [Setup]: CRM WhatsApp tab = 3 surgical edits to shell.jsx, app.jsx, shell-desktop.jsx — no new Next.js page
- [Setup]: Meta Cloud API direct (plain fetch + node:crypto) — zero npm packages for Meta integration
- [Phase 09]: Use DATABASE_URL_UNPOOLED for migration runner — DDL incompatible with Neon PgBouncer pooler
- [Phase 09]: wamid TEXT UNIQUE NOT NULL — dedup safety net for Meta at-least-once delivery semantics
- [Phase 09]: Relative imports in whatsappStore.js for node --test compatibility (@/ alias only resolves under Next.js bundler)
- [Phase 09]: Source-text assertions in whatsappStore tests — Node v20 lacks mock.module; readFile + String.includes covers SQL idempotency without live DB
- [Phase 09]: export const runtime='nodejs' on webhook routes — crypto.createHmac not in Edge
- [Phase 09]: after() from next/server as primary async mechanism — defers Neon writes until after 200 is flushed (FOUND-03)
- [Phase 09]: WABA subscribe endpoint returns POST + GET results — caller confirms subscription is active in one call (FOUND-06)
- [Phase 10]: web-push@^3.6.7 as sole VAPID library; VAPID subject must be mailto: not https://localhost (Safari/iOS requirement)
- [Phase 10-web-push-notifications]: teamMemberId == wa_id: KV key is push:sub:{wa_id}; Plan 10-03 subscribe button must POST the team member's wa_id
- [Phase 10-web-push-notifications]: dispatchToTeam has per-member try/catch so one bad member cannot abort the fan-out; sendPushNotification returns gone=true on 410/404 to trigger kvDel pruning
- [Phase 10-03]: teamMemberId sourced from viewer.waId (= viewer.phone from teamStore), falls back to username; crm-kit API now exposes waId
- [Phase 10-03]: icon path is /icons/icon-192.png (exists at public/icons/ not public/ root)

### Critical Pre-Code Tasks

- Submit all WhatsApp message templates to Meta in Week 1 (24-72hr approval lead time)
- Provision Neon Postgres via Vercel Marketplace (populates DATABASE_URL automatically)
- Complete Meta Business Manager WABA setup (1-3 business days, manual)
- Confirm iOS push fallback: team members with EU App Store accounts cannot use iOS Web Push — Telegram fallback acceptable?

### Blockers/Concerns

- Message template pre-approval must be submitted before Phases 14-15 can go live
- WABA provisioning (manual Meta setup) must be done before Phase 09 testing

## Session Continuity

Last session: 2026-06-23T11:56:32Z
Stopped at: Paused at 10-03-PLAN.md Task 4 checkpoint (human-verify)
Resume file: None
