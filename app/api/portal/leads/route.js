import crypto from "node:crypto";
import { z } from "zod";

import { getClient, saveLead, upsertClientForLead } from "@/lib/leadStore";
import { kvZAdd, hasKv } from "@/lib/kv";
import { verifyExpiringToken } from "@/lib/signedToken";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const SERVICE_IDS = ["ppf", "wrap", "tint", "ceramic", "correct", "detail", "wheel", "kit", "audit", "unsure"];

const BodySchema = z
  .object({
    c: z.string().trim().min(1),
    t: z.string().trim().min(1),
    vehicleLabel: z.string().trim().min(3).max(120),
    services: z.array(z.string().trim()).default([]),
    notes: z.string().trim().max(1500).optional().default(""),
    timeframe: z.enum(["this-week", "this-month", "no-rush"]).optional().default("no-rush")
  })
  .strict();

function portalSecret() {
  return process.env.CLIENT_LINK_SECRET || process.env.LEAD_LINK_SECRET || "";
}

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function compactServices(list) {
  const safe = Array.isArray(list) ? list : [];
  const filtered = safe.map((s) => String(s)).filter((s) => SERVICE_IDS.includes(s) && s !== "unsure");
  return filtered;
}

export async function POST(request) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET (or LEAD_LINK_SECRET fallback)." }, { status: 500 });
  const verdict = verifyExpiringToken({ secret, subject: `portal:${parsed.data.c}`, token: parsed.data.t });
  if (!verdict.ok) return Response.json({ error: "Invalid or expired session." }, { status: 401 });

  const client = await getClient(parsed.data.c);
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  const leadId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const services = compactServices(parsed.data.services);

  const leadRecord = {
    id: leadId,
    createdAt: nowIso,
    updatedAt: nowIso,
    status: "new",
    source: "PORTAL",
    name: client?.name || "Client",
    number: client?.phone || "",
    email: client?.email || "",
    car: parsed.data.vehicleLabel,
    lane: "both",
    timeframe: parsed.data.timeframe,
    services,
    serviceDetails: null,
    portalNotes: parsed.data.notes || "",
    clientId: String(client.id)
  };

  // Ensure client record gets updated/linked (repeat lead tracking + leadCount).
  try {
    await upsertClientForLead(leadRecord);
  } catch (err) {
    console.error("[portal][lead][client-upsert-failed]", err);
  }

  await saveLead(leadRecord);

  // Ensure the lead is indexed under this client even if phone/email mapping is missing.
  try {
    if (hasKv()) {
      const score = Date.parse(nowIso) || Date.now();
      await kvZAdd(`client:${String(client.id)}:leads`, score, String(leadId));
    }
  } catch (err) {
    console.error("[portal][lead][client-index-failed]", err);
  }

  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      const svc = services.length ? services.join(" · ").toUpperCase() : "SERVICE REQUEST";
      await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `📲 <b>PORTAL REQUEST</b>\n` +
          `<b>Client:</b> ${escapeHtml(leadRecord.name)}\n` +
          `<b>Car:</b> ${escapeHtml(leadRecord.car)}\n` +
          `<b>Requested:</b> ${escapeHtml(svc)}\n` +
          `<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>` +
          (leadRecord.portalNotes ? `\n<b>Notes:</b> ${escapeHtml(leadRecord.portalNotes)}` : ""),
        replyMarkup: {
          inline_keyboard: [
            [{ text: "✅ Called", callback_data: `called:${leadId}` }],
            [{ text: "🔎 Consult", callback_data: `consult_needed:${leadId}` }]
          ]
        }
      });
    } catch (err) {
      console.error("[portal][lead][telegram-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, createdAt: nowIso });
}
