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

async function setWebhook({ token, url, allowedUpdates, secretToken }) {
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url,
      ...(secretToken ? { secret_token: secretToken } : {}),
      allowed_updates: allowedUpdates
    })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const msg = json ? JSON.stringify(json).slice(0, 800) : "Unknown error";
    throw new Error(`setWebhook failed (${res.status}): ${msg}`);
  }
  return json.result;
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const iziToken = process.env.TELEGRAM_IZI_BOT_TOKEN || null;
  if (!mcToken) return Response.json({ error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return Response.json({ error: "Missing base URL" }, { status: 500 });

  const mcUrl = `${baseUrl}/api/telegram/webhook`;
  const iziUrl = `${baseUrl}/api/telegram/izi/webhook`;

  // Secrets are optional. If set, Telegram will include the header and our webhook routes will enforce it.
  const mcSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const iziSecret = process.env.TELEGRAM_IZI_WEBHOOK_SECRET || "";

  const mcResult = await setWebhook({
    token: mcToken,
    url: mcUrl,
    allowedUpdates: ["message", "callback_query"],
    secretToken: mcSecret || crypto.randomBytes(32).toString("base64url")
  });

  let iziResult = null;
  if (iziToken) {
    iziResult = await setWebhook({
      token: iziToken,
      url: iziUrl,
      allowedUpdates: ["message"],
      secretToken: iziSecret || null
    });
  }

  return Response.json({
    ok: true,
    mcWebhookUrl: mcUrl,
    iziWebhookUrl: iziToken ? iziUrl : null,
    result: { mc: mcResult, izi: iziResult }
  });
}

