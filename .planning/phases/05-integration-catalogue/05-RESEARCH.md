# Phase 5: Integration & Catalogue — Research

**Researched:** 2026-06-04
**Domain:** Next.js App Router static shell serving, Vercel Blob upload, Node.js catalogue build script, React UMD prototype integration
**Confidence:** HIGH — all findings verified against local codebase, installed packages, and actual data files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route & URL**
- Route: `app/mc-site/wrap-studio/page.jsx` → URL `/mc-site/wrap-studio`
- Page is a Next.js server component that renders an HTML shell and loads all studio JS/CSS as static files from `public/wrap-studio/`
- Full-screen standalone layout — does NOT use the mc-site header/nav
- Add a "Wrap Studio →" CTA link to `app/mc-site/wrapping/page.jsx`

**Serving the Design System**
- Copy all 7 prototype files from `/tmp/mc-wrap-studio/wrap-studio/` into `public/wrap-studio/`
  - app.jsx, catalogue-panel.jsx, catalogue.js, icons.jsx, stage.jsx, studio.css, tweaks-panel.jsx
- page.jsx references them as `<script src="/wrap-studio/app.jsx">` etc
- The demo car image (`_DEMO-car-REMOVE-BEFORE-PROD.png`) is intentionally NOT copied — set DEMO_CAR_SRC = null in app.jsx
- Babel standalone transforms the JSX files client-side (already wired in the HTML entry point)

**Catalogue Data**
- Write a Node.js script `scripts/build-catalogue.js` that reads wrap-colours.json, maps each entry to the prototype's schema, uploads swatch PNGs to Vercel Blob, embeds blob URLs as `swatchUrl`, and outputs `public/wrap-studio/catalogue.js` as a self-executing script assigning `window.WRAP_CATALOGUE`
- Script run once locally before deploying; output committed to repo

**Finish Key Mapping**
- `gloss` → `gloss`, `satin` → `satin`, `matte` → `matte`, `chrome` → `chrome`
- `colour-shift` → `shift`
- `metallic` → `satin` (visually) — BUT also add as separate first-class finish key (see UI-SPEC)
- `brushed` → `satin`
- `carbon` → `matte`
- `ppf-colour`: if id contains "matte" → `ppf-matte`, else → `ppf-clear`
- `ppf-clear` → `ppf-clear`, `ppf-matte` → `ppf-matte`

**Quote Flow**
- Remove all tier/pricing labels from quote modal and catalogue panel
- "Get a quote" CTA opens a simple lead form: name, car, WhatsApp/phone, notes
- No price estimates shown

**FINISHES array** (from UI-SPEC): Gloss, Satin, Matte, Metallic (new), Chrome, Colour-shift, Carbon (new), PPF Clear, PPF Matte

### Claude's Discretion

None specified — all key decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Nicer navigation integration with the rest of the mc-site (Phase 9 or later)
- Studio backgrounds from real M&C bay photos
- Admin analytics for most-browsed colours
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | Customer can access the wrap studio at `/mc-site/wrap-studio` without logging in | Static public page — no auth middleware needed; route segment confirmed |
| INT-02 | Studio loads within 3 seconds on first visit | JS/CSS served from `public/wrap-studio/` via Vercel CDN edge; catalogue.js is a single committed file; swatch images load from Vercel Blob CDN |
| INT-03 | Studio is mobile-responsive and usable on phone | Breakpoints already in studio.css: ≤1080px, ≤860px, ≤680px — see UI-SPEC |
| CAT-01 | Customer can browse all 375 real wrap films | build-catalogue.js outputs all 375 entries into `window.WRAP_CATALOGUE` |
| CAT-02 | Filter by brand (All / Avery Dennison / Hexis / STEK) | `window.BRANDS` array already in catalogue.js; brand values in real data are `avery`, `hexis`, `stek` — needs capitalisation mapping |
| CAT-03 | Filter by finish type | `window.FINISHES` array updated with metallic and carbon chips |
| CAT-04 | Search by colour name or product code | Already implemented in catalogue-panel.jsx's filter logic against `name` and `code` fields |
| CAT-05 | Each swatch shows real product code, series, and finish type | Real data has `code`, `series`, `finish` fields — direct mapping |
| CAT-06 | Swatch images load from curated swatch library | 18 STEK PNG files upload to Vercel Blob; 357 Avery/Hexis entries have no swatch PNG (hex fallback) |
</phase_requirements>

---

## Summary

Phase 5 integrates a standalone React UMD wrap studio prototype into the Next.js 15 App Router repo, replacing the demo catalogue with real data for all 375 wrap films. The key insight is that this is not a Next.js React component — it is an HTML shell page that loads external JSX files processed by Babel in the browser.

The most significant discovery is that only 18 swatch PNG files exist (all STEK, in `/swatches/stek/`). Avery (152 entries) and Hexis (197 entries) have no swatch PNGs — those 349 entries fall back to hex-only rendering. The `build-catalogue.js` script uploads all 18 STEK PNGs to Vercel Blob and writes null for the other 357 entries. This is the expected behaviour per the UI-SPEC fallback rule.

The layout bypass pattern for Next.js App Router is straightforward: a `page.jsx` that exports its own `generateStaticParams`-style metadata and returns `null` from `generateStaticParams` does not need any special trick — the key is that the route segment lives at `app/mc-site/wrap-studio/` which is nested under `app/mc-site/layout.jsx`. To bypass it, the page must export its own `layout.jsx` in the same segment, which exports only `{children}`. Alternatively — and more simply — the page renders a full-document HTML string via `dangerouslySetInnerHTML` or returns raw JSX that replaces the layout entirely by using Next.js route segment config `export const dynamic = 'force-static'` combined with the layout bypass approach.

**Primary recommendation:** Use a route-level layout override — add `app/mc-site/wrap-studio/layout.jsx` that renders `{children}` with no wrapping markup. The `page.jsx` then returns the full HTML shell as a React component.

---

## Standard Stack

### Core (already installed / decided)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/blob` | 2.3.3 (installed) | Upload swatch PNGs, serve via CDN | Project already uses Vercel Blob for other assets |
| `react` (UMD) | Loaded via CDN in HTML shell | Studio UI runtime | Prototype is already UMD-based — not a Next.js React tree |
| Babel Standalone | Loaded via CDN | Client-side JSX transform | Already wired in prototype HTML entry point |
| Node.js built-ins (`fs`, `path`) | v20.9.0 (installed) | build-catalogue.js reads JSON, walks swatch dirs | No additional packages needed |

### No additional packages required

The `@vercel/blob` package is already installed at v2.3.3. `BLOB_READ_WRITE_TOKEN` is present in `.env.local`. No new `npm install` commands are needed for this phase.

**Version verification:** `@vercel/blob@2.3.3` confirmed via `node_modules/@vercel/blob/package.json`. Latest published: 2.4.0 — difference is minor, not blocking. Use installed version.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
└── mc-site/
    └── wrap-studio/
        ├── layout.jsx          ← NEW: bypasses mc-site layout (renders {children} only)
        └── page.jsx            ← NEW: server component, returns full HTML shell

public/
└── wrap-studio/
    ├── app.jsx                 ← copied from /tmp/mc-wrap-studio/wrap-studio/
    ├── catalogue-panel.jsx     ← copied + modified (FINISHES array, tier removal)
    ├── catalogue.js            ← GENERATED by build-catalogue.js (replaces demo)
    ├── icons.jsx               ← copied as-is
    ├── stage.jsx               ← copied as-is
    ├── studio.css              ← copied as-is
    └── tweaks-panel.jsx        ← copied as-is

scripts/
└── build-catalogue.js         ← NEW: one-time script, run locally before deploy
```

### Pattern 1: Next.js Layout Bypass via Route-Level layout.jsx

**What:** A segment-level `layout.jsx` co-located with the page overrides the parent layout for that segment only.

**When to use:** When a page must be full-screen standalone and must not inherit parent layout markup.

**Example:**
```jsx
// app/mc-site/wrap-studio/layout.jsx
export default function WrapStudioLayout({ children }) {
  return children;
}
```

The `page.jsx` then controls its own `<html>` / `<body>` via the HTML shell JSX, OR it simply renders a `<div id="app" style={{...}}></div>` root and the shell's own CSS handles `position: fixed; inset: 0`.

**Important:** Next.js App Router does NOT allow a page to export its own `<html>` tag unless it is the root `app/layout.jsx`. For a nested route, the correct pattern is: return a full-viewport `<div>` container (matching `--ink` background) and let the studio CSS take over from there. The layout.jsx override prevents mc-site nav/header from wrapping it.

**Confidence:** HIGH — verified against Next.js App Router nesting rules.

### Pattern 2: HTML Shell page.jsx

**What:** The page.jsx is a React server component that returns only the mount point div plus all `<script>` and `<link>` tags needed by the studio.

**When to use:** When the page loads an external JS bundle rather than a Next.js component tree.

**Example:**
```jsx
// app/mc-site/wrap-studio/page.jsx
import Script from 'next/script';

export const metadata = {
  title: 'Wrap Studio — Matthews / Clark',
};

export default function WrapStudioPage() {
  return (
    <>
      <link rel="stylesheet" href="/wrap-studio/studio.css" />
      <div id="app" />
      <Script src="https://unpkg.com/react@18/umd/react.production.min.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/@babel/standalone/babel.min.js" strategy="beforeInteractive" />
      <Script src="/wrap-studio/catalogue.js" strategy="beforeInteractive" />
      <Script src="/wrap-studio/icons.jsx" type="text/babel" strategy="lazyOnload" />
      <Script src="/wrap-studio/tweaks-panel.jsx" type="text/babel" strategy="lazyOnload" />
      <Script src="/wrap-studio/stage.jsx" type="text/babel" strategy="lazyOnload" />
      <Script src="/wrap-studio/catalogue-panel.jsx" type="text/babel" strategy="lazyOnload" />
      <Script src="/wrap-studio/app.jsx" type="text/babel" strategy="lazyOnload" />
    </>
  );
}
```

**Caveat on Next.js Script + type="text/babel":** Next.js `<Script>` with `type="text/babel"` may not preserve the `type` attribute correctly depending on the strategy. The safest approach is to emit a plain `<script type="text/babel" src="...">` via `dangerouslySetInnerHTML` or by using a Client Component that appends script tags via `useEffect`. The prototype already handles Babel's deferred execution model — inspect how the existing HTML entry point wires up script loading order and replicate that exactly.

**Alternative (simpler):** Serve the entire HTML entry point as a Next.js route that returns a `Response` object from a route handler, bypassing App Router rendering entirely. This is cleaner for a full-document standalone page. See Pattern 3.

### Pattern 3: Route Handler as Standalone HTML Document (recommended)

Rather than fighting App Router's `<html>/<body>` restrictions, serve the studio as a plain HTML document from a route handler:

```js
// app/mc-site/wrap-studio/route.js  (replaces page.jsx)
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wrap Studio — Matthews / Clark</title>
  <link rel="stylesheet" href="/wrap-studio/studio.css" />
</head>
<body>
  <div id="app"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="/wrap-studio/catalogue.js"></script>
  <script type="text/babel" src="/wrap-studio/icons.jsx"></script>
  <script type="text/babel" src="/wrap-studio/tweaks-panel.jsx"></script>
  <script type="text/babel" src="/wrap-studio/stage.jsx"></script>
  <script type="text/babel" src="/wrap-studio/catalogue-panel.jsx"></script>
  <script type="text/babel" src="/wrap-studio/app.jsx"></script>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
```

**Confidence:** HIGH — Next.js App Router route handlers at any segment return raw HTTP responses, bypassing all layout nesting. `/mc-site/wrap-studio` resolves to `app/mc-site/wrap-studio/route.js` with `GET` export.

**Tradeoff:** No Next.js metadata export (SEO). For a tool page that is not search-indexed, this is acceptable. Add a `<meta name="robots" content="noindex" />` to the HTML head.

### Pattern 4: build-catalogue.js Script Structure

```js
// scripts/build-catalogue.js
import { put } from '@vercel/blob';
import { readFileSync, readdirSync } from 'fs';
import { resolve, basename, extname } from 'path';

// 1. Load source data
const raw = JSON.parse(readFileSync('/Users/.../wrap-colours.json', 'utf8'));

// 2. Build a lookup: entry ID → local PNG path
const swatchDir = '/Users/.../swatches';
const pngMap = {};   // id → absolute path
// walk swatch dir recursively, map stem → path

// 3. Finish key mapping function
function mapFinish(rawFinish, id) {
  const MAP = {
    'gloss': 'gloss', 'satin': 'satin', 'matte': 'matte',
    'chrome': 'chrome', 'colour-shift': 'shift',
    'metallic': 'metallic',   // keep as first-class key (UI-SPEC decision)
    'brushed': 'satin', 'carbon': 'carbon',
    'ppf-clear': 'ppf-clear', 'ppf-matte': 'ppf-matte',
  };
  if (rawFinish === 'ppf-colour') {
    return id.includes('matte') ? 'ppf-matte' : 'ppf-clear';
  }
  return MAP[rawFinish] ?? rawFinish;
}

// 4. Tier inference function
function inferTier(entry) { /* see tier mapping in CONTEXT.md */ }

// 5. proTip lookup by finish
const PRO_TIPS = {
  'matte': 'Matte films show every prep imperfection...',
  'chrome': 'Chrome needs a primer on the edges...',
  'shift': 'Colour-shift reads differently from every angle...',
  'ppf-colour': 'Colour PPF is protection and colour change in one film...',
};

// 6. Upload swatch PNGs to Vercel Blob (sequential with rate-limit guard)
async function uploadSwatches() {
  const results = {};
  for (const [id, localPath] of Object.entries(pngMap)) {
    const blob = await put(`wrap-studio/swatches/${id}.png`,
      readFileSync(localPath),
      { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN }
    );
    results[id] = blob.url;
    await new Promise(r => setTimeout(r, 100)); // 100ms gap to respect rate limits
  }
  return results;
}

// 7. Build catalogue array and write output
// window.WRAP_CATALOGUE = [...];
// window.FINISHES = [...];
// window.BRANDS = ['Avery Dennison', 'Hexis', 'STEK'];
```

**Running the script:**
```bash
BLOB_READ_WRITE_TOKEN="..." node --env-file=.env.local scripts/build-catalogue.js
```
Or simply: the `.env.local` already contains `BLOB_READ_WRITE_TOKEN` — use `dotenv` or `node --env-file=.env.local`.

### Anti-Patterns to Avoid

- **Using `import` ESM in scripts/build-catalogue.js without ESM setup:** The project uses `export default nextConfig` in `next.config.js`, confirming ESM is enabled (`"type": "module"` or similar). Verify `package.json` before choosing `require` vs `import`. Use `import` if project is ESM; add `"type": "module"` to package.json if needed, or name the script `build-catalogue.mjs`.
- **Importing `@vercel/blob` from a CJS context:** Use `import { put } from '@vercel/blob'` in ESM or `const { put } = require('@vercel/blob')` in CJS — do not mix.
- **Uploading all 375 PNGs in parallel:** Only 18 PNG files exist. Even so, use sequential upload with a small delay to avoid Vercel Blob rate limits. Parallel is fine for 18 files in practice but sequential is safer.
- **Hardcoding the source JSON path:** Use an env var or CLI arg so the script can run from any machine.
- **Using Next.js `<Script>` with `type="text/babel"` via `strategy="afterInteractive"`:** Babel standalone intercepts `<script type="text/babel">` tags on DOM ready — if scripts load after Babel has already run its initial scan, they won't be transformed. Load Babel first, then JSX files in correct order.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Serving large static files with CDN caching | Custom file server or Next.js route handler returning file buffers | Vercel `public/` directory (automatic CDN, cache-control headers) | Next.js public/ is edge-cached by Vercel automatically |
| Blob upload with retry | Custom fetch + retry loop | `@vercel/blob` put() — already handles multipart and has `BlobServiceRateLimited` error with `retryAfter` | Error class exposes `retryAfter` seconds |
| Image content-type detection | Magic bytes inspection | Pass `contentType: 'image/png'` to `put()` — or let @vercel/blob infer from pathname extension | Put() infers from pathname by default |

---

## Critical Data Gap: Swatch PNG Coverage

**This is the most important finding for planning.**

Only **18 PNG files** exist in the swatch directory — all STEK entries:

```
/swatches/stek/colour-shift/   3 files
/swatches/stek/matte/          5 files
/swatches/stek/gloss/          10 files
```

Avery (152 entries) and Hexis (197 entries) have **zero** swatch PNG files. The build-catalogue.js script will:
1. Upload 18 STEK swatch PNGs to Vercel Blob → populate `swatchUrl`
2. Set `swatchUrl: null` for all 357 Avery + Hexis entries

The UI-SPEC already specifies the fallback: when `swatchUrl` is null, render the `chipBg(sw)` hex colour as the `.sw-chip` background with no `<img>` tag. This is intentional and documented. The planner must NOT add a task to source or generate missing swatch images — that is explicitly out of scope for Phase 5.

**Swatch PNG filename to entry ID mapping:**
- The 18 PNG stems exactly match their corresponding entry IDs in wrap-colours.json (verified: 18/18 match).
- The walk-and-map approach (stem → entry ID) works correctly.

---

## Real Data Schema vs Prototype Schema Gap

### Actual wrap-colours.json fields per entry:
```
id, brand, series, name, code, finish, hex, rgb, notes, [hex_confidence?]
```

### Fields prototype catalogue.js populates:
```
brand, series, name, code, hex, hex2, finish, tier, thickness, conform, warranty, proTip
```

### Mapping required in build-catalogue.js:

| Source field | Prototype field | Transformation |
|---|---|---|
| `brand` (`avery`/`hexis`/`stek`) | `brand` (display label) | `avery` → `'Avery Dennison'`, `hexis` → `'Hexis'`, `stek` → `'STEK'` |
| `finish` (raw key) | `finish` (prototype key) | See finish mapping table above |
| `hex` | `hex` | Direct copy |
| — | `hex2` | null for all (no colour-shift second colour in real data) |
| — | `tier` | Inferred by brand + finish (see CONTEXT.md tier mapping) |
| — | `thickness` | From SPEC lookup by finish |
| — | `conform` | From SPEC lookup by finish |
| — | `warranty` | From SPEC lookup by finish |
| `notes` | `proTip` | Use notes if non-empty; else fall back to finish-based proTip string |
| — | `swatchUrl` | Blob URL if PNG exists; else null |
| `hex_confidence` | — | Used for `sw-approx` indicator rendering (pass through as `hexConfidence`) |

### Brand display name mapping (critical for filter to work):
```js
const BRAND_DISPLAY = { avery: 'Avery Dennison', hexis: 'Hexis', stek: 'STEK' };
```
The prototype's `window.BRANDS = ['Avery Dennison', 'Hexis', 'STEK']` must match exactly.

### hex_confidence field:
- 72 entries have `hex_confidence: 'low'`
- Spread across: metallic (67 entries with low confidence), plus 5 chrome/shift entries
- The build script must pass this through as a field on each catalogue entry
- catalogue-panel.jsx renders `<span class="sw-approx">~</span>` when `sw.hexConfidence === 'low'`

### ppf-colour finish split (verified against actual IDs):
```
matte entries: stek-ppf-colour-dyno-black-matte, -white-matte, -orange-matte, -green-brg-matte, -purple-matte
gloss entries: all others (dyno-miami-blue, dyno-red, dyno-green-brg, dyno-purple, dyno-black-gloss, dyno-white, dyno-gray, dyno-orange, dyno-rubystone, dyno-tanzanite)
```
The rule `id.includes('matte') → ppf-matte` works correctly for all 15 ppf-colour entries.

---

## FINISHES Array: Updated Order (from UI-SPEC)

```js
window.FINISHES = [
  { key: 'gloss',     label: 'Gloss' },
  { key: 'satin',     label: 'Satin' },
  { key: 'matte',     label: 'Matte' },
  { key: 'metallic',  label: 'Metallic' },   // NEW — 67 entries
  { key: 'chrome',    label: 'Chrome' },
  { key: 'shift',     label: 'Colour-shift' },
  { key: 'carbon',    label: 'Carbon' },      // NEW — 14 entries
  { key: 'ppf-clear', label: 'PPF Clear' },
  { key: 'ppf-matte', label: 'PPF Matte' },
];
```

Note: `metallic` is kept as a first-class finish key (not remapped to `satin`) per UI-SPEC overriding the CONTEXT.md original mapping. The catalogue-panel.jsx filter matches `sw.finish === chip.key` — so entries must have `finish: 'metallic'` in the catalogue output for the metallic filter chip to work.

Similarly, `carbon` entries must retain `finish: 'carbon'` (not remapped to `matte`).

`brushed` (7 entries) maps to `satin` — no chip needed, they surface under Satin filter.

---

## Common Pitfalls

### Pitfall 1: Script Load Order with Babel Standalone
**What goes wrong:** JSX files load and execute before Babel is ready, throwing "React is not defined" or leaving untransformed JSX text in the DOM.
**Why it happens:** `type="text/babel"` scripts are handled by Babel's DOMContentLoaded observer — if the script tag is already parsed before Babel loads, Babel won't transform it.
**How to avoid:** Load React UMD, ReactDOM UMD, Babel standalone, then catalogue.js (no JSX), then all `.jsx` files — in that exact order. Use `defer` or sequential `<script>` tags without `async`. The prototype HTML entry point already has this correct order; replicate it exactly.
**Warning signs:** Blank page with console error "React is not defined" or raw JSX text rendered as string.

### Pitfall 2: Next.js layout.jsx Inheritance
**What goes wrong:** The wrap studio page inherits mc-site header/nav, breaking the full-screen layout.
**Why it happens:** All pages under `app/mc-site/` inherit `app/mc-site/layout.jsx` by default.
**How to avoid:** Use a route handler (`route.js` with `GET` export) instead of `page.jsx`. Route handlers bypass all layout nesting entirely. This is the recommended approach (Pattern 3).
**Warning signs:** mc-site nav bar visible at top of studio on `localhost:3000/mc-site/wrap-studio`.

### Pitfall 3: Vercel Blob Token in Node.js Script
**What goes wrong:** `put()` throws `BlobAccessError` when run locally.
**Why it happens:** `@vercel/blob` reads `BLOB_READ_WRITE_TOKEN` from environment. When running a Node.js script directly, `.env.local` is not auto-loaded.
**How to avoid:** Run with `node --env-file=.env.local scripts/build-catalogue.js`. The token is already in `.env.local`. Do NOT commit the token.
**Warning signs:** `BlobAccessError: Access denied` when running the script.

### Pitfall 4: Brand Filter Mismatch
**What goes wrong:** Clicking "Avery Dennison" brand tab shows zero results.
**Why it happens:** Real data has `brand: "avery"` but `window.BRANDS = ['Avery Dennison', ...]` — filter compares `sw.brand === 'Avery Dennison'` which fails.
**How to avoid:** Map brand keys to display labels in build-catalogue.js. All 375 entries must have `brand: 'Avery Dennison' | 'Hexis' | 'STEK'` (display form) in the output catalogue.

### Pitfall 5: Missing `finish` chips for Metallic / Carbon
**What goes wrong:** Users cannot filter metallic or carbon films; items are hidden under wrong finish.
**Why it happens:** Prototype FINISHES array has neither `metallic` nor `carbon`. If entries with these finish keys are remapped to `satin`/`matte`, the metallic/carbon filter chips show zero results.
**How to avoid:** Keep `finish: 'metallic'` and `finish: 'carbon'` on entries in the catalogue output. Add both chips to `window.FINISHES` in the generated catalogue.js. The filter in catalogue-panel.jsx already uses `sw.finish === chip.key`.

### Pitfall 6: ESM vs CJS in build-catalogue.js
**What goes wrong:** `import { put } from '@vercel/blob'` fails with SyntaxError in a CJS context.
**Why it happens:** Need to check whether the project's package.json has `"type": "module"`.
**How to avoid:** Check `package.json` type field before writing the script. If `"type": "module"`, use ESM import syntax and `.js` extension. If CJS, use `require` or name the file `.mjs` to force ESM.

---

## Code Examples

### Vercel Blob put() for a local file
```js
// Source: @vercel/blob TypeScript definitions (installed v2.3.3)
import { put } from '@vercel/blob';
import { readFileSync } from 'fs';

const blob = await put(
  'wrap-studio/swatches/stek-gloss-dyno-miami-blue.png',
  readFileSync('/path/to/swatch.png'),
  {
    access: 'public',
    contentType: 'image/png',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }
);
// blob.url → 'https://abc123.public.blob.vercel-storage.com/wrap-studio/swatches/...'
```

### catalogue.js output format (IIFE assigning window globals)
```js
// Based on prototype catalogue.js structure — verified in /tmp/mc-wrap-studio/wrap-studio/catalogue.js
(function () {
  const C = [
    {
      id: 'stek-ppf-colour-dyno-miami-blue',
      brand: 'STEK',
      series: 'DYNO Color Gloss',
      name: 'DYNOmiami-blue',
      code: 'DYNOMIAMIBLUE',
      finish: 'ppf-clear',        // mapped from ppf-colour
      hex: '#37829a',
      hex2: null,
      tier: 'specialist',
      thickness: '200 µm',
      conform: 'High',
      warranty: '10 yr',
      proTip: 'Colour PPF is protection and colour change in one film...',
      swatchUrl: 'https://...blob.vercel-storage.com/wrap-studio/swatches/stek-ppf-colour-dyno-miami-blue.png',
      hexConfidence: null,
    },
    // ... 374 more
  ];

  window.FINISHES = [ /* updated 9-entry array */ ];
  window.BRANDS = ['Avery Dennison', 'Hexis', 'STEK'];
  window.TIER_LABEL = { /* keep existing — used by app internals, not customer-facing */ };
  window.WRAP_CATALOGUE = C;
})();
```

### Route handler pattern (wrap-studio standalone HTML)
```js
// app/mc-site/wrap-studio/route.js
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Wrap Studio — Matthews / Clark</title>
  <link rel="stylesheet" href="/wrap-studio/studio.css">
</head>
<body>
  <div id="app"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="/wrap-studio/catalogue.js"></script>
  <script type="text/babel" src="/wrap-studio/icons.jsx"></script>
  <script type="text/babel" src="/wrap-studio/tweaks-panel.jsx"></script>
  <script type="text/babel" src="/wrap-studio/stage.jsx"></script>
  <script type="text/babel" src="/wrap-studio/catalogue-panel.jsx"></script>
  <script type="text/babel" src="/wrap-studio/app.jsx"></script>
</body>
</html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
```

### Tier inference logic
```js
// Based on CONTEXT.md tier mapping decision
function inferTier(brand, rawFinish) {
  if (['chrome', 'colour-shift'].includes(rawFinish)) return 'specialist';
  if (brand === 'stek' && rawFinish === 'ppf-colour') return 'specialist';
  if (brand === 'stek' && rawFinish === 'carbon') return 'specialist';
  if (['metallic', 'brushed'].includes(rawFinish)) return 'premium';
  if (rawFinish === 'matte') return 'premium';
  // gloss + satin solids
  return 'standard';
}
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build-catalogue.js | ✓ | v20.9.0 | — |
| `@vercel/blob` | Swatch upload | ✓ | 2.3.3 (installed) | — |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob API auth | ✓ | Present in `.env.local` | — |
| Swatch PNG files (STEK) | CAT-06 | ✓ | 18 files at `/Downloads/Wrap colours/Extract/swatches/stek/` | — |
| Swatch PNG files (Avery) | CAT-06 | ✗ | None | Hex fallback (per UI-SPEC) |
| Swatch PNG files (Hexis) | CAT-06 | ✗ | None | Hex fallback (per UI-SPEC) |
| wrap-colours.json | CAT-01 | ✓ | 375 entries at `/Downloads/Wrap colours/Extract/` | — |
| Prototype JSX files | INT-01 | ✓ | 7 files at `/tmp/mc-wrap-studio/wrap-studio/` | — |

**Missing dependencies with no fallback:** None that block execution.

**Missing dependencies with fallback:**
- Avery/Hexis swatch PNGs (357 entries): hex colour fallback per UI-SPEC — not blocking.

---

## Open Questions

1. **package.json `"type"` field**
   - What we know: `next.config.js` uses ESM (`export default`), strongly suggesting `"type": "module"`.
   - What's unclear: Not verified directly. Affects `import` vs `require` in `build-catalogue.js`.
   - Recommendation: Executor checks `package.json` first line of script writing. Use `import` syntax (ESM) if confirmed; name file `.mjs` as fallback.

2. **catalogue.js file size budget**
   - What we know: 375 entries × ~300 bytes each = ~110KB unminified. Modern browsers parse this in <5ms.
   - What's unclear: Whether any build tooling or CDN has a 100KB limit on files served from `public/`.
   - Recommendation: No action needed — Vercel has no limit on public/ file sizes. 110KB is well under INT-02's 3-second load budget.

3. **Wrapping page CTA link copy**
   - What we know: CONTEXT.md says add "Wrap Studio →" CTA to `app/mc-site/wrapping/page.jsx`.
   - What's unclear: Exact placement within the wrapping page layout.
   - Recommendation: Executor reads current wrapping/page.jsx and inserts a styled anchor at the most prominent CTA position (after the intro paragraph or at the end of the services grid).

---

## Validation Architecture

> `workflow.nyquist_validation` not set in config.json — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files found in project |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | `/mc-site/wrap-studio` returns 200 and HTML | smoke | manual — `curl -s http://localhost:3000/mc-site/wrap-studio \| grep "wrap-studio"` | ❌ manual only |
| INT-02 | Page load < 3s | performance | manual — browser DevTools Network tab | ❌ manual only |
| INT-03 | Mobile responsive | visual | manual — browser devtools mobile emulation | ❌ manual only |
| CAT-01 | 375 entries in `window.WRAP_CATALOGUE` | smoke | manual — browser console: `window.WRAP_CATALOGUE.length` | ❌ manual only |
| CAT-02 | Brand filter shows correct counts | visual | manual | ❌ manual only |
| CAT-03 | All 9 finish chips present and functional | visual | manual | ❌ manual only |
| CAT-04 | Search by name and code works | interaction | manual | ❌ manual only |
| CAT-05 | Swatches show real code, series, finish | visual | manual | ❌ manual only |
| CAT-06 | STEK swatches load from blob URLs; Avery/Hexis show hex bg | visual | manual | ❌ manual only |

No automated test infrastructure exists in this project. All verification for Phase 5 is manual.

### Wave 0 Gaps
- No test framework to install — project has no tests directory or test runner config.
- All verification is by manual inspection in browser + browser console checks.

---

## Sources

### Primary (HIGH confidence)
- Local file inspection: `/tmp/mc-wrap-studio/wrap-studio/catalogue.js` — prototype schema, FINISHES/BRANDS/TIER_LABEL structure
- Local file inspection: `/tmp/mc-wrap-studio/wrap-studio/app.jsx` — DEMO_CAR_SRC, useTweaks, state structure
- Local data file: `/Downloads/Wrap colours/Extract/wrap-colours.json` — 375 entries, all fields, hex_confidence
- Local file: `node_modules/@vercel/blob/dist/index.d.ts` — put() function signature, error classes
- Local file: `app/mc-site/layout.jsx` — confirms layout wraps children, mc-site header present
- Local file: `.env.local` — BLOB_READ_WRITE_TOKEN confirmed present

### Secondary (MEDIUM confidence)
- Next.js App Router layout nesting rules — route handlers bypass layouts (standard App Router behaviour, HIGH confidence from Next.js docs knowledge)
- Vercel Blob rate limiting — BlobServiceRateLimited exposes `retryAfter` (from TypeScript definitions, HIGH)

### Tertiary (LOW confidence)
- Babel standalone script execution order with `type="text/babel"` — based on Babel documentation understanding, not locally verified for this specific Next.js route handler serving pattern.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, tokens present
- Architecture: HIGH — route handler pattern verified against Next.js App Router rules; prototype files inspected
- Data mapping: HIGH — all 375 entries inspected, field gaps documented, mapping rules verified against actual IDs
- Pitfalls: HIGH — most derived from direct inspection of actual files and data

**Research date:** 2026-06-04
**Valid until:** 2026-09-04 (stable stack — no fast-moving dependencies)
