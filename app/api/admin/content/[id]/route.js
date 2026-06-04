import { cookies } from 'next/headers';
import { z } from 'zod';

import { adminCookieName, verifyAdminSession } from '@/lib/adminAuth';
import { getPost, updatePost, deletePost } from '@/lib/contentStore';

export const runtime = 'nodejs';

const PatchBodySchema = z.object({
  status: z.enum(['pending', 'processing', 'published', 'failed']).optional(),
  scheduledAt: z.string().optional(),
  caption: z.string().max(2200).optional(),
  hashtags: z.string().max(2200).optional(),
  platforms: z.array(z.enum(['instagram', 'tiktok'])).optional(),
  igContainerId: z.string().nullable().optional(),
  igMediaId: z.string().nullable().optional(),
  igError: z.string().nullable().optional(),
  retryCount: z.number().int().min(0).optional(),
  qualityResult: z.any().optional()
});

async function requireAdmin() {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  return session;
}

export async function GET(request, { params }) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const id = params?.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  try {
    const post = await getPost(id);
    if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ok: true, post });
  } catch (err) {
    console.error('[admin][content][get]', err);
    return Response.json({ error: 'Failed to load post' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const id = params?.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const raw = await request.json().catch(() => null);
  const parsed = PatchBodySchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: 'Invalid body' }, { status: 400 });

  // Retry helper: if status=pending and igError not explicitly set, clear igError too.
  const patch = { ...parsed.data };
  if (patch.status === 'pending' && !('igError' in patch)) patch.igError = null;
  if (patch.status === 'pending' && !('igContainerId' in patch)) patch.igContainerId = null;

  try {
    const existing = await getPost(id);
    if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });
    const post = await updatePost(id, patch);
    return Response.json({ ok: true, post });
  } catch (err) {
    console.error('[admin][content][patch]', err);
    return Response.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await requireAdmin();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const id = params?.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  try {
    const result = await deletePost(id);
    if (!result?.ok) return Response.json({ error: result?.error || 'Delete failed' }, { status: 500 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[admin][content][delete]', err);
    return Response.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
