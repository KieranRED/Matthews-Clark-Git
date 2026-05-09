import { z } from "zod";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    method: z.enum(["call", "in_person", "video"]).default("call"),
    scheduledAt: z.string().datetime(),
    notes: z.string().trim().max(1500).optional().default("")
  })
  .strict();

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function prettyMethod(m) {
  if (m === "in_person") return "In person";
  if (m === "video") return "Video call";
  return "Call";
}

export async function POST(request, { params }) {
  const leadId = String(params.leadId || "");
  const contentType = request.headers.get("content-type") || "";

  let token = "";
  let raw = null;

  if (contentType.includes("application/json")) {
    raw = await request.json().catch(() => null);
    token = String(raw?.t || "");
  } else {
    const form = await request.formData().catch(() => null);
    if (!form) return Response.json({ error: "Invalid form" }, { status: 400 });
    token = String(form.get("t") || "");
    raw = {
      method: String(form.get("method") || "call"),
      scheduledAt: String(form.get("scheduledAt") || ""),
      notes: String(form.get("notes") || "")
    };
  }

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });
  if (!verifyToken({ secret, leadId, token })) return Response.json({ error: "Invalid link token" }, { status: 401 });

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const patch = {
    consultation: {
      required: true,
      status: "scheduled",
      method: parsed.data.method,
      scheduledAt: parsed.data.scheduledAt,
      notes: parsed.data.notes || ""
    },
    consultationScheduledAt: parsed.data.scheduledAt,
    updatedAt: nowIso
  };

  const updated = await updateLead(leadId, patch);

  // Notify M&C group for coordination.
  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `🗓️ <b>CONSULTATION SCHEDULED</b>\n` +
          `<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n` +
          `<b>Client:</b> ${escapeHtml(updated?.name || lead?.name || "—")}\n` +
          `<b>Car:</b> ${escapeHtml(updated?.car || lead?.car || "—")}\n` +
          `<b>Method:</b> ${escapeHtml(prettyMethod(parsed.data.method))}\n` +
          `<b>When:</b> ${escapeHtml(new Date(parsed.data.scheduledAt).toLocaleString("en-ZA"))}` +
          (parsed.data.notes ? `\n<b>Notes:</b> ${escapeHtml(parsed.data.notes)}` : ""),
        disableWebPagePreview: true
      });
    } catch (err) {
      console.error("[consultation][telegram-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated });
}

