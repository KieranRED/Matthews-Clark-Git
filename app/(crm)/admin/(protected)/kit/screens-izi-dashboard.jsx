"use client";

import Link from "next/link";
import { Icon } from "./icons";
import { moneyZAR, shortDay } from "./utils";

function todayLabel() {
  try {
    return new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "short" });
  } catch {
    return "Today";
  }
}

const SERVICE_LABELS = {
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  ceramic: "Ceramic",
  correct: "Correction",
  detail: "Detailing",
  wheel: "Wheels",
  kit: "Body Kit",
  starlight: "Starlight",
  interior: "Interior",
};

function serviceChips(lead) {
  const services = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
  const upsells = Array.isArray(lead?.upsells) ? lead.upsells : [];
  return { services, upsells };
}

export default function IziDashboardScreen({ index }) {
  const jobs = index?.JOBS || [];

  const toQuote = jobs.filter((j) => j.stage === "new");
  const inBay = jobs.filter((j) => j.stage === "in-bay" || j.stage === "reveal");
  const booked = jobs.filter((j) => j.stage === "booked");
  const completed = jobs.filter((j) => j.stage === "delivered" || j.stage === "aftercare");

  // Izimoto's own revenue = sum of their vendor costs across all active/completed jobs
  const iziRevenue = jobs.reduce((s, j) => s + (Number(j.izimotoCost || 0) || 0), 0);

  // Pending upsell requests across all jobs
  const pendingUpsells = jobs.reduce((s, j) => {
    const reqs = Array.isArray(j.raw?.upsellRequests) ? j.raw.upsellRequests : [];
    return s + reqs.filter((r) => r.status === "pending").length;
  }, 0);

  return (
    <div className="screen">
      <div className="greeting">
        <div className="hi">
          <span className="dot" />
          {todayLabel()} · Izimoto
        </div>
        <h1>
          Workshop<br />
          <span className="acc">overview.</span>
        </h1>
        <div className="sub">
          {inBay.length} in the bay · {toQuote.length} to quote{pendingUpsells > 0 ? ` · ${pendingUpsells} upsell${pendingUpsells > 1 ? "s" : ""} pending` : ""}
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid" style={{ paddingTop: 14 }}>
        <div className="kpi kpi--accent">
          <div className="lbl">To quote</div>
          <div className="val">{toQuote.length}</div>
          <div className="delta">Needs pricing</div>
        </div>
        <div className="kpi">
          <div className="lbl">In the bay</div>
          <div className="val">{inBay.length}</div>
          <div className="delta">{booked.length} booked</div>
        </div>
        <div className="kpi">
          <div className="lbl">Izimoto revenue</div>
          <div className="val">
            <span className="acc">R</span>
            {Math.round(iziRevenue / 1000)}k
          </div>
          <div className="delta">All active jobs</div>
        </div>
        <div className="kpi">
          <div className="lbl">Completed</div>
          <div className="val">{completed.length}</div>
          <div className="delta">Delivered</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick">
        <Link href="/admin/leads/to-quote">
          <span className="ic"><Icon.invoice /></span>
          <span>To quote</span>
        </Link>
        <Link href="/admin/leads/in-bay">
          <span className="ic"><Icon.check /></span>
          <span>In the bay</span>
        </Link>
        <Link href="/admin/calendar">
          <span className="ic"><Icon.cal /></span>
          <span>Availability</span>
        </Link>
        <Link href="/admin/leads">
          <span className="ic"><Icon.leads /></span>
          <span>All jobs</span>
        </Link>
      </div>

      {/* Upsell requests needing pricing */}
      {pendingUpsells > 0 && (() => {
        const jobsWithPending = jobs.filter((j) => {
          const reqs = Array.isArray(j.raw?.upsellRequests) ? j.raw.upsellRequests : [];
          return reqs.some((r) => r.status === "pending");
        });
        return (
          <div style={{ padding: "0 18px 24px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".2em", color: "rgba(245,158,11,.9)", textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#F59E0B", display: "inline-block" }} />
              Upsell quotes needed
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {jobsWithPending.map((j) => {
                const reqs = (j.raw?.upsellRequests || []).filter((r) => r.status === "pending");
                return (
                  <Link key={j.id} href={`/admin/jobs/${j.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "12px 14px", background: "rgba(245,158,11,.07)", borderRadius: 12, border: "1px solid rgba(245,158,11,.25)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{j.vehicle?.label || "Vehicle"}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(245,158,11,.85)", marginTop: 3, letterSpacing: ".08em" }}>
                          {reqs.map((r) => r.label || r.service).join(", ")}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-3)" }}>→</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* In the bay */}
      {inBay.length > 0 && (
        <div style={{ padding: "0 18px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".2em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 10 }}>In the bay</div>
          <div style={{ display: "grid", gap: 8 }}>
            {inBay.map((j) => {
              const { services, upsells } = serviceChips(j.raw);
              const vendorTotal = Number(j.izimotoCost || 0);
              return (
                <Link key={j.id} href={`/admin/jobs/${j.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: 12, border: "1px solid var(--bd-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)", marginBottom: 4 }}>{j.vehicle?.label || "Vehicle"}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {services.map((sid) => (
                          <span key={sid} style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                            {SERVICE_LABELS[sid] || sid}
                          </span>
                        ))}
                        {upsells.map((u) => (
                          <span key={u.id} style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "rgba(155,81,224,.8)", textTransform: "uppercase" }}>
                            +{u.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {vendorTotal > 0 && (
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--mc-blue)" }}>{moneyZAR(vendorTotal)}</div>
                      )}
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: j.stage === "reveal" ? "#F59E0B" : "rgba(31,79,255,.8)", textTransform: "uppercase", marginTop: 2 }}>
                        {j.stage === "reveal" ? "Reveal" : "In Bay"}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* To quote */}
      {toQuote.length > 0 && (
        <div style={{ padding: "0 18px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".2em", color: "var(--fg-3)", textTransform: "uppercase" }}>Needs pricing</div>
            <Link href="/admin/leads/to-quote" style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--mc-blue)", textTransform: "uppercase", textDecoration: "none" }}>All →</Link>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {toQuote.slice(0, 5).map((j) => {
              const { services } = serviceChips(j.raw);
              return (
                <Link key={j.id} href={`/admin/jobs/${j.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "12px 14px", background: "var(--bg-2)", borderRadius: 12, border: "1px solid var(--bd-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", marginBottom: 3 }}>{j.vehicle?.label || "Vehicle"}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".12em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                        {services.map((s) => SERVICE_LABELS[s] || s).join(" · ")}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--mc-blue)", textTransform: "uppercase" }}>Quote →</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
