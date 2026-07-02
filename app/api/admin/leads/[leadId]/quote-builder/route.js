import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";
import { allocateInvoiceDigits } from "@/lib/invoiceSeq";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    // Percent commission by service (markup on vendor cost inc VAT)
    commissionByServicePercent: z.record(z.string().trim().min(1), z.coerce.number().finite().min(0).max(500)).default({}),
    // Fixed commission by service (ZAR markup on vendor cost inc VAT)
    commissionByServiceFixedZar: z.record(z.string().trim().min(1), z.coerce.number().finite().min(0)).default({}),
    // Mode per service: percent | fixed
    commissionByServiceMode: z.record(z.string().trim().min(1), z.enum(["percent", "fixed", "total"])).default({}),
    // When mode=total: explicit client price per service (ex VAT) - must be >= vendor inc VAT basis.
    commissionByServiceTotalExVat: z.record(z.string().trim().min(1), z.coerce.number().finite().min(0)).default({}),
    // Optional override for VAT rate used in cost basis (defaults to lead.vendorVatRate or 0.15)
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

  const vendorByService =
    lead.vendorQuoteByServiceExVat && typeof lead.vendorQuoteByServiceExVat === "object" ? lead.vendorQuoteByServiceExVat : null;

  if (!vendorByService || !Object.keys(vendorByService).length) {
    return Response.json({ error: "No vendor breakdown saved yet. Generate the Izimoto quote link and submit per service first." }, { status: 400 });
  }

  const baseVatRate = safeNum(parsed.data.vatRate) ?? safeNum(lead.vendorVatRate) ?? 0.15;
  const vatRate = Number.isFinite(baseVatRate) && baseVatRate >= 0 ? baseVatRate : 0.15;

  const commissionByServicePercent = parsed.data.commissionByServicePercent || {};
  const commissionByServiceFixedZar = parsed.data.commissionByServiceFixedZar || {};
  const commissionByServiceMode = parsed.data.commissionByServiceMode || {};
  const commissionByServiceTotalExVat = parsed.data.commissionByServiceTotalExVat || {};

  const clientQuoteByServiceExVat = {};
  let totalClientExVat = 0;
  let totalVendorExVat = 0;
  let totalVendorIncVat = 0;

  for (const [sid, exVat] of Object.entries(vendorByService)) {
    const vendorEx = safeNum(exVat) ?? 0;
    if (vendorEx < 0) continue;
    const vendorInc = round2(vendorEx * (1 + vatRate));
    const mode = String(commissionByServiceMode[sid] || "percent");
    let clientEx = vendorInc;
    if (mode === "total") {
      const total = safeNum(commissionByServiceTotalExVat[sid]);
      if (total != null && total >= 0) {
        if (total < vendorInc) {
          return Response.json({ error: `Total for ${sid.toUpperCase()} must be >= base (R ${vendorInc.toFixed(2)}).` }, { status: 400 });
        }
        clientEx = round2(total);
      } else {
        return Response.json({ error: `Missing total for ${sid.toUpperCase()}.` }, { status: 400 });
      }
    } else if (mode === "fixed") {
      const fixed = safeNum(commissionByServiceFixedZar[sid]) ?? 0;
      clientEx = round2(vendorInc + Math.max(0, fixed));
    } else {
      const pct = safeNum(commissionByServicePercent[sid]) ?? safeNum(lead.commissionPercent) ?? safeNum(process.env.DEFAULT_COMMISSION_PERCENT) ?? 0;
      clientEx = round2(vendorInc * (1 + pct / 100));
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
    vendorVatRate: safeNum(lead.vendorVatRate) ?? vatRate,
    updatedAt: new Date().toISOString(),
    quoteBuiltAt: new Date().toISOString(),
    quoteBuiltBy: session.username,
    invoiceCreatedAt: lead.invoiceCreatedAt || new Date().toISOString(),
    invoiceNumber: lead.invoiceNumber || (await allocateInvoiceDigits()) || String(leadId).replace(/[^0-9]/g, "").slice(-5).padStart(5, "0"),
    invoiceStatus: lead.invoiceStatus || "due"
  };

  const updated = await updateLead(leadId, patch);
  return Response.json({ ok: true, leadId, lead: updated });
}
