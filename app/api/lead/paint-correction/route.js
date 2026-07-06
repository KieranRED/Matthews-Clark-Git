import { z } from "zod";
import crypto from "node:crypto";

import { getLead, saveLead, upsertClientForLead } from "@/lib/leadStore";
import { hmacToken, verifyToken } from "@/lib/linkToken";
import { sendLeadConversions } from "@/lib/adsCapi";
import { PC_PACKAGES, pcPricing, pcPaymentSchedule, pcVendorQuote, pcBusinessRange, pcIsoDate, pcIsStartBookable } from "@/app/paint-correction/pcData";

export const dynamic = "force-dynamic";

const PackageIds = PC_PACKAGES.map((p) => p.id);

const Schema = z.object({
  name: z.string().trim().min(1).max(80),
  surname: z.string().trim().max(80).optional().default(""),
  dial: z.string().trim().max(8).optional(),
  number: z.string().trim().min(7).max(40),
  email: z.union([z.string().trim().email(), z.literal("")]).optional().default(""),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.string().trim().regex(/^\d{4}$/),
  car: z.string().trim().min(1).max(160).optional(),
  package: z.enum(PackageIds),
  ceramic: z.boolean().default(false),
  price: z.number().optional(),
  deposit: z.number().optional(),
  balance: z.number().optional(),
  dueAtDropoff: z.number().optional(),
  dueAtPickup: z.number().optional(),
  durationDays: z.number().optional(),
  pickup: z.string().nullable().optional(),
  reference: z.string().trim().max(40).optional(),
  dropoff: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z.record(z.string()).optional(),
  eventId: z.string().max(128).nullable().optional(),
  utm: z
    .object({
      source: z.string().trim().max(120).nullable().optional(),
      medium: z.string().trim().max(120).nullable().optional(),
      campaign: z.string().trim().max(120).nullable().optional(),
      content: z.string().trim().max(120).nullable().optional(),
      term: z.string().trim().max(120).nullable().optional()
    })
    .nullable()
    .optional(),
  clickIds: z
    .object({
      fbclid: z.string().max(512).nullable().optional(),
      ttclid: z.string().max(512).nullable().optional(),
      gclid: z.string().max(512).nullable().optional(),
      fbp: z.string().max(256).nullable().optional(),
      fbc: z.string().max(256).nullable().optional()
    })
    .nullable()
    .optional(),
  pageUrl: z.string().url().nullable().optional(),
  referrer: z.string().max(1024).nullable().optional(),
  // Set when a quiz-lead (contact-capture) record already exists for this
  // session — enriches that record in place instead of creating a duplicate.
  leadId: z.string().trim().min(1).max(80).optional(),
  t: z.string().trim().min(1).optional()
});

const STAGE_BY_PACKAGE = { "stage-one": "stage1", bronze: "stage2", silver: "stage2", gold: "stage3", diamond: "stage3" };

function fmt(d) {
  try { return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }); } catch { return String(d); }
}

export async function POST(request) {
  let json;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const pkg = PC_PACKAGES.find((p) => p.id === d.package);
  if (!pkg) return Response.json({ error: "Unknown package" }, { status: 400 });

  // Recompute pricing + schedule server-side — never trust client amounts.
  // The ad funnel uses a flat R1,000 hold + drop-off/pickup split rather than
  // pcPricing's 60% deposit (see pcPaymentSchedule doc comment — that 60%
  // figure is still used elsewhere, for the unrelated general quote tool).
  const { price, durationDays, ceramicOn } = pcPricing(pkg, d.ceramic);
  const { hold: deposit, dueAtDropoff, dueAtPickup, balance } = pcPaymentSchedule(price, durationDays);
  // Izimoto always takes 10% of the package, PC-only — this is what makes the
  // CRM's commission math (clientQuote - vendorQuoteTotalIncVat) show M&C's
  // real ~90% margin instead of 100% (no vendor cost was ever recorded for
  // PC leads before this).
  const vendorQuote = pcVendorQuote(price);

  const dropoffDate = new Date(d.dropoff + "T00:00:00");
  if (Number.isNaN(dropoffDate.getTime())) return Response.json({ error: "Invalid drop-off date" }, { status: 400 });
  const range = pcBusinessRange(dropoffDate, durationDays);
  const pickupDate = range[range.length - 1];
  const bookedDates = range.map(pcIsoDate);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minStart = new Date(today); minStart.setDate(minStart.getDate() + 1);
  if (dropoffDate < minStart) return Response.json({ error: "Drop-off must be a future business day" }, { status: 400 });
  if (!pcIsStartBookable(dropoffDate, durationDays, new Set())) {
    return Response.json({ error: "That drop-off date can’t fit the full job" }, { status: 400 });
  }

  const carLabel = (d.car || `${d.make} ${d.model} ${d.year}`).trim();
  const fullName = [d.name, d.surname].filter(Boolean).join(" ").trim();

  // Enrich the quiz-lead record created right after contact-capture, if one
  // exists for this session, instead of creating a duplicate.
  let existing = null;
  if (d.leadId && d.t && verifyToken({ secret: process.env.LEAD_LINK_SECRET, leadId: d.leadId, token: d.t })) {
    existing = await getLead(d.leadId);
  }
  const isUpdate = !!existing;
  const leadId = isUpdate ? d.leadId : crypto.randomUUID();
  const createdAt = existing?.createdAt || new Date().toISOString();

  const daysUntil = Math.round((dropoffDate - today) / 86400000);
  const timeframe = daysUntil <= 7 ? "this-week" : daysUntil <= 31 ? "this-month" : "no-rush";

  const leadRecord = {
    id: leadId,
    firstName: d.name,
    surname: d.surname || "",
    name: fullName,
    number: d.number,
    dial: d.dial || "+27",
    email: d.email || null,
    car: carLabel,
    make: d.make,
    model: d.model,
    year: d.year,
    services: ["correct"],
    serviceDetails: {
      correct: {
        stage: STAGE_BY_PACKAGE[pkg.id] || "stage2",
        notes: `${pkg.name}${ceramicOn ? " + 18-month ceramic" : ""} · ${fmt(dropoffDate)} → ${fmt(pickupDate)} · R${deposit.toLocaleString("en-ZA")} hold · R${dueAtDropoff.toLocaleString("en-ZA")} at drop-off${dueAtPickup > 0 ? ` · R${dueAtPickup.toLocaleString("en-ZA")} at pickup` : ""}`
      }
    },
    lane: "present",
    timeframe,
    source: "ADS",
    funnel: "paint-correction",
    status: "new",
    createdAt,
    updatedAt: createdAt,
    invoiceStatus: "due",
    reference: d.reference || null,
    eventId: existing?.eventId || d.eventId || null,
    utm: d.utm || null,
    clickIds: d.clickIds || null,
    pageUrl: d.pageUrl || null,
    referrer: d.referrer || null,
    // Izimoto's fixed 10% cut — set automatically, PC-only (see pcVendorQuote
    // doc comment). Doesn't touch the manual vendor-pricing flow other
    // services use (set_vendor_pricing MCP tool), and can still be overridden
    // there for a genuine exception.
    vendorQuoteTotalIncVat: vendorQuote.incVat,
    vendorQuoteTotalExVat: vendorQuote.exVat,
    vendorQuoteByServiceExVat: { correct: vendorQuote.exVat },
    paintCorrection: {
      packageId: pkg.id,
      packageName: pkg.name,
      ceramic: ceramicOn,
      price,
      // holdAmount/dueAtDropoff/dueAtPickup are the source of truth for the
      // drop-off/pickup payment split; deposit/balance are kept populated
      // too (deposit=holdAmount, balance=dueAtDropoff+dueAtPickup) for
      // anything older that still reads those two field names.
      holdAmount: deposit,
      dueAtDropoff,
      dueAtPickup,
      dropoffPaidAt: existing?.paintCorrection?.dropoffPaidAt || null,
      pickupPaidAt: existing?.paintCorrection?.pickupPaidAt || null,
      deposit,
      balance,
      durationDays,
      dropoff: d.dropoff,
      pickup: pcIsoDate(pickupDate),
      reference: d.reference || null,
      answers: d.answers || null,
      upsells: [],
      remindersSent: []
    },
    booking: {
      status: "pending", // becomes "held" once a POP is uploaded (then it blocks the calendar)
      source: "client-pc",
      dropoffDate: d.dropoff,
      pickupDate: pcIsoDate(pickupDate),
      durationDays,
      bookedDates,
      scheduledAt: dropoffDate.toISOString(),
      updatedAt: createdAt
    }
  };

  // attach/create client (repeat leads share clientId by phone/email)
  try {
    const client = await upsertClientForLead(leadRecord);
    if (client?.id) leadRecord.clientId = client.id;
  } catch (err) {
    console.error("[pc-lead][client-upsert-failed]", err);
  }

  await saveLead(leadRecord);
  console.log("[pc-lead]", { leadId, isUpdate, name: fullName, car: carLabel, package: pkg.id, dropoff: d.dropoff });

  // Server-side "Lead" conversion (CAPI) — only for genuinely new leads. When
  // enriching an existing quiz-lead record, the Lead event already fired at
  // contact-capture; firing it again here would double-count conversions
  // against the same ad set. Env-gated, never fatal.
  if (!isUpdate) {
    try {
      const capi = await sendLeadConversions({ lead: leadRecord, request });
      if (capi && Object.keys(capi).length) console.log("[pc-lead][capi]", { leadId, ...capi });
    } catch (err) {
      console.error("[pc-lead][capi-failed]", err);
    }
  }

  const token = process.env.LEAD_LINK_SECRET ? hmacToken({ secret: process.env.LEAD_LINK_SECRET, leadId }) : null;

  // NOTE: no Telegram alert on lead creation. The team is only pinged once the
  // client actually uploads their proof of payment (see pc-deposit route), so a
  // notification always means a real deposit to action — not just a page view.
  // The lead is still saved and visible in the CRM dashboard in the meantime.

  return Response.json({ ok: true, leadId, token, reference: d.reference || null });
}
