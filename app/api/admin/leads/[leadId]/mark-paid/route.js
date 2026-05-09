import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function POST(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const updated = await updateLead(leadId, {
    invoiceStatus: "paid",
    invoicePaidAt: nowIso,
    invoicePaidBy: session.username,
    updatedAt: nowIso
  });

  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `💸 <b>INVOICE PAID</b>\n` +
          `<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n` +
          `<b>Client:</b> ${escapeHtml(updated?.name || lead?.name || "—")}\n` +
          `<b>Car:</b> ${escapeHtml(updated?.car || lead?.car || "—")}\n` +
          `<b>Marked by:</b> ${escapeHtml(session.username)}\n` +
          `<b>When:</b> ${escapeHtml(new Date(nowIso).toLocaleString("en-ZA"))}`,
        disableWebPagePreview: true
      });
    } catch (err) {
      console.error("[invoice][paid][telegram-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated });
}

