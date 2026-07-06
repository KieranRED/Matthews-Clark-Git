"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

export default function NewLeadScreen({ index, onRefresh }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameRef = useRef(null);
  const services = Array.isArray(index?.SERVICES) ? index.SERVICES : [];

  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [name, setName] = useState(searchParams.get("name") || "");
  const [number, setNumber] = useState(searchParams.get("number") || "");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [car, setCar] = useState("");
  const [lane, setLane] = useState("protect");
  const [timeframe, setTimeframe] = useState("this-week");
  const [selectedServices, setSelectedServices] = useState(() => new Set());
  const [source, setSource] = useState("TIKTOK");

  useEffect(() => {
    const id = setTimeout(() => nameRef.current?.focus?.(), 80);
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
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to create lead.");
      const leadId = json?.leadId || null;
      setStatus({ state: "success", message: "Lead created." });
      onRefresh?.();
      if (leadId) router.push(`/admin/jobs/${encodeURIComponent(leadId)}`);
      else router.push("/admin/leads");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to create lead." });
    }
  }

  const inputStyle = {
    padding: "13px 14px",
    borderRadius: 12,
    border: "1px solid var(--bd-1)",
    background: "var(--bg-2)",
    color: "#fff",
    outline: "none",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box"
  };

  const sectionLabel = {
    fontFamily: "var(--font-mono)",
    fontSize: 9,
    letterSpacing: ".18em",
    textTransform: "uppercase",
    color: "var(--fg-3)",
    marginBottom: 8
  };

  return (
    <div style={{ padding: "18px 18px 100px", display: "grid", gap: 20, maxWidth: 560, margin: "0 auto" }}>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={sectionLabel}>Client name</div>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionLabel}>Phone</div>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            placeholder="+27…"
            style={inputStyle}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionLabel}>Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={sectionLabel}>Car</div>
        <input
          value={car}
          onChange={(e) => setCar(e.target.value)}
          placeholder="e.g. BMW M2 2024"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionLabel}>Lane</div>
          <select
            value={lane}
            onChange={(e) => setLane(e.target.value)}
            style={inputStyle}
          >
            {LANES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionLabel}>Timing</div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            style={inputStyle}
          >
            {TIMEFRAMES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={sectionLabel}>Source</div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={inputStyle}
        >
          <option value="TIKTOK">TikTok</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="WEBSITE">Website</option>
          <option value="REFERRAL">Referral</option>
        </select>
      </div>

      {services.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={sectionLabel}>Services</div>
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
      )}

      <button
        className="bigbtn bigbtn--p"
        onClick={submit}
        disabled={!canSubmit || status.state === "loading"}
      >
        <span><Icon.check /> &nbsp; Create lead</span>
        <span className="arr">→</span>
      </button>

      {status.state !== "idle" && (
        <div style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: status.state === "error" ? "rgba(255,77,77,.1)" : "rgba(31,79,255,.08)",
          border: `1px solid ${status.state === "error" ? "rgba(255,77,77,.35)" : "rgba(31,79,255,.3)"}`,
          fontSize: 13,
          color: status.state === "error" ? "rgba(255,110,110,.95)" : "var(--fg-1)"
        }}>
          {status.message}
        </div>
      )}
    </div>
  );
}
