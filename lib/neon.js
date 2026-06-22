import { neon } from "@neondatabase/serverless";

// Returns a Neon tagged-template SQL function for the current invocation.
// Called per-function — not a module-level singleton. neon() opens no persistent
// connection; it is a lightweight HTTPS-based tagged template. Always use the
// pooler connection string (-pooler.neon.tech) for runtime queries.
export function db() {
  return neon(process.env.DATABASE_URL);
}

// Guard: true only when DATABASE_URL is set (Vercel env). Blank on disk by design.
// Mirrors lib/kv.js hasKv() so callers can no-op locally without a live Neon instance.
export function hasNeon() {
  return Boolean(process.env.DATABASE_URL);
}
