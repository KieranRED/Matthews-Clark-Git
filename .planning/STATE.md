---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: WhatsApp Business Integration
current_plan: 0
status: defining requirements
stopped_at: Milestone v1.2 started — defining requirements
last_updated: "2026-06-22T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-22 — Milestone v1.2 started

## Accumulated Context

- WhatsApp numbers will be eSIM-based team business numbers registered via Meta Cloud API (NOT WhatsApp Business App — mutually exclusive with webhooks)
- Meta sandbox test number available immediately — dev can start without waiting for eSIMs
- Neon Postgres (Vercel Marketplace) for conversation storage — Redis not suited for full-text conversation queries
- Web Push (PWA, add-to-home-screen) for inbound message notifications — service worker based
- Chat UI lives as a new tab in existing CRM admin at /admin/whatsapp
- All existing Telegram alerts and CRM behaviour unchanged — WhatsApp layer is purely additive
- Team members message leads from the CRM chat UI (not WhatsApp app) — lead sees messages from their eSIM number
- Claude (Anthropic API) powers AI intelligence features — warmth scoring, objection detection, status auto-updates
