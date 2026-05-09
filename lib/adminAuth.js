const COOKIE_NAME = "mc_admin";

function base64UrlEncode(bytes) {
  let base64;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    base64 = btoa(bin);
  }
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecodeToBytes(str) {
  const s = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = s + "===".slice((s.length + 3) % 4);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

function utf8ToBytes(str) {
  return new TextEncoder().encode(String(str));
}

async function hmacSha256Base64Url({ secret, data }) {
  const key = await crypto.subtle.importKey("raw", utf8ToBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, utf8ToBytes(data));
  return base64UrlEncode(new Uint8Array(sig));
}

export function adminCookieName() {
  return COOKIE_NAME;
}

export async function createAdminSession({ username, ttlSeconds = 60 * 60 * 24 * 7 } = {}) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Missing ADMIN_SESSION_SECRET");

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(60, Number(ttlSeconds) || 0);
  const payload = { u: username ? String(username).slice(0, 80) : "admin", exp };

  const data = base64UrlEncode(utf8ToBytes(JSON.stringify(payload)));
  const sig = await hmacSha256Base64Url({ secret, data });
  return `${data}.${sig}`;
}

export async function verifyAdminSession(token) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  if (!token) return null;

  const [data, sig] = String(token).split(".");
  if (!data || !sig) return null;

  const expectedSig = await hmacSha256Base64Url({ secret, data });
  if (sig !== expectedSig) return null;

  let payload;
  try {
    payload = JSON.parse(bytesToUtf8(base64UrlDecodeToBytes(data)));
  } catch {
    return null;
  }
  const exp = Number(payload?.exp || 0);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return null;
  const username = payload?.u ? String(payload.u) : "admin";
  return { username, exp };
}

