"use client";

import { useRef, useState } from "react";
import { Icon } from "./icons";
import { moneyZAR, shortDay } from "./utils";

const STAGE_FLOW = ["booked", "in-bay", "reveal", "delivered"];

const STAGE_LABEL = {
  booked: "Booked",
  "in-bay": "In the Bay",
  reveal: "Reveal",
  delivered: "Delivered",
};

const SERVICE_LABELS = {
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  ceramic: "Ceramic",
  correct: "Paint Correction",
  detail: "Detailing",
  wheel: "Wheels",
  kit: "Body Kit",
  starlight: "Starlight",
  interior: "Interior",
};

function serviceLabel(sid) {
  return SERVICE_LABELS[sid] || String(sid || "").toUpperCase();
}

function serviceSummary(lead, sid) {
  const d = lead?.serviceDetails?.[sid];
  if (!d || typeof d !== "object") return null;
  const parts = [];
  if (sid === "ppf") {
    if (d.coverage) parts.push(d.coverage.replace(/-/g, " "));
    if (d.film) parts.push(d.film);
    if (d.doorJambs) parts.push("door jambs");
  } else if (sid === "wrap") {
    if (d.scope) parts.push(d.scope);
    if (d.finish) parts.push(d.finish);
    if (d.colour) parts.push(d.colour);
    if (d.doorJambs) parts.push("door jambs");
  } else if (sid === "tint") {
    if (d.windows) parts.push(d.windows.replace(/-/g, " "));
    if (d.shade) parts.push(`${d.shade}% VLT`);
  } else if (sid === "ceramic") {
    if (d.package) parts.push(d.package);
    const extras = [d.wheels && "wheels", d.glass && "glass", d.trim && "trim"].filter(Boolean);
    if (extras.length) parts.push(extras.join(", "));
  } else if (sid === "correct") {
    if (d.stage) parts.push(d.stage.replace("stage", "Stage "));
  } else if (sid === "detail") {
    if (d.kind) parts.push(d.kind);
  } else if (sid === "wheel") {
    if (d.service) parts.push(d.service);
    if (d.finish) parts.push(d.finish);
    if (d.colour) parts.push(d.colour);
  }
  return parts.length ? parts.join(" · ") : null;
}

function JobCard({ job, index, onRefresh }) {
  const lead = job?.raw || null;
  const services = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
  const upsells = Array.isArray(lead?.upsells) ? lead.upsells : [];

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileRef = useRef(null);

  const currentStage = job?.stage || "booked";
  const currentIdx = STAGE_FLOW.indexOf(currentStage);
  const nextStage = currentIdx >= 0 && currentIdx < STAGE_FLOW.length - 1 ? STAGE_FLOW[currentIdx + 1] : null;
  const nextLabel = nextStage ? STAGE_LABEL[nextStage] : null;

  async function advanceStage() {
    if (!nextStage || !lead?.id || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStage === "delivered" ? "completed" : nextStage === "in-bay" ? "in_bay" : nextStage }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus({ ok: true, msg: `Marked as ${STAGE_LABEL[nextStage]}` });
      onRefresh?.();
    } catch {
      setStatus({ ok: false, msg: "Failed to update — try again." });
    } finally {
      setBusy(false);
    }
  }

  async function handlePhotos(files) {
    if (!files?.length || !lead?.id) return;
    setPhotoUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/photos`, { method: "POST", body: fd });
      }
      setStatus({ ok: true, msg: "Photos uploaded." });
      onRefresh?.();
    } catch {
      setStatus({ ok: false, msg: "Upload failed." });
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <div style={{
      background: "var(--bg-2)",
      border: "1px solid var(--bd-1)",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              letterSpacing: ".02em",
              textTransform: "uppercase",
              color: "var(--fg-1)",
              lineHeight: 1,
            }}>
              {job?.vehicle?.label || "Vehicle"}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 999,
              background: currentStage === "in-bay" ? "rgba(31,79,255,.14)" : currentStage === "reveal" ? "rgba(245,158,11,.14)" : "rgba(255,255,255,.08)",
              color: currentStage === "in-bay" ? "#4A78FF" : currentStage === "reveal" ? "#F59E0B" : "var(--fg-3)",
              border: `1px solid ${currentStage === "in-bay" ? "rgba(31,79,255,.3)" : currentStage === "reveal" ? "rgba(245,158,11,.3)" : "var(--bd-1)"}`,
              flexShrink: 0,
            }}>
              {STAGE_LABEL[currentStage] || currentStage}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {services.map((sid) => (
              <span key={sid} style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--fg-3)",
              }}>
                {serviceLabel(sid)}
              </span>
            ))}
            {upsells.map((u) => (
              <span key={u.id} style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "rgba(155,81,224,.8)",
              }}>
                + {u.label}
              </span>
            ))}
          </div>
          {job?.start ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-3)", letterSpacing: ".12em", marginTop: 4 }}>
              {shortDay(job.start)}
            </div>
          ) : null}
        </div>
        <div style={{ color: "var(--fg-3)", fontSize: 14, flexShrink: 0, transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</div>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px", display: "grid", gap: 14 }}>

          {/* Service details */}
          <div style={{ display: "grid", gap: 8 }}>
            {services.map((sid) => {
              const sum = serviceSummary(lead, sid);
              return (
                <div key={sid} style={{ padding: "10px 12px", background: "var(--bg-1)", borderRadius: 10, border: "1px solid var(--bd-1)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 14, textTransform: "uppercase", letterSpacing: ".03em", marginBottom: sum ? 4 : 0 }}>
                    {serviceLabel(sid)}
                  </div>
                  {sum && <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>{sum}</div>}
                </div>
              );
            })}
            {upsells.map((u) => (
              <div key={u.id} style={{ padding: "10px 12px", background: "rgba(155,81,224,.06)", borderRadius: 10, border: "1px solid rgba(155,81,224,.2)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "rgba(155,81,224,.8)", textTransform: "uppercase", marginBottom: 3 }}>Upsell</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{u.label}</div>
              </div>
            ))}
          </div>

          {/* Brief / notes */}
          {lead?.notes?.[0]?.text ? (
            <div style={{ padding: "10px 12px", background: "var(--bg-1)", borderRadius: 10, border: "1px solid var(--bd-1)" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 5 }}>Brief</div>
              <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.6 }}>{lead.notes[0].text}</div>
            </div>
          ) : null}

          {/* Status feedback */}
          {status && (
            <div style={{ fontSize: 12, color: status.ok ? "#27AE60" : "#EB5757", fontFamily: "var(--font-mono)", letterSpacing: ".08em" }}>
              {status.msg}
            </div>
          )}

          {/* Advance stage */}
          {nextLabel && (
            <button
              type="button"
              className="bigbtn bigbtn--p"
              onClick={advanceStage}
              disabled={busy}
            >
              <span>Mark as {nextLabel}</span>
              <span className="arr">→</span>
            </button>
          )}

          {/* Upload photos */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handlePhotos(e.target.files)}
          />
          <button
            type="button"
            className="bigbtn bigbtn--g"
            onClick={() => fileRef.current?.click()}
            disabled={photoUploading}
          >
            <span>{photoUploading ? "Uploading…" : <><Icon.cam /> &nbsp; Upload photos</>}</span>
            <span className="arr">→</span>
          </button>

        </div>
      )}
    </div>
  );
}

export default function IziStaffScreen({ index, onRefresh }) {
  const jobs = (index?.JOBS || []).filter((j) => j.stage === "in-bay" || j.stage === "reveal" || j.stage === "booked");
  const inBay = jobs.filter((j) => j.stage === "in-bay" || j.stage === "reveal");
  const upcoming = jobs.filter((j) => j.stage === "booked");

  return (
    <div className="screen">
      <div className="greeting">
        <div className="hi">
          <span className="dot" />
          Izimoto Workshop
        </div>
        <h1>
          In the<br />
          <span className="acc">bay.</span>
        </h1>
        <div className="sub">
          {inBay.length} active · {upcoming.length} upcoming
        </div>
      </div>

      {inBay.length === 0 && upcoming.length === 0 ? (
        <div style={{ padding: "48px 18px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".2em", color: "var(--fg-3)", textTransform: "uppercase" }}>
            No active jobs
          </div>
        </div>
      ) : null}

      {inBay.length > 0 && (
        <div style={{ padding: "0 18px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".2em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 10 }}>Active</div>
          <div style={{ display: "grid", gap: 10 }}>
            {inBay.map((j) => (
              <JobCard key={j.id} job={j} index={index} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ padding: "0 18px 48px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".2em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 10 }}>Upcoming</div>
          <div style={{ display: "grid", gap: 10 }}>
            {upcoming.map((j) => (
              <JobCard key={j.id} job={j} index={index} onRefresh={onRefresh} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
