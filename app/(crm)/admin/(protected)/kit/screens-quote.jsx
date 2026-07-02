"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { EmptyState } from "./components";
import { moneyZAR } from "./utils";

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

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function serviceLabel(id) {
  const key = String(id || "");
  return SERVICE_LABELS[key] || key;
}

function serviceSummary(lead, sid) {
  const d = lead?.serviceDetails?.[sid] || null;
  if (!d || typeof d !== "object") return "";
  if (sid === "ppf") return [d.coverage, d.film, d.doorJambs ? "door jambs" : null].filter(Boolean).join(" · ");
  if (sid === "wrap") return [d.scope, Array.isArray(d.parts) ? d.parts.join(", ") : null, d.colour].filter(Boolean).join(" · ");
  if (sid === "wheel") return [d.service, d.finish, d.colour].filter(Boolean).join(" · ");
  if (sid === "tint") return [d.windows, d.shade ? `${d.shade}%` : null].filter(Boolean).join(" · ");
  if (sid === "ceramic") return [d.package, d.wheels ? "wheels" : null, d.glass ? "glass" : null, d.trim ? "trim" : null].filter(Boolean).join(" · ");
  if (sid === "correct") return d.stage || "";
  if (String(sid).startsWith("pc_")) return [d.packageName, d.protection, d.durationDays ? `${d.durationDays}d` : null].filter(Boolean).join(" · ");
  if (sid === "detail") return d.kind || "";
  return d.notes ? String(d.notes).slice(0, 120) : "";
}

export default function QuoteScreen({ index, params, onRefresh }) {
  const router = useRouter();
  const jobId = params?.id || "";
  const j = index?.job(jobId);
  const lead = j?.raw || null;

  const vendorByService =
    lead?.vendorQuoteByServiceExVat && typeof lead.vendorQuoteByServiceExVat === "object" ? lead.vendorQuoteByServiceExVat : null;
  const vendorVatRate = safeNum(lead?.vendorVatRate) ?? 0.15;
  const commissionByService = lead?.commissionByServicePercent && typeof lead.commissionByServicePercent === "object" ? lead.commissionByServicePercent : {};
  const commissionModeByService = lead?.commissionByServiceMode && typeof lead.commissionByServiceMode === "object" ? lead.commissionByServiceMode : {};
  const commissionFixedByService = lead?.commissionByServiceFixedZar && typeof lead.commissionByServiceFixedZar === "object" ? lead.commissionByServiceFixedZar : {};
  const defaultCommission = safeNum(index?.KPIS?.defaultCommissionPercent) ?? safeNum(lead?.commissionPercent) ?? 0;

  const servicesForQuote = useMemo(() => {
    const base = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
    const fromVendor = vendorByService ? Object.keys(vendorByService) : [];
    const all = new Set([...base, ...fromVendor]);
    return Array.from(all);
  }, [lead?.services, vendorByService]);

  const quoteLines = useMemo(() => {
    if (!vendorByService) return [];
    return servicesForQuote
      .map((sid) => {
        const vendorEx = safeNum(vendorByService?.[sid]) ?? null;
        if (vendorEx == null) return null;
        const vendorInc = round2(vendorEx * (1 + vendorVatRate));
        const mode = String(commissionModeByService?.[sid] || "percent");
        if (mode === "fixed") {
          const fixed = safeNum(commissionFixedByService?.[sid]) ?? 0;
          const clientEx = round2(vendorInc + Math.max(0, fixed));
          return { sid, vendorEx, vendorInc, mode: "fixed", value: fixed, clientEx };
        }
        const pct = safeNum(commissionByService?.[sid]) ?? safeNum(lead?.commissionPercent) ?? 0;
        const clientEx = round2(vendorInc * (1 + pct / 100));
        return { sid, vendorEx, vendorInc, mode: "percent", value: pct, clientEx };
      })
      .filter(Boolean);
  }, [vendorByService, servicesForQuote, vendorVatRate, commissionByService, commissionModeByService, commissionFixedByService, lead?.commissionPercent]);

  const [modeDraft, setModeDraft] = useState(() => ({ ...(commissionModeByService || {}) }));
  const [valueDraft, setValueDraft] = useState(() => {
    const out = {};
    for (const ln of quoteLines) out[ln.sid] = String(ln.value ?? "");
    return out;
  });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  useEffect(() => {
    setModeDraft({ ...(commissionModeByService || {}) });
    const out = {};
    for (const ln of quoteLines) out[ln.sid] = String(ln.value ?? "");
    setValueDraft(out);
    setStatus({ state: "idle", message: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (!j) {
    return (
      <div className="screen">
        <EmptyState title="Lead not found." subtitle="This lead may have been deleted." />
      </div>
    );
  }

  async function applyDefault() {
    const nextMode = {};
    const nextVal = {};
    for (const ln of quoteLines) {
      nextMode[ln.sid] = "percent";
      nextVal[ln.sid] = String(defaultCommission || 0);
    }
    setModeDraft(nextMode);
    setValueDraft(nextVal);
  }

  async function save() {
    if (!lead?.id) return;
    setStatus({ state: "loading", message: "Saving…" });
    try {
      const percent = {};
      const fixed = {};
      const mode = {};
      for (const ln of quoteLines) {
        const sid = ln.sid;
        const m = String(modeDraft?.[sid] || ln.mode || "percent");
        const v = safeNum(valueDraft?.[sid]);
        mode[sid] = m === "fixed" ? "fixed" : "percent";
        if (mode[sid] === "fixed") {
          if (v != null) fixed[sid] = v;
        } else {
          if (v != null) percent[sid] = v;
        }
      }
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/quote-builder`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commissionByServiceMode: mode, commissionByServicePercent: percent, commissionByServiceFixedZar: fixed })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setStatus({ state: "success", message: "Saved." });
      onRefresh?.();
    } catch (e) {
      setStatus({ state: "error", message: e instanceof Error ? e.message : "Failed to save." });
    }
  }

  const totalClientExVat = quoteLines.reduce((s, ln) => {
    const sid = ln.sid;
    const mode = String(modeDraft?.[sid] || ln.mode || "percent");
    const val = safeNum(valueDraft?.[sid]) ?? safeNum(ln.value) ?? 0;
    const clientEx = mode === "fixed" ? round2(Number(ln.vendorInc) + Math.max(0, val)) : round2(Number(ln.vendorInc) * (1 + Math.max(0, val) / 100));
    return s + clientEx;
  }, 0);

  return (
    <div className="screen">
      <div className="greeting">
        <div className="hi">
          <span className="dot" />
          Quote builder · per service
        </div>
        <h1>
          Add <span className="acc">commission.</span>
        </h1>
        <div className="sub">
          Lead {j.ref} · {lead?.car || "Vehicle"} · Client {lead?.name || "Client"}
        </div>
      </div>

      {!vendorByService ? (
        <div style={{ paddingTop: 12 }}>
          <EmptyState title="No Izimoto quote yet." subtitle="Wait for Izimoto to submit pricing, then come back here." />
          <div style={{ padding: "0 18px 24px" }}>
            <button className="bigbtn bigbtn--g" type="button" onClick={() => router.push(`/admin/jobs/${encodeURIComponent(jobId)}`)}>
              <span>
                <Icon.back /> &nbsp; Open lead
              </span>
              <span className="arr">→</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="detail-section">
            <div className="card" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                DEFAULT COMMISSION · {defaultCommission}%
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>
                Izimoto amounts are ex VAT. We add VAT to cost basis, then apply commission per service. Client prices shown ex VAT (for now).
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="bigbtn bigbtn--g" type="button" onClick={applyDefault} disabled={status.state === "loading"} style={{ flex: 1 }}>
                  <span>Use default</span>
                  <span className="arr">→</span>
                </button>
                <button className="bigbtn bigbtn--p" type="button" onClick={save} disabled={status.state === "loading"} style={{ flex: 1 }}>
                  <span>Save</span>
                  <span className="arr">→</span>
                </button>
              </div>

              {status.message ? (
                <div style={{ marginTop: 10, fontSize: 12, color: status.state === "error" ? "#FF4D4D" : "var(--fg-2)" }}>{status.message}</div>
              ) : null}
            </div>
          </div>

          <div className="detail-section">
            <h4>Items</h4>
            <div style={{ display: "grid", gap: 10 }}>
              {quoteLines.map((ln) => {
                const sid = ln.sid;
                const sum = serviceSummary(lead, sid);
                const mode = String(modeDraft?.[sid] || ln.mode || "percent");
                const val = safeNum(valueDraft?.[sid]) ?? safeNum(ln.value) ?? 0;
                const clientEx = mode === "fixed" ? round2(Number(ln.vendorInc) + Math.max(0, val)) : round2(Number(ln.vendorInc) * (1 + Math.max(0, val) / 100));
                return (
                  <div
                    key={sid}
                    style={{
                      border: "1px solid var(--bd-1)",
                      background: "var(--bg-2)",
                      borderRadius: 12,
                      padding: 12,
                      display: "grid",
                      gap: 8
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em" }}>
                        {serviceLabel(sid)}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                        Izimoto: {moneyZAR(ln.vendorEx)} ex VAT
                      </div>
                    </div>
                    {sum ? <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.35 }}>{sum}</div> : null}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                          Cost inc VAT
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-1)" }}>{moneyZAR(ln.vendorInc)}</div>
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                          Commission
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <select
                            value={mode === "fixed" ? "fixed" : "percent"}
                            onChange={(e) => setModeDraft((prev) => ({ ...(prev || {}), [sid]: e.target.value }))}
                            style={{
                              padding: "10px 10px",
                              borderRadius: 10,
                              border: "1px solid var(--bd-1)",
                              background: "rgba(255,255,255,.03)",
                              color: "#fff",
                              outline: "none"
                            }}
                          >
                            <option value="percent">%</option>
                            <option value="fixed">R</option>
                          </select>
                          <input
                            inputMode="decimal"
                            value={String(valueDraft?.[sid] ?? "")}
                            onChange={(e) => setValueDraft((prev) => ({ ...(prev || {}), [sid]: e.target.value }))}
                            style={{
                              padding: "10px 10px",
                              borderRadius: 10,
                              border: "1px solid var(--bd-1)",
                              background: "rgba(255,255,255,.03)",
                              color: "#fff",
                              outline: "none"
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                          Client ex VAT
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--mc-blue)" }}>{moneyZAR(clientEx)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="detail-section">
            <div className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                Total client (ex VAT)
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--mc-blue)" }}>{moneyZAR(totalClientExVat)}</div>
            </div>
          </div>

          <div style={{ padding: "8px 18px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="bigbtn bigbtn--g" type="button" onClick={() => router.push(`/admin/jobs/${encodeURIComponent(jobId)}`)}>
              <span>
                <Icon.back /> &nbsp; Back to lead
              </span>
              <span className="arr">→</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
