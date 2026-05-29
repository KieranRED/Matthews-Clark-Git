import { handleUpload } from '@vercel/blob/client';
import { cookies } from 'next/headers';
import { adminCookieName, verifyAdminSession } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'application/pdf'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ username: session.username || session.user || 'admin' })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // onUploadCompleted does NOT fire locally without ngrok — see RESEARCH Pitfall 3.
        // The quality check is triggered by the client AFTER upload() resolves, not from here.
        console.log('[content][upload-complete]', blob?.url || blob?.pathname);
      }
    });
    return Response.json(jsonResponse);
  } catch (err) {
    console.error('[admin][content][upload-token]', err);
    return Response.json({ error: err?.message || 'upload-token failed' }, { status: 400 });
  }
}
