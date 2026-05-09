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
  { id: "ceramic", label: "Ceramic / Graphene" },
  { id: "ppf", label: "PPF" },
  { id: "wrap", label: "Wrap" },
  { id: "tint", label: "Tint" },
  { id: "wheel", label: "Wheels (Powder / Refurb)" },
  { id: "kit", label: "Bodykit" },
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
  const status = String(lead?.invoiceStatus || (createdAt ? "due" : "none"));
  const paidAt = lead?.invoicePaidAt || null;
  const sentAt = lead?.invoiceSentAt || null;
  return { createdAt, status, paidAt, sentAt };
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

  for (const lead of leads) {
    if (!lead?.id) continue;
    addVehicle({
      id: `lead:${lead.id}`,
      contactId: lead.clientId ? String(lead.clientId) : "unknown",
      label: String(lead.car || "Vehicle"),
      year: null,
      colour: null,
      plate: null
    });
  }

  // Contacts (clients)
  const contacts = clients.map((c) => ({
    id: String(c.id),
    name: c.name || c.phone || "Client",
    phone: c.phone || null,
    phoneNorm: c.phoneNorm || null,
    email: c.email || null,
    area: c.area || null,
    vip: Array.isArray(c.tags) ? c.tags.includes("vip") : Boolean(c.vip),
    joined: monthYear(c.createdAt) || null,
    leadCount: Number(c.leadCount || 0)
  }));

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

    const vendorEx =
      safeNum(lead.vendorQuoteTotalExVat) ??
      sumNumRecord(lead?.vendorQuoteByServiceExVat) ??
      safeNum(lead.vendorQuoteAmount) ??
      safeNum(job?.quoteAmount) ??
      safeNum(lead.quoteAmount) ??
      0;
    const vatRate = safeNum(lead?.vendorVatRate) ?? 0.15;
    const vendor =
      safeNum(lead.vendorQuoteTotalIncVat) ??
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
    const revenue = clientQuote ?? (vendor ? Math.round(vendor * (1 + commissionPercent / 100)) : 0);
    const commission = revenue && vendor ? Math.max(0, revenue - vendor) : 0;

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
    // Invoice created but not sent/paid.
    if (invoice.createdAt && String(invoice.status || "") !== "paid") {
      // Due date = +7 days from invoice created.
      const createdMs = Date.parse(String(invoice.createdAt));
      const dueMs = Number.isFinite(createdMs) ? createdMs + 7 * 24 * 60 * 60 * 1000 : NaN;
      const overdue = Number.isFinite(dueMs) && dueMs < nowMs;
      const soon = Number.isFinite(dueMs) && !overdue && dueMs < nowMs + 24 * 60 * 60 * 1000;
      if (overdue) {
        attentionScore += 110;
        reasons.push("Invoice overdue");
      } else if (soon) {
        attentionScore += 75;
        reasons.push("Invoice due soon");
      } else if (!invoice.sentAt) {
        attentionScore += 55;
        reasons.push("Invoice not sent");
      } else {
        attentionScore += 35;
        reasons.push("Invoice unpaid");
      }
    }
    // Post-payment booking scheduling.
    if (String(invoice.status || "") === "paid" && booking.status && booking.status !== "scheduled") {
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
      izimotoCost: vendor,
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
      stageCounts,
      taskOpenCount: tasks.filter((t) => String(t?.status || "open") === "open").length,
      jobCount: uiJobs.length
    }
  };
}
