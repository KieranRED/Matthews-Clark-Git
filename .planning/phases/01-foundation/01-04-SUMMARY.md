---
phase: 01-foundation
plan: 04
status: complete
---

# 01-04 SUMMARY — Admin CRUD API for Content Posts

## Files created

- `app/api/admin/content/route.js` — GET (list) + POST (create)
- `app/api/admin/content/[id]/route.js` — GET (single) + PATCH (update/retry) + DELETE

---

## Endpoint contracts

### GET /api/admin/content

List all posts, sorted by `updatedAt` descending. Admin-authenticated.

**Query params**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `limit` | integer 1–200 | 100 | Max posts to return |
| `status` | string | — | Filter by status (e.g. `pending`, `failed`) |

**Response 200**
```json
{
  "ok": true,
  "posts": [
    {
      "id": "uuid",
      "status": "pending | processing | published | failed",
      "scheduledAt": "2026-06-01T10:00:00.000Z",
      "platforms": ["instagram"],
      "caption": "...",
      "hashtags": "...",
      "videoUrl": "https://...",
      "videoBlobPath": null,
      "scriptPdfUrl": null,
      "scriptText": null,
      "qualityResult": null,
      "igContainerId": null,
      "igMediaId": null,
      "igError": null,
      "retryCount": 0,
      "createdAt": "2026-05-29T12:00:00.000Z",
      "updatedAt": "2026-05-29T12:00:00.000Z"
    }
  ]
}
```

**Error responses**: 401 Unauthorized, 400 Invalid query, 500 Storage not configured / Failed to load.

---

### POST /api/admin/content

Create a new post. PDF text extraction runs server-side if `scriptPdfUrl` is provided.

**Request body (JSON)**
```json
{
  "scheduledAt": "2026-06-01T10:00:00.000Z",   // required, ISO datetime
  "platforms": ["instagram"],                    // required, min 1; "instagram" | "tiktok"
  "videoUrl": "https://...",                     // required, URL
  "caption": "",                                 // optional, max 2200 chars
  "hashtags": "",                                // optional, max 2200 chars
  "videoBlobPath": null,                         // optional
  "scriptPdfUrl": null,                          // optional — triggers server-side PDF extraction
  "qualityResult": {                             // optional
    "status": "optimised | warn",
    "checks": {
      "codec": true,
      "resolution": true,
      "aspectRatio": true,
      "bitrate": true,
      "frameRate": true
    }
  }
}
```

**Response 201**
```json
{
  "ok": true,
  "post": { /* full post record — same shape as GET list item */ }
}
```

**Error responses**: 401 Unauthorized, 400 Invalid body (includes `issues` array), 500.

---

### GET /api/admin/content/[id]

Fetch a single post by ID.

**Response 200**
```json
{ "ok": true, "post": { /* full post record */ } }
```

**Error responses**: 401, 400 Missing id, 404 Not found, 500.

---

### PATCH /api/admin/content/[id]

Merge-update a post. All fields are optional.

**Request body (JSON)** — all fields optional
```json
{
  "status": "pending | processing | published | failed",
  "scheduledAt": "ISO datetime",
  "caption": "...",
  "hashtags": "...",
  "platforms": ["instagram"],
  "igContainerId": "...",
  "igMediaId": "...",
  "igError": "...",
  "retryCount": 1,
  "qualityResult": { ... }
}
```

**Response 200**
```json
{ "ok": true, "post": { /* updated post record */ } }
```

**Error responses**: 401, 400 Missing id / Invalid body, 404 Not found, 500.

---

### DELETE /api/admin/content/[id]

Delete a post and remove it from all indexes.

**Response 200**
```json
{ "ok": true }
```

**Error responses**: 401, 400 Missing id, 500.

---

## Retry contract

The queue UI's Retry button only needs to send:

```json
PATCH /api/admin/content/[id]
{ "status": "pending", "retryCount": <post.retryCount + 1> }
```

When `status: "pending"` is patched **without** explicitly setting `igError` or `igContainerId`, both fields are **automatically cleared to `null`** by the route handler. This ensures the Instagram publisher starts fresh without the queue screen needing to know about IG internals.

The `retryCount` increment is the caller's responsibility (so the queue can display it), but it is not required — omitting it is safe.

---

## PDF extraction

`POST /api/admin/content` calls `extractPdfText(scriptPdfUrl)` server-side and stores the result in `scriptText` on the saved post record. The client never needs to extract PDF text itself. On extraction failure, `scriptText` is stored as `""` (empty string) rather than blocking post creation.

---

## Dependencies

| Import | Provided by |
|--------|-------------|
| `savePost`, `listPosts` | `lib/contentStore.js` (Plan 01-01) |
| `getPost`, `updatePost`, `deletePost` | `lib/contentStore.js` (Plan 01-01) |
| `extractPdfText` | `lib/pdfExtract.js` (Plan 01-03) |
| `adminCookieName`, `verifyAdminSession` | `lib/adminAuth.js` (existing) |

## Consumers

- **Plan 01-05** (queue screen) — calls `GET /api/admin/content` to render the post list, and `PATCH /api/admin/content/[id]` for the Retry button
- **Plan 01-06** (creation form) — calls `POST /api/admin/content` on form submit
