"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "MC";
}

function fmtShortDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }).toUpperCase();
  } catch {
    return "—";
  }
}

function stageLabel(status) {
  const s = String(status || "new");
  if (s === "called") return "CALLED";
  if (s === "quoted") return "QUOTED";
  if (s === "booked") return "BOOKED";
  if (s === "in_progress") return "IN BAY";
  if (s === "completed") return "DELIVERED";
  if (s === "lost") return "LOST";
  return "NEW";
}

function stageDotColor(status) {
  const s = String(status || "new");
  if (s === "in_progress") return "#F2C94C";
  if (s === "completed") return "#27AE60";
  if (s === "quoted") return "#4A78FF";
  if (s === "booked") return "#7A9BFF";
  if (s === "lost") return "#7A7A7A";
  return "#1F4FFF";
}

function moneyZAR(amount) {
  const n = typeof amount === "number" ? amount : typeof amount === "string" ? Number(amount) : NaN;
  if (!Number.isFinite(n)) return "—";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortalClient({ initialClientId, initialToken }) {
  const [email, setEmail] = useState("");
  const [loginState, setLoginState] = useState({ state: "idle", message: "" });

  // c = clientId, t = session token (long-lived, from session response)
  const [c, setC] = useState(initialClientId || "");
  const [t, setT] = useState(initialToken || "");

  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // Per-vehicle uploading state: { [vehicleId]: true }
  const [vehicleUploading, setVehicleUploading] = useState({});
  // Local photo URL overrides (optimistic update after upload)
  const [vehiclePhotos, setVehiclePhotos] = useState({});

  const [activeVehicleId, setActiveVehicleId] = useState("");
  const [sheet, setSheet] = useState(null);
  const [newVehicle, setNewVehicle] = useState({ label: "", plate: "", colour: "", year: "", make: "", model: "" });
  const [request, setRequest] = useState({
    vehicleLabel: "", services: { ppf: false, wrap: false, ceramic: false, tint: false, wheel: false, correct: false, detail: false },
    notes: "", timeframe: "no-rush"
  });
  const [clientMarkedPaid, setClientMarkedPaid] = useState(false);

  const photoInputRef = useRef(null);
  const photoTargetVehicleId = useRef("");

  function showToast(msg) {
    setToast(String(msg || ""));
    setTimeout(() => setToast(""), 2400);
  }

  function openSheet(kind) {
    setSheet(kind);
    document.body.style.overflow = "hidden";
  }

  function closeSheet() {
    setSheet(null);
    document.body.style.overflow = "";
  }

  async function loadSession({ nextC, nextT } = {}) {
    const clientId = nextC ?? c;
    const token    = nextT ?? t;
    setBusy(true);
    try {
      // If we have URL params (magic link click), pass them; otherwise rely on session cookie.
      const url = clientId && token
        ? `/api/portal/session?c=${encodeURIComponent(clientId)}&t=${encodeURIComponent(token)}`
        : `/api/portal/session`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load portal.");

      setData(json);
      setClientMarkedPaid(false);

      // Update to the long-lived session token returned by the server.
      // All subsequent vehicle/lead API calls will use this token.
      if (json.sessionToken) setT(json.sessionToken);
      if (json.clientId) setC(json.clientId);

      // Clean up magic-link params from the URL for a nicer "app" feel.
      try {
        if (window?.location?.search) window.history.replaceState({}, "", "/portal");
      } catch { /* ignore */ }

      if (!activeVehicleId) {
        const first = Array.isArray(json?.client?.vehicles) ? json.client.vehicles[0]?.id : "";
        if (first) setActiveVehicleId(String(first));
      }
    } catch (err) {
      setData(null);
      const msg = err instanceof Error ? err.message : "Failed to load portal.";
      showToast(msg);
      // If session is expired/invalid, clear creds so the login screen shows.
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("new link")) {
        setC("");
        setT("");
      }
    } finally {
      setBusy(false);
    }
  }

  // Load on mount. If URL params are present, magic-link auth fires.
  // If no URL params, session cookie auth fires (return visit).
  useEffect(() => {
    loadSession().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const client = data?.client || null;
  const leads = Array.isArray(data?.leads) ? data.leads : [];
  const linkTokenByLeadId = data?.linkTokenByLeadId || {};

  const activeLead = useMemo(() => leads[0] || null, [leads]);
  const activeExecution = useMemo(() => {
    const ex = activeLead?.execution && typeof activeLead.execution === "object" ? activeLead.execution : null;
    if (!ex) return null;
    const steps = Array.isArray(ex.steps) ? ex.steps : [];
    const total = steps.length || 0;
    const done = steps.filter((s) => String(s?.status || "") === "done").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { ...ex, steps, progress: { total, done, pct } };
  }, [activeLead?.execution]);

  const activeVehicle = useMemo(() => {
    const list = Array.isArray(client?.vehicles) ? client.vehicles : [];
    if (activeVehicleId) return list.find((v) => String(v?.id || "") === String(activeVehicleId)) || list[0] || null;
    return list[0] || null;
  }, [client?.vehicles, activeVehicleId]);

  async function sendMagicLink() {
    const e = String(email || "").trim();
    if (!e) return;
    setLoginState({ state: "sending", message: "" });
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to send link.");
      setLoginState({ state: "sent", message: `Link sent to ${e}` });
    } catch (err) {
      setLoginState({ state: "error", message: err instanceof Error ? err.message : "Failed to send link." });
    }
  }

  async function addVehicle() {
    if (!client?.id || !t) return;
    const label = String(newVehicle.label || "").trim();
    if (!label) return;
    setBusy(true);
    try {
      const res = await fetch("/api/portal/vehicles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ c: client.id, t, vehicle: { ...newVehicle, label } })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add vehicle.");
      showToast("Vehicle added");
      setNewVehicle({ label: "", plate: "", colour: "", year: "", make: "", model: "" });
      closeSheet();
      await loadSession();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add vehicle.");
    } finally {
      setBusy(false);
    }
  }

  async function requestQuote() {
    if (!client?.id || !t) return;
    const vehicleLabel = String(request.vehicleLabel || activeVehicle?.label || "").trim();
    if (!vehicleLabel) return;
    const services = Object.entries(request.services)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
    setBusy(true);
    try {
      const res = await fetch("/api/portal/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ c: client.id, t, vehicleLabel, services, notes: request.notes || "", timeframe: request.timeframe || "no-rush" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to request quote.");
      showToast("Request sent");
      setRequest((p) => ({ ...p, notes: "", services: { ...p.services } }));
      closeSheet();
      await loadSession();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to request quote.");
    } finally {
      setBusy(false);
    }
  }

  async function markPaid() {
    if (!client?.id || !t || !activeLead?.id) return;
    if (clientMarkedPaid) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/portal/leads/${encodeURIComponent(activeLead.id)}/mark-paid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ c: client.id, t })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to submit.");
      setClientMarkedPaid(true);
      showToast("Marked as paid (pending confirmation)");
      await loadSession();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setBusy(false);
    }
  }

  // ── Vehicle photo upload ───────────────────────────────────────────────

  function openPhotoPicker(vehicleId) {
    photoTargetVehicleId.current = vehicleId;
    photoInputRef.current?.click();
  }

  async function handlePhotoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !client?.id) return;

    const vehicleId = photoTargetVehicleId.current;
    if (!vehicleId) return;

    setVehicleUploading((p) => ({ ...p, [vehicleId]: true }));
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("vehicleId", vehicleId);
      if (client.id) form.append("c", client.id);
      if (t) form.append("t", t);

      const res = await fetch("/api/portal/upload", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Upload failed.");

      // Optimistic: show the new photo immediately while we reload session
      setVehiclePhotos((p) => ({ ...p, [vehicleId]: json.photoUrl }));
      showToast("Photo saved");
      // Reload to get updated vehicle data from server
      await loadSession();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setVehicleUploading((p) => ({ ...p, [vehicleId]: false }));
    }
  }

  function invoiceUrlForLead(lead) {
    const lt = linkTokenByLeadId?.[lead?.id || ""] || "";
    if (!lt) return "";
    return `/i/${encodeURIComponent(lead.id)}?t=${encodeURIComponent(lt)}`;
  }

  function bookingUrlForLead(lead) {
    const lt = linkTokenByLeadId?.[lead?.id || ""] || "";
    if (!lt) return "";
    return `/book/${encodeURIComponent(lead.id)}?t=${encodeURIComponent(lt)}`;
  }

  function vehiclePhotoUrl(v) {
    return vehiclePhotos[v?.id] || v?.photoUrl || null;
  }

  const loginVisible = !(data?.ok && client?.id);

  return (
    <div className="crm-root cp-shell" id="shell" style={{ width: "min(430px, 100%)", margin: "0 auto" }}>
      {/* Hidden file input for vehicle photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoFile}
      />

      {/* LOGIN OVERLAY */}
      {loginVisible ? (
        <div className={"cp-login " + (loginState.state === "sent" ? "sent-state" : "")} id="login">
          <div className="top">
            <div className="mark">M<span className="a">/</span>C</div>
            <div className="micro">CLIENT PORTAL</div>
          </div>
          <div className="body">
            <div className="lead">
              <span className="eyebrow">SECURE ACCESS</span>
              <h1 style={{ marginTop: 14 }}>Open <span className="a">/</span> your build.</h1>
              <p>Enter the email we have on file. We&apos;ll send you a sign-in link — no password.</p>
            </div>
            <div className="field">
              <label htmlFor="cp-email">Email address</label>
              <input
                id="cp-email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                autoComplete="email" placeholder="you@example.com"
              />
              <div className="help">If you don&apos;t see it within a minute, check spam.</div>
            </div>
            <button className="bigbtn bigbtn--p" onClick={sendMagicLink} disabled={loginState.state === "sending"}>
              <span>{loginState.state === "sending" ? "Sending…" : "Send my link"}</span>
              <span className="arr">→</span>
            </button>
            <div className="sent">
              <strong>{loginState.message || "Link sent"}</strong>
              <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
                Once you click the link, your session lasts 30 days.
              </div>
            </div>
            {loginState.state === "error" ? (
              <div style={{ fontSize: 13, color: "rgba(255,110,110,.95)", lineHeight: 1.4 }}>{loginState.message}</div>
            ) : null}
          </div>
          <div className="foot">
            <span>MATTHEWS / CLARK</span>
            <span>CAPE TOWN</span>
          </div>
        </div>
      ) : null}

      {/* TOP BAR */}
      <div className="crm-top cp-top">
        <div className="left">
          <div className="mark">M<span className="a">/</span>C</div>
        </div>
        <div className="right">
          <div className="who-mini">
            <span className="av-mini">{initials(client?.name || client?.email || "Client")}</span>
            <span>{String((client?.name || "Client").split(" ")[0] || "Client").toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* GREETING */}
      <div className="greeting">
        <div className="hi">
          <span className="dot" /> WELCOME BACK · {String((client?.name || "CLIENT").split(" ")[0] || "CLIENT").toUpperCase()}
        </div>
        <h1>Your <span className="acc">build</span>.</h1>
        <div className="sub">{busy ? "Syncing…" : "Track progress, quotes, and bookings."}</div>
      </div>

      {/* HERO */}
      {activeLead ? (
        <div className="cp-hero">
          <div className="photo">
            <span className="stage-pill">
              <span className="dot" style={{ background: stageDotColor(activeLead.status), boxShadow: `0 0 0 4px ${stageDotColor(activeLead.status)}22` }} />
              {stageLabel(activeLead.status)}
            </span>
            <span className="ref">{String(activeLead.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}</span>
            <span className="ph">[ matthews &amp; clark · cape town ]</span>
          </div>
          <div className="who">
            <div className="car">
              {String(activeLead.car || "Your vehicle").split(" ")[0] || "Vehicle"}{" "}
              <span className="a">{String(activeLead.car || "").split(" ").slice(1).join(" ")}</span>
            </div>
            <div className="meta">{client?.email ? String(client.email).toUpperCase() : "—"}</div>
          </div>
          <div className="strip">
            <div className="cell">
              <div className="lbl">CREATED</div>
              <div className="val">
                <span className="a">{fmtShortDate(activeLead.createdAt).slice(0, 2)}</span> {fmtShortDate(activeLead.createdAt).slice(3)}
              </div>
            </div>
            <div className="cell">
              <div className="lbl">INVOICE</div>
              <div className="val">{activeLead.invoiceCreatedAt ? "READY" : "—"}</div>
            </div>
            <div className="cell">
              <div className="lbl">STATUS</div>
              <div className="val">{stageLabel(activeLead.status)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="cp-update" style={{ marginTop: 12 }}>
          <p>No active jobs yet. Add a vehicle to your garage and request a quote.</p>
        </div>
      )}

      {/* IN-BAY EXECUTION */}
      {activeExecution?.steps?.length ? (
        <div className="cp-update" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--fg-3)" }}>
              In-shop progress
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--fg-2)" }}>
              {activeExecution.progress?.pct || 0}%
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${activeExecution.progress?.pct || 0}%`, background: "var(--mc-blue)" }} />
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {activeExecution.steps.slice(0, 12).map((s) => {
              const st = String(s?.status || "todo");
              const color = st === "done" ? "rgba(60,200,120,.95)" : st === "doing" ? "var(--mc-blue)" : st === "blocked" ? "rgba(255,110,110,.95)" : "rgba(255,255,255,.55)";
              const label = String(s?.label || s?.id || "Step");
              return (
                <div key={String(s?.id || label)} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <div style={{ fontSize: 13, color: "var(--fg-1)" }}>{label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color }}>{st}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--fg-3)", lineHeight: 1.45 }}>
            We&apos;ll update this as your car moves through the bay.
          </div>
        </div>
      ) : null}

      {/* PROGRESS PHOTOS */}
      {activeLead?.photos?.length > 0 ? (
        <div className="cp-section">
          <div className="cp-section-label">PROGRESS PHOTOS</div>
          <div className="cp-photo-grid">
            {activeLead.photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                <img src={p.url} alt={p.angle || p.filename || "Photo"} className="cp-photo-thumb" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* QUOTE / INVOICE ACTIONS */}
      {activeLead?.invoiceCreatedAt ? (
        <div className="cp-update" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--fg-3)" }}>Invoice</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--fg-2)" }}>
              {String(activeLead.invoiceStatus || "due").toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ color: "var(--fg-2)", fontSize: 13 }}>Total</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--mc-blue)" }}>{moneyZAR(activeLead.clientQuoteTotalExVat)}</div>
          </div>
          <div className="row">
            <div className="links">
              <a href={invoiceUrlForLead(activeLead)} target="_blank" rel="noreferrer">
                <span className="a">▸</span> DOWNLOAD PDF
              </a>
              {String(activeLead.invoiceStatus || "due") !== "paid" ? (
                <button
                  type="button"
                  onClick={markPaid}
                  disabled={busy || clientMarkedPaid || Boolean(activeLead.invoiceClientMarkedPaidAt)}
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: ".18em", color: "var(--fg-2)", textTransform: "uppercase", background: "transparent", border: 0, padding: 0 }}
                >
                  <span style={{ color: "var(--mc-blue)" }}>▸</span> MARK PAID
                </button>
              ) : null}
            </div>
            {["deposit_paid", "paid"].includes(String(activeLead.invoiceStatus || "due")) ? (
              <a href={bookingUrlForLead(activeLead)} className="links" style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: ".18em", color: "var(--mc-blue)", textTransform: "uppercase" }}>
                BOOK IN →
              </a>
            ) : null}
          </div>
          {activeLead.invoiceClientMarkedPaidAt && String(activeLead.invoiceStatus || "due") !== "paid" ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase" }}>
              Pending confirmation by Matthews &amp; Clark
            </div>
          ) : null}
        </div>
      ) : null}

      {/* GARAGE */}
      <div className="section-h" style={{ padding: "32px var(--pad) 14px" }}>
        <div className="section-title">YOUR <span className="acc">GARAGE</span></div>
        <span className="more">{Array.isArray(client?.vehicles) ? String(client.vehicles.length).padStart(2, "0") : "00"} CARS</span>
      </div>
      <div className="cp-garage">
        {(Array.isArray(client?.vehicles) ? client.vehicles : []).map((v) => {
          const on = String(v?.id || "") === String(activeVehicle?.id || "");
          const photo = vehiclePhotoUrl(v);
          const isUploading = Boolean(vehicleUploading[v.id]);
          return (
            <div
              key={v.id}
              className={"car " + (on ? "active" : "")}
              onClick={() => setActiveVehicleId(String(v.id))}
            >
              {/* Vehicle photo thumb */}
              <div
                className="thumb"
                style={photo ? { backgroundImage: `url(${photo})` } : undefined}
              >
                {/* Camera button — shows on hover */}
                <button
                  type="button"
                  className="cam-btn"
                  title="Upload hero photo"
                  onClick={(e) => { e.stopPropagation(); openPhotoPicker(String(v.id)); }}
                >
                  <span className="cam-ic">📷</span>
                </button>
                {isUploading ? (
                  <div className="uploading-ic">UPLOADING…</div>
                ) : null}
              </div>

              <div className="nm">{v.label}</div>
              <div className="det">{[v.year, v.colour, v.plate].filter(Boolean).join(" · ").toUpperCase()}</div>
              {on ? (
                <button type="button" className="bigbtn bigbtn--p" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); openSheet("request"); }}>
                  <span>Request a quote</span>
                  <span className="arr">→</span>
                </button>
              ) : null}
            </div>
          );
        })}
        <div className="add" id="add-vehicle" onClick={() => openSheet("add")}>
          <div className="plus">+</div>
          <div className="lbl">ADD A VEHICLE</div>
        </div>
      </div>

      {/* HISTORY */}
      <div className="section-h" style={{ padding: "32px var(--pad) 14px" }}>
        <div className="section-title">YOUR <span className="acc">HISTORY</span></div>
        <span className="more">{String(leads.length).padStart(2, "0")} JOBS</span>
      </div>
      <div style={{ padding: "0 var(--pad)", display: "grid", gap: 10 }}>
        {leads.length ? (
          leads.slice(0, 20).map((l) => {
            const inv = l?.invoiceCreatedAt ? invoiceUrlForLead(l) : "";
            const book = l?.booking?.proposedSlots?.length ? bookingUrlForLead(l) : "";
            return (
              <div key={l.id} className="cp-update" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: ".02em", textTransform: "uppercase" }}>{l.car || "Vehicle"}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                    {stageLabel(l.status)} · {fmtShortDate(l.createdAt)}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
                  {(Array.isArray(l.services) && l.services.length ? l.services.join(" · ") : "Service").toUpperCase()}
                </div>
                <div className="row">
                  <div className="links">
                    {inv ? (
                      <a href={inv} target="_blank" rel="noreferrer"><span className="a">▸</span> INVOICE</a>
                    ) : (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                        <span style={{ color: "var(--mc-blue)" }}>▸</span> QUOTE PENDING
                      </span>
                    )}
                    {["deposit_paid", "paid"].includes(String(l.invoiceStatus || "due")) && book ? (
                      <a href={book} target="_blank" rel="noreferrer"><span className="a">▸</span> BOOK</a>
                    ) : null}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", color: "var(--fg-2)", textTransform: "uppercase" }}>
                    {String(l.invoiceStatus || (l.invoiceCreatedAt ? "due" : "—")).toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="cp-update" style={{ margin: 0 }}>
            <p>No history yet. Add a vehicle and request your first quote.</p>
          </div>
        )}
      </div>

      {/* SHEETS */}
      {sheet ? (
        <div className={"cp-sheet open"} onClick={(e) => (e.target === e.currentTarget ? closeSheet() : null)}>
          <div className="panel">
            <div className="bar">
              <div className="ttl">{sheet === "add" ? "Add vehicle" : "Request a quote"}</div>
              <button type="button" onClick={closeSheet} aria-label="Close">✕</button>
            </div>

            {sheet === "add" ? (
              <>
                <div className="content">
                  <div className="field">
                    <label>Vehicle label</label>
                    <input value={newVehicle.label} onChange={(e) => setNewVehicle((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. BMW M3 Touring" />
                  </div>
                  <div className="row2">
                    <div className="field">
                      <label>Year</label>
                      <input value={newVehicle.year} onChange={(e) => setNewVehicle((p) => ({ ...p, year: e.target.value }))} placeholder="2024" />
                    </div>
                    <div className="field">
                      <label>Colour</label>
                      <input value={newVehicle.colour} onChange={(e) => setNewVehicle((p) => ({ ...p, colour: e.target.value }))} placeholder="Frozen grey" />
                    </div>
                  </div>
                  <div className="row2">
                    <div className="field">
                      <label>Number plate</label>
                      <input value={newVehicle.plate} onChange={(e) => setNewVehicle((p) => ({ ...p, plate: e.target.value }))} placeholder="CA 123 456" />
                    </div>
                    <div className="field">
                      <label>Make</label>
                      <input value={newVehicle.make} onChange={(e) => setNewVehicle((p) => ({ ...p, make: e.target.value }))} placeholder="BMW" />
                    </div>
                  </div>
                  <div className="field">
                    <label>Model</label>
                    <input value={newVehicle.model} onChange={(e) => setNewVehicle((p) => ({ ...p, model: e.target.value }))} placeholder="M3 Touring" />
                  </div>
                </div>
                <div className="foot">
                  <button className="bigbtn bigbtn--p" onClick={addVehicle} disabled={busy}>
                    <span>{busy ? "Saving…" : "Save vehicle"}</span>
                    <span className="arr">→</span>
                  </button>
                </div>
              </>
            ) : null}

            {sheet === "request" ? (
              <>
                <div className="content">
                  <div className="field">
                    <label>Vehicle</label>
                    <input value={request.vehicleLabel || activeVehicle?.label || ""} onChange={(e) => setRequest((p) => ({ ...p, vehicleLabel: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>Services</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      {Object.keys(request.services).map((k) => (
                        <label key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 10px", border: "1px solid var(--bd-1)", borderRadius: 12, background: "var(--bg-2)" }}>
                          <input type="checkbox" checked={request.services[k]} onChange={(e) => setRequest((p) => ({ ...p, services: { ...p.services, [k]: e.target.checked } }))} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--fg-2)" }}>{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Timing</label>
                    <select value={request.timeframe} onChange={(e) => setRequest((p) => ({ ...p, timeframe: e.target.value }))}>
                      <option value="this-week">This week</option>
                      <option value="this-month">This month</option>
                      <option value="no-rush">No rush</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Notes</label>
                    <textarea rows={4} value={request.notes} onChange={(e) => setRequest((p) => ({ ...p, notes: e.target.value }))} placeholder="Tell us what you want done (panels, colour, finish, etc.)" />
                  </div>
                </div>
                <div className="foot">
                  <button className="bigbtn bigbtn--p" onClick={requestQuote} disabled={busy}>
                    <span>{busy ? "Sending…" : "Send request"}</span>
                    <span className="arr">→</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={"cp-toast " + (toast ? "show" : "")} id="toast">▸ {toast || ""}</div>
    </div>
  );
}
