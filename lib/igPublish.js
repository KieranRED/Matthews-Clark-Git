import { kvFetch, kvGet, kvSet } from "@/lib/kv";

const IG_API = "https://graph.instagram.com/v25.0";
const TOKEN_KEY = "ig:access_token";
const TOKEN_EXP_KEY = "ig:token_expires_at";
const LOCK_KEY = "lock:cron:post";

/**
 * Reads ig:access_token from KV. Seeds from env IG_ACCESS_TOKEN if missing.
 * Returns the token string or null.
 */
export async function getIgAccessToken() {
  let token = null;
  try {
    token = await kvGet(TOKEN_KEY);
  } catch (err) {
    console.error("[ig][token][kv-read]", err);
  }
  if (token && typeof token === "string") return token;
  // Seed from env
  const seed = process.env.IG_ACCESS_TOKEN || null;
  if (!seed) return null;
  try {
    await kvSet(TOKEN_KEY, seed);
    // Seed expiry to 60 days out so token-refresh cron knows when to renew
    await kvSet(TOKEN_EXP_KEY, new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString());
  } catch (err) {
    console.error("[ig][token][kv-seed]", err);
  }
  return seed;
}

/**
 * Acquires the distributed lock for the posting cron.
 * Returns true if acquired, false if already held.
 * TTL = 60 seconds (cron runs every 15 minutes — lock auto-expires well before next run).
 */
export async function acquireCronLock() {
  try {
    // kvFetch already prepends the base URL + auth.
    // Upstash REST SET NX EX — returns "OK" on acquisition, null if already held.
    const path = `/set/${encodeURIComponent(LOCK_KEY)}/1?NX=true&EX=60`;
    const result = await kvFetch(path, { method: "POST" });
    // Upstash returns "OK" string on success, null when NX fails.
    return result === "OK";
  } catch (err) {
    console.error("[ig][lock]", err);
    return false;
  }
}

/**
 * Step 1: Create Instagram media container for a Reels post.
 * Throws on API error; returns container id string on success.
 */
export async function createIgContainer({ post, accessToken, igUserId }) {
  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: post.videoUrl,
    caption: [post.caption || "", post.hashtags || ""].filter(Boolean).join("\n\n").trim(),
    share_to_feed: "true",
    access_token: accessToken
  });
  const res = await fetch(`${IG_API}/${encodeURIComponent(igUserId)}/media`, {
    method: "POST",
    body: params
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const msg = json?.error?.message || `Container creation failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  if (!json?.id) throw new Error("Container creation returned no id");
  return String(json.id);
}

/**
 * Step 2: Poll an existing container's status.
 * Returns one of: "FINISHED", "IN_PROGRESS", "ERROR", "EXPIRED", "PUBLISHED" (or raw string).
 * Throws only on HTTP/network errors.
 */
export async function pollIgContainer({ containerId, accessToken }) {
  const url = `${IG_API}/${encodeURIComponent(containerId)}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const msg = json?.error?.message || `Poll failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return { statusCode: String(json?.status_code || ""), status: String(json?.status || "") };
}

/**
 * Step 3: Publish a FINISHED container.
 * Returns the published media id (igMediaId).
 */
export async function publishIgContainer({ containerId, accessToken, igUserId }) {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken
  });
  const res = await fetch(`${IG_API}/${encodeURIComponent(igUserId)}/media_publish`, {
    method: "POST",
    body: params
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const msg = json?.error?.message || `Publish failed (HTTP ${res.status})`;
    throw new Error(msg);
  }
  if (!json?.id) throw new Error("Publish returned no id");
  return String(json.id);
}
