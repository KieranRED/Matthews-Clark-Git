"use client";

import { useMemo, useState } from "react";

const SERVICE_META = [
  { id: "ppf",       label: "PPF",        color: "#1F4FFF" },
  { id: "wrap",      label: "Wrap",       color: "#7A9BFF" },
  { id: "tint",      label: "Tint",       color: "#56CCF2" },
  { id: "ceramic",   label: "Ceramic",    color: "#4A78FF" },
  { id: "correct",   label: "Correction", color: "#F2C94C" },
  { id: "detail",    label: "Detail",     color: "#27AE60" },
  { id: "wheel",     label: "Wheels",     color: "#9B51E0" },
  { id: "kit",       label: "Bodykit",    color: "#FF6B35" },
  { id: "starlight", label: "Starlight",  color: "#FFD700" },
];

const TIER_KEY = {
  wrap:    { field: "scope",    labels: { full: "Full wrap", partial: "Partial / accents", custom: "Custom panels" } },
  ppf:     { field: "coverage", labels: { "full-front": "Full front", "track-pack": "Track pack", full: "Full car", custom: "Custom panels" } },
  tint:    { field: "windows",  labels: { "front-only": "Front 2 windows", all: "All windows", "all+windscreen": "All + windscreen" } },
  ceramic: { field: "package",  labels: { "2y": "2 Year", "5y": "5 Year", "10y": "10 Year" } },
  correct: { field: "stage",    labels: { stage1: "Stage 1", stage2: "Stage 2", stage3: "Stage 3" } },
  detail:  { field: "kind",     labels: { interior: "Interior", exterior: "Exterior", full: "Full detail" } },
  wheel:   { field: "service",  labels: { powder: "Powder coat", refurb: "Refurb", both: "Powder + Refurb" } },
};

const HEADLINE_TIER = {
  wrap: "full", ppf: "full-front", tint: "all",
  ceramic: "5y", correct: "stage2", detail: "full", wheel: "powder",
};

// SA industry benchmarks (ex VAT, mid-range, standard sedan/SUV, 2024/2025)
// Source: PTA Windows, SWL Detailed, Precision Glaze, Innovation Auto, AutoSleek, Man vs Machine
const INDUSTRY = {
  ppf: {
    headline: { low: 15000, mid: 18000, high: 25000, label: "Full front" },
    tiers: [
      { label: "Full front",  low: 15000, mid: 18000, high: 25000 },
      { label: "Track pack",  low: 20000, mid: 28000, high: 40000 },
      { label: "Full car",    low: 35000, mid: 50000, high: 70000 },
    ],
    note: "XPEL/LLumar/3M. Large SUV vs hatch swings R10k–R20k.",
  },
  wrap: {
    headline: { low: 16000, mid: 22000, high: 30000, label: "Full wrap" },
    tiers: [
      { label: "Full wrap (standard)",  low: 16000, mid: 22000, high: 30000 },
      { label: "Full wrap (premium)",   low: 30000, mid: 45000, high: 65000 },
      { label: "Partial / accents",     low: 3500,  mid: 6000,  high: 12000 },
    ],
    note: "Chrome/colour-shift films push price significantly higher.",
  },
  tint: {
    headline: { low: 1800, mid: 2500, high: 4500, label: "All windows" },
    tiers: [
      { label: "Front 2 windows",      low: 800,  mid: 1200, high: 2200 },
      { label: "All windows",          low: 1800, mid: 2500, high: 4500 },
      { label: "All + windscreen",     low: 3500, mid: 5000, high: 7500 },
    ],
    note: "Nano-ceramic film at the high end. LLumar, 3M, SunTek.",
  },
  ceramic: {
    headline: { low: 8000, mid: 12000, high: 17000, label: "5 Year" },
    tiers: [
      { label: "2 Year",  low: 4200,  mid: 6500,  high: 9000  },
      { label: "5 Year",  low: 8000,  mid: 12000, high: 17000 },
      { label: "10 Year", low: 15000, mid: 22000, high: 36500 },
    ],
    note: "Add-ons: glass coating +R1.5k, wheel coating +R3.5k. Most premium packages include Stage 1 correction.",
  },
  correct: {
    headline: { low: 3000, mid: 5000, high: 8000, label: "Stage 2" },
    tiers: [
      { label: "Stage 1 — light polish",     low: 1500, mid: 2500,  high: 5000  },
      { label: "Stage 2 — cut & polish",     low: 3000, mid: 5000,  high: 8000  },
      { label: "Stage 3 — full correction",  low: 7000, mid: 10000, high: 18000 },
    ],
    note: "Paint condition, vehicle size, and hardness of paint drive major variance.",
  },
  detail: {
    headline: { low: 3500, mid: 7000, high: 15000, label: "Full detail" },
    tiers: [
      { label: "Interior only",  low: 1500, mid: 3000, high: 6000  },
      { label: "Exterior only",  low: 2500, mid: 4500, high: 8000  },
      { label: "Full detail",    low: 3500, mid: 7000, high: 15000 },
    ],
    note: "Premium multi-day detail with correction + ceramic sealant at the high end.",
  },
  wheel: {
    headline: { low: 3800, mid: 5000, high: 6500, label: "Powder coat (set of 4)" },
    tiers: [
      { label: "Powder coat — set of 4 (16–19\")",  low: 3800,  mid: 4560, high: 6000  },
      { label: "Powder coat — set of 4 (20–24\")",  low: 4800,  mid: 5320, high: 7000  },
      { label: "Diamond cut — set of 4 (16–19\")",  low: 8000,  mid: 8640, high: 10000 },
    ],
    note: "Kerb damage repair adds R300–R800 per wheel. Custom/smokey colours +R350/wheel.",
  },
  kit: {
    headline: { low: 3000, mid: 6000, high: 12000, label: "Fitting (labour)" },
    tiers: [
      { label: "Kit fitting (labour)",         low: 3000, mid: 6000,  high: 12000 },
      { label: "Vinyl wrap over fitted kit",   low: 2000, mid: 5000,  high: 12000 },
      { label: "PPF over fitted kit",          low: 4000, mid: 9000,  high: 18000 },
    ],
    note: "Highly bespoke — panel count, geometry, and finish type drive cost.",
  },
  starlight: {
    headline: { low: 9000, mid: 15000, high: 28000, label: "Mid-density" },
    tiers: [
      { label: "Basic (standard density, hatch)",       low: 6500,  mid: 9000,  high: 14000 },
      { label: "Mid (higher density, SUV)",             low: 10000, mid: 15000, high: 22000 },
      { label: "Premium (shooting stars, Alcantara)",   low: 18000, mid: 28000, high: 45000 },
    ],
    note: "Alcantara headliner replacement + fibre optics on luxury vehicles quoted individually.",
  },
};

const CONVERTED_STAGES = new Set(["booked", "in-bay", "reveal", "delivered", "aftercare"]);

function fmtR(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 100_000) return `R ${(n / 1000).toFixed(0)}k`;
  if (n >= 10_000)  return `R ${(n / 1000).toFixed(1)}k`;
  if (n >= 1_000)   return `R ${(n / 1000).toFixed(1)}k`;
  return `R ${Math.round(n)}`;
}

function pct(n, d) {
  if (!d || !Number.isFinite(n)) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeStats(jobs) {
  const allQuotes = [];

  for (const j of jobs) {
    const lead = j.raw || {};
    const stage = j.stage;

    // Main job — vendor cost per service
    const byService = lead.vendorQuoteByServiceExVat;
    if (byService && typeof byService === "object") {
      for (const [sid, amt] of Object.entries(byService)) {
        const vendorEx = Number(amt);
        if (!Number.isFinite(vendorEx) || vendorEx <= 0) continue;
        // Client price for this service
        const clientEx = Number(lead.clientQuoteByServiceExVat?.[sid] ?? NaN);
        allQuotes.push({
          jobId: j.id, stage, service: sid,
          vendorExVat: vendorEx,
          clientExVat: Number.isFinite(clientEx) && clientEx > 0 ? clientEx : null,
          details: lead.serviceDetails?.[sid] || null,
        });
      }
    }

    // Upsells — vendor cost from request, client price from upsell line item
    const upsellRequests = Array.isArray(lead.upsellRequests) ? lead.upsellRequests : [];
    const upsells = Array.isArray(lead.upsells) ? lead.upsells : [];
    const reqById = Object.fromEntries(upsellRequests.map((r) => [r.id, r]));

    for (const u of upsells) {
      const req = u.requestId ? reqById[u.requestId] : null;
      if (!req?.service) continue;
      const vendorExVat = Number(req.vendorExVat);
      if (!Number.isFinite(vendorExVat) || vendorExVat <= 0) continue;
      const clientExVat = Number(u.amountExVat);
      allQuotes.push({
        jobId: j.id, stage, service: req.service,
        vendorExVat,
        clientExVat: Number.isFinite(clientExVat) && clientExVat > 0 ? clientExVat : null,
        details: null,
        isUpsell: true,
      });
    }
  }

  // Overall funnel
  const quotedJobs = jobs.filter((j) => {
    const byService = j.raw?.vendorQuoteByServiceExVat;
    const hasService = byService && typeof byService === "object" && Object.keys(byService).length > 0;
    const hasTotal = typeof j.raw?.vendorQuoteTotalExVat === "number" && j.raw.vendorQuoteTotalExVat > 0;
    return hasService || hasTotal;
  });
  const quotedIds = new Set(quotedJobs.map((j) => j.id));
  const total = jobs.length;
  const nQuoted = quotedJobs.length;
  const nConverted = jobs.filter((j) => CONVERTED_STAGES.has(j.stage)).length;
  const nLost = jobs.filter((j) => j.stage === "lost").length;
  const nLostAfterQuote = jobs.filter((j) => j.stage === "lost" && quotedIds.has(j.id)).length;
  const nBookedFromQuote = quotedJobs.filter((j) => CONVERTED_STAGES.has(j.stage)).length;
  const nConcluded = nBookedFromQuote + nLostAfterQuote;
  const quoteRate = total > 0 ? nQuoted / total : 0;
  const bookingRate = nConcluded > 0 ? nBookedFromQuote / nConcluded : null;

  // Per-service stats
  const serviceStats = {};
  for (const { id } of SERVICE_META) {
    const sQuotes = allQuotes.filter((q) => q.service === id);
    if (!sQuotes.length) continue;

    const accepted = sQuotes.filter((q) => CONVERTED_STAGES.has(q.stage));
    const rejected = sQuotes.filter((q) => q.stage === "lost");
    const pending  = sQuotes.filter((q) => !CONVERTED_STAGES.has(q.stage) && q.stage !== "lost");
    const concluded = accepted.length + rejected.length;

    const vendorAmts  = sQuotes.map((q) => q.vendorExVat);
    const clientAmts  = sQuotes.filter((q) => q.clientExVat).map((q) => q.clientExVat);
    const accVendor   = accepted.map((q) => q.vendorExVat);
    const rejVendor   = rejected.map((q) => q.vendorExVat);
    const accClient   = accepted.filter((q) => q.clientExVat).map((q) => q.clientExVat);
    const rejClient   = rejected.filter((q) => q.clientExVat).map((q) => q.clientExVat);

    // Tier breakdown
    const tierKey = TIER_KEY[id];
    let tiers = null;
    if (tierKey) {
      const tierMap = {};
      for (const q of sQuotes) {
        const val = q.details?.[tierKey.field] || (q.isUpsell ? null : "other");
        if (!val) continue;
        if (!tierMap[val]) tierMap[val] = [];
        tierMap[val].push(q);
      }
      tiers = Object.entries(tierMap)
        .filter(([, qs]) => qs.length > 0)
        .map(([val, qs]) => {
          const vAmts = qs.map((q) => q.vendorExVat);
          const cAmts = qs.filter((q) => q.clientExVat).map((q) => q.clientExVat);
          const acc   = qs.filter((q) => CONVERTED_STAGES.has(q.stage));
          const rej   = qs.filter((q) => q.stage === "lost");
          const con   = acc.length + rej.length;
          return {
            val, label: tierKey.labels[val] || val,
            count: qs.length,
            avgVendor: avg(vAmts), minVendor: Math.min(...vAmts), maxVendor: Math.max(...vAmts),
            avgClient: avg(cAmts),
            acceptRate: con > 0 ? acc.length / con : null,
          };
        })
        .sort((a, b) => b.count - a.count);
      if (!tiers.length) tiers = null;
    }

    const headlineTierVal = HEADLINE_TIER[id];
    const headlineTier    = tiers?.find((t) => t.val === headlineTierVal);
    const headlineVendor  = headlineTier?.avgVendor ?? avg(vendorAmts);
    const headlineClient  = headlineTier?.avgClient ?? avg(clientAmts);
    const headlineLabel   = headlineTier ? (tierKey?.labels[headlineTierVal] || headlineTierVal) : null;
    const acceptRate      = concluded > 0 ? accepted.length / concluded : null;

    serviceStats[id] = {
      count: sQuotes.length,
      minVendor: Math.min(...vendorAmts), maxVendor: Math.max(...vendorAmts),
      avgVendor: avg(vendorAmts), avgVendorAccepted: avg(accVendor), avgVendorRejected: avg(rejVendor),
      avgClient: avg(clientAmts), avgClientAccepted: avg(accClient), avgClientRejected: avg(rejClient),
      accepted: accepted.length, rejected: rejected.length, pending: pending.length,
      acceptRate, tiers,
      headlineVendor, headlineClient, headlineLabel,
    };
  }

  const recent = quotedJobs
    .filter((j) => j.raw?.quotedAt)
    .sort((a, b) => Date.parse(b.raw.quotedAt) - Date.parse(a.raw.quotedAt))
    .slice(0, 20);

  return {
    total, nQuoted, nConverted, nLost, nLostAfterQuote,
    nBookedFromQuote, nConcluded, quoteRate, bookingRate,
    serviceStats, recent,
  };
}

function stageChip(stage) {
  const MAP = {
    booked:    { label: "Booked",    bg: "rgba(39,174,96,.18)",  col: "#27AE60" },
    "in-bay":  { label: "In bay",    bg: "rgba(242,201,76,.15)", col: "#F2C94C" },
    reveal:    { label: "Reveal",    bg: "rgba(86,204,242,.15)", col: "#56CCF2" },
    delivered: { label: "Done",      bg: "rgba(39,174,96,.18)",  col: "#27AE60" },
    aftercare: { label: "Aftercare", bg: "rgba(155,81,224,.18)", col: "#9B51E0" },
    quoted:    { label: "Pending",   bg: "rgba(74,120,255,.15)", col: "#7A9BFF" },
    lost:      { label: "Lost",      bg: "rgba(255,77,77,.12)",  col: "#FF6B6B" },
    new:       { label: "New",       bg: "rgba(255,255,255,.07)",col: "rgba(255,255,255,.5)" },
  };
  const s = MAP[stage] || { label: stage, bg: "rgba(255,255,255,.07)", col: "rgba(255,255,255,.5)" };
  return (
    <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.col, fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function acceptColor(rate) {
  if (rate == null) return "rgba(255,255,255,.4)";
  const p = rate * 100;
  return p >= 70 ? "#27AE60" : p >= 40 ? "#F2C94C" : "#FF6B6B";
}

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

function ServiceCard({ id, label, color, s }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("ours"); // "ours" | "market"
  const hasTiers = s.tiers && s.tiers.length > 1;
  const market = INDUSTRY[id];
  const hasClient = s.avgClient != null;

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${color}22`, background: `${color}09`, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{label}</div>
            {s.headlineLabel && (
              <div style={{ ...MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: `${color}cc`, marginTop: 3 }}>
                {s.headlineLabel}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...MONO, fontSize: 10, letterSpacing: ".1em", color: color, opacity: 0.75 }}>
              {s.count} {s.count === 1 ? "quote" : "quotes"}
            </span>
            {(hasTiers || market) && (
              <button type="button" onClick={() => setOpen((v) => !v)} style={{ background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", ...MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color, display: "flex", alignItems: "center", gap: 5 }}>
                {open ? "Less" : "More"}
                <span style={{ fontSize: 10, transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
              </button>
            )}
          </div>
        </div>

        {/* Two-column price: Izimoto cost | Our price */}
        <div style={{ display: "grid", gridTemplateColumns: hasClient ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 10 }}>
          <div style={{ borderRadius: 10, background: `${color}12`, padding: "10px 12px" }}>
            <div style={{ ...MONO, fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 3 }}>
              Izimoto cost{s.headlineLabel ? ` · ${s.headlineLabel}` : ""}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: "-.01em" }}>{fmtR(s.headlineVendor)}</div>
            <div style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 3 }}>{fmtR(s.minVendor)} – {fmtR(s.maxVendor)}</div>
          </div>
          {hasClient && (
            <div style={{ borderRadius: 10, background: "rgba(39,174,96,.1)", padding: "10px 12px", border: "1px solid rgba(39,174,96,.2)" }}>
              <div style={{ ...MONO, fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 3 }}>
                Our price{s.headlineLabel ? ` · ${s.headlineLabel}` : ""}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#27AE60", letterSpacing: "-.01em" }}>{fmtR(s.headlineClient)}</div>
              {s.avgVendor && s.headlineClient && (
                <div style={{ ...MONO, fontSize: 9, color: "rgba(39,174,96,.7)", marginTop: 3 }}>
                  +{Math.round(((s.headlineClient - s.headlineVendor) / s.headlineVendor) * 100)}% margin
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close rate bar */}
        {(s.accepted > 0 || s.rejected > 0) && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ ...MONO, fontSize: 9, letterSpacing: ".08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>Close rate</span>
              <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: acceptColor(s.acceptRate) }}>
                {s.acceptRate != null ? `${Math.round(s.acceptRate * 100)}%` : "Pending"}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: "#27AE60", width: `${s.accepted + s.rejected > 0 ? Math.round((s.accepted / (s.accepted + s.rejected)) * 100) : 0}%` }} />
            </div>
            <div style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 5 }}>
              {s.accepted}✓ {s.rejected}✗{s.pending > 0 ? ` ${s.pending} pending` : ""}
              {s.avgVendorAccepted && s.avgVendorRejected ? (
                <span style={{ marginLeft: 8 }}>
                  · won <span style={{ color: "#27AE60" }}>{fmtR(s.avgVendorAccepted)}</span> lost <span style={{ color: "#FF6B6B" }}>{fmtR(s.avgVendorRejected)}</span>
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Expanded section */}
      {open && (
        <div style={{ borderTop: `1px solid ${color}18` }}>
          {/* Tab bar */}
          {market && (
            <div style={{ display: "flex", padding: "10px 16px 0", gap: 8 }}>
              {[{ id: "ours", label: "Our breakdown" }, { id: "market", label: "SA market" }].map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{ ...MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 8, cursor: "pointer", border: "none", background: tab === t.id ? color : "rgba(255,255,255,.06)", color: tab === t.id ? "#fff" : "rgba(255,255,255,.4)", fontWeight: tab === t.id ? 700 : 400 }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Our breakdown */}
          {tab === "ours" && s.tiers && s.tiers.length > 0 && (
            <div style={{ padding: "12px 16px 14px", display: "grid", gap: 8 }}>
              <div style={{ ...MONO, fontSize: 8, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 2 }}>By type — Izimoto cost ex VAT</div>
              {s.tiers.map((t) => (
                <div key={t.val} style={{ padding: "9px 12px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: t.val === HEADLINE_TIER[id] ? `1px solid ${color}35` : "1px solid transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{t.label}</div>
                      <div style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{t.count} {t.count === 1 ? "quote" : "quotes"}</div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", gap: 14 }}>
                      <div>
                        <div style={{ ...MONO, fontSize: 8, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>Izimoto avg</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color }}>{fmtR(t.avgVendor)}</div>
                      </div>
                      {t.avgClient && (
                        <div>
                          <div style={{ ...MONO, fontSize: 8, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>Our avg</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#27AE60" }}>{fmtR(t.avgClient)}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ ...MONO, fontSize: 8, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>Close</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: acceptColor(t.acceptRate) }}>{t.acceptRate != null ? `${Math.round(t.acceptRate * 100)}%` : "—"}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,.25)", marginTop: 5 }}>Range {fmtR(t.minVendor)} – {fmtR(t.maxVendor)}</div>
                </div>
              ))}
              {(!s.tiers || s.tiers.length === 0) && (
                <div style={{ ...MONO, fontSize: 10, color: "rgba(255,255,255,.3)", padding: "8px 0" }}>No tier breakdown yet — quotes don't have service details saved.</div>
              )}
            </div>
          )}

          {/* SA market benchmarks */}
          {tab === "market" && market && (
            <div style={{ padding: "12px 16px 14px", display: "grid", gap: 8 }}>
              <div style={{ ...MONO, fontSize: 8, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 2 }}>
                SA market rates — ex VAT · premium/specialist shops · 2024/25
              </div>
              {market.tiers.map((t) => (
                <div key={t.label} style={{ padding: "9px 12px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: t.label === market.headline.label ? `1px solid ${color}35` : "1px solid transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{t.label}</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ ...MONO, fontSize: 8, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>Low</div>
                        <div style={{ ...MONO, fontSize: 11, color: "rgba(255,255,255,.5)" }}>{fmtR(t.low)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ ...MONO, fontSize: 8, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>Mid</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color }}>{fmtR(t.mid)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ ...MONO, fontSize: 8, color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>High</div>
                        <div style={{ ...MONO, fontSize: 11, color: "rgba(255,255,255,.5)" }}>{fmtR(t.high)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {market.note && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", lineHeight: 1.55, marginTop: 2, padding: "0 2px" }}>
                  ℹ {market.note}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PricingScreen({ index }) {
  const jobs = Array.isArray(index?.JOBS) ? index.JOBS : [];
  const stats = useMemo(() => computeStats(jobs), [jobs]);
  const hasData = stats.nQuoted > 0;

  return (
    <div className="screen">
      <div className="greeting">
        <div className="hi"><span className="dot" />Quote intelligence</div>
        <h1>Pricing<br /><span className="acc">guide.</span></h1>
        <div className="sub">
          {hasData
            ? `${stats.nQuoted} quotes · ${stats.nConverted} converted · ${pct(stats.bookingRate ?? 0, 1)} close rate`
            : "No quoted leads yet."}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ paddingTop: 14 }}>
        <div className="kpi kpi--accent">
          <div className="lbl">Total leads</div>
          <div className="val">{stats.total}</div>
          <div className="delta">All time</div>
        </div>
        <div className="kpi">
          <div className="lbl">Quoted</div>
          <div className="val">{stats.nQuoted}</div>
          <div className="delta">{pct(stats.quoteRate, 1)} of leads</div>
        </div>
        <div className="kpi">
          <div className="lbl">Converted</div>
          <div className="val">{stats.nConverted}</div>
          <div className="delta">{stats.bookingRate != null ? pct(stats.bookingRate, 1) : "—"} close rate</div>
        </div>
        <div className="kpi">
          <div className="lbl">Lost</div>
          <div className="val">{stats.nLost}</div>
          <div className="delta">{stats.nLostAfterQuote} after quote</div>
        </div>
      </div>

      {/* Funnel */}
      {stats.nConcluded > 0 && (
        <>
          <div className="section-h" style={{ marginTop: 8 }}>
            <div>
              <div className="eyebrow"><span className="num">01</span> · FUNNEL</div>
              <div className="section-title">Conversion <span className="acc">rates.</span></div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "2px 0 16px" }}>
            {[
              { label: "Lead → Quote",   n: stats.nQuoted,         d: stats.total,      sub: "Izimoto prices received" },
              { label: "Quote → Booked", n: stats.nBookedFromQuote, d: stats.nConcluded, sub: "Of concluded quotes" },
              { label: "Overall",        n: stats.nConverted,      d: stats.total,      sub: "Lead to booked" },
            ].map(({ label, n, d, sub }) => {
              const ratio = d > 0 ? n / d : 0;
              return (
                <div key={label} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{label}</span>
                      <span style={{ ...MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>{sub}</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "var(--mc-blue, #1F4FFF)" }}>{pct(ratio, 1)}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: "var(--mc-blue, #1F4FFF)", width: `${Math.round(ratio * 100)}%`, transition: "width .4s ease" }} />
                  </div>
                  <div style={{ marginTop: 6, ...MONO, fontSize: 9, color: "rgba(255,255,255,.35)" }}>{n} / {d}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Service cards */}
      <div className="section-h">
        <div>
          <div className="eyebrow"><span className="num">02</span> · BY SERVICE</div>
          <div className="section-title">Price <span className="acc">intelligence.</span></div>
        </div>
      </div>
      <div style={{ ...MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", padding: "0 0 10px" }}>
        Izimoto cost + our price ex VAT · includes upsells · tap "More" for breakdown &amp; SA market
      </div>

      {!hasData ? (
        <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", fontStyle: "italic", marginBottom: 8 }}>
            No quotes yet — SA market benchmarks below.
          </div>
          {SERVICE_META.map(({ id, label, color }) => {
            const market = INDUSTRY[id];
            if (!market) return null;
            return (
              <div key={id} style={{ borderRadius: 14, border: `1px solid ${color}22`, background: `${color}09`, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{label}</div>
                  <div style={{ ...MONO, fontSize: 13, fontWeight: 700, color }}>{fmtR(market.headline.mid)}</div>
                </div>
                <div style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,.35)" }}>
                  {market.headline.label} · Market {fmtR(market.headline.low)}–{fmtR(market.headline.high)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
          {SERVICE_META.map(({ id, label, color }) => {
            const s = stats.serviceStats[id];
            if (!s && !INDUSTRY[id]) return null;
            // If no real data yet for this service, show market-only card
            if (!s) {
              const market = INDUSTRY[id];
              return (
                <div key={id} style={{ borderRadius: 14, border: `1px solid ${color}15`, background: `${color}06`, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>{label}</div>
                      <div style={{ ...MONO, fontSize: 9, color: "rgba(255,255,255,.25)", marginTop: 3 }}>No quotes yet · SA market mid: {fmtR(market.headline.mid)}</div>
                    </div>
                    <div style={{ ...MONO, fontSize: 12, fontWeight: 700, color: `${color}88` }}>{fmtR(market.headline.mid)}</div>
                  </div>
                </div>
              );
            }
            return <ServiceCard key={id} id={id} label={label} color={color} s={s} />;
          })}
        </div>
      )}

      {/* Recent quotes */}
      {stats.recent.length > 0 && (
        <>
          <div className="section-h" style={{ marginTop: 8 }}>
            <div>
              <div className="eyebrow"><span className="num">03</span> · RECENT</div>
              <div className="section-title">Quote <span className="acc">history.</span></div>
            </div>
          </div>
          <div className="feed" style={{ paddingBottom: 48 }}>
            {stats.recent.map((j) => {
              const byService = j.raw?.vendorQuoteByServiceExVat;
              const services = byService
                ? Object.entries(byService).map(([sid, amt]) => `${sid.toUpperCase()} ${fmtR(Number(amt))}`).join(" · ")
                : null;
              const date = j.raw?.quotedAt
                ? new Date(j.raw.quotedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })
                : null;
              return (
                <div key={j.id} className="compact-row" style={{ cursor: "default" }}>
                  <div className="lbl">
                    <div className="name">{j.raw?.car || "Vehicle"}</div>
                    <div className="meta" style={{ fontSize: 11 }}>{services || fmtR(j.izimotoCost)}</div>
                  </div>
                  <div className="right" style={{ alignItems: "flex-end", gap: 4 }}>
                    {stageChip(j.stage)}
                    {date && <div style={{ ...MONO, fontSize: 9, letterSpacing: ".08em", color: "rgba(255,255,255,.35)", marginTop: 2 }}>{date}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
