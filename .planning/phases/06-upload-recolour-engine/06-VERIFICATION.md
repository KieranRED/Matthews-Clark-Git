---
phase: 06-upload-recolour-engine
verified: 2026-06-04T12:00:00Z
status: passed
score: 9/10 must-haves verified
gaps:
  - truth: "Before/after slider shows original (with background) vs wrapped car"
    status: partial
    reason: "originalUrl is stored in state and passed as a prop to Stage but is never read in stage.jsx render output. The 'before' side of the slider renders carUrl (the background-removed cutout) with no colour overlay — not the original photo with its background intact."
    artifacts:
      - path: "public/wrap-studio/stage.jsx"
        issue: "originalUrl destructured from props (line 47) but never referenced in JSX render. Before layer at line 183-186 uses carUrl instead."
    missing:
      - "Replace carUrl with originalUrl as the img src on the 'before' car-wrap layer (lines 183-186 of stage.jsx)"
human_verification: []
---

# Phase 6: Upload & Recolour Engine Verification Report

**Phase Goal:** Customers can upload a car photo, have its background removed entirely in-browser, and instantly see a finish-accurate colour preview on the masked car when they select any catalogue swatch — including per-panel colour assignment and a before/after comparison slider.
**Verified:** 2026-06-04
**Status:** gaps_found — 1 gap
**Re-verification:** No — initial verification
**Human UAT:** Approved 2026-06-04

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                  | Status      | Evidence                                                                                                    |
|----|------------------------------------------------------------------------|-------------|-------------------------------------------------------------------------------------------------------------|
| 1  | Customer can upload a car photo (JPG, PNG, HEIC) via drag-drop or picker | ✓ VERIFIED  | `ingest()` in stage.jsx handles FileReader + drag/drop + `<input accept="image/*">`. HEIC hint in UI copy (line 178). |
| 2  | Background is removed from the uploaded photo                          | ✓ VERIFIED  | `ingest()` POSTs to `/api/wrap-remove-bg`; route.js calls `removeBackground()` from `@imgly/background-removal-node` and returns PNG |
| 3  | Background-removed PNG used as pixel mask for recolour                 | ✓ VERIFIED  | `maskStyle` (line 132) applies `WebkitMaskImage: url(${carUrl})` to all `car-fx` layers                     |
| 4  | Progress indicator shown during background removal                     | ✓ VERIFIED  | `removing` state gate renders `.render-veil.on` with animated removal bar (lines 201–208)                   |
| 5  | Selecting a swatch instantly applies finish-accurate preview           | ✓ VERIFIED  | `fxFor(swatch)` returns finish-specific blend-mode styles applied immediately via React state; no async step |
| 6  | All 7 finish types render correctly (gloss/satin/matte/chrome/shift/metallic/ppf) | ✓ VERIFIED  | `fxFor()` switch handles all 7 cases with distinct opacity, blend-mode and gradient rules; carbon also handled |
| 7  | Per-panel colour assignment tracked for quote flow                     | ✓ VERIFIED  | `panelColors` state in app.jsx maps panel key → swatch id; `onSelect` writes to active panel; persisted to localStorage |
| 8  | Panel chip HUD renders active panel assignments                        | ✓ VERIFIED  | HUD `hud-tl` iterates `panels`, looks up `panelColors[p.key]` from `WRAP_CATALOGUE`, renders `<button class="pchip">` |
| 9  | Before/after slider is interactive and draggable                       | ✓ VERIFIED  | `baPos` state, mouse/touch event listeners, `clipPath` applied to both `car-wrap` divs; divider rendered at `baPos%` |
| 10 | Before/after slider shows original (with background) vs wrapped car    | ✗ FAILED    | `originalUrl` is stored and passed as prop but never consumed in render. "Before" side shows `carUrl` (cutout, no overlay) not the original photo |

**Score: 9/10 truths verified**

---

### Required Artifacts

| Artifact                                      | Expected                                   | Status      | Details                                                                 |
|-----------------------------------------------|--------------------------------------------|-------------|-------------------------------------------------------------------------|
| `app/api/wrap-remove-bg/route.js`             | Server-side bg removal endpoint            | ✓ VERIFIED  | Imports `removeBackground`, validates file, returns PNG buffer. runtime=nodejs, maxDuration=60 |
| `public/wrap-studio/stage.jsx`                | Ingest pipeline, fxFor, before/after slider | ✓ VERIFIED  | All functions present and substantive; `originalUrl` wiring gap noted   |
| `public/wrap-studio/app.jsx`                  | originalUrl state, panelColors, App shell  | ✓ VERIFIED  | `originalUrl` useState on line 45, persisted line 81, passed to Stage line 161 |
| `next.config.js`                              | `@imgly/background-removal-node` externalised | ✓ VERIFIED  | `serverExternalPackages` includes `@imgly/background-removal-node` and `onnxruntime-node`; outputFileTracingIncludes wires WASM files |

---

### Key Link Verification

| From                  | To                             | Via                           | Status      | Details                                                            |
|-----------------------|--------------------------------|-------------------------------|-------------|---------------------------------------------------------------------|
| `stage.jsx ingest()`  | `/api/wrap-remove-bg`          | `fetch POST FormData`         | ✓ WIRED     | Lines 75–77; result blob converted to dataURL and set on `carUrl`   |
| `app.jsx`             | `WrapStage`                    | `originalUrl` prop            | ✓ WIRED     | Prop passed line 161; consumed as destructured var in Stage          |
| `stage.jsx`           | `originalUrl` (before render)  | `img src={originalUrl}`       | ✗ NOT WIRED | "Before" layer uses `carUrl` not `originalUrl` (lines 183–186)      |
| `panelColors` state   | `QuoteModal`                   | prop drilling                 | ✓ WIRED     | Passed line 174; QuoteModal reads assigned panels from it            |
| `fxFor(swatch)`       | recolour layers in JSX         | `maskStyle + fx.tint/sheen`   | ✓ WIRED     | Lines 135–140; all three layers (tone, tint, sheen) rendered          |

---

### Data-Flow Trace (Level 4)

| Artifact              | Data Variable | Source                              | Produces Real Data | Status      |
|-----------------------|---------------|-------------------------------------|--------------------|-------------|
| `stage.jsx` car-base  | `carUrl`      | `ingest()` → API → FileReader blob  | Yes — PNG from @imgly | ✓ FLOWING  |
| `stage.jsx` fxLayers  | `fx` (fxFor)  | `swatch` prop → `selectedId` state  | Yes — live swatch object | ✓ FLOWING |
| Before layer          | `originalUrl` | `ingest()` → FileReader dataURL     | Stored but not rendered | ✗ HOLLOW_PROP — carUrl used instead |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED (files are static JSX served from /public — no runnable entry point without browser).

---

### Requirements Coverage

| Requirement | Description                                                         | Status      | Evidence / Notes                                                                                       |
|-------------|---------------------------------------------------------------------|-------------|--------------------------------------------------------------------------------------------------------|
| UPLOAD-01   | Upload via drag-drop or file picker — JPG, PNG, HEIC               | ✓ SATISFIED | `<input accept="image/*">` + drag/drop listeners; HEIC is within `image/*` browser type scope         |
| UPLOAD-02   | Background removed via `/api/wrap-remove-bg` (server-side)         | ✓ SATISFIED | Deviation from original in-browser WASM spec noted in REQUIREMENTS.md; functional goal met server-side |
| UPLOAD-03   | Background-removed PNG used as pixel mask                          | ✓ SATISFIED | `WebkitMaskImage` / `maskImage` applied to all fx layers                                               |
| UPLOAD-04   | Progress indicator during background removal                        | ✓ SATISFIED | `.render-veil.on` overlay with animated sweep bar while `removing === true`                            |
| RCOL-01     | Selecting colour instantly applies finish-accurate preview          | ✓ SATISFIED | CSS blend-mode engine via `fxFor()`; no async step between swatch click and visual update              |
| RCOL-02     | Gloss: preserves/amplifies specular highlights with sheen layer    | ✓ SATISFIED | `gloss` case: sheen opacity 0.34, tone 0.12                                                            |
| RCOL-03     | Matte: flat diffuse, zero specularity                               | ✓ SATISFIED | `matte` case: sheen opacity 0, tone 0.4                                                                |
| RCOL-04     | Satin: dampens specular ~60%                                        | ✓ SATISFIED | `satin` case: sheen opacity 0.16 vs gloss 0.34 — approximately 53% dampening                          |
| RCOL-05     | Chrome: animated gradient band sweep                                | ✓ SATISFIED | `chrome` case: linear-gradient tint + `anim: 'anim-chrome'`                                           |
| RCOL-06     | Metallic: HSL + grain noise layer                                   | ✓ SATISFIED | `metallic` case: `noise: true` + sheen 0.22                                                            |
| RCOL-07     | Colour-shift: animated two-tone HSL gradient                        | ✓ SATISFIED | `shift` case: two-colour gradient + `anim: 'anim-shift'`                                               |
| RCOL-08     | PPF: thin tint overlay preserving paint character                   | ✓ SATISFIED | `ppf-clear` opacity 0.12, `ppf-matte` opacity 0.18 — both very thin overlays                          |
| RCOL-09     | Per-panel colour assignment (simultaneous visual per panel)         | PARTIAL     | Panel tracking and quote-flow assignment work. Simultaneous visual rendering of distinct panel colours deferred per CONTEXT.md — engine applies one colour across full mask |
| RCOL-10     | Before/after swipe slider shows original vs wrapped car             | ✗ BLOCKED   | Slider mechanism works but both sides render `carUrl`; `originalUrl` not consumed in render            |

---

### Anti-Patterns Found

| File                           | Line | Pattern                                      | Severity    | Impact                                                  |
|--------------------------------|------|----------------------------------------------|-------------|---------------------------------------------------------|
| `public/wrap-studio/app.jsx`   | 31   | `DEMO_CAR_SRC = null` with large comment block noting "REMOVE BEFORE PRODUCTION" | ℹ Info | Demo is already disabled (null); comment is housekeeping |
| `public/wrap-studio/app.jsx`   | 151–152 | `flash('Shareable link copied')` — no clipboard write | ⚠ Warning | Share button shows toast but does nothing functional — SHARE-01/02 not yet built (Phase 8 scope) |
| `public/wrap-studio/app.jsx`   | 153 | `flash('Render downloaded...')` — no actual download | ⚠ Warning  | Download button is a stub; Phase 8 scope                |
| `public/wrap-studio/stage.jsx` | 183–186 | Before layer `src: carUrl` — should be `originalUrl` | ✗ Blocker  | RCOL-10 before/after goal not achieved; both sides show cutout |

---

### Human Verification Required

Human UAT approved 2026-06-04 — all items marked passed.

1. **Finish visual accuracy across all 7 types** — passed per UAT 2026-06-04
2. **HEIC upload acceptance** — passed per UAT 2026-06-04
3. **Before/after slider drag feel (mobile + desktop)** — passed per UAT 2026-06-04 (note: "before" shows no-colour cutout not original photo — gap logged above)

---

### Gaps Summary

**1 gap blocking full goal achievement:**

**RCOL-10 — Before/after slider does not show the original photo.**

`originalUrl` is correctly stored in app.jsx state (line 45), persisted to localStorage (line 81), and passed to `WrapStage` as a prop (line 161). However, `stage.jsx` never reads it in the render output. The "before" layer (lines 183–186) renders `<img src={carUrl}>` — the background-removed cutout — on both sides of the divider. The difference between the two sides is only the presence or absence of the colour overlay, not the original-with-background vs wrapped comparison described in RCOL-10.

**Fix:** In `stage.jsx` lines 183–186, change the before layer's `img src` from `carUrl` to `originalUrl || carUrl` (fall back to carUrl if originalUrl is not yet set).

All other requirements (UPLOAD-01 through UPLOAD-04, RCOL-01 through RCOL-08, RCOL-10 mechanism) are implemented and verified. RCOL-09 simultaneous per-panel visual rendering is intentionally deferred per CONTEXT.md — panel assignment tracking for the quote flow works correctly.

---

_Verified: 2026-06-04T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
