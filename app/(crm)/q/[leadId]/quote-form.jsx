"use client";

import { useState } from "react";

const SERVICE_META = {
  ppf:      { icon: "▤", label: "PPF",                    color: "#1F4FFF" },
  wrap:     { icon: "▦", label: "Wrap",                   color: "#7A9BFF" },
  tint:     { icon: "◧", label: "Tint",                   color: "#56CCF2" },
  ceramic:  { icon: "◆", label: "Ceramic / Graphene",     color: "#4A78FF" },
  correct:  { icon: "◍", label: "Paint Correction",       color: "#F2C94C" },
  detail:   { icon: "◐", label: "Detail",                 color: "#27AE60" },
  wheel:    { icon: "◓", label: "Wheels",                 color: "#9B51E0" },
  kit:      { icon: "◈", label: "Bodykit",                color: "#FF6B35" },
  starlight:{ icon: "✦", label: "Starlight Headliner",    color: "#FFD700" },
  interior: { icon: "◉", label: "Custom Interiors",       color: "#E91E8C" },
};

function humanService(id) {
  return SERVICE_META[String(id || "")]?.label || String(id || "");
}

// Returns an array of { label, value } spec rows for display
function specRows(lead, serviceId) {
  const d = lead?.serviceDetails?.[serviceId] || null;
  const rows = [];

  if (!d || typeof d !== "object") return rows;

  if (serviceId === "ppf") {
    if (d.coverage) rows.push({ label: "Coverage", value: String(d.coverage).replace(/-/g, " ") });
    if (d.film)     rows.push({ label: "Film type", value: String(d.film) });
    if (d.doorJambs) rows.push({ label: "Door jambs", value: "Yes — include door jambs" });
    if (Array.isArray(d.panels) && d.panels.length)
      rows.push({ label: "Custom panels", value: d.panels.join(", ") });
    if (d.notes) rows.push({ label: "Notes", value: String(d.notes) });
  }

  else if (serviceId === "wrap") {
    const scopeMap = { full: "Full colour-change wrap", partial: "Partial / accents", custom: "Custom panels (selected)" };
    if (d.scope)  rows.push({ label: "Scope", value: scopeMap[d.scope] || d.scope });
    if (d.finish) rows.push({ label: "Finish", value: String(d.finish).charAt(0).toUpperCase() + String(d.finish).slice(1) });
    if (d.doorJambs) rows.push({ label: "Door jambs", value: "Yes — include door jambs" });
    if (Array.isArray(d.parts) && d.parts.length)
      rows.push({ label: "Panels", value: d.parts.join(", ") });
    if (Array.isArray(d.panels) && d.panels.length)
      rows.push({ label: "Custom panels", value: d.panels.join(", ") });
    if (d.colour) rows.push({ label: "Target colour / style", value: String(d.colour) });
    if (d.notes)  rows.push({ label: "Notes", value: String(d.notes) });
  }

  else if (serviceId === "tint") {
    const winMap = { "front-only": "Front windows only", all: "All windows (full car)", "all+windscreen": "All windows + windscreen" };
    if (d.windows) rows.push({ label: "Windows", value: winMap[d.windows] || d.windows });
    if (d.shade)   rows.push({ label: "Shade", value: `${d.shade}% VLT` });
  }

  else if (serviceId === "ceramic") {
    if (d.package) rows.push({ label: "Package", value: String(d.package) });
    const extras = [d.wheels && "Wheels", d.glass && "Glass", d.trim && "Trim"].filter(Boolean);
    if (extras.length) rows.push({ label: "Add-ons", value: extras.join(", ") });
  }

  else if (serviceId === "correct") {
    const stageMap = { stage1: "Stage 1 — light swirls / enhancement", stage2: "Stage 2 — heavier swirls / deeper correction", stage3: "Stage 3 — maximum correction (time intensive)" };
    if (d.stage) rows.push({ label: "Stage", value: stageMap[d.stage] || d.stage });
    if (d.notes) rows.push({ label: "Notes", value: String(d.notes) });
  }

  else if (serviceId === "detail") {
    const kindMap = { interior: "Interior detail only", exterior: "Exterior detail only", full: "Full detail — interior + exterior" };
    if (d.kind) rows.push({ label: "Type", value: kindMap[d.kind] || d.kind });
    if (d.notes) rows.push({ label: "Notes", value: String(d.notes) });
  }

  else if (serviceId === "wheel") {
    const svcMap = { powder: "Powder coating", refurb: "Refurbishment" };
    if (d.service) rows.push({ label: "Service", value: svcMap[d.service] || d.service });
    if (d.finish)  rows.push({ label: "Finish", value: String(d.finish) });
    if (d.colour)  rows.push({ label: "Colour", value: String(d.colour) });
    if (d.notes)   rows.push({ label: "Notes", value: String(d.notes) });
  }

  else {
    if (d.notes) rows.push({ label: "Notes", value: String(d.notes) });
  }

  return rows;
}

const INPUT_STYLE = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.15)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  outline: "none",
  boxSizing: "border-box",
};

const VAT = 0.15;

function parseAmount(str) {
  if (!str) return null;
  const n = parseFloat(String(str).replace(/\s/g, "").replace(/,/g, "."));
  return isNaN(n) || n <= 0 ? null : n;
}

function fmtR(n) {
  return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuoteForm({ leadId, token, lead }) {
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [amounts, setAmounts] = useState({});

  const onAmountChange = (sid, val) => {
    setAmounts((prev) => ({ ...prev, [sid]: val }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus({ state: "loading", message: "Sending…" });
    const form = new FormData(formEl);
    form.set("t", token || "");
    try {
      const res = await fetch(`/api/lead/${encodeURIComponent(leadId)}/quote`, { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to submit quote.");
      setStatus({ state: "success", message: "Quote sent to Matthews & Clark." });
      formEl?.reset?.();
      setAmounts({});
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to submit quote." });
    }
  };

  const services = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
  const hasServices = services.length > 0;

  // Totals
  const parsedAmounts = services.map((sid) => parseAmount(amounts[sid]));
  const allFilled = hasServices && parsedAmounts.every((n) => n !== null);
  const totalEx = parsedAmounts.reduce((sum, n) => sum + (n || 0), 0);
  const totalVat = totalEx * VAT;
  const totalInc = totalEx + totalVat;

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {!hasServices ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.45 }}>
          No service breakdown captured. Enter one total below.
          <input name="amount_total" inputMode="decimal" placeholder="e.g. 9500 ex VAT" required style={{ ...INPUT_STYLE, marginTop: 10 }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>
            {services.length} service{services.length === 1 ? "" : "s"} — enter your price ex VAT (VAT added automatically)
          </div>

          {services.map((sid) => {
            const meta = SERVICE_META[sid] || { icon: "◌", label: humanService(sid), color: "#7A7A7A" };
            const rows = specRows(lead, sid);
            const exVal = parseAmount(amounts[sid]);
            const incVal = exVal !== null ? exVal * (1 + VAT) : null;

            return (
              <div key={sid} style={{
                borderRadius: 14,
                border: `1px solid ${meta.color}33`,
                background: `${meta.color}0D`,
                overflow: "hidden",
              }}>
                {/* Card header */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 16px",
                  borderBottom: rows.length ? `1px solid ${meta.color}22` : "none",
                  background: `${meta.color}14`,
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{meta.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: ".01em" }}>{meta.label}</span>
                </div>

                {/* Spec rows */}
                {rows.length > 0 && (
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {rows.map((row, i) => (
                      <div key={i} style={{ display: "flex", gap: 10 }}>
                        <span style={{
                          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                          fontSize: 9,
                          letterSpacing: ".14em",
                          textTransform: "uppercase",
                          color: meta.color,
                          opacity: 0.85,
                          minWidth: 90,
                          paddingTop: 2,
                          flexShrink: 0,
                        }}>
                          {row.label}
                        </span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,.9)", lineHeight: 1.45, flex: 1 }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {rows.length === 0 && (
                  <div style={{ padding: "10px 16px", fontSize: 12, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>
                    No detail captured — quote based on car + service type.
                  </div>
                )}

                {/* Price input */}
                <div style={{ padding: "0 16px 16px" }}>
                  <div style={{
                    fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                    fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase",
                    color: "rgba(255,255,255,.4)", marginBottom: 8,
                  }}>
                    Your price — R (ex VAT, excl. 15%)
                  </div>
                  <input
                    name={`amount_${sid}`}
                    inputMode="decimal"
                    placeholder="e.g. 9 500 ex VAT"
                    required
                    value={amounts[sid] ?? ""}
                    onChange={(e) => onAmountChange(sid, e.target.value)}
                    style={INPUT_STYLE}
                  />
                  {incVal !== null && (
                    <div style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: `${meta.color}18`,
                      border: `1px solid ${meta.color}30`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>
                        Inc. 15% VAT
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>
                        {fmtR(incVal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* VAT summary */}
          {totalEx > 0 && (
            <div style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.1)",
              background: "rgba(255,255,255,.04)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>
                    Subtotal ex VAT
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>
                    {fmtR(totalEx)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>
                    VAT (15%)
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>
                    {fmtR(totalVat)}
                  </span>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "2px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#fff", fontWeight: 700 }}>
                    Total inc VAT
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                    {fmtR(totalInc)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", lineHeight: 1.5, marginTop: 2 }}>
            {allFilled
              ? "All prices filled — ready to submit."
              : "Fill in all service prices above, then submit. No PDF needed — goes straight to the team."}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={status.state === "loading" || status.state === "success"}
        style={{
          width: "100%", padding: "16px", borderRadius: 12, border: 0,
          background: status.state === "success" ? "#27AE60" : "#1F4FFF",
          color: "#fff", fontWeight: 800, fontSize: 14,
          letterSpacing: ".08em", textTransform: "uppercase",
          cursor: (status.state === "loading" || status.state === "success") ? "default" : "pointer",
          opacity: status.state === "loading" ? 0.7 : 1,
          transition: "background .3s",
        }}
      >
        {status.state === "success" ? "✓ Quote Sent" : status.state === "loading" ? "Sending…" : "Send Quote"}
      </button>

      {status.state === "error" && (
        <div style={{ fontSize: 13, lineHeight: 1.4, color: "rgba(255,110,110,.95)" }}>
          {status.message}
        </div>
      )}
    </form>
  );
}
