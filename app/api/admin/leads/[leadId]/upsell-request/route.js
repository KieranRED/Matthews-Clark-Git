import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  service: z.string().trim().min(1),
  label: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

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

export async function POST(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const { service, label, notes } = parsed.data;
  const id = crypto.randomUUID();
  const requestedAt = new Date().toISOString();

  const existing = Array.isArray(lead.upsellRequests) ? lead.upsellRequests : [];
  await updateLead(leadId, {
    upsellRequests: [...existing, { id, service, label: label || null, notes: notes || null, requestedAt, status: "pending" }]
  });

  const secret = process.env.LEAD_LINK_SECRET;
  const iziChatId = process.env.TELEGRAM_IZI_CHAT_ID;
  const iziToken = process.env.TELEGRAM_IZI_BOT_TOKEN;

  if (secret && iziChatId && iziToken) {
    const hmac = crypto.createHmac("sha256", secret).update(String(leadId)).digest("hex");
    const baseUrl = getBaseUrl(request);
    const quoteLink = baseUrl ? `${baseUrl}/q/${encodeURIComponent(leadId)}?t=${hmac}` : null;
    const serviceDisplay = label || service;
    const notesLine = notes ? `\n<b>Notes:</b> ${notes}` : "";

    try {
      await telegramSendMessage({
        chatId: iziChatId,
        token: iziToken,
        text:
          `🔔 <b>UPSELL QUOTE REQUEST</b>\n` +
          `<b>Car:</b> ${lead.car || "—"}\n` +
          `<b>Client:</b> ${lead.name || "—"}\n` +
          `<b>Extra service:</b> ${serviceDisplay}` +
          notesLine +
          (quoteLink ? `\n\nPlease add your price on the quote form.` : ""),
        ...(quoteLink ? { replyMarkup: { inline_keyboard: [[{ text: "🧾 Open Quote Form", url: quoteLink }]] } } : {})
      });
    } catch (err) {
      console.error("[upsell-request][telegram]", err);
    }
  }

  return Response.json({ ok: true, requestId: id });
}

export async function PATCH(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const { id, vendorExVat, status } = json || {};
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const n = typeof vendorExVat === "number" && Number.isFinite(vendorExVat) ? vendorExVat : null;
  if (n == null || n <= 0) return Response.json({ error: "Invalid vendorExVat" }, { status: 400 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const existing = Array.isArray(lead.upsellRequests) ? lead.upsellRequests : [];
  const updated = existing.map((r) =>
    r.id === id ? { ...r, vendorExVat: n, status: status || "priced" } : r
  );
  if (!updated.find((r) => r.id === id)) return Response.json({ error: "Request not found" }, { status: 404 });

  const result = await updateLead(leadId, { upsellRequests: updated });
  return Response.json({ ok: true, lead: result || null });
}

export async function DELETE(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const existing = Array.isArray(lead.upsellRequests) ? lead.upsellRequests : [];
  const filtered = existing.filter((r) => r.id !== id);
  if (filtered.length === existing.length) return Response.json({ error: "Request not found" }, { status: 404 });

  const updated = await updateLead(leadId, { upsellRequests: filtered });
  return Response.json({ ok: true, lead: updated || null });
}
