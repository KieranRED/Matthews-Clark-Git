---
plan: 01-03
status: complete
completed: 2026-05-29
---

# Plan 01-03 Summary: Upload Token, Quality Check, PDF Extract Endpoints

## What Was Built

Three server-side files that form the upload pipeline's server layer, consumed by Plans 04 (content CRUD API) and 06 (post creation UI).

---

## Module Contracts

### 1. `app/api/admin/content/upload-token/route.js`

**Export:** `POST` handler (Next.js App Router route)

**Auth:** Admin cookie required — mirrors `verifyAdminSession(token)` pattern from `lib/adminAuth.js`. Returns 401 if not authenticated.

**Request:** JSON body passed through from `@vercel/blob/client` internal protocol (the client's `upload()` call sends this automatically — callers do not construct it manually).

**Response:** JSON response from `handleUpload` (Vercel Blob token exchange protocol).

**Allowed content types:**
- `video/mp4`
- `video/quicktime`
- `application/pdf`

**Token payload:** `{ username: session.username }` — available in `onUploadCompleted` for audit logging.

**Usage (client side, Plan 06):**
```js
import { upload } from '@vercel/blob/client';
const blob = await upload(`social-videos/${file.name}`, file, {
  access: 'public',
  handleUploadUrl: '/api/admin/content/upload-token'
});
// blob.url → pass to quality-check endpoint
```

**Note:** `onUploadCompleted` is a no-op log locally (does not fire without ngrok). Quality check is triggered by the client explicitly after `upload()` resolves — not via this callback.

---

### 2. `app/api/admin/content/quality-check/route.js`

**Export:** `POST` handler (Next.js App Router route)

**Auth:** Admin cookie required. Returns 401 if not authenticated.

**Runtime config:**
- `export const runtime = 'nodejs'`
- `export const maxDuration = 30` (seconds)

**Request body:**
```json
{ "url": "https://..." }
```
Validated with zod: `z.object({ url: z.string().url() })`. Returns 400 on invalid body.

**Success response:**
```json
{
  "ok": true,
  "durationMs": 1234,
  "status": "optimised" | "warn",
  "checks": {
    "codec": true | false,
    "resolution": true | false,
    "aspectRatio": true | false,
    "bitrate": true | false,
    "frameRate": true | false
  },
  "videoTrack": { ... }
}
```

`status === 'optimised'` only when ALL five checks pass. Otherwise `'warn'`.

`videoTrack` is raw debug data from mediainfo.js — Plans 04/06 persist only `{ status, checks }`.

**Error responses:**
- `502` — could not fetch the video URL
- `500` — mediainfo.js analysis threw

**Quality check thresholds (UPLOAD-04):**

| Check | Field | Criterion |
|-------|-------|-----------|
| `codec` | `videoTrack.Format` | Must equal `'AVC'` (H.264) |
| `resolution` | `videoTrack.Width`, `videoTrack.Height` | Must be exactly `1080 × 1920` |
| `aspectRatio` | `videoTrack.DisplayAspectRatio` OR `width/height` | `DisplayAspectRatio === '0.562'` OR `Math.abs(width/height - 9/16) < 0.01` |
| `bitrate` | `videoTrack.BitRate` | `>= 4,000,000` AND `<= 50,000,000` (bps) — i.e. 4–50 Mbps |
| `frameRate` | `videoTrack.FrameRate` | One of: `'29.970'`, `'60.000'`, `'29.97'`, `'60'` |

**UI tag copy mapping:**
- All pass → "Optimised ✓" (`status: 'optimised'`)
- Any fail → "Check export ⚠" (`status: 'warn'`) with per-check breakdown

---

### 3. `lib/pdfExtract.js`

**Export:** `extractPdfText(url: string): Promise<string>`

**Behaviour:**
- Returns `''` immediately if `url` is falsy
- Fetches the PDF from `url`; returns `''` if fetch fails (`!res.ok`)
- Extracts full text via `unpdf` (`getDocumentProxy` + `extractText({ mergePages: true })`)
- Handles both `string` and `string[]` return shapes from unpdf
- Soft-fails to `''` on ANY exception (never throws)
- Always calls `pdf.destroy()` in finally block

**Usage (Plan 04 content POST handler):**
```js
import { extractPdfText } from '@/lib/pdfExtract';
// After PDF Blob upload completes:
const scriptText = await extractPdfText(scriptPdfUrl);
// scriptText is always a string (may be empty if PDF unreadable)
```

**Dependencies:** `unpdf` (installed: 1.6.2). No `serverExternalPackages` config needed — unpdf has zero native deps.

---

## Implementation Notes

- All three files pass `node --check` (ES module syntax, no runtime evaluation needed).
- No existing files were modified — only the three new files were created.
- The `quality-check` route requires `serverExternalPackages: ['mediainfo.js']` and `experimental.outputFileTracingIncludes` in `next.config.js` — these were added in Plan 01-01 (gating wave).
- `onUploadCompleted` in the upload-token route is intentionally a no-op log: Vercel Blob's webhook cannot reach `localhost` in dev (Pitfall 3 from RESEARCH.md). The client calls `/quality-check` explicitly.
