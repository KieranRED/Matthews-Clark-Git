# Phase 6: Upload & Recolour Engine — Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add in-browser background removal to the upload flow using `@imgly/background-removal`. The cutout PNG becomes the mask for the existing CSS blend mode recolour engine. Store both the original photo and the cutout as dataURLs for session persistence and before/after comparison.

This phase does NOT include:
- GPT-Image-2 render (Phase 7)
- Quote submission (Phase 8)

</domain>

<decisions>
## Implementation Decisions

### Library Loading — Lazy, Not Upfront
- Do NOT add `@imgly/background-removal` to the route.js HTML shell — it downloads a ~40MB ONNX model on first run
- Lazy-load via dynamic `<script>` injection ONLY when a file is actually selected by the user
- Same rule for `heic2any` — only fetch when a `.heic` or `.heif` file is detected
- Pattern: check `window.BackgroundRemoval` before using; if absent, inject script tag and await `window.onBgRemovalReady` callback

### HEIC Support
- Detect HEIC/HEIF by file extension (`.heic`, `.heif`) before passing to FileReader
- If detected: lazy-load `heic2any` from CDN, convert to JPEG blob first, then proceed to background removal
- CDN: `https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js`

### Background Removal
- Library: `@imgly/background-removal` v1.4.5
- CDN: `https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/browser.js`
- Call `BackgroundRemoval.removeBackground(file, { progress: (p) => setRemoveProgress(p) })`
- Result is a `Blob` — convert to dataURL via FileReader for storage

### What to Store (CRITICAL)
- Store **TWO values** in state and localStorage:
  - `originalUrl` — dataURL of the raw photo before removal (for before/after slider + "My background" scene)
  - `carUrl` — dataURL of the background-removed cutout PNG (used as the mask for the recolour engine)
- Both stored as dataURLs (not blob URLs) so they survive page refresh and localStorage session restore
- The existing `carUrl` state in app.jsx continues to drive the recolour mask — no change to that contract
- Add `originalUrl` as new state alongside `carUrl`

### Progress UX
- While removal runs: hide the upload zone, show an inline progress bar in its place on the stage
- Progress bar shows percentage from the `onProgress` callback
- Label: "Removing background…" with the percentage
- On completion: the car appears masked on the stage — no extra animation needed
- On error: show inline error message with a "Try again" button

### Recolour Engine
- Keep the existing CSS blend mode engine in `stage.jsx` — `fxFor()` already handles all 9 finishes correctly
- The background-removed PNG as the mask makes the blend modes work accurately (they only affect the car silhouette)
- Metallic finish: add a subtle SVG `feTurbulence` noise filter overlay on the metallic tint layer to simulate flake depth
- No changes to `panelColors` / `activePanel` per-panel logic — already wired correctly

### Session State Changes
- `localStorage` key `mc-wrap-studio-v1` gets two new fields: `originalUrl` and `carUrl`
- Reset session button (added in Phase 5) already clears all state — just ensure `originalUrl` is cleared too
- `app.jsx` `load()` and persist `useEffect` both need `originalUrl` added

### Before/After Slider
- Already wired in prototype — the `baActive` / `baPos` / `clip` logic is complete
- The `car-base` img uses `carUrl` (cutout). For the "original" side of the slider, render the `originalUrl` as an additional img layer that gets hidden by the clip path
- No new state needed beyond `originalUrl`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `public/wrap-studio/stage.jsx` — `ingest()`, drag/drop, file input, `fxFor()`, `fxLayers`, `maskStyle` all exist and work
- `public/wrap-studio/app.jsx` — `carUrl` state, `setCarUrl`, localStorage persist/load all exist
- `public/wrap-studio/studio.css` — `.car-base`, `.car-fx`, `.car-ph`, `.render-veil` all have patterns to follow

### Established Patterns
- Libraries loaded via CDN `<script>` in route.js HTML shell (React, Babel, catalogue.js)
- State persisted to `localStorage` key `mc-wrap-studio-v1` as JSON
- Blend mode recolour: `fxFor(swatch)` returns `{ tint, sheen, tone, anim }` objects
- CSS mask via `WebkitMaskImage: url(${carUrl})`

### Integration Points
- `stage.jsx` `ingest()` function: replace FileReader dataURL with bg-removal pipeline
- `app.jsx` state: add `originalUrl` alongside `carUrl`
- `route.js`: no CDN scripts added upfront — lazy loading only
- `studio.css`: add removal progress bar styles

</code_context>

<specifics>
## Specific Ideas

- Lazy-load pattern for libraries: inject `<script>` tag, listen for load event, resolve a Promise
- Store as dataURLs (not blob URLs) — blob URLs are ephemeral, die on refresh
- `originalUrl` needed for: before/after original side, "My background" scene toggle
- heic2any only loads when extension is `.heic` / `.heif`

</specifics>

<deferred>
## Deferred Ideas

- Server-side background removal (explicitly out of scope)
- Canvas HSL pixel-level colour transform (deferred — blend modes are accurate enough for Phase 6; revisit if GPT render quality requires it)
- Background removal quality settings / model size toggle

</deferred>
