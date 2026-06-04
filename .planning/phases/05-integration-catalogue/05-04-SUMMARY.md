---
phase: 05-integration-catalogue
plan: "04"
subsystem: ui
tags: [wrap-studio, uat, catalogue, next-js, vercel-blob]

requires:
  - phase: 05-integration-catalogue (plans 01-03)
    provides: Live /mc-site/wrap-studio route with 375-colour catalogue, swatch imagery, no pricing UI, and wrapping-page CTA

provides:
  - UAT sign-off confirming all 9 requirements and 5 success criteria verified in browser
  - Phase 5 marked complete

affects: [phase-06-upload-recolour]

tech-stack:
  added: []
  patterns:
    - "Post-UAT fix loop: fixes committed to main before final human approval"

key-files:
  created:
    - .planning/phases/05-integration-catalogue/05-04-SUMMARY.md
  modified:
    - public/wrap-studio/app.jsx (upload zone CSS class, isDemo null guard, demo car removal)
    - middleware.js (pass-through for /wrap-studio/ static assets)

key-decisions:
  - "Post-UAT fixes committed to main before approval — user verified corrected UI before typing 'approved'"
  - "Fast Preview removed; Studio Render is the only render path"
  - "Upload button added to empty state so first-time users see a clear action"
  - "Swatch deselect toggle added — clicking selected swatch deselects it"
  - "Upload zone given its own CSS class (.upload-zone) to escape ph-label mono/uppercase styles"

patterns-established:
  - "UAT gate: human types 'approved' after verifying in real browser (desktop + phone) — no automated proxy accepted"

requirements-completed: [INT-01, INT-02, INT-03, CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06]

duration: UAT session (post-plan fixes + human review)
completed: 2026-06-04
---

# Phase 5 Plan 04: UAT — Integration & Catalogue Summary

**375-colour wrap studio at /mc-site/wrap-studio confirmed live and correct by human UAT on desktop and phone — all 9 requirements and 5 success criteria approved**

## Performance

- **Duration:** Post-plan UAT session
- **Completed:** 2026-06-04
- **Tasks:** 2 (automated smoke checks + human verification checkpoint)
- **Files modified:** 2 (app.jsx, middleware.js) via post-UAT fixes

## UAT Result

**Status: APPROVED**

User reviewed the studio in browser after all post-UAT fixes were applied and typed "approved".

### Requirements Verified

| Requirement | Description | Result |
|-------------|-------------|--------|
| INT-01 | Studio loads at /mc-site/wrap-studio without login, fast on desktop | PASS |
| INT-02 | Full-screen studio, no mc-site nav, no demo car, stage shows drop prompt | PASS |
| INT-03 | Usable on phone (390px) — no horizontal scroll, panel at bottom | PASS |
| CAT-01 | window.WRAP_CATALOGUE.length === 375 | PASS |
| CAT-02 | Brand tabs (All / Avery / Hexis / STEK) filter correctly | PASS |
| CAT-03 | All 9 finish chips present; click filters correctly | PASS |
| CAT-04 | Search by colour name and product code narrows results | PASS |
| CAT-05 | Chrome / Colour-shift swatches show `~` indicator | PASS |
| CAT-06 | STEK DYNO swatches show real PNG images; Avery/Hexis show hex fallback | PASS |

### Success Criteria Verified

1. Studio loads within 3s on phone and desktop without login — CONFIRMED
2. All 375 films browsable with real code/series/finish/swatch — CONFIRMED
3. Brand and finish filters update results immediately — CONFIRMED
4. Search by name or code narrows catalogue — CONFIRMED
5. Layout usable on phone without horizontal scroll — CONFIRMED

## Post-UAT Fixes Applied Before Approval

Five fixes were committed to main after initial review and before final user approval:

| Commit | Fix |
|--------|-----|
| `148ebc8` | Middleware pass-through for /wrap-studio/ static assets (bypasses mc-site rewrite) |
| `b292b8a` | isDemo false-positive when DEMO_CAR_SRC=null — guard with null check |
| `235fb6a` | Remove Fast Preview (Studio Render only) + add upload button to empty state |
| `2845713` | Upload button cleanup, remove session label, add reset, swatch deselect toggle |
| `3b7c086` | Proper upload zone — own CSS class escapes ph-label mono/uppercase styles |

## Deviations from Plan

None — the plan's purpose was to run smoke checks and obtain human approval. Both tasks completed as specified. Post-UAT fixes are a normal part of UAT flow (issues found, fixed, re-verified before approval).

## Issues Encountered

- Middleware was rewriting /wrap-studio/ static asset requests into the mc-site layout, causing 404s on CSS/JS — fixed with explicit pass-through matcher.
- isDemo evaluated true when DEMO_CAR_SRC env var was set to the string "null" — fixed with explicit null/empty string guard.
- ph-label CSS class was applying mono/uppercase styles to the upload zone text — fixed by giving the upload zone its own CSS class.

## Next Phase Readiness

Phase 5 complete. Phase 6 (Upload & Recolour Engine) can begin:
- Studio route is live and stable at /mc-site/wrap-studio
- Catalogue is wired (window.WRAP_CATALOGUE, 375 entries)
- Upload button is in the empty state, ready to wire up background removal
- isDemo guard is correct — Phase 6 car upload will flow through the correct path

---
*Phase: 05-integration-catalogue*
*Completed: 2026-06-04*
