"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { StagePill, EmptyState } from "./components";
import { initials, moneyZAR } from "./utils";

export default function LeadsScreen({ index, params }) {
  const router = useRouter();
  const isIzimoto = String(index?.VIEWER?.role || "").startsWith("izimoto");
  const defaultTab = isIzimoto ? "to-quote" : "all";
  const [tab, setTab] = useState(params?.stage || defaultTab);
  const [q, setQ] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [quoteSub, setQuoteSub] = useState("waiting_mc");

  // Keep the tab in sync when navigating between `/admin/leads/<stage>` routes.
  // (App Router keeps this component mounted for the catch-all route.)
  useEffect(() => {
    setTab(params?.stage || defaultTab);
  }, [params?.stage, defaultTab]);
  useEffect(() => {
    // Reset quote substep when switching away.
    if (tab !== "quoted") setQuoteSub("waiting_mc");
  }, [tab]);

  const tabs = isIzimoto
    ? [
        { id: "to-quote", label: "To quote" },
        { id: "quoted", label: "Quoted" },
        { id: "booked", label: "Booked" },
        { id: "in-bay", label: "In bay" },
        { id: "delivered", label: "Delivered" },
        { id: "all", label: "All" }
      ]
    : [
        { id: "all", label: "All" },
        { id: "new", label: "New" },
        { id: "quoted", label: "Quoted" },
        { id: "booked", label: "Booked" },
        { id: "in-bay", label: "In bay" },
        { id: "reveal", label: "Reveal" },
        { id: "aftercare", label: "Aftercare" }
      ];

  const filtered = useMemo(() => {
    const jobs = index?.JOBS || [];
    const query = String(q || "").trim().toLowerCase();
    const list = jobs.filter((j) => {
      if (!j) return false;
      // Stage filtering (+ quoted substeps for M&C)
      if (tab !== "all") {
        if (!isIzimoto && tab === "quoted") {
          const step = String(j.quoteStep || "");
          if (quoteSub === "waiting_izimoto") {
            // "Waiting Izimoto" is effectively pre-quote (called) leads.
            if (step !== "waiting_izimoto") return false;
          } else {
            // Remaining substeps are actual quoted leads.
            if (j.stage !== "quoted") return false;
            if (quoteSub === "waiting_mc" && step !== "waiting_mc") return false;
            if (quoteSub === "completed" && step !== "completed") return false;
          }
        } else {
          const stageFilter = tab === "to-quote" ? "new" : tab;
          if (j.stage !== stageFilter) return false;
        }
      }
      if (priorityOnly && !((Number(j.attentionScore || 0) >= 80) || j.attentionLevel === "P0")) return false;
      if (!query) return true;
      const v = index?.vehicle(j.vehicleId);
      const c = index?.vehicleContact(j.vehicleId);
      const hay = `${v?.label || ""} ${c?.name || ""} ${j.ref || ""}`.toLowerCase();
      return hay.includes(query);
    });
    list.sort((a, b) => {
      const as = Number(a?.attentionScore || 0);
      const bs = Number(b?.attentionScore || 0);
      if (bs !== as) return bs - as;
      const at = Date.parse(a?.raw?.createdAt || 0);
      const bt = Date.parse(b?.raw?.createdAt || 0);
      return bt - at;
    });
    return list;
  }, [index, tab, q, priorityOnly, isIzimoto, quoteSub]);

  return (
    <div className="screen">
      <div className="search">
        <Icon.search />
        <input placeholder="Search leads, refs, cars…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button
          type="button"
          className="icon-btn"
          aria-label="Priority"
          title="Priority"
          onClick={() => setPriorityOnly((v) => !v)}
          style={{
            borderColor: priorityOnly ? "rgba(31,79,255,.55)" : undefined,
            background: priorityOnly ? "rgba(31,79,255,.14)" : undefined,
            color: priorityOnly ? "#fff" : undefined
          }}
        >
          <Icon.bell />
        </button>
      </div>

      <div className="tabs">
        {tabs.map((t) => {
          const stageFilter = t.id === "to-quote" ? "new" : t.id;
          const ct = t.id === "all" ? (index?.JOBS || []).length : (index?.JOBS || []).filter((j) => j.stage === stageFilter).length;
          return (
            <button key={t.id} className={"tab " + (tab === t.id ? "on" : "")} onClick={() => setTab(t.id)}>
              {t.label} <span className="ct">{ct}</span>
            </button>
          );
        })}
      </div>

      {!isIzimoto && tab === "quoted" ? (
        <div style={{ padding: "0 18px 12px" }}>
          <div style={{ display: "flex", gap: 6, padding: 3, borderRadius: 999, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
            <button
              type="button"
              className="tab"
              onClick={() => setQuoteSub("waiting_izimoto")}
              style={{
                flex: 1,
                borderRadius: 999,
                background: quoteSub === "waiting_izimoto" ? "rgba(31,79,255,.22)" : "transparent",
                borderColor: quoteSub === "waiting_izimoto" ? "rgba(31,79,255,.55)" : "transparent",
                color: "#fff"
              }}
            >
              Waiting Izimoto
            </button>
            <button
              type="button"
              className="tab"
              onClick={() => setQuoteSub("waiting_mc")}
              style={{
                flex: 1,
                borderRadius: 999,
                background: quoteSub === "waiting_mc" ? "rgba(31,79,255,.22)" : "transparent",
                borderColor: quoteSub === "waiting_mc" ? "rgba(31,79,255,.55)" : "transparent",
                color: "#fff"
              }}
            >
              Waiting M&amp;C
            </button>
            <button
              type="button"
              className="tab"
              onClick={() => setQuoteSub("completed")}
              style={{
                flex: 1,
                borderRadius: 999,
                background: quoteSub === "completed" ? "rgba(31,79,255,.22)" : "transparent",
                borderColor: quoteSub === "completed" ? "rgba(31,79,255,.55)" : "transparent",
                color: "#fff"
              }}
            >
              Completed
            </button>
          </div>
        </div>
      ) : null}

      <div className="list">
        {filtered.length === 0 ? <EmptyState title="No leads in this stage." /> : null}
        {filtered.map((j) => {
          const v = index?.vehicle(j.vehicleId);
          const c = index?.vehicleContact(j.vehicleId);
          const attention = j.attentionLabel || null;
          const dot = j.attentionColor || "var(--mc-blue)";
          const hint = attention ? (String(j.followUpAt || "").slice(0, 16) ? `Follow-up: ${String(j.followUpAt).slice(0, 16).replace("T", " ")}` : "") : "";
          return (
            <div
              key={j.id}
              className="list-row"
              onClick={() => router.push(`/admin/jobs/${encodeURIComponent(j.id)}`)}
              style={j.attentionColor ? { borderLeft: `3px solid ${j.attentionColor}` } : undefined}
            >
              {Number(j.unread || 0) > 0 ? <span className="unread">{j.unread}</span> : null}
              <div className={"av " + (c?.vip ? "vip" : "")}>{initials(c?.name || "Client")}</div>
              <div className="who">
                <div className="name">{c?.name || "Client"}</div>
                <div className="meta">
                  <span>{j.ref}</span>
                  <span className="sep">·</span>
                  <span>{v?.label || "Vehicle"}</span>
                </div>
                {attention ? (
                  <div className="submeta">
                    <span className="priority-pill" style={{ borderColor: `${dot}66`, background: `${dot}14`, color: "#fff" }}>
                      <span className="priority-dot" style={{ background: dot }} />
                      {attention}
                    </span>
                    {hint ? <span style={{ marginLeft: 8, color: "rgba(255,255,255,.55)" }}>{hint}</span> : null}
                  </div>
                ) : null}
              </div>
              <div className="right">
                <StagePill stageId={j.stage} index={index} />
                {Number(j.value || 0) > 0 ? <span className="amount">{moneyZAR(j.value)}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
