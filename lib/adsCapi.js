// Server-side conversion tracking (Conversions API) for Meta and TikTok.
//
// Mirrors the browser pixel "Lead" event so conversions still land when the
// pixel is blocked (ad blockers, iOS, etc.). The shared `eventId` lets each
// platform dedupe the server event against the browser event.
//
// Entirely env-gated: if the access token for a platform is absent, that
// platform is skipped. Failures are swallowed by the caller — tracking must
// never break lead capture.

import crypto from "node:crypto";

const META_GRAPH_VERSION = "v21.0";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Hash an email per platform spec: trimmed + lowercased. */
function hashEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  return norm ? sha256(norm) : null;
}

/** Hash a phone: digits only (incl. country code), no leading + or spaces. */
function hashPhone(phoneDigits) {
  const norm = String(phoneDigits || "").replace(/[^\d]/g, "");
  return norm ? sha256(norm) : null;
}

function firstIp(request) {
  const xff = request?.headers?.get?.("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || null;
}

async function sendMetaLead({ pixelId, accessToken, testEventCode, eventId, email, phoneDigits, fbp, fbc, ip, userAgent, sourceUrl }) {
  const userData = {};
  const em = hashEmail(email);
  const ph = hashPhone(phoneDigits);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  if (ip) userData.client_ip_address = ip;
  if (userAgent) userData.client_user_agent = userAgent;

  const body = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || undefined,
        action_source: "website",
        event_source_url: sourceUrl || undefined,
        user_data: userData
      }
    ],
    access_token: accessToken
  };
  if (testEventCode) body.test_event_code = testEventCode;

  const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta CAPI ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

async function sendTiktokLead({ pixelId, accessToken, eventId, email, phoneDigits, ttclid, ip, userAgent, sourceUrl }) {
  const user = {};
  const em = hashEmail(email);
  const ph = hashPhone(phoneDigits);
  if (em) user.email = em;
  if (ph) user.phone = ph;
  if (ttclid) user.ttclid = ttclid;
  if (ip) user.ip = ip;
  if (userAgent) user.user_agent = userAgent;

  const body = {
    event_source: "web",
    event_source_id: pixelId,
    data: [
      {
        event: "SubmitForm",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || undefined,
        user,
        page: sourceUrl ? { url: sourceUrl } : undefined
      }
    ]
  };

  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
    method: "POST",
    headers: { "content-type": "application/json", "Access-Token": accessToken },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TikTok CAPI ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * Fire Lead conversions to whichever platforms are configured. Resolves to a
 * per-platform status map; never throws.
 */
export async function sendLeadConversions({ lead, request }) {
  const ip = firstIp(request);
  const userAgent = request?.headers?.get?.("user-agent") || null;
  const sourceUrl = lead?.pageUrl || null;
  const eventId = lead?.eventId || null;
  const email = lead?.email || null;
  const phoneDigits = lead?.number || null;
  const clickIds = lead?.clickIds && typeof lead.clickIds === "object" ? lead.clickIds : {};

  const results = {};

  const metaPixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const metaToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (metaPixelId && metaToken) {
    try {
      await sendMetaLead({
        pixelId: metaPixelId,
        accessToken: metaToken,
        testEventCode: process.env.META_TEST_EVENT_CODE || null,
        eventId,
        email,
        phoneDigits,
        fbp: clickIds.fbp || null,
        fbc: clickIds.fbc || null,
        ip,
        userAgent,
        sourceUrl
      });
      results.meta = "ok";
    } catch (err) {
      results.meta = `error: ${err?.message || err}`;
    }
  }

  const tiktokPixelId = process.env.TIKTOK_PIXEL_ID || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const tiktokToken = process.env.TIKTOK_CAPI_ACCESS_TOKEN;
  if (tiktokPixelId && tiktokToken) {
    try {
      await sendTiktokLead({
        pixelId: tiktokPixelId,
        accessToken: tiktokToken,
        eventId,
        email,
        phoneDigits,
        ttclid: clickIds.ttclid || null,
        ip,
        userAgent,
        sourceUrl
      });
      results.tiktok = "ok";
    } catch (err) {
      results.tiktok = `error: ${err?.message || err}`;
    }
  }

  return results;
}
