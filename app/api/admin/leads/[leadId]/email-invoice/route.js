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

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

function invoiceRef(leadId, lead) {
  const custom = String(lead?.invoiceReference || "").trim();
  if (custom) return custom;
  const raw = String(lead?.invoiceNumber || "").trim();
  const digits = raw.replace(/[^\d]/g, "");
  if (digits) return `MC_${digits.slice(-5).padStart(5, "0")}`;
  const legacy = String(raw || leadId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase().padStart(5, "0");
  return `MC_${legacy}`;
}

function addDays(iso, days) {
  const ms = Date.parse(String(iso || ""));
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString();
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
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

  const email = String(lead?.email || "").trim();
  if (!email) return Response.json({ error: "Lead is missing an email address." }, { status: 400 });

  const invoiceCreatedAt = lead?.invoiceCreatedAt || lead?.quoteBuiltAt || null;
  if (!invoiceCreatedAt) return Response.json({ error: "Invoice not ready yet. Finalize commission first." }, { status: 400 });

  const consult = lead?.consultation && typeof lead.consultation === "object" ? lead.consultation : null;
  const consultRequired = Boolean(consult?.required);
  const consultStatus = String(consult?.status || "");
  if (consultRequired && !["scheduled", "done", "completed"].includes(consultStatus)) {
    return Response.json({ error: "Consultation required before sending the invoice. Schedule the consultation first." }, { status: 400 });
  }

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });
  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return Response.json({ error: "Missing base URL" }, { status: 500 });

  const t = hmacToken({ secret, leadId });
  const url = `${baseUrl}/i/${encodeURIComponent(leadId)}?t=${t}`;
  const ref = invoiceRef(leadId, lead);
  const dueIso = addDays(invoiceCreatedAt, 7);

  const total = safeNum(lead?.clientQuoteTotalExVat) ?? safeNum(lead?.clientQuoteAmountExVat) ?? safeNum(lead?.clientQuoteAmount) ?? null;
  const deposit = total != null ? Math.round(total * 0.6 * 100) / 100 : null;

  const subject = `Matthews & Clark — Invoice ${ref}`;
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5;color:#111;">` +
    `<h2 style="margin:0 0 8px;">Invoice ready</h2>` +
    `<p style="margin:0 0 12px;">Hi ${String(lead?.name || "there")}, your invoice is ready for ${String(lead?.car || "your vehicle")}.</p>` +
    `<div style="margin:0 0 12px;padding:12px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">` +
    `<div><b>Ref:</b> ${ref}</div>` +
    (dueIso ? `<div><b>Due:</b> ${fmtDate(dueIso)} (valid for 7 days)</div>` : "") +
    (deposit != null ? `<div><b>Deposit due (60%):</b> R ${deposit.toFixed(2)}</div>` : "") +
    `</div>` +
    `<p style="margin:0 0 14px;">Click below to download your invoice PDF:</p>` +
    `<p style="margin:0 0 18px;"><a href="${url}" style="display:inline-block;padding:12px 14px;border-radius:12px;background:#1F4FFF;color:#fff;text-decoration:none;font-weight:700;">Download invoice</a></p>` +
    `<p style="margin:0;color:#6b7280;font-size:12px;">If the button doesn’t work, copy/paste: ${url}</p>` +
    `</div>`;

  await sendEmail({ to: email, subject, html, text: `Invoice ${ref}: ${url}` });

  const nowIso = new Date().toISOString();
  const updated = await updateLead(leadId, {
    invoiceSentAt: nowIso,
    invoiceSentBy: session.username,
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
          `📨 <b>INVOICE EMAILED</b>\n` +
          `<b>Ref:</b> <code>${escapeHtml(ref)}</code>\n` +
          `<b>Client:</b> ${escapeHtml(updated?.name || lead?.name || "—")}\n` +
          `<b>Car:</b> ${escapeHtml(updated?.car || lead?.car || "—")}\n` +
          `<b>To:</b> ${escapeHtml(email)}\n` +
          `<b>Sent by:</b> ${escapeHtml(session.username)}`,
        replyMarkup: {
          inline_keyboard: [[{ text: "💰 Deposit paid", callback_data: `deposit_paid:${leadId}` }, { text: "💸 Paid in full", callback_data: `paid:${leadId}` }]]
        },
        disableWebPagePreview: true
      });
    } catch (err) {
      console.error("[email-invoice][telegram-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, to: email, url, lead: updated });
}
