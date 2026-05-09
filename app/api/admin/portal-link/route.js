import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getClientIdByEmail, listClients } from "@/lib/leadStore";
import { signExpiringToken } from "@/lib/signedToken";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    clientId: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional()
  })
  .strict();

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

function portalSecret() {
  return process.env.CLIENT_LINK_SECRET || process.env.LEAD_LINK_SECRET || "";
}

async function resolveClientId({ clientId, email }) {
  if (clientId) return String(clientId);
  if (!email) return null;
  const direct = await getClientIdByEmail(email);
  if (direct) return direct;
  // Backward-compat: scan recent clients if the email index wasn't built yet.
  const clients = await listClients({ limit: 800 });
  const wanted = String(email || "").trim().toLowerCase();
  const hit = clients.find((c) => String(c?.email || "").trim().toLowerCase() === wanted);
  return hit?.id ? String(hit.id) : null;
}

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return Response.json({ error: "Missing base URL" }, { status: 500 });

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET (or LEAD_LINK_SECRET fallback)." }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ? String(searchParams.get("clientId")) : undefined;
  const email = searchParams.get("email") ? String(searchParams.get("email")) : undefined;
  const resolved = await resolveClientId({ clientId, email });
  if (!resolved) return Response.json({ error: "Client not found" }, { status: 404 });

  const ttl = Number(process.env.PORTAL_ADMIN_LINK_TTL_SECONDS || 60 * 60);
  const { token: portalToken, exp } = signExpiringToken({ secret, subject: `portal:${resolved}`, ttlSeconds: ttl });
  const url = `${baseUrl}/portal?c=${encodeURIComponent(resolved)}&t=${encodeURIComponent(portalToken)}`;
  return Response.json({ ok: true, url, clientId: resolved, exp });
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return Response.json({ error: "Missing base URL" }, { status: 500 });

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET (or LEAD_LINK_SECRET fallback)." }, { status: 500 });

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const resolved = await resolveClientId({ clientId: parsed.data.clientId, email: parsed.data.email });
  if (!resolved) return Response.json({ error: "Client not found" }, { status: 404 });

  const ttl = Number(process.env.PORTAL_ADMIN_LINK_TTL_SECONDS || 60 * 60);
  const { token: portalToken, exp } = signExpiringToken({ secret, subject: `portal:${resolved}`, ttlSeconds: ttl });
  const url = `${baseUrl}/portal?c=${encodeURIComponent(resolved)}&t=${encodeURIComponent(portalToken)}`;
  return Response.json({ ok: true, url, clientId: resolved, exp });
}

