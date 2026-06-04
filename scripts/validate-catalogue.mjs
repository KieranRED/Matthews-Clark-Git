import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cataloguePath = join(__dirname, '..', 'public', 'wrap-studio', 'catalogue.js');

const src = readFileSync(cataloguePath, 'utf8');
const window = {};
// eslint-disable-next-line no-new-func
new Function('window', src)(window);

let passed = true;
const errors = [];

function assert(cond, msg) {
  if (!cond) { errors.push(msg); passed = false; }
}

// 1. Entry count
assert(
  Array.isArray(window.WRAP_CATALOGUE) && window.WRAP_CATALOGUE.length === 375,
  `Expected 375 entries, got ${window.WRAP_CATALOGUE?.length}`
);

// 2. Required fields on every entry
const VALID_BRANDS = ['Avery Dennison', 'Hexis', 'STEK'];
const REQUIRED = ['id', 'brand', 'series', 'name', 'code', 'hex', 'finish', 'tier'];
if (Array.isArray(window.WRAP_CATALOGUE)) {
  for (const entry of window.WRAP_CATALOGUE) {
    for (const field of REQUIRED) {
      if (!entry[field]) {
        errors.push(`Entry ${entry.id || '?'} missing/empty field: ${field}`);
        passed = false;
      }
    }
    if (!VALID_BRANDS.includes(entry.brand)) {
      errors.push(`Entry ${entry.id} has unexpected brand: ${entry.brand}`);
      passed = false;
    }
  }
}

// 3. Swatch URL count
const swatchCount = (window.WRAP_CATALOGUE || []).filter(e => e.swatchUrl !== null && e.swatchUrl !== undefined).length;
assert(swatchCount === 18, `Expected 18 swatch URLs, got ${swatchCount}`);

// 4. FINISHES
assert(
  Array.isArray(window.FINISHES) && window.FINISHES.length === 9,
  `Expected 9 finishes, got ${window.FINISHES?.length}`
);
if (Array.isArray(window.FINISHES)) {
  const keys = window.FINISHES.map(f => f.key);
  assert(keys.includes('metallic'), "FINISHES missing 'metallic'");
  assert(keys.includes('carbon'), "FINISHES missing 'carbon'");
}

// 5. BRANDS
const brandsOk =
  Array.isArray(window.BRANDS) &&
  window.BRANDS.length === 3 &&
  VALID_BRANDS.every((b, i) => window.BRANDS[i] === b);
assert(brandsOk, `BRANDS mismatch: ${JSON.stringify(window.BRANDS)}`);

if (passed) {
  const swatchEntries = (window.WRAP_CATALOGUE || []).filter(e => e.swatchUrl);
  const lowConf = (window.WRAP_CATALOGUE || []).filter(e => e.hexConfidence === 'low').length;
  console.log('PASS');
  console.log(`  Entries     : ${window.WRAP_CATALOGUE.length}`);
  console.log(`  Swatch URLs : ${swatchCount}`);
  console.log(`  Low-conf    : ${lowConf}`);
  console.log(`  Finishes    : ${window.FINISHES.length}`);
  console.log(`  Brands      : ${window.BRANDS.join(', ')}`);
  process.exit(0);
} else {
  console.error('FAIL');
  for (const e of errors) console.error(' ', e);
  process.exit(1);
}
