import crypto from "node:crypto";

import { listClients, listLeads, normalizePhone } from "@/lib/leadStore";
import { listJobs } from "@/lib/jobStore";
import { listTasks } from "@/lib/taskStore";
import { accentForRole, listTeamMembers, roleLabel } from "@/lib/teamStore";

const STAGES = [
  { id: "new", label: "New lead", color: "#1F4FFF" },
  { id: "quoted", label: "Quoted", color: "#4A78FF" },
  { id: "booked", label: "Booked", color: "#7A9BFF" },
  { id: "in-bay", label: "In bay", color: "#F2C94C" },
  { id: "reveal", label: "Awaiting reveal", color: "#56CCF2" },
  { id: "delivered", label: "Delivered", color: "#27AE60" },
  { id: "aftercare", label: "Aftercare", color: "#9B51E0" },
  { id: "lost", label: "Lost / Cold", color: "#7A7A7A" }
];

const SOURCES = [
  { id: "tiktok", label: "TikTok", color: "#1F4FFF" },
  { id: "ig", label: "Instagram", color: "#4A78FF" },
  { id: "web", label: "Website", color: "#7A9BFF" },
  { id: "ref", label: "Referral", color: "#9B51E0" },
  { id: "walk", label: "Walk-in", color: "#7A7A7A" }
];

const SERVICES = [
  { id: "detail", label: "Detail" },
  { id: "correct", label: "Paint correction" },
  { id: "ceramic", label: "Ceramic" },
  { id: "ppf", label: "PPF" },
  { id: "wrap", label: "Wrap" },
  { id: "tint", label: "Tint" },
  { id: "wheel", label: "Wheels (Powder / Refurb)" },
  { id: "kit", label: "Bodykit" },
  { id: "starlight", label: "Starlight Headliner" },
  { id: "interior", label: "Custom Interiors" },
  { id: "audit", label: "Pre-purchase audit" },
  { id: "unsure", label: "I'm not sure yet" }
];

function monthYear(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

function dayISO(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

function sumNumRecord(obj) {
  if (!obj || typeof obj !== "object") return null;
  const vals = Object.values(obj);
  if (!vals.length) return null;
  let s = 0;
  let any = false;
  for (const v of vals) {
    const n = safeNum(v);
    if (n == null) continue;
    any = true;
    s += n;
  }
  return any ? s : null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function stageForLead(lead) {
  const status = String(lead?.status || "new");
  if (status === "lost") return "lost";
  if (status === "completed") return "delivered";
  if (status === "in_progress") return "in-bay";
  if (status === "booked") return "booked";

  const vendor =
    safeNum(lead?.vendorQuoteTotalExVat) ??
    sumNumRecord(lead?.vendorQuoteByServiceExVat) ??
    safeNum(lead?.vendorQuoteAmount) ??
    safeNum(lead?.quoteAmount);
  if (status === "quoted" || vendor) return "quoted";
  if (status === "called") return "new";
  return "new";
}

function consultState(lead) {
  const c = lead?.consultation && typeof lead.consultation === "object" ? lead.consultation : null;
  if (!c) return { required: false, status: "none" };
  const required = Boolean(c.required);
  const status = String(c.status || (required ? "needed" : "none"));
  return { required, status };
}

function invoiceState(lead) {
  const createdAt = lead?.invoiceCreatedAt || lead?.quoteBuiltAt || null;
  const rawStatus = String(lead?.invoiceStatus || (createdAt ? "due" : "none"));
  const paidAt = lead?.invoicePaidAt || null;
  const sentAt = lead?.invoiceSentAt || null;
  const expiresAt = lead?.invoiceExpiresAt || null;

  // An unpaid invoice becomes "overdue" after its 7-day deposit window closes.
  const isOverdue =
    expiresAt &&
    !["deposit_paid", "paid"].includes(rawStatus) &&
    Date.parse(expiresAt) < Date.now();

  const status = isOverdue ? "overdue" : rawStatus;
  return { createdAt, status, paidAt, sentAt, expiresAt, isOverdue };
}

function bookingState(lead) {
  const b = lead?.booking && typeof lead.booking === "object" ? lead.booking : null;
  const status = String(b?.status || "none");
  const scheduledAt = b?.scheduledAt || null;
  const proposed = Array.isArray(b?.proposedSlots) ? b.proposedSlots.filter(Boolean) : [];
  return { status, scheduledAt, proposedSlots: proposed };
}

function refForLead(id) {
  const s = String(id || "");
  const short = s.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase();
  return short ? `MC-${short}` : "MC";
}

function sourceIdForLead(lead) {
  const s = String(lead?.source || "").toLowerCase();
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("insta")) return "ig";
  if (s.includes("ref")) return "ref";
  if (s.includes("walk")) return "walk";
  if (s.includes("web")) return "web";
  return null;
}

function buildActivity({ leads, clientsById }) {
  const rows = [];
  for (const lead of leads) {
    if (!lead?.id) continue;
    const who = lead?.name || clientsById.get(lead.clientId || "")?.name || "Client";
    if (lead.createdAt) {
      rows.push({
        id: `new:${lead.id}`,
        jobId: lead.id,
        type: "lead",
        who,
        text: `New lead captured · ${lead.car || "Car"} · ${(Array.isArray(lead.services) ? lead.services : []).join(" · ") || "—"}`,
        at: lead.createdAt
      });
    }
    if (lead.calledAt) {
      rows.push({
        id: `called:${lead.id}`,
        jobId: lead.id,
        type: "stage",
        who: lead.calledByName || "Team",
        text: "Marked as called",
        at: lead.calledAt
      });
    }
    if (lead.quotedAt) {
      rows.push({
        id: `quoted:${lead.id}`,
        jobId: lead.id,
        type: "stage",
        who: lead.quotedBy || "Team",
        text: "Quote sent / received",
        at: lead.quotedAt
      });
    }
    if (lead.bookedAt) {
      rows.push({
        id: `booked:${lead.id}`,
        jobId: lead.id,
        type: "stage",
        who: lead.bookedBy || "Team",
        text: "Marked as booked",
        at: lead.bookedAt
      });
    }
    if (lead.consultationScheduledAt) {
      rows.push({
        id: `consult:${lead.id}`,
        jobId: lead.id,
        type: "stage",
        who: lead?.consultation?.method ? `Consult (${lead.consultation.method})` : "Consult",
        text: "Consultation scheduled",
        at: lead.consultationScheduledAt
      });
    }
    if (lead.invoiceSentAt) {
      rows.push({
        id: `invoice_sent:${lead.id}`,
        jobId: lead.id,
        type: "stage",
        who: lead.invoiceSentBy || "Team",
        text: "Invoice emailed",
        at: lead.invoiceSentAt
      });
    }
    if (lead.invoicePaidAt || String(lead.invoiceStatus || "") === "paid") {
      rows.push({
        id: `invoice_paid:${lead.id}`,
        jobId: lead.id,
        type: "stage",
        who: lead.invoicePaidByName || lead.invoicePaidBy || "Team",
        text: "Invoice marked paid",
        at: lead.invoicePaidAt || lead.updatedAt || lead.createdAt || new Date().toISOString()
      });
    }
    if (lead?.booking?.scheduledAt) {
      rows.push({
        id: `booking:${lead.id}`,
        jobId: lead.id,
        type: "stage",
        who: lead?.booking?.scheduledBy || "Client",
        text: "Booking confirmed",
        at: lead.booking.scheduledAt
      });
    }
    const notes = Array.isArray(lead.notes) ? lead.notes : [];
    for (const note of notes.slice(0, 8)) {
      rows.push({
        id: `note:${lead.id}:${note?.at || ""}`,
        jobId: lead.id,
        type: "note",
        who: note?.by || "Team",
        text: String(note?.text || "").slice(0, 400),
        at: note?.at || lead.createdAt || new Date().toISOString()
      });
    }
  }

  rows.sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0));
  return rows.slice(0, 80);
}

export async function getCrmKitData({ limit = 200 } = {}) {
  const safeLimit = Math.max(1, Math.min(400, Number(limit) || 200));
  const nowMs = Date.now();
  const [leads, clients, jobs, tasks, team] = await Promise.all([
    listLeads({ limit: safeLimit }),
    listClients({ limit: safeLimit }),
    listJobs({ limit: safeLimit }),
    listTasks({ limit: safeLimit }),
    listTeamMembers({ limit: 80 })
  ]);

  const clientsById = new Map();
  for (const c of clients) {
    if (c?.id) clientsById.set(String(c.id), c);
  }

  // Vehicles (stored on client) + per-lead fallback vehicles so every lead can render.
  const vehicles = [];
  const vehicleById = new Map();
  const addVehicle = (v) => {
    if (!v?.id || vehicleById.has(v.id)) return;
    vehicleById.set(v.id, v);
    vehicles.push(v);
  };

  for (const client of clients) {
    const vList = Array.isArray(client?.vehicles) ? client.vehicles : [];
    for (const v of vList) {
      const id = String(v?.id || `${client.id}:${normalizePhone(v?.plate || "")}:${v?.label || ""}` || crypto.randomUUID());
      addVehicle({
        id,
        contactId: String(client.id),
        label: String(v?.label || v?.make || "Vehicle"),
        year: v?.year ?? null,
        colour: v?.color || v?.colour || null,
        plate: v?.plate || v?.reg || null
      });
    }
  }

  // Synthetic contacts from lead data (for leads without a live client record).
  // This handles both leads that never had a clientId and leads whose client
  // was deleted (stale clientId pointing to a non-existent record).
  const leadContactById = new Map();
  for (const lead of leads) {
    if (!lead?.id) continue;
    const hasLiveClient = lead.clientId && clientsById.has(String(lead.clientId));
    const contactId = hasLiveClient ? String(lead.clientId) : `lead-contact:${lead.id}`;
    addVehicle({
      id: `lead:${lead.id}`,
      contactId,
      label: String(lead.car || "Vehicle"),
      year: null,
      colour: null,
      plate: null
    });
    // No live client — build a synthetic contact from the lead's own data.
    if (!hasLiveClient) {
      const name = lead.name || lead.phone || lead.number || "Lead";
      leadContactById.set(contactId, {
        id: contactId,
        name,
        phone: lead.phone || lead.number || null,
        phoneNorm: null,
        email: lead.email || null,
        area: null,
        vip: false,
        joined: null,
        leadCount: 1,
        synthetic: true
      });
    }
  }

  // Contacts (clients) + synthetic lead contacts for unmatched leads.
  const contacts = [
    ...clients.map((c) => ({
      id: String(c.id),
      name: c.name || c.phone || "Client",
      phone: c.phone || null,
      phoneNorm: c.phoneNorm || null,
      email: c.email || null,
      area: c.area || null,
      partnerName: c.partnerName || null,
      vip: Array.isArray(c.tags) ? c.tags.includes("vip") : Boolean(c.vip),
      joined: monthYear(c.createdAt) || null,
      leadCount: Number(c.leadCount || 0)
    })),
    ...leadContactById.values()
  ];

  const jobByLeadId = new Map();
  for (const j of jobs) {
    if (j?.leadId) jobByLeadId.set(String(j.leadId), j);
  }

  // UI "jobs" (pipeline cards) are leads with some job fields merged in.
  const uiJobs = leads.map((lead) => {
    const id = String(lead.id);
    const job = jobByLeadId.get(id) || null;
    const stage = stageForLead(lead);
    const consult = consultState(lead);
    const invoice = invoiceState(lead);
    const booking = bookingState(lead);

    const vatRate = safeNum(lead?.vendorVatRate) ?? 0.15;

    // Use posNum() so that 0 stored in the DB (from the zeroing bug) doesn't
    // block fallbacks — only a genuinely positive number is a real vendor quote.
    function posNum(v) { const n = safeNum(v); return n != null && n > 0 ? n : null; }

    const vendorEx =
      posNum(lead.vendorQuoteTotalExVat) ??
      sumNumRecord(lead?.vendorQuoteByServiceExVat) ??
      posNum(lead.vendorQuoteAmount) ??
      posNum(job?.quoteAmount) ??
      posNum(lead.quoteAmount) ??
      0;
    const vendor =
      posNum(lead.vendorQuoteTotalIncVat) ??
      (vendorEx ? round2(vendorEx * (1 + vatRate)) : 0);
    const commissionPercent = safeNum(lead.commissionPercent) ?? safeNum(process.env.DEFAULT_COMMISSION_PERCENT) ?? 0;
    const clientByService = sumNumRecord(lead?.clientQuoteByServiceExVat);
    const clientQuote =
      safeNum(lead.clientQuoteTotalExVat) ??
      clientByService ??
      safeNum(lead.clientQuoteAmountExVat) ??
      safeNum(lead.clientQuoteAmount) ??
      (vendor ? Math.round(vendor * (1 + commissionPercent / 100)) : null) ??
      safeNum(job?.jobValue) ??
      safeNum(lead.jobValue) ??
      null;

    // Upsell totals — confirmed line items added to invoice
    const upsellItems = Array.isArray(lead?.upsells) ? lead.upsells : [];
    const upsellClientTotal = upsellItems.reduce((s, u) => s + (safeNum(u?.amountExVat) ?? 0), 0);

    // Upsell vendor cost — sum from confirmed requests that have a vendorExVat.
    // Avoids depending on requestId being set on the upsell item (may be missing for
    // older confirmed upsells). Use inc VAT — M&C pays Izimoto's VAT on upsells too.
    const upsellRequests = Array.isArray(lead?.upsellRequests) ? lead.upsellRequests : [];
    const upsellVendorTotal = upsellRequests.reduce((s, r) => {
      if (r.status !== "confirmed") return s;
      const exVat = safeNum(r.vendorExVat) ?? 0;
      return s + (exVat > 0 ? round2(exVat * (1 + vatRate)) : 0);
    }, 0);

    // For deferred pricing with no client quote, fall back to vendor inc VAT as the revenue basis
    // (M&C passes through Izimoto's cost, profit = 0 for that portion)
    const baseRevenue = clientQuote ?? vendor ?? 0;
    const revenue = baseRevenue + upsellClientTotal;

    // commission = (base client - base vendor) + (upsell client - upsell vendor)
    // Note: vendor may be 0 for deferred jobs — that's fine, commission = clientQuote - 0 if no vendor cost known
    const baseCommission = clientQuote != null ? Math.max(0, clientQuote - (vendor ?? 0)) : 0;
    const upsellCommission = Math.max(0, upsellClientTotal - upsellVendorTotal);
    const commission = baseCommission + upsellCommission;

    const openTasks = tasks.filter((t) => String(t?.leadId || "") === id && String(t?.status || "open") === "open").length;

    const followUpAtIso = lead?.followUpAt || null;
    const followUpAtMs = followUpAtIso ? Date.parse(String(followUpAtIso)) : NaN;
    const hasFollowUp = Number.isFinite(followUpAtMs);
    const followUpOverdue = hasFollowUp && followUpAtMs < nowMs - 30 * 1000;
    const followUpSoon = hasFollowUp && !followUpOverdue && followUpAtMs < nowMs + 6 * 60 * 60 * 1000;

    const urgent = String(lead?.timeframe || "") === "this-week";
    const isNew = stage === "new";
    const isQuoted = stage === "quoted";

    const hasVendorQuote =
      (lead?.vendorQuoteByServiceExVat && typeof lead.vendorQuoteByServiceExVat === "object" && Object.keys(lead.vendorQuoteByServiceExVat).length > 0) ||
      (typeof lead?.vendorQuoteTotalExVat === "number" && lead.vendorQuoteTotalExVat > 0) ||
      (typeof lead?.vendorQuoteAmount === "number" && lead.vendorQuoteAmount > 0);
    const hasCommissionBuilt =
      Boolean(lead?.quoteBuiltAt) ||
      (lead?.clientQuoteByServiceExVat && typeof lead.clientQuoteByServiceExVat === "object" && Object.keys(lead.clientQuoteByServiceExVat).length > 0) ||
      (typeof lead?.clientQuoteTotalExVat === "number" && lead.clientQuoteTotalExVat > 0);
    const quoteStep =
      !hasVendorQuote && lead?.calledAt
        ? "waiting_izimoto"
        : hasVendorQuote && !hasCommissionBuilt
          ? "waiting_mc"
          : hasVendorQuote && hasCommissionBuilt
            ? "completed"
            : null;

    let attentionScore = 0;
    const reasons = [];
    // Consultation required pre-invoice.
    if (consult.required && consult.status && !["scheduled", "done", "completed"].includes(consult.status)) {
      attentionScore += 90;
      reasons.push("Consultation needed");
    }
    // Invoice sent but deposit not yet paid.
    if (invoice.createdAt && !["deposit_paid", "paid"].includes(String(invoice.status || ""))) {
      // Use stored invoiceExpiresAt (set when invoice is emailed); fall back to +7d from created.
      const expiresMs = invoice.expiresAt
        ? Date.parse(String(invoice.expiresAt))
        : Date.parse(String(invoice.createdAt)) + 7 * 24 * 60 * 60 * 1000;
      const overdue = Number.isFinite(expiresMs) && expiresMs < nowMs;
      const soon = Number.isFinite(expiresMs) && !overdue && expiresMs < nowMs + 24 * 60 * 60 * 1000;
      if (overdue) {
        attentionScore += 110;
        reasons.push("Invoice overdue — deposit not paid");
      } else if (soon) {
        attentionScore += 75;
        reasons.push("Deposit due today");
      } else if (!invoice.sentAt) {
        attentionScore += 55;
        reasons.push("Invoice not sent");
      } else {
        attentionScore += 35;
        reasons.push("Awaiting deposit");
      }
    }
    // Balance due: deposit paid but balance (40%) not yet confirmed.
    if (String(invoice.status || "") === "deposit_paid") {
      if (stage === "in-bay") {
        attentionScore += 10;
        reasons.push("Car in bay");
      } else {
        attentionScore += 20;
        reasons.push("Balance due on collection");
      }
    }
    // Post-deposit booking scheduling.
    if (["deposit_paid", "paid"].includes(String(invoice.status || "")) && booking.status && booking.status !== "scheduled") {
      attentionScore += 45;
      reasons.push("Schedule booking");
    }
    if (followUpOverdue) {
      attentionScore += 120;
      reasons.push("Follow-up overdue");
    } else if (followUpSoon) {
      attentionScore += 70;
      reasons.push("Follow-up soon");
    }
    if (openTasks > 0) {
      attentionScore += 35 + Math.min(30, openTasks * 5);
      reasons.push(`${openTasks} task${openTasks === 1 ? "" : "s"}`);
    }
    if (isNew) {
      attentionScore += 60;
      reasons.push("New lead");
    } else if (isQuoted) {
      attentionScore += 25;
      reasons.push("Quote pending");
    }
    if (urgent) {
      attentionScore += 20;
      reasons.push("Urgent");
    }

    const attentionLevel =
      attentionScore >= 120 ? "P0" : attentionScore >= 80 ? "P1" : attentionScore >= 45 ? "P2" : attentionScore > 0 ? "P3" : null;
    const attentionColor =
      attentionLevel === "P0"
        ? "#FF4D4D"
        : attentionLevel === "P1"
          ? "#F2C94C"
          : attentionLevel === "P2"
            ? "#56CCF2"
            : attentionLevel
              ? "#7A9BFF"
              : null;
    const attentionLabel = attentionLevel ? `${attentionLevel} · ${reasons[0] || "Needs attention"}` : null;

    return {
      id,
      ref: refForLead(id),
      vehicleId: `lead:${id}`,
      services: Array.isArray(lead.services) ? lead.services : [],
      stage,
      quoteStep,
      consult,
      invoice,
      booking,
      izimotoCost: vendor + upsellVendorTotal,
      vendorCostMissing: vendor === 0 && clientQuote != null && !lead?.vendorPricingDeferred,
      commission,
      revenue,
      value: revenue,
      deposit: safeNum(job?.paidAmount) ?? 0,
      balance: Math.max(0, revenue - (safeNum(job?.paidAmount) ?? 0)),
      start: dayISO(job?.scheduledAt || lead?.booking?.scheduledAt || lead?.startedAt || lead?.bookedAt) || null,
      eta: null,
      notes: lead?.notes?.[0]?.text || null,
      unread: openTasks,
      attentionScore,
      attentionLevel,
      attentionColor,
      attentionLabel,
      followUpAt: followUpAtIso,
      leadId: id,
      clientId: lead.clientId ? String(lead.clientId) : null,
      partnerName: lead.partnerName || clientsById.get(String(lead.clientId || ""))?.partnerName || null,
      source: sourceIdForLead(lead),
      raw: lead
    };
  });

  const activity = buildActivity({ leads, clientsById });

  const teamStats = (() => {
    const stats = new Map();
    const lower = (v) => String(v || "").toLowerCase();
    for (const m of team) {
      if (!m?.id) continue;
      stats.set(String(m.id), { called: 0, quoted: 0, booked: 0, delivered: 0, vendorQuotes: 0 });
    }
    for (const l of leads) {
      const calledBy = lower(l?.calledByName);
      const quotedBy = lower(l?.quotedBy);
      const bookedBy = lower(l?.bookedBy);
      for (const m of team) {
        if (!m?.id) continue;
        const u = lower(m.username);
        const n = lower(m.name);
        const s = stats.get(String(m.id));
        if (!s) continue;
        if (calledBy && (calledBy === u || calledBy === n)) s.called++;
        if (quotedBy && (quotedBy === u || quotedBy === n)) s.quoted++;
        if (bookedBy && (bookedBy === u || bookedBy === n)) s.booked++;
        if (String(l?.status || "") === "completed") s.delivered++;
        if (
          String(m.role || "").startsWith("izimoto") &&
          (typeof l?.vendorQuoteTotalExVat === "number" || typeof l?.vendorQuoteAmount === "number")
        )
          s.vendorQuotes++;
      }
    }
    return stats;
  })();

  // Quick KPI summary for the dashboard.
  const pipelineStages = new Set(["quoted", "booked", "in-bay", "reveal"]);
  const pipeline = uiJobs.filter((j) => pipelineStages.has(j.stage));
  const pipelineRevenue = pipeline.reduce((s, j) => s + (safeNum(j.revenue) ?? 0), 0);
  const pipelineProfit = pipeline.reduce((s, j) => s + (safeNum(j.commission) ?? 0), 0);

  // Paid / collected revenue and profit — only jobs where the client has paid in full.
  const paidJobs = uiJobs.filter((j) => String(j.invoice?.status || "") === "paid");
  const paidRevenue = paidJobs.reduce((s, j) => s + (safeNum(j.revenue) ?? 0), 0);
  const paidProfit = paidJobs.reduce((s, j) => s + (safeNum(j.commission) ?? 0), 0);

  // Deposit-paid jobs also count as partial collected revenue (deposit portion only).
  const depositPaidJobs = uiJobs.filter((j) => String(j.invoice?.status || "") === "deposit_paid");
  const depositRevenue = depositPaidJobs.reduce((s, j) => {
    // deposit = 60% of revenue
    return s + Math.round((safeNum(j.revenue) ?? 0) * 0.6);
  }, 0);
  const depositProfit = depositPaidJobs.reduce((s, j) => {
    return s + Math.round((safeNum(j.commission) ?? 0) * 0.6);
  }, 0);

  const collectedRevenue = paidRevenue + depositRevenue;
  const collectedProfit = paidProfit + depositProfit;

  const stageCounts = STAGES.map((s) => ({ ...s, n: uiJobs.filter((j) => j.stage === s.id).length }));

  const leadSources = new Map();
  for (const j of uiJobs) {
    if (!j.source) continue;
    leadSources.set(j.source, (leadSources.get(j.source) || 0) + 1);
  }
  const sources = SOURCES.map((s) => ({ ...s, n: leadSources.get(s.id) || 0 }));

  return {
    stages: STAGES,
    sources,
    services: SERVICES,
    contacts,
    vehicles,
    jobs: uiJobs,
    tasks: tasks.map((t) => ({
      id: String(t.id),
      title: t.title || "Task",
      dueAt: t.dueAt || null,
      status: t.status || "open",
      clientId: t.clientId || null,
      leadId: t.leadId || null,
      createdAt: t.createdAt || null,
      updatedAt: t.updatedAt || null
    })),
    team: team.map((m) => {
      const { passwordHash, passwordSalt, ...safe } = m || {};
      const s = teamStats.get(String(safe.id)) || null;
      return {
        ...safe,
        roleLabel: roleLabel(safe.role),
        accent: accentForRole(safe.role),
        stats: s
      };
    }),
    activity,
    kpis: {
      defaultCommissionPercent: safeNum(process.env.DEFAULT_COMMISSION_PERCENT) ?? 0,
      pipelineRevenue,
      pipelineProfit,
      collectedRevenue,
      collectedProfit,
      stageCounts,
      taskOpenCount: tasks.filter((t) => String(t?.status || "open") === "open").length,
      jobCount: uiJobs.length
    }
  };
}
