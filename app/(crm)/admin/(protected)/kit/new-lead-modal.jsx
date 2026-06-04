"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "./icons";

const LANES = [
  { id: "protect", label: "Protect it" },
  { id: "present", label: "Present it" },
  { id: "both", label: "Both" }
];

const TIMEFRAMES = [
  { id: "this-week", label: "This week" },
  { id: "this-month", label: "This month" },
  { id: "no-rush", label: "No rush" }
];

function Backdrop({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        background: "rgba(0,0,0,.62)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 14
      }}
    >
      <div className="card" style={{ width: "min(560px, calc(100vw - 28px))", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

export function NewLeadModal({ index, initial, onClose, onCreated }) {
  const nameRef = useRef(null);
  const services = Array.isArray(index?.SERVICES) ? index.SERVICES : [];

  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [name, setName] = useState(initial?.name || "");
  const [number, setNumber] = useState(initial?.number || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [car, setCar] = useState(initial?.car || "");
  const [lane, setLane] = useState(initial?.lane || "protect");
  const [timeframe, setTimeframe] = useState(initial?.timeframe || "this-week");
  const [selectedServices, setSelectedServices] = useState(() => new Set(Array.isArray(initial?.services) ? initial.services : []));
  const [source, setSource] = useState(initial?.source || "TIKTOK");

  useEffect(() => {
    const id = setTimeout(() => nameRef.current?.focus?.(), 50);
    return () => clearTimeout(id);
  }, []);

  const canSubmit = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    return String(name).trim() && String(number).trim() && emailOk && String(car).trim() && lane && timeframe;
  }, [name, number, email, car, lane, timeframe]);

  const toggleService = (id) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function submit() {
    if (!canSubmit) return;
    setStatus({ state: "loading", message: "Creating lead…" });
    try {
      const payload = {
        name: String(name).trim(),
        number: String(number).trim(),
        email: String(email).trim(),
        car: String(car).trim(),
        lane,
        services: [...selectedServices],
        serviceDetails: {},
        timeframe,
        source,
        pageUrl: null,
        referrer: null
      };
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create lead.");
      const leadId = json?.leadId || null;
      setStatus({ state: "success", message: "Lead created." });
      onCreated?.(leadId);
      onClose?.();
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to create lead." });
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <div style={{ padding: 14, borderBottom: "1px solid var(--bd-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: "1px solid var(--bd-1)", color: "var(--fg-2)" }}>
            <Icon.plus />
          </div>
          <div>
            <div className="eyebrow">NEW LEAD</div>
            <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginTop: 2 }}>Add manually</div>
          </div>
        </div>
        <button onClick={onClose} className="icon-btn" aria-label="Close" title="Close">
          <Icon.back />
        </button>
      </div>

      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Client name</div>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Phone</div>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            placeholder="+27…"
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Car</div>
          <input
            value={car}
            onChange={(e) => setCar(e.target.value)}
            placeholder="e.g. BMW M2 2024"
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div className="eyebrow">Lane</div>
            <select
              value={lane}
              onChange={(e) => setLane(e.target.value)}
              className="card"
              style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
            >
              {LANES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <div className="eyebrow">Timing</div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="card"
              style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
            >
              {TIMEFRAMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Source</div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          >
            <option value="TIKTOK">TikTok</option>
            <option value="INSTAGRAM">Instagram</option>
          </select>
        </label>

        <div style={{ display: "grid", gap: 8 }}>
          <div className="eyebrow">Services</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                className="pill"
                onClick={() => toggleService(s.id)}
                style={{
                  borderColor: selectedServices.has(s.id) ? "rgba(31,79,255,.55)" : undefined,
                  background: selectedServices.has(s.id) ? "rgba(31,79,255,.14)" : undefined,
                  color: selectedServices.has(s.id) ? "#fff" : undefined
                }}
              >
                <span className="dot" style={{ background: selectedServices.has(s.id) ? "var(--mc-blue)" : "var(--fg-3)" }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button className="bigbtn bigbtn--p" onClick={submit} disabled={!canSubmit || status.state === "loading"}>
          <span>
            <Icon.check /> &nbsp; Create lead
          </span>
          <span className="arr">→</span>
        </button>

        {status.state !== "idle" ? (
          <div style={{ fontSize: 12, color: status.state === "error" ? "rgba(255,110,110,.95)" : "var(--fg-2)" }}>{status.message}</div>
        ) : null}
      </div>
    </Backdrop>
  );
}
