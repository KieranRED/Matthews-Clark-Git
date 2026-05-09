import crypto from "node:crypto";

export function hmacToken({ secret, leadId }) {
  return crypto.createHmac("sha256", secret).update(String(leadId)).digest("hex");
}

export function verifyToken({ secret, leadId, token }) {
  if (!secret) return false;
  const expected = hmacToken({ secret, leadId });
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(String(token || ""), "hex"));
  } catch {
    return false;
  }
}

