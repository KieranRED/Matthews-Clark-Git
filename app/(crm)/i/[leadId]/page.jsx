import { getLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";
import { invoiceDisplayFromDigits } from "@/lib/invoiceSeq";

import InvoiceClient from "./invoice-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice — Matthews & Clark × Izimoto"
};

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function buildInvoiceModel({ leadId, lead }) {
  const vendorByService =
    lead?.vendorQuoteByServiceExVat && typeof lead.vendorQuoteByServiceExVat === "object" ? lead.vendorQuoteByServiceExVat : null;
  const clientByService =
    lead?.clientQuoteByServiceExVat && typeof lead.clientQuoteByServiceExVat === "object" ? lead.clientQuoteByServiceExVat : null;

  const vatRate = safeNum(lead?.vendorVatRate) ?? 0.15;
  const vendorExVat = safeNum(lead?.vendorQuoteTotalExVat) ?? (vendorByService ? Object.values(vendorByService).reduce((s, v) => s + (safeNum(v) ?? 0), 0) : null);
  const vendorIncVat =
    safeNum(lead?.vendorQuoteTotalIncVat) ?? (vendorExVat != null ? round2(vendorExVat * (1 + vatRate)) : null);
  const vendorVatAmount = vendorIncVat != null && vendorExVat != null ? round2(vendorIncVat - vendorExVat) : null;

  const clientTotalExVat =
    safeNum(lead?.clientQuoteTotalExVat) ??
    safeNum(lead?.clientQuoteAmountExVat) ??
    (clientByService ? Object.values(clientByService).reduce((s, v) => s + (safeNum(v) ?? 0), 0) : null);
  const baseClientTotalExVat = clientTotalExVat;

  const rawStored = String(lead?.invoiceNumber || "").trim();
  const extractedDigits = rawStored.replace(/[^\d]/g, "");
  const invoiceDigits = extractedDigits ? extractedDigits.slice(-5).padStart(5, "0") : null;
  const legacyShort = String(rawStored || leadId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();
  const invoiceNumberDisplay = invoiceDigits ? invoiceDisplayFromDigits(invoiceDigits) : `MC_${legacyShort.padStart(5, "0")}`;
  const invoiceRef = String(lead?.invoiceReference || "").trim() || invoiceNumberDisplay;
  const createdAt = lead?.invoiceCreatedAt || lead?.quoteBuiltAt || lead?.quotedAt || lead?.createdAt || new Date().toISOString();
  const status = String(lead?.invoiceStatus || "due");

  const serviceIds = vendorByService ? Object.keys(vendorByService) : Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];

  const lines = (serviceIds || [])
    .map((sid) => {
      const vendorEx = vendorByService ? safeNum(vendorByService?.[sid]) : null;
      if (vendorByService && !(vendorEx > 0)) return null;
      const vendorInc = vendorEx != null ? round2(vendorEx * (1 + vatRate)) : null;
      const clientEx = clientByService ? safeNum(clientByService?.[sid]) : null;
      return {
        sid,
        vendorEx,
        vendorInc,
        clientEx
      };
    })
    .filter(Boolean);

  const oneOffLines = (Array.isArray(lead?.upsells) ? lead.upsells : [])
    .map((item) => {
      const clientEx = safeNum(item?.amountExVat);
      if (!(clientEx > 0)) return null;
      const id = String(item?.id || item?.label || "one-off").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "one-off";
      return {
        kind: "one_off",
        sid: `one_off:${id}`,
        label: String(item?.label || "One-off service"),
        notes: item?.notes ? String(item.notes) : null,
        serviceId: item?.serviceId || null,
        clientEx: round2(clientEx)
      };
    })
    .filter(Boolean);

  const oneOffTotalExVat = round2(oneOffLines.reduce((s, ln) => s + (safeNum(ln.clientEx) ?? 0), 0));
  const fullClientTotalExVat =
    baseClientTotalExVat != null ? round2(baseClientTotalExVat + oneOffTotalExVat) : oneOffTotalExVat > 0 ? oneOffTotalExVat : null;

  return {
    invoiceNo: invoiceDigits || legacyShort,
    invoiceNumberDisplay,
    invoiceRef,
    createdAt,
    status,
    leadId,
    client: { name: lead?.name || "—", phone: lead?.number || "—", email: lead?.email || null, address: lead?.clientAddress || null },
    vehicle: lead?.car || "—",
    serviceDetails: lead?.serviceDetails && typeof lead.serviceDetails === "object" ? lead.serviceDetails : null,
    bank: {
      name: process.env.INVOICE_BANK_NAME || "FNB",
      holder: process.env.INVOICE_BANK_HOLDER || "Keanan Matthews",
      type: process.env.INVOICE_BANK_TYPE || "FNBy Next Transact Account",
      number: process.env.INVOICE_BANK_NUMBER || "62883053086",
      branch: process.env.INVOICE_BANK_BRANCH || "250655"
    },
    vendor: { exVat: vendorExVat, incVat: vendorIncVat, vatRate, vatAmount: vendorVatAmount },
    clientTotalExVat: fullClientTotalExVat,
    lines: [...lines, ...oneOffLines],
    // For now M&C is not VAT registered: we show client totals ex VAT.
    clientVatRate: 0
  };
}

export default async function InvoicePage({ params, searchParams }) {
  const leadId = params.leadId;
  const token = searchParams?.t || "";

  const secret = process.env.LEAD_LINK_SECRET;
  const valid = secret ? verifyToken({ secret, leadId, token }) : false;
  if (!valid) {
    return (
      <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#050505", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, textTransform: "uppercase" }}>Invalid invoice link</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>Ask Matthews &amp; Clark for a new link.</div>
        </div>
      </main>
    );
  }

  const lead = (await getLead(leadId)) || null;
  if (!lead) {
    return (
      <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#050505", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, textTransform: "uppercase" }}>Invoice not found</div>
        </div>
      </main>
    );
  }

  const model = buildInvoiceModel({ leadId, lead });
  return <InvoiceClient model={model} />;
}
