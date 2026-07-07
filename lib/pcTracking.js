// Anonymous pre-contact funnel tracking for the paint-correction ad funnel —
// the half of the funnel pc_funnel_summary can't see, since that only reads
// CRM lead records and a lead doesn't exist until contact capture (S5).
// Stored entirely in our own KV (never Meta), joined to the lead record via
// sessionId once contact is submitted. See app/api/pc/track/route.js for the
// write path and PaintCorrectionFlow.jsx for what fires each event.
//
// Storage:
//  - pcsession:{sessionId}      — raw append-only event list (LIST), TTL 60d.
//                                  Debugging/detail only — never queried in bulk.
//  - pcsessions:index           — sorted set of sessionId by last-activity time,
//                                  for "most recent sessions" listing.
//  - pcstats:{date}:{event}:{content}:{device}:{webview}
//                                — a SET of sessionIds (not a counter). Cardinality
//                                  (SCARD) gives an exact distinct-session reach
//                                  count with no TTL; a session's dimension tuple
//                                  is fixed for its lifetime (captured once, at
//                                  first page_view, and passed on every event),
//                                  so summing SCARD across keys that vary only in
//                                  a *different*, wildcarded dimension is exact —
//                                  no session can land in two of those buckets.

import {
  hasKv,
  kvGet,
  kvSet,
  kvExpire,
  kvRPush,
  kvLRange,
  kvSAdd,
  kvSCard,
  kvKeys,
  kvZAdd,
  kvZRevRange,
  maybeParseJson
} from "@/lib/kv";
import { PC_FUNNEL_STEPS, pcLeadsDetail } from "@/lib/pcAnalytics";

// Order matters — this is the funnel's actual pre-contact sequence, mirrored
// from PaintCorrectionFlow.jsx's own step order (hero -> q0..q3 -> contact).
export const PRE_CONTACT_STEPS = [
  "page_view",
  "quiz_start",
  "q1_answered",
  "q2_answered",
  "q3_answered",
  "q4_answered",
  "contact_viewed",
  "contact_submitted"
];

// Everything after quiz_complete (== contact_submitted, a lead now exists) —
// reused as-is from the lead-based analytics so both halves of the funnel
// share one source of truth for the post-contact steps.
const POST_CONTACT_STEPS = PC_FUNNEL_STEPS.filter((s) => s.id !== "quiz_complete");

const RAW_TRAIL_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days
const DEDUP_WINDOW_MS = 2000;

const KNOWN_EVENTS = new Set([
  "page_view",
  "hero_cta_click",
  "hero_whatsapp_click",
  "quiz_start",
  "q1_answered",
  "q2_answered",
  "q3_answered",
  "q4_answered",
  "quiz_back",
  "contact_viewed",
  "phone_invalid",
  "contact_submitted",
  "reveal_viewed",
  "tier_switched",
  "ceramic_toggled",
  "reveal_continue",
  "car_viewed",
  "car_submitted",
  "calendar_viewed",
  "month_nav",
  "date_selected",
  "dates_confirmed",
  "confirm_viewed",
  "email_entered",
  "to_payment",
  "payment_viewed",
  "whatsapp_clicked",
  "hold_clicked",
  "eft_copy",
  "pop_upload_started",
  "pop_uploaded",
  "timer_expired",
  // Additive diagnostic event (see lib/pcTrackClient.js reportClientError) —
  // not part of the funnel step sequence, just a "something threw" signal.
  "client_error"
]);

export function isKnownPcEvent(event) {
  return KNOWN_EVENTS.has(String(event || ""));
}

function dayKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function dimensionOrNone(v) {
  const s = String(v || "").trim();
  return s ? s : "(none)";
}

function statsKey({ date, event, content, device, webview }) {
  return `pcstats:${date}:${event}:${dimensionOrNone(content)}:${dimensionOrNone(device)}:${webview ? "webview" : "browser"}`;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// write path
// ---------------------------------------------------------------------------

/**
 * Records one anonymous (or post-contact-joined, via meta.leadId) funnel
 * event. Fire-and-forget by design — never throws past this point; the API
 * route already swallows anything this raises.
 */
export async function recordPcEvent({ sessionId, event, meta, ts }) {
  if (!hasKv()) return;
  if (!sessionId || !isKnownPcEvent(event)) return;
  const when = Number.isFinite(ts) ? ts : Date.now();

  // Dedup: identical event+session within 2s collapses to a single write
  // (covers sendBeacon + fetch-keepalive double-fires, and React dev double-
  // mount) — this only guards the raw trail from log spam; the aggregate SET
  // below is naturally idempotent regardless of timing.
  const dedupKey = `pcdedup:${sessionId}:${event}`;
  const lastTs = Number(maybeParseJson(await kvGet(dedupKey)) || 0);
  if (lastTs && when - lastTs < DEDUP_WINDOW_MS) return;
  await kvSet(dedupKey, when);
  await kvExpire(dedupKey, 10);

  const content = meta?.utmContent || null;
  const device = meta?.device || null;
  const webview = !!meta?.isWebview;

  const trailKey = `pcsession:${sessionId}`;
  await kvRPush(trailKey, JSON.stringify({ event, meta: meta || null, ts: when }));
  await kvExpire(trailKey, RAW_TRAIL_TTL_SECONDS);

  await kvZAdd("pcsessions:index", when, sessionId);

  await kvSAdd(statsKey({ date: dayKey(when), event, content, device, webview }), sessionId);
}

export async function getSessionTrail(sessionId) {
  if (!hasKv() || !sessionId) return [];
  const raw = await kvLRange(`pcsession:${sessionId}`, 0, -1);
  return raw.filter(Boolean).sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

// ---------------------------------------------------------------------------
// read path — pre-contact aggregates
// ---------------------------------------------------------------------------

function dateRange(from, to) {
  const out = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Sums SCARD across every key matching the given (possibly-wildcarded)
// dimensions. Safe to sum (not union) because a session's dimension tuple is
// fixed — it can only ever land in exactly one fully-specified key per
// date+event, so partitioning by the *other* dimensions is always disjoint.
async function stepReachCount({ event, dates, content, device, webview }) {
  let total = 0;
  for (const date of dates) {
    const pattern = `pcstats:${date}:${event}:${content ? dimensionOrNone(content) : "*"}:${device ? dimensionOrNone(device) : "*"}:${webview === undefined ? "*" : webview ? "webview" : "browser"}`;
    const keys = await kvKeys(pattern);
    const cards = await Promise.all(keys.map((k) => kvSCard(k)));
    total += cards.reduce((s, c) => s + c, 0);
  }
  return total;
}

// Distinct dimension values seen for a given event across a date range (used
// to discover the group labels to break a funnel down by) — sourced from
// page_view since that's the funnel's superset (every session has one).
async function distinctDimensionValues({ dates, dimIndex }) {
  const values = new Set();
  for (const date of dates) {
    const keys = await kvKeys(`pcstats:${date}:page_view:*:*:*`);
    for (const k of keys) {
      const parts = k.split(":");
      if (parts[dimIndex] !== undefined) values.add(parts[dimIndex]);
    }
  }
  return Array.from(values);
}

function leadReachedStep(row, stepId) {
  if (row.converted) return true; // booked leads passed every step
  const idx = PC_FUNNEL_STEPS.findIndex((s) => s.id === stepId);
  const furthestIdx = PC_FUNNEL_STEPS.findIndex((s) => s.id === row.furthestStep);
  return furthestIdx >= idx;
}

function leadGroupKey(row, groupBy) {
  if (groupBy === "content") return dimensionOrNone(row.utmContent);
  if (groupBy === "device") return dimensionOrNone(row.device);
  if (groupBy === "webview") return row.isWebview ? "webview" : "browser";
  if (groupBy === "day") return String(row.createdAt || "").slice(0, 10);
  return "all";
}

/**
 * The full anonymous-to-lead funnel waterfall: page_view through
 * contact_submitted from the KV session aggregates, stitched to the existing
 * post-contact stages (package_selected -> payment_viewed -> booked) sourced
 * from lead records — one continuous line, one call.
 */
export async function pcDropoffFunnel({ from, to, groupBy = null } = {}) {
  const validGroupBy = ["content", "device", "webview", "day"].includes(groupBy) ? groupBy : null;
  if (!hasKv()) return { from: from || null, to: to || null, groupedBy: validGroupBy, groups: [] };
  const dates = dateRange(from, to);
  if (!dates.length) return { from: from || null, to: to || null, groupedBy: validGroupBy, groups: [] };

  const dimIndex = validGroupBy === "content" ? 3 : validGroupBy === "device" ? 4 : validGroupBy === "webview" ? 5 : null;

  let preLabels;
  if (validGroupBy === "day") preLabels = dates;
  else if (validGroupBy) preLabels = await distinctDimensionValues({ dates, dimIndex });
  else preLabels = ["all"];

  const preContactByLabel = new Map();
  for (const label of preLabels) {
    const filters = {};
    if (validGroupBy === "content") filters.content = label;
    else if (validGroupBy === "device") filters.device = label;
    else if (validGroupBy === "webview") filters.webview = label === "webview";
    const stepDates = validGroupBy === "day" ? [label] : dates;
    const counts = await Promise.all(PRE_CONTACT_STEPS.map((event) => stepReachCount({ event, dates: stepDates, ...filters })));
    preContactByLabel.set(label, counts);
  }

  const leadRows = await pcLeadsDetail();
  const filteredLeadRows = leadRows.filter((r) => {
    const d = String(r.createdAt || "").slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });

  const postContactByLabel = new Map();
  for (const row of filteredLeadRows) {
    const key = validGroupBy ? leadGroupKey(row, validGroupBy) : "all";
    if (!postContactByLabel.has(key)) postContactByLabel.set(key, []);
    postContactByLabel.get(key).push(row);
  }

  const allLabels = new Set([...preContactByLabel.keys(), ...postContactByLabel.keys()]);

  const groups = Array.from(allLabels)
    .map((label) => {
      const preCounts = preContactByLabel.get(label) || PRE_CONTACT_STEPS.map(() => 0);
      const rows = postContactByLabel.get(label) || [];
      const postCounts = POST_CONTACT_STEPS.map((s) => rows.filter((r) => leadReachedStep(r, s.id)).length);
      const bookedCount = rows.filter((r) => r.converted).length;

      const pageViews = preCounts[0] || 0;
      const rawSteps = [
        ...PRE_CONTACT_STEPS.map((id, i) => ({ id, reached: preCounts[i] })),
        ...POST_CONTACT_STEPS.map((s, i) => ({ id: s.id, reached: postCounts[i] })),
        { id: "booked", reached: bookedCount }
      ];

      let prev = null;
      const steps = rawSteps.map((s) => {
        const pctOfPageViews = pageViews ? round1((s.reached / pageViews) * 100) : 0;
        const dropFromPrevPct = prev == null ? 0 : prev ? round1((1 - s.reached / prev) * 100) : 0;
        prev = s.reached;
        return { id: s.id, reached: s.reached, pctOfPageViews, dropFromPrevPct };
      });

      return { group: label, pageViews, leadsCreated: rows.length, booked: bookedCount, steps };
    })
    .sort((a, b) => b.pageViews - a.pageViews);

  return { from: from || null, to: to || null, groupedBy: validGroupBy, groups };
}

/**
 * Last N anonymous sessions with their full event trail, for debugging a
 * specific leak (e.g. "show me sessions that died at contact_viewed").
 */
export async function pcSessionsRecent({ limit = 20, droppedAt = null } = {}) {
  if (!hasKv()) return [];
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));
  // Overfetch a bit since droppedAt filtering happens after the trail fetch.
  const ids = await kvZRevRange("pcsessions:index", 0, safeLimit * 4 - 1);
  const sessions = await Promise.all(
    ids.map(async (sessionId) => {
      const trail = await getSessionTrail(sessionId);
      const first = trail[0] || null;
      const last = trail[trail.length - 1] || null;
      return {
        sessionId,
        eventCount: trail.length,
        firstSeenAt: first?.ts || null,
        lastSeenAt: last?.ts || null,
        droppedAt: last?.event || null,
        utmContent: first?.meta?.utmContent || null,
        device: first?.meta?.device || null,
        isWebview: !!first?.meta?.isWebview,
        trail
      };
    })
  );
  const filtered = droppedAt ? sessions.filter((s) => s.droppedAt === droppedAt) : sessions;
  return filtered.slice(0, safeLimit);
}
