// Paint-correction funnel analytics — turns the per-lead data every step
// already writes (see app/api/lead/[leadId]/pc-progress and lib/pcChase.js's
// STAGE_LABELS) into queryable funnel drop-off and correlation views, so ad
// performance (Meta/TikTok Events Manager) can be compared against what
// actually happens once someone lands, and so "does answering X predict
// converting or bailing" can be checked without manual data wrangling.
//
// Exposed to agents/analysts via the MCP tools in mcp/core.js — this module
// has no MCP-specific code itself, just pure aggregation over listLeads().

import { listLeads } from "@/lib/leadStore";

// Real stage values written by the funnel (verified against
// app/paint-correction/PaintCorrectionFlow.jsx's patchProgress() calls and
// app/api/lead/paint-correction/quiz-lead/route.js). Order matters — it's
// the funnel's actual sequence.
export const PC_FUNNEL_STEPS = [
  { id: "quiz_complete", label: "Quiz complete / contact captured" },
  { id: "package_selected", label: "Package reveal viewed" },
  { id: "car_details", label: "Car details entered" },
  { id: "date_selected", label: "Date picked" },
  { id: "payment_viewed", label: "Payment screen reached" }
];

function stepReachedIndex(pc) {
  if (!pc?.stage) return -1;
  return PC_FUNNEL_STEPS.findIndex((s) => s.id === pc.stage);
}

// "booked" = real money landed (PoP uploaded). "whatsapp_handoff" = tapped
// "rather talk it through first" instead of paying. "in_progress" = neither —
// still live, or bailed somewhere with no terminal outcome recorded.
function outcomeFor(lead) {
  const pc = lead?.paintCorrection || {};
  if (pc.popUploadedAt) return "booked";
  if (pc.whatsappHandoffAt) return "whatsapp_handoff";
  return "in_progress";
}

async function loadPcLeads(limit = 2000) {
  const leads = await listLeads({ limit });
  return leads.filter((l) => l?.funnel === "paint-correction");
}

/**
 * Funnel drop-off counts — how many leads reached at least each step,
 * optionally grouped by a UTM dimension (source/medium/campaign/content/term)
 * so it lines up against ad-set/ad-level performance data.
 */
export async function pcFunnelSummary({ groupBy = null } = {}) {
  const leads = await loadPcLeads();
  const validGroupBy = ["source", "medium", "campaign", "content", "term"].includes(groupBy) ? groupBy : null;

  const groups = new Map();
  const getGroup = (key) => {
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        total: 0,
        reached: PC_FUNNEL_STEPS.map(() => 0),
        booked: 0,
        whatsappHandoff: 0,
        inProgress: 0
      });
    }
    return groups.get(key);
  };

  for (const lead of leads) {
    const pc = lead.paintCorrection || {};
    const key = validGroupBy ? lead.utm?.[validGroupBy] || "(none)" : "all";
    const g = getGroup(key);
    g.total += 1;

    const outcome = outcomeFor(lead);
    if (outcome === "booked") {
      for (let i = 0; i < PC_FUNNEL_STEPS.length; i++) g.reached[i] += 1;
      g.booked += 1;
      continue;
    }
    const idx = stepReachedIndex(pc);
    if (idx >= 0) for (let i = 0; i <= idx; i++) g.reached[i] += 1;
    if (outcome === "whatsapp_handoff") g.whatsappHandoff += 1;
    else g.inProgress += 1;
  }

  return Array.from(groups.values())
    .map((g) => ({
      group: g.key,
      totalLeads: g.total,
      booked: g.booked,
      whatsappHandoff: g.whatsappHandoff,
      stillInProgressOrBailed: g.inProgress,
      conversionRatePct: g.total ? Math.round((g.booked / g.total) * 1000) / 10 : 0,
      steps: PC_FUNNEL_STEPS.map((s, i) => ({
        id: s.id,
        label: s.label,
        reached: g.reached[i],
        pctOfTotal: g.total ? Math.round((g.reached[i] / g.total) * 1000) / 10 : 0
      }))
    }))
    .sort((a, b) => b.totalLeads - a.totalLeads);
}

/**
 * One row per lead — every dimension worth correlating against. Meant for
 * exporting/pivoting externally as much as for pcCorrelations() below.
 */
export async function pcLeadsDetail() {
  const leads = await loadPcLeads();
  return leads.map((lead) => {
    const pc = lead.paintCorrection || {};
    return {
      leadId: lead.id,
      createdAt: lead.createdAt || null,
      status: lead.status || null,
      utmSource: lead.utm?.source || null,
      utmMedium: lead.utm?.medium || null,
      utmCampaign: lead.utm?.campaign || null,
      utmContent: lead.utm?.content || null,
      utmTerm: lead.utm?.term || null,
      hasFbclid: !!lead.clickIds?.fbclid,
      hasTtclid: !!lead.clickIds?.ttclid,
      answerCar: pc.answers?.car || null,
      answerPaint: pc.answers?.paint || null,
      answerGoal: pc.answers?.goal || null,
      answerProtection: pc.answers?.protection || null,
      packageId: pc.packageId || null,
      packageName: pc.packageName || null,
      ceramic: !!pc.ceramic,
      price: pc.price ?? null,
      durationDays: pc.durationDays ?? null,
      furthestStep: pc.stage || null,
      outcome: outcomeFor(lead),
      converted: !!pc.popUploadedAt,
      dropoff: pc.dropoff || null,
      dropoffPaidAt: pc.dropoffPaidAt || null,
      pickupPaidAt: pc.pickupPaidAt || null,
      whatsappHandoffAt: pc.whatsappHandoffAt || null,
      whatsappInboundAt: pc.whatsappInboundAt || null,
      lastActivityAt: pc.lastActivityAt || null
    };
  });
}

function breakdownBy(rows, keyFn) {
  const groups = new Map();
  for (const r of rows) {
    const key = keyFn(r);
    if (key == null || key === "") continue;
    if (!groups.has(key)) groups.set(key, { value: key, total: 0, converted: 0 });
    const g = groups.get(key);
    g.total += 1;
    if (r.converted) g.converted += 1;
  }
  return Array.from(groups.values())
    .map((g) => ({ ...g, conversionRatePct: g.total ? Math.round((g.converted / g.total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.total - a.total);
}

/**
 * "Did picking X make someone more/less likely to convert" — a conversion
 * rate breakdown per quiz answer, package, and ad dimension. Small-sample
 * noise is real at this business's volume; `total` is included on every row
 * so the reader can judge how much to trust each rate themselves.
 */
export async function pcCorrelations() {
  const rows = await pcLeadsDetail();
  return {
    sampleSize: rows.length,
    byCarAnswer: breakdownBy(rows, (r) => r.answerCar),
    byPaintAnswer: breakdownBy(rows, (r) => r.answerPaint),
    byGoalAnswer: breakdownBy(rows, (r) => r.answerGoal),
    byProtectionAnswer: breakdownBy(rows, (r) => r.answerProtection),
    byPackage: breakdownBy(rows, (r) => r.packageId),
    byUtmContent: breakdownBy(rows, (r) => r.utmContent),
    byUtmCampaign: breakdownBy(rows, (r) => r.utmCampaign),
    byUtmSource: breakdownBy(rows, (r) => r.utmSource)
  };
}
