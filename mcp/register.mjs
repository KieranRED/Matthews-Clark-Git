// Registers the "@/" alias resolver, then loads .env.local so the KV/Upstash
// credentials are present before any tool runs. Loaded via `node --import`.

import { register } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

register("./alias-hook.mjs", import.meta.url);

// Minimal .env loader (avoids depending on the experimental --env-file flag).
// Prefer .env.mcp.local (real KV creds, pulled via `vercel env pull`) so we
// never disturb .env.local, which intentionally keeps KV blank for `next dev`.
function loadEnvFile(file) {
  let raw;
  try {
    raw = readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return false;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // First non-empty value wins; lets .env.mcp.local override blank .env.local.
    if (!process.env[key]) process.env[key] = val;
  }
  return true;
}

loadEnvFile(".env.mcp.local");
loadEnvFile(".env.local");
