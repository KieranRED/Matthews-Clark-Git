"use client";

import { useState } from "react";

export default function ConsultClient({ leadId, token, lead }) {
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [method, setMethod] = useState("call");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "Saving…" });
    try {
      const payload = { t: token, method, scheduledAt: new Date(when).toISOString(), notes };
      const res = await fetch(`/api/lead/${encodeURIComponent(leadId)}/consultation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to schedule consultation.");
      setStatus({ state: "success", message: "Saved. You can close this page." });
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to schedule consultation." });
    }
  }

  const clientLabel = `${lead?.name || "Client"} · ${lead?.number || "—"}`;
  const carLabel = lead?.car || "—";

  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#050505", color: "#fff" }}>
      <form onSubmit={onSubmit} style={{ width: "min(520px,100%)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, textTransform: "uppercase" }}>Schedule consultation</div>
        <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>
          <div>
            <b style={{ color: "#fff" }}>Client:</b> {clientLabel}
          </div>
          <div>
            <b style={{ color: "#fff" }}>Car:</b> {carLabel}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
              Method
            </div>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.35)", color: "#fff" }}
            >
              <option value="call">Call</option>
              <option value="video">Video call</option>
              <option value="in_person">In person</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
              Date &amp; time
            </div>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
              style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)", color: "#fff" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
              Notes (optional)
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.25)", color: "#fff", resize: "vertical" }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={status.state === "loading"}
          style={{
            marginTop: 14,
            width: "100%",
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

        {status.state !== "idle" ? (
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4, color: status.state === "error" ? "rgba(255,110,110,.95)" : "rgba(255,255,255,.7)" }}>
            {status.message}
          </div>
        ) : null}
      </form>
    </main>
  );
}

