import { OpenAI, toFile } from 'openai';
import { hasKv, kvGet, kvIncr, kvExpire } from '@/lib/kv';

export const runtime = 'nodejs';        // required — OpenAI SDK uses Node APIs
export const maxDuration = 300;         // gpt-image-2 high-quality edit can take 120-180s

const DAILY_CAP = 10;                   // per IP per day

export async function POST(request) {
  // Rate limiting disabled — re-enable before public launch

  // 1. Parse multipart body
  let formData;
  try { formData = await request.formData(); }
  catch { return Response.json({ ok: false, error: 'invalid' }, { status: 400 }); }

  // Render strategy (the car is the fixed anchor; the model builds our studio
  // around it):
  //  - image[0] is the ORIGINAL, un-cut customer photo. Sending the full photo —
  //    not a background-removed cutout — keeps thin parts like rear wings and
  //    spoilers intact and gives the model the real car to preserve at its exact
  //    angle. No edit mask: a masked region is regenerated blind and the model
  //    swaps the vehicle (verified: BMW M3 in → Supra/Golf out).
  //  - image[1] is the M&C studio bay, a reference the model rebuilds AROUND the
  //    car — re-projected to the car's perspective, with matching floor, shadows
  //    and lighting. We deliberately do NOT pixel-lock the bay: matching its
  //    perspective to the car is the whole point.
  //  - image[2] is a solid sample of the exact wrap colour.
  const imageFile = formData.get('image');       // original customer photo (downscaled)
  const bayFile = formData.get('bay');           // studio bay reference image
  const swatchFile = formData.get('swatch');     // solid-colour reference of the exact wrap colour
  const finish = String(formData.get('finish') || 'gloss');
  const colourName = String(formData.get('colourName') || 'wrap');
  const colourHex = String(formData.get('colourHex') || '');
  const sizeRaw = String(formData.get('size') || '1536x1024');
  const size = ['1536x1024', '1024x1024', '1024x1536'].includes(sizeRaw) ? sizeRaw : '1536x1024';
  if (!imageFile || typeof imageFile === 'string') {
    return Response.json({ ok: false, error: 'no_image' }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const photo = await toFile(
    Buffer.from(await imageFile.arrayBuffer()), 'car.jpg', { type: 'image/jpeg' });
  const bay = (bayFile && typeof bayFile !== 'string')
    ? await toFile(Buffer.from(await bayFile.arrayBuffer()), 'bay.jpg', { type: 'image/jpeg' })
    : undefined;
  const swatch = (swatchFile && typeof swatchFile !== 'string')
    ? await toFile(Buffer.from(await swatchFile.arrayBuffer()), 'swatch.png', { type: 'image/png' })
    : undefined;

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
      (swatch ? ', shown as a solid sample in the last reference image — match it precisely.' : '.')
    : `The wrap is "${colourName}".`;

  const bayClause = bay
    ? `The SECOND image is the Matthews & Clark studio bay. Rebuild the car's entire surroundings as this exact studio.`
    : `Place the car in a clean professional wrap-shop studio: mid-grey walls, a polished light-grey floor, soft overhead lighting.`;

  const wrapClause = `Wrap every painted body panel (bonnet, roof, doors, wings, bumpers, boot, sills, mirror caps) in a ${finishDesc}. ` +
    `${colourClause} Coverage must be perfectly uniform across every panel. ` +
    `Leave the glass, lights, grille mesh, badges, number plate, tyres and wheels unwrapped.`;

  const prompt =
    `Photorealistic automotive studio photograph. The FIRST image is a real customer's car — it is the fixed subject. ` +
    `Do NOT move, rotate, rescale, reshape or restyle the car: keep its EXACT camera angle, position, proportions, stance, ` +
    `ride height, wheel design, glass, headlights, grille, badges, number plate and every panel line, and keep ALL thin parts ` +
    `(rear wing, spoiler, splitter, aerial, mirror arms) fully intact. It must stay instantly recognisable as the same vehicle. ` +
    `${wrapClause} ` +
    `${bayClause} Completely replace everything currently around the car — its original background, ground and surroundings — with this studio. ` +
    `Make it one believable photograph: rebuild the floor and walls so their perspective and vanishing point match the car's camera angle; ` +
    `relight the car so its highlights, reflections and shadow direction match the studio's overhead lighting and colour temperature; ` +
    `cast a soft contact shadow under the tyres and a subtle reflection of the car on the polished floor. Sharp focus, no added text or watermarks.`;

  const images = [photo];
  if (bay) images.push(bay);
  if (swatch) images.push(swatch);

  let result;
  try {
    result = await client.images.edit({
      model: 'gpt-image-2',     // snapshot gpt-image-2-2026-04-21 — processes inputs at high fidelity automatically
      image: images,            // [photo, bay?, swatch?] — photo is the edit base, others are references
      prompt,
      size,                     // tracks the photo's aspect so the car isn't stretched
      quality: 'high',
      n: 1,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    const status = err?.status || err?.statusCode || '?';
    console.error('[wrap-render][openai-error]', status, msg, JSON.stringify(err?.error || ''));
    return Response.json({ ok: false, error: 'api_error', detail: msg }, { status: 500 });
  }

  // Return as data URL
  const b64 = result.data[0].b64_json;
  return Response.json({ ok: true, renderUrl: `data:image/png;base64,${b64}` });
}
