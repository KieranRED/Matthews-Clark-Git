import { kvGet, kvSet } from "@/lib/kv";

export const runtime = "nodejs";
export const maxDuration = 30;

const TOKEN_KEY = "ig:access_token";
const TOKEN_EXP_KEY = "ig:token_expires_at";

function isCronAuthorized(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = request.headers.get("authorization") || "";
  return got === `Bearer ${expected}`;
}

export async function GET(request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Read current token from KV (fall back to env for first-run scenarios)
  let currentToken = null;
  try {
    currentToken = await kvGet(TOKEN_KEY);
  } catch (err) {
    console.error("[cron][token-refresh][kv-read]", err);
  }
  if (!currentToken || typeof currentToken !== "string") {
    currentToken = process.env.IG_ACCESS_TOKEN || null;
  }
  if (!currentToken) {
    return Response.json({ ok: false, error: "No IG token available to refresh" }, { status: 500 });
  }

  try {
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(currentToken)}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      console.error("[cron][token-refresh][api]", msg, json);
      return Response.json({ ok: false, error: msg }, { status: 502 });
    }
    const newToken = json?.access_token;
    const expiresIn = Number(json?.expires_in) || 60 * 24 * 60 * 60; // default 60 days
    if (!newToken) {
      return Response.json({ ok: false, error: "Refresh returned no access_token" }, { status: 502 });
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    await kvSet(TOKEN_KEY, newToken);
    await kvSet(TOKEN_EXP_KEY, expiresAt);
    return Response.json({ ok: true, refreshedAt: new Date().toISOString(), expiresAt, expiresInSeconds: expiresIn });
  } catch (err) {
    console.error("[cron][token-refresh][fatal]", err);
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
