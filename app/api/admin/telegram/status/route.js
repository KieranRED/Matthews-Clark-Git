import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

async function tgGet({ token, method }) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    return {
      ok: false,
      status: res.status,
      error_code: json?.error_code,
      description: json?.description || "Telegram error"
    };
  }
  return { ok: true, result: json.result };
}

function safeWebhookInfo(info) {
  if (!info) return null;
  return {
    url: info.url || null,
    pending_update_count: Number(info.pending_update_count || 0),
    last_error_date: info.last_error_date || null,
    last_error_message: info.last_error_message || null,
    max_connections: info.max_connections || null
  };
}

function safeMe(me) {
  if (!me) return null;
  return {
    id: me.id || null,
    username: me.username || null,
    can_join_groups: Boolean(me.can_join_groups),
    can_read_all_group_messages: Boolean(me.can_read_all_group_messages),
    supports_inline_queries: Boolean(me.supports_inline_queries)
  };
}

export async function GET() {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const iziToken = process.env.TELEGRAM_IZI_BOT_TOKEN || null;

  if (!mcToken) return Response.json({ error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });

  const mcMe = await tgGet({ token: mcToken, method: "getMe" });
  const mcHook = await tgGet({ token: mcToken, method: "getWebhookInfo" });

  let iziMe = null;
  let iziHook = null;
  if (iziToken) {
    iziMe = await tgGet({ token: iziToken, method: "getMe" });
    iziHook = await tgGet({ token: iziToken, method: "getWebhookInfo" });
  }

  return Response.json({
    ok: true,
    bots: {
      mc: {
        present: true,
        me: mcMe.ok ? safeMe(mcMe.result) : mcMe,
        webhook: mcHook.ok ? safeWebhookInfo(mcHook.result) : mcHook
      },
      izi: iziToken
        ? {
            present: true,
            me: iziMe?.ok ? safeMe(iziMe.result) : iziMe,
            webhook: iziHook?.ok ? safeWebhookInfo(iziHook.result) : iziHook
          }
        : { present: false }
    }
  });
}

