"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { initials, moneyZAR } from "./utils";

const FLOW = ["new", "quoted", "booked", "in-bay", "reveal", "delivered", "aftercare", "lost"];

const STAGE_META = {
  new:       { label: "New",       color: "rgba(255,255,255,.45)" },
  quoted:    { label: "Quoted",    color: "#7A9BFF" },
  booked:    { label: "Booked",    color: "#27AE60" },
  "in-bay":  { label: "In Bay",   color: "#F2C94C" },
  reveal:    { label: "Reveal",   color: "#56CCF2" },
  delivered: { label: "Delivered",color: "#27AE60" },
  aftercare: { label: "Aftercare",color: "#9B51E0" },
  lost:      { label: "Lost",     color: "#FF6B6B" },
};

const SERVICE_LABELS = {
  ppf: "PPF", wrap: "Wrap", tint: "Tint", ceramic: "Ceramic",
  correct: "Correction", detail: "Detail", wheel: "Wheels",
  pc_street_gloss: "Street Gloss", pc_bronze: "Bronze", pc_silver: "Silver",
  pc_gold: "Gold", pc_diamond: "Diamond",
  kit: "Bodykit", starlight: "Starlight", interior: "Interior",
};

export default function PipelineDesktopScreen({ index }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const jobs = index?.JOBS || [];

  const match = (j) => {
    if (!q.trim()) return true;
    const car = String(j.raw?.car || j.vehicle?.label || "").toLowerCase();
    const name = String(j.contact?.name || "").toLowerCase();
    const ref = String(j.ref || "").toLowerCase();
    return (car + " " + name + " " + ref).includes(q.toLowerCase());
  };

  const pipelineRevenue = jobs
    .filter((j) => ["quoted", "booked", "in-bay", "reveal"].includes(j.stage))
    .reduce((s, j) => s + (Number(j.revenue) || 0), 0);

  function goJob(id) {
    router.push(`/admin/jobs/${id}`);
  }

  return (
    <div className="ds-content wide">
      {/* Toolbar */}
      <div className="kanban-toolbar">
        <div className="search">
          <Icon.search />
          <input
            placeholder="Search jobs, clients, refs…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <div className="meta">
          {jobs.length} jobs · {moneyZAR(pipelineRevenue)} active pipeline
        </div>
        <button
          className="btn btn--p"
          style={{ height: 42 }}
          onClick={() => router.push("/admin/new-lead")}
        >
          <Icon.plus /> New lead
        </button>
      </div>

      {/* Kanban board */}
      <div className="kanban">
        {FLOW.map((stageId) => {
          const meta = STAGE_META[stageId];
          const col = jobs.filter((j) => j.stage === stageId && match(j));
          const colRevenue = col.reduce((s, j) => s + (Number(j.revenue) || 0), 0);

          return (
            <div key={stageId} className="kan-col">
              <div className="head">
                <span className="stage-dot" style={{ background: meta.color }} />
                <span className="nm">{meta.label}</span>
                <span className="ct">{col.length}</span>
                {colRevenue > 0 && (
                  <span className="sum">{moneyZAR(colRevenue)}</span>
                )}
              </div>
              <div className="body">
                {col.length === 0 && <div className="kan-empty">Empty</div>}
                {col.map((j) => {
                  const car = j.vehicle?.label || j.raw?.car || "Vehicle";
                  const clientName = j.contact?.name || j.raw?.name || "—";
                  const services = Array.isArray(j.raw?.services)
                    ? j.raw.services.filter((s) => s && s !== "unsure")
                    : [];
                  const upsells = Array.isArray(j.raw?.upsells) ? j.raw.upsells : [];
                  const hasPendingUpsells = (j.raw?.upsellRequests || []).some((r) => r.status === "pending");

                  return (
                    <div
                      key={j.id}
                      className="kan-card"
                      onClick={() => goJob(j.id)}
                    >
                      <div className="topline">
                        <span className="ref">{j.ref || j.id?.slice(0, 6).toUpperCase()}</span>
                        {j.unread > 0 && <span className="unread">{j.unread}</span>}
                        {hasPendingUpsells && (
                          <span style={{ marginLeft: "auto", fontSize: 9, fontFamily: "var(--mono)", letterSpacing: ".1em", textTransform: "uppercase", color: "#F59E0B", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 999, padding: "2px 7px" }}>
                            Quote needed
                          </span>
                        )}
                      </div>

                      <h4>{car}</h4>

                      <div className="cli">
                        <span
                          className="avatar"
                          style={{ width: 26, height: 26, fontSize: 11 }}
                        >
                          {initials(clientName)}
                        </span>
                        <div>
                          <div className="nm">{clientName}</div>
                        </div>
                      </div>

                      <div className="svcs">
                        {services.map((s) => (
                          <span key={s} className="svc">
                            {SERVICE_LABELS[s] || s}
                          </span>
                        ))}
                        {upsells.map((u) => (
                          <span key={u.id} className="svc" style={{ color: "#9B51E0", borderColor: "rgba(155,81,224,.3)" }}>
                            +{u.label}
                          </span>
                        ))}
                      </div>

                      <div className="foot">
                        <span>
                          {j.start ? `Start ${String(j.start).slice(5)}` : "Unscheduled"}
                        </span>
                        {j.revenue > 0 ? (
                          <span className="val">
                            {moneyZAR(j.revenue)}
                            {j.commission > 0 && (
                              <> · <span className="acc">+{moneyZAR(j.commission)}</span></>
                            )}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
