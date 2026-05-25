"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { initials, moneyZAR, shortDay } from "./utils";

function useEscape(onEscape) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onEscape?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape]);
}

function Backdrop({ onClose, children }) {
  useEscape(onClose);
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
        zIndex: 200,
        background: "rgba(0,0,0,.62)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 14
      }}
    >
      <div
        className="card"
        style={{
          width: "min(560px, calc(100vw - 28px))",
          maxHeight: "min(78vh, 720px)",
          overflow: "auto"
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function SearchOverlay({ index, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus?.(), 50);
    return () => clearTimeout(id);
  }, []);

  const results = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return { leads: [], clients: [] };

    const leads = (index?.JOBS || [])
      .map((j) => {
        const v = index?.vehicle(j.vehicleId);
        const c = index?.vehicleContact(j.vehicleId);
        const hay = `${j.ref || ""} ${c?.name || ""} ${c?.phone || ""} ${v?.label || ""} ${(Array.isArray(j.services) ? j.services.join(" ") : "")}`.toLowerCase();
        return hay.includes(query) ? { j, v, c } : null;
      })
      .filter(Boolean)
      .slice(0, 12);

    const clients = (index?.CONTACTS || [])
      .map((c) => {
        const hay = `${c?.name || ""} ${c?.phone || ""} ${c?.area || ""}`.toLowerCase();
        return hay.includes(query) ? c : null;
      })
      .filter(Boolean)
      .slice(0, 12);

    return { leads, clients };
  }, [index, q]);

  return (
    <Backdrop onClose={onClose}>
      <div style={{ padding: 14, borderBottom: "1px solid var(--bd-1)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: "1px solid var(--bd-1)", color: "var(--fg-2)" }}>
          <Icon.search />
        </div>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search leads, clients, cars, refs…"
          style={{
            flex: 1,
            border: 0,
            outline: "none",
            background: "transparent",
            color: "#fff",
            fontSize: 14
          }}
        />
        <button onClick={onClose} className="icon-btn" aria-label="Close" title="Close">
          <Icon.back />
        </button>
      </div>

      <div style={{ padding: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          LEADS
        </div>
        {results.leads.length === 0 ? (
          <div style={{ color: "var(--fg-3)", fontSize: 13, marginBottom: 14 }}>No matching leads.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {results.leads.map(({ j, v, c }) => (
              <button
                key={j.id}
                onClick={() => {
                  onClose?.();
                  router.push(`/admin/jobs/${encodeURIComponent(j.id)}`);
                }}
                className="list-row"
                style={{ gridTemplateColumns: "42px 1fr auto", textAlign: "left" }}
              >
                <div className={"av " + (c?.vip ? "vip" : "")}>{initials(c?.name || "Client")}</div>
                <div className="who">
                  <div className="name">{c?.name || "Client"}</div>
                  <div className="meta">
                    <span>{j.ref}</span>
                    <span className="sep">·</span>
                    <span>{v?.label || "Vehicle"}</span>
                  </div>
                </div>
                <div className="right">
                  <span className="amount">{Number(j.value || 0) ? moneyZAR(j.value) : ""}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="eyebrow" style={{ marginBottom: 8 }}>
          CLIENTS
        </div>
        {results.clients.length === 0 ? (
          <div style={{ color: "var(--fg-3)", fontSize: 13 }}>No matching clients.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.clients.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onClose?.();
                  router.push(`/admin/clients/${encodeURIComponent(c.id)}`);
                }}
                className="list-row"
                style={{ gridTemplateColumns: "42px 1fr auto", textAlign: "left" }}
              >
                <div className={"av " + (c.vip ? "vip" : "")}>{initials(c.name)}</div>
                <div className="who">
                  <div className="name">{c.name}</div>
                  <div className="meta">
                    <span>{c.area || "—"}</span>
                    <span className="sep">·</span>
                    <span>{c.phone || "—"}</span>
                  </div>
                </div>
                <div className="right">
                  <span className="amount">{c.joined ? `since ${c.joined}` : ""}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Backdrop>
  );
}

export function ActivityOverlay({ index, onClose }) {
  const router = useRouter();
  const items = (index?.ACTIVITY || []).slice(0, 30);

  return (
    <Backdrop onClose={onClose}>
      <div style={{ padding: 14, borderBottom: "1px solid var(--bd-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: "1px solid var(--bd-1)", color: "var(--fg-2)" }}>
            <Icon.bell />
          </div>
          <div>
            <div className="eyebrow">ACTIVITY</div>
            <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginTop: 2 }}>Latest updates</div>
          </div>
        </div>
        <button onClick={onClose} className="icon-btn" aria-label="Close" title="Close">
          <Icon.back />
        </button>
      </div>

      <div style={{ padding: 14 }}>
        {items.length === 0 ? (
          <div style={{ color: "var(--fg-3)", fontSize: 13 }}>No activity yet.</div>
        ) : (
          <div className="feed" style={{ padding: 0 }}>
            {items.map((a) => (
              <button
                key={a.id}
                className="feed-row"
                style={{ borderBottom: "1px solid var(--bd-1)", textAlign: "left", padding: 14 }}
                onClick={() => {
                  if (!a.jobId) return;
                  onClose?.();
                  router.push(`/admin/jobs/${encodeURIComponent(a.jobId)}`);
                }}
              >
                <div className="feed-ic grey">{a.type === "stage" ? <Icon.arrow /> : a.type === "lead" ? <Icon.plus /> : <Icon.edit />}</div>
                <div className="feed-meta">
                  <div className="feed-who">
                    {a.who || "Team"} · {String(a.type || "note").toUpperCase()}
                  </div>
                  <div className="feed-text">{a.text}</div>
                </div>
                <div className="feed-time">{shortDay(a.at) || ""}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Backdrop>
  );
}

