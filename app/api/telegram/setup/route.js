import crypto from "node:crypto";

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

export async function GET(request) {
  const setupKey = process.env.TELEGRAM_SETUP_KEY;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") || "";
  if (!setupKey || key !== setupKey) return new Response("Forbidden", { status: 403 });

  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const iziToken = process.env.TELEGRAM_IZI_BOT_TOKEN || null;
  if (!mcToken) return new Response("Missing TELEGRAM_MC_BOT_TOKEN", { status: 500 });

  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return new Response("Missing base URL", { status: 500 });

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || crypto.randomBytes(32).toString("base64url");
  const iziWebhookSecret = process.env.TELEGRAM_IZI_WEBHOOK_SECRET || "";
  const mcUrl = `${baseUrl}/api/telegram/webhook`;
  const iziUrl = `${baseUrl}/api/telegram/izi/webhook`;

  const setHook = async (token, url, allowed, secretToken) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        ...(secretToken ? { secret_token: secretToken } : {}),
        allowed_updates: allowed
      })
    });
    const json = await res.json().catch(() => null);
    return { ok: Boolean(res.ok && json?.ok), status: res.status, json };
  };

  const mc = await setHook(mcToken, mcUrl, ["message", "callback_query"], webhookSecret);
  if (!mc.ok) return Response.json({ ok: false, error: { bot: "mc", ...mc } }, { status: 500 });

  let izi = null;
  if (iziToken) {
    izi = await setHook(iziToken, iziUrl, ["message"], iziWebhookSecret || null);
    if (!izi.ok) return Response.json({ ok: false, error: { bot: "izi", ...izi } }, { status: 500 });
  }

  return Response.json({
    ok: true,
    mcWebhookUrl: mcUrl,
    iziWebhookUrl: iziToken ? iziUrl : null,
    webhookSecret,
    iziWebhookSecret: iziWebhookSecret || null,
    result: { mc: mc.json?.result, izi: izi?.json?.result }
  });
}
