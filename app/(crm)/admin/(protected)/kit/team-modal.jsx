"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "./icons";

const ROLES = [
  { id: "mc_owner", label: "M&C · Owner", accent: "#1F4FFF" },
  { id: "mc_staff", label: "M&C · Team", accent: "#1F4FFF" },
  { id: "izimoto_owner", label: "Izimoto · Owner", accent: "#9B51E0" },
  { id: "izimoto_staff", label: "Izimoto · Team", accent: "#9B51E0" }
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
        zIndex: 240,
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

export function TeamModal({ mode = "create", member, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const nameRef = useRef(null);

  const [name, setName] = useState(member?.name || "");
  const [username, setUsername] = useState(member?.username || "");
  const [role, setRole] = useState(member?.role || "mc_owner");
  const [phone, setPhone] = useState(member?.phone || "");
  const [email, setEmail] = useState(member?.email || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const accent = useMemo(() => ROLES.find((r) => r.id === role)?.accent || "#1F4FFF", [role]);

  useEffect(() => {
    const id = setTimeout(() => nameRef.current?.focus?.(), 60);
    return () => clearTimeout(id);
  }, []);

  const canSave = useMemo(() => {
    if (!String(name).trim()) return false;
    if (!String(username).trim()) return false;
    if (!/^[a-zA-Z0-9._-]+$/.test(String(username).trim())) return false;
    if (!role) return false;
    if (!isEdit && String(password).length < 6) return false;
    return true;
  }, [name, username, role, password, isEdit]);

  async function save() {
    if (!canSave) return;
    setStatus({ state: "loading", message: "Saving…" });
    try {
      const payload = {
        name: String(name).trim(),
        username: String(username).trim(),
        role,
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim() : null,
        ...(password ? { password } : {})
      };

      const res = await fetch(isEdit ? `/api/admin/team/${encodeURIComponent(member.id)}` : "/api/admin/team", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setStatus({ state: "success", message: "Saved." });
      onSaved?.(json?.member || null);
      onClose?.();
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save." });
    }
  }

  return (
    <Backdrop onClose={onClose}>
      <div style={{ padding: 14, borderBottom: "1px solid var(--bd-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${accent}55`, color: accent, background: `${accent}14` }}>
            <Icon.user />
          </div>
          <div>
            <div className="eyebrow">{isEdit ? "EDIT MEMBER" : "ADD MEMBER"}</div>
            <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginTop: 2 }}>{isEdit ? member?.name || "Team member" : "New teammate"}</div>
          </div>
        </div>
        <button onClick={onClose} className="icon-btn" aria-label="Close" title="Close">
          <Icon.back />
        </button>
      </div>

      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Name</div>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Username</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. sam"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          />
          <div style={{ color: "var(--fg-3)", fontSize: 12 }}>Used to log in. Letters/numbers/dot/underscore/dash only.</div>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">Role</div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="card" style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div className="eyebrow">Phone</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27…" className="card" style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <div className="eyebrow">Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className="card" style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }} />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="eyebrow">{isEdit ? "Reset password (optional)" : "Password"}</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder={isEdit ? "Leave blank to keep current" : "Min 6 characters"}
            className="card"
            style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }}
          />
        </label>

        <button type="button" className="bigbtn bigbtn--p" onClick={save} disabled={!canSave || status.state === "loading"} style={{ background: accent }}>
          <span>
            <Icon.check /> &nbsp; Save member
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

