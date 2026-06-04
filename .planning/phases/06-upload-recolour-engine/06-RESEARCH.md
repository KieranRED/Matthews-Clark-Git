# Phase 6: Upload & Recolour Engine — Research

**Researched:** 2026-06-04
**Domain:** In-browser background removal (ONNX/WASM), CSS blend-mode recolour engine, localStorage persistence
**Confidence:** MEDIUM — core API verified via official README; CDN loading pattern requires executor care (no UMD build)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Do NOT add `@imgly/background-removal` to the route.js HTML shell — lazy-load via dynamic script injection ONLY when a file is actually selected
- Same rule for `heic2any` — only fetch when `.heic` or `.heif` extension detected
- Pattern: check `window.BackgroundRemoval` before using; if absent, inject script tag and await `window.onBgRemovalReady` callback
- HEIC detection by file extension (`.heic`, `.heif`) before passing to FileReader
- Library: `@imgly/background-removal` v1.4.5
- CDN: `https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/browser.js` (CONTEXT.md specifies this — see critical note below)
- heic2any CDN: `https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js`
- Call: `BackgroundRemoval.removeBackground(file, { progress: (p) => setRemoveProgress(p) })`
- Result is a Blob — convert to dataURL via FileReader for storage
- Store `originalUrl` (raw photo dataURL) and `carUrl` (removed-bg PNG dataURL) in state + localStorage
- Existing `carUrl` state contract unchanged — it drives the recolour mask
- Metallic finish: add SVG `feTurbulence` noise filter on the tint layer only
- Before/after already wired — wire `originalUrl` as the `car-base--original` img at z-index 0
- `localStorage` key `mc-wrap-studio-v1` gets two new fields: `originalUrl` and `carUrl`

### Claude's Discretion

- None specified — all integration decisions are locked

### Deferred Ideas (OUT OF SCOPE)

- Server-side background removal
- Canvas HSL pixel-level colour transform (blend modes are accurate enough for Phase 6)
- Background removal quality settings / model size toggle
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLOAD-01 | Customer can upload a car photo by drag-and-drop or file picker (JPG, PNG, HEIC) | Drag/drop + fileRef already in stage.jsx; heic2any handles HEIC conversion |
| UPLOAD-02 | Background removed in-browser via @imgly/background-removal WASM — no server round-trip | Dynamic ESM import pattern confirmed; API verified |
| UPLOAD-03 | Background-removed PNG used as pixel mask for the recolour engine | CSS mask-image alpha channel pattern confirmed; existing maskStyle object works unchanged |
| UPLOAD-04 | Customer sees a progress indicator while background removal runs | progress callback signature: `(key, current, total)` — compute `current/total` for percentage |
| RCOL-01 | Selecting a colour instantly applies finish-accurate preview via canvas HSL | CONTEXT.md defers canvas HSL — blend mode engine fulfils this requirement for Phase 6 |
| RCOL-02 | Gloss finish: preserves/amplifies specular highlights with sheen layer | Already implemented in fxFor() — no change needed |
| RCOL-03 | Matte finish: flat diffuse, zero specularity | Already implemented in fxFor() |
| RCOL-04 | Satin finish: preserves highlight structure, dampens specular ~60% | Already implemented in fxFor() |
| RCOL-05 | Chrome finish: animated gradient band sweep | Already implemented in fxFor() with anim-chrome |
| RCOL-06 | Metallic finish: HSL transform + grain noise layer | fxFor() metallic case + SVG feTurbulence filter — new addition |
| RCOL-07 | Colour-shift finish: animated two-tone HSL gradient | Already implemented in fxFor() with anim-shift |
| RCOL-08 | PPF clear/matte: thin tint overlay only | Already implemented in fxFor() |
| RCOL-09 | Customer can assign different colours to individual panels | Already wired in app.jsx panelColors/activePanel — no change |
| RCOL-10 | Before/after swipe slider shows original vs wrapped car | baActive/baPos/clip already wired; wire originalUrl as car-base--original |
</phase_requirements>

---

## Summary

Phase 6 replaces the simple FileReader dataURL path in `stage.jsx ingest()` with a three-stage pipeline: (1) optional HEIC-to-JPEG conversion via `heic2any`, (2) in-browser background removal via `@imgly/background-removal`, (3) Blob-to-dataURL conversion for storage. The pipeline produces two dataURLs — `originalUrl` (raw photo) and `carUrl` (background-removed cutout) — which persist in localStorage and drive the existing CSS blend-mode recolour engine and the before/after slider respectively.

The recolour engine itself requires only a single addition: a `metallic` case in `fxFor()` plus a hidden SVG `feTurbulence` filter defined once in the stage DOM. All other finish cases (gloss, satin, matte, chrome, shift, ppf-clear, ppf-matte) are already correctly implemented. The CSS `maskStyle` object already applies `WebkitMaskImage: url(${carUrl})` correctly — the background-removed PNG's alpha channel provides the silhouette clip with no additional changes.

**Critical finding:** `@imgly/background-removal` v1.4.5 ships only ESM (`index.mjs`) and CJS (`index.cjs`) builds — there is no UMD build and no global `window.BackgroundRemoval` is set automatically by a script tag. The CONTEXT.md loading pattern (inject script tag, check `window.BackgroundRemoval`) cannot work as described. The correct approach for a no-build environment is a native dynamic ESM `import()` call: `const { imglyRemoveBackground } = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs')`. This must be reconciled with the CONTEXT.md pattern — see Open Questions.

**Primary recommendation:** Use native dynamic `import()` via jsdelivr ESM endpoint to load the library on demand. Cache the resolved function in a module-scope variable to avoid re-downloading. Handle COOP/COEP headers in route.js for WASM threading.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @imgly/background-removal | 1.4.5 | In-browser background removal via ONNX WASM | CONTEXT.md locked choice; maintains privacy, no server cost |
| heic2any | 0.0.4 | HEIC/HEIF → JPEG/PNG Blob conversion in browser | CONTEXT.md locked choice; minimal WASM, ~500KB |

### No new supporting libraries
All other dependencies (React UMD, Babel, Lucide icons) are already loaded by route.js.

**Installation:**
No npm install — both libraries are CDN-loaded on demand.

### ESM endpoint URLs (verified via jsDelivr directory listing)
```
@imgly/background-removal v1.4.5 ESM:
  https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs

heic2any v0.0.4 (has UMD build, sets window.heic2any):
  https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js
```

---

## Architecture Patterns

### Recommended File Structure (no new files)
```
public/wrap-studio/
├── stage.jsx      MODIFY — ingest() pipeline, fxFor() metallic, SVG noise filter, car-base--original
├── app.jsx        MODIFY — originalUrl state, persist/load, reset handler
└── studio.css     ADD — .removal-progress, .rp-eyebrow, .rp-bar, .rp-pct, .removal-error, .re-msg, .car-base--original

app/mc-site/wrap-studio/
└── route.js       MODIFY — add COOP/COEP response headers for WASM threading
```

### Pattern 1: Dynamic ESM Import for @imgly/background-removal

The library has no UMD build. In a no-build browser environment, the correct loading mechanism is native dynamic `import()`. jsDelivr supports ESM imports via its `/+esm` transpiler URL or by directly importing the `.mjs` file.

```javascript
// module-scope cache (inside the IIFE in stage.jsx)
let _removeBackground = null;

async function loadBgRemoval() {
  if (_removeBackground) return _removeBackground;
  const mod = await import(
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs'
  );
  _removeBackground = mod.imglyRemoveBackground;
  return _removeBackground;
}
```

**Important:** Dynamic `import()` only works inside a `<script type="module">` or when called from native ES module context. The current `app.jsx` and `stage.jsx` files are `<script type="text/babel">` — Babel standalone transpiles them. Babel standalone DOES support transpiling dynamic `import()` calls, but the execution context must be module-capable. This is a known compatibility consideration — see Open Questions.

**Alternative (safer for Babel context):** Use a `<script type="module">` injector approach — dynamically create and append a `<script type="module">` element whose content calls `import()` and stores the result on `window`:

```javascript
function loadBgRemoval() {
  return new Promise((resolve, reject) => {
    if (window.__imglyRemoveBackground) { resolve(window.__imglyRemoveBackground); return; }
    const s = document.createElement('script');
    s.type = 'module';
    s.textContent = `
      import { imglyRemoveBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/index.mjs';
      window.__imglyRemoveBackground = imglyRemoveBackground;
      window.dispatchEvent(new Event('bgRemovalReady'));
    `;
    window.addEventListener('bgRemovalReady', () => resolve(window.__imglyRemoveBackground), { once: true });
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
```

This pattern is compatible with the CONTEXT.md intent (check a window flag, inject a script, await a signal) and works correctly alongside `text/babel` scripts.

### Pattern 2: Full Ingest Pipeline

```javascript
async function ingest(file) {
  if (!file || !/^image\//.test(file.type) && !/(\.heic|\.heif)$/i.test(file.name)) return;

  // 1. Store original as dataURL BEFORE bg removal
  const originalDataUrl = await fileToDataUrl(file);
  setOriginalUrl(originalDataUrl);

  // 2. HEIC conversion if needed
  let processFile = file;
  if (/(\.heic|\.heif)$/i.test(file.name)) {
    await loadHeic2Any();  // lazy-load via script tag (has UMD, sets window.heic2any)
    const jpegBlob = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    processFile = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob;
  }

  // 3. Show progress UI
  setRemoving(true);
  setRemoveError(null);

  try {
    // 4. Load library and run removal
    const removeBackground = await loadBgRemoval();
    const resultBlob = await removeBackground(processFile, {
      progress: (key, current, total) => {
        setRemoveProgress(total > 0 ? Math.round((current / total) * 100) : 0);
      },
      model: 'isnet_quint8',  // smallest/fastest — quality toggle deferred per CONTEXT.md
      output: { format: 'image/png', type: 'foreground' }
    });

    // 5. Blob → dataURL for persistence
    const carDataUrl = await blobToDataUrl(resultBlob);
    setCarUrl(carDataUrl);
  } catch (err) {
    setRemoveError(err);
  } finally {
    setRemoving(false);
  }
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}
```

### Pattern 3: COOP/COEP Headers in route.js

ONNX Runtime Web uses SharedArrayBuffer for multi-threaded inference, which requires cross-origin isolation headers. Without them the library falls back to single-threaded CPU mode (slower but functional). For best mobile performance, add these headers:

```javascript
// app/mc-site/wrap-studio/route.js
return new Response(html, {
  status: 200,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',  // less strict than require-corp; won't break CDN scripts
  },
});
```

**Note:** `credentialless` (not `require-corp`) is the correct value — `require-corp` blocks CDN-loaded React/Babel/icons unless those servers send `Cross-Origin-Resource-Policy` headers, which they typically do not.

### Pattern 4: heic2any Loading (UMD — simpler)

heic2any v0.0.4 ships a UMD build that sets `window.heic2any` when loaded via script tag. Standard script injection works:

```javascript
function loadHeic2Any() {
  return new Promise((resolve, reject) => {
    if (window.heic2any) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
```

heic2any API:
```javascript
// Returns Promise<Blob | Blob[]>
const result = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
const jpegBlob = Array.isArray(result) ? result[0] : result;
```

### Pattern 5: fxFor() Metallic Case

```javascript
case 'metallic':
  return {
    tint:  { background: c, mixBlendMode: 'color', opacity: .96 },
    sheen: { opacity: .22 },
    tone:  { opacity: .18 },
    noise: true   // signals renderer to apply SVG filter
  };
```

In `fxLayers`, apply the filter conditionally:
```javascript
h('div', {
  key: 'tint',
  className: 'car-fx car-tint ' + (fx.anim || ''),
  style: {
    ...maskStyle, ...clip, ...fx.tint,
    filter: fx.noise ? 'url(#metallic-noise)' : undefined
  }
})
```

### Pattern 6: SVG Noise Filter (defined once, inside .stage)

```html
<svg style="position:absolute;width:0;height:0" aria-hidden="true">
  <defs>
    <filter id="metallic-noise" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" seed="2" result="noise"/>
      <feColorMatrix type="saturate" values="0" in="noise" result="grey"/>
      <feBlend in="SourceGraphic" in2="grey" mode="multiply" result="blended"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="1"/>
      </feComponentTransfer>
    </filter>
  </defs>
</svg>
```

### Pattern 7: Before/After car-base--original Wiring

```javascript
// In stage.jsx car-box render, when carUrl is set:
h(React.Fragment, null,
  // Original photo (behind everything, unclipped — reveals on left as wrapped layers slide right)
  originalUrl ? h('img', {
    className: 'car-base car-base--original',
    src: originalUrl,
    alt: 'Original car'
  }) : null,
  // Masked cutout (z-index 1, clipped by baPos)
  h('img', { className: 'car-base', src: carUrl, style: clip, alt: 'Your car' }),
  fxLayers   // z-index 2, also clipped by baPos via clip spread
)
```

### Anti-Patterns to Avoid

- **Blob URLs for storage:** `URL.createObjectURL()` returns a blob URL (e.g. `blob:https://...`) that is revoked on page unload. Always convert to dataURL via FileReader before storing in state/localStorage.
- **Loading library upfront:** Do not add the CDN URL to route.js HTML — the ONNX model downloads ~40MB on first page load.
- **Using `require-corp` COEP:** This breaks unpkg/jsDelivr CDN scripts that don't send CORP headers. Use `credentialless` instead.
- **Storing full-resolution dataURLs without quota guard:** Always wrap `localStorage.setItem()` in try/catch for QuotaExceededError.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background removal | Custom segmentation algo | @imgly/background-removal | Requires trained neural network, WASM runtime, model weights |
| HEIC decoding | Byte-level HEIC parser | heic2any | HEIC is a complex container format using HEVC codec |
| Alpha channel masking | Canvas pixel loop | CSS `mask-image` with PNG | Browser-native, GPU-accelerated, zero JS |
| SVG noise texture | Canvas noise generation | `feTurbulence` SVG filter | Declarative, resolution-independent, no JS |

**Key insight:** The entire recolour engine already exists and works. The only additions are the bg-removal pipeline wired into `ingest()` and the metallic noise SVG filter.

---

## Common Pitfalls

### Pitfall 1: @imgly/background-removal Has No UMD Build
**What goes wrong:** CONTEXT.md references `window.BackgroundRemoval` and `dist/browser.js`. The actual v1.4.5 dist contains only `index.cjs` and `index.mjs` — no browser.js, no window global.
**Why it happens:** The library is designed for bundler use. The CONTEXT.md pattern was written with an assumed UMD that does not exist.
**How to avoid:** Use the `<script type="module">` injector pattern (Pattern 1 above) that imports from the `.mjs` endpoint and stores the function on `window.__imglyRemoveBackground`.
**Warning signs:** `window.BackgroundRemoval is undefined` at runtime.

### Pitfall 2: localStorage Quota Exceeded
**What goes wrong:** Two full-resolution car photos as base64 dataURLs can be 2–5 MB each. Most browsers cap localStorage at 5 MB total per origin. Storing both `originalUrl` + `carUrl` will likely exceed this.
**Why it happens:** Base64 encoding inflates binary size by ~33%. A 2 MB JPEG becomes ~2.7 MB as base64.
**How to avoid:** 
1. Always wrap `localStorage.setItem()` in try/catch, catch `QuotaExceededError` silently (state still works in memory for the session).
2. Consider resizing large images before removal (scale down to max 1920px wide) — this also prevents ONNX memory crashes on high-resolution phones.
**Warning signs:** Session state works but does not survive refresh.

### Pitfall 3: COOP/COEP Breaks CDN Scripts
**What goes wrong:** Adding `Cross-Origin-Embedder-Policy: require-corp` blocks React, Babel, and Lucide loading from unpkg/jsDelivr because those CDNs do not send `Cross-Origin-Resource-Policy` headers.
**Why it happens:** COEP require-corp requires ALL loaded resources to explicitly opt in to cross-origin sharing.
**How to avoid:** Use `credentialless` value, not `require-corp`. This enables SharedArrayBuffer without blocking CDN resources.
**Warning signs:** Blank page, console errors about blocked cross-origin resources.

### Pitfall 4: progress Callback Signature
**What goes wrong:** CONTEXT.md shows `progress: (p) => setRemoveProgress(p)` but the actual API signature is `progress: (key, current, total)`. A direct pass-through of `p` would set progress to the string key value, not a percentage.
**Why it happens:** The CONTEXT.md pattern simplified the callback.
**How to avoid:** Compute the fraction explicitly: `progress: (key, current, total) => setRemoveProgress(total > 0 ? Math.round((current / total) * 100) : 0)`.
**Warning signs:** Progress bar shows `NaN%` or stays at 0.

### Pitfall 5: HEIC Files Have `image/*` MIME Type Issues
**What goes wrong:** HEIC files may have `file.type === ''` or `'application/octet-stream'` depending on OS/browser, so `!/^image\//.test(file.type)` rejects them before the extension check runs.
**Why it happens:** HEIC MIME type (`image/heic`) is not universally set by browser file pickers.
**How to avoid:** Check extension FIRST, MIME type second. Adjust the ingest guard: `const isHeic = /(\.heic|\.heif)$/i.test(file.name); if (!isHeic && !/^image\//.test(file.type)) return;`.
**Warning signs:** HEIC uploads silently do nothing.

### Pitfall 6: Metallic Noise Opacity Double-Application
**What goes wrong:** If the SVG filter `feBlend multiply` darkens the layer AND the component also sets reduced opacity, the combined effect can be too dark and read as dirt rather than metallic flake.
**Why it happens:** The filter and CSS opacity stack multiplicatively.
**How to avoid:** Follow the UI-SPEC contract exactly: `opacity: .18` on the tint layer with `filter: url(#metallic-noise)`. Do not also reduce opacity in the `fxFor()` return object — the `opacity: .96` value in the metallic case is the base tint opacity, not affected by the filter.

---

## Code Examples

### Blob to dataURL
```javascript
// Source: MDN FileReader API (standard browser API)
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
```

### localStorage persist with quota guard
```javascript
// In app.jsx persist useEffect
useEffect(() => {
  const data = { carUrl, originalUrl, selectedId, panelColors, activePanel, favs, pins, bg, light };
  try {
    localStorage.setItem(LS, JSON.stringify(data));
  } catch (e) {
    // QuotaExceededError — state lives in memory for this session
    if (e && e.name === 'QuotaExceededError') {
      // Optionally retry without image data
      try {
        const slim = { ...data, carUrl: null, originalUrl: null };
        localStorage.setItem(LS, JSON.stringify(slim));
      } catch {}
    }
  }
}, [carUrl, originalUrl, selectedId, panelColors, activePanel, favs, pins, bg, light]);
```

### CSS mask alpha channel (existing — no change needed)
```javascript
// Source: existing stage.jsx maskStyle — confirmed correct
const maskStyle = carUrl ? {
  WebkitMaskImage: `url(${carUrl})`,
  maskImage: `url(${carUrl})`
} : null;
// When carUrl is a background-removed PNG, the transparent background areas
// have alpha=0, clipping blend-mode layers to the car silhouette exactly.
// mask-mode defaults to 'match-source' → alpha mode for PNG → correct behaviour.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side background removal (remove.bg, Photoroom API) | Client-side ONNX WASM | 2023 | No API cost, no latency, no privacy concern |
| require-corp COEP for SharedArrayBuffer | credentialless COEP | Chrome 96+ (2021) | Enables threading without blocking CDN resources |
| UMD global script tag libraries | ESM dynamic import | 2019 onwards | No global pollution; requires import() or script[type=module] injection |

---

## Open Questions

1. **window.BackgroundRemoval does not exist — CONTEXT.md pattern mismatch**
   - What we know: v1.4.5 has no UMD build, no `dist/browser.js`, no auto-set window global
   - What's unclear: Whether the executor should interpret CONTEXT.md's pattern as intent (not literal implementation) and use the `<script type="module">` injector approach described above
   - Recommendation: Plan tasks using the module-injector pattern (Pattern 1). The planner should note this deviation from CONTEXT.md literal wording and confirm the approach is acceptable.

2. **Image resize before removal on high-resolution uploads**
   - What we know: 48MP phone photos can cause ONNX OOM crashes on mobile; limiting to ~1920px wide before passing to the library is the correct mitigation
   - What's unclear: Whether Phase 6 should include a pre-resize step (canvas drawImage → blob) or defer this
   - Recommendation: Include a lightweight pre-resize step in `ingest()` as a defensive measure. Cap at 1920px wide using canvas. This is a 5-line addition, not a new library.

3. **Babel standalone + dynamic import() compatibility**
   - What we know: Babel standalone transpiles JSX; dynamic `import()` is ES2020 syntax
   - What's unclear: Whether Babel standalone 7.29.0 transforms `import()` in a way that breaks the native ESM fetch from CDN
   - Recommendation: Use the `<script type="module">` injector pattern (Pattern 1 alternative) which avoids the issue entirely — the dynamic import runs in a pure module script, not through Babel.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @imgly/background-removal | UPLOAD-02 | CDN (lazy) | 1.4.5 | None — library is locked decision |
| heic2any | UPLOAD-01 HEIC support | CDN (lazy) | 0.0.4 | None needed — only loaded for HEIC files |
| SharedArrayBuffer (COOP/COEP) | ONNX threading | Conditional | n/a | Falls back to single-thread CPU (slower, ~3–5× longer) |
| CSS mask-image | UPLOAD-03 | ✓ | Chrome 120+ unprefixed; WebKit-prefixed since Safari 4 | Both prefixed+unprefixed already in maskStyle |

**Missing dependencies with no fallback:** None — all required libraries are CDN-available.
**Performance note:** Without COOP/COEP headers, background removal runs single-threaded. Expected processing time: 5–15s on mobile (single-thread) vs 2–6s (multi-thread). The progress bar makes this acceptable UX.

---

## Validation Architecture

The project has no automated test infrastructure (no jest.config, no vitest.config, no tests/ directory). All validation is manual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification |
|--------|----------|-----------|-------------|
| UPLOAD-01 | Drag-drop + file picker + HEIC | Manual | Upload JPG, PNG, HEIC files; confirm each reaches removal pipeline |
| UPLOAD-02 | Background removed client-side | Manual | Network tab shows no server calls during removal; car appears masked |
| UPLOAD-03 | Cutout used as mask | Manual | Select a swatch; colour appears only on car silhouette, not background area |
| UPLOAD-04 | Progress indicator visible | Manual | Confirm progress bar appears and advances during removal |
| RCOL-01–08 | Each finish renders correctly | Manual | Cycle through all 7 finish types; verify visual contract |
| RCOL-06 | Metallic noise filter visible | Manual | Select metallic swatch; subtle grain texture visible on car |
| RCOL-09 | Per-panel assignment | Manual | Assign different colours to bonnet vs full body; both hold |
| RCOL-10 | Before/after slider | Manual | Drag slider; original photo reveals on left, wrapped on right |

### Wave 0 Gaps
None — no test framework to set up. Manual verification is the gate.

---

## Sources

### Primary (HIGH confidence)
- `app.unpkg.com/@imgly/background-removal@1.5.8/files/README.md` — API signature, config options, model variants
- `cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/` — Directory listing confirmed: index.cjs, index.mjs, no browser.js, no UMD
- `app.unpkg.com/@imgly/background-removal@1.4.5/files/package.json` — Confirmed: main=index.cjs, module=index.mjs, no UMD/browser field
- Existing `public/wrap-studio/stage.jsx` and `app.jsx` — read directly; ingest(), maskStyle, fxFor(), persist patterns confirmed

### Secondary (MEDIUM confidence)
- DEV Community: "Client-side background removal with ONNX Runtime Web" — COOP/COEP `credentialless` vs `require-corp`, CSP requirements, mobile memory limits
- MDN Storage quotas — localStorage 5MB limit, QuotaExceededError handling
- WebSearch: heic2any API signature `(blob, toType, quality)` → `Promise<Blob|Blob[]>`, window.heic2any global — consistent across multiple sources

### Tertiary (LOW confidence)
- WebSearch claim that jsDelivr `/+esm` endpoint works for dynamic import of this library — not directly verified; use with caution

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — library exists and CDN is available; but UMD absence is a critical finding that changes the loading approach
- Architecture: HIGH — patterns are derived directly from reading the actual source files
- Pitfalls: HIGH — UMD absence and progress signature verified directly against package.json and README; COEP/quota pitfalls verified via MDN

**Research date:** 2026-06-04
**Valid until:** 2026-09-01 (library under active development; verify dist structure if upgrading from 1.4.5)
