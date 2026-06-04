import { removeBackground } from '@imgly/background-removal-node';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type || 'image/jpeg' });

    const resultBlob = await removeBackground(blob);
    const resultBuffer = await resultBlob.arrayBuffer();

    return new Response(resultBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(resultBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error('[wrap-remove-bg] error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Background removal failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
