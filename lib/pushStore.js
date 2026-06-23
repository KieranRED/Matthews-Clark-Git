/**
 * lib/pushStore.js
 *
 * Server-side push notification dispatch layer.
 *
 * Exports:
 *   sendPushNotification(subscription, payload) — send to a single subscriber
 *   dispatchToTeam({ threadId, contactName, preview }) — fan-out to all active team members
 *
 * Fan-out strategy (per 10-CONTEXT.md):
 *   - Query team_numbers WHERE active = true
 *   - For each member with a KV subscription → web push
 *   - For each member without a KV subscription → Telegram fallback (NOTIF-04)
 *
 * Uses RELATIVE imports so this file is testable under `node --test`
 * outside the Next.js bundler (@/ alias does not resolve in plain node).
 * The webhook route imports via @/lib/pushStore — that resolves under Next.
 */

import webpush from "web-push";
import { db, hasNeon } from "./neon.js";
import { hasKv, kvGet, kvDel } from "./kv.js";
import { telegramSendMessage } from "./telegram.js";

// ---------------------------------------------------------------------------
// VAPID setup — runs once at module import
// Guard prevents throw when VAPID keys are absent locally
// ---------------------------------------------------------------------------
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:kierandeclanredpath@gmail.com", // NOT https://localhost — Safari rejects localhost (Pitfall 1)
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// ---------------------------------------------------------------------------
// sendPushNotification
// ---------------------------------------------------------------------------

/**
 * Send a Web Push notification to a single subscriber.
 *
 * @param {object} subscription - PushSubscription JSON { endpoint, keys: { p256dh, auth } }
 * @param {object} payload      - Notification payload object (will be JSON.stringify'd)
 * @returns {Promise<{ ok: boolean, gone?: boolean }>}
 */
export async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    // 410 Gone or 404 Not Found → subscription is stale; signal caller to prune it
    const gone = err.statusCode === 410 || err.statusCode === 404;
    console.error("[pushStore] sendPushNotification failed", {
      statusCode: err.statusCode,
      gone,
      endpoint: subscription?.endpoint?.slice(0, 60),
    });
    return { ok: false, gone };
  }
}

// ---------------------------------------------------------------------------
// dispatchToTeam
// ---------------------------------------------------------------------------

/**
 * Fan-out a notification to every active team member.
 *
 * For each member:
 *   - If KV has push:sub:{wa_id} → send web push
 *   - If no subscription → send Telegram fallback (NOTIF-04)
 *
 * No-ops locally when DATABASE_URL or KV env vars are not set.
 *
 * @param {{ threadId: string, contactName?: string, preview?: string }} params
 */
export async function dispatchToTeam({ threadId, contactName, preview } = {}) {
  // Local no-op guard — KV and Neon are blank on disk by design
  if (!hasNeon() || !hasKv()) {
    console.log("[pushStore] dispatchToTeam skipped — Neon or KV not available locally");
    return;
  }

  // Build the locked notification payload (10-CONTEXT.md)
  const url = `/admin/whatsapp?thread=${threadId}`;
  const payload = {
    title: "New WhatsApp",
    body: `${contactName ?? "Lead"}: ${(preview ?? "").slice(0, 80)}`,
    data: { threadId, url },
  };

  // Query all active team members from Neon
  let members;
  try {
    const sql = db();
    members = await sql`SELECT wa_id, display_name FROM team_numbers WHERE active = true`;
  } catch (err) {
    console.error("[pushStore] dispatchToTeam — failed to query team_numbers", err);
    return;
  }

  // Fan-out: push if subscribed, Telegram if not
  for (const member of members) {
    try {
      const sub = await kvGet(`push:sub:${member.wa_id}`);

      if (sub) {
        // Push path (NOTIF-02)
        const result = await sendPushNotification(sub, payload);
        if (result.gone) {
          // Stale subscription — prune from KV (410/404 Gone cleanup)
          await kvDel(`push:sub:${member.wa_id}`);
          console.log("[pushStore] pruned stale subscription for", member.wa_id);
        }
      } else {
        // Telegram fallback path (NOTIF-04)
        await telegramSendMessage({
          chatId: process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID,
          token: process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN,
          text: `\u{1F4AC} <b>New WhatsApp</b>\n<b>${contactName ?? "Lead"}</b>: ${(preview ?? "").slice(0, 200)}\n\n<a href="${process.env.NEXT_PUBLIC_BASE_URL ?? ""}${url}">Open thread</a>`,
        });
      }
    } catch (err) {
      // Per-member try/catch — one bad member must not abort the rest of the fan-out
      console.error("[pushStore] dispatchToTeam — error for member", member.wa_id, err);
    }
  }
}
