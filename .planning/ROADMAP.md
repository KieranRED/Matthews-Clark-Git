# Roadmap

## Phase 07: Quote, CRM Integration & Share/Download
**Goal:** Complete the commercial loop — per-panel colour assignment, quote form → CRM lead, Telegram notification, and watermarked download + shareable link.

**Requirements:** RCOL-09, QUOTE-01, QUOTE-02, QUOTE-03, QUOTE-04, QUOTE-05, SHARE-01, SHARE-02

**UI hint:** yes

**Plans:** 3/3 plans complete

Plans:
- [x] 07-01-PLAN.md — /api/wrap-quote route: persist wrap lead + Telegram notification (QUOTE-03, QUOTE-04)
- [x] 07-02-PLAN.md — Wire QuoteModal to API; controlled form + panel breakdown (RCOL-09, QUOTE-01/02/05)
- [x] 07-03-PLAN.md — Watermarked download + shareable colour link (SHARE-01, SHARE-02)

| Plan | Name | Status | Plans | Summaries |
|------|------|--------|-------|-----------|
| 01 | /api/wrap-quote route + Telegram notification | Complete | 1 | 1 |
| 02 | QuoteModal controlled form + panel breakdown | Complete | 1 | 1 |
| 03 | Watermarked download + shareable colour link | Complete | 1 | 1 |

## Phase 08: GPT-Image-2 Studio Render
**Goal:** Add the AI studio render pass — send the canvas composite to GPT-Image-1 (images.edit), integrate the car into the M&C studio bay scene, and surface the result with a before/after comparison.

**Requirements:** RENDER-01, RENDER-02, RENDER-03, RENDER-04, RENDER-05, RENDER-06

**UI hint:** yes

**Plans:** 4 plans

Plans:
- [x] 08-01-PLAN.md — Wave 0 infra: install openai, OPENAI_API_KEY, kvExpire helper, studio bay asset
- [x] 08-02-PLAN.md — /api/wrap-render route: gpt-image-1 images.edit + per-IP rate limit (RENDER-02/03/04)
- [ ] 08-03-PLAN.md — Canvas helper + renderUrl state + real startRender fetch + BA slider (RENDER-01/05/06)
- [ ] 08-04-PLAN.md — Human-verify live studio render end-to-end (RENDER-04/06)

| Plan | Name | Status | Plans | Summaries |
|------|------|--------|-------|-----------|
| 01 | Wave 0 infra (openai + env + kvExpire + asset) | Complete | 1 | 1 |
| 02 | /api/wrap-render route + rate limit | Planned | 1 | 0 |
| 03 | Canvas helper + renderUrl wiring | Planned | 1 | 0 |
| 04 | Human-verify live render | Planned | 1 | 0 |

## Phase 06: Upload + Recolour Engine

| Plan | Name | Status | Plans | Summaries |
|------|------|--------|-------|-----------|
| 01 | Upload + Background Removal Engine | Complete | 1 | 1 |
| 02 | HEIC Support + Finish Set | Complete | 1 | 1 |
| 03 | Before/After Slider Wiring + Per-Panel Verification | Complete | 1 | 1 |
| 04 | Phase 6 UAT Sign-Off | Complete | 1 | 1 |
