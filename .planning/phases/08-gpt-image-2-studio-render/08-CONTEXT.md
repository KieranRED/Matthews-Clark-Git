# Phase 08: GPT-Image-2 Studio Render — Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the fake `startRender` stub in `app.jsx` with a real `/api/wrap-render` POST route that sends the canvas composite to GPT-Image-1 (OpenAI `images.edit()`), integrates the car into the M&C studio bay background, and surfaces the result as a `renderUrl` state value — displayed in the stage with a before/after slider comparing the original photo vs studio render.

This phase does NOT include:
- Changing the CSS blend-mode recolour engine (already complete)
- Per-panel canvas segmentation (deferred per STATE.md)
- Analytics or render history

</domain>

<decisions>
## Implementation Decisions

### API & Cost Control
- Model: `gpt-image-1` via `openai` SDK's `images.edit()` — exact string, enforced in code (silent 400 if wrong)
- Input: capture stage canvas as PNG blob, POST as `multipart/form-data` to `/api/wrap-render` (not base64 JSON — avoids ~33% bloat and body-size limits)
- Rate guard (MANDATORY before public ship): per-IP daily cap stored in Upstash KV + client-side per-session render counter as first line of defence; toast distinguishes quota exceeded ("too many renders, try again shortly") vs API error ("render failed, try again")
- Config: `quality: "standard"`, `size: "1536x1024"` (landscape — matches stage aspect ratio for before/after slider alignment; square 1024×1024 would letterbox or crop cars)

### GPT Prompt Strategy
- Scene integration only — car colour and finish are already applied in the canvas composite; GPT's job is to blend the car into studio bay lighting, add floor reflections, match shadows — NOT to re-apply colour
- Studio background: static M&C studio bay image embedded as a public asset or base64 in the route
- Prompt template (finish-aware): `"Professional automotive studio photograph. The car shown has a {finish} {colour_name} wrap. Integrate into the workshop bay: match studio lighting, add floor reflection, preserve the exact wrap colour and finish character. Photorealistic."`
- No separate alpha mask — send the full canvas composite, let GPT handle integration

### UX & Result Display
- `renderUrl` is separate state alongside `carUrl`/`displayUrl` — stage shows `renderUrl` when set, falls back to `displayUrl`; overwriting `displayUrl` is a fatal flaw (can't undo or re-render)
- Before/after slider follows `renderUrl`: render present → compares original photo vs studio render; render not yet → compares original vs CSS preview — costs nothing since all three images are already in state
- Progress: fake smooth creep to ~90% (slow enough not to freeze at 90% before ~45s), jump to 100 on response; 45–60s client timeout; label "Rendering studio shot…" — no hard percentage promise
- Error handling: inline toast, render button resets to idle, `renderUrl` stays null so CSS preview is untouched. Two distinct toast messages: rate-limit/quota ("too many renders, try again shortly") vs API error ("render failed, try again")

### Claude's Discretion
- Exact Upstash KV key structure for per-IP daily cap
- How stage.jsx exposes the canvas PNG for upload (window helper or ref callback)
- OpenAI SDK import pattern (ensure compatible with Next.js App Router server component)
- Exact placement of "Studio Render" trigger button in the UI

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rendering`, `renderPct`, `startRender` — already in `app.jsx` state (currently a fake timer stub to replace)
- `flash(msg)` — toast utility in app.jsx, used for all inline notifications
- `displayUrl` — current recoloured car dataURL passed from Stage to App
- `carUrl` — background-removed car dataURL (already in state)
- `originalUrl` — original photo dataURL (already in state)
- `window.__wrapDownload` — pattern for Stage→App function registration (can use same pattern for canvas export)
- `lib/leadStore.js` + Upstash KV client — established pattern for KV operations
- `/api/wrap-quote/route.js` — reference for App Router POST route with Upstash KV + env vars

### Established Patterns
- Zero-build JSX: Babel Standalone in public/ — no bundler; CDN imports only
- App Router server routes in `app/api/` with Next.js `export async function POST()`
- Env vars accessed via `process.env.VARNAME` in routes
- No per-user auth on public wrap-studio routes
- dataURLs preferred over blob URLs (persist across reload)

### Integration Points
- `startRender` in app.jsx needs to become a real `fetch('/api/wrap-render', ...)` call
- Stage.jsx needs to expose current canvas state as a PNG blob (window helper pattern already proven)
- `renderUrl` must be added to app.jsx state and threaded into WrapStage props

</code_context>

<specifics>
## Specific Ideas

- The model name is `gpt-image-1` (not "gpt-image-2" — there is no such string in the API; using wrong name causes silent 400 at runtime)
- Use `1536x1024` not `1024x1024` — cars are landscape and square output letterboxes
- Rate guard is non-negotiable before public deployment — Upstash KV per-IP daily cap + session counter
- Slow fake progress creep: if render typically takes 15–30s, creep should reach ~90% at ~45s, not 15s

</specifics>

<deferred>
## Deferred Ideas

- Real SSE/streaming progress from GPT (over-engineering for a single synchronous edit call)
- M&C staff-side render gallery or history
- Multiple render angles (3/4 front, side, rear) — needs real bay photos at those angles
- Per-panel canvas segmentation for render (future phase)

</deferred>

---

*Phase: 08-gpt-image-2-studio-render*
*Context gathered: 2026-06-11 via smart discuss*
