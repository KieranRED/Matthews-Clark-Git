import crypto from "node:crypto";

function hmac(secret, input) {
  return crypto.createHmac("sha256", secret).update(String(input)).digest("hex");
}

export function signExpiringToken({ secret, subject, ttlSeconds = 15 * 60 }) {
  if (!secret) throw new Error("Missing secret");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(30, Number(ttlSeconds) || 0);
  const msg = `${String(subject)}|${exp}`;
  const sig = hmac(secret, msg);
  return { token: `${exp}.${sig}`, exp };
}

export function verifyExpiringToken({ secret, subject, token }) {
  if (!secret) return { ok: false, error: "missing_secret" };
  const raw = String(token || "");
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig) return { ok: false, error: "bad_token" };
  const now = Math.floor(Date.now() / 1000);
  if (exp < now) return { ok: false, error: "expired" };
  const msg = `${String(subject)}|${exp}`;
  const expected = hmac(secret, msg);
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
    return ok ? { ok: true, exp } : { ok: false, error: "bad_sig" };
  } catch {
    return { ok: false, error: "bad_sig" };
  }
}

