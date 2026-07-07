"use client";

// Matthews & Clark — Paint Correction ad funnel (production).
// Ported from the UI-kit prototype (pc-flow.jsx + pc-steps-1/2/3 + pixel.jsx),
// with window.* globals replaced by module imports and the checkout wired into
// the real CRM: progressive lead creation, live calendar availability, POP
// upload + Telegram approval, confirmation email. Design kept faithful.

import { useEffect, useRef, useState } from "react";

import { track, firePageView, getSessionContext } from "@/lib/pcTrackClient";

import {
  PC_PACKAGES,
  PC_BINS,
  PC_FOOTER,
  PC_QUESTIONS,
  PC_UPSELLS,
  PC_EXPECT,
  PC_FINGERNAIL,
  PC_BANK,
  pcRecommend,
  pcBridgeLine,
  pcIsoDate,
  pcIsBusinessDay,
  pcBusinessRange,
  pcIsStartBookable,
  pcFmtDate,
  pcFmtMoney,
  pcPricing,
  pcPaymentSchedule
} from "./pcData";

// ─────────────── Pixel helper (Meta + TikTok, both guarded) ───────────────
const PC_CURRENCY = "ZAR";
function pcTrack(event, params, eventId) {
  const payload = params || {};
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      if (eventId) window.fbq("track", event, payload, { eventID: eventId });
      else window.fbq("track", event, payload);
    }
  } catch (e) {}
  try {
    if (typeof window !== "undefined" && window.ttq && typeof window.ttq.track === "function") {
      window.ttq.track(event, payload, eventId ? { event_id: eventId } : undefined);
    }
  } catch (e) {}
}
// Custom, non-standard events — for step-by-step drop-off reporting only
// (quiz_start, quiz_complete, package_viewed, date_selected, payment_viewed).
// Meta requires "trackCustom" (not "track") for non-standard event names.
function pcTrackCustom(event, params) {
  const payload = params || {};
  try {
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("trackCustom", event, payload);
    }
  } catch (e) {}
  try {
    if (typeof window !== "undefined" && window.ttq && typeof window.ttq.track === "function") {
      window.ttq.track(event, payload);
    }
  } catch (e) {}
}

const pcPixel = {
  viewContent: ({ pkgName, value }) =>
    pcTrack("ViewContent", { content_name: pkgName, content_category: "Paint Correction", content_type: "product", currency: PC_CURRENCY, value: value || 0 }),
  // Primary optimization event — fires at quiz-complete/contact-capture (right
  // after the quiz, before the package reveal), not deep in the funnel. Point
  // the ad set's conversion location at this.
  lead: ({ pkgName, value, eventId }) =>
    pcTrack("Lead", { content_name: pkgName, content_category: "Paint Correction", currency: PC_CURRENCY, value: value || 0 }, eventId),
  // Secondary/deep event, kept for reporting — fires once car+date+package are
  // locked in and the user commits to the deposit path.
  initiateCheckout: ({ pkgName, value, deposit }) =>
    pcTrack("InitiateCheckout", { content_name: pkgName, content_category: "Paint Correction", currency: PC_CURRENCY, value: deposit || value || 0, num_items: 1 }),
  purchase: ({ pkgName, deposit, reference }) =>
    pcTrack("Purchase", { content_name: pkgName, content_category: "Paint Correction", currency: PC_CURRENCY, value: deposit || 0, order_id: reference || undefined }),
  addToCart: ({ name, value }) =>
    pcTrack("AddToCart", { content_name: name, content_category: "Upsell", currency: PC_CURRENCY, value: value || 0 }),
  // "Get my quote on WhatsApp first" handoff — the cold-traffic path.
  contact: ({ pkgName, value }) =>
    pcTrack("Contact", { content_name: pkgName, content_category: "Paint Correction", currency: PC_CURRENCY, value: value || 0 }),
  stepEvent: (name, params) => pcTrackCustom(name, params)
};

// ─────────────── Tracking capture (UTM + click ids, for server CAPI dedupe) ──
function readTracking() {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const clean = (v) => (v && String(v).trim() ? String(v).trim() : null);
  const cookie = (n) => {
    try {
      const m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    } catch {
      return null;
    }
  };
  return {
    utm: {
      source: clean(sp.get("utm_source")),
      medium: clean(sp.get("utm_medium")),
      campaign: clean(sp.get("utm_campaign")),
      content: clean(sp.get("utm_content")),
      term: clean(sp.get("utm_term"))
    },
    clickIds: {
      fbclid: clean(sp.get("fbclid")),
      ttclid: clean(sp.get("ttclid")),
      gclid: clean(sp.get("gclid")),
      fbp: cookie("_fbp"),
      fbc: cookie("_fbc")
    },
    pageUrl: window.location.href,
    referrer: (typeof document !== "undefined" && document.referrer) || null
  };
}

function uuid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return "pc-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Shown if the server's verification result is unavailable (e.g. network blip).
const PC_FALLBACK_CHECKS = [
  { id: "rcv", label: "Proof of payment received", value: "uploaded", pass: true },
  { id: "man", label: "Manual verification", value: "pending", pass: false }
];

// Human contact for paid-but-rejected POPs — Keanan.
const PC_CONTACT_NAME = "Keanan";
const PC_CONTACT_PHONE = "+27 82 847 7701";
const PC_CONTACT_WA = "https://wa.me/27828477701";

// ═══════════════════════════════════════════════════════════════════════════
// Shared frame + buttons
// ═══════════════════════════════════════════════════════════════════════════
function PCFrame({ children, n, total, onBack, hold }) {
  return (
    <div className="lf-step">
      {hold}
      <div className="lf-chrome">
        <button className="lf-back" onClick={onBack} aria-label="Back">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <div className="lf-progress"><div className="lf-progress-bar" style={{ width: `${((n + 1) / total) * 100}%` }} /></div>
      </div>
      <div className="lf-body">{children}</div>
    </div>
  );
}

function PCButton({ children, onClick, disabled, variant = "primary" }) {
  return (
    <button className={`lf-bigbtn lf-bigbtn--${variant}`} onClick={onClick} disabled={disabled}>
      {children}
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ marginLeft: "auto" }}>
        <path d="M5 10h10M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Hero
// ═══════════════════════════════════════════════════════════════════════════
// G1 — the ad names the itch, the landing H1 answers the desire underneath
// it (not an echo of the ad). Only the headline changes per utm_content;
// subhead, star bullet, CTA and everything below are one template, untouched.
// Keys must match the live ad URLs' utm_content exactly (pc_conversion_phase1
// campaign) — these are NOT the "pc-*" slugs used during planning, which
// never matched any real ad and silently fell through to the default below.
// Deliberate short <br/>-broken lines (2026-07-07 rewrite) rather than one
// long sentence left to wrap — keeps each line short enough to run large,
// and gives every variant the same tall, stacked rhythm as the default
// below instead of collapsing to two flat lines on mobile.
// tof_kak: cold lead — resolves the "I already wash it" frustration by
// naming the paint, not the owner's effort, as the actual problem.
// mof_dirty_damaged: warm lead — wax-hides-vs-correction-removes is the
// real, well-established distinction in the market; leans on permanence.
// bof_gloss_filter: hot/purchase-ready lead — confident and short, answers
// the "is that shine real or edited" doubt the ad's filter hook implies.
const PC_HERO_HEADLINES = {
  "tof_kak": <>YOUR WASH<br />WAS FINE.<br /><span className="acc">YOUR PAINT<br />NEEDED MORE.</span></>,
  "mof_dirty_damaged": <>WAX<br />HIDES IT.<br /><span className="acc">WE REMOVE<br />IT FOR GOOD.</span></>,
  "bof_gloss_filter": <>NO FILTER.<br /><span className="acc">JUST REAL<br />GLOSS.</span></>
};
const PC_HERO_HEADLINE_DEFAULT = <>THE SWIRLS<br />GO. THE<br /><span className="acc">GLOSS</span> STAYS.</>;

function PCHero({ onNext, utmContent }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setP(1), 350), setTimeout(() => setP(2), 1000), setTimeout(() => setP(3), 1700)];
    return () => ts.forEach(clearTimeout);
  }, []);
  const headline = PC_HERO_HEADLINES[utmContent] || PC_HERO_HEADLINE_DEFAULT;
  return (
    <div className="pc-hero">
      <div className="pc-hero-media" />
      <div className="pc-hero-grain" />
      <div className="pc-hero-content">
        {/* Eyebrow + headline render at full opacity from first paint — this is
            the page's LCP candidate, so it must not wait on a JS timer to
            become visible (A2 speed pass). Secondary copy below keeps the
            staggered reveal. */}
        <div className="pc-hero-eyebrow">
          PAINT CORRECTION <span className="sl">/</span> WOODSTOCK · CPT
        </div>
        <h1 className="pc-hero-title">
          {headline}
        </h1>
        <p className="pc-hero-sub" style={{ opacity: p >= 2 ? 1 : 0, transition: "opacity 420ms" }}>
          We read your paint, recommend the right correction — not the dearest — and give your car the time it actually needs.
        </p>
        <div className="pc-hero-trust" style={{ opacity: p >= 3 ? 1 : 0, transition: "opacity 420ms" }}>
          <div className="pc-trust-line">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1l2 4.5 5 .5-3.8 3.3L12.5 15 8 12.3 3.5 15l1.3-5.7L1 6l5-.5L8 1z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            <span>One car a day · Woodstock, CPT · most corrections done same day.</span>
          </div>
        </div>
      </div>
      <div className="pc-hero-cta">
        <PCButton onClick={() => { track("hero_cta_click"); onNext(); }}>GET MY QUOTE</PCButton>
        <div className="pc-hero-meta">
          <span>~60 SEC TO A QUOTE</span><span>·</span><span>BY APPOINTMENT</span><span>·</span><span>R1 000 HOLDS YOUR SLOT</span>
        </div>
        <a
          href={`${PC_CONTACT_WA}?text=${encodeURIComponent("Hi — quick question about paint correction before I do the quiz.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pc-cost-sub"
          style={{ display: "block", textAlign: "center", marginTop: 12, textDecoration: "underline" }}
          onClick={() => track("hero_whatsapp_click")}
        >
          Got a question first? WhatsApp {PC_CONTACT_NAME} →
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Chooser question
// ═══════════════════════════════════════════════════════════════════════════
function PCQuestion({ q, value, onChange, onNext, total, n, onBack }) {
  const [warmth, setWarmth] = useState(null);
  const pick = (optId) => {
    onChange(optId);
    const w = q.warmth && q.warmth[optId];
    if (w) {
      setWarmth(w);
      setTimeout(() => { setWarmth(null); onNext(); }, 850);
    } else {
      setTimeout(onNext, 260);
    }
  };
  return (
    <PCFrame n={n} total={total} onBack={onBack}>
      {warmth && (
        <div className="pc-warmth">
          <div className="pc-warmth-mark">M<span style={{ color: "#fff" }}>/</span>C</div>
          <div className="pc-warmth-text">"{warmth}"</div>
        </div>
      )}
      <div className="lf-q">
        <div className="lf-q-eyebrow">{q.eyebrow} · 0{q.n}/04</div>
        <h2 className="lf-q-title" style={{ fontSize: 40 }}>{q.q}</h2>
        <div className="lf-q-helper">{q.helper}</div>
      </div>
      <div className="pc-opts">
        {q.options.map((o) => (
          <button key={o.id} className={`pc-opt ${value === o.id ? "on" : ""}`} onClick={() => pick(o.id)}>
            <div className="pc-opt-label">{o.label}</div>
            <div className="pc-opt-sub">{o.sub}</div>
            <div className="pc-opt-tick">✓</div>
          </button>
        ))}
      </div>
    </PCFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Reading beat (labor illusion)
// ═══════════════════════════════════════════════════════════════════════════
function PCReading({ onDone }) {
  const [line, setLine] = useState(0);
  const lines = ["READING YOUR PAINT", "WEIGHING THE GOAL", "MATCHING THE PROCESS", "CHECKING WE’RE HONEST"];
  useEffect(() => {
    const iv = setInterval(() => setLine((l) => Math.min(l + 1, lines.length - 1)), 380);
    const done = setTimeout(onDone, 1650);
    return () => { clearInterval(iv); clearTimeout(done); };
  }, []);
  return (
    <div className="pc-reading">
      <div className="pc-reading-ring">
        <svg viewBox="0 0 96 96"><circle className="bg" cx="48" cy="48" r="42" fill="none" strokeWidth="4" /><circle className="fg" cx="48" cy="48" r="42" fill="none" strokeWidth="4" /></svg>
        <div className="pc-reading-mark">M<span className="acc">/</span>C</div>
      </div>
      <div className="pc-reading-text">{lines[line]}…</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Expectation-setting panel
// ═══════════════════════════════════════════════════════════════════════════
function PCExpectations({ pkg, ceramicOn }) {
  const xp = PC_EXPECT[pkg.id];
  const metal = pkg.metal;
  let includes = [...pkg.chips];
  if (ceramicOn && pkg.ceramic) {
    // Ceramic replaces the wax sealant — a package can't have both.
    includes = includes.filter((c) => !/wax/i.test(c));
    includes.push(pkg.ceramic.label);
  }
  if (!xp) return null;
  return (
    <div className="pc-xp" style={{ "--m": metal }}>
      <div className="pc-xp-head">
        <div className="pc-xp-eyebrow">HERE’S EXACTLY WHAT YOUR CAR’S GETTING</div>
        <div className="pc-xp-title" style={{ color: metal }}>{pkg.name}{ceramicOn ? " + CERAMIC" : ""}</div>
      </div>

      <div className="pc-xp-meter">
        <div className="pc-xp-meter-top">
          <span className="pc-xp-meter-k">REMOVES</span>
          <span className="pc-xp-meter-v" style={{ color: metal }}>{xp.label}</span>
        </div>
        <div className="pc-xp-bar">
          <div className="pc-xp-bar-fill" style={{ width: xp.pct + "%", background: `linear-gradient(90deg, color-mix(in srgb, ${metal} 50%, #0A0A0A), ${metal})`, boxShadow: `0 0 14px ${metal}` }} />
          <span className="pc-xp-bar-goal">FLAWLESS</span>
        </div>
        <div className="pc-xp-meter-of">{xp.of} — that’s how close to flawless we take your paint.</div>
      </div>

      <div className="pc-xp-card">
        <div className="pc-xp-card-ic" style={{ color: metal }}>
          <svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M4 4l1.5 1.5M14.5 14.5L16 16M16 4l-1.5 1.5M5.5 14.5L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
        <div><div className="pc-xp-card-t">The sunlight test</div><div className="pc-xp-card-d">{xp.sunlight}</div></div>
      </div>

      <div className="pc-xp-card nail">
        <div className="pc-xp-card-ic" style={{ color: metal }}>
          <svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 17L16 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M6.5 15.5l1.8-.5M11 11l1.8-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M13 4h3v3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div><div className="pc-xp-card-t">The fingernail rule</div><div className="pc-xp-card-d">{PC_FINGERNAIL}</div></div>
      </div>

      <div className="pc-xp-incl">
        <div className="pc-xp-incl-head">WHAT’S INCLUDED</div>
        <div className="pc-xp-incl-grid">
          {includes.map((c, i) => (
            <div key={i} className="pc-xp-incl-item"><span className="tk" style={{ color: metal }}>✓</span><span>{c}</span></div>
          ))}
        </div>
        <div className="pc-xp-not">{xp.notThis}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Result / recommendation (bin-first placement)
// ═══════════════════════════════════════════════════════════════════════════
function PCResult({ rec, selectedId, ceramic, onSelect, onToggleCeramic, onNext, n, total, onBack }) {
  const money = pcFmtMoney;
  const recPkg = PC_PACKAGES.find((p) => p.id === rec.recId);
  const sel = PC_PACKAGES.find((p) => p.id === selectedId) || recPkg;
  const [viewBin, setViewBin] = useState(recPkg.bin);
  const bridgeLine = pcBridgeLine(rec);
  const bronzePkg = PC_PACKAGES.find((p) => p.id === "bronze");
  const silverPkg = PC_PACKAGES.find((p) => p.id === "silver");

  const selCeramic = sel.ceramic;
  const showCeramic = !!selCeramic;
  const ceramicOn = ceramic && showCeramic;
  const price = ceramicOn ? selCeramic.totalPrice : sel.price;

  const isRecSel = sel.id === rec.recId;
  const viewTiers = PC_BINS[viewBin].tiers.map((id) => PC_PACKAGES.find((p) => p.id === id));
  const otherBinId = viewBin === "revival" ? "flawless" : "revival";
  const otherBin = PC_BINS[otherBinId];
  const stageInView = PC_BINS[viewBin].tiers.includes("stage-one");
  const stagePkg = PC_PACKAGES.find((p) => p.id === "stage-one");

  // When the user switches to a different stage, scroll the panel back to the
  // top so they see the updated recommendation + expectation reading.
  const wrapRef = useRef(null);
  const scrollToTop = () => {
    requestAnimationFrame(() => {
      const el = wrapRef.current;
      if (el) el.scrollTop = 0;
      const body = el && el.closest(".lf-body");
      if (body) body.scrollTop = 0;
    });
  };
  const handleSelect = (id) => {
    const changed = id !== sel.id;
    if (changed) track("tier_switched", { from: sel.id, to: id });
    onSelect(id);
    if (changed) scrollToTop();
  };

  useEffect(() => { track("reveal_viewed", { recommendedTier: rec.recId }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PCFrame n={n} total={total} onBack={onBack}>
      <div ref={wrapRef} className="pc-result-wrap pc-rc" style={{ "--rec-metal": sel.metal, margin: "-24px -24px -32px", padding: "22px 20px 100px" }}>
        <div className="pc-rc-eyebrow">● BASED ON YOUR ANSWERS</div>
        <h2 className="pc-rhead">We recommend <span className="m" style={{ color: recPkg.metal }}>{recPkg.name}</span> for your car.</h2>

        {isRecSel ? (
          <div className="pc-reason">{rec.reason}</div>
        ) : (
          <div className="pc-switch-note">You’ve chosen <b>{sel.name}</b> — our honest pick was <b style={{ color: recPkg.metal }}>{recPkg.name}</b>. <button className="pc-switch-back" onClick={() => { handleSelect(recPkg.id); setViewBin(recPkg.bin); }}>Back to {recPkg.name}</button></div>
        )}

        <PCExpectations pkg={sel} ceramicOn={ceramicOn} />

        {bridgeLine && (
          <div className="pc-switch-note" style={{ marginBottom: 2 }}>{bridgeLine}</div>
        )}

        {/* Upsell card only makes sense pointing at a tier the user hasn't
            already reached — morphs Bronze->Silver once they've taken Bronze,
            and disappears entirely once they've gone further than that. */}
        {rec.upsellCard && rec.upsellCard.targetId === "bronze" && bronzePkg && sel.id === "stage-one" && (
          <button className="pc-anchor" onClick={() => handleSelect("bronze")}>
            <div className="pc-anchor-l">
              <div className="pc-anchor-k">MOST OWNERS WITH YOUR PAINT GO ONE UP</div>
              <div className="pc-anchor-name">BRONZE</div>
              <div className="pc-anchor-desc">A two-step that cuts the swirls out instead of knocking them back. ~85% gone vs 50–70%. {money(bronzePkg.price - recPkg.price)} more, still one day.</div>
            </div>
            <div className="pc-anchor-price">{money(bronzePkg.price)}<small>1 DAY</small></div>
          </button>
        )}
        {rec.upsellCard && rec.upsellCard.targetId === "bronze" && silverPkg && sel.id === "bronze" && (
          <button className="pc-anchor" onClick={() => handleSelect("silver")}>
            <div className="pc-anchor-l">
              <div className="pc-anchor-k">WANT THE DEEPER MARKS GONE TOO?</div>
              <div className="pc-anchor-name">SILVER</div>
              <div className="pc-anchor-desc">Chasing the deeper marks one by one, on top of the full two-step. {money(silverPkg.price - bronzePkg.price)} more, one extra day.</div>
            </div>
            <div className="pc-anchor-price">{money(silverPkg.price)}<small>2 DAYS</small></div>
          </button>
        )}

        <div className="pc-sel">
          <div className="pc-sel-head">
            <span className="pc-sel-label">YOUR LEVEL — TAP TO CHANGE</span>
            <span className="pc-sel-price" style={{ color: sel.metal }}>{money(sel.price)}</span>
          </div>
          <div className="pc-sel-pills">
            {viewTiers.map((p) => (
              <button key={p.id} className={`pc-sel-pill ${p.id === sel.id ? "on" : ""}`} style={{ "--pill-metal": p.metal }} onClick={() => handleSelect(p.id)}>
                {p.id === rec.recId && <span className="pc-sel-star">★</span>}
                <span className="pc-sel-pill-name">{p.name}</span>
                <span className="pc-sel-pill-price">{money(p.price)}</span>
              </button>
            ))}
          </div>
          <div className="pc-sel-now">{sel.tagline} · {sel.days} {sel.days === 1 ? "day" : "days"} · {ceramicOn ? "18-month ceramic" : sel.protection === "none" ? "no protection" : sel.protection === "wax" ? "wax sealant" : sel.protection === "ceramic-3yr" ? "3-yr ceramic" : "5-yr ceramic"}{sel.id === rec.recId ? "" : " · not our pick"}</div>
        </div>

        <button className={`pc-door2 ${otherBinId === "revival" ? "down" : ""}`} onClick={() => setViewBin(otherBinId)}>
          <div>
            <div className="pc-door2-t">{otherBinId === "flawless" ? "Want to go further — truly flawless?" : "Want a lighter, faster touch?"}</div>
            <div className="pc-door2-sub">{otherBin.tiers.map((id) => PC_PACKAGES.find((p) => p.id === id).name).join(" · ")} · {otherBin.range}</div>
          </div>
          <div className="pc-door2-arrow"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 10h10M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></div>
        </button>

        {!stageInView && (
          <button className={`pc-anchor ${sel.id === "stage-one" ? "sel" : ""}`} onClick={() => handleSelect("stage-one")}>
            <div className="pc-anchor-l">
              <div className="pc-anchor-k">OR JUST GET THE SHINE ON</div>
              <div className="pc-anchor-name">STREET GLOSS</div>
              <div className="pc-anchor-desc">An express gloss correction — a deep, wet shine. The smart, affordable start; come back for deeper correction later.</div>
            </div>
            <div className="pc-anchor-price">{money(stagePkg.price)}<small>1 DAY</small></div>
          </button>
        )}

        {showCeramic && (
          <div className={`pc-ceramic ${ceramicOn ? "on" : ""}`}>
            <div className="pc-ceramic-head">
              <div className="pc-ceramic-title">Add {selCeramic.label}{rec.ceramicRec && !ceramicOn ? <span className="pc-suggest-tag">WE’D SUGGEST</span> : null}</div>
              <button className={`pc-toggle ${ceramicOn ? "on" : ""}`} onClick={onToggleCeramic} aria-label="Toggle ceramic" />
            </div>
            <div className="pc-ceramic-note">
              {selCeramic.addDays > 0
                ? `Optional. Ceramic keeps your car one extra business day (1 → 2 days) — the base finish is a same-day wax. Add 18-month ceramic: +${money(selCeramic.totalPrice - sel.price)} → ${money(selCeramic.totalPrice)} all-in. It changes the schedule, so add it now if you want it.`
                : `Optional. Locks the finish in for 18 months instead of wax. No extra time — Silver is always 2 days. Add 18-month ceramic: +${money(selCeramic.totalPrice - sel.price)} → ${money(selCeramic.totalPrice)} all-in.`}
            </div>
          </div>
        )}

        <div className="pc-footer-note">{PC_FOOTER}</div>
      </div>

      <div className="lf-q-foot" style={{ paddingTop: 14 }}>
        <button className="lf-bigbtn lf-bigbtn--primary pc-cta" onClick={onNext}>
          <span className="pc-cta-l">
            <span className="pc-cta-label">Continue to booking</span>
            {ceramicOn ? <span className="pc-cta-sub">incl. 18-month ceramic</span> : null}
          </span>
          <span className="pc-cta-r">
            <span className="pc-cta-price">{money(price)}</span>
            <svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 10h10M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </span>
        </button>
        <div className="pc-ack2">
          <svg width="15" height="15" viewBox="0 0 15 15"><path d="M2 8l3.5 3.5L13 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>By continuing, you confirm you’ve read and understood what <b>{sel.name}</b> will and won’t achieve — shown above.</span>
        </div>
      </div>
    </PCFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// The car (make / model / year)
// ═══════════════════════════════════════════════════════════════════════════
function PCCarStep({ data, onChange, onNext, onBack, n, total }) {
  const valid = data.make.trim() && data.model.trim() && /^\d{4}$/.test((data.year || "").trim());
  useEffect(() => { track("car_viewed"); }, []);
  return (
    <PCFrame n={n} total={total} onBack={onBack}>
      <div className="lf-q">
        <div className="lf-q-eyebrow">THE CAR</div>
        <h2 className="lf-q-title" style={{ fontSize: 40 }}>RIGHT — WHAT ARE WE <span className="lf-acc">WORKING ON?</span></h2>
        <div className="lf-q-helper">The year tells us your paint type and likely condition.</div>
      </div>
      <div className="pc-field">
        <label className="pc-field-label">MAKE</label>
        <input className="pc-text-input" value={data.make} onChange={(e) => onChange({ make: e.target.value })} placeholder="e.g. BMW" autoComplete="off" />
      </div>
      <div className="pc-row2">
        <div className="pc-field">
          <label className="pc-field-label">MODEL</label>
          <input className="pc-text-input" value={data.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="M2" />
        </div>
        <div className="pc-field">
          <label className="pc-field-label">YEAR</label>
          <input className="pc-text-input" type="tel" maxLength={4} value={data.year} onChange={(e) => onChange({ year: e.target.value.replace(/\D/g, "") })} placeholder="2021" />
        </div>
      </div>
      <div className="lf-q-foot" style={{ marginTop: "auto", paddingTop: 14 }}>
        <PCButton onClick={onNext} disabled={!valid}>{valid ? "NEXT — PICK YOUR DATES" : "ADD MAKE, MODEL & YEAR"}</PCButton>
      </div>
    </PCFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Calendar (live availability)
// ═══════════════════════════════════════════════════════════════════════════
function PCCalendar({ durationDays, metal, booked, value, onChange, onNext, n, total, onBack, loading, contactName }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const earliest = new Date(today); earliest.setDate(earliest.getDate() + 1); // next day onward
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const selStart = value ? new Date(value + "T00:00:00") : null;
  const selRange = selStart ? pcBusinessRange(selStart, durationDays) : [];
  const selRangeIso = new Set(selRange.map(pcIsoDate));
  const pickup = selRange.length ? selRange[selRange.length - 1] : null;

  const y = view.getFullYear(), m = view.getMonth();
  const first = new Date(y, m, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const canPrev = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const availCount = cells.filter((d) => {
    if (!d) return false;
    const di = pcIsoDate(d);
    if (booked.has(di) || d < earliest || !pcIsBusinessDay(d)) return false;
    return pcIsStartBookable(d, durationDays, booked);
  }).length;
  const monthFull = !loading && availCount < 3;

  useEffect(() => { track("calendar_viewed"); }, []);

  const cellClass = (d) => {
    if (!d) return "empty";
    const di = pcIsoDate(d);
    if (selRangeIso.has(di)) {
      if (selStart && di === pcIsoDate(selStart)) return "in-range range-start";
      if (pickup && di === pcIsoDate(pickup)) return "in-range range-end";
      return "in-range";
    }
    if (booked.has(di)) return "booked";
    if (d < earliest) return "blocked";
    if (!pcIsBusinessDay(d)) return "blocked";
    if (!pcIsStartBookable(d, durationDays, booked)) return "blocked";
    return "avail";
  };

  return (
    <PCFrame n={n} total={total} onBack={onBack}>
      <div className="lf-q">
        <div className="lf-q-eyebrow">PICK A DROP-OFF DATE</div>
        <h2 className="lf-q-title" style={{ fontSize: 40 }}>WHEN CAN WE <span className="lf-acc">HAVE IT?</span></h2>
        <div className="lf-q-helper">We need {durationDays} clear business {durationDays === 1 ? "day" : "days"} in a row for your car — greyed dates are already taken or can’t fit the full job{loading ? " · checking live availability…" : ""}.</div>
      </div>

      <div style={{ "--rec-metal": metal }}>
        <div className="pc-cal-head">
          <div className="pc-cal-month">{view.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</div>
          <div className="pc-cal-nav">
            <button className="pc-cal-navbtn" disabled={!canPrev} onClick={() => { track("month_nav", { direction: "prev" }); setView(new Date(y, m - 1, 1)); }}>
              <svg width="12" height="12" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
            <button className="pc-cal-navbtn" onClick={() => { track("month_nav", { direction: "next" }); setView(new Date(y, m + 1, 1)); }}>
              <svg width="12" height="12" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
          </div>
        </div>
        <div className="pc-cal-dows">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d} className="pc-cal-dow">{d}</div>)}</div>
        <div className="pc-cal-grid">
          {cells.map((d, i) => {
            const cls = cellClass(d);
            const clickable = cls === "avail";
            return (
              <button key={i} className={`pc-cal-cell ${cls}`} disabled={!clickable && !cls.includes("range")}
                onClick={() => { if (!clickable) return; track("date_selected", { date: pcIsoDate(d), daysOut: Math.round((d - today) / 86400000) }); onChange(pcIsoDate(d)); }}>
                {d ? d.getDate() : ""}
              </button>
            );
          })}
        </div>
        <div className="pc-cal-legend">
          <span><i style={{ background: metal }} />Drop-off</span>
          <span><i style={{ background: `color-mix(in srgb, ${metal} 22%, transparent)` }} />In the bay</span>
          <span><i style={{ background: "rgba(255,255,255,.06)", backgroundImage: "repeating-linear-gradient(135deg,rgba(255,255,255,.12) 0 3px,transparent 3px 6px)" }} />Booked</span>
        </div>
        <div className="pc-cost-sub">One car a day, Mon–Fri. Your car gets the bay — and both of us — to itself.</div>

        {monthFull && !selStart && (
          <a
            href={`${PC_CONTACT_WA}?text=${encodeURIComponent(`Hi — it's ${contactName ? contactName.trim() || "there" : "there"}. ${view.toLocaleDateString("en-ZA", { month: "long" })} looks fully booked on the site — can you put me on the cancellation list?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pc-screen-verdict warn"
            style={{ display: "block", marginTop: 12, textDecoration: "none" }}
          >
            Fully booked this month — <b style={{ textDecoration: "underline" }}>join the cancellation list →</b>
          </a>
        )}

        {selStart && pickup && (
          <div className="pc-cal-summary">
            <div className="pc-cal-summary-row">
              <div><div className="pc-cal-summary-k">DROP-OFF</div><div className="pc-cal-summary-v">{pcFmtDate(selStart)}</div></div>
              <svg width="22" height="14" viewBox="0 0 22 14" style={{ opacity: .6 }}><path d="M1 7h18M15 3l4 4-4 4" fill="none" stroke="#fff" strokeWidth="1.4" /></svg>
              <div style={{ textAlign: "right" }}><div className="pc-cal-summary-k">PICKUP</div><div className="pc-cal-summary-v">{pcFmtDate(pickup)}</div></div>
            </div>
            <div className="pc-cost-sub">Your car is with us for {durationDays} business {durationDays === 1 ? "day" : "days"}. We do the reveal in person under the lights.</div>
          </div>
        )}
      </div>

      <div className="lf-q-foot" style={{ paddingTop: 14 }}>
        <PCButton onClick={onNext} disabled={!selStart}>{selStart ? "THESE DATES WORK" : "PICK A DATE"}</PCButton>
      </div>
    </PCFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Contact capture — right after the quiz, before the package reveal.
// ═══════════════════════════════════════════════════════════════════════════
function pcFmtPhone(raw) {
  let v = raw.replace(/\D/g, "");
  if (v[0] === "0") v = v.slice(1);
  v = v.slice(0, 9);
  return [v.slice(0, 2), v.slice(2, 5), v.slice(5, 9)].filter(Boolean).join(" ");
}

// SA mobile numbers are 9 digits (after the leading 0/country code) starting
// 6, 7, or 8 — catches obvious typos like "82 000 0000" before they become an
// uncontactable lead. Only enforced for the default +27 dial code; other
// country codes fall back to a loose length check since we can't validate
// every country's format.
function pcIsValidSaMobile(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 9 && /^[678]/.test(digits);
}

// "82 123 4567" -> "082 123 4567" — the number as the client would recognise
// it, for the "We'll WhatsApp X — right?" confirm-back.
function pcFmtPhoneLocal(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  const withZero = "0" + digits;
  return [withZero.slice(0, 3), withZero.slice(3, 6), withZero.slice(6, 10)].filter(Boolean).join(" ");
}

function PCContact({ data, onChange, onNext, n, total, onBack, busy }) {
  const isDefaultDial = (data.dial || "+27") === "+27";
  const phoneValid = isDefaultDial ? pcIsValidSaMobile(data.phone) : data.phone.replace(/\D/g, "").length >= 7;
  const valid = data.name.trim() && phoneValid;
  useEffect(() => { track("contact_viewed"); }, []);
  return (
    <PCFrame n={n} total={total} onBack={onBack}>
      <div className="lf-q">
        <div className="lf-q-eyebrow">YOUR PAINT READ IS READY.</div>
        <h2 className="lf-q-title" style={{ fontSize: 40 }}>WHERE DO WE <span className="lf-acc">SEND IT?</span></h2>
        <div className="lf-q-helper">First name + WhatsApp — so Sam or Keanan can talk you through it, even if you don’t finish booking.</div>
      </div>
      <div className="pc-field">
        <label className="pc-field-label">FIRST NAME</label>
        <input className="pc-text-input" value={data.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Thabo" autoComplete="given-name" />
      </div>
      <div className="pc-field">
        <label className="pc-field-label">PHONE (ON WHATSAPP)</label>
        <div className="pc-phone-row">
          <select className="pc-dial" value={data.dial || "+27"} onChange={(e) => onChange({ dial: e.target.value })} aria-label="Country code">
            {["+27", "+44", "+1", "+61", "+971", "+264", "+267"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="pc-text-input" type="tel" value={data.phone} onChange={(e) => onChange({ phone: pcFmtPhone(e.target.value) })} onBlur={() => { if (data.phone && !phoneValid) track("phone_invalid"); }} placeholder="82 123 4567" autoComplete="tel" />
        </div>
        {isDefaultDial && phoneValid && (
          <div className="pc-cost-sub" style={{ marginTop: 6 }}>We’ll WhatsApp <b style={{ color: "#fff" }}>{pcFmtPhoneLocal(data.phone)}</b> — right?</div>
        )}
      </div>
      <div className="lf-q-foot" style={{ marginTop: "auto", paddingTop: 14 }}>
        <PCButton onClick={onNext} disabled={!valid || busy}>{busy ? "SENDING…" : valid ? "SHOW MY RECOMMENDATION" : "ADD YOUR NAME & NUMBER"}</PCButton>
        <div className="pc-cost-sub" style={{ marginTop: 10, textAlign: "center" }}>No spam, no calls out of the blue. One WhatsApp about this car.</div>
        <div className="pc-cost-sub" style={{ marginTop: 6, textAlign: "center", opacity: 0.6 }}>
          By continuing you agree we may contact you about this quote. <a href="/mc-site/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Privacy</a>
        </div>
        <div className="pc-cost-sub" style={{ marginTop: 10, textAlign: "center" }}>Sam &amp; Keanan · four hands, one car a day · Woodstock, CPT</div>
      </div>
    </PCFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Checkout (last details) — surname + email, right before the deposit.
// ═══════════════════════════════════════════════════════════════════════════
function PCCheckout({ data, onChange, onNext, pkg, ceramicOn, dropoff, pickup, n, total, onBack, busy }) {
  const money = pcFmtMoney;
  const emailValid = !data.email.trim() || /.+@.+\..+/.test(data.email.trim());

  const { price, durationDays } = pcPricing(pkg, ceramicOn);
  const { hold: deposit, dueAtDropoff, dueAtPickup } = pcPaymentSchedule(price, durationDays);

  useEffect(() => { track("confirm_viewed"); }, []);
  const emailEnteredRef = useRef(false);

  return (
    <PCFrame n={n} total={total} onBack={onBack}>
      <div className="pc-result-wrap" style={{ margin: "-24px -24px -32px", padding: "4px 20px 28px", gap: 18 }}>
        <div className="lf-q">
          <div className="lf-q-eyebrow">LAST STEP</div>
          <h2 className="lf-q-title" style={{ fontSize: 38 }}>ONE MORE <span className="lf-acc">THING.</span></h2>
        </div>

        <div className="pc-field">
          <label className="pc-field-label">EMAIL — FOR YOUR INVOICE + BOOKING CONFIRMATION</label>
          <input className="pc-text-input" type="email" value={data.email} onChange={(e) => onChange({ email: e.target.value })} onBlur={() => { if (data.email.trim() && !emailEnteredRef.current) { emailEnteredRef.current = true; track("email_entered", { entered: true }); } }} placeholder="you@email.com (optional)" autoComplete="email" />
          <div className="pc-cost-sub" style={{ marginTop: 6 }}>Optional — we can send both on WhatsApp instead.</div>
        </div>

        <div className="pc-expect">
          <div className="pc-expect-row">
            <svg width="18" height="18" viewBox="0 0 18 18"><rect x="2" y="3" width="14" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M2 7h14M6 1v3M12 1v3" stroke="currentColor" strokeWidth="1.4" /></svg>
            <div><div className="t">{pkg.days + (ceramicOn && pkg.ceramic ? pkg.ceramic.addDays : 0)} business {(pkg.days + (ceramicOn && pkg.ceramic ? pkg.ceramic.addDays : 0)) === 1 ? "day" : "days"} in the workshop</div><div className="d">Drop-off {dropoff ? pcFmtDate(new Date(dropoff + "T00:00:00")) : "—"} → pickup {pickup ? pcFmtDate(pickup) : "—"}. We don’t rush a finish.</div></div>
          </div>
          <div className="pc-expect-row">
            <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9 5v4l2.5 2" stroke="currentColor" strokeWidth="1.4" fill="none" /></svg>
            <div><div className="t">Drop-off between 08:00–09:00, pickup from 16:00</div><div className="d">Same window every day — no need to guess.</div></div>
          </div>
          <div className="pc-expect-row">
            <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9 5v4l2.5 2" stroke="currentColor" strokeWidth="1.4" fill="none" /></svg>
            <div><div className="t">{money(deposit)} holds your slot · {money(dueAtDropoff)} at drop-off{dueAtPickup > 0 ? ` · ${money(dueAtPickup)} at pickup` : ""}</div><div className="d">Refundable and transferable to a new date. No surprises at pickup.</div></div>
          </div>
        </div>
      </div>

      <div className="lf-q-foot" style={{ paddingTop: 14 }}>
        <PCButton onClick={onNext} disabled={!emailValid || busy}>{busy ? "SAVING…" : "TO PAYMENT"}</PCButton>
      </div>
    </PCFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Deposit (EFT + POP upload → real CRM)
// ═══════════════════════════════════════════════════════════════════════════
function PCCopyBtn({ text, field }) {
  const [done, setDone] = useState(false);
  return (
    <button className="pc-copy" onClick={() => { track("eft_copy", { field }); try { navigator.clipboard.writeText(text); } catch (e) {} setDone(true); setTimeout(() => setDone(false), 1200); }} aria-label="Copy">
      {done
        ? <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7l3.5 3.5L12 4" fill="none" stroke="#3FBE78" strokeWidth="1.8" /></svg>
        : <svg width="13" height="13" viewBox="0 0 14 14"><rect x="3" y="3" width="8" height="9" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M3 3V1.8A.8.8 0 013.8 1H10" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>}
    </button>
  );
}

function PCDeposit({ pkg, ceramicOn, reference, dropoff, pickup, onUpload, onScreened, onWhatsappFirst, n, total, onBack, hold, toast }) {
  const money = pcFmtMoney;
  const { price, durationDays } = pcPricing(pkg, ceramicOn);
  const { hold: deposit, dueAtDropoff, dueAtPickup } = pcPaymentSchedule(price, durationDays);
  const [path, setPath] = useState(null); // null (choose) | "hold" (EFT/PoP) | "whatsapp" (confirmation)
  const [waBusy, setWaBusy] = useState(false);
  const fileRef = useRef(null);
  const [pop, setPop] = useState(null); // {name}
  const [phase, setPhase] = useState("idle"); // idle | uploading | revealing | done
  const [checks, setChecks] = useState([]);
  const [verdict, setVerdict] = useState("review");
  const [checkN, setCheckN] = useState(0);
  const [error, setError] = useState(null);

  const handleWhatsapp = async () => {
    if (waBusy) return;
    track("whatsapp_clicked");
    setWaBusy(true);
    try { await onWhatsappFirst(); } catch (e) { /* best-effort */ }
    setWaBusy(false);
    setPath("whatsapp");
  };

  const onFile = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    track("pop_upload_started");
    setPop({ name: f.name });
    setPhase("uploading");
    setChecks([]);
    setCheckN(0);
    setError(null);
    try {
      const res = await onUpload(f);
      const v = res && res.verification;
      const list = Array.isArray(v && v.checks) && v.checks.length ? v.checks : PC_FALLBACK_CHECKS;
      setChecks(list);
      setVerdict((v && v.verdict) || "review");
      setPhase("revealing");
      setCheckN(0);
      track("pop_uploaded");
      pcPixel.purchase({ pkgName: pkg.name, deposit, reference });
    } catch (err) {
      setError(err?.message || "Upload failed — please try again.");
      setPhase("idle");
    }
  };

  useEffect(() => {
    if (phase !== "revealing") return;
    if (checkN >= checks.length) { const t = setTimeout(() => setPhase("done"), 400); return () => clearTimeout(t); }
    const t = setTimeout(() => setCheckN((c) => c + 1), 420);
    return () => clearTimeout(t);
  }, [phase, checkN, checks.length]);

  const allPass = verdict === "pass";

  const backHandler = path === "hold" || path === "whatsapp" ? () => setPath(null) : onBack;

  return (
    <div className="lf-step">
      <div className="lf-chrome">
        <button className="lf-back" onClick={backHandler} aria-label="Back">
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
        <div className="lf-progress"><div className="lf-progress-bar" style={{ width: `${((n + 1) / total) * 100}%` }} /></div>
      </div>

      {hold}

      {path === null && (
        <>
          <div className="pc-result-wrap" style={{ padding: "4px 20px 28px", gap: 16 }}>
            <div className="lf-q">
              <div className="lf-q-eyebrow">SECURE YOUR SLOT</div>
              <h2 className="lf-q-title" style={{ fontSize: 38 }}>HOW DO YOU WANT<br />TO <span className="lf-acc">PLAY THIS?</span></h2>
            </div>

            <div className="pc-mini" style={{ "--pkg-metal": pkg.metal }}>
              <div className="pc-mini-name">{pkg.name}{ceramicOn ? "+C" : ""}</div>
              <div className="pc-mini-info">{dropoff ? pcFmtDate(new Date(dropoff + "T00:00:00")) : "—"} → {pickup ? pcFmtDate(pickup) : "—"}</div>
              <div className="pc-mini-price">{money(price)}</div>
            </div>

            <div className="pc-expect">
              <div className="pc-expect-row">
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 2l7 3.2v3.6c0 4-3 7.4-7 8.2-4-.8-7-4.2-7-8.2V5.2L9 2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                <div><div className="t">Pay {money(deposit)} → send PoP → confirmed on WhatsApp within the hour</div><div className="d">Sam or Keanan verify it against the bank and hold your slot the moment it's in.</div></div>
              </div>
            </div>

            <div className="pc-expect" style={{ padding: "16px 16px 14px" }}>
              <div className="lf-q-eyebrow" style={{ marginBottom: 6 }}>WHO’S GOT YOUR CAR</div>
              <div style={{ fontFamily: "Anton,Impact,sans-serif", fontSize: 20, letterSpacing: 0, textTransform: "uppercase", lineHeight: 1.15 }}>
                <span className="acc">TWO</span> OF US. ONE CAR A DAY.
              </div>
              <div className="pc-cost-sub" style={{ marginTop: 8 }}>
                Your {money(deposit)} lands with the two people doing the work. Sam &amp; Keanan, Woodstock. That’s the whole company.
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, letterSpacing: ".08em", color: "rgba(255,255,255,.7)", marginTop: 10 }}>
                S.M. &nbsp; K.C.
              </div>
            </div>
          </div>

          <div className="lf-q-foot" style={{ padding: "0 20px 24px" }}>
            <button className="lf-bigbtn lf-bigbtn--primary pc-cta" onClick={() => { track("hold_clicked"); setPath("hold"); }}>
              <span className="pc-cta-l"><span className="pc-cta-label">Hold my slot</span></span>
              <span className="pc-cta-r">
                <span className="pc-cta-price">{money(deposit)}</span>
                <svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 10h10M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              </span>
            </button>
            <button className="lf-bigbtn lf-bigbtn--ghost" onClick={handleWhatsapp} disabled={waBusy} style={{ marginTop: 10 }}>
              {waBusy ? "OPENING WHATSAPP…" : "RATHER TALK IT THROUGH FIRST →"}
            </button>
            <div className="pc-ack2">
              <svg width="15" height="15" viewBox="0 0 15 15"><path d="M2 8l3.5 3.5L13 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span><b>Fully refundable. Transferable to any new date.</b> Change your mind before drop-off and every rand comes back.</span>
            </div>
          </div>
        </>
      )}

      {path === "whatsapp" && (
        <div className="pc-result-wrap" style={{ padding: "4px 20px 28px", gap: 16 }}>
          <div className="lf-q">
            <div className="lf-q-eyebrow">ON ITS WAY TO WHATSAPP</div>
            <h2 className="lf-q-title" style={{ fontSize: 38 }}>CHECK <span className="lf-acc">WHATSAPP.</span></h2>
          </div>
          <div className="pc-cost-sub">
            We’ve opened WhatsApp with your {pkg.name} quote ready to send. We’ll pencil {dropoff ? pcFmtDate(new Date(dropoff + "T00:00:00")) : "your date"} in for 24 hours while you decide. Didn’t open? Message {PC_CONTACT_NAME} directly on{" "}
            <a href={PC_CONTACT_WA} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "underline" }}>{PC_CONTACT_PHONE}</a>.
          </div>
          <div className="lf-q-foot" style={{ paddingTop: 10 }}>
            <PCButton onClick={() => setPath("hold")}>ACTUALLY, HOLD MY SLOT NOW</PCButton>
          </div>
        </div>
      )}

      {path === "hold" && (
      <div className="pc-result-wrap" style={{ padding: "4px 20px 28px", gap: 16 }}>
        <div className="lf-q">
          <div className="lf-q-eyebrow">SECURE YOUR SLOT</div>
          <h2 className="lf-q-title" style={{ fontSize: 38 }}>HOLD YOUR SLOT.<br /><span className="lf-acc">IT’S YOURS.</span></h2>
        </div>

        <div className="pc-mini" style={{ "--pkg-metal": pkg.metal }}>
          <div className="pc-mini-name">{pkg.name}{ceramicOn ? "+C" : ""}</div>
          <div className="pc-mini-info">{dropoff ? pcFmtDate(new Date(dropoff + "T00:00:00")) : "—"} → {pickup ? pcFmtDate(pickup) : "—"}</div>
          <div className="pc-mini-price">{money(price)}</div>
        </div>

        <div className="pc-cost">
          <div className="pc-cost-row big"><span className="k">DUE NOW — SLOT HOLD</span><span className="v">{money(deposit)}</span></div>
          <div className="pc-cost-div" />
          <div className="pc-cost-row"><span className="k">Package total</span><span className="v">{money(price)}</span></div>
          <div className="pc-cost-row"><span className="k">Due at drop-off</span><span className="v">{money(dueAtDropoff)}</span></div>
          {dueAtPickup > 0 && (
            <div className="pc-cost-row"><span className="k">Due at pickup</span><span className="v">{money(dueAtPickup)}</span></div>
          )}
          <div className="pc-cost-sub">Fully refundable and transferable to a new date. Forfeit only on a no-show, or arriving unable to settle the drop-off amount. Work starts once the drop-off payment clears — no surprises at pickup.</div>
        </div>

        <div className="pc-eft">
          <div className="pc-eft-head">EFT — MATTHEWS &amp; CLARK</div>
          <div className="pc-eft-row"><span className="pc-eft-k">Bank</span><span className="pc-eft-v">{PC_BANK.bank}</span></div>
          <div className="pc-eft-row"><span className="pc-eft-k">Account holder</span><span className="pc-eft-v">{PC_BANK.holder}</span></div>
          <div className="pc-eft-row"><span className="pc-eft-k">Account type</span><span className="pc-eft-v">{PC_BANK.type}</span></div>
          <div className="pc-eft-row"><span className="pc-eft-k">Account no.</span><span className="pc-eft-v">{PC_BANK.account}</span><PCCopyBtn text={PC_BANK.account} field="account" /></div>
          <div className="pc-eft-row"><span className="pc-eft-k">Branch code</span><span className="pc-eft-v">{PC_BANK.branch}</span><PCCopyBtn text={PC_BANK.branch} field="branch" /></div>
          <div className="pc-eft-row ref"><span className="pc-eft-k">Reference</span><span className="pc-eft-v">{reference}</span><PCCopyBtn text={reference} field="reference" /></div>
        </div>

        <div className="pc-cost-sub">Send the proof here or on WhatsApp — either works.</div>

        <button className="pc-invoice-btn" onClick={() => toast && toast("Your invoice is emailed with your booking confirmation.")}>
          <svg width="15" height="15" viewBox="0 0 16 16"><path d="M4 1h6l3 3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M6 7h5M6 10h5" stroke="currentColor" strokeWidth="1.3" /></svg>
          Invoice emailed on confirmation
        </button>

        {/* POP upload */}
        {phase === "idle" && (
          <>
            {error && (
              <div className="pc-screen-verdict warn">
                {error} Your slot is still held — tap upload to try again, or message {PC_CONTACT_NAME} on{" "}
                <a href={PC_CONTACT_WA} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "underline" }}>{PC_CONTACT_PHONE}</a>.
              </div>
            )}
            <div className="pc-pop" onClick={() => fileRef.current?.click()}>
              <svg className="pc-pop-icon" width="30" height="30" viewBox="0 0 30 30"><path d="M15 20V6m0 0l-5 5m5-5l5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M5 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              <div className="pc-pop-title">Upload proof of payment</div>
              <div className="pc-pop-sub">A PDF straight from your banking app is best — we read it and check the amount, beneficiary and reference automatically. A human confirms against the actual deposit.</div>
            </div>
            <div className="pc-cost-sub" style={{ textAlign: "center" }}>Paid after hours? You’re locked in — we confirm first thing tomorrow.</div>
          </>
        )}
        {phase !== "idle" && pop && (
          <div className="pc-pop filled">
            <div className="pc-pop-file">
              <svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 1h7l3 3v15H5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
              <span className="nm">{pop.name}</span>
              {phase === "uploading" && <span className="pc-eft-k">READING…</span>}
              {phase === "done" && <span className="pc-eft-k">SCREENED</span>}
            </div>
            {phase === "uploading" ? (
              <div className="pc-screen" style={{ marginTop: 12 }}>
                <div className="pc-screen-row pending"><span className="ic">·</span><span className="lbl">Reading your proof of payment…</span><span className="val">OCR</span></div>
              </div>
            ) : (
              <div className="pc-screen" style={{ marginTop: 12 }}>
                {checks.map((c, i) => {
                  const shown = i < checkN || phase === "done";
                  const cls = !shown ? "pending" : c.pass ? "pass" : "warn";
                  return (
                    <div key={c.id} className={`pc-screen-row ${cls}`} style={{ opacity: shown ? 1 : .45 }}>
                      <span className="ic">{!shown ? "·" : c.pass ? "✓" : "!"}</span>
                      <span className="lbl">{c.label}</span>
                      <span className="val">{shown ? c.value : "…"}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {phase === "done" && (
              <div className={`pc-screen-verdict ${allPass ? "pass" : "warn"}`} style={{ marginTop: 10 }}>
                {allPass ? (
                  "Auto-check passed — your slot’s held. We confirm it the moment the deposit reflects in our account."
                ) : (
                  <>
                    We couldn’t fully auto-verify the document — no problem. We’ll check it against the actual deposit when it lands; your slot’s held in the meantime. Already paid and it keeps getting rejected? Message {PC_CONTACT_NAME} on{" "}
                    <a href={PC_CONTACT_WA} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "underline" }}>{PC_CONTACT_PHONE}</a>.
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }} onChange={onFile} />
      </div>
      )}

      {path === "hold" && (
      <div className="lf-q-foot" style={{ padding: "14px 20px 24px" }}>
        <PCButton onClick={onScreened} disabled={phase !== "done"}>
          {phase === "done" ? "SECURE MY SLOT" : phase === "uploading" || phase === "revealing" ? "VERIFYING…" : "UPLOAD POP TO CONTINUE"}
        </PCButton>
        <div className="pc-ack">By holding your slot, you’re confirming you’ve read what’s included.</div>
      </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Confirmation + upsell
// ═══════════════════════════════════════════════════════════════════════════
function PCConfirm({ data, pkg, ceramicOn, reference, dropoff, pickup, booked, accepted, onToggleUpsell, onRestart, onCarPhoto }) {
  const money = pcFmtMoney;
  const fileRef = useRef(null);
  const [slotIdx, setSlotIdx] = useState(null);
  const { price, durationDays } = pcPricing(pkg, ceramicOn);
  const { hold: deposit, dueAtDropoff, dueAtPickup } = pcPaymentSchedule(price, durationDays);

  const onCarFile = (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f || slotIdx == null) return;
    onCarPhoto(slotIdx, f);
  };
  const photos = data.photos || [null, null, null];

  // schedule-aware ceramic-on-Bronze (days_added = 1)
  let ceramicBronze = null;
  if (pkg.id === "bronze" && !ceramicOn && pkg.ceramic) {
    const next = pickup ? new Date(pickup) : null;
    if (next) {
      next.setDate(next.getDate() + 1);
      const ni = pcIsoDate(next);
      const free = pcIsBusinessDay(next) && !booked.has(ni);
      ceramicBronze = { free, day: new Date(next), addCollection: pkg.ceramic.addCollection };
    }
  }

  const items = [...PC_UPSELLS];
  if (pkg.id === "silver" && !ceramicOn && pkg.ceramic) {
    items.push({ id: "ceramic-silver", name: "18-month ceramic", price: pkg.ceramic.addCollection, days: 0, blurb: "Fits your booked window — Silver’s already 2 days. Locks the finish in." });
  }

  const acceptedSum = items.filter((i) => accepted.includes(i.id)).reduce((s, i) => s + i.price, 0);
  const bronzeCeramicAccepted = accepted.includes("ceramic-bronze");
  const upsellTotal = acceptedSum + (bronzeCeramicAccepted && ceramicBronze ? ceramicBronze.addCollection : 0);
  // Upsells settle wherever the package's own remaining balance already
  // settles: folded into drop-off for <=2-day packages (which owe nothing at
  // pickup, by design), or into pickup for 3+ day packages.
  const finalDueAtDropoff = dueAtDropoff + (dueAtPickup === 0 ? upsellTotal : 0);
  const finalDueAtPickup = dueAtPickup + (dueAtPickup === 0 ? 0 : upsellTotal);
  const finalPickup = (bronzeCeramicAccepted && ceramicBronze) ? ceramicBronze.day : pickup;

  return (
    <div className="pc-confirm-wrap">
      <div className="pc-confirm-check">
        <svg width="30" height="30" viewBox="0 0 30 30"><path d="M7 15.5l5 5L23 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div className="pc-result-eyebrow">● SLOT HELD · {reference}</div>
      <h2 className="pc-confirm-title">YOU’RE IN, <span className="acc">{(data.name || "").split(" ")[0].toUpperCase() || "CHAMP"}.</span></h2>
      <div className="pc-cost-sub" style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>
        We’ll WhatsApp {data.phone ? (data.dial || "+27") + " " + data.phone : "you"} to lock it in once the deposit lands. A confirmation email is on its way, and we’ll remind you before drop-off.
      </div>

      <div className="pc-cost" style={{ "--pkg-metal": pkg.metal }}>
        <div className="pc-cost-row"><span className="k">Package</span><span className="v" style={{ color: pkg.metal, fontFamily: "Anton,Impact,sans-serif", fontSize: 16 }}>{pkg.name}{ceramicOn ? " + CERAMIC" : ""}</span></div>
        <div className="pc-cost-row"><span className="k">Drop-off</span><span className="v">{dropoff ? pcFmtDate(new Date(dropoff + "T00:00:00")) : "—"}</span></div>
        <div className="pc-cost-row"><span className="k">Pickup</span><span className="v">{finalPickup ? pcFmtDate(finalPickup) : "—"}{bronzeCeramicAccepted ? " (+1 day)" : ""}</span></div>
        <div className="pc-cost-div" />
        <div className="pc-cost-row"><span className="k">Slot hold paid</span><span className="v">{money(deposit)}</span></div>
        <div className="pc-cost-row"><span className="k">Due at drop-off</span><span className="v">{money(finalDueAtDropoff)}</span></div>
        {finalDueAtPickup > 0 && (
          <div className="pc-cost-row"><span className="k">Due at pickup</span><span className="v">{money(finalDueAtPickup)}</span></div>
        )}
      </div>

      <div className="pc-carinfo">
        <div className="pc-carinfo-head">SHOW US THE SPOTS — OPTIONAL</div>
        <div className="pc-carinfo-body">
          <div className="pc-cost-sub">Snap the specific marks you want us to focus on — helps us prep before {[data.make, data.model].filter(Boolean).join(" ") || "your car"} arrives.</div>
          <div className="pc-photos">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`pc-photo-slot ${photos[i] ? "filled" : ""}`} onClick={() => { setSlotIdx(i); setTimeout(() => fileRef.current?.click(), 0); }}>
                {photos[i] ? (
                  <>
                    <img src={photos[i]} alt="" />
                  </>
                ) : (
                  <><span className="plus">+</span><span className="cap">PHOTO</span></>
                )}
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onCarFile} />
        </div>
      </div>

      {/* upsell */}
      <div className="pc-upsell">
        <div className="pc-upsell-head">ADD WHILE IT’S WITH US — PAY ON COLLECTION</div>
        {items.map((it) => (
          <div key={it.id} className={`pc-upsell-item ${accepted.includes(it.id) ? "on" : ""}`} onClick={() => onToggleUpsell(it.id, it.price, it.name)}>
            <div className="pc-upsell-info">
              <div className="pc-upsell-name">{it.name}</div>
              <div className="pc-upsell-blurb">{it.blurb}</div>
            </div>
            <div className="pc-upsell-price">+{money(it.price)}</div>
            <div className="pc-upsell-check">{accepted.includes(it.id) ? "✓" : ""}</div>
          </div>
        ))}
        {ceramicBronze && ceramicBronze.free && (
          <div className="pc-upsell-ceramic">
            <div className={`pc-upsell-item ${bronzeCeramicAccepted ? "on" : ""}`} style={{ padding: 0, border: 0, background: "transparent" }} onClick={() => onToggleUpsell("ceramic-bronze", ceramicBronze.addCollection, "18-month ceramic")}>
              <div className="pc-upsell-info">
                <div className="pc-upsell-name">18-month ceramic instead of wax</div>
                <div className="pc-upsell-blurb">Lock the gloss in for 18 months.</div>
              </div>
              <div className="pc-upsell-price">+{money(ceramicBronze.addCollection)}</div>
              <div className="pc-upsell-check">{bronzeCeramicAccepted ? "✓" : ""}</div>
            </div>
            <div className="warn">Adding ceramic keeps your car one extra business day — pickup moves to {pcFmtDate(ceramicBronze.day)}. That day’s free, so we can hold it.</div>
          </div>
        )}
        <div className="pc-upsell-foot">No tier changes here — those change the schedule and happen before you book. These fit your booked window and roll into what you owe {finalDueAtPickup > 0 ? "at pickup" : "at drop-off"}.</div>
      </div>

      <button className="lf-bigbtn lf-bigbtn--ghost" onClick={onRestart} style={{ marginTop: 4 }}>BOOK ANOTHER CAR</button>
      <div className="pc-hero-meta" style={{ marginTop: 4 }}>
        <span>14 ALBERT RD · WOODSTOCK</span><span>·</span><span>BY APPOINTMENT</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════════════════
function PCToast({ msg }) {
  if (!msg) return null;
  return <div className="pc-pixel-toast" key={msg}>{msg}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestrator
// ═══════════════════════════════════════════════════════════════════════════
const HOLD_MINS = 60;
const TOTAL = 9;
const QSTEPS = ["q0", "q1", "q2", "q3"];

// Session persistence (B2) — the IG in-app browser kills state aggressively
// on app-switch/refresh. Losing quiz answers or an already-created lead mid-
// funnel is one of the biggest mobile leaks, so every meaningful piece of
// progress is mirrored into sessionStorage and restored on load.
const PC_SESSION_KEY = "mc-pc-funnel-v1";
const PC_VALID_STEPS = new Set(["hero", "q0", "q1", "q2", "q3", "contact", "reading", "result", "car", "calendar", "checkout", "deposit", "confirm"]);

function loadPcSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PC_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!PC_VALID_STEPS.has(parsed.step)) parsed.step = "hero";
    return parsed;
  } catch {
    return null;
  }
}

function savePcSession(state) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PC_SESSION_KEY, JSON.stringify(state));
  } catch {
    // storage full/unavailable — non-fatal, just means no resume on refresh
  }
}

function clearPcSession() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(PC_SESSION_KEY); } catch {}
}

export default function PaintCorrectionFlow({ utmContent }) {
  // G1: which ad the visitor clicked through from — passed down from the
  // server component (page.jsx), which reads it from the actual request.
  // That's what lets the correct headline render server-side, at first
  // paint, instead of only appearing after client JS hydrates.

  // B2 state restoration deliberately does NOT read sessionStorage into the
  // initial useState value — this is a client component, but Next.js still
  // server-renders it, and the server has no sessionStorage. Seeding state
  // from it synchronously would make the client's first render diverge from
  // the server-rendered HTML (a hydration mismatch). Instead every piece
  // starts at its normal default (matching SSR) and a mount-effect below
  // restores the saved session immediately after hydration completes.
  const [step, setStep] = useState("hero");
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState({ car: "", paint: "", goal: "", protection: "" });
  const [rec, setRec] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [ceramic, setCeramic] = useState(false);
  const [dropoff, setDropoff] = useState(null);
  const [accepted, setAccepted] = useState([]);
  const [details, setDetails] = useState({ name: "", last: "", phone: "", email: "", dial: "+27", make: "", model: "", year: "", photos: [null, null, null] });
  const [booked, setBooked] = useState(() => new Set());
  const [availLoading, setAvailLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const lead = useRef({ id: null, token: null }); // progressive lead identity
  const refRef = useRef(null);
  if (!refRef.current) refRef.current = "MC-PC-" + (Math.floor(Math.random() * 9000) + 1000);
  const reference = refRef.current;
  const trackingRef = useRef(null);
  const eventIdRef = useRef(null);
  if (!eventIdRef.current) eventIdRef.current = uuid();

  // hold timer
  const [heldUntil, setHeldUntil] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!heldUntil) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [heldUntil]);

  // toast auto-dismiss
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToastMsg(null), 2600); return () => clearTimeout(t); }, [toastMsg]);
  const toast = (m) => setToastMsg(m);

  // anonymous pre-contact funnel tracking (own KV, never Meta) — fires once
  // per page load; see lib/pcTrackClient.js / lib/pcTracking.js.
  useEffect(() => { firePageView(); }, []);

  // capture tracking + live availability on mount
  useEffect(() => {
    trackingRef.current = readTracking();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lead/paint-correction/availability", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!cancelled && json && Array.isArray(json.booked)) setBooked(new Set(json.booked));
      } catch (e) {
        // fall back to weekend/holiday-only availability
      } finally {
        if (!cancelled) setAvailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // B2 restore — runs once, client-only, right after hydration (never during
  // the initial render itself, which is what avoids the server/client
  // mismatch: both sides render the plain "hero" defaults first).
  useEffect(() => {
    const restored = loadPcSession();
    if (!restored || !restored.step || restored.step === "hero") return;

    setStep(restored.step);
    if (restored.answers) { setAnswers(restored.answers); setRec(pcRecommend(restored.answers)); }
    if (restored.selectedId) setSelectedId(restored.selectedId);
    if (restored.ceramic) setCeramic(true);
    if (restored.dropoff) setDropoff(restored.dropoff);
    if (restored.accepted) setAccepted(restored.accepted);
    if (restored.details) setDetails((d) => ({ ...d, ...restored.details, photos: [null, null, null] }));
    if (restored.leadId) lead.current = { id: restored.leadId, token: restored.leadToken || null };
    if (restored.reference) refRef.current = restored.reference;
    if (restored.eventId) eventIdRef.current = restored.eventId;
    if (restored.heldUntil) setHeldUntil(restored.heldUntil);

    toast("Welcome back — your paint read is still here.");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // B2: mirror progress into sessionStorage on every meaningful change, so a
  // refresh or app-switch (the IG in-app browser especially) resumes instead
  // of losing the lead. Deliberately excludes photos (object URLs die on
  // reload) and pure UI state (busy/toast/availability).
  useEffect(() => {
    if (step === "hero") { clearPcSession(); return; }
    savePcSession({
      step,
      answers,
      selectedId,
      ceramic,
      dropoff,
      accepted,
      details: { name: details.name, last: details.last, phone: details.phone, email: details.email, dial: details.dial, make: details.make, model: details.model, year: details.year },
      leadId: lead.current.id || null,
      leadToken: lead.current.token || null,
      reference,
      eventId: eventIdRef.current,
      heldUntil
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, answers, selectedId, ceramic, dropoff, accepted, details, heldUntil]);

  const selPkg = PC_PACKAGES.find((p) => p.id === (selectedId || (rec && rec.recId))) || PC_PACKAGES[1];
  const { price, durationDays, ceramicOn } = pcPricing(selPkg, ceramic);
  const { hold: deposit, dueAtDropoff, dueAtPickup } = pcPaymentSchedule(price, durationDays);

  const dropoffDate = dropoff ? new Date(dropoff + "T00:00:00") : null;
  const pickup = dropoffDate ? pcBusinessRange(dropoffDate, durationDays).slice(-1)[0] : null;

  const go = (s, d = 1) => { setDir(d); setStep(s); };

  const computeRec = () => {
    const r = pcRecommend(answers);
    setRec(r);
    if (r) { setSelectedId(r.recId); setCeramic(false); }
    return r;
  };

  // ViewContent + package_viewed on result enter; payment_viewed on deposit enter.
  useEffect(() => {
    if (step === "result" && rec) {
      const p = PC_PACKAGES.find((x) => x.id === selectedId) || PC_PACKAGES.find((x) => x.id === rec.recId);
      pcPixel.viewContent({ pkgName: p.name, value: p.price });
      pcPixel.stepEvent("package_viewed", { content_name: p.name, content_category: "Paint Correction", value: p.price });
      patchProgress("package_selected", { packageId: p.id, packageName: p.name, price: p.price });
    }
    if (step === "deposit") {
      track("payment_viewed");
      pcPixel.stepEvent("payment_viewed", { content_name: selPkg.name, content_category: "Paint Correction", value: price });
      pcPixel.stepEvent("DepositPending", { content_name: selPkg.name, content_category: "Paint Correction", value: deposit });
      patchProgress("payment_viewed", {});
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSelect = (id) => {
    setSelectedId(id);
    const p = PC_PACKAGES.find((x) => x.id === id);
    if (!p.ceramic) setCeramic(false);
    pcPixel.viewContent({ pkgName: p.name, value: p.price });
    patchProgress("package_selected", { packageId: p.id, packageName: p.name, price: p.price });
  };

  // ── create the lead right after the quiz — before package/car/date are
  // known. This is what makes a mid-funnel drop-off a followable CRM lead
  // instead of a ghost. ──
  async function createQuizLead() {
    const t = trackingRef.current || {};
    const { sessionId, device, isWebview } = getSessionContext();
    const payload = {
      name: details.name.trim(),
      dial: details.dial || "+27",
      number: ((details.dial || "+27") + " " + details.phone).trim(),
      answers,
      eventId: eventIdRef.current,
      utm: t.utm || null,
      clickIds: t.clickIds || null,
      pageUrl: t.pageUrl || null,
      referrer: t.referrer || null,
      sessionId: sessionId || null,
      device: device || null,
      isWebview: !!isWebview
    };
    const res = await fetch("/api/lead/paint-correction/quiz-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Could not save your details");
    const json = await res.json();
    lead.current = { id: json.leadId, token: json.token };
    return lead.current;
  }

  // ── enrich the lead once car/package/date/email are known (checkout step).
  // Updates the same record created at createQuizLead() in place — falls
  // back to creating a fresh one if that early call never landed. ──
  async function createLead() {
    const t = trackingRef.current || {};
    const eventId = eventIdRef.current;
    const car = [details.make, details.model, details.year].filter(Boolean).join(" ").trim();
    const payload = {
      name: details.name.trim(),
      surname: details.last.trim(),
      dial: details.dial || "+27",
      number: ((details.dial || "+27") + " " + details.phone).trim(),
      email: details.email.trim(),
      make: details.make.trim(),
      model: details.model.trim(),
      year: details.year.trim(),
      car: car || `${details.make} ${details.model}`.trim(),
      package: selPkg.id,
      packageName: selPkg.name,
      ceramic: ceramicOn,
      price,
      deposit,
      balance: price - deposit,
      dueAtDropoff,
      dueAtPickup,
      durationDays,
      dropoff,
      pickup: pickup ? pcIsoDate(pickup) : null,
      reference,
      answers,
      eventId,
      utm: t.utm || null,
      clickIds: t.clickIds || null,
      pageUrl: t.pageUrl || null,
      referrer: t.referrer || null,
      leadId: lead.current.id || undefined,
      t: lead.current.token || undefined
    };
    const res = await fetch("/api/lead/paint-correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Could not save your details");
    const json = await res.json();
    lead.current = { id: json.leadId, token: json.token };
    return lead.current;
  }

  // ── real-time stage sync (T2) — fire-and-forget, never blocks navigation.
  // Keeps the CRM's "furthest step" accurate even for leads who bounce before
  // checkout, which is what makes the Telegram chase (T1) possible. ──
  function patchProgress(stage, patch) {
    if (!lead.current.id || !lead.current.token) return;
    fetch(`/api/lead/${encodeURIComponent(lead.current.id)}/pc-progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: lead.current.token, stage, patch })
    }).catch(() => {});
  }

  // ── "Rather talk it through first" — the cold-traffic path off the payment
  // screen. Marks the lead as contacted (followed up like a real lead),
  // soft-holds the chosen calendar slot for 24h, and hands off to WhatsApp
  // with the ref/car/package/date prefilled instead of asking to hold now.
  // PCDeposit switches its own sub-view once this resolves. ──
  async function handleWhatsappFirst() {
    if (!lead.current.id) {
      try { await createQuizLead(); } catch (e) { /* best-effort */ }
    }
    pcPixel.contact({ pkgName: selPkg.name, value: price });
    if (lead.current.id && lead.current.token) {
      try {
        await fetch(`/api/lead/${encodeURIComponent(lead.current.id)}/pc-whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ t: lead.current.token, packageId: selPkg.id, packageName: selPkg.name, price })
        });
      } catch (e) { /* best-effort */ }
    }
    const car = [details.make, details.model, details.year].filter(Boolean).join(" ").trim() || "car";
    const dateLabel = dropoffDate ? pcFmtDate(dropoffDate) : "a date";
    const msg = `Hi — I built a quote for my ${car}. Ref ${reference}, ${selPkg.name} on ${dateLabel}. Want to confirm a few things before I hold the slot.`;
    const waUrl = `${PC_CONTACT_WA}?text=${encodeURIComponent(msg)}`;
    if (typeof window !== "undefined") window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  // ── upload POP to the held lead ──
  async function uploadPop(file) {
    if (!lead.current.id) await createLead(); // safety net if create failed earlier
    const fd = new FormData();
    fd.append("file", file);
    fd.append("t", lead.current.token);
    const res = await fetch(`/api/lead/${encodeURIComponent(lead.current.id)}/pc-deposit`, { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new Error(j?.error || "Upload failed");
    }
    return res.json();
  }

  // ── upload a "spots" photo post-deposit ──
  async function uploadCarPhoto(idx, file) {
    // optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setDetails((d) => { const photos = [...(d.photos || [null, null, null])]; photos[idx] = localUrl; return { ...d, photos }; });
    if (!lead.current.id) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("t", lead.current.token);
      fd.append("index", String(idx));
      await fetch(`/api/lead/${encodeURIComponent(lead.current.id)}/pc-photos`, { method: "POST", body: fd });
    } catch (e) {
      // local preview remains; non-fatal
    }
  }

  // hold bar element — one story with the WhatsApp-path's 24h promise: this
  // timer governs the live countdown while paying, not a hard deadline. At
  // 0:00 nothing is lost — it softens into the same 24h pencil (E1+E2).
  const remain = heldUntil ? Math.max(0, heldUntil - now) : 0;
  const expired = !!heldUntil && remain <= 0;
  useEffect(() => { if (expired) track("timer_expired"); }, [expired]);
  const mm = Math.floor(remain / 60000), ss = Math.floor((remain % 60000) / 1000);
  const low = remain > 0 && remain <= 5 * 60000;
  const dateLabel = dropoff ? pcFmtDate(new Date(dropoff + "T00:00:00")) : "your date";
  const holdBar = heldUntil ? (
    expired ? (
      <div className="pc-hold">
        <span className="pc-hold-dot" />
        <span className="pc-hold-label">Still yours — pay now and {dateLabel} is locked. We’ve pencilled you in till tomorrow.</span>
      </div>
    ) : (
      <div className={`pc-hold ${low ? "low" : ""}`}>
        <span className="pc-hold-dot" />
        <span className="pc-hold-label">Calendar locked for you while you pay</span>
        <span className="pc-hold-clock">{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</span>
      </div>
    )
  ) : null;

  let content;
  if (step === "hero") {
    content = <PCHero utmContent={utmContent} onNext={() => { track("quiz_start"); pcPixel.stepEvent("quiz_start", { content_category: "Paint Correction" }); go("q0"); }} />;
  } else if (QSTEPS.includes(step)) {
    const qi = QSTEPS.indexOf(step);
    const q = PC_QUESTIONS[qi];
    const key = q.id;
    content = (
      <PCQuestion
        q={q} n={qi} total={TOTAL} value={answers[key]}
        onBack={() => { track("quiz_back", { fromStep: `q${qi + 1}` }); (qi === 0 ? go("hero", -1) : go(QSTEPS[qi - 1], -1)); }}
        onChange={(v) => { track(`q${qi + 1}_answered`, { answer: v }); setAnswers((a) => ({ ...a, [key]: v })); }}
        onNext={() => {
          if (qi < 3) go(QSTEPS[qi + 1]);
          else { pcPixel.stepEvent("quiz_complete", { content_category: "Paint Correction" }); go("contact"); }
        }}
      />
    );
  } else if (step === "contact") {
    content = (
      <PCContact
        data={details} n={4} total={TOTAL} busy={busy}
        onBack={() => go("q3", -1)}
        onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
        onNext={async () => {
          if (busy) return;
          setBusy(true);
          const r = computeRec();
          try {
            await createQuizLead();
          } catch (e) {
            // non-fatal — we retry when enriching the lead at checkout / POP upload
          }
          setBusy(false);
          track("contact_submitted", { leadId: lead.current.id || null });
          const p = PC_PACKAGES.find((x) => x.id === (r && r.recId)) || PC_PACKAGES[1];
          pcPixel.lead({ pkgName: p.name, value: p.price, eventId: eventIdRef.current });
          go("reading");
        }}
      />
    );
  } else if (step === "reading") {
    content = <PCReading onDone={() => go("result")} />;
  } else if (step === "result") {
    content = (
      <PCResult
        rec={rec} selectedId={selectedId} ceramic={ceramic} n={5} total={TOTAL}
        onBack={() => go("contact", -1)}
        onSelect={onSelect}
        onToggleCeramic={() => { track("ceramic_toggled"); setCeramic((c) => !c); }}
        onNext={() => {
          track("reveal_continue");
          // Secondary/deep event — kept for reporting once the ad set is
          // optimizing off the shallower Lead event fired at contact-capture.
          pcPixel.initiateCheckout({ pkgName: selPkg.name, value: price, deposit });
          go("car");
        }}
      />
    );
  } else if (step === "car") {
    content = (
      <PCCarStep
        data={details} n={6} total={TOTAL}
        onBack={() => go("result", -1)}
        onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
        onNext={() => {
          track("car_submitted");
          const car = [details.make, details.model, details.year].filter(Boolean).join(" ").trim();
          patchProgress("car_details", { make: details.make, model: details.model, year: details.year, car });
          go("calendar");
        }}
      />
    );
  } else if (step === "calendar") {
    content = (
      <PCCalendar
        durationDays={durationDays} metal={selPkg.metal} booked={booked}
        value={dropoff} n={7} total={TOTAL} loading={availLoading}
        contactName={details.name}
        onBack={() => go("car", -1)}
        onChange={setDropoff}
        onNext={() => {
          track("dates_confirmed");
          pcPixel.stepEvent("date_selected", { content_category: "Paint Correction", date: dropoff });
          patchProgress("date_selected", { dropoff, pickup: pickup ? pcIsoDate(pickup) : undefined, durationDays });
          go("checkout");
        }}
      />
    );
  } else if (step === "checkout") {
    content = (
      <PCCheckout
        data={details} pkg={selPkg} ceramicOn={ceramicOn} dropoff={dropoff} pickup={pickup}
        n={8} total={TOTAL} busy={busy}
        onBack={() => go("calendar", -1)}
        onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
        onNext={async () => {
          if (busy) return;
          track("to_payment");
          setBusy(true);
          try {
            await createLead();
          } catch (e) {
            // non-fatal — we retry at POP upload
          }
          setBusy(false);
          setHeldUntil(Date.now() + HOLD_MINS * 60000);
          go("deposit");
        }}
      />
    );
  } else if (step === "deposit") {
    content = (
      <PCDeposit
        pkg={selPkg} ceramicOn={ceramicOn} reference={reference} dropoff={dropoff} pickup={pickup}
        n={8} total={TOTAL} hold={holdBar} toast={toast}
        onBack={() => go("checkout", -1)}
        onWhatsappFirst={handleWhatsappFirst}
        onUpload={uploadPop}
        onScreened={() => go("confirm")}
      />
    );
  } else if (step === "confirm") {
    content = (
      <PCConfirm
        data={details} pkg={selPkg} ceramicOn={ceramicOn} reference={reference}
        dropoff={dropoff} pickup={pickup} booked={booked} accepted={accepted}
        onToggleUpsell={(id, val, name) => {
          setAccepted((a) => {
            if (a.includes(id)) return a.filter((x) => x !== id);
            pcPixel.addToCart({ name, value: val });
            // persist upsell interest to the lead (best-effort)
            if (lead.current.id) {
              fetch(`/api/lead/${encodeURIComponent(lead.current.id)}/pc-upsell`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ t: lead.current.token, id, name, price: val })
              }).catch(() => {});
            }
            return [...a, id];
          });
        }}
        onCarPhoto={uploadCarPhoto}
        onRestart={() => {
          setAnswers({ car: "", paint: "", goal: "", protection: "" }); setRec(null);
          setSelectedId(null); setCeramic(false); setDropoff(null); setAccepted([]);
          setDetails({ name: "", last: "", phone: "", email: "", dial: "+27", make: "", model: "", year: "", photos: [null, null, null] });
          setHeldUntil(null);
          lead.current = { id: null, token: null };
          refRef.current = "MC-PC-" + (Math.floor(Math.random() * 9000) + 1000);
          eventIdRef.current = uuid();
          go("hero", -1);
        }}
      />
    );
  }

  return (
    <div className="pc-stage">
      <div className="pc-frame">
        <div className="pc-root">
          <div key={step} className={`lf-page lf-page--${dir > 0 ? "in" : "out"}`}>{content}</div>
          <PCToast msg={toastMsg} />
        </div>
      </div>
    </div>
  );
}
