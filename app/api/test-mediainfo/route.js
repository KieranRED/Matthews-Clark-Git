import mediaInfoFactory from 'mediainfo.js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEFAULT_TEST_URL = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || DEFAULT_TEST_URL;
  const t0 = Date.now();
  let mediainfo = null;
  try {
    const videoRes = await fetch(url);
    if (!videoRes.ok) {
      return Response.json({ ok: false, error: 'fetch failed', status: videoRes.status, url }, { status: 502 });
    }
    const buffer = await videoRes.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    mediainfo = await mediaInfoFactory({ format: 'object' });
    const result = await mediainfo.analyzeData(
      () => uint8.byteLength,
      (chunkSize, offset) => uint8.slice(offset, offset + chunkSize)
    );
    const videoTrack = result?.media?.track?.find((t) => t['@type'] === 'Video') || null;
    return Response.json({
      ok: true,
      url,
      durationMs: Date.now() - t0,
      trackCount: result?.media?.track?.length || 0,
      videoTrack
    });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || String(err), durationMs: Date.now() - t0, url }, { status: 500 });
  } finally {
    try { mediainfo?.close?.(); } catch {}
  }
}
