import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";
import { telegramSendMessage } from "@/lib/telegram";
import { hmacToken } from "@/lib/linkToken";
import { SERVICES } from "@/lib/crmKitAdapter";

export const dynamic = "force-dynamic";

const SERVICE_IDS = SERVICES.map((s) => s.id).filter((id) => id !== "unsure");

const BodySchema = z
  .object({
    amountsByServiceExVat: z.record(z.string().trim().min(1), z.coerce.number().finite().min(0)).default({}),
    // Optional: allow overriding VAT rate (default 0.15)
    vatRate: z.coerce.number().finite().min(0).max(1).optional()
  })
  .strict();

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

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
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const amounts = parsed.data.amountsByServiceExVat || {};
  const vendorQuoteByServiceExVat = {};
  for (const [sid, val] of Object.entries(amounts)) {
    const key = String(sid || "");
    if (!SERVICE_IDS.includes(key)) continue;
    const n = safeNum(val);
    if (n == null || n <= 0) continue;
    vendorQuoteByServiceExVat[key] = round2(n);
  }
  if (!Object.keys(vendorQuoteByServiceExVat).length) {
    return Response.json({ error: "Missing quote amount(s)" }, { status: 400 });
  }

  const vatRate = safeNum(parsed.data.vatRate) ?? safeNum(process.env.VAT_RATE) ?? 0.15;
  const safeVatRate = Number.isFinite(vatRate) && vatRate >= 0 ? vatRate : 0.15;

  const vendorQuoteTotalExVat = round2(Object.values(vendorQuoteByServiceExVat).reduce((a, b) => a + Number(b || 0), 0));
  const vendorQuoteTotalIncVat = round2(vendorQuoteTotalExVat * (1 + safeVatRate));
  const vendorVatAmount = round2(vendorQuoteTotalIncVat - vendorQuoteTotalExVat);

  const defaultCommissionPercent = Number(process.env.DEFAULT_COMMISSION_PERCENT || 0);
  const commissionPercent = Number.isFinite(defaultCommissionPercent) ? defaultCommissionPercent : 0;
  const clientQuoteAmountExVat = round2(vendorQuoteTotalIncVat * (1 + commissionPercent / 100));

  const now = new Date().toISOString();
  const updated = await updateLead(leadId, {
    status: "quoted",
    vendorQuoteByServiceExVat,
    vendorQuoteTotalExVat,
    vendorQuoteTotalIncVat,
    vendorVatRate: safeVatRate,
    vendorVatAmount,
    commissionPercent,
    clientQuoteAmountExVat,
    quotedAt: now,
    quotedBy: session.username
  });

  // Notify M&C group.
  const baseUrl = getBaseUrl(request);
  const linkSecret = process.env.LEAD_LINK_SECRET || "";
  const t = baseUrl && linkSecret ? hmacToken({ secret: linkSecret, leadId }) : null;
  const commissionLink = baseUrl && t ? `${baseUrl}/commission/${encodeURIComponent(leadId)}?t=${encodeURIComponent(t)}` : null;

  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      const requested = leadServiceSummaryHtml(lead);
      const byServiceLines = Object.entries(vendorQuoteByServiceExVat)
        .map(([sid, amt]) => {
          const inc = round2(Number(amt) * (1 + safeVatRate));
          return `• <b>${sid.toUpperCase()}</b>: R ${Number(amt).toFixed(2)} ex VAT (R ${inc.toFixed(2)} inc VAT)`;
        })
        .join("\n");

      await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `🧾 <b>QUOTE RECEIVED</b>\n` +
          `<b>Lead ID:</b> <code>${leadId}</code>\n` +
          `<b>Car:</b> ${lead?.car || "—"}\n` +
          `<b>Client:</b> ${lead?.name || "—"} (${lead?.number || "—"})\n` +
          (requested ? `\n<b>Requested:</b>\n${requested}\n` : "") +
          `\n<b>Breakdown (ex VAT):</b>\n${byServiceLines}\n` +
          `\n<b>Izimoto total:</b> R ${vendorQuoteTotalExVat.toFixed(2)} ex VAT\n` +
          `<b>VAT (${Math.round(safeVatRate * 100)}%):</b> R ${vendorVatAmount.toFixed(2)}\n` +
          `<b>Total inc VAT:</b> R ${vendorQuoteTotalIncVat.toFixed(2)}\n` +
          `<b>Default commission:</b> ${commissionPercent}%\n` +
          `<b>Client quote (ex VAT):</b> R ${clientQuoteAmountExVat.toFixed(2)}\n` +
          (commissionLink ? `\n<b>Add commission:</b> ${commissionLink}` : ""),
        disableWebPagePreview: false
      });
    } catch (err) {
      console.error("[vendor-quote][telegram][mc-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated || null, quotedAt: now });
}
