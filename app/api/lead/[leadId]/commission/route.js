import { z } from "zod";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";
import { allocateInvoiceDigits } from "@/lib/invoiceSeq";
import { telegramSendMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const SERVICE_IDS = ["ppf", "wrap", "tint", "ceramic", "correct", "detail", "wheel", "kit"];

const ModeSchema = z.enum(["percent", "fixed", "total"]);

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

export async function POST(request, { params }) {
  const leadId = String(params.leadId || "");
  const form = await request.formData();
  const token = String(form.get("t") || "");

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });
  if (!verifyToken({ secret, leadId, token })) return Response.json({ error: "Invalid link token" }, { status: 401 });

  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const vendorByService =
    lead.vendorQuoteByServiceExVat && typeof lead.vendorQuoteByServiceExVat === "object" ? lead.vendorQuoteByServiceExVat : null;
  if (!vendorByService || !Object.keys(vendorByService).length) {
    return Response.json({ error: "No vendor breakdown saved yet." }, { status: 400 });
  }

  const vendorVatRate = safeNum(lead.vendorVatRate) ?? 0.15;
  const vatRate = Number.isFinite(vendorVatRate) && vendorVatRate >= 0 ? vendorVatRate : 0.15;

  const defaultCommissionPercent = safeNum(lead.commissionPercent) ?? safeNum(process.env.DEFAULT_COMMISSION_PERCENT) ?? 0;

  const commissionByServiceMode = {};
  const commissionByServicePercent = {};
  const commissionByServiceFixedZar = {};
  const commissionByServiceTotalExVat = {};

  for (const sid of SERVICE_IDS) {
    if (!(sid in vendorByService)) continue;
    const modeRaw = String(form.get(`mode_${sid}`) || "percent");
    const parsedMode = ModeSchema.safeParse(modeRaw);
    const mode = parsedMode.success ? parsedMode.data : "percent";
    const val = safeNum(form.get(`value_${sid}`));

    commissionByServiceMode[sid] = mode;
    if (mode === "fixed") {
      commissionByServiceFixedZar[sid] = round2(Math.max(0, val ?? 0));
    } else if (mode === "total") {
      commissionByServiceTotalExVat[sid] = round2(Math.max(0, val ?? 0));
    } else {
      // percent
      const pct = val == null ? defaultCommissionPercent : val;
      commissionByServicePercent[sid] = round2(Math.max(0, pct));
    }
  }

  const clientQuoteByServiceExVat = {};
  let totalClientExVat = 0;
  let totalVendorExVat = 0;
  let totalVendorIncVat = 0;

  for (const [sid, exVat] of Object.entries(vendorByService)) {
    const vendorEx = safeNum(exVat) ?? 0;
    if (!(vendorEx > 0)) continue;
    const vendorInc = round2(vendorEx * (1 + vatRate));

    const mode = String(commissionByServiceMode[sid] || "percent");
    let clientEx = vendorInc;
    if (mode === "total") {
      const total = safeNum(commissionByServiceTotalExVat[sid]);
      if (total == null || !(total > 0)) {
        return Response.json({ error: `Missing total for ${sid.toUpperCase()}.` }, { status: 400 });
      }
      if (total < vendorInc) {
        return Response.json({ error: `Total for ${sid.toUpperCase()} must be >= base (R ${vendorInc.toFixed(2)}).` }, { status: 400 });
      }
      clientEx = round2(total);
    } else if (mode === "fixed") {
      const fixed = safeNum(commissionByServiceFixedZar[sid]) ?? 0;
      clientEx = round2(vendorInc + Math.max(0, fixed));
    } else {
      const pct =
        safeNum(commissionByServicePercent[sid]) ??
        defaultCommissionPercent ??
        0;
      clientEx = round2(vendorInc * (1 + Math.max(0, pct) / 100));
    }

    clientQuoteByServiceExVat[sid] = clientEx;
    totalClientExVat += clientEx;
    totalVendorExVat += vendorEx;
    totalVendorIncVat += vendorInc;
  }

  totalClientExVat = round2(totalClientExVat);
  totalVendorExVat = round2(totalVendorExVat);
  totalVendorIncVat = round2(totalVendorIncVat);

  const patch = {
    commissionByServiceMode,
    commissionByServicePercent,
    commissionByServiceFixedZar,
    commissionByServiceTotalExVat,
    clientQuoteByServiceExVat,
    clientQuoteTotalExVat: totalClientExVat,
    clientQuoteAmountExVat: totalClientExVat,
    vendorQuoteTotalExVat: safeNum(lead.vendorQuoteTotalExVat) ?? totalVendorExVat,
    vendorQuoteTotalIncVat: safeNum(lead.vendorQuoteTotalIncVat) ?? totalVendorIncVat,
    updatedAt: new Date().toISOString(),
    quoteBuiltAt: new Date().toISOString(),
    quoteBuiltBy: "mc_link",
    // Invoice is considered generated once commission is finalized.
    invoiceCreatedAt: lead.invoiceCreatedAt || new Date().toISOString(),
    invoiceNumber: lead.invoiceNumber || (await allocateInvoiceDigits()) || String(leadId).replace(/[^0-9]/g, "").slice(-5).padStart(5, "0"),
    invoiceStatus: lead.invoiceStatus || "due"
  };

  const updated = await updateLead(leadId, patch);
  const baseUrl = getBaseUrl(request);
  const invoiceUrl = baseUrl ? `${baseUrl}/i/${encodeURIComponent(leadId)}?t=${encodeURIComponent(token)}` : null;

  // Notify M&C group with updated totals (base inc VAT vs client totals).
  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      const lines = Object.entries(vendorByService)
        .map(([sid, amt]) => {
          const vendorEx = safeNum(amt) ?? 0;
          const vendorInc = round2(vendorEx * (1 + vatRate));
          const clientEx = safeNum(clientQuoteByServiceExVat?.[sid]) ?? 0;
          return `• <b>${sid.toUpperCase()}</b>: base R ${vendorInc.toFixed(2)} (incl VAT) → client R ${clientEx.toFixed(2)} (ex VAT)`;
        })
        .join("\n");

      await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `✅ <b>COMMISSION UPDATED</b>\n` +
          `<b>Lead ID:</b> <code>${leadId}</code>\n` +
          `<b>Client:</b> ${String(updated?.name || lead?.name || "—")}\n` +
          `<b>Car:</b> ${String(updated?.car || lead?.car || "—")}\n\n` +
          `${lines}\n\n` +
          `<b>Base total (incl VAT):</b> R ${totalVendorIncVat.toFixed(2)}\n` +
          `<b>Client total (ex VAT):</b> R ${totalClientExVat.toFixed(2)}`,
        disableWebPagePreview: true
      });
    } catch (err) {
      console.error("[commission-link][telegram-send-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated, invoiceUrl });
}
