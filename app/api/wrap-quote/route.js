import { z } from "zod";
import crypto from "node:crypto";
import { saveLead, upsertClientForLead, normalizePhone } from "@/lib/leadStore";
import { telegramSendMessage } from "@/lib/telegram";

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const WrapQuoteSchema = z.object({
  name: z.string().trim().min(1),
  car: z.string().trim().min(1),
  phone: z.string().trim().min(8),
  notes: z.string().trim().optional().default(""),
  priceTier: z.enum(["standard", "premium", "specialist"]).default("standard"),
  wrapSelection: z.array(z.object({
    panel: z.string(),
    swatchId: z.string(),
    name: z.string(),
    code: z.string().optional().default(""),
    brand: z.string().optional().default(""),
    finish: z.string().optional().default(""),
    tier: z.string().optional().default("standard"),
  })).default([]),
});

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  let data;
  try {
    data = WrapQuoteSchema.parse(body);
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const leadRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
    source: "wrap-studio",
    name: data.name,
    number: normalizePhone(data.phone),
    car: data.car,
    notes: data.notes,
    wrapSelection: data.wrapSelection,
    priceTier: data.priceTier,
    services: ["wrap"],
    lane: "present",
    timeframe: "this-month",
    serviceDetails: {
      wrap: {
        colour: data.wrapSelection?.[0]?.name || "",
        finish: data.wrapSelection?.[0]?.finish || "",
      },
    },
  };

  try {
    const client = await upsertClientForLead(leadRecord);
    if (client?.id) leadRecord.clientId = client.id;
  } catch (err) {
    console.error("[wrap-quote][client-upsert-failed]", err);
  }

  await saveLead(leadRecord);

  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken  = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      const wrapLines = (data.wrapSelection || []).map(
        (w) => `• <b>${escapeHtml(w.panel)}:</b> ${escapeHtml(w.name)} (${escapeHtml(w.brand)} ${escapeHtml(w.code)})`
      );
      const text =
        `🎨 <b>WRAP STUDIO QUOTE</b>\n` +
        `<b>${escapeHtml(data.name)}</b> — ${escapeHtml(data.car)}\n` +
        `• <b>Phone:</b> ${escapeHtml(data.phone)}\n` +
        (wrapLines.length ? wrapLines.join("\n") + "\n" : "• <i>No colour selected</i>\n") +
        `• <b>Tier:</b> ${escapeHtml(data.priceTier)}\n` +
        (data.notes ? `• <b>Notes:</b> ${escapeHtml(data.notes)}\n` : "") +
        `• <b>Lead ID:</b> <code>${leadRecord.id}</code>`;
      await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text,
        replyMarkup: { inline_keyboard: [[{ text: "✅ Called", callback_data: `called:${leadRecord.id}` }]] },
      });
    } catch (err) {
      console.error("[wrap-quote][telegram][mc-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId: leadRecord.id });
}
