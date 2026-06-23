/**
 * app/api/webhooks/whatsapp/route.js
 *
 * GET  — Meta hub.challenge verification (webhook registration step)
 * POST — Inbound message receiver with HMAC-SHA256 verification
 *
 * IMPORTANT: `request.text()` is called BEFORE any JSON.parse.
 * Meta signs the raw request bytes; consuming the body as JSON first
 * (or re-serialising parsed JSON) will break the HMAC comparison.
 *
 * Processing is deferred via after() — the 200 response is sent
 * immediately, then all Neon writes happen after the response is flushed.
 * This keeps us well under Meta's 5-second timeout even on cold starts.
 */

export const runtime = "nodejs"; // crypto.createHmac is not available in Edge

import { after } from "next/server";
import crypto from "node:crypto";
import { processInboundMessage } from "@/lib/whatsappStore";
import { dispatchToTeam } from "@/lib/pushStore";

// ---------------------------------------------------------------------------
// GET — hub.challenge verification
// ---------------------------------------------------------------------------

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return Response.json({ error: "forbidden" }, { status: 403 });
}

// ---------------------------------------------------------------------------
// POST — message receiver
// ---------------------------------------------------------------------------

export async function POST(request) {
  // 1. Read raw body BEFORE any JSON.parse — Meta signs raw bytes (Pitfall 1)
  const rawBody = await request.text();

  // 2. Verify HMAC signature
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: "invalid signature" }, { status: 403 });
  }

  // 3. Schedule all async work to run AFTER the response is sent
  //    This guarantees < 500ms response time regardless of Neon latency (FOUND-03)
  after(async () => {
    try {
      const payload = JSON.parse(rawBody);
      await handlePayload(payload);
    } catch (err) {
      console.error("[webhook][whatsapp][after-error]", err);
    }
  });

  // 4. Return 200 immediately — before any DB or KV work
  return Response.json({ ok: true });
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 helper
// ---------------------------------------------------------------------------

/**
 * Verify the x-hub-signature-256 header against the raw request body.
 * Uses crypto.timingSafeEqual to prevent timing attacks (FOUND-01).
 *
 * @param {string} rawBody  - Raw request body as UTF-8 string
 * @param {string} signature - Value of x-hub-signature-256 header
 * @returns {boolean}
 */
function verifySignature(rawBody, signature) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature.startsWith("sha256=")) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  try {
    // timingSafeEqual throws if buffers have different lengths (Pitfall 6)
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false; // length mismatch — not equal
  }
}

// ---------------------------------------------------------------------------
// Payload processor — always loops (Meta can batch multiple events)
// ---------------------------------------------------------------------------

/**
 * Process a verified Meta webhook payload.
 * Loops over entry[].changes[] — never assume one message per POST.
 *
 * @param {object} payload - Parsed Meta webhook payload
 */
async function handlePayload(payload) {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const teamPhone = value?.metadata?.display_phone_number;
      const contactName = value?.contacts?.[0]?.profile?.name ?? null;

      // Inbound messages
      for (const msg of value?.messages ?? []) {
        const result = await processInboundMessage({
          wamid: msg.id,
          from: msg.from,
          to: teamPhone,
          type: msg.type,
          body: msg.type === "text" ? msg.text?.body : null,
          timestampMs: Number(msg.timestamp) * 1000,
          contactName,
        });

        // Dispatch push/Telegram notification to team (NOTIF-02)
        // Runs inside after() deferral — does not delay the 200 response (FOUND-03)
        if (result?.threadId) {
          const preview = (msg.type === "text" ? msg.text?.body : `[${msg.type}]`) || "";
          await dispatchToTeam({ threadId: result.threadId, contactName, preview });
        }
      }

      // Delivery receipts — log only in Phase 09 (outbound send is Phase 11)
      for (const status of value?.statuses ?? []) {
        console.log("[webhook][status]", status.id, status.status);
      }
    }
  }
}
