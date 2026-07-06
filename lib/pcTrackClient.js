// Client-side half of the paint-correction anonymous funnel tracker. Hand-
// rolled on purpose (no analytics library). Never blocks the UI: every call
// here is fire-and-forget and swallows its own failures. See
// app/api/pc/track/route.js and lib/pcTracking.js for the write path this
// feeds.
//
// Public API used by PaintCorrectionFlow.jsx: track(event, meta) and
// firePageView(). Session id and base context (utm/device/webview/viewport)
// are resolved once per page load and cached at module scope, so any
// component can call track() directly with no prop-drilling.

const SESSION_KEY = "mc-pc-session-id";
const SESSION_EXP_KEY = "mc-pc-session-exp";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, sliding
const TRACK_URL = "/api/pc/track";

let cachedSessionId = null;

// Mint-or-reuse a session id in localStorage. Sliding 30-day expiry — any
// call within the window refreshes it, so an active visitor never loses
// their session mid-return-visit.
export function getOrCreateSessionId() {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === "undefined") return null;
  try {
    const now = Date.now();
    const existing = window.localStorage.getItem(SESSION_KEY);
    const exp = Number(window.localStorage.getItem(SESSION_EXP_KEY) || 0);
    const id = existing && exp > now ? existing : uuid();
    window.localStorage.setItem(SESSION_KEY, id);
    window.localStorage.setItem(SESSION_EXP_KEY, String(now + SESSION_TTL_MS));
    cachedSessionId = id;
    return id;
  } catch {
    return null;
  }
}

function uuid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return "pcs-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function detectDevice() {
  if (typeof window === "undefined") return null;
  const w = window.innerWidth || 0;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// Meta/Facebook in-app browsers — the funnel's biggest untested traffic
// source (A1 in the perfection-list audit).
function detectWebview() {
  if (typeof navigator === "undefined") return false;
  return /Instagram|FBAN|FBAV/i.test(navigator.userAgent || "");
}

function readUtm() {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const clean = (v) => (v && String(v).trim() ? String(v).trim() : null);
  return {
    source: clean(sp.get("utm_source")),
    medium: clean(sp.get("utm_medium")),
    campaign: clean(sp.get("utm_campaign")),
    content: clean(sp.get("utm_content")),
    term: clean(sp.get("utm_term"))
  };
}

let cachedBaseMeta = null;

// Resolved once per page load — utm/device/webview/viewport don't change
// mid-session, so every event can carry the same snapshot. That consistency
// is what lets the server sum distinct-session counts across dimension-
// partitioned aggregate keys safely (see lib/pcTracking.js).
function getBaseMeta() {
  if (cachedBaseMeta) return cachedBaseMeta;
  if (typeof window === "undefined") return {};
  const utm = readUtm();
  cachedBaseMeta = {
    utm,
    utmContent: utm.content,
    referrer: (typeof document !== "undefined" && document.referrer) || null,
    device: detectDevice(),
    viewportWidth: window.innerWidth,
    isWebview: detectWebview()
  };
  return cachedBaseMeta;
}

// Exposed so the lead-creation payload (createQuizLead in PaintCorrectionFlow)
// can write the same sessionId + device/webview snapshot onto the CRM lead
// record — that's the join between the anonymous trail and the lead.
export function getSessionContext() {
  const { device = null, isWebview = false } = getBaseMeta();
  return { sessionId: getOrCreateSessionId(), device, isWebview };
}

/**
 * Fire-and-forget event beacon — sendBeacon first (survives tab close, which
 * is exactly the case we most need to capture), fetch keepalive fallback.
 * Never throws, never awaited by callers. No PII belongs in `meta`.
 */
export function track(event, meta) {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;
  try {
    const payload = JSON.stringify({ sessionId, event, meta: { ...getBaseMeta(), ...meta }, ts: Date.now() });
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(TRACK_URL, blob)) return;
    }
    fetch(TRACK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  } catch {
    // analytics must never throw into the funnel
  }
}

/**
 * page_view is the funnel's denominator and speed/webview diagnostic, so it
 * carries timing — but grabbing LCP synchronously on mount almost always
 * finds nothing yet, since it hasn't fired. Deferring the send slightly (idle
 * callback, capped) gives LCP a real chance to resolve without blocking or
 * delaying anything the user sees.
 */
export function firePageView() {
  if (typeof window === "undefined") return;
  const send = () => {
    let domInteractive = null;
    let lcp = null;
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) domInteractive = Math.round(nav.domInteractive);
    } catch {}
    try {
      const entries = performance.getEntriesByType("largest-contentful-paint");
      if (entries.length) lcp = Math.round(entries[entries.length - 1].startTime);
    } catch {}
    track("page_view", { domInteractive, lcp });
  };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(send, { timeout: 2500 });
  else window.setTimeout(send, 1500);
}
