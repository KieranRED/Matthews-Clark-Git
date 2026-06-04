---
plan: 01-05
status: complete
commit: fcbed3c
---

# Summary: Content Queue Screen + Shell Nav Wiring

## What was built

Three files modified, two files created.

## shell.jsx edits (6 surgical edits)

**EDIT 1 — parsePath:** Two new routes inserted before the `pricing` guard:
```js
if (slug[0] === "content" && slug[1] === "new") return { name: "content-new", params: {} };
if (slug[0] === "content") return { name: "content", params: {} };
```
Note: `content-new` must be checked before `content` (specificity order).

**EDIT 2 — TopBar signature:** Added `onSettings` to destructured props.

**EDIT 3 — isRoot + crumbs:** Added `"content"` to the isRoot array (so M&C mark + breadcrumb renders, not back button). `content-new` is intentionally NOT in isRoot — back button mode is correct for the new-post screen. Added title/crumbs blocks after the pricing block:
- `content` → title: "Content", crumbs: "SOCIAL · QUEUE"
- `content-new` → title: "New Post", crumbs: "SOCIAL · NEW POST"

**EDIT 4 — TopBar right div:** Third icon button added after Activity bell:
```jsx
<button className="icon-btn" title="Settings" aria-label="Open settings" onClick={onSettings}>
  <Icon.set />
</button>
```
This replaces the lost Settings bottom-nav slot for M&C users.

**EDIT 5 — BottomNav M&C items:** Slot 5 swapped from Settings to Content:
```js
{ id: "content", label: "Content", href: "/admin/content", ic: <Icon.cam /> }
```
Izimoto items array is UNCHANGED (Settings stays for Izimoto users).

**EDIT 6 — activeMap:** Two entries added:
```js
content: "content",
"content-new": "content"
```
Both content routes highlight the Content nav item. `settings: "settings"` left intact for Izimoto.

## app.jsx edits (3 surgical edits)

- Added `import ContentScreen from "./screens-content"` after the PricingScreen import.
- Added `if (route.name === "content") body = <ContentScreen />;` after the pricing dispatch line.
- Added `onSettings={() => router.push("/admin/settings")}` to the TopBar invocation.
- Global FAB (`["dashboard", "leads", "clients"]`) left UNCHANGED — content gets its own FAB inside the screen.

**Note for Plan 06:** Plan 06 must add to app.jsx:
1. `import ContentNewScreen from "./screens-content-new";`
2. `if (route.name === "content-new") body = <ContentNewScreen />;`

## screens-content.jsx — CSS variables used

The screen uses only global crm-kit.css variables and classes — no local overrides needed for layout:

| Variable | Used for |
|---|---|
| `--nav-h` | bottom padding so content scrolls above nav |
| `--bg-2` | card background (default + empty state) |
| `--bd-1` | card border + section fallback border |
| `--bd-2` | retry button border |
| `--fg-3` | muted text (scheduledAt, TT badge, published section header) |
| `--font-mono` | JetBrains Mono — section headers, badges, quality tags, retry button |
| `--font-sans` | Inter Tight — caption, error text, empty body |
| `--font-ui` | Archivo — empty state headline |

Global CSS classes used from crm-kit.css: `.screen`, `.greeting`, `.eyebrow`, `.sub`, `.fab`.

Section colors (all hardcoded per UI-SPEC):
- Failed: `#EB5757` / `rgba(235, 87, 87, …)`
- Scheduled: `#4A78FF` / `rgba(74, 120, 255, …)`
- Processing: `#56CCF2` / `rgba(86, 204, 242, …)`
- Published: `var(--fg-3)` / `var(--bd-1)` (muted)

Quality tag colors: `#27AE60` (optimised), `#F2C94C` (warn), `var(--fg-3)` (checking, animated).

## screens-content.module.css — key classes for Plan 06 to mirror

- `.screen` — bottom padding pattern: `calc(var(--nav-h) + 96px)`
- `.sectionHd` — JetBrains Mono 10px 0.18em letter-spacing, left-border accent
- `.card` — 12px radius, 14px padding, `var(--bg-2)` base
- `.retryBtn` — 28px height, ghost pill, mono 10px uppercase
- `.contentFab` — `right: 14px; bottom: calc(var(--nav-h) + 28px)` (mirrors global .fab position)

## API contracts wired

- `GET /api/admin/content?limit=200` — fetched on mount + after retry
- `PATCH /api/admin/content/[id]` — body `{ status: "pending", retryCount: n }`, optimistic update + server reload
- `pending` status displays in the Scheduled section (per CONTEXT.md: pending IS the persisted state of scheduled posts before cron pickup)
