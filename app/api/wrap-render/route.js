import { OpenAI, toFile } from 'openai';
import { hasKv, kvGet, kvIncr, kvExpire } from '@/lib/kv';

export const runtime = 'nodejs';        // required — OpenAI SDK uses Node APIs
export const maxDuration = 60;          // GPT-Image-1 edit takes 15-50s

const DAILY_CAP = 10;                   // per IP per day

export async function POST(request) {
  // 1. Rate limit (RENDER cost control)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  const rateKey = `wrap-render-count:${ip}:${today}`;

  if (hasKv()) {
    let count = 0;
    try { count = Number(await kvGet(rateKey)) || 0; } catch { count = 0; }
    if (count >= DAILY_CAP) {
      return Response.json({ ok: false, error: 'rate_limit' }, { status: 429 });
    }
    try {
      await kvIncr(rateKey);
      if (count === 0) await kvExpire(rateKey, 90000); // 25h TTL so counter resets daily
    } catch { /* non-fatal — do not block render */ }
  }

  // 2. Parse multipart body
  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ ok: false, error: 'invalid' }, { status: 400 }); }

  const imageFile = formData.get('image');
  const finish = String(formData.get('finish') || 'gloss');
  const colourName = String(formData.get('colourName') || 'wrap');
  if (!imageFile || typeof imageFile === 'string') {
    return Response.json({ ok: false, error: 'no_image' }, { status: 400 });
  }

  // 3. OpenAI images.edit — gpt-image-1 (exact string; gpt-image-2 does not exist)
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const buffer = Buffer.from(await imageFile.arrayBuffer());
  const image = await toFile(buffer, 'composite.png', { type: 'image/png' });

  const prompt =
    `Professional automotive studio photograph. The car shown has a ${finish} ${colourName} wrap. ` +
    `Integrate into the M&C workshop bay: match studio lighting, add floor reflection, ` +
    `preserve the exact wrap colour and finish character. Photorealistic.`;

  let result;
  try {
    result = await client.images.edit({
      model: 'gpt-image-1',   // exact string required — gpt-image-2 / dall-e-3 cause silent 400
      image,
      prompt,
      size: '1536x1024',      // landscape — matches stage aspect ratio
      quality: 'standard',
      n: 1,
    });
  } catch (err) {
    console.error('[wrap-render][openai-error]', err);
    return Response.json({ ok: false, error: 'api_error' }, { status: 500 });
  }

  // 4. Return as data URL
  const b64 = result.data[0].b64_json;
  return Response.json({ ok: true, renderUrl: `data:image/png;base64,${b64}` });
}
