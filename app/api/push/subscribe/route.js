/**
 * app/api/push/subscribe/route.js
 *
 * POST /api/push/subscribe
 *
 * Stores a Web Push PushSubscription in KV, keyed to the team member's wa_id.
 * Requires an authenticated admin session (verifyAdminSession).
 *
 * Key format: push:sub:{teamMemberId}  (teamMemberId == wa_id per 10-RESEARCH.md)
 *
 * Request body:
 *   { subscription: { endpoint, keys: { p256dh, auth } }, teamMemberId: string }
 *
 * No unsubscribe/DELETE handler — deferred to future phase (10-CONTEXT.md Deferred Ideas).
 */

export const runtime = "nodejs"; // KV + cookie reads need Node runtime

import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { hasKv, kvSet } from "@/lib/kv";

export async function POST(request) {
  // 1. Verify admin session — matches existing pattern in app/api/admin/me/route.js
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { subscription, teamMemberId } = body ?? {};

  // 3. Validate subscription shape and teamMemberId
  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth ||
    !teamMemberId
  ) {
    return Response.json({ error: "invalid subscription" }, { status: 400 });
  }

  // 4. KV availability guard — local no-op
  if (!hasKv()) {
    return Response.json({ error: "kv unavailable" }, { status: 503 });
  }

  // 5. Store subscription in KV (kvSet JSON.stringify's internally; store object directly)
  //    Key: push:sub:{teamMemberId} where teamMemberId == wa_id (10-RESEARCH.md)
  //    No TTL — subscriptions are permanent in V1 (10-CONTEXT.md locked decision)
  await kvSet(`push:sub:${teamMemberId}`, subscription);

  return Response.json({ ok: true });
}
