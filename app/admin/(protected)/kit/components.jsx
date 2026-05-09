"use client";

import { Icon } from "./icons";

export function StagePill({ stageId, index }) {
  const s = index?.stage(stageId);
  if (!s) return null;
  return (
    <span className="stage-pill">
      <span className="stage-dot" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function EmptyState({ title, subtitle }) {
  return (
    <div
      style={{
        padding: "40px 0",
        textAlign: "center",
        color: "var(--fg-3)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: ".14em",
        textTransform: "uppercase"
      }}
    >
      <div style={{ marginBottom: 8 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 10, letterSpacing: ".12em", color: "var(--fg-mute)" }}>{subtitle}</div> : null}
    </div>
  );
}

export function LoadingShell({ label = "Loading…" }) {
  return (
    <div className="screen" style={{ paddingTop: 28 }}>
      <div className="greeting">
        <div className="hi">
          <span className="dot" />
          {label}
        </div>
        <h1>
          CRM <span className="acc">loading.</span>
        </h1>
        <div className="sub">Fetching leads, clients, and tasks…</div>
      </div>
    </div>
  );
}

export function ErrorShell({ error, onRetry }) {
  return (
    <div className="screen" style={{ paddingTop: 28 }}>
      <div className="greeting">
        <div className="hi">
          <span className="dot" />
          ERROR
        </div>
        <h1>
          Something <span className="acc">broke.</span>
        </h1>
        <div className="sub" style={{ color: "rgba(255,110,110,.95)" }}>
          {error || "Failed to load CRM data."}
        </div>
      </div>
      <div style={{ padding: "0 18px 24px" }}>
        <button className="bigbtn bigbtn--p" onClick={onRetry}>
          <span>
            <Icon.arrow /> &nbsp; Retry
          </span>
          <span className="arr">→</span>
        </button>
      </div>
    </div>
  );
}

