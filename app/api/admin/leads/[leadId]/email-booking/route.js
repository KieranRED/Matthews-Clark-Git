import crypto from "node:crypto";
import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { hasResend, sendEmail } from "@/lib/email";
import { getLead, updateLead } from "@/lib/leadStore";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

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

function fmtSlot(iso) {
  try {
    return new Date(iso).toLocaleString("en-ZA", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function POST(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasResend()) {
    return Response.json({ error: "Email not configured (missing RESEND_API_KEY or EMAIL_FROM)." }, { status: 500 });
  }

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const payStatus = String(lead?.invoiceStatus || "due");
  if (!["deposit_paid", "paid"].includes(payStatus)) {
    return Response.json({ error: "Deposit (or full payment) must be marked as paid before sending booking options." }, { status: 400 });
  }

  const email = String(lead?.email || "").trim();
  if (!email) return Response.json({ error: "Lead is missing an email address." }, { status: 400 });

  const b = lead?.booking && typeof lead.booking === "object" ? lead.booking : null;
  const slots = Array.isArray(b?.proposedSlots) ? b.proposedSlots.map((v) => String(v)).filter(Boolean) : [];
  if (!slots.length) return Response.json({ error: "No booking slots proposed yet." }, { status: 400 });

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });
  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return Response.json({ error: "Missing base URL" }, { status: 500 });

  const t = hmacToken({ secret, leadId });
  const url = `${baseUrl}/book/${encodeURIComponent(leadId)}?t=${t}`;

  const listHtml = `<ul style="margin:8px 0 0;padding-left:18px;">${slots
    .slice(0, 6)
    .map((s) => `<li>${fmtSlot(s)}</li>`)
    .join("")}</ul>`;

  const subject = `Matthews & Clark — Choose a booking date`;
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111;">` +
    `<h2 style="margin:0 0 8px;">Choose your booking date</h2>` +
    `<p style="margin:0 0 12px;">Hi ${String(lead?.name || "there")}, please choose a date for ${String(lead?.car || "your vehicle")}.</p>` +
    `<div style="margin:0 0 12px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">` +
    `<div style="font-weight:700;margin-bottom:6px;">Proposed dates</div>` +
    `${listHtml}` +
    `</div>` +
    `<p style="margin:0 0 14px;">Tap below to confirm a time (or request an alternative):</p>` +
    `<p style="margin:0 0 18px;"><a href="${url}" style="display:inline-block;padding:12px 14px;border-radius:12px;background:#1F4FFF;color:#fff;text-decoration:none;font-weight:700;">Choose a date</a></p>` +
    `<p style="margin:0;color:#6b7280;font-size:12px;">If the button doesn’t work, copy/paste: ${url}</p>` +
    `</div>`;

  await sendEmail({ to: email, subject, html, text: `Choose a booking date: ${url}` });

  const nowIso = new Date().toISOString();
  const updated = await updateLead(leadId, {
    booking: {
      ...(b || {}),
      status: String(b?.status || "proposed") === "scheduled" ? "scheduled" : "proposed",
      bookingLinkSentAt: nowIso,
      bookingLinkSentBy: session.username,
      updatedAt: nowIso
    },
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
          `🗓️ <b>BOOKING LINK EMAILED</b>\n` +
          `<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n` +
          `<b>Client:</b> ${escapeHtml(updated?.name || lead?.name || "—")}\n` +
          `<b>Car:</b> ${escapeHtml(updated?.car || lead?.car || "—")}\n` +
          `<b>To:</b> ${escapeHtml(email)}\n` +
          `<b>Sent by:</b> ${escapeHtml(session.username)}`,
        disableWebPagePreview: true
      });
    } catch (err) {
      console.error("[email-booking][telegram-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, to: email, url, lead: updated });
}
