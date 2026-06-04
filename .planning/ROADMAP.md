# Roadmap: Matthews & Clark — v1.1 Wrap Visualisation Studio

## Overview

Four phases that take the existing design system prototype to a production wrap visualisation tool. Phase 5 integrates the prototype into Next.js with the real 375-colour catalogue. Phase 6 adds in-browser background removal and a finish-accurate canvas recolour engine. Phase 7 wires up GPT-Image-2 for studio render scene integration. Phase 8 closes the commercial loop with CRM quote submission, share links, and watermarked download.

## Phases

**Phase Numbering:**
Continuing from v1.0 which used Phases 1–4. v1.1 starts at Phase 5.

- [x] **Phase 5: Integration & Catalogue** - Next.js route live at /wrap-studio, design system prototype integrated, full 375-colour catalogue browsable with brand/finish/search filtering and real swatch images
- [ ] **Phase 6: Upload & Recolour Engine** - Customer uploads car photo, background removed in-browser via WASM, selecting any colour applies a finish-accurate canvas preview instantly across all 7 panel zones
- [ ] **Phase 7: GPT-Image-2 Render** - Customer triggers a studio render that sends pre-coloured car composite to GPT-Image-2 for scene integration into M&C bay, with before/after comparison
- [ ] **Phase 8: Quote & Distribution** - Customer submits quote into CRM + Telegram, downloads watermarked PNG, generates shareable link

## Phase Details

### Phase 5: Integration & Catalogue
**Goal**: The wrap studio is live at /mc-site/wrap-studio, the design system prototype is integrated into the repo, and customers can browse, filter, and search all 375 real wrap colours with accurate swatch imagery
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: INT-01, INT-02, INT-03, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06
**Success Criteria** (what must be TRUE):
  1. Customer can visit /wrap-studio on a phone or desktop without logging in and the studio loads within 3 seconds
  2. Customer can see all 375 wrap films (Avery, Hexis, STEK) in the catalogue, each showing the real product code, series name, finish type, and swatch image
  3. Customer can filter by brand (All / Avery Dennison / Hexis / STEK) and by finish type — results update immediately
  4. Customer can search by colour name or product code and catalogue narrows to matching results
  5. Studio layout is usable on a phone screen without horizontal scrolling
**Plans**: 4 plans
Plans:
- [x] 05-01-PLAN.md — Scaffold route handler + copy 7 prototype files to public/wrap-studio/, null demo car
- [x] 05-02-PLAN.md — Build catalogue script: map 375 real entries, upload 18 STEK swatches to Blob, generate catalogue.js
- [x] 05-03-PLAN.md — Swatch imagery + low-confidence indicator, strip tier/pricing UI, add wrapping-page CTA
- [x] 05-04-PLAN.md — UAT: verify all 9 requirements and 5 success criteria
**UI hint**: yes

### Phase 6: Upload & Recolour Engine
**Goal**: Customers can upload a car photo, have its background removed entirely in-browser, and instantly see a finish-accurate colour preview on the masked car when they select any catalogue swatch — including per-panel colour assignment and a before/after comparison slider
**Depends on**: Phase 5
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-03, UPLOAD-04, RCOL-01, RCOL-02, RCOL-03, RCOL-04, RCOL-05, RCOL-06, RCOL-07, RCOL-08, RCOL-09, RCOL-10
**Success Criteria** (what must be TRUE):
  1. Customer can upload JPG/PNG/HEIC, see a progress indicator while background removal runs in-browser with no server round-trip, and receive a clean masked car
  2. Selecting a colour immediately updates the canvas with correct hue and finish treatment — gloss amplifies highlights, matte flattens specularity, satin dampens it ~60%, chrome sweeps a gradient band, metallic adds grain noise, colour-shift animates a two-tone flip, PPF applies thin tint only
  3. Customer can assign different colours to individual panels (bonnet, roof, mirrors, pillars, boot, accents, full body) independently
  4. Customer can drag the before/after slider to compare original vs wrapped preview
**Plans**: TBD
**UI hint**: yes

### Phase 7: GPT-Image-2 Render
**Goal**: Customers can trigger a studio render that sends their pre-coloured car composite to GPT-Image-2, which integrates it into the M&C studio bay scene — preserving the chosen colour and finish while matching studio lighting — and the result replaces the fast preview with a before/after comparison
**Depends on**: Phase 6
**Requirements**: RENDER-01, RENDER-02, RENDER-03, RENDER-04, RENDER-05, RENDER-06
**Success Criteria** (what must be TRUE):
  1. Customer can click "Studio Render" and see a progress indicator for the 10–20 second render without the page becoming unresponsive
  2. Rendered image shows car composited into M&C studio bay with matched lighting — chosen finish character (gloss sheen, matte flatness, chrome sweep) visibly preserved
  3. After render, stage shows GPT-Image-2 output and before/after slider compares original car vs studio render
  4. If render API fails, customer sees clear error and fast preview canvas remains intact
**Plans**: TBD

### Phase 8: Quote & Distribution
**Goal**: Customers can submit a quote request with colour selection and panel breakdown pre-filled, creating a CRM lead and firing a Telegram notification to M&C — and can download a watermarked PNG or generate a shareable link
**Depends on**: Phase 7
**Requirements**: QUOTE-01, QUOTE-02, QUOTE-03, QUOTE-04, QUOTE-05, SHARE-01, SHARE-02
**Success Criteria** (what must be TRUE):
  1. Customer can open quote modal with colours and panel breakdown pre-filled, submit with name/car/WhatsApp, and see confirmation message
  2. Submission creates a KV lead record visible in the CRM pipeline with colour selection, panel breakdown, and price tier
  3. M&C receives Telegram notification immediately with customer details and colour selection
  4. Customer can download current visualisation as watermarked PNG with M&C branding
  5. Customer can generate shareable link that opens studio with colour selection pre-loaded
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Integration & Catalogue | 4/4 | Complete    | 2026-06-04 |
| 6. Upload & Recolour Engine | 0/TBD | Not started | - |
| 7. GPT-Image-2 Render | 0/TBD | Not started | - |
| 8. Quote & Distribution | 0/TBD | Not started | - |
