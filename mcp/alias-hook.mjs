// ESM resolution hook that maps the project's "@/..." path alias (defined in
// jsconfig.json for Next.js) onto real files, so the shared store modules in
// lib/ can be imported by a plain Node process. Used ONLY by the local stdio
// server — the remote route runs inside Next.js, which resolves "@/" itself.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveOnDisk(absNoExt) {
  const candidates = [absNoExt, `${absNoExt}.js`, `${absNoExt}.mjs`, path.join(absNoExt, "index.js")];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return `${absNoExt}.js`; // best-effort fallback; let Node surface a clear error
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const abs = resolveOnDisk(path.join(ROOT, specifier.slice(2)));
    return { url: pathToFileURL(abs).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
