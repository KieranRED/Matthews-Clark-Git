function kvEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export function hasKv() {
  const { url, token } = kvEnv();
  return Boolean(url && token);
}

export function maybeParseJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    // We always write values via JSON.stringify(...), so parse any JSON primitive too.
    // This fixes string values like "\"abc\"" that would otherwise stay quoted.
    if (
      trimmed.startsWith("{") ||
      trimmed.startsWith("[") ||
      trimmed.startsWith('"') ||
      trimmed === "null" ||
      trimmed === "true" ||
      trimmed === "false" ||
      /^-?\d/.test(trimmed)
    ) {
      return JSON.parse(trimmed);
    }
    return value;
  } catch {
    return value;
  }
}

export async function kvFetch(path, { method = "GET", body } = {}) {
  const { url: baseUrl, token } = kvEnv();
  if (!baseUrl || !token) throw new Error("Missing KV/Upstash REST env vars");
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || typeof json !== "object") {
    throw new Error(`KV request failed (${res.status})`);
  }
  if ("error" in json && json.error) throw new Error(String(json.error));
  return json.result;
}

export async function kvGet(key) {
  return maybeParseJson(await kvFetch(`/get/${encodeURIComponent(key)}`));
}

export async function kvSet(key, value) {
  return kvFetch(`/set/${encodeURIComponent(key)}`, { method: "POST", body: JSON.stringify(value) });
}

export async function kvDel(key) {
  // Upstash REST: DEL key -> /del/<key>
  return kvFetch(`/del/${encodeURIComponent(key)}`);
}

export async function kvKeys(pattern) {
  const res = await kvFetch(`/keys/${encodeURIComponent(pattern)}`);
  return Array.isArray(res) ? res.map(String) : [];
}

export async function kvZAdd(setKey, score, member) {
  return kvFetch(`/zadd/${encodeURIComponent(setKey)}/${score}/${encodeURIComponent(member)}`, { method: "POST" });
}

export async function kvZRevRange(setKey, start, stop) {
  const res = await kvFetch(`/zrevrange/${encodeURIComponent(setKey)}/${start}/${stop}`);
  return Array.isArray(res) ? res.map(String) : [];
}

export async function kvZScore(setKey, member) {
  return kvFetch(`/zscore/${encodeURIComponent(setKey)}/${encodeURIComponent(member)}`);
}

export async function kvZRem(setKey, member) {
  // ZREM key member -> /zrem/<key>/<member>
  return kvFetch(`/zrem/${encodeURIComponent(setKey)}/${encodeURIComponent(member)}`);
}

export async function kvIncr(key) {
  // INCR key -> /incr/<key>
  // Upstash REST returns the incremented integer.
  return kvFetch(`/incr/${encodeURIComponent(key)}`, { method: "POST" });
}

// ZRANGEBYSCORE key min max -> /zrangebyscore/<key>/<min>/<max>
export async function kvZRangeByScore(setKey, min, max) {
  const res = await kvFetch(`/zrangebyscore/${encodeURIComponent(setKey)}/${min}/${max}`);
  return Array.isArray(res) ? res.map(String) : [];
}
