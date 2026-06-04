# Phase 5: Integration & Catalogue — Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate the existing design system prototype into the Next.js repo at `app/mc-site/wrap-studio/`, replace the demo catalogue with real data for all 375 wrap films (Avery 152 + Hexis 197 + STEK 26), upload swatch images to Vercel Blob, and ensure the studio is fully browsable with brand/finish/search filtering.

This phase does NOT include:
- Background removal (Phase 6)
- GPT render (Phase 7)
- Quote submission wiring (Phase 8)

</domain>

<decisions>
## Implementation Decisions

### Route & URL
- Route: `app/mc-site/wrap-studio/route.js` (GET handler returning raw HTML Response) → URL `/mc-site/wrap-studio`
- **Override from original decision**: route.js is used instead of page.jsx — the only reliable way to bypass mc-site layout nesting. page.jsx cannot escape parent layouts without an additional layout.jsx override that has caveats (confirmed in RESEARCH.md). User confirmed 2026-06-04.
- Full-screen standalone — does NOT use the mc-site header/nav
- Add a "Wrap Studio →" CTA link to `app/mc-site/wrapping/page.jsx`

### Serving the Design System
- Copy all 7 prototype files from `/tmp/mc-wrap-studio/wrap-studio/` into `public/wrap-studio/`
  - app.jsx, catalogue-panel.jsx, catalogue.js, icons.jsx, stage.jsx, studio.css, tweaks-panel.jsx
- route.js GET handler returns the HTML shell with `<script src="/wrap-studio/app.jsx">` etc
- The demo car image (`_DEMO-car-REMOVE-BEFORE-PROD.png`) is intentionally NOT copied — set DEMO_CAR_SRC = null in app.jsx
- Babel standalone transforms the JSX files client-side (already wired in the HTML entry point)

### Catalogue Data
- Write a Node.js script `scripts/build-catalogue.mjs` (ESM — project has `"type": "module"`) that:
  1. Reads `/Users/kieranredpath/Downloads/Wrap\ colours/Extract/wrap-colours.json`
  2. Maps each entry to the prototype's schema (brand, series, name, code, hex, hex2, finish, tier, thickness, conform, warranty, proTip)
  3. Uploads each swatch PNG to Vercel Blob using `@vercel/blob` put()
  4. Embeds the resulting blob URLs as `swatchUrl` on each entry
  5. Outputs `public/wrap-studio/catalogue.js` as a self-executing script assigning `window.WRAP_CATALOGUE`
- Script is run once locally before deploying; output committed to repo

### Finish Key Mapping (from real data → prototype keys)
Real data `finish` → prototype `finish`:
- `gloss` → `gloss`
- `satin` → `satin`
- `matte` → `matte`
- `chrome` → `chrome`
- `colour-shift` → `shift`
- `metallic` → `metallic` (kept as first-class finish key — UI-SPEC specifies a separate Metallic filter chip. Override confirmed 2026-06-04.)
- `brushed` → `satin`
- `carbon` → `carbon` (kept as first-class finish key — UI-SPEC specifies a separate Carbon filter chip)
- `ppf-colour`: check slug — if contains "matte" → `ppf-matte`, else → `ppf-clear`
- `ppf-clear` → `ppf-clear`
- `ppf-matte` → `ppf-matte`

Add `metallic` as a separate FINISHES entry in catalogue-panel.jsx for better UX (user explicitly wants to filter metallics).

### Tier Mapping (inferred)
- Avery gloss/satin (non-metallic, non-shift) → `standard`
- Avery/Hexis metallic, satin metallic, matte → `premium`
- Chrome, colour-shift, STEK PPF colour → `specialist`
- Hexis solid gloss/satin → `standard`
- STEK carbon/pattern → `specialist`

### Quote Flow — IMPORTANT
- **Remove all tier/pricing labels from the quote modal and catalogue panel** — customer NEVER sees "Standard / Premium / Specialist" tier names or price guidance
- The "Get a quote" CTA opens a simple lead form: name, car (make/model/year), WhatsApp/phone, notes
- No price estimates shown — M&C quotes fixed price directly

### FINISHES array update
Add `{ key: 'metallic', label: 'Metallic' }` to the window.FINISHES array in catalogue.js so metallics can be filtered.

### Pro Tips
Add finish-specific proTip strings for key real-data entries:
- Matte films: "Matte films show every prep imperfection. We decontaminate and inspect before a single panel is laid."
- Chrome: "Chrome needs a primer on the edges and is unforgiving on complex curves. Full-car chrome is a specialist job — we quote it honestly."
- Colour-shift: "Colour-shift reads differently from every angle. Bring the car in to see the full flip before you commit."
- STEK PPF colour: "Colour PPF is protection and colour change in one film — thicker and more durable than vinyl, priced to match."

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/mc-site/wrapping/page.jsx` — existing wrapping page to receive the CTA button
- `app/mc-site/layout.jsx` — mc-site layout (wrap-studio page.jsx bypasses this with its own full-screen layout)
- `next.config.js` — already has WASM support pattern (useful for Phase 6)
- `lib/leadStore.js` — existing lead store (used in Phase 8)

### Established Patterns
- mc-site pages are React server components exporting `metadata` + default function
- Public assets referenced by root-relative URLs (e.g. `/site/media/garage.jpg`)
- `next.config.js` uses `serverExternalPackages` for native modules

### Integration Points
- New route: `app/mc-site/wrap-studio/route.js` (GET handler)
- New static assets: `public/wrap-studio/` (JS, CSS, catalogue.js)
- Script to run: `scripts/build-catalogue.mjs`
- Link added to: `app/mc-site/wrapping/page.jsx`

</code_context>

<specifics>
## Specific Ideas

- Swatch images → Vercel Blob (not public/ directory)
- Quote CTA: no pricing shown, just a lead form
- DEMO_CAR_SRC must be set to null — demo car image is not for production
- The `/mc-site/wrap-studio` URL not `/wrap-studio`
- `metallic` as a separate filterable finish type

</specifics>

<deferred>
## Deferred Ideas

- Nicer navigation integration with the rest of the mc-site (mentioned by user — Phase 9 or later)
- Studio backgrounds from real M&C bay photos (mentioned in REQUIREMENTS.md future section)
- Admin analytics for most-browsed colours (future milestone)

</deferred>
