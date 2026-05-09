"use client";

import { useState } from "react";

const SERVICE_LABELS = {
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  ceramic: "Ceramic / Graphene",
  correct: "Paint correction",
  detail: "Detail",
  wheel: "Wheels (Powder / Refurb)",
  kit: "Bodykit"
};

function humanService(id) {
  const key = String(id || "");
  return SERVICE_LABELS[key] || key;
}

function summarize(lead, serviceId) {
  const d = lead?.serviceDetails?.[serviceId] || null;
  if (!d || typeof d !== "object") return null;
  if (serviceId === "ppf") {
    const bits = [];
    if (d.coverage) bits.push(String(d.coverage).replaceAll("-", " "));
    if (d.film) bits.push(String(d.film));
    if (d.doorJambs) bits.push("door jambs");
    if (Array.isArray(d.panels) && d.panels.length) bits.push(`${d.panels.length} panels`);
    return bits.length ? bits.join(" · ") : null;
  }
  if (serviceId === "wrap") {
    const bits = [];
    if (d.scope) bits.push(String(d.scope));
    if (Array.isArray(d.parts) && d.parts.length) bits.push(d.parts.join(", "));
    if (d.colour) bits.push(String(d.colour));
    return bits.length ? bits.join(" · ") : null;
  }
  if (serviceId === "wheel") {
    const bits = [];
    if (d.service) bits.push(String(d.service));
    if (d.finish) bits.push(String(d.finish));
    if (d.colour) bits.push(String(d.colour));
    return bits.length ? bits.join(" · ") : null;
  }
  if (serviceId === "tint") return [d.windows, d.shade ? `${d.shade}%` : null].filter(Boolean).join(" · ") || null;
  if (serviceId === "ceramic") return [d.package, d.wheels ? "wheels" : null, d.glass ? "glass" : null, d.trim ? "trim" : null].filter(Boolean).join(" · ") || null;
  if (serviceId === "correct") return d.stage ? `stage ${String(d.stage).replace("stage", "")}` : null;
  if (serviceId === "detail") return d.kind || null;
  return d.notes ? String(d.notes).slice(0, 120) : null;
}

export default function QuoteForm({ leadId, token, lead }) {
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const onSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus({ state: "loading", message: "Sending…" });

    const form = new FormData(formEl);
    form.set("t", token || "");

    try {
      const res = await fetch(`/api/lead/${encodeURIComponent(leadId)}/quote`, {
        method: "POST",
        body: form
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to submit quote.");
      setStatus({ state: "success", message: "Quote sent to the team." });
      formEl?.reset?.();
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to submit quote."
      });
    }
  };

  const services = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
  const hasServices = services.length > 0;

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!hasServices ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.45 }}>
          This lead has no service breakdown yet. Enter one total below.
          <input
            name="amount_total"
            inputMode="decimal"
            placeholder="e.g. 9500"
            required
            style={{
              marginTop: 10,
              width: "100%",
              padding: "14px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.04)",
              color: "#fff",
              fontSize: 14,
              outline: "none"
            }}
          />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.6)" }}>
            Izimoto pricing (ex VAT) — per service
          </div>
          {services.map((sid) => {
            const label = humanService(sid);
            const sum = summarize(lead, sid);
            return (
              <label key={sid} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontWeight: 800, color: "#fff" }}>{label}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>{sum || ""}</span>
                </div>
                <input
                  name={`amount_${sid}`}
                  inputMode="decimal"
                  placeholder="e.g. 9500"
                  required
                  style={{
                    padding: "14px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.04)",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
              </label>
            );
          })}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.4 }}>
            Submit once you&apos;ve entered each service amount. No PDF needed.
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={status.state === "loading"}
        style={{
          width: "100%",
          padding: "16px 16px",
          borderRadius: 12,
          border: 0,
          background: "var(--mc-blue)",
          color: "#fff",
          fontWeight: 800,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          cursor: status.state === "loading" ? "default" : "pointer",
          opacity: status.state === "loading" ? 0.7 : 1
        }}
      >
        Send Quote
      </button>

      {status.state !== "idle" ? (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: status.state === "error" ? "rgba(255,110,110,.95)" : "rgba(255,255,255,.7)"
          }}
        >
          {status.message}
        </div>
      ) : null}
    </form>
  );
}
