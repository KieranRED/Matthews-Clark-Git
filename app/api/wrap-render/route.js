import { OpenAI, toFile } from 'openai';
import { NextResponse } from 'next/server';
import { hasKv, kvGet, kvIncr, kvExpire } from '@/lib/kv';

export const runtime = 'nodejs';        // required — OpenAI SDK uses Node APIs
export const maxDuration = 300;         // gpt-image-2 high-quality edit can take 120-180s

const DAILY_CAP = 3;                    // AI studio renders per visitor per day
const DAY_SECONDS = 86400;
const COOKIE = 'mc_wrap_id';

// ── visitor identity + daily cap ───────────────────────────────────────────
// Anonymous tool, so the strongest *practical* cap keys on IP AND a persistent
// cookie together (whichever is higher wins). This stops casual repeat use and
// protects spend. It is NOT VPN-proof — only login/accounts can truly guarantee
// a per-person cap; this is the best available without auth.
function dayStamp() { return new Date().toISOString().slice(0, 10); }
function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'local';
}
function newId() {
  const r = globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : (Date.now() + '' + Math.random());
  return r.replace(/[^a-z0-9]/gi, '').slice(0, 32);
}
async function readUsed(ip, cid) {
  if (!hasKv()) return { used: 0, enforced: false };
  const day = dayStamp();
  const [a, b] = await Promise.all([
    kvGet(`wrapr:ip:${ip}:${day}`).catch(() => 0),
    cid ? kvGet(`wrapr:cid:${cid}:${day}`).catch(() => 0) : Promise.resolve(0),
  ]);
  return { used: Math.max(Number(a) || 0, Number(b) || 0), enforced: true };
}
async function bumpUsed(ip, cid) {
  if (!hasKv()) return 0;
  const day = dayStamp();
  const kIp = `wrapr:ip:${ip}:${day}`, kCid = `wrapr:cid:${cid}:${day}`;
  const [ni, nc] = await Promise.all([ kvIncr(kIp), cid ? kvIncr(kCid) : Promise.resolve(0) ]);
  if (Number(ni) === 1) kvExpire(kIp, DAY_SECONDS).catch(() => {});
  if (cid && Number(nc) === 1) kvExpire(kCid, DAY_SECONDS).catch(() => {});
  return Math.max(Number(ni) || 0, Number(nc) || 0);
}
function withCookie(res, cid, setCookie) {
  if (setCookie) res.cookies.set(COOKIE, cid, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/' });
  return res;
}

// GET — report the visitor's remaining renders (and seed the cookie)
export async function GET(request) {
  const ip = clientIp(request);
  let cid = request.cookies.get(COOKIE)?.value;
  const setCookie = !cid; if (!cid) cid = newId();
  const { used, enforced } = await readUsed(ip, cid);
  return withCookie(NextResponse.json({
    ok: true, cap: DAILY_CAP, remaining: enforced ? Math.max(0, DAILY_CAP - used) : DAILY_CAP, enforced,
  }), cid, setCookie);
}

export async function POST(request) {
  // Parse multipart body
  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ ok: false, error: 'invalid' }, { status: 400 }); }

  const imageFile = formData.get('image');       // 1536×1024 composite: car reframed into the M&C bay
  const swatchFile = formData.get('swatch');     // solid-colour reference of the exact wrap colour
  const finish = String(formData.get('finish') || 'gloss');
  const colourName = String(formData.get('colourName') || 'wrap');
  const colourHex = String(formData.get('colourHex') || '');
  const sizeRaw = String(formData.get('size') || '1536x1024');
  const size = ['1536x1024', '1024x1024', '1024x1536'].includes(sizeRaw) ? sizeRaw : '1536x1024';
  if (!imageFile || typeof imageFile === 'string') {
    return Response.json({ ok: false, error: 'no_image' }, { status: 400 });
  }

  // Identify visitor + enforce the daily cap BEFORE the expensive model call
  const ip = clientIp(request);
  let cid = request.cookies.get(COOKIE)?.value;
  const setCookie = !cid; if (!cid) cid = newId();
  const usage = await readUsed(ip, cid);
  if (usage.enforced && usage.used >= DAILY_CAP) {
    return withCookie(NextResponse.json(
      { ok: false, error: 'rate_limited', cap: DAILY_CAP, remaining: 0 }, { status: 429 }), cid, setCookie);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const composite = await toFile(
    Buffer.from(await imageFile.arrayBuffer()), 'car.jpg', { type: 'image/jpeg' });
  const swatch = (swatchFile && typeof swatchFile !== 'string')
    ? await toFile(Buffer.from(await swatchFile.arrayBuffer()), 'swatch.png', { type: 'image/png' })
    : undefined;

  // The client sends image[0] = the customer car REFRAMED onto our bay at a
  // believable scale (car ≈70% of frame, seated low, outer border feathered into
  // the bay). The model keeps the car exactly, wraps it, then rebuilds the studio
  // around it — relight, perspective, shadow, reflection — into one seamless photo.
  const finishDesc = {
    gloss: 'high-gloss vinyl wrap — deep wet-look shine, crisp soft-box reflections following the body lines',
    satin: 'satin vinyl wrap — smooth semi-sheen, soft diffused highlights, no mirror reflections',
    matte: 'matte vinyl wrap — completely flat non-reflective surface, velvety light falloff, zero specular highlights',
    metallic: 'metallic vinyl wrap — fine metal-flake sparkle visible in the highlights, bright sheen on curved panels',
    carbon: 'carbon-fibre vinyl wrap — visible fine 2x2 carbon weave texture across the panels, semi-gloss',
    chrome: 'mirror chrome vinyl wrap — fully mirrored surface reflecting the studio environment',
    shift: 'colour-shift (flip) vinyl wrap — iridescent paint that shifts hue across panels depending on the angle to the light',
    'ppf-clear': 'gloss paint-protection film over the original paint — enhanced clarity and shine, colour unchanged',
    'ppf-matte': 'matte paint-protection film over the original paint — flat satin sheen, colour unchanged',
  }[finish] || 'vinyl wrap';

  const colourClause = colourHex
    ? `The wrap colour is EXACTLY ${colourHex} ("${colourName}")` +
      (swatch ? ', shown as a solid sample in the second reference image — match it precisely.' : '.')
    : `The wrap is "${colourName}".`;

  const wrapClause =
    `Wrap every painted body panel (bonnet, roof, doors, wings, bumpers, boot, sills, mirror caps) in a ${finishDesc}. ` +
    `${colourClause} Coverage must be perfectly uniform across every panel. ` +
    `Leave the glass, lights, grille mesh, badges, number plate, tyres and wheels unwrapped.`;

  const prompt =
    `Photorealistic automotive studio photograph. The image shows a real customer's car placed in the Matthews & Clark studio bay ` +
    `at the correct size, angle and position. Keep the car EXACTLY as shown — do not move, rotate, rescale, reshape or restyle it; ` +
    `preserve its make, model, body shape, proportions, stance, ride height, wheels, glass, headlights, grille, badges, number plate, ` +
    `every panel line, and ALL thin parts (rear wing, spoiler, splitter, aerial, mirror arms). It must stay the same recognisable vehicle. ` +
    `${wrapClause} ` +
    `Turn it into one seamless photograph: blend away any soft edge, halo or seam around the car so it sits naturally in the room; ` +
    `rebuild the studio floor and walls so their perspective and vanishing point match the car's camera angle; ` +
    `relight the car so its highlights, reflections and shadow direction match the studio's overhead lighting and colour temperature; ` +
    `cast a soft contact shadow under the tyres and a subtle reflection of the car on the polished floor. ` +
    `The car must sit at a natural scale within the studio, NOT fill the frame. Sharp focus, no added text or watermarks.`;

  let result;
  try {
    result = await client.images.edit({
      model: 'gpt-image-2',     // snapshot gpt-image-2-2026-04-21 — processes inputs at high fidelity automatically
      image: swatch ? [composite, swatch] : composite,  // composite is the edit base; swatch is a colour reference
      prompt,
      size,
      quality: 'high',
      n: 1,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    const status = err?.status || err?.statusCode || '?';
    console.error('[wrap-render][openai-error]', status, msg, JSON.stringify(err?.error || ''));
    return withCookie(NextResponse.json({ ok: false, error: 'api_error', detail: msg }, { status: 500 }), cid, setCookie);
  }

  // Count this successful render against the visitor's daily allowance
  const used = await bumpUsed(ip, cid);
  const remaining = usage.enforced ? Math.max(0, DAILY_CAP - used) : null;

  const b64 = result.data[0].b64_json;
  return withCookie(NextResponse.json(
    { ok: true, renderUrl: `data:image/png;base64,${b64}`, cap: DAILY_CAP, remaining }), cid, setCookie);
}
