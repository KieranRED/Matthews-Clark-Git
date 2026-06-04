"use client";

import { useMemo, useState } from "react";

function fmtSlot(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-ZA", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}

export default function BookingClient({ leadId, token, lead }) {
  const slots = useMemo(() => {
    const s = lead?.booking?.proposedSlots;
    if (!Array.isArray(s)) return [];
    return s.map((v) => String(v)).filter(Boolean);
  }, [lead?.booking?.proposedSlots]);

  const [choice, setChoice] = useState(slots[0] || "");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [icsUrl, setIcsUrl] = useState("");

  const clientLabel = `${lead?.name || "Client"} · ${lead?.number || "—"}`;
  const carLabel = lead?.car || "—";

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ state: "loading", message: "Saving…" });
    setIcsUrl("");
    try {
      const action = choice ? "schedule" : "request";
      const payload = { t: token, action, slot: choice || null, notes };
      const res = await fetch(`/api/lead/${encodeURIComponent(leadId)}/booking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save booking.");
      if (action === "schedule" && choice) {
        setIcsUrl(`/api/lead/${encodeURIComponent(leadId)}/booking-ics?t=${encodeURIComponent(token)}`);
      }
      setStatus({ state: "success", message: action === "schedule" ? "Booked. See you then." : "Sent. The team will get back to you." });
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save booking." });
    }
  }

  const canPick = slots.length > 0;

  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#050505", color: "#fff" }}>
      <form onSubmit={onSubmit} style={{ width: "min(560px,100%)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, textTransform: "uppercase" }}>Book your slot</div>
        <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.5 }}>
          <div>
            <b style={{ color: "#fff" }}>Client:</b> {clientLabel}
          </div>
          <div>
            <b style={{ color: "#fff" }}>Car:</b> {carLabel}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
            Proposed dates
          </div>
          {!canPick ? (
            <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.5 }}>No dates have been proposed yet. Ask the team to resend your booking link.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {slots.map((iso) => (
                <label
                  key={iso}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "12px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.12)",
                    background: choice === iso ? "rgba(31,79,255,.14)" : "rgba(255,255,255,.03)",
                    cursor: "pointer"
                  }}
                >
                  <input type="radio" name="slot" checked={choice === iso} onChange={() => setChoice(iso)} />
                  <div style={{ fontWeight: 700 }}>{fmtSlot(iso)}</div>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setChoice("")}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,.18)",
                  background: choice ? "transparent" : "rgba(255,255,255,.04)",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                None of these times work
              </button>
            </div>
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
              Notes (optional)
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Anything we should know? (preferred times, access, parking, etc.)"
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
          Confirm booking
        </button>

        {icsUrl && status.state === "success" ? (
          <a
            href={icsUrl}
            style={{
              display: "block",
              marginTop: 10,
              textAlign: "center",
              padding: "12px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.06)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              textDecoration: "none"
            }}
          >
            Add to calendar (.ics)
          </a>
        ) : null}

        {status.state !== "idle" ? (
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4, color: status.state === "error" ? "rgba(255,110,110,.95)" : "rgba(255,255,255,.7)" }}>
            {status.message}
          </div>
        ) : null}
      </form>
    </main>
  );
}

