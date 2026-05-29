import { del, list } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const VIDEO_PREFIX = "social-videos/";

function isCronAuthorized(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = request.headers.get("authorization") || "";
  return got === `Bearer ${expected}`;
}

export async function GET(request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const cutoffMs = Date.now() - SEVEN_DAYS_MS;
  const toDelete = [];
  let scanned = 0;
  let cursor;

  try {
    // Paginate via cursor — list() returns up to `limit` blobs per call.
    do {
      const { blobs, cursor: nextCursor } = await list({
        prefix: VIDEO_PREFIX,
        limit: 1000,
        cursor
      });
      for (const blob of blobs || []) {
        scanned += 1;
        const uploaded = blob?.uploadedAt ? new Date(blob.uploadedAt).getTime() : 0;
        if (uploaded > 0 && uploaded < cutoffMs) {
          toDelete.push(blob.url);
        }
      }
      cursor = nextCursor;
    } while (cursor);

    if (toDelete.length > 0) {
      // del() accepts an array of URLs
      await del(toDelete);
    }

    return Response.json({
      ok: true,
      ranAt: new Date().toISOString(),
      prefix: VIDEO_PREFIX,
      scanned,
      deleted: toDelete.length,
      cutoff: new Date(cutoffMs).toISOString()
    });
  } catch (err) {
    console.error("[cron][blob-cleanup][fatal]", err);
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
