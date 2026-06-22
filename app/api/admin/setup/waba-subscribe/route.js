/**
 * app/api/admin/setup/waba-subscribe/route.js
 *
 * One-time WABA subscription activation endpoint.
 *
 * After the webhook URL is registered and verified in the Meta App Dashboard,
 * this endpoint must be called once to activate message delivery to the app.
 * Without this call, the webhook is registered but Meta does not send messages
 * (the "silent delivery gap" — FOUND-06).
 *
 * Required access token permissions:
 *   - whatsapp_business_management
 *   - whatsapp_business_messaging
 * Token type: System User permanent token (NOT the 24-hour developer token)
 *
 * Usage: POST /api/admin/setup/waba-subscribe  (admin-authed)
 *
 * On success, returns the subscribe result + a verification GET showing
 * the active subscription so the caller can confirm delivery is live.
 */

export const runtime = "nodejs";

import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

export async function POST() {
  // 1. Admin auth gate — verbatim from app/api/admin/seed/route.js
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Env guard — refuse if Meta creds are not configured (catches dev runs)
  const wabaId = process.env.WHATSAPP_WABA_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!wabaId || !accessToken) {
    return Response.json(
      { error: "WHATSAPP_WABA_ID or WHATSAPP_ACCESS_TOKEN not set" },
      { status: 400 }
    );
  }

  try {
    // 3. POST to Graph API to activate the app subscription for this WABA
    //    No request body required — the bearer token identifies the app.
    const subRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const subscribe = await subRes.json();

    // 4. Verify with GET so the caller can see the active subscription record
    const checkRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const verify = await checkRes.json();

    // 5. Return both results — subscribe.success === true confirms activation;
    //    verify.data[] shows the active app subscription entry.
    return Response.json({ ok: subRes.ok, subscribe, verify });
  } catch (err) {
    console.error("[waba-subscribe][graph-error]", err);
    return Response.json(
      { error: "graph request failed", detail: String(err) },
      { status: 502 }
    );
  }
}
