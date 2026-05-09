import { z } from "zod";

import { getLead, updateLead } from "@/lib/leadStore";
import { telegramSendMessage } from "@/lib/telegram";
import { verifyToken } from "@/lib/linkToken";

const QuoteSchema = z
  .object({
    amount_total: z.coerce.number().finite().positive().optional(),
    amount: z.coerce.number().finite().positive().optional()
  })
  .partial();

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

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

const SERVICE_IDS = ["ppf", "wrap", "tint", "ceramic", "correct", "detail", "wheel", "kit"];

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function leadServiceSummaryHtml(lead) {
  const services = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
  if (!services.length) return null;
  const d = lead?.serviceDetails && typeof lead.serviceDetails === "object" ? lead.serviceDetails : {};
  const lines = [];
  for (const sid of services) {
    const det = d?.[sid];
    const title = String(sid || "").toUpperCase();
    if (!det || typeof det !== "object") {
      lines.push(`• <b>${escapeHtml(title)}</b>`);
      continue;
    }
    if (sid === "ppf") {
      lines.push(
        `• <b>PPF</b> — ${escapeHtml(det.coverage || "—")}${det.film ? ` · ${escapeHtml(det.film)}` : ""}${det.doorJambs ? " · door jambs" : ""}${
          Array.isArray(det.panels) && det.panels.length ? ` · ${det.panels.length} panels` : ""
        }`
      );
      continue;
    }
    if (sid === "wrap") {
      const parts = Array.isArray(det.parts) && det.parts.length ? det.parts.join(", ") : "";
      lines.push(`• <b>WRAP</b> — ${escapeHtml(det.scope || "—")}${parts ? ` · ${escapeHtml(parts)}` : ""}${det.colour ? ` · ${escapeHtml(det.colour)}` : ""}`);
      continue;
    }
    if (sid === "wheel") {
      lines.push(
        `• <b>WHEELS</b> — ${escapeHtml(det.service || "—")}${det.finish ? ` · ${escapeHtml(det.finish)}` : ""}${det.colour ? ` · ${escapeHtml(det.colour)}` : ""}`
      );
      continue;
    }
    if (sid === "tint") {
      lines.push(`• <b>TINT</b> — ${escapeHtml(det.windows || "—")}${det.shade ? ` · ${escapeHtml(det.shade)}%` : ""}`);
      continue;
    }
    if (sid === "ceramic") {
      lines.push(`• <b>CERAMIC</b> — ${escapeHtml(det.package || "—")}${det.wheels ? " · wheels" : ""}${det.glass ? " · glass" : ""}${det.trim ? " · trim" : ""}`);
      continue;
    }
    if (sid === "correct") {
      lines.push(`• <b>CORRECTION</b> — ${escapeHtml(det.stage || "—")}`);
      continue;
    }
    if (sid === "detail") {
      lines.push(`• <b>DETAIL</b> — ${escapeHtml(det.kind || "—")}`);
      continue;
    }
    lines.push(`• <b>${escapeHtml(title)}</b>`);
  }
  return lines.join("\n");
}

export async function POST(request, { params }) {
  const leadId = params.leadId;
  const form = await request.formData();
  const token = String(form.get("t") || "");

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });
  if (!verifyToken({ secret, leadId, token })) return Response.json({ error: "Invalid link token" }, { status: 401 });

  // Collect per-service amounts (ex VAT).
  const vendorQuoteByServiceExVat = {};
  for (const [k, v] of form.entries()) {
    const key = String(k || "");
    if (!key.startsWith("amount_")) continue;
    const sid = key.slice("amount_".length);
    if (!SERVICE_IDS.includes(sid)) continue;
    const n = safeNum(v);
    if (n == null || n <= 0) continue;
    vendorQuoteByServiceExVat[sid] = round2(n);
  }

  // Backward compatibility: allow a single total amount field.
  const legacyParsed = QuoteSchema.safeParse({
    amount_total: form.get("amount_total") != null ? String(form.get("amount_total")) : undefined,
    amount: form.get("amount") != null ? String(form.get("amount")) : undefined
  });
  if (!legacyParsed.success) return Response.json({ error: "Invalid payload", issues: legacyParsed.error.issues }, { status: 400 });

  const legacyTotal =
    safeNum(legacyParsed.data?.amount_total) ??
    safeNum(legacyParsed.data?.amount) ??
    null;

  const usingByService = Object.keys(vendorQuoteByServiceExVat).length > 0;
  const vendorQuoteTotalExVat = usingByService
    ? round2(Object.values(vendorQuoteByServiceExVat).reduce((a, b) => a + Number(b || 0), 0))
    : legacyTotal != null
      ? round2(legacyTotal)
      : null;

  if (vendorQuoteTotalExVat == null || vendorQuoteTotalExVat <= 0) {
    return Response.json({ error: "Missing quote amount(s)" }, { status: 400 });
  }

  const lead = (await getLead(leadId)) || { id: leadId };

  const vatRate = Number(process.env.VAT_RATE || 0.15);
  const safeVatRate = Number.isFinite(vatRate) && vatRate >= 0 ? vatRate : 0.15;
  const vendorQuoteTotalIncVat = round2(vendorQuoteTotalExVat * (1 + safeVatRate));
  const vendorVatAmount = round2(vendorQuoteTotalIncVat - vendorQuoteTotalExVat);

  const defaultCommissionPercent = Number(process.env.DEFAULT_COMMISSION_PERCENT || 0);
  const commissionPercent = Number.isFinite(defaultCommissionPercent) ? defaultCommissionPercent : 0;
  // Client quote is shown ex VAT for now, but cost basis includes VAT so we don't underquote.
  const clientQuoteAmountExVat = round2(vendorQuoteTotalIncVat * (1 + commissionPercent / 100));

  const now = new Date().toISOString();
  const updated = await updateLead(leadId, {
    status: "quoted",
    vendorQuoteByServiceExVat: usingByService ? vendorQuoteByServiceExVat : null,
    vendorQuoteTotalExVat,
    vendorQuoteTotalIncVat,
    vendorVatRate: safeVatRate,
    vendorVatAmount,
    commissionPercent,
    clientQuoteAmountExVat,
    quotedAt: now,
    quotedBy: null
  });

  const baseUrl = getBaseUrl(request);
  // Invoice link intentionally not pushed to Telegram. Commission is set via a token-protected link.
  const commissionLink = baseUrl ? `${baseUrl}/commission/${encodeURIComponent(leadId)}?t=${encodeURIComponent(token)}` : null;

  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || tgChatId;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      const requested = leadServiceSummaryHtml(lead);
      const byServiceLines = usingByService
        ? Object.entries(vendorQuoteByServiceExVat)
            .map(([sid, amt]) => {
              const inc = round2(Number(amt) * (1 + safeVatRate));
              return `• <b>${sid.toUpperCase()}</b>: R ${Number(amt).toFixed(2)} ex VAT (R ${inc.toFixed(2)} inc VAT)`;
            })
            .join("\n")
        : null;

      const result = await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `🧾 <b>QUOTE RECEIVED</b>\n` +
          `<b>Lead ID:</b> <code>${leadId}</code>\n` +
          `<b>Car:</b> ${lead?.car || "—"}\n` +
          `<b>Client:</b> ${lead?.name || "—"} (${lead?.number || "—"})\n` +
          (requested ? `\n<b>Requested:</b>\n${requested}\n` : "") +
          (byServiceLines ? `\n<b>Breakdown (ex VAT):</b>\n${byServiceLines}\n` : "") +
          `\n<b>Izimoto total:</b> R ${vendorQuoteTotalExVat.toFixed(2)} ex VAT\n` +
          `<b>VAT (${Math.round(safeVatRate * 100)}%):</b> R ${vendorVatAmount.toFixed(2)}\n` +
          `<b>Total inc VAT:</b> R ${vendorQuoteTotalIncVat.toFixed(2)}\n` +
          `<b>Default commission:</b> ${commissionPercent}%\n` +
          `<b>Client quote (ex VAT):</b> R ${clientQuoteAmountExVat.toFixed(2)}\n` +
          (commissionLink ? `\n<b>Add commission:</b> ${commissionLink}` : ""),
        disableWebPagePreview: false
      });
      console.log("[quote][telegram-send-ok]", { leadId, chatId: mcChatId, messageId: result?.message_id });
    } catch (err) {
      console.error("[quote][telegram-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated || null, quotedAt: now });
}
