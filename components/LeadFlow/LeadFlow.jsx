"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PC_EXPECT, PC_FINGERNAIL, PC_FOOTER, PC_PACKAGES, pcFmtMoney, pcPricing } from "@/app/paint-correction/pcData";

import CarPanelPicker from "./CarPanelPicker";

const SERVICES = [
  { id: "ppf", icon: "▤", label: "PPF", sub: "Clear, stealth, colour, carbon — choose coverage + panels" },
  { id: "wrap", icon: "▦", label: "Wrap", sub: "Full colour change or custom panels (roof, mirrors, bonnet…)" },
  { id: "pc_package", icon: "◍", label: "Paint correction packages", sub: "Street Gloss to Diamond — ceramic bundled where it makes sense" },
  { id: "detail", icon: "◐", label: "Detail", sub: "Interior, exterior, or full detail" },
  { id: "tint", icon: "◧", label: "Tint", sub: "Choose windows + shade" },
  { id: "wheel", icon: "◓", label: "Wheels (Powder / Refurb)", sub: "Powder coating or refurb — colour + finish" },
  { id: "kit", icon: "◈", label: "Bodykit", sub: "Through Izimoto" },
  { id: "unsure", icon: "?", label: "I'm not sure yet", sub: "We’ll help you choose the right package" }
];

const SERVICE_ORDER = ["ppf", "wrap", "tint", "pc_package", "detail", "wheel", "kit"];

const PC_PACKAGE_TO_SERVICE = {
  "stage-one": "pc_street_gloss",
  bronze: "pc_bronze",
  silver: "pc_silver",
  gold: "pc_gold",
  diamond: "pc_diamond"
};

const PC_SERVICE_TO_PACKAGE = Object.fromEntries(Object.entries(PC_PACKAGE_TO_SERVICE).map(([pkg, sid]) => [sid, pkg]));
const PC_SERVICE_IDS = new Set(Object.values(PC_PACKAGE_TO_SERVICE));

const LANES = [
  {
    id: "protect",
    title: "PROTECT IT",
    sub: "PPF, ceramic, new-car packages",
    em: "Before Cape Town gives you a reason."
  },
  {
    id: "present",
    title: "PRESENT IT",
    sub: "Detail, correction, wraps, kits, styling",
    em: "Make the pull-up worth filming."
  },
  { id: "both", title: "BOTH", sub: "I want the whole experience", em: "Welcome. You’re in the right place." }
];

const TIMES = [
  { id: "this-week", label: "THIS WEEK", sub: "Urgent. Stone chip, event, sale." },
  { id: "this-month", label: "THIS MONTH", sub: "Soon-ish. Locked in by month-end." },
  { id: "no-rush", label: "NO RUSH", sub: "Planning ahead. Tell me what’s good." }
];

const REPLIES = {
  bmw: "Nice. We see a lot of M-cars. You’re in safe hands.",
  m: "An M? Say less. Keanan will love this one.",
  porsche: "A Porsche. Say less. Sam’s already sharpening the polisher.",
  audi: "Quattro energy. We’ll treat the paint right.",
  mercedes: "A Merc. Soft paint, hard finish. We know the drill.",
  amg: "AMG. Tell us how loud you want this finish.",
  vw: "Volksie energy. Some of our favourite jobs.",
  golf: "A Golf. We’ve detailed every chassis from MK4 to MK8.",
  toyota: "Reliable choice. Let’s make it look unreliable.",
  ford: "Blue oval. Hand it over, we’ll handle the rest.",
  land: "A Defender / Disco? Cape Town will test it. Let’s armour up.",
  range: "A Range Rover. The paint deserves the works.",
  tesla: "A Tesla. Soft paint, big panels, lots of clear-coat to protect.",
  default: "We’re ready. Sam or Keanan will message you."
};

function pickReply(make) {
  if (!make) return REPLIES.default;
  const lower = make.toLowerCase();
  for (const key of Object.keys(REPLIES)) {
    if (key !== "default" && lower.includes(key)) return REPLIES[key];
  }
  return REPLIES.default;
}

function normalizePhoneForValidation(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

// Paid-traffic signals: a Google click id, a paid utm_medium, or an "ads"/"paid"
// token in source/medium. (fbclid/ttclid alone are NOT reliable — they appear on
// organic clicks too — so they don't classify a lead as paid on their own.)
function isPaidTraffic({ utmSource, utmMedium, gclid }) {
  if (gclid) return true;
  const m = String(utmMedium || "").toLowerCase();
  const s = String(utmSource || "").toLowerCase();
  if (/(^|[^a-z])(cpc|ppc|paid|paidsocial|paid[-_ ]?social|sem|display)([^a-z]|$)/.test(m)) return true;
  if (/\bads?\b/.test(s) || /\bads?\b/.test(m)) return true;
  return false;
}

function detectSourceFromUtm({ utmSource, utmMedium, referrer, gclid }) {
  if (isPaidTraffic({ utmSource, utmMedium, gclid })) return "ADS";
  const hay = `${utmSource || ""} ${utmMedium || ""} ${referrer || ""}`.toLowerCase();
  if (hay.includes("tiktok")) return "TIKTOK";
  if (hay.includes("instagram") || /\big\b/.test(hay)) return "INSTAGRAM";
  return "WEBSITE";
}

// Read a browser cookie by name (client only).
function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function StepFrame({ children, n, total, onBack, accent }) {
  return (
    <div className="lf-step" style={{ "--accent": accent || "var(--mc-blue)" }}>
      <div className="lf-chrome">
        <button className="lf-back" onClick={onBack} aria-label="Back" disabled={n === 0}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 2L4 7l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <div className="lf-progress">
          <div className="lf-progress-bar" style={{ width: `${((n + 1) / total) * 100}%` }} />
        </div>
        <div className="lf-step-num">
          {String(n + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </div>
      </div>
      <div className="lf-body">{children}</div>
    </div>
  );
}

function BigButton({ children, onClick, disabled, variant = "primary" }) {
  return (
    <button className={`lf-bigbtn lf-bigbtn--${variant}`} onClick={onClick} disabled={disabled}>
      {children}
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: "auto" }}>
        <path d="M5 10h10M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}

function StepHook({ onNext, source }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => setPhase(3), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);
  return (
    <div className="lf-hook">
      <div className="lf-hook-bg" />
      <div className="lf-hook-grain" />
      <div className="lf-hook-content">
        <div className={`lf-hook-eyebrow ${phase >= 1 ? "in" : ""}`}>
          <span className="lf-dot" />
          YOU FOUND US ON{" "}
          <span className="lf-hook-source">{source}</span>
        </div>
        <div className="lf-hook-title">
          <div className={`lf-hook-line ${phase >= 1 ? "in" : ""}`}>SO.</div>
          <div className={`lf-hook-line ${phase >= 2 ? "in" : ""}`}>WHAT</div>
          <div className={`lf-hook-line ${phase >= 2 ? "in" : ""}`}>ARE WE</div>
          <div className={`lf-hook-line lf-hook-acc ${phase >= 3 ? "in" : ""}`}>DOING.</div>
        </div>
        <div className={`lf-hook-sub ${phase >= 3 ? "in" : ""}`}>
          Premium detailing, PPF &amp; styling — Matthews &amp; Clark replies personally.
        </div>
      </div>
      <div className={`lf-hook-cta ${phase >= 3 ? "in" : ""}`}>
        <BigButton onClick={onNext}>LET&apos;S GO</BigButton>
        <div className="lf-hook-time">~ 90 SECONDS</div>
      </div>
    </div>
  );
}

function StepName({ value, onChange, onNext }) {
  const ref = useRef(null);
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 400);
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">QUESTION 01</div>
        <h2 className="lf-q-title">
          First — what should we <span className="lf-acc">call you?</span>
        </h2>
      </div>
      <input
        ref={ref}
        className="lf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="First name will do"
        autoComplete="given-name"
      />
      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!value.trim()}>
          {value.trim() ? `NICE TO MEET YOU, ${value.split(" ")[0].toUpperCase()}` : "NEXT"}
        </BigButton>
      </div>
    </>
  );
}

function StepSurname({ value, onChange, onNext }) {
  const ref = useRef(null);
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 200);
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">QUESTION 02</div>
        <h2 className="lf-q-title">
          And your <span className="lf-acc">surname?</span>
        </h2>
        <div className="lf-q-helper">So we can keep your portal + invoices tidy.</div>
      </div>
      <input
        ref={ref}
        className="lf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Surname"
        autoComplete="family-name"
      />
      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!value.trim()}>
          SAVED
        </BigButton>
      </div>
    </>
  );
}

function StepNumber({ value, onChange, onNext, name }) {
  const ref = useRef(null);
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 200);
    return () => clearTimeout(id);
  }, []);
  const phoneNorm = normalizePhoneForValidation(value);
  const valid = phoneNorm.length >= 9 && phoneNorm.length <= 15;
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">QUESTION 03</div>
        <h2 className="lf-q-title">
          Cool {name || "champ"}. <br />
          What&apos;s your <span className="lf-acc">mobile number?</span>
        </h2>
        <div className="lf-q-helper">Any format works (spaces, +27, brackets). We&apos;ll call you directly.</div>
      </div>
      <input
        ref={ref}
        className="lf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="+27 (82) 000 0000"
        type="tel"
        autoComplete="tel"
      />
      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!valid}>
          SAVED
        </BigButton>
      </div>
    </>
  );
}

function StepEmail({ value, onChange, onNext, name, phone, onClientDetected }) {
  const ref = useRef(null);
  const [lookup, setLookup] = useState({ status: "idle", client: null, asked: false, error: null });
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 200);
    return () => clearTimeout(id);
  }, []);
  const v = String(value || "").trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  useEffect(() => {
    setLookup((s) => (s.asked || s.client ? { status: "idle", client: null, asked: false, error: null } : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  const confirm = (isYou) => {
    setLookup((s) => ({ ...s, status: "idle", asked: true }));
    if (isYou && lookup.client) onClientDetected?.(lookup.client);
    onNext();
  };

  const handleNext = async () => {
    if (!valid) return;
    if (lookup.asked) return onNext();
    setLookup((s) => ({ ...s, status: "loading", error: null }));
    try {
      const url = `/api/lead/lookup?email=${encodeURIComponent(v)}&phone=${encodeURIComponent(phone || "")}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.exists && json?.client) {
        setLookup({ status: "prompt", client: json.client, asked: false, error: null });
        return;
      }
      setLookup({ status: "idle", client: null, asked: true, error: null });
      onNext();
    } catch (e) {
      setLookup({ status: "idle", client: null, asked: true, error: e instanceof Error ? e.message : "Lookup failed" });
      onNext();
    }
  };

  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">QUESTION 04</div>
        <h2 className="lf-q-title">
          {name ? `Perfect, ${name.split(" ")[0]}.` : "Perfect."} <br />
          What&apos;s your <span className="lf-acc">email?</span>
        </h2>
        <div className="lf-q-helper">We&apos;ll use this later for your client portal login. No spam.</div>
      </div>
      <input
        ref={ref}
        className="lf-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        inputMode="email"
      />
      {lookup.status === "prompt" ? (
        <div className="lf-modal" role="dialog" aria-modal="true">
          <div className="lf-modal-card">
            <div className="lf-modal-title">We found an existing account</div>
            <div className="lf-modal-sub">
              Is this you: <span className="lf-acc">{lookup.client?.name || "Client"}</span>?
            </div>
            <div className="lf-modal-actions">
              <button className="lf-modal-btn" type="button" onClick={() => confirm(false)}>
                Not me
              </button>
              <button className="lf-modal-btn lf-modal-btn--p" type="button" onClick={() => confirm(true)}>
                Yes, that&apos;s me
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="lf-q-foot">
        <BigButton onClick={handleNext} disabled={!valid || lookup.status === "loading"}>
          {lookup.status === "loading" ? "CHECKING…" : "SAVED"}
        </BigButton>
      </div>
    </>
  );
}

function StepCar({ value, onChange, onNext, garage }) {
  const ref = useRef(null);
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 200);
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">QUESTION 05</div>
        <h2 className="lf-q-title">
          Now <span className="lf-acc">the car.</span>
        </h2>
        <div className="lf-q-helper">Make, model, year. Be specific — it changes the plan.</div>
      </div>
      <input
        ref={ref}
        className="lf-input lf-input--big"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. BMW M2 2024"
      />
      <div className="lf-suggest">
        {["BMW M2", "Porsche 911", "Golf R", "AMG C63", "Defender"].map((s) => (
          <button key={s} className="lf-chip" onClick={() => onChange(s + " ")}>
            {s}
          </button>
        ))}
      </div>
      {Array.isArray(garage) && garage.length ? (
        <>
          <div className="lf-minihead">YOUR GARAGE</div>
          <div className="lf-suggest">
            {garage.slice(0, 10).map((v) => (
              <button key={v.id || v.label} className="lf-chip" onClick={() => onChange(String(v.label || "").trim())}>
                {v.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={value.trim().length < 3}>
          OK, FILED
        </BigButton>
      </div>
    </>
  );
}

function StepLane({ value, onChange, onNext }) {
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">QUESTION 06</div>
        <h2 className="lf-q-title">
          Which <span className="lf-acc">lane?</span>
        </h2>
        <div className="lf-q-helper">Pick the one that fits. We&apos;ll figure out the rest.</div>
      </div>
      <div className="lf-lanes">
        {LANES.map((lane) => (
          <button
            key={lane.id}
            className={`lf-lane ${value === lane.id ? "on" : ""}`}
            onClick={() => {
              onChange(lane.id);
              setTimeout(onNext, 280);
            }}
          >
            <div className="lf-lane-num">{lane.id === "protect" ? "01" : lane.id === "present" ? "02" : "01+02"}</div>
            <div className="lf-lane-title">{lane.title}</div>
            <div className="lf-lane-sub">{lane.sub}</div>
            <div className="lf-lane-em">&quot;{lane.em}&quot;</div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepServices({ value, onChange, onNext }) {
  const toggle = (id) => {
    if (id === "unsure") {
      onChange(["unsure"]);
      return;
    }
    const withoutUnsure = value.filter((v) => v !== "unsure");
    onChange(withoutUnsure.includes(id) ? withoutUnsure.filter((v) => v !== id) : [...withoutUnsure, id]);
  };

  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">QUESTION 07</div>
        <h2 className="lf-q-title">
          What do you want <span className="lf-acc">done?</span>
        </h2>
        <div className="lf-q-helper">Choose all that apply — then we&apos;ll ask quick follow-ups to get it exact.</div>
      </div>
      <div className="lf-services">
        {SERVICES.map((s) => (
          <button key={s.id} className={`lf-svc ${value.includes(s.id) ? "on" : ""}`} onClick={() => toggle(s.id)}>
            <span className="lf-svc-icon">{s.icon}</span>
            <span className="lf-svc-text">
              <span className="lf-svc-label">{s.label}</span>
              <span className="lf-svc-sub">{s.sub}</span>
            </span>
            <span className="lf-svc-check">{value.includes(s.id) ? "✓" : ""}</span>
          </button>
        ))}
      </div>
      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={value.length === 0}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function ToggleRow({ label, sub, value, onChange }) {
  return (
    <button type="button" className="lf-toggle" onClick={() => onChange?.(!value)}>
      <div className="lf-toggle-l">
        <div className="lf-toggle-k">{label}</div>
        {sub ? <div className="lf-toggle-s">{sub}</div> : null}
      </div>
      <div className={`lf-switch ${value ? "on" : ""}`} aria-hidden="true" />
    </button>
  );
}

function StepPpfDetails({ value, onChange, onNext }) {
  const v = value || {};
  const coverage = v.coverage || "";
  const film = v.film || "";
  const panels = Array.isArray(v.panels) ? v.panels : [];
  const needsPanels = coverage === "custom";
  const ok = Boolean(coverage) && Boolean(film) && (!needsPanels || panels.length > 0);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">PPF</div>
        <h2 className="lf-q-title">
          PPF <span className="lf-acc">details.</span>
        </h2>
        <div className="lf-q-helper">Pick coverage + film type. If it&apos;s custom, tap the panels.</div>
      </div>

      <div className="lf-optgrid">
        {[
          { id: "full-front", title: "Full front", sub: "Bonnet, bumper, fenders, mirrors" },
          { id: "track-pack", title: "Track pack", sub: "Front + skirts / high impact" },
          { id: "full", title: "Full car", sub: "Every painted panel" },
          { id: "custom", title: "Custom panels", sub: "Choose exactly what to cover" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-opt ${coverage === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, coverage: o.id })}>
            <div className="lf-opt-title">{o.title}</div>
            <div className="lf-opt-sub">{o.sub}</div>
          </button>
        ))}
      </div>

      <div className="lf-q-helper" style={{ marginTop: 6 }}>
        Film type
      </div>
      <div className="lf-pills">
        {[
          { id: "clear", label: "Clear" },
          { id: "stealth", label: "Stealth (matte)" },
          { id: "colour", label: "Colour PPF" },
          { id: "carbon", label: "Carbon / forged look" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-pill ${film === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, film: o.id })}>
            {o.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        <ToggleRow
          label="Entry and Touch Points"
          sub="Include entry and touch points (adds time + cost)"
          value={Boolean(v.doorJambs)}
          onChange={(doorJambs) => onChange?.({ ...v, doorJambs })}
        />
      </div>

      {needsPanels ? (
        <div style={{ marginTop: 6 }}>
          <CarPanelPicker
            value={panels}
            onChange={(nextPanels) => onChange?.({ ...v, panels: nextPanels })}
            hint="Tap panels on the car (or use the list) to select custom PPF coverage."
          />
        </div>
      ) : null}

      <textarea
        className="lf-textarea"
        placeholder="Anything else? (stone chips, track use, matte paint, delivery deadline…) Optional."
        value={v.notes || ""}
        onChange={(e) => onChange?.({ ...v, notes: e.target.value })}
      />

      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!ok}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function StepWrapDetails({ value, onChange, onNext }) {
  const v = value || {};
  const scope = v.scope || "";
  const finish = v.finish || "";
  const panels = Array.isArray(v.panels) ? v.panels : [];
  const parts = Array.isArray(v.parts) ? v.parts : [];
  const needsPanels = scope === "custom";
  const ok =
    Boolean(scope) &&
    (scope !== "full" || Boolean(finish)) &&
    (scope === "full" ? true : scope === "partial" ? parts.length > 0 : panels.length > 0);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">WRAP</div>
        <h2 className="lf-q-title">
          Wrap <span className="lf-acc">details.</span>
        </h2>
        <div className="lf-q-helper">Full colour-change, or pick the exact panels.</div>
      </div>

      <div className="lf-optgrid">
        {[
          { id: "full", title: "Full wrap", sub: "Colour change — full exterior" },
          { id: "partial", title: "Partial / accents", sub: "Roof, mirrors, bonnet, chrome delete…" },
          { id: "custom", title: "Custom panels", sub: "Choose panels exactly" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-opt ${scope === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, scope: o.id })}>
            <div className="lf-opt-title">{o.title}</div>
            <div className="lf-opt-sub">{o.sub}</div>
          </button>
        ))}
      </div>

      {scope === "full" ? (
        <>
          <div className="lf-q-helper" style={{ marginTop: 6 }}>
            Finish
          </div>
          <div className="lf-pills">
            {[
              { id: "gloss", label: "Gloss" },
              { id: "satin", label: "Satin" },
              { id: "matte", label: "Matte" }
            ].map((o) => (
              <button key={o.id} type="button" className={`lf-pill ${finish === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, finish: o.id })}>
                {o.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <ToggleRow
              label="Door jambs"
              sub="Include door jambs (true full wrap)"
              value={Boolean(v.doorJambs)}
              onChange={(doorJambs) => onChange?.({ ...v, doorJambs })}
            />
          </div>
        </>
      ) : null}

      {scope === "partial" ? (
        <div className="lf-pills" style={{ marginTop: 8 }}>
          {[
            { id: "roof", label: "Roof" },
            { id: "mirrors", label: "Mirrors" },
            { id: "hood", label: "Bonnet / hood" },
            { id: "trunk", label: "Boot / trunk" },
            { id: "rear-wing", label: "Rear wing / spoiler" }
          ].map((x) => (
            <button
              key={x.id}
              type="button"
              className={`lf-pill ${(Array.isArray(v.parts) ? v.parts : []).includes(x.id) ? "on" : ""}`}
              onClick={() => {
                const parts = new Set(Array.isArray(v.parts) ? v.parts : []);
                if (parts.has(x.id)) parts.delete(x.id);
                else parts.add(x.id);
                onChange?.({ ...v, parts: Array.from(parts), scope: "partial" });
              }}
            >
              {x.label}
            </button>
          ))}
        </div>
      ) : null}

      {scope === "custom" ? (
        <div style={{ marginTop: 6 }}>
          <CarPanelPicker value={panels} onChange={(nextPanels) => onChange?.({ ...v, panels: nextPanels })} hint="Tap panels to wrap." />
        </div>
      ) : null}

      <input
        className="lf-input"
        value={v.colour || ""}
        onChange={(e) => onChange?.({ ...v, colour: e.target.value })}
        placeholder="Target colour / style (e.g. Nardo Grey, Satin black) — optional"
      />

      <textarea
        className="lf-textarea"
        placeholder="Notes (chrome delete, stripes, deadline…) Optional."
        value={v.notes || ""}
        onChange={(e) => onChange?.({ ...v, notes: e.target.value })}
      />

      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!ok}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function StepTintDetails({ value, onChange, onNext }) {
  const v = value || {};
  const windows = v.windows || "";
  const shade = v.shade || "";
  const ok = Boolean(windows) && Boolean(shade);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">TINT</div>
        <h2 className="lf-q-title">
          Tint <span className="lf-acc">details.</span>
        </h2>
        <div className="lf-q-helper">Pick windows + shade. We&apos;ll confirm legality / preferences on call.</div>
      </div>

      <div className="lf-optgrid">
        {[
          { id: "front-2", title: "Front 2 windows", sub: "Just driver + passenger windows" },
          { id: "rear-3", title: "Rear set", sub: "Rear doors + rear screen (if applicable)" },
          { id: "all", title: "All windows", sub: "Full car tint package" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-opt ${windows === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, windows: o.id })}>
            <div className="lf-opt-title">{o.title}</div>
            <div className="lf-opt-sub">{o.sub}</div>
          </button>
        ))}
      </div>

      <div className="lf-q-helper" style={{ marginTop: 6 }}>
        Shade
      </div>
      <div className="lf-pills">
        {[
          { id: "35", label: "35%" },
          { id: "20", label: "20%" },
          { id: "5", label: "5% (limo)" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-pill ${shade === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, shade: o.id })}>
            {o.label}
          </button>
        ))}
      </div>

      <textarea
        className="lf-textarea"
        placeholder="Notes (heat rejection, privacy, front strip…) Optional."
        value={v.notes || ""}
        onChange={(e) => onChange?.({ ...v, notes: e.target.value })}
      />

      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!ok}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function StepCeramicDetails({ value, onChange, onNext }) {
  const v = value || {};
  const packageId = v.package || "";
  const ok = Boolean(packageId);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">CERAMIC</div>
        <h2 className="lf-q-title">
          Coating <span className="lf-acc">details.</span>
        </h2>
        <div className="lf-q-helper">Choose durability + add-ons.</div>
      </div>

      <div className="lf-optgrid">
        {[
          { id: "2y", title: "2 Year", sub: "Entry coating package" },
          { id: "5y", title: "5 Year", sub: "Daily driver sweet spot" },
          { id: "10y", title: "10 Year", sub: "Maximum durability" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-opt ${packageId === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, package: o.id })}>
            <div className="lf-opt-title">{o.title}</div>
            <div className="lf-opt-sub">{o.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        <ToggleRow label="Wheels" sub="Coat wheel faces / barrels (if required)" value={Boolean(v.wheels)} onChange={(wheels) => onChange?.({ ...v, wheels })} />
        <ToggleRow label="Glass" sub="Hydrophobic glass coating" value={Boolean(v.glass)} onChange={(glass) => onChange?.({ ...v, glass })} />
        <ToggleRow label="Trim" sub="Plastic trim restoration / coating" value={Boolean(v.trim)} onChange={(trim) => onChange?.({ ...v, trim })} />
      </div>

      <textarea
        className="lf-textarea"
        placeholder="Notes (single-stage paint, matte paint, new car delivery date…) Optional."
        value={v.notes || ""}
        onChange={(e) => onChange?.({ ...v, notes: e.target.value })}
      />

      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!ok}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function StepCorrectionDetails({ value, onChange, onNext }) {
  const v = value || {};
  const stage = v.stage || "";
  const ok = Boolean(stage);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">CORRECTION</div>
        <h2 className="lf-q-title">
          Correction <span className="lf-acc">details.</span>
        </h2>
        <div className="lf-q-helper">Choose the level — we&apos;ll confirm after inspection.</div>
      </div>
      <div className="lf-optgrid">
        {[
          { id: "stage1", title: "Stage 1", sub: "Gloss + light defect removal" },
          { id: "stage2", title: "Stage 2", sub: "Heavier swirls / deeper correction" },
          { id: "stage3", title: "Stage 3", sub: "Maximum correction (time intensive)" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-opt ${stage === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, stage: o.id })}>
            <div className="lf-opt-title">{o.title}</div>
            <div className="lf-opt-sub">{o.sub}</div>
          </button>
        ))}
      </div>
      <textarea className="lf-textarea" placeholder="Notes (scratches, respray, show-car prep…) Optional." value={v.notes || ""} onChange={(e) => onChange?.({ ...v, notes: e.target.value })} />
      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!ok}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function pcProtectionLabel(pkg, ceramicOn) {
  if (ceramicOn && pkg.ceramic) return pkg.ceramic.label;
  if (pkg.protection === "ceramic-3yr") return "3-year ceramic included";
  if (pkg.protection === "ceramic-5yr") return "5-year ceramic included";
  if (pkg.protection === "wax") return "Wax sealant";
  return "No protection";
}

function normalizePcPackageDetail(pkg, current = {}) {
  const ceramicIncluded = pkg.protection === "ceramic-3yr" || pkg.protection === "ceramic-5yr";
  const ceramicOn = pkg.ceramic ? Boolean(current.ceramic) : ceramicIncluded;
  const pricing = pcPricing(pkg, ceramicOn);
  return {
    ...current,
    packageId: pkg.id,
    serviceId: PC_PACKAGE_TO_SERVICE[pkg.id],
    packageName: pkg.name,
    packagePrice: pricing.price,
    durationDays: pricing.durationDays,
    ceramic: ceramicOn,
    ceramicIncluded,
    protection: pcProtectionLabel(pkg, ceramicOn)
  };
}

function CompactPcExpectations({ pkg, ceramicOn }) {
  const xp = PC_EXPECT[pkg.id];
  if (!xp) return null;
  let includes = [...pkg.chips];
  if (ceramicOn && pkg.ceramic) {
    includes = includes.filter((c) => !/wax/i.test(c));
    includes.push(pkg.ceramic.label);
  }
  return (
    <div className="lf-pc-xp" style={{ "--pc-metal": pkg.metal }}>
      <div className="lf-pc-xp-head">
        <div>
          <div className="lf-pc-xp-k">EXPECTATIONS</div>
          <div className="lf-pc-xp-title">{pkg.name}{ceramicOn ? " + CERAMIC" : ""}</div>
        </div>
        <div className="lf-pc-xp-score">
          <span>REMOVES UP TO</span>
          <b>{xp.label}</b>
        </div>
      </div>
      <div className="lf-pc-meter">
        <div className="lf-pc-meter-fill" style={{ width: `${xp.pct}%` }} />
      </div>
      <div className="lf-pc-xp-of">{xp.of} — final reading confirmed after inspection.</div>
      <div className="lf-pc-xp-card">
        <b>Sunlight test</b>
        <span>{xp.sunlight}</span>
      </div>
      <div className="lf-pc-xp-card">
        <b>Fingernail rule</b>
        <span>{PC_FINGERNAIL}</span>
      </div>
      <div className="lf-pc-includes">
        {includes.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="lf-pc-xp-note">{xp.notThis}</div>
    </div>
  );
}

function StepPaintCorrectionPackageDetails({ value, onChange, onNext }) {
  const v = value || {};
  const selectedPkg = PC_PACKAGES.find((p) => p.id === v.packageId) || null;
  const selectedDetail = selectedPkg ? normalizePcPackageDetail(selectedPkg, v) : v;
  const ceramicOn = selectedPkg ? Boolean(selectedDetail.ceramic) : false;

  const selectPackage = (pkg) => {
    onChange?.(normalizePcPackageDetail(pkg, { notes: v.notes || "" }));
  };

  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">CORRECTION + CERAMIC</div>
        <h2 className="lf-q-title">
          Choose the <span className="lf-acc">package.</span>
        </h2>
        <div className="lf-q-helper">Correction and protection are scoped together, using the new Matthews & Clark package tiers.</div>
      </div>

      <div className="lf-pc-packages">
        {PC_PACKAGES.map((pkg) => {
          const detail = normalizePcPackageDetail(pkg, pkg.id === selectedPkg?.id ? selectedDetail : {});
          const on = selectedPkg?.id === pkg.id;
          return (
            <button
              key={pkg.id}
              type="button"
              className={`lf-pc-package ${on ? "on" : ""}`}
              style={{ "--pc-metal": pkg.metal }}
              onClick={() => selectPackage(pkg)}
            >
              <span className="lf-pc-package-top">
                <span className="lf-pc-package-name">{pkg.name}</span>
                <span className="lf-pc-package-price">{pcFmtMoney(detail.packagePrice || pkg.price)}</span>
              </span>
              <span className="lf-pc-package-sub">{pkg.tagline}</span>
              <span className="lf-pc-package-meta">{pkg.days} {pkg.days === 1 ? "day" : "days"} · {pcProtectionLabel(pkg, detail.ceramic)}</span>
            </button>
          );
        })}
      </div>

      {selectedPkg?.ceramic ? (
        <ToggleRow
          label="Add 18-month ceramic"
          sub={`${selectedPkg.ceramic.label} · ${pcFmtMoney(selectedPkg.ceramic.addCollection)} upgrade`}
          value={ceramicOn}
          onChange={(ceramic) => onChange?.(normalizePcPackageDetail(selectedPkg, { ...selectedDetail, ceramic }))}
        />
      ) : null}

      {selectedPkg ? <CompactPcExpectations pkg={selectedPkg} ceramicOn={ceramicOn} /> : null}

      <textarea
        className="lf-textarea"
        placeholder="Notes (deep scratches, tree sap, respray, show-car prep…) Optional."
        value={v.notes || ""}
        onChange={(e) => onChange?.(selectedPkg ? normalizePcPackageDetail(selectedPkg, { ...selectedDetail, notes: e.target.value }) : { ...v, notes: e.target.value })}
      />
      <div className="lf-pc-footnote">{PC_FOOTER}</div>

      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!selectedPkg}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function StepDetailDetails({ value, onChange, onNext }) {
  const v = value || {};
  const kind = v.kind || "";
  const ok = Boolean(kind);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">DETAIL</div>
        <h2 className="lf-q-title">
          Detail <span className="lf-acc">details.</span>
        </h2>
        <div className="lf-q-helper">Pick what you want us to do — we&apos;ll tailor it.</div>
      </div>
      <div className="lf-optgrid">
        {[
          { id: "full", title: "Full detail", sub: "Interior + exterior" },
          { id: "interior", title: "Interior only", sub: "Deep clean, seats, carpets" },
          { id: "exterior", title: "Exterior only", sub: "Wash, decon, protection" },
          { id: "sale", title: "Sale prep", sub: "Quick turnaround for listings / handover" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-opt ${kind === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, kind: o.id })}>
            <div className="lf-opt-title">{o.title}</div>
            <div className="lf-opt-sub">{o.sub}</div>
          </button>
        ))}
      </div>
      <textarea className="lf-textarea" placeholder="Notes (pet hair, smoke, sand, off-road…) Optional." value={v.notes || ""} onChange={(e) => onChange?.({ ...v, notes: e.target.value })} />
      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!ok}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function StepWheelDetails({ value, onChange, onNext }) {
  const v = value || {};
  const service = v.service || "";
  const finish = v.finish || "";
  const ok = Boolean(service) && Boolean(finish);
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">WHEELS</div>
        <h2 className="lf-q-title">
          Wheels <span className="lf-acc">details.</span>
        </h2>
        <div className="lf-q-helper">Powder coating or refurb — colour + finish.</div>
      </div>
      <div className="lf-optgrid">
        {[
          { id: "powder", title: "Powder coating", sub: "Colour change / restore wheel finish" },
          { id: "refurb", title: "Refurb / repair", sub: "Curb rash, bends, repairs" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-opt ${service === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, service: o.id })}>
            <div className="lf-opt-title">{o.title}</div>
            <div className="lf-opt-sub">{o.sub}</div>
          </button>
        ))}
      </div>

      <div className="lf-q-helper" style={{ marginTop: 6 }}>
        Finish
      </div>
      <div className="lf-pills">
        {[
          { id: "gloss", label: "Gloss" },
          { id: "satin", label: "Satin" },
          { id: "matte", label: "Matte" }
        ].map((o) => (
          <button key={o.id} type="button" className={`lf-pill ${finish === o.id ? "on" : ""}`} onClick={() => onChange?.({ ...v, finish: o.id })}>
            {o.label}
          </button>
        ))}
      </div>

      <input className="lf-input" value={v.colour || ""} onChange={(e) => onChange?.({ ...v, colour: e.target.value })} placeholder="Wheel colour (e.g. Satin black, Silver, Bronze) — optional" />
      <textarea className="lf-textarea" placeholder="Notes (wheel size, diamond cut, deadline…) Optional." value={v.notes || ""} onChange={(e) => onChange?.({ ...v, notes: e.target.value })} />

      <div className="lf-q-foot">
        <BigButton onClick={onNext} disabled={!ok}>
          NEXT
        </BigButton>
      </div>
    </>
  );
}

function StepTime({ value, onChange, onSubmit }) {
  return (
    <>
      <div className="lf-q">
        <div className="lf-q-eyebrow">FINAL</div>
        <h2 className="lf-q-title">
          How <span className="lf-acc">soon?</span>
        </h2>
      </div>
      <div className="lf-times">
        {TIMES.map((t) => (
          <button
            key={t.id}
            className={`lf-time ${value === t.id ? "on" : ""}`}
            onClick={() => {
              onChange(t.id);
              setTimeout(() => onSubmit(t.id), 280);
            }}
          >
            <div className="lf-time-label">{t.label}</div>
            <div className="lf-time-sub">{t.sub}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function StepSubmit({ status, error, onRetry, onBack, onDone }) {
  const [phase, setPhase] = useState(0);
  const lines = ["PINGING THE STUDIO…", "LOGGING YOUR JOB…", "NOTIFYING THE TEAM…", "BUILDING YOUR JOB TICKET…"];
  const maxPhase = lines.length;

  useEffect(() => {
    if (status !== "loading") return;
    setPhase(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setPhase(Math.min(i, maxPhase));
      if (i >= maxPhase) clearInterval(id);
    }, 650);
    return () => clearInterval(id);
  }, [status, maxPhase]);

  useEffect(() => {
    if (status !== "success") return;
    setPhase(maxPhase);
    const id = setTimeout(onDone, 500);
    return () => clearTimeout(id);
  }, [status, maxPhase, onDone]);

  if (status === "error") {
    return (
      <div className="lf-load">
        <div className="lf-load-mark">
          M<span className="lf-acc">/</span>C
        </div>
        <div className="lf-load-list">
          <div className="lf-load-line on">
            <span className="lf-load-dot" />
            <span>COULDN&apos;T SUBMIT</span>
            <span className="lf-load-tick" />
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.4 }}>
            {error || "Please try again."}
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
          <BigButton onClick={onRetry}>RETRY</BigButton>
          <BigButton onClick={onBack} variant="ghost">
            GO BACK
          </BigButton>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-load">
      <div className="lf-load-mark">
        M<span className="lf-acc">/</span>C
      </div>
      <div className="lf-load-list">
        {lines.map((l, i) => {
          const visualPhase =
            status === "success" ? maxPhase : status === "loading" ? Math.min(phase, maxPhase - 1) : phase;
          const done = i < visualPhase;
          const on = status === "loading" ? i === visualPhase : false;
          return (
            <div key={i} className={`lf-load-line ${done ? "done" : on ? "on" : ""}`}>
              <span className="lf-load-dot" />
              <span>{l}</span>
              <span className="lf-load-tick">{done ? "✓" : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepTicket({ data, onShare, onRestart }) {
  const ticketNum = `MC-${Math.floor(Math.random() * 9000) + 1000}`;
  const reply = pickReply(data.car);
  const services =
    data.services
      .map((id) => serviceLabelForTicket(id, data.serviceDetails))
      .filter(Boolean)
      .join(" · ") || "—";
  const lane = LANES.find((l) => l.id === data.lane);
  const time = TIMES.find((t) => t.id === data.timeframe);
  const [eta, setEta] = useState({ h: 1, m: 47, s: 22 });

  useEffect(() => {
    const id = setInterval(() => {
      setEta(({ h, m, s }) => {
        s -= 1;
        if (s < 0) {
          s = 59;
          m -= 1;
        }
        if (m < 0) {
          m = 59;
          h -= 1;
        }
        if (h < 0) return { h: 0, m: 0, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="lf-ticket-wrap">
      <div className="lf-ticket-eyebrow">
        <span className="lf-dot" />
        JOB TICKET · {ticketNum}
      </div>

      <h2 className="lf-ticket-title">
        OK <span className="lf-acc">{data.name?.split(" ")[0]?.toUpperCase()}.</span>
        <br />
        WE&apos;VE GOT IT.
      </h2>

      <div className="lf-ticket-reply">{reply}</div>

      <div className="lf-ticket">
        <div className="lf-ticket-perf" />
        <div className="lf-ticket-row">
          <span className="lf-ticket-k">CLIENT</span>
          <span className="lf-ticket-v">{data.name || "—"}</span>
        </div>
        <div className="lf-ticket-row">
          <span className="lf-ticket-k">CAR</span>
          <span className="lf-ticket-v">{data.car || "—"}</span>
        </div>
        <div className="lf-ticket-row">
          <span className="lf-ticket-k">LANE</span>
          <span className="lf-ticket-v">{lane?.title}</span>
        </div>
        <div className="lf-ticket-row">
          <span className="lf-ticket-k">SERVICES</span>
          <span className="lf-ticket-v">{services}</span>
        </div>
        <div className="lf-ticket-row">
          <span className="lf-ticket-k">TIMING</span>
          <span className="lf-ticket-v">{time?.label}</span>
        </div>
        <div className="lf-ticket-row">
          <span className="lf-ticket-k">PHONE</span>
          <span className="lf-ticket-v">{data.number || "—"}</span>
        </div>
        <div className="lf-ticket-row">
          <span className="lf-ticket-k">EMAIL</span>
          <span className="lf-ticket-v">{data.email || "—"}</span>
        </div>
        <div className="lf-ticket-perf lf-ticket-perf--bottom" />
      </div>

      <div className="lf-eta">
        <div className="lf-eta-label">WE&apos;LL CALL YOU IN</div>
        <div className="lf-eta-clock">
          <span>{String(eta.h).padStart(2, "0")}</span>
          <span className="lf-eta-sep">:</span>
          <span>{String(eta.m).padStart(2, "0")}</span>
          <span className="lf-eta-sep">:</span>
          <span className="lf-eta-tick">{String(eta.s).padStart(2, "0")}</span>
        </div>
        <div className="lf-eta-foot">— OR SOONER. WE&apos;RE LITERALLY IN THE BAY.</div>
      </div>

      <div className="lf-ticket-cta">
        <button className="lf-bigbtn lf-bigbtn--primary" onClick={onShare}>
          POST IT ON YOUR STORY
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: "auto" }}>
            <path
              d="M10 3v9m0 0l-4-4m4 4l4-4M4 14v2a1 1 0 001 1h10a1 1 0 001-1v-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        <button className="lf-bigbtn lf-bigbtn--ghost" onClick={onRestart}>
          START OVER
        </button>
      </div>

      <div className="lf-ticket-foot">14 ALBERT RD, WOODSTOCK · 33.9°S 18.4°E</div>
    </div>
  );
}

function ShareCard({ data, onClose }) {
  return (
    <div className="lf-share">
      <div className="lf-share-card">
        <div className="lf-share-bg" />
        <div className="lf-share-grain" />
        <div className="lf-share-eyebrow">
          <span className="lf-dot" />
          I JUST BOOKED WITH
        </div>
        <div className="lf-share-mark">
          M<span className="lf-acc">/</span>C
        </div>
        <div className="lf-share-title">
          {data.lane === "protect" ? (
            <>
              PROTECTING
              <br />
              <span className="lf-acc">THE</span>
              <br />
              {(data.car || "THE CAR").toUpperCase()}
            </>
          ) : data.lane === "present" ? (
            <>
              MAKING THE
              <br />
              {(data.car || "THE CAR").toUpperCase()}
              <br />
              <span className="lf-acc">HARDER.</span>
            </>
          ) : (
            <>
              {(data.car || "THE CAR").toUpperCase()}
              <br />
              <span className="lf-acc">→ STUDIO.</span>
            </>
          )}
        </div>
        <div className="lf-share-foot">
          <span>MATTHEWSCLARK.CO.ZA</span>
          <span>WOODSTOCK · CPT</span>
        </div>
      </div>
      <button className="lf-share-close" onClick={onClose}>
        ← BACK TO TICKET
      </button>
      <div className="lf-share-help">SCREENSHOT THIS · TAG @MATTHEWSCLARK</div>
    </div>
  );
}

async function submitLead(payload) {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.ok) return res.json().catch(() => ({}));
  const err = await res.json().catch(() => null);
  throw new Error(err?.error || "Failed to submit.");
}

// Fire browser-side conversion events. `eventId` matches the server (Conversions
// API) event so the two dedupe into one. No-ops if a pixel isn't loaded.
function fireLeadPixels({ eventId, services }) {
  const contentName = Array.isArray(services) && services.length ? services.join(",") : undefined;
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "Lead", { content_category: contentName }, { eventID: eventId });
    }
  } catch {
    /* pixel optional */
  }
  try {
    if (typeof window !== "undefined" && window.ttq && typeof window.ttq.track === "function") {
      window.ttq.track("SubmitForm", { content_type: "lead", content_name: contentName }, { event_id: eventId });
    }
  } catch {
    /* pixel optional */
  }
}

function packageLabelFromDetail(detail) {
  if (!detail || typeof detail !== "object") return "Paint correction package";
  const pkg = PC_PACKAGES.find((p) => p.id === detail.packageId) || PC_PACKAGES.find((p) => PC_PACKAGE_TO_SERVICE[p.id] === detail.serviceId);
  if (!pkg) return "Paint correction package";
  return `${pkg.name}${detail.ceramic && pkg.ceramic ? " + Ceramic" : ""}`;
}

function serviceLabelForTicket(id, serviceDetails) {
  if (id === "pc_package") return packageLabelFromDetail(serviceDetails?.pc_package);
  if (PC_SERVICE_IDS.has(id)) {
    const packageId = PC_SERVICE_TO_PACKAGE[id];
    const pkg = PC_PACKAGES.find((p) => p.id === packageId);
    return pkg ? `Paint correction - ${pkg.name}` : id;
  }
  return SERVICES.find((s) => s.id === id)?.label || id;
}

function normalizeLeadFormData(input) {
  const out = {
    ...input,
    services: Array.isArray(input.services) ? [...input.services] : [],
    serviceDetails: { ...(input.serviceDetails || {}) }
  };

  if (out.services.includes("pc_package")) {
    const detail = out.serviceDetails.pc_package || {};
    const serviceId = PC_PACKAGE_TO_SERVICE[detail.packageId];
    out.services = out.services.map((id) => (id === "pc_package" ? serviceId : id)).filter(Boolean);
    delete out.serviceDetails.pc_package;

    if (serviceId) {
      const pkg = PC_PACKAGES.find((p) => p.id === detail.packageId);
      out.serviceDetails[serviceId] = pkg ? normalizePcPackageDetail(pkg, detail) : detail;
    }
  }

  return out;
}

export default function LeadFlow() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [share, setShare] = useState(false);
  const [submitState, setSubmitState] = useState({ status: "idle", error: null });
  const [source, setSource] = useState("WEBSITE");
  const [utm, setUtm] = useState({ source: null, medium: null, campaign: null, content: null, term: null });
  // Ad-click identifiers for conversion attribution (Meta/TikTok/Google).
  const [clickIds, setClickIds] = useState({ fbclid: null, ttclid: null, gclid: null, fbp: null, fbc: null });
  const [knownClient, setKnownClient] = useState(null);
  const [data, setData] = useState({
    name: "",
    surname: "",
    number: "",
    email: "",
    car: "",
    lane: "",
    services: [],
    serviceDetails: {},
    timeframe: ""
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search || "");
    const nextUtm = {
      source: sp.get("utm_source"),
      medium: sp.get("utm_medium"),
      campaign: sp.get("utm_campaign"),
      content: sp.get("utm_content"),
      term: sp.get("utm_term")
    };
    setUtm(nextUtm);

    // Capture ad-click ids for conversion attribution. Meta sets _fbp/_fbc cookies;
    // if _fbc is absent but an fbclid is present, build it per Meta's spec.
    const fbclid = sp.get("fbclid");
    const ttclid = sp.get("ttclid");
    const gclid = sp.get("gclid");
    let fbc = readCookie("_fbc");
    if (!fbc && fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    setClickIds({ fbclid, ttclid, gclid, fbp: readCookie("_fbp"), fbc });

    setSource(
      detectSourceFromUtm({ utmSource: nextUtm.source, utmMedium: nextUtm.medium, referrer: document?.referrer || "", gclid })
    );
  }, []);

  const orderedServices = useMemo(() => {
    const set = new Set(Array.isArray(data.services) ? data.services : []);
    return SERVICE_ORDER.filter((id) => set.has(id));
  }, [data.services]);

  const detailScreens = useMemo(() => {
    return orderedServices.map((id) => ({
      id,
      title: SERVICES.find((s) => s.id === id)?.label || id
    }));
  }, [orderedServices]);

  const screens = useMemo(() => {
    const base = ["name", "surname", "number", "email", "car", "lane", "services"];
    const details = detailScreens.map((d) => `detail:${d.id}`);
    return [...base, ...details, "timeframe"];
  }, [detailScreens]);

  const total = screens.length;

  // If the user changes selected services while inside the detail sequence,
  // clamp the step index so we never render an undefined screen.
  useEffect(() => {
    const submitStep = screens.length + 1;
    const ticketStep = screens.length + 2;
    setStep((prev) => {
      if (prev === 0) return prev;
      if (prev >= ticketStep) return prev;
      if (prev >= submitStep) return prev;
      const flowIndex = prev - 1;
      if (flowIndex < 0) return 1;
      if (flowIndex >= screens.length) return screens.length; // last flow step (timeframe)
      return prev;
    });
  }, [screens]);

  const next = () => {
    setDirection(1);
    setStep((s) => s + 1);
  };
  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };
  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const updateServiceDetails = (serviceId, patch) =>
    setData((d) => ({ ...d, serviceDetails: { ...(d.serviceDetails || {}), [serviceId]: { ...(d.serviceDetails?.[serviceId] || {}), ...(patch || {}) } } }));
  const setServiceDetails = (serviceId, value) =>
    setData((d) => ({ ...d, serviceDetails: { ...(d.serviceDetails || {}), [serviceId]: value || {} } }));
  const restart = () => {
    setData({ name: "", surname: "", number: "", email: "", car: "", lane: "", services: [], serviceDetails: {}, timeframe: "" });
    setKnownClient(null);
    setShare(false);
    setSubmitState({ status: "idle", error: null });
    setStep(0);
  };

  const doSubmit = async (timeframe) => {
    const nextData = { ...data, timeframe };
    const submitData = normalizeLeadFormData(nextData);
    update({ timeframe });
    setDirection(1);
    setSubmitState({ status: "loading", error: null });
    setStep(screens.length + 1);

    // Shared id so the browser pixel event and the server (Conversions API) event
    // dedupe into one conversion.
    const eventId =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // Fire immediately on submit — before the API round-trip — so attribution
    // is captured at the moment of user intent regardless of network latency.
    fireLeadPixels({ eventId, services: submitData.services });

    try {
      await submitLead({
        ...submitData,
        source,
        utm,
        clickIds,
        eventId,
        pageUrl: typeof window !== "undefined" ? window.location.href : null,
        referrer: typeof document !== "undefined" ? document.referrer : null
      });
      setSubmitState({ status: "success", error: null });
    } catch (e) {
      setSubmitState({ status: "error", error: e instanceof Error ? e.message : "Failed to submit." });
    }
  };

  let content;
  const flowIndex = Math.max(0, step - 1);
  const current = screens[flowIndex] || null;
  const submitStep = screens.length + 1;
  const ticketStep = screens.length + 2;

  if (step === 0) content = <StepHook onNext={next} source={source} />;
  else if (step > 0 && step < submitStep) {
    const n = flowIndex;
    const onBack = () => {
      if (step === 1) return;
      back();
    };
	    if (current === "name")
	      content = (
	        <StepFrame n={n} total={total} onBack={onBack}>
	          <StepName value={data.name} onChange={(v) => update({ name: v })} onNext={next} />
	        </StepFrame>
	      );
	    else if (current === "surname")
	      content = (
	        <StepFrame n={n} total={total} onBack={onBack}>
	          <StepSurname value={data.surname} onChange={(v) => update({ surname: v })} onNext={next} />
	        </StepFrame>
	      );
	    else if (current === "number")
	      content = (
	        <StepFrame n={n} total={total} onBack={onBack}>
	          <StepNumber value={data.number} onChange={(v) => update({ number: v })} onNext={next} name={data.name} />
	        </StepFrame>
      );
	    else if (current === "email")
	      content = (
	        <StepFrame n={n} total={total} onBack={onBack}>
	          <StepEmail
	            value={data.email}
	            onChange={(v) => {
	              setKnownClient(null);
	              update({ email: v });
	            }}
	            onNext={next}
	            name={data.name}
	            phone={data.number}
	            onClientDetected={(c) => setKnownClient(c)}
	          />
	        </StepFrame>
	      );
	    else if (current === "car")
	      content = (
	        <StepFrame n={n} total={total} onBack={onBack}>
	          <StepCar value={data.car} onChange={(v) => update({ car: v })} onNext={next} garage={knownClient?.vehicles || []} />
	        </StepFrame>
	      );
    else if (current === "lane")
      content = (
        <StepFrame n={n} total={total} onBack={onBack}>
          <StepLane value={data.lane} onChange={(v) => update({ lane: v })} onNext={next} />
        </StepFrame>
      );
    else if (current === "services")
      content = (
        <StepFrame n={n} total={total} onBack={onBack}>
          <StepServices
            value={data.services}
            onChange={(v) => {
              update({ services: v });
              // Drop detail objects for services that are no longer selected (keeps payload clean).
              setData((d) => {
                const nextDetails = { ...(d.serviceDetails || {}) };
                const nextSet = new Set(v);
                for (const k of Object.keys(nextDetails)) {
                  if (!nextSet.has(k)) delete nextDetails[k];
                }
                return { ...d, services: v, serviceDetails: nextDetails };
              });
            }}
            onNext={() => {
              const set = new Set(Array.isArray(data.services) ? data.services : []);
              if (set.has("unsure")) return next();
              const hasDetails = orderedServices.length > 0;
              if (!hasDetails) return next();
              next();
            }}
          />
        </StepFrame>
      );
    else if (current && current.startsWith("detail:")) {
      const serviceId = current.split(":")[1];
      const val = data.serviceDetails?.[serviceId] || {};
      const setVal = (nextVal) => setServiceDetails(serviceId, nextVal);
      const common = { value: val, onChange: setVal, onNext: next };
      const Title = SERVICES.find((s) => s.id === serviceId)?.label || serviceId;
      content = (
        <StepFrame n={n} total={total} onBack={onBack}>
          {serviceId === "ppf" ? (
            <StepPpfDetails {...common} />
          ) : serviceId === "wrap" ? (
            <StepWrapDetails {...common} />
          ) : serviceId === "tint" ? (
            <StepTintDetails {...common} />
          ) : serviceId === "pc_package" ? (
            <StepPaintCorrectionPackageDetails {...common} />
          ) : serviceId === "ceramic" ? (
            <StepCeramicDetails {...common} />
          ) : serviceId === "correct" ? (
            <StepCorrectionDetails {...common} />
          ) : serviceId === "detail" ? (
            <StepDetailDetails {...common} />
          ) : serviceId === "wheel" ? (
            <StepWheelDetails {...common} />
          ) : (
            <>
              <div className="lf-q">
                <div className="lf-q-eyebrow">{Title.toUpperCase()}</div>
                <h2 className="lf-q-title">
                  {Title} <span className="lf-acc">details.</span>
                </h2>
                <div className="lf-q-helper">Drop any notes and we&apos;ll call to confirm.</div>
              </div>
              <textarea className="lf-textarea" placeholder="What exactly do you want?" value={val.notes || ""} onChange={(e) => setVal({ ...val, notes: e.target.value })} />
              <div className="lf-q-foot">
                <BigButton onClick={next}>NEXT</BigButton>
              </div>
            </>
          )}
        </StepFrame>
      );
    } else if (current === "timeframe")
      content = (
        <StepFrame n={n} total={total} onBack={onBack}>
          <StepTime value={data.timeframe} onChange={(v) => update({ timeframe: v })} onSubmit={doSubmit} />
        </StepFrame>
      );
  } else if (step === submitStep)
    content = (
      <StepSubmit
        status={submitState.status}
        error={submitState.error}
        onRetry={() => doSubmit(data.timeframe)}
        onBack={() => {
          setDirection(-1);
          setStep(submitStep - 1);
        }}
        onDone={() => {
          setDirection(1);
          setStep(ticketStep);
        }}
      />
    );
  else if (step === ticketStep) content = <StepTicket data={data} onShare={() => setShare(true)} onRestart={restart} />;

  return (
    <div className="lf-root">
      <div key={step} className={`lf-page lf-page--${direction > 0 ? "in" : "out"}`}>
        {content}
      </div>
      {share && <ShareCard data={data} onClose={() => setShare(false)} />}
    </div>
  );
}
