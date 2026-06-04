---
plan: 01-06
status: complete
commit: a349000
---

# Plan 01-06 Summary — Post Creation Form

## What was built

Three files were created/modified:

1. **`app/(crm)/admin/(protected)/kit/screens-content-new.jsx`** — Full post creation form component (`ContentNewScreen`)
2. **`app/(crm)/admin/(protected)/kit/screens-content-new.module.css`** — CSS module matching UI-SPEC values
3. **`app/(crm)/admin/(protected)/kit/app.jsx`** — Two surgical edits: import + route dispatch

## POST body sent to /api/admin/content

```json
{
  "scheduledAt": "<ISO 8601 datetime string>",
  "platforms": ["instagram"],
  "caption": "<string>",
  "hashtags": "<string>",
  "videoUrl": "<Vercel Blob public URL>",
  "videoBlobPath": "<blob pathname or null>",
  "scriptPdfUrl": "<Vercel Blob URL or null>",
  "qualityResult": { "status": "optimised|warn", "checks": {...} } | null
}
```

`qualityResult` is `null` when the quality check is still in-flight ("Checking…") or if the user submits before the check completes — matching Plan 04's `CreateBodySchema` which marks `qualityResult` as optional.

## Quality check: async / non-blocking

The quality check is fired-and-forgotten immediately after the Vercel Blob upload completes (`runQualityCheck(blob.url)` is called but not awaited in `handleVideoFile`). The `canSubmit` guard only requires `videoBlob?.url` and `scheduledAt` — it does NOT gate on `quality` state. This means:

- User can submit while quality is `"checking"` → `qualityResult` sent as `null`
- User can submit if quality `"failed"` → `qualityResult` sent as `null`
- User can submit with a warn result → `qualityResult` sent with `{ status: "warn", checks: {...} }`
- TikTok toggle is rendered but `disabled` with `title="TikTok posting coming soon"`; `platforms` is always `["instagram"]` in the POST body

## Blob path prefixes

- Video uploads: `social-videos/<timestamp>-<sanitised-filename>`
- PDF script uploads: `social-scripts/<timestamp>-<sanitised-filename>`

Both use `handleUploadUrl: "/api/admin/content/upload-token"` (Plan 03's server-side token endpoint) with `access: "public"`.

## Acceptance criteria: all passed

All 19 Task 1 grep checks, all 13 Task 2 CSS checks, and all 5 Task 3 app.jsx checks passed before commit.
