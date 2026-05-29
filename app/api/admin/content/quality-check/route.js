import { cookies } from 'next/headers';
import { z } from 'zod';
import mediaInfoFactory from 'mediainfo.js';
import { adminCookieName, verifyAdminSession } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({ url: z.string().url() });

function evaluateQuality(videoTrack) {
  if (!videoTrack) {
    return {
      status: 'warn',
      checks: { codec: false, resolution: false, aspectRatio: false, bitrate: false, frameRate: false }
    };
  }
  const width = Number(videoTrack.Width) || 0;
  const height = Number(videoTrack.Height) || 0;
  const bitRate = Number(videoTrack.BitRate) || 0;
  const frameRateStr = String(videoTrack.FrameRate || '');
  const checks = {
    codec: videoTrack.Format === 'AVC',
    resolution: width === 1080 && height === 1920,
    aspectRatio:
      videoTrack.DisplayAspectRatio === '0.562' ||
      (width > 0 && height > 0 && Math.abs(width / height - 9 / 16) < 0.01),
    bitrate: bitRate >= 4_000_000 && bitRate <= 50_000_000,
    frameRate: ['29.970', '60.000', '29.97', '60'].includes(frameRateStr)
  };
  const allPass = Object.values(checks).every(Boolean);
  return { status: allPass ? 'optimised' : 'warn', checks };
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: 'Invalid body: expect { url }' }, { status: 400 });

  const { url } = parsed.data;
  const t0 = Date.now();
  let mediainfo = null;
  try {
    const videoRes = await fetch(url);
    if (!videoRes.ok) {
      return Response.json({ ok: false, error: 'fetch failed', status: videoRes.status }, { status: 502 });
    }
    const buffer = await videoRes.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    mediainfo = await mediaInfoFactory({ format: 'object' });
    const result = await mediainfo.analyzeData(
      () => uint8.byteLength,
      (chunkSize, offset) => uint8.slice(offset, offset + chunkSize)
    );
    const videoTrack = result?.media?.track?.find((t) => t['@type'] === 'Video') || null;
    const quality = evaluateQuality(videoTrack);
    return Response.json({
      ok: true,
      durationMs: Date.now() - t0,
      status: quality.status,
      checks: quality.checks,
      videoTrack
    });
  } catch (err) {
    console.error('[admin][content][quality-check]', err);
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  } finally {
    try { mediainfo?.close?.(); } catch {}
  }
}
