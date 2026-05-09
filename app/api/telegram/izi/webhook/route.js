import crypto from "node:crypto";

import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request) {
  // Izimoto webhook secret is optional. If set, Telegram must send the matching
  // `x-telegram-bot-api-secret-token` header (configured via setWebhook secret_token).
  const secret = process.env.TELEGRAM_IZI_WEBHOOK_SECRET || "";
  const header = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret && header !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const iziToken = process.env.TELEGRAM_IZI_BOT_TOKEN;
  if (!iziToken) return Response.json({ ok: true });

  const update = await request.json().catch(() => null);
  if (!update) return Response.json({ ok: true });

  const msg = update.message;
  if (msg?.text) {
    const chatId = msg.chat?.id;
    const text = String(msg.text).trim();
    // In groups Telegram may send commands as `/chatid@BotUser`. Accept any `/chatid` prefix.
    if (text === "/chatid" || text.startsWith("/chatid@")) {
      await telegramSendMessage({ chatId, token: iziToken, text: `chat_id: <code>${chatId}</code>` });
      return Response.json({ ok: true });
    }
  }

  return Response.json({ ok: true });
}

export async function GET() {
  // Health check / webhook verification
  return new Response("OK", { status: 200 });
}
