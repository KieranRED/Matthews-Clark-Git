import crypto from "node:crypto";
import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

function getBaseUrl(request) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return null;
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function hmacToken({ secret, leadId }) {
  return crypto.createHmac("sha256", secret).update(String(leadId)).digest("hex");
}

export async function GET(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return Response.json({ error: "Missing base URL" }, { status: 500 });

  const t = hmacToken({ secret, leadId: params.leadId });
  const url = `${baseUrl}/consult/${encodeURIComponent(params.leadId)}?t=${t}`;
  return Response.json({ ok: true, url });
}

