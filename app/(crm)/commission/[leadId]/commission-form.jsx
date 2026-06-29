"use client";

import { useMemo, useState } from "react";

const SERVICE_LABELS = {
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  ceramic: "Ceramic / Graphene",
  correct: "Paint correction",
  pc_street_gloss: "Paint correction - Street Gloss",
  pc_bronze: "Paint correction - Bronze",
  pc_silver: "Paint correction - Silver",
  pc_gold: "Paint correction - Gold",
  pc_diamond: "Paint correction - Diamond",
  detail: "Detail",
  wheel: "Wheels (Powder / Refurb)",
  kit: "Bodykit"
};

function humanService(id) {
  const key = String(id || "");
  return SERVICE_LABELS[key] || key;
}

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

export default function CommissionForm({ leadId, token, lead }) {
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [invoiceUrl, setInvoiceUrl] = useState("");

  const vendorByService =
    lead?.vendorQuoteByServiceExVat && typeof lead.vendorQuoteByServiceExVat === "object" ? lead.vendorQuoteByServiceExVat : null;
  const vendorVatRate = safeNum(lead?.vendorVatRate) ?? 0.15;
  const commissionMode =
    lead?.commissionByServiceMode && typeof lead.commissionByServiceMode === "object" ? lead.commissionByServiceMode : {};
  const commissionPercent =
    lead?.commissionByServicePercent && typeof lead.commissionByServicePercent === "object" ? lead.commissionByServicePercent : {};
  const commissionFixed =
    lead?.commissionByServiceFixedZar && typeof lead.commissionByServiceFixedZar === "object" ? lead.commissionByServiceFixedZar : {};
  const commissionTotal =
    lead?.commissionByServiceTotalExVat && typeof lead.commissionByServiceTotalExVat === "object" ? lead.commissionByServiceTotalExVat : {};

  const defaultPercent = safeNum(lead?.commissionPercent) ?? 0;

  const services = useMemo(() => {
    const base = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
    const fromVendor = vendorByService ? Object.keys(vendorByService) : [];
    const all = new Set([...base, ...fromVendor]);
    return Array.from(all);
  }, [lead?.services, vendorByService]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus({ state: "loading", message: "Saving…" });
    setInvoiceUrl("");

    const form = new FormData(formEl);
    form.set("t", token || "");

    try {
      const res = await fetch(`/api/lead/${encodeURIComponent(leadId)}/commission`, { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save commission.");
      const url = String(json?.invoiceUrl || "");
      if (url) setInvoiceUrl(url);
      setStatus({ state: "success", message: url ? "Commission saved. Downloading invoice…" : "Commission saved." });
      if (url) window.location.assign(url);
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save commission." });
    }
  };

  const applyDefault = (formEl) => {
    // Keep `formEl` param for backward-compat with existing onClick call sites.
    setDraftMode((prev) => {
      const next = { ...(prev || {}) };
      for (const sid of services) next[sid] = "percent";
      return next;
    });
    setDraftValue((prev) => {
      const next = { ...(prev || {}) };
      for (const sid of services) next[sid] = String(defaultPercent || 0);
      return next;
    });
  };

  const baseIncByService = useMemo(() => {
    const out = {};
    for (const [sid, amt] of Object.entries(vendorByService || {})) {
      const ex = safeNum(amt) ?? 0;
      out[sid] = Math.round(ex * (1 + vendorVatRate) * 100) / 100;
    }
    return out;
  }, [vendorByService, vendorVatRate]);

  const [draftMode, setDraftMode] = useState(() => {
    const out = {};
    for (const sid of services) out[sid] = String(commissionMode?.[sid] || "percent");
    return out;
  });

  const [draftValue, setDraftValue] = useState(() => {
    const out = {};
    for (const sid of services) {
      const mode = String(commissionMode?.[sid] || "percent");
      const baseInc = Number(baseIncByService?.[sid] || 0);
      if (mode === "fixed") out[sid] = String(safeNum(commissionFixed?.[sid]) ?? 0);
      else if (mode === "total") out[sid] = String(safeNum(commissionTotal?.[sid]) ?? baseInc);
      else out[sid] = String(safeNum(commissionPercent?.[sid]) ?? defaultPercent ?? 0);
    }
    return out;
  });

  const totals = useMemo(() => {
    let base = 0;
    let client = 0;
    for (const sid of services) {
      const baseInc = Number(baseIncByService?.[sid] || 0);
      if (!(baseInc > 0)) continue;
      base += baseInc;
      const mode = String(draftMode?.[sid] || "percent");
      const val = safeNum(draftValue?.[sid]) ?? 0;
      if (mode === "total") client += Math.max(baseInc, val);
      else if (mode === "fixed") client += baseInc + Math.max(0, val);
      else client += baseInc * (1 + Math.max(0, val) / 100);
    }
    base = Math.round(base * 100) / 100;
    client = Math.round(client * 100) / 100;
    return { base, client };
  }, [services, baseIncByService, draftMode, draftValue]);

  return (
    <form
      onSubmit={(e) => {
        // Keep a FormData-based submit so backend doesn't need to change.
        // We mirror controlled state into hidden inputs.
        onSubmit(e);
      }}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.6)" }}>
          Commission per service (percent, fixed, or set a total)
        </div>

        {services.map((sid) => {
          const mode = String(commissionMode?.[sid] || "percent");
          const baseInc = Number(baseIncByService?.[sid] || 0);
          const curMode = String(draftMode?.[sid] || mode);
          const curVal = String(draftValue?.[sid] ?? "");
          const invalidTotal = curMode === "total" && baseInc > 0 && (safeNum(curVal) == null || safeNum(curVal) < baseInc);
          return (
            <div key={sid} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 12, background: "rgba(255,255,255,.03)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <span style={{ fontWeight: 800, color: "#fff" }}>{humanService(sid)}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>
                  Base: R {baseInc.toFixed(2)} (incl VAT)
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "end" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>Type</span>
                  <select
                    name={`mode_${sid}`}
                    value={curMode === "fixed" ? "fixed" : curMode === "total" ? "total" : "percent"}
                    onChange={(e) => setDraftMode((p) => ({ ...(p || {}), [sid]: e.target.value }))}
                    style={{
                      padding: "12px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(0,0,0,.35)",
                      color: "#fff",
                      outline: "none"
                    }}
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (R)</option>
                    <option value="total">Total (R)</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>Value</span>
                  <input
                    name={`value_${sid}`}
                    inputMode="decimal"
                    value={String(draftValue?.[sid] ?? "")}
                    onChange={(e) => setDraftValue((p) => ({ ...(p || {}), [sid]: e.target.value }))}
                    placeholder={curMode === "fixed" ? "e.g. 1500" : curMode === "total" ? `min ${baseInc.toFixed(2)}` : "e.g. 25"}
                    style={{
                      width: "100%",
                      padding: "12px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(0,0,0,.25)",
                      color: "#fff",
                      fontSize: 14,
                      outline: "none"
                    }}
                  />
                </label>
              </div>
              {invalidTotal ? (
                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,110,110,.95)" }}>
                  Total must be ≥ R {baseInc.toFixed(2)} (base incl VAT).
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>Base total (incl VAT)</div>
          <div style={{ fontWeight: 900, color: "#fff" }}>R {Number(totals.base || 0).toFixed(2)}</div>
        </div>
        <div style={{ display: "grid", gap: 4, textAlign: "right" }}>
          <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>Client total (ex VAT)</div>
          <div style={{ fontWeight: 900, color: "var(--mc-blue)" }}>R {Number(totals.client || 0).toFixed(2)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={(e) => applyDefault(e.currentTarget?.form)}
          style={{
            flex: 1,
            padding: "14px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.14)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontWeight: 800,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            cursor: "pointer"
          }}
        >
          Use Default %
        </button>
        <button
          type="submit"
          disabled={status.state === "loading"}
          style={{
            flex: 1,
            padding: "14px 14px",
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
          Save
        </button>
      </div>

      {status.state !== "idle" ? (
        <div style={{ fontSize: 13, lineHeight: 1.4, color: status.state === "error" ? "rgba(255,110,110,.95)" : "rgba(255,255,255,.7)" }}>
          {status.message}
        </div>
      ) : null}

      {invoiceUrl && status.state === "success" ? (
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href={invoiceUrl}
            style={{
              flex: 1,
              padding: "14px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              cursor: "pointer",
              textDecoration: "none",
              textAlign: "center"
            }}
          >
            Download invoice
          </a>
        </div>
      ) : null}
    </form>
  );
}
