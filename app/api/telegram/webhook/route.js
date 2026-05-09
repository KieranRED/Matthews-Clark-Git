import crypto from "node:crypto";

import { getLead, updateLead } from "@/lib/leadStore";
import { telegramAnswerCallbackQuery, telegramEditMessage, telegramSendMessage } from "@/lib/telegram";

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

function fmtLead(lead) {
  const safe = (v) => (v ? String(v) : "—");
  return `🚗 <b>Lead</b>\n<b>Name:</b> ${safe(lead.name)}\n<b>Car:</b> ${safe(lead.car)}\n<b>Phone:</b> ${safe(
    lead.number
  )}\n<b>Lead ID:</b> <code>${safe(lead.id)}</code>`;
}

function getChatIdFromUpdate(update) {
  return update?.message?.chat?.id ?? update?.callback_query?.message?.chat?.id ?? null;
}

export async function POST(request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const header = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret && header !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

  const update = await request.json().catch(() => null);
  if (!update) return Response.json({ ok: true });

  // Commands (no callback buttons needed) — useful for setup.
  const msg = update.message;
  if (msg?.text) {
    const chatId = msg.chat?.id;
    const text = String(msg.text).trim();
    if (text === "/chatid" || text === "/chatid@Matthew_Clark_bot") {
      await telegramSendMessage({ chatId, token: mcToken, text: `chat_id: <code>${chatId}</code>` });
      return Response.json({ ok: true });
    }
  }

  const cq = update.callback_query;
  if (!cq) return Response.json({ ok: true });

  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const data = String(cq.data || "");
  const fromName = cq.from?.first_name || cq.from?.username || "Someone";

  const [action, leadId] = data.split(":");
  if (!action || !leadId) {
    await telegramAnswerCallbackQuery({ callbackQueryId: cq.id, text: "Invalid action." });
    return Response.json({ ok: true });
  }

  const lead = (await getLead(leadId)) || { id: leadId };

  if (action === "called") {
    const next = await updateLead(leadId, {
      status: "called",
      calledAt: new Date().toISOString(),
      calledBy: cq.from?.id ? String(cq.from.id) : null,
      calledByName: fromName
    });

    const baseUrl = getBaseUrl(request);
    const linkSecret = process.env.LEAD_LINK_SECRET;
    const t = baseUrl && linkSecret ? hmacToken({ secret: linkSecret, leadId }) : null;
    const quoteLink = baseUrl && t ? `${baseUrl}/q/${encodeURIComponent(leadId)}?t=${t}` : null;

    await telegramAnswerCallbackQuery({ callbackQueryId: cq.id, token: mcToken, text: "Marked as called." });

    const updatedText = fmtLead(next || lead) + `\n\n✅ <b>Called</b> by ${fromName}`;

    await telegramEditMessage({
      chatId,
      messageId,
      text: updatedText,
      token: mcToken,
      replyMarkup: {
        inline_keyboard: [[{ text: "✅ Called", callback_data: `called:${leadId}` }]]
      }
    });

    return Response.json({ ok: true });
  }

  if (action === "consult_needed") {
    const next = await updateLead(leadId, {
      consultation: {
        required: true,
        status: "needed",
        neededAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    await telegramAnswerCallbackQuery({ callbackQueryId: cq.id, token: mcToken, text: "Marked: consultation needed." });

    const updatedText = fmtLead(next || lead) + `\n\n🔎 <b>Consultation</b> needed (marked by ${fromName})`;

    await telegramEditMessage({
      chatId,
      messageId,
      text: updatedText,
      token: mcToken,
      replyMarkup: {
        inline_keyboard: [
          [{ text: "✅ Called", callback_data: `called:${leadId}` }],
          [{ text: "🔎 Consult needed", callback_data: `consult_needed:${leadId}` }]
        ]
      }
    });

    return Response.json({ ok: true });
  }

  if (action === "paid") {
    const nowIso = new Date().toISOString();
    const next = await updateLead(leadId, {
      invoiceStatus: "paid",
      invoicePaidAt: nowIso,
      invoicePaidBy: cq.from?.id ? String(cq.from.id) : null,
      invoicePaidByName: fromName,
      updatedAt: nowIso
    });

    await telegramAnswerCallbackQuery({ callbackQueryId: cq.id, token: mcToken, text: "Marked as paid." });

    const updatedText = fmtLead(next || lead) + `\n\n💸 <b>Paid</b> (marked by ${fromName})`;

    await telegramEditMessage({
      chatId,
      messageId,
      text: updatedText,
      token: mcToken,
      replyMarkup: {
        inline_keyboard: [
          [{ text: "✅ Called", callback_data: `called:${leadId}` }],
          [{ text: "🔎 Consult needed", callback_data: `consult_needed:${leadId}` }],
          [{ text: "💰 Deposit paid", callback_data: `deposit_paid:${leadId}` }],
          [{ text: "💸 Paid in full", callback_data: `paid:${leadId}` }]
        ]
      }
    });

    return Response.json({ ok: true });
  }

  if (action === "deposit_paid") {
    const nowIso = new Date().toISOString();
    const next = await updateLead(leadId, {
      invoiceStatus: "deposit_paid",
      invoiceDepositPaidAt: nowIso,
      invoiceDepositPaidBy: cq.from?.id ? String(cq.from.id) : null,
      invoiceDepositPaidByName: fromName,
      updatedAt: nowIso
    });

    await telegramAnswerCallbackQuery({ callbackQueryId: cq.id, token: mcToken, text: "Marked: deposit paid." });

    const updatedText = fmtLead(next || lead) + `\n\n💰 <b>Deposit paid</b> (marked by ${fromName})`;

    await telegramEditMessage({
      chatId,
      messageId,
      text: updatedText,
      token: mcToken,
      replyMarkup: {
        inline_keyboard: [
          [{ text: "✅ Called", callback_data: `called:${leadId}` }],
          [{ text: "🔎 Consult needed", callback_data: `consult_needed:${leadId}` }],
          [{ text: "💰 Deposit paid", callback_data: `deposit_paid:${leadId}` }],
          [{ text: "💸 Paid in full", callback_data: `paid:${leadId}` }]
        ]
      }
    });

    return Response.json({ ok: true });
  }

  await telegramAnswerCallbackQuery({ callbackQueryId: cq.id, token: mcToken, text: "Unhandled." });
  return Response.json({ ok: true });
}

export async function GET() {
  return new Response("OK", { status: 200 });
}
