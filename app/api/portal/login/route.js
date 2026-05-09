import { z } from "zod";

import { hasResend, sendEmail } from "@/lib/email";
import { getClientIdByEmail, listClients } from "@/lib/leadStore";
import { signExpiringToken } from "@/lib/signedToken";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    email: z.string().trim().email()
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

async function resolveClientIdByEmail(email) {
  const direct = await getClientIdByEmail(email);
  if (direct) return direct;
  // Backward-compat: scan recent clients if the email index wasn't built yet.
  const clients = await listClients({ limit: 500 });
  const wanted = String(email || "").trim().toLowerCase();
  const hit = clients.find((c) => String(c?.email || "").trim().toLowerCase() === wanted);
  return hit?.id ? String(hit.id) : null;
}

export async function POST(request) {
  if (!hasResend()) {
    return Response.json({ error: "Email not configured (missing RESEND_API_KEY or EMAIL_FROM)." }, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET (or LEAD_LINK_SECRET fallback)." }, { status: 500 });

  const clientId = await resolveClientIdByEmail(parsed.data.email);
  if (!clientId) {
    return Response.json({ error: "We couldn't find that email on file. Please use the email you entered in the lead form." }, { status: 404 });
  }

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return Response.json({ error: "Missing base URL" }, { status: 500 });

  const ttl = Number(process.env.PORTAL_LINK_TTL_SECONDS || 15 * 60);
  const { token, exp } = signExpiringToken({ secret, subject: `portal:${clientId}`, ttlSeconds: ttl });
  const url = `${baseUrl}/portal?c=${encodeURIComponent(clientId)}&t=${encodeURIComponent(token)}`;

  const subject = "Matthews & Clark — Client portal link";
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111;">` +
    `<h2 style="margin:0 0 8px;">Your secure portal link</h2>` +
    `<p style="margin:0 0 12px;">Tap below to open your build, quotes, and booking.</p>` +
    `<p style="margin:0 0 18px;"><a href="${url}" style="display:inline-block;padding:12px 14px;border-radius:12px;background:#1F4FFF;color:#fff;text-decoration:none;font-weight:700;">Open portal</a></p>` +
    `<p style="margin:0;color:#6b7280;font-size:12px;">This link expires in 15 minutes. If the button doesn’t work, copy/paste: ${url}</p>` +
    `</div>`;

  await sendEmail({ to: parsed.data.email, subject, html, text: `Open your portal: ${url}` });
  return Response.json({ ok: true, clientId, exp });
}

