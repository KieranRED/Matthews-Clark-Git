import { z } from "zod";

import { getClient, getLead, updateLead } from "@/lib/leadStore";
import { verifyExpiringToken } from "@/lib/signedToken";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    c: z.string().trim().min(1),
    t: z.string().trim().min(1)
  })
  .strict();

function portalSecret() {
  return process.env.CLIENT_LINK_SECRET || process.env.LEAD_LINK_SECRET || "";
}

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function POST(request, { params }) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET (or LEAD_LINK_SECRET fallback)." }, { status: 500 });
  const verdict = verifyExpiringToken({ secret, subject: `portal:${parsed.data.c}`, token: parsed.data.t });
  if (!verdict.ok) return Response.json({ error: "Invalid or expired session." }, { status: 401 });

  const client = await getClient(parsed.data.c);
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
  if (String(lead?.clientId || "") !== String(client.id)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const nowIso = new Date().toISOString();
  const updated = await updateLead(leadId, {
    invoiceClientMarkedPaidAt: nowIso,
    invoiceClientMarkedPaidBy: String(client.email || client.id),
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
          `💳 <b>CLIENT MARKED AS PAID</b>\n` +
          `<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n` +
          `<b>Client:</b> ${escapeHtml(client?.name || "Client")}\n` +
          `<b>Car:</b> ${escapeHtml(updated?.car || lead?.car || "—")}\n` +
          `<b>When:</b> ${escapeHtml(new Date(nowIso).toLocaleString("en-ZA"))}\n\n` +
          `Please confirm payment on your side.`,
        replyMarkup: {
          inline_keyboard: [[{ text: "💰 Deposit paid", callback_data: `deposit_paid:${leadId}` }, { text: "💸 Paid in full", callback_data: `paid:${leadId}` }]]
        },
        disableWebPagePreview: true
      });
    } catch (err) {
      console.error("[portal][mark-paid][telegram-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated });
}
