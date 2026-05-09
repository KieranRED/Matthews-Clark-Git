import { z } from "zod";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    t: z.string().trim().min(1),
    action: z.enum(["schedule", "request"]).default("schedule"),
    slot: z.string().datetime().nullable().optional(),
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

function fmtWhen(iso) {
  try {
    return new Date(iso).toLocaleString("en-ZA");
  } catch {
    return String(iso || "—");
  }
}

export async function POST(request, { params }) {
  const leadId = String(params.leadId || "");
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });
  if (!verifyToken({ secret, leadId, token: parsed.data.t })) return Response.json({ error: "Invalid link token" }, { status: 401 });

  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const existingBooking = lead?.booking && typeof lead.booking === "object" ? lead.booking : {};
  const proposed = Array.isArray(existingBooking?.proposedSlots) ? existingBooking.proposedSlots.map((v) => String(v)).filter(Boolean) : [];

  if (parsed.data.action === "schedule") {
    const slot = parsed.data.slot ? String(parsed.data.slot) : "";
    if (!slot) return Response.json({ error: "Missing slot" }, { status: 400 });
    if (proposed.length && !proposed.includes(slot)) {
      return Response.json({ error: "That slot is no longer available. Ask the team to resend a booking link." }, { status: 400 });
    }

    const patch = {
      booking: {
        ...(existingBooking || {}),
        status: "scheduled",
        proposedSlots: proposed,
        scheduledAt: slot,
        scheduledBy: "client",
        notes: parsed.data.notes || "",
        updatedAt: nowIso
      },
      status: lead?.status === "booked" ? lead.status : "booked",
      bookedAt: lead?.bookedAt || nowIso,
      bookedBy: lead?.bookedBy || "client",
      updatedAt: nowIso
    };

    const updated = await updateLead(leadId, patch);

    const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (mcChatId && mcToken) {
      try {
        await telegramSendMessage({
          chatId: mcChatId,
          token: mcToken,
          text:
            `✅ <b>BOOKING CONFIRMED</b>\n` +
            `<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n` +
            `<b>Client:</b> ${escapeHtml(updated?.name || lead?.name || "—")}\n` +
            `<b>Car:</b> ${escapeHtml(updated?.car || lead?.car || "—")}\n` +
            `<b>When:</b> ${escapeHtml(fmtWhen(slot))}` +
            (parsed.data.notes ? `\n<b>Notes:</b> ${escapeHtml(parsed.data.notes)}` : ""),
          disableWebPagePreview: true
        });
      } catch (err) {
        console.error("[booking][telegram-send-failed]", err);
      }
    }

    return Response.json({ ok: true, leadId, lead: updated });
  }

  // request different time
  const patch = {
    booking: {
      ...(existingBooking || {}),
      status: "requested",
      proposedSlots: proposed,
      requestNotes: parsed.data.notes || "",
      requestedAt: nowIso,
      updatedAt: nowIso
    },
    updatedAt: nowIso
  };
  const updated = await updateLead(leadId, patch);

  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `🗓️ <b>BOOKING REQUEST</b>\n` +
          `<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n` +
          `<b>Client:</b> ${escapeHtml(updated?.name || lead?.name || "—")}\n` +
          `<b>Car:</b> ${escapeHtml(updated?.car || lead?.car || "—")}` +
          (parsed.data.notes ? `\n<b>Notes:</b> ${escapeHtml(parsed.data.notes)}` : ""),
        disableWebPagePreview: true
      });
    } catch (err) {
      console.error("[booking-request][telegram-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated });
}

