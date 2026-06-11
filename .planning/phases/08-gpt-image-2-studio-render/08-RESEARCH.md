# Phase 08: GPT-Image-2 Studio Render — Research

**Researched:** 2026-06-11
**Domain:** OpenAI images.edit() API, Next.js App Router server routes, Upstash KV rate-limiting, zero-build JSX canvas export
**Confidence:** HIGH — all critical findings based on direct source inspection + verified OpenAI docs

---

## Summary

This phase replaces the fake `startRender` timer stub in `app.jsx` with a real API call. The work splits cleanly into three layers: (1) a new `/api/wrap-render` App Router POST route that calls OpenAI `images.edit()`, (2) a `window.__wrapRenderCanvas` helper registered in `stage.jsx` that exposes the current canvas composite as a PNG Blob, and (3) `renderUrl` state wired through `app.jsx` → `WrapStage` props to display the result in the before/after slider.

The biggest infrastructure gap: **the `openai` npm package is not installed**. `package.json` has no `openai` dependency. It must be added before any route code can import `OpenAI`. No `OPENAI_API_KEY` env var exists in `.env.example` either — it needs to be defined and seeded in `.env.local` and `.env.production.local`. There is also no studio bay background image in `public/` — one must be added or the route must embed it as a static asset before the phase can produce real renders.

The rate-limiting approach is well-suited to the existing `lib/kv.js` helper. `kvFetch` is exported directly, and the Upstash REST API supports `SET key value EX seconds` natively via path `/set/{key}/{value}/EX/{seconds}` — this avoids needing a new helper export. `kvIncr` already exists for the counter.

**Primary recommendation:** Install `openai@^4`, add `OPENAI_API_KEY` env var, add a studio bay background PNG to `public/wrap-studio/`, then build the route + canvas helper + state wiring in that order.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Model: `gpt-image-1` via `openai` SDK's `images.edit()` — exact string, enforced in code (silent 400 if wrong)
- Input: capture stage canvas as PNG blob, POST as `multipart/form-data` to `/api/wrap-render` (not base64 JSON — avoids ~33% bloat and body-size limits)
- Rate guard (MANDATORY before public ship): per-IP daily cap stored in Upstash KV + client-side per-session render counter as first line of defence; toast distinguishes quota exceeded ("too many renders, try again shortly") vs API error ("render failed, try again")
- Config: `quality: "standard"`, `size: "1536x1024"` (landscape)
- `renderUrl` is separate state alongside `carUrl`/`displayUrl` — stage shows `renderUrl` when set, falls back to `displayUrl`; overwriting `displayUrl` is a fatal flaw
- Before/after slider follows `renderUrl`: render present → compares original photo vs studio render; render not yet → compares original vs CSS preview
- Progress: fake smooth creep to ~90% over ~45s, jump to 100 on response; 45–60s client timeout; label "Rendering studio shot…"
- Two distinct toast messages: rate-limit/quota ("Too many renders — try again shortly") vs API error ("Render failed — try again")

### Claude's Discretion
- Exact Upstash KV key structure for per-IP daily cap
- How stage.jsx exposes the canvas PNG for upload (window helper or ref callback)
- OpenAI SDK import pattern (ensure compatible with Next.js App Router server component)
- Exact placement of "Studio Render" trigger button in the UI

### Deferred Ideas (OUT OF SCOPE)
- Real SSE/streaming progress from GPT (over-engineering for a single synchronous edit call)
- M&C staff-side render gallery or history
- Multiple render angles (3/4 front, side, rear) — needs real bay photos at those angles
- Per-panel canvas segmentation for render (future phase)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RENDER-01 | Customer can trigger a "Studio Render" which calls `/api/wrap-render` | `startRender` stub already exists in `app.jsx` (lines 137–148); replace timer with real `fetch('/api/wrap-render', ...)` call |
| RENDER-02 | Render endpoint sends the pre-coloured canvas composite to GPT-Image-1 (images.edit()) | `window.__wrapRenderCanvas` pattern (new, mirrors `__wrapDownload`); route receives PNG blob via multipart/form-data |
| RENDER-03 | GPT prompt is finish-aware — specifies gloss/matte/chrome/etc. | `sel.finish` + `sel.name` available in `app.jsx`; pass as POST body fields alongside the image blob |
| RENDER-04 | Render composites the car into the M&C studio bay background | Studio bay background PNG must be added to `public/wrap-studio/`; route reads it with `fs.readFileSync` and passes to `images.edit()` as the base image (or prompt describes the scene) |
| RENDER-05 | Customer sees a progress indicator during render (~10–20s) | `rendering`, `renderPct`, and render-veil DOM already exist in `stage.jsx`; replace copy per UI-SPEC |
| RENDER-06 | Rendered result replaces fast preview; before/after slider compares original vs studio render | `renderUrl` state (new) threaded from `app.jsx` → `WrapStage`; BA slider logic already in `stage.jsx` (lines 455–462) |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `openai` | `^4.x` (latest: 4.82.0 — verify with `npm view openai version`) | OpenAI Node SDK for `images.edit()` | Official client; handles multipart form data, streaming, retries |

> **CRITICAL:** `openai` is NOT in `package.json`. Must `npm install openai` before any route code compiles.

### Already in Project — No New Installs

| Library | Version | Purpose |
|---------|---------|---------|
| `lib/kv.js` + Upstash KV | project | Per-IP rate-limit counter with daily TTL |
| `zod` | `^3.23.8` | Route input validation |
| `node:crypto` | Node built-in | UUID for rate-limit key namespacing |
| Browser Canvas API | built-in | PNG blob export from `window.__wrapRenderCanvas` |

### Installation

```bash
npm install openai
```

Add to `.env.local` and `.env.production.local`:
```
OPENAI_API_KEY=sk-...
```

Add to `.env.example`:
```
# OpenAI (used by /api/wrap-render for GPT-Image-1 studio renders)
OPENAI_API_KEY=
```

**Verify openai version before writing the route:**
```bash
npm view openai version
```

---

## Architecture Patterns

### Recommended File Structure

```
app/
  api/
    wrap-render/
      route.js          ← NEW: receives PNG blob, calls images.edit(), returns base64 dataURL
public/
  wrap-studio/
    studio-bay.jpg      ← NEW: M&C studio bay background for compositing (must be added)
    app.jsx             ← MODIFY: renderUrl state, startRender → real fetch, thread renderUrl to WrapStage
    stage.jsx           ← MODIFY: window.__wrapRenderCanvas helper, renderUrl prop, BA slider + tags
```

### Pattern 1: `window.__wrapRenderCanvas` — canvas export helper

**What:** Mirrors the existing `window.__wrapDownload` pattern in `stage.jsx` (lines 376–404). Registered via `useEffect` on `[displayUrl]`. Returns a `Promise<Blob|null>` — PNG blob of the current composite.

**Exact location in `stage.jsx`:** Add alongside the `__wrapDownload` `useEffect` block, same dependency array `[displayUrl]`.

```javascript
// stage.jsx — add after the __wrapDownload useEffect
useEffect(() => {
  window.__wrapRenderCanvas = async () => {
    if (!displayUrl) return null;
    const img = new Image();
    img.src = displayUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth || 1200;
    cv.height = img.naturalHeight || 800;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  };
  return () => { delete window.__wrapRenderCanvas; };
}, [displayUrl]);
```

**Contract (from UI-SPEC):** Returns `Promise<Blob>` — PNG blob. Returns `null` (not rejected) on error. Caller checks for null before fetch.

### Pattern 2: `startRender` — real fetch in `app.jsx`

**Current stub (lines 137–148):** Fake progress timer that auto-completes. Replace entirely.

**New implementation:**

```javascript
// app.jsx — replace the startRender useCallback
const startRender = useCallback(async () => {
  if (!carUrl) { flash('Upload your car photo first'); return; }
  if (typeof window.__wrapRenderCanvas !== 'function') { flash('Render not ready yet'); return; }

  setRendering(true);
  setRenderPct(0);

  // Slow fake creep: reach ~90% over 45s
  const CREEP_DURATION = 45000;
  const t0 = performance.now();
  let animFrame;
  const tick = (now) => {
    const p = Math.min(90, ((now - t0) / CREEP_DURATION) * 90);
    setRenderPct(p);
    if (p < 90) animFrame = requestAnimationFrame(tick);
  };
  animFrame = requestAnimationFrame(tick);

  try {
    const blob = await window.__wrapRenderCanvas();
    if (!blob) throw new Error('canvas-null');

    const fd = new FormData();
    fd.append('image', blob, 'composite.png');
    fd.append('finish', sel?.finish || 'gloss');
    fd.append('colourName', sel?.name || 'wrap');

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 55000); // 55s client timeout

    const resp = await fetch('/api/wrap-render', {
      method: 'POST',
      body: fd,
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    cancelAnimationFrame(animFrame);
    setRenderPct(100);

    if (resp.status === 429) {
      flash('Too many renders — try again shortly');
      setRendering(false); setRenderPct(0);
      return;
    }
    if (!resp.ok) throw new Error(`api-${resp.status}`);

    const { renderUrl: url } = await resp.json();
    setRenderUrl(url);
    setTimeout(() => { setRendering(false); flash('Studio render ready'); }, 300);
  } catch (err) {
    cancelAnimationFrame(animFrame);
    setRendering(false); setRenderPct(0);
    if (err.name === 'AbortError') { flash('Render timed out — try again'); }
    else { flash('Render failed — try again'); }
  }
}, [carUrl, sel, flash]);
```

**State additions in `app.jsx`:**
- `const [renderUrl, setRenderUrl] = useState(null);` — alongside `rendering`/`renderPct`
- Pass `renderUrl` to `WrapStage` props

**Reset `renderUrl` on new car upload:** When `setCarUrl` is called (new upload), also call `setRenderUrl(null)`.

### Pattern 3: `/api/wrap-render` route

**File:** `app/api/wrap-render/route.js`

```javascript
import { OpenAI, toFile } from 'openai';
import { hasKv, kvFetch, kvIncr, kvGet } from '@/lib/kv';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DAILY_CAP = 10; // per IP

export async function POST(request) {
  // 1. Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const today = new Date().toISOString().slice(0, 10); // "2026-06-11"
  const rateKey = `wrap-render-count:${ip}:${today}`;

  if (hasKv()) {
    let count;
    try {
      count = Number(await kvGet(rateKey)) || 0;
    } catch { count = 0; }

    if (count >= DAILY_CAP) {
      return Response.json({ ok: false, error: 'rate_limit' }, { status: 429 });
    }

    // Increment + set 25-hour TTL (via direct kvFetch — kvSet has no TTL param)
    try {
      await kvIncr(rateKey);
      // Set expiry only on first render of the day (count === 0)
      if (count === 0) {
        await kvFetch(`/expire/${encodeURIComponent(rateKey)}/90000`, { method: 'POST' });
      }
    } catch { /* non-fatal — don't block render */ }
  }

  // 2. Parse multipart body
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const imageFile = formData.get('image');
  const finish = String(formData.get('finish') || 'gloss');
  const colourName = String(formData.get('colourName') || 'wrap');

  if (!imageFile || typeof imageFile === 'string') {
    return Response.json({ ok: false, error: 'no_image' }, { status: 400 });
  }

  // 3. Call OpenAI images.edit()
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const image = await toFile(buffer, 'composite.png', { type: 'image/png' });

  const prompt =
    `Professional automotive studio photograph. The car shown has a ${finish} ${colourName} wrap. ` +
    `Integrate into the M&C workshop bay: match studio lighting, add floor reflection, ` +
    `preserve the exact wrap colour and finish character. Photorealistic.`;

  let result;
  try {
    result = await client.images.edit({
      model: 'gpt-image-1',
      image,
      prompt,
      size: '1536x1024',
      quality: 'standard',
      n: 1,
    });
  } catch (err) {
    console.error('[wrap-render][openai-error]', err);
    return Response.json({ ok: false, error: 'api_error' }, { status: 500 });
  }

  // 4. Return as data URL
  const b64 = result.data[0].b64_json;
  const renderUrl = `data:image/png;base64,${b64}`;

  return Response.json({ ok: true, renderUrl });
}
```

**Key decisions baked in:**
- `toFile(buffer, 'composite.png', { type: 'image/png' })` — correct way to pass image from Buffer in App Router (no `fs.createReadStream` available for in-memory data)
- `b64_json` response — avoids temporary URL expiry; consistent with `dataURL` pattern used throughout the project
- `runtime = 'nodejs'` — required (same as `wrap-remove-bg`) because the OpenAI SDK uses Node.js streams
- `maxDuration = 60` — GPT-Image-1 can take 30–50s; 60s gives headroom

### Pattern 4: `renderUrl` in BA slider (stage.jsx)

**Current BA tag render (lines 455–462):**
```javascript
baActive && colored ? h(React.Fragment, null,
  h('div', { className: 'ba-tag after' }, 'Wrapped'),
  h('div', { className: 'ba-tag before' }, 'No wrap'),
  ...
```

**Updated version — renderUrl-aware:**
```javascript
baActive && (colored || renderUrl) ? h(React.Fragment, null,
  h('div', { className: 'ba-tag after' }, renderUrl ? 'Studio Render' : 'Wrapped'),
  h('div', { className: 'ba-tag before' }, renderUrl ? 'Original' : 'No wrap'),
  ...
```

**BEFORE side image source (line 448):** Already uses `carUrl` — correct regardless of renderUrl.

**WRAPPED/AFTER side (line 430):** Currently uses `displayUrl` from `const displayUrl = recolouredUrl || carUrl`. With `renderUrl`, change to:
```javascript
const displayUrl = renderUrl || recolouredUrl || carUrl;
```

This threads the render result through the existing display path with zero prop drilling — `renderUrl` becomes the highest-priority display source.

### Pattern 5: Rate-limit TTL via kvFetch

`lib/kv.js` exports `kvFetch` directly. The Upstash REST API supports `EXPIRE key seconds` via path `/expire/{key}/{seconds}`. Use this directly in the route:

```javascript
import { kvFetch } from '@/lib/kv';
// Set 25-hour TTL (90000 seconds) on first hit:
await kvFetch(`/expire/${encodeURIComponent(rateKey)}/90000`, { method: 'POST' });
```

This is cleaner than adding a new `kvExpire` export to `lib/kv.js`, but either approach works. The planner may choose to add a `kvExpire` helper export instead.

### Anti-Patterns to Avoid

- **Using `images.generate()` instead of `images.edit()`** — generate creates from scratch; edit preserves car geometry
- **Using `"gpt-image-2"` or `"dall-e-3"` as model string** — neither string is valid; both cause silent 400
- **Setting `renderUrl` = `displayUrl`** — fatal; destroys the ability to re-render or revert to CSS preview
- **Passing base64 JSON body instead of multipart** — ~33% larger request; risks hitting Next.js body-size limits (~4MB default)
- **Using `response_format: 'url'`** — temporary URLs expire after ~1h; inconsistent with the project's dataURL persistence pattern
- **Forgetting `runtime = 'nodejs'`** — OpenAI SDK incompatible with Edge runtime; `wrap-remove-bg` uses the same guard

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart image upload to OpenAI | Custom FormData construction | `openai` SDK `toFile()` + `images.edit()` | SDK handles multipart encoding, auth, retries |
| Rate limit counter + TTL | Custom KV counter logic | `kvIncr` + `kvFetch('/expire/...')` | Upstash REST supports INCR and EXPIRE natively |
| Progress animation | Real SSE/streaming | Fake `requestAnimationFrame` creep | GPT-Image-1 edit is a single synchronous HTTP call; SSE is not available |
| Canvas PNG export | Server-side image processing | Browser Canvas `toBlob()` via `window.__wrapRenderCanvas` | `displayUrl` is already a local dataURL; zero server round-trip |

---

## Common Pitfalls

### Pitfall 1: Wrong Model String
**What goes wrong:** `images.edit()` throws `400 Bad Request` silently if given an unrecognised model string.
**Why it happens:** `"gpt-image-2"` does not exist. `"dall-e-3"` doesn't support `images.edit()`.
**How to avoid:** Hardcode `model: 'gpt-image-1'` — add an inline comment: `// exact string required — gpt-image-2 does not exist`.

### Pitfall 2: `openai` package not installed
**What goes wrong:** `Module not found: 'openai'` at build time — the package is not in `package.json`.
**How to avoid:** Wave 0 task must `npm install openai` before any route code is written.

### Pitfall 3: `OPENAI_API_KEY` not defined
**What goes wrong:** `new OpenAI()` with no `apiKey` throws; or key is undefined at runtime.
**Why it happens:** Neither `.env.example` nor any existing env file defines `OPENAI_API_KEY`.
**How to avoid:** Wave 0 task adds env var to `.env.example`, `.env.local`, and confirms Vercel env is set.

### Pitfall 4: No studio bay background asset
**What goes wrong:** The `images.edit()` prompt alone may not composite correctly without a real background; or the route references an asset path that doesn't exist.
**Why it happens:** There is no `public/wrap-studio/studio-bay.*` file in the repo. CONTEXT.md says "Static M&C studio bay image embedded as a public asset or base64 in the route."
**How to avoid:** Add a suitable 1536×1024 JPG/PNG studio bay background to `public/wrap-studio/studio-bay.jpg` before testing. For an initial MVP, the prompt alone (without a background image reference) may be sufficient — document this as a known limitation.
**Decision for planner:** Either (a) generate/source a placeholder studio bay image in Wave 0, or (b) ship the route without passing a background image — relying on the prompt to guide scene integration. Both are valid; (a) gives better results.

### Pitfall 5: `runtime = 'nodejs'` omitted
**What goes wrong:** Route attempts to run in Edge runtime; OpenAI SDK uses Node.js-specific APIs; deploy fails or throws at runtime.
**How to avoid:** Top of route file must have `export const runtime = 'nodejs';` — same as `wrap-remove-bg/route.js`.

### Pitfall 6: `maxDuration` not set
**What goes wrong:** Vercel's default function timeout is 10s; GPT-Image-1 renders take 15–50s; requests time out before response.
**How to avoid:** `export const maxDuration = 60;` at top of route. Free Vercel tier limits to 60s; Pro allows up to 300s.

### Pitfall 7: Canvas taint on `displayUrl`
**What goes wrong:** `canvas.toBlob()` throws `SecurityError: Tainted canvases may not be exported` if the canvas drew cross-origin images.
**Why it happens:** `displayUrl` is `recolouredUrl || carUrl` — both are local dataURLs computed entirely in-browser. This should NOT taint. However, if demo mode is active and the demo image is a cross-origin URL, it would taint.
**How to avoid:** `__wrapRenderCanvas` draws only from `displayUrl` (a dataURL). No cross-origin source. Safe as long as `DEMO_CAR_SRC = null` in production.

### Pitfall 8: `renderUrl` overwriting `displayUrl`
**What goes wrong:** Setting `displayUrl = renderUrl` prevents re-rendering, breaks the CSS preview, and removes the "Original vs Render" BA comparison.
**How to avoid:** `renderUrl` is strictly additive state. The display priority is: `renderUrl || recolouredUrl || carUrl`. Never call `setDisplayUrl` or write over `carUrl`/`recolouredUrl`.

### Pitfall 9: Rate-limit key has no TTL — counter never resets
**What goes wrong:** If `kvExpire`/TTL is not set, the per-IP counter persists indefinitely. After hitting 10 renders once, the customer is permanently blocked.
**How to avoid:** On first increment (`count === 0`), call `kvFetch('/expire/{key}/90000')` immediately after `kvIncr`. The 90000s (25h) TTL ensures the counter resets daily. Do NOT rely on `kvSet` alone — `kvSet` in `lib/kv.js` has no TTL parameter.

### Pitfall 10: Fake progress creep reaches 100% before API responds
**What goes wrong:** If `CREEP_DURATION` is too short (e.g., 14s from `t.renderSeconds`), the bar hits 100% while the API is still processing, then hangs there — breaking the UX contract.
**How to avoid:** Cap the creep at 90% (not 100%). Creep duration should be ~45s to keep the bar moving for a typical 15–30s render. Jump to 100% only on successful response. The existing `t.renderSeconds` tweak default of 14 is too fast — the new code should not use it.

---

## Code Examples

### OpenAI SDK import for App Router (server route)

```javascript
// Source: OpenAI Node SDK docs (2025)
import { OpenAI, toFile } from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### Passing a Buffer to images.edit()

```javascript
// Source: OpenAI cookbook (2025) — toFile() is the correct pattern for in-memory buffers
const arrayBuffer = await imageFile.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
const image = await toFile(buffer, 'composite.png', { type: 'image/png' });

const result = await client.images.edit({
  model: 'gpt-image-1',       // exact string — gpt-image-2 does not exist
  image,
  prompt: '...',
  size: '1536x1024',          // landscape — matches stage aspect ratio
  quality: 'standard',
  n: 1,
});

const b64 = result.data[0].b64_json;
const renderUrl = `data:image/png;base64,${b64}`;
```

### Rate-limit check with TTL (using existing kvFetch)

```javascript
// Source: lib/kv.js kvFetch + Upstash REST API
import { hasKv, kvFetch, kvIncr, kvGet } from '@/lib/kv';

const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
const today = new Date().toISOString().slice(0, 10);
const rateKey = `wrap-render-count:${ip}:${today}`;

if (hasKv()) {
  const count = Number(await kvGet(rateKey)) || 0;
  if (count >= DAILY_CAP) {
    return Response.json({ ok: false, error: 'rate_limit' }, { status: 429 });
  }
  await kvIncr(rateKey);
  if (count === 0) {
    // Set 25-hour TTL so counter resets daily
    await kvFetch(`/expire/${encodeURIComponent(rateKey)}/90000`, { method: 'POST' });
  }
}
```

### `renderUrl` state in app.jsx BA slider prop

```javascript
// app.jsx — WrapStage props (add renderUrl)
h(window.WrapStage, {
  swatch: sel, carUrl, setCarUrl, originalUrl, setOriginalUrl, bg, setBg, light, setLight, mode, setMode,
  rendering, renderPct, startRender, baActive, setBaActive,
  panels: PANELS, panelColors, activePanel, setActivePanel,
  showLabels: t.panelMode, finishLabel, brandShort, demo: isDemo,
  renderUrl,                           // NEW
})
```

### displayUrl priority in stage.jsx

```javascript
// stage.jsx — replace the existing displayUrl line
const displayUrl = props.renderUrl || recolouredUrl || carUrl;
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `images.generate()` (dalle-3) | `images.edit()` (gpt-image-1) | Edit preserves car geometry; generate creates from scratch |
| `response_format: 'url'` | `b64_json` | Avoids URL expiry; compatible with localStorage dataURL pattern |
| `createReadStream()` for image | `toFile(Buffer, ...)` | Works in Next.js App Router handlers that don't use `fs` streams |

---

## Open Questions

1. **Studio bay background: generate placeholder vs ship without**
   - What we know: No `public/wrap-studio/studio-bay.*` exists. CONTEXT.md says "static M&C studio bay image embedded as a public asset". The route can work without passing an explicit background image — relying on the prompt to describe the scene.
   - What's unclear: Whether prompt-only integration produces acceptable quality without a real background reference.
   - Recommendation: Wave 0 should include sourcing or generating a placeholder 1536×1024 studio bay JPG. If unavailable at plan time, flag as a human-verify checkpoint and proceed with prompt-only for the first smoke test.

2. **`kvFetch` for EXPIRE — expose as helper or call directly**
   - What we know: `lib/kv.js` exports `kvFetch` directly. Calling `kvFetch('/expire/key/seconds')` from the route is functional but uses a "private" internal.
   - Recommendation: Add a `kvExpire(key, seconds)` export to `lib/kv.js` for cleanliness — one-liner, consistent with the pattern. Planner's call.

3. **Client-side session render counter (first line of defence)**
   - What we know: CONTEXT.md mandates a client-side per-session counter alongside the KV guard. This is not in `app.jsx` yet.
   - Recommendation: A simple `const [sessionRenderCount, setSessionRenderCount] = useState(0)` with a cap (e.g. 3) checked before the fetch call. No localStorage persistence — resets on page reload. Cost: ~3 lines.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `openai` npm package | `/api/wrap-render` route | **No — NOT installed** | — | Must install: `npm install openai` |
| `OPENAI_API_KEY` env var | `new OpenAI()` constructor | **Not defined** in `.env.example` | — | Must add to `.env.local` + Vercel |
| Upstash KV (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) | Rate-limit counter | Confirmed present (used by `/api/wrap-quote`) | — | `hasKv()` guard — rate-limiting skipped if KV absent |
| Studio bay background image | `images.edit()` background reference | **Not present** in `public/` | — | Prompt-only integration (lower quality) |
| Node.js runtime | `runtime = 'nodejs'` requirement | Confirmed (used by `wrap-remove-bg`) | — | — |

**Missing dependencies with no fallback:**
- `openai` package — blocks route compilation
- `OPENAI_API_KEY` — blocks API calls at runtime (throws immediately)

**Missing dependencies with fallback:**
- Studio bay background image — route can work with prompt-only (quality TBD)
- Upstash KV — `hasKv()` guard in route; rate-limiting is skipped gracefully if KV not configured

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — manual verification (same as Phase 07) |
| Config file | None |
| Quick run command | Manual: open `/wrap-studio`, upload car, select colour, click "Studio Render", verify render-veil shows, verify BA slider updates |
| Full suite command | Manual: verify renderUrl present in state, BA tags show "Studio Render" / "Original", rate-limit blocks on 11th render |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RENDER-01 | "Studio Render" button triggers render flow, render-veil appears | Manual smoke | — | N/A |
| RENDER-02 | Canvas PNG blob POSTed to `/api/wrap-render`; OpenAI call made | Manual (check network tab) | — | N/A |
| RENDER-03 | Prompt includes finish + colour name; verify in server logs | Manual (console.log) | — | N/A |
| RENDER-04 | GPT result shows car integrated into studio scene | Manual visual inspection | — | N/A |
| RENDER-05 | Progress bar animates, label reads "Rendering studio shot…" | Manual smoke | — | N/A |
| RENDER-06 | `renderUrl` set after success; BA slider left tag = "Studio Render", right = "Original" | Manual smoke | — | N/A |

### Wave 0 Gaps

- [ ] `npm install openai` — package not in `package.json`
- [ ] Add `OPENAI_API_KEY=` to `.env.example`, seed in `.env.local`
- [ ] Add `public/wrap-studio/studio-bay.jpg` (1536×1024 studio bay background) — or confirm prompt-only approach

---

## Project Constraints (from CLAUDE.md)

`CLAUDE.md` does not exist in this project. Constraints inferred from codebase patterns:

- **Zero-build architecture**: `public/wrap-studio/` files use Babel Standalone. No bundler. All browser-side changes must be plain JS/JSX. No `import` statements in `app.jsx`/`stage.jsx`.
- **Server routes**: Next.js App Router `export async function POST(request)` convention. No Express, no middleware.
- **KV access**: All KV operations via `lib/kv.js` helpers. `hasKv()` guard must wrap all KV calls. Never use Upstash client directly.
- **dataURLs preferred over blob URLs**: `renderUrl` must be a `data:image/png;base64,...` string, not a `blob:` URL or expiring HTTPS URL.
- **`runtime = 'nodejs'`**: Any route using Node.js-specific APIs (OpenAI SDK, `@imgly/background-removal-node`) must export this constant.
- **`maxDuration = 60`**: Long-running routes must set this or Vercel will time out at 10s.
- **HTML escaping before Telegram**: `escapeHtml()` — not relevant to this phase (no Telegram notification in render route).

---

## Sources

### Primary (HIGH confidence — direct source inspection)
- `/Users/kieranredpath/Documents/Matthews&Clark/public/wrap-studio/app.jsx` — `startRender` stub (lines 137–148), `window.__wrapDownload` pattern (lines 376–404), state structure, WrapStage props
- `/Users/kieranredpath/Documents/Matthews&Clark/public/wrap-studio/stage.jsx` — BA slider implementation (lines 355–462), `displayUrl` derivation, HUD render button
- `/Users/kieranredpath/Documents/Matthews&Clark/lib/kv.js` — `kvFetch`, `kvIncr`, `kvGet`, `hasKv` exports; no TTL parameter on `kvSet`; `kvFetch` is directly exported
- `/Users/kieranredpath/Documents/Matthews&Clark/app/api/wrap-remove-bg/route.js` — `runtime = 'nodejs'`, `maxDuration = 60`, multipart form data pattern
- `/Users/kieranredpath/Documents/Matthews&Clark/app/api/wrap-quote/route.js` — full App Router route pattern, `hasKv`, env var names
- `/Users/kieranredpath/Documents/Matthews&Clark/package.json` — confirmed `openai` is NOT installed

### Secondary (MEDIUM confidence — official docs via WebFetch/WebSearch)
- [OpenAI Image Generation Guide](https://developers.openai.com/api/docs/guides/image-generation) — `images.edit()` parameters, `gpt-image-1` model string, `1536x1024` size, `b64_json` response, `toFile()` with Buffer
- [OpenAI Cookbook: Generate images with GPT Image](https://developers.openai.com/cookbook/examples/generate_images_with_gpt_image) — Node.js code examples, `b64_json` response pattern
- `npm view openai version` — confirmed latest version is `4.82.0` (or current at install time)

---

## Metadata

**Confidence breakdown:**
- OpenAI SDK API shape (`images.edit()`, `toFile`, `b64_json`): HIGH — verified via official docs
- Model string `gpt-image-1`: HIGH — confirmed in CONTEXT.md + official docs
- `openai` not installed: HIGH — confirmed by direct `package.json` inspection
- `OPENAI_API_KEY` not in `.env.example`: HIGH — confirmed by direct file read
- Studio bay asset absent: HIGH — confirmed by `find` in `public/wrap-studio/`
- Rate-limit via `kvFetch('/expire/...')`: HIGH — `kvFetch` is exported; Upstash REST EXPIRE endpoint is standard
- `runtime = 'nodejs'` requirement: HIGH — confirmed pattern in `wrap-remove-bg/route.js`
- BA slider state wiring: HIGH — direct source inspection of `stage.jsx`

**Research date:** 2026-06-11
**Valid until:** 2026-09-11 (OpenAI SDK minor versions move fast; verify `openai` version at install time)
