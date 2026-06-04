import { put } from '@vercel/blob';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

// ── Source paths ─────────────────────────────────────────────────────────────
const SOURCE_JSON =
  process.env.SOURCE_JSON ||
  process.argv[2] ||
  "/Users/kieranredpath/Downloads/Wrap colours/Extract/wrap-colours.json";

const SWATCH_DIR = join(SOURCE_JSON, '..', 'swatches');
const OUT_PATH = new URL('../public/wrap-studio/catalogue.js', import.meta.url).pathname;

// ── Mapping helpers ───────────────────────────────────────────────────────────
function mapFinish(raw, id) {
  switch (raw) {
    case 'gloss':        return 'gloss';
    case 'satin':        return 'satin';
    case 'matte':        return 'matte';
    case 'chrome':       return 'chrome';
    case 'colour-shift': return 'shift';
    case 'metallic':     return 'metallic';
    case 'brushed':      return 'satin';
    case 'carbon':       return 'carbon';
    case 'ppf-clear':    return 'ppf-clear';
    case 'ppf-matte':    return 'ppf-matte';
    case 'ppf-colour':   return (id || '').includes('matte') ? 'ppf-matte' : 'ppf-clear';
    default:             return raw;
  }
}

function mapBrand(raw) {
  switch (raw) {
    case 'avery': return 'Avery Dennison';
    case 'hexis': return 'Hexis';
    case 'stek':  return 'STEK';
    default:      return raw;
  }
}

function inferTier(rawBrand, rawFinish) {
  if (rawFinish === 'chrome' || rawFinish === 'colour-shift') return 'specialist';
  if (rawBrand === 'stek') return 'specialist';
  if (rawFinish === 'metallic' || rawFinish === 'brushed' || rawFinish === 'matte') return 'premium';
  return 'standard';
}

function proTipFor(protoFinish, notes) {
  if (notes && notes.trim()) return notes.trim();
  switch (protoFinish) {
    case 'matte':
      return "Matte films show every prep imperfection. We decontaminate and inspect before a single panel is laid.";
    case 'chrome':
      return "Chrome needs a primer on the edges and is unforgiving on complex curves. Full-car chrome is a specialist job — we quote it honestly.";
    case 'shift':
      return "Colour-shift reads differently from every angle. Bring the car in to see the full flip before you commit.";
    case 'ppf-clear':
    case 'ppf-matte':
      return "Colour PPF is protection and colour change in one film — thicker and more durable than vinyl, priced to match.";
    default:
      return '';
  }
}

function specsFor(protoFinish) {
  switch (protoFinish) {
    case 'gloss':
    case 'satin':
      return { thickness: '70–75 µm', conform: 'High', warranty: '5–7 yr' };
    case 'matte':
      return { thickness: '80 µm', conform: 'Medium', warranty: '5–7 yr' };
    case 'metallic':
      return { thickness: '75 µm', conform: 'High', warranty: '5–7 yr' };
    case 'chrome':
      return { thickness: '95 µm', conform: 'Low', warranty: '2–3 yr' };
    case 'shift':
      return { thickness: '90 µm', conform: 'Medium', warranty: '3–5 yr' };
    case 'carbon':
      return { thickness: '80 µm', conform: 'Medium', warranty: '5–7 yr' };
    case 'ppf-clear':
    case 'ppf-matte':
      return { thickness: '200 µm', conform: 'High', warranty: '10 yr' };
    default:
      return { thickness: '~80 µm', conform: 'High', warranty: '5–7 yr' };
  }
}

// ── Collect swatch PNGs ───────────────────────────────────────────────────────
function collectPngs(dir) {
  const map = {};
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (extname(entry).toLowerCase() === '.png') {
        const id = basename(entry, '.png');
        map[id] = full;
      }
    }
  }
  try { walk(dir); } catch {}
  return map;
}

const pngMap = collectPngs(SWATCH_DIR);
const pngCount = Object.keys(pngMap).length;
console.log(`Found ${pngCount} swatch PNGs`);

// ── Upload swatches to Vercel Blob ────────────────────────────────────────────
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN not set. Run with --env-file=.env.local');
  process.exit(1);
}

const swatchUrls = {};
const ids = Object.keys(pngMap);
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const path = pngMap[id];
  console.log(`Uploading ${i + 1}/${ids.length}: ${id}`);
  const blob = await put(
    `wrap-studio/swatches/${id}.png`,
    readFileSync(path),
    { access: 'public', contentType: 'image/png', token, allowOverwrite: true }
  );
  swatchUrls[id] = blob.url;
  if (i < ids.length - 1) {
    await new Promise(r => setTimeout(r, 100));
  }
}
console.log(`Uploaded ${Object.keys(swatchUrls).length} swatches`);

// ── Build catalogue entries ───────────────────────────────────────────────────
const source = JSON.parse(readFileSync(SOURCE_JSON, 'utf8'));
let lowConfCount = 0;

const entries = source.map(entry => {
  const protoFinish = mapFinish(entry.finish, entry.id);
  const specs = specsFor(protoFinish);
  const hexConf = entry.hex_confidence ?? null;
  if (hexConf === 'low') lowConfCount++;

  const out = {
    id: entry.id,
    brand: mapBrand(entry.brand),
    series: entry.series,
    name: entry.name,
    code: entry.code,
    finish: protoFinish,
    hex: entry.hex,
    hex2: entry.hex2 ?? null,
    tier: inferTier(entry.brand, entry.finish),
    thickness: specs.thickness,
    conform: specs.conform,
    warranty: specs.warranty,
    proTip: proTipFor(protoFinish, entry.notes),
    swatchUrl: swatchUrls[entry.id] ?? null,
  };

  if (hexConf) out.hexConfidence = hexConf;

  return out;
});

// ── Build FINISHES / BRANDS / TIER_LABEL ─────────────────────────────────────
const FINISHES = [
  { key: 'gloss',     label: 'Gloss' },
  { key: 'satin',     label: 'Satin' },
  { key: 'matte',     label: 'Matte' },
  { key: 'metallic',  label: 'Metallic' },
  { key: 'chrome',    label: 'Chrome' },
  { key: 'shift',     label: 'Colour-shift' },
  { key: 'carbon',    label: 'Carbon' },
  { key: 'ppf-clear', label: 'PPF Clear' },
  { key: 'ppf-matte', label: 'PPF Matte' },
];

const BRANDS = ['Avery Dennison', 'Hexis', 'STEK'];

const TIER_LABEL = {
  standard:   { name: 'Standard',   note: '' },
  premium:    { name: 'Premium',     note: '' },
  specialist: { name: 'Specialist',  note: '' },
};

// ── Write catalogue.js ────────────────────────────────────────────────────────
const iife = `(function(){
  const C = ${JSON.stringify(entries, null, 2)};
  window.FINISHES = ${JSON.stringify(FINISHES)};
  window.BRANDS = ${JSON.stringify(BRANDS)};
  window.TIER_LABEL = ${JSON.stringify(TIER_LABEL)};
  window.WRAP_CATALOGUE = C;
})();
`;

writeFileSync(OUT_PATH, iife, 'utf8');

const swatchFilled = entries.filter(e => e.swatchUrl !== null).length;
console.log(`\nDone.`);
console.log(`  Total entries written : ${entries.length}`);
console.log(`  Swatch URLs populated : ${swatchFilled}`);
console.log(`  Low-confidence entries: ${lowConfCount}`);
console.log(`  Output: ${OUT_PATH}`);
