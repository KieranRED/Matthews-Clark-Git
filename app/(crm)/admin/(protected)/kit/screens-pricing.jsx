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

// Which detail field to use as the tier discriminator per service
const TIER_KEY = {
  wrap:    { field: "scope",    labels: { full: "Full wrap", partial: "Partial / accents", custom: "Custom panels" } },
  ppf:     { field: "coverage", labels: { "full-front": "Full front", "track-pack": "Track pack", full: "Full car", custom: "Custom panels" } },
  tint:    { field: "windows",  labels: { "front-only": "Front 2 windows", all: "All windows", "all+windscreen": "All + windscreen" } },
  ceramic: { field: "package",  labels: { "2y": "2 Year", "5y": "5 Year", "10y": "10 Year" } },
  correct: { field: "stage",    labels: { stage1: "Stage 1", stage2: "Stage 2", stage3: "Stage 3" } },
  detail:  { field: "kind",     labels: { interior: "Interior", exterior: "Exterior", full: "Full detail" } },
  wheel:   { field: "service",  labels: { powder: "Powder coat", refurb: "Refurb", both: "Powder + Refurb" } },
};

// The tier shown as the headline on the collapsed card (most common / representative)
const HEADLINE_TIER = {
  wrap:    "full",
  ppf:     "full-front",
  tint:    "all",
  ceramic: "5y",
  correct: "stage2",
  detail:  "full",
  wheel:   "powder",
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
  // Build a unified flat list of vendor-priced service quotes,
  // including both main job services AND confirmed upsells.
  const allQuotes = [];

  for (const j of jobs) {
    const lead = j.raw || {};
    const stage = j.stage;

    // Main job service quotes
    const byService = lead.vendorQuoteByServiceExVat;
    if (byService && typeof byService === "object") {
      for (const [sid, amt] of Object.entries(byService)) {
        const n = Number(amt);
        if (!Number.isFinite(n) || n <= 0) continue;
        allQuotes.push({
          jobId: j.id,
          stage,
          service: sid,
          vendorExVat: n,
          details: lead.serviceDetails?.[sid] || null,
        });
      }
    }

    // Upsell quotes — cross-ref confirmed upsells → upsell requests → vendor cost + service
    const upsellRequests = Array.isArray(lead.upsellRequests) ? lead.upsellRequests : [];
    const upsells = Array.isArray(lead.upsells) ? lead.upsells : [];
    const reqById = Object.fromEntries(upsellRequests.map((r) => [r.id, r]));

    for (const u of upsells) {
      const req = u.requestId ? reqById[u.requestId] : null;
      if (!req?.service) continue;
      const vendorExVat = Number(req.vendorExVat);
      if (!Number.isFinite(vendorExVat) || vendorExVat <= 0) continue;
      allQuotes.push({
        jobId: j.id,
        stage,
        service: req.service,
        vendorExVat,
        details: null, // upsell details are freeform notes, not structured
        isUpsell: true,
      });
    }
  }

  // Overall funnel stats (based on jobs, not individual service quotes)
  const quotedJobs = jobs.filter((j) => {
    const byService = j.raw?.vendorQuoteByServiceExVat;
    const hasService = byService && typeof byService === "object" && Object.keys(byService).length > 0;
    const hasTotal = typeof j.raw?.vendorQuoteTotalExVat === "number" && j.raw.vendorQuoteTotalExVat > 0;
    return hasService || hasTotal;
  });
  const quotedIds = new Set(quotedJobs.map((j) => j.id));
  const nQuoted = quotedJobs.length;
  const total = jobs.length;
  const convertedJobs = jobs.filter((j) => CONVERTED_STAGES.has(j.stage));
  const nConverted = convertedJobs.length;
  const lostJobs = jobs.filter((j) => j.stage === "lost");
  const nLost = lostJobs.length;
  const nLostAfterQuote = lostJobs.filter((j) => quotedIds.has(j.id)).length;
  const nBookedFromQuote = quotedJobs.filter((j) => CONVERTED_STAGES.has(j.stage)).length;
  const nConcluded = nBookedFromQuote + nLostAfterQuote;
  const quoteRate = total > 0 ? nQuoted / total : 0;
  const bookingRate = nConcluded > 0 ? nBookedFromQuote / nConcluded : null;
  const overallRate = total > 0 ? nConverted / total : 0;

  // Per-service stats — includes upsells
  const serviceStats = {};
  for (const { id } of SERVICE_META) {
    const sQuotes = allQuotes.filter((q) => q.service === id);
    if (!sQuotes.length) continue;

    const accepted = sQuotes.filter((q) => CONVERTED_STAGES.has(q.stage));
    const rejected = sQuotes.filter((q) => q.stage === "lost");
    const pending  = sQuotes.filter((q) => !CONVERTED_STAGES.has(q.stage) && q.stage !== "lost");
    const concluded = accepted.length + rejected.length;
    const acceptRate = concluded > 0 ? accepted.length / concluded : null;

    const amounts  = sQuotes.map((q) => q.vendorExVat);
    const accAmts  = accepted.map((q) => q.vendorExVat);
    const rejAmts  = rejected.map((q) => q.vendorExVat);

    // Tier breakdown using structured serviceDetails
    const tierKey = TIER_KEY[id];
    let tiers = null;
    if (tierKey) {
      const tierMap = {};
      for (const q of sQuotes) {
        const val = q.details?.[tierKey.field] || (q.isUpsell ? null : "other");
        if (!val) continue; // skip upsells with no structured detail — they go into overall only
        if (!tierMap[val]) tierMap[val] = [];
        tierMap[val].push(q);
      }
      tiers = Object.entries(tierMap)
        .filter(([, qs]) => qs.length > 0)
        .map(([val, qs]) => {
          const amts = qs.map((q) => q.vendorExVat);
          const acc  = qs.filter((q) => CONVERTED_STAGES.has(q.stage));
          const rej  = qs.filter((q) => q.stage === "lost");
          const con  = acc.length + rej.length;
          return {
            val,
            label: tierKey.labels[val] || val,
            count: qs.length,
            avg: avg(amts),
            min: Math.min(...amts),
            max: Math.max(...amts),
            acceptRate: con > 0 ? acc.length / con : null,
          };
        })
        .sort((a, b) => b.count - a.count);

      if (!tiers.length) tiers = null;
    }

    // Headline: preferred tier's avg, fallback to overall
    const headlineTierVal  = HEADLINE_TIER[id];
    const headlineTier     = tiers?.find((t) => t.val === headlineTierVal);
    const headlineAvg      = headlineTier?.avg ?? avg(amounts);
    const headlineLabel    = headlineTier ? (tierKey?.labels[headlineTierVal] || headlineTierVal) : null;

    serviceStats[id] = {
      count: sQuotes.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      avgAll: avg(amounts),
      avgAccepted: avg(accAmts),
      avgRejected: avg(rejAmts),
      accepted: accepted.length,
      rejected: rejected.length,
      pending: pending.length,
      acceptRate,
      tiers,
      headlineAvg,
      headlineLabel,
    };
  }

  // Recent quoted jobs feed
  const recent = quotedJobs
    .filter((j) => j.raw?.quotedAt)
    .sort((a, b) => Date.parse(b.raw.quotedAt) - Date.parse(a.raw.quotedAt))
    .slice(0, 20);

  return {
    total, nQuoted, nConverted, nLost,
    nBookedFromQuote, nConcluded, nLostAfterQuote,
    quoteRate, bookingRate, overallRate,
    serviceStats, recent,
  };
}

function stageChip(stage) {
  const MAP = {
    "booked":    { label: "Booked",    bg: "rgba(39,174,96,.18)",  col: "#27AE60" },
    "in-bay":    { label: "In bay",    bg: "rgba(242,201,76,.15)", col: "#F2C94C" },
    "reveal":    { label: "Reveal",    bg: "rgba(86,204,242,.15)", col: "#56CCF2" },
    "delivered": { label: "Done",      bg: "rgba(39,174,96,.18)",  col: "#27AE60" },
    "aftercare": { label: "Aftercare", bg: "rgba(155,81,224,.18)", col: "#9B51E0" },
    "quoted":    { label: "Pending",   bg: "rgba(74,120,255,.15)", col: "#7A9BFF" },
    "lost":      { label: "Lost",      bg: "rgba(255,77,77,.12)",  col: "#FF6B6B" },
    "new":       { label: "New",       bg: "rgba(255,255,255,.07)",col: "rgba(255,255,255,.5)" },
  };
  const s = MAP[stage] || { label: stage, bg: "rgba(255,255,255,.07)", col: "rgba(255,255,255,.5)" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 9px", borderRadius: 999,
      background: s.bg, color: s.col, fontSize: 10, fontWeight: 700,
      letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

function acceptColor(rate) {
  if (rate == null) return "rgba(255,255,255,.4)";
  const p = rate * 100;
  return p >= 70 ? "#27AE60" : p >= 40 ? "#F2C94C" : "#FF6B6B";
}

function ServiceCard({ id, label, color, s }) {
  const [open, setOpen] = useState(false);
  const hasTiers = s.tiers && s.tiers.length > 1;

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${color}22`,
      background: `${color}09`,
      overflow: "hidden",
    }}>
      {/* Main collapsed row */}
      <div style={{ padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{label}</div>
            {s.headlineLabel && (
              <div style={{ ...MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: `${color}cc`, marginTop: 3 }}>
                {s.headlineLabel}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...MONO, fontSize: 10, letterSpacing: ".1em", color: color, opacity: 0.75 }}>
              {s.count} {s.count === 1 ? "quote" : "quotes"}
            </span>
            {hasTiers && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                style={{
                  background: `${color}18`, border: `1px solid ${color}30`,
                  borderRadius: 8, padding: "4px 10px", cursor: "pointer",
                  ...MONO, fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
                  color: color, display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {open ? "Less" : "Breakdown"}
                <span style={{ fontSize: 10, transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
              </button>
            )}
          </div>
        </div>

        {/* Headline price + range + close rate */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{
            flex: "0 0 auto", minWidth: 100,
            borderRadius: 8, background: `${color}12`,
            padding: "10px 14px",
          }}>
            <div style={{ ...MONO, fontSize: 8, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 3 }}>
              {s.headlineLabel ? "Avg" : "Avg quote"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: color, letterSpacing: "-.01em" }}>
              {fmtR(s.headlineAvg)}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ borderRadius: 8, background: "rgba(255,255,255,.04)", padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>Range</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{fmtR(s.min)} – {fmtR(s.max)}</span>
            </div>
            <div style={{ borderRadius: 8, background: "rgba(255,255,255,.04)", padding: "7px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>Close rate</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: acceptColor(s.acceptRate) }}>
                {s.acceptRate != null ? `${Math.round(s.acceptRate * 100)}%` : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Won vs lost mini bar */}
        {(s.accepted > 0 || s.rejected > 0) && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2, background: "#27AE60",
                width: `${Math.round((s.accepted / (s.accepted + s.rejected)) * 100)}%`,
              }} />
            </div>
            <span style={{ ...MONO, fontSize: 9, letterSpacing: ".06em", color: "rgba(255,255,255,.3)", whiteSpace: "nowrap" }}>
              {s.accepted}✓ {s.rejected}✗{s.pending > 0 ? ` ${s.pending}…` : ""}
            </span>
          </div>
        )}

        {/* Won vs lost avg comparison */}
        {s.avgAccepted != null && s.avgRejected != null && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <span style={{ ...MONO, fontSize: 9, letterSpacing: ".06em", color: "#27AE60" }}>Won avg {fmtR(s.avgAccepted)}</span>
            <span style={{ color: "rgba(255,255,255,.15)" }}>·</span>
            <span style={{ ...MONO, fontSize: 9, letterSpacing: ".06em", color: "#FF6B6B" }}>Lost avg {fmtR(s.avgRejected)}</span>
          </div>
        )}
      </div>

      {/* Expanded tier breakdown */}
      {open && s.tiers && (
        <div style={{ borderTop: `1px solid ${color}18`, padding: "12px 16px 14px", display: "grid", gap: 8 }}>
          <div style={{ ...MONO, fontSize: 8, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", marginBottom: 2 }}>
            Breakdown by type
          </div>
          {s.tiers.map((t) => (
            <div key={t.val} style={{
              display: "grid", gridTemplateColumns: "1fr auto auto auto",
              gap: 10, alignItems: "center",
              padding: "9px 12px",
              background: "rgba(255,255,255,.04)", borderRadius: 10,
              border: t.val === HEADLINE_TIER[id] ? `1px solid ${color}30` : "1px solid transparent",
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{t.label}</div>
                <div style={{ ...MONO, fontSize: 9, letterSpacing: ".06em", color: "rgba(255,255,255,.3)", marginTop: 2 }}>
                  {t.count} {t.count === 1 ? "quote" : "quotes"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>Avg</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: color }}>{fmtR(t.avg)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>Range</div>
                <div style={{ ...MONO, fontSize: 10, color: "rgba(255,255,255,.6)" }}>{fmtR(t.min)}–{fmtR(t.max)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>Close</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: acceptColor(t.acceptRate) }}>
                  {t.acceptRate != null ? `${Math.round(t.acceptRate * 100)}%` : "—"}
                </div>
              </div>
            </div>
          ))}
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

      {/* Funnel KPIs */}
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

      {/* Funnel bars */}
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
              { label: "Lead → Quote",   n: stats.nQuoted,          d: stats.total,      sub: "Izimoto prices received" },
              { label: "Quote → Booked", n: stats.nBookedFromQuote,  d: stats.nConcluded, sub: "Of concluded quotes" },
              { label: "Overall",        n: stats.nConverted,        d: stats.total,      sub: "Lead to booked" },
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
                  <div style={{ marginTop: 6, ...MONO, fontSize: 9, letterSpacing: ".1em", color: "rgba(255,255,255,.35)" }}>{n} / {d}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Per-service cards */}
      <div className="section-h">
        <div>
          <div className="eyebrow"><span className="num">02</span> · BY SERVICE</div>
          <div className="section-title">Izimoto <span className="acc">prices.</span></div>
        </div>
      </div>
      <div style={{ ...MONO, fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", padding: "0 0 10px" }}>
        Vendor cost ex VAT · includes upsells · tap "Breakdown" to see tiers
      </div>

      {!hasData ? (
        <div style={{ padding: "24px 0", fontSize: 13, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>
          No quotes yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
          {SERVICE_META.map(({ id, label, color }) => {
            const s = stats.serviceStats[id];
            if (!s) return null;
            return <ServiceCard key={id} id={id} label={label} color={color} s={s} />;
          })}
        </div>
      )}

      {/* Recent quotes feed */}
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
