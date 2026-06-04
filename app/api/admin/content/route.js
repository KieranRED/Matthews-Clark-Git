import { cookies } from 'next/headers';
import { z } from 'zod';

import { adminCookieName, verifyAdminSession } from '@/lib/adminAuth';
import { savePost, listPosts } from '@/lib/contentStore';
import { extractPdfText } from '@/lib/pdfExtract';

export const runtime = 'nodejs';

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  status: z.string().trim().optional()
});

const CreateBodySchema = z.object({
  scheduledAt: z.string().min(1), // ISO datetime
  platforms: z.array(z.enum(['instagram', 'tiktok'])).min(1).default(['instagram']),
  caption: z.string().max(2200).default(''),
  hashtags: z.string().max(2200).default(''),
  videoUrl: z.string().url(),
  videoBlobPath: z.string().optional().nullable(),
  scriptPdfUrl: z.string().url().optional().nullable(),
  qualityResult: z
    .object({
      status: z.enum(['optimised', 'warn']),
      checks: z.object({
        codec: z.boolean(),
        resolution: z.boolean(),
        aspectRatio: z.boolean(),
        bitrate: z.boolean(),
        frameRate: z.boolean()
      })
    })
    .nullable()
    .optional()
});

function kvConfigured() {
  return (
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!kvConfigured()) return Response.json({ error: 'Content storage not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const parsed = ListQuerySchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    status: searchParams.get('status') ?? undefined
  });
  if (!parsed.success) return Response.json({ error: 'Invalid query' }, { status: 400 });

  try {
    const posts = await listPosts({ limit: parsed.data.limit, status: parsed.data.status });
    return Response.json({ ok: true, posts });
  } catch (err) {
    console.error('[admin][content][list]', err);
    return Response.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!kvConfigured()) return Response.json({ error: 'Content storage not configured' }, { status: 500 });

  const raw = await request.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid body', issues: parsed.error?.issues?.map((i) => ({ path: i.path, message: i.message })) },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Extract PDF text if provided (server-side, awaited so it's persisted with the post)
  let scriptText = null;
  if (data.scriptPdfUrl) {
    try {
      scriptText = await extractPdfText(data.scriptPdfUrl);
    } catch (err) {
      console.error('[admin][content][pdf]', err);
      scriptText = '';
    }
  }

  try {
    const post = await savePost({
      status: 'pending',
      scheduledAt: data.scheduledAt,
      platforms: data.platforms,
      caption: data.caption,
      hashtags: data.hashtags,
      videoUrl: data.videoUrl,
      videoBlobPath: data.videoBlobPath || null,
      scriptPdfUrl: data.scriptPdfUrl || null,
      scriptText,
      qualityResult: data.qualityResult || null
    });
    return Response.json({ ok: true, post }, { status: 201 });
  } catch (err) {
    console.error('[admin][content][create]', err);
    return Response.json({ error: 'Failed to save post' }, { status: 500 });
  }
}
