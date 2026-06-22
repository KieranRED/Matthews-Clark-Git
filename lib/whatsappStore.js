/**
 * lib/whatsappStore.js
 *
 * All Neon read/write ops for the WhatsApp integration.
 * Route handlers stay thin and call into this module.
 *
 * Guards:
 * - hasNeon() → no DATABASE_URL locally; all write paths no-op safely
 * - hasKv()   → no KV env locally; resolveCrmLink returns null ids
 *
 * Phone normalisation: always call normalizePhone() from leadStore (FOUND-04).
 * Idempotency: ON CONFLICT (wamid) DO NOTHING (FOUND-01, safe for Meta at-least-once delivery).
 * Auto-link: clientByPhone:{normalizedPhone} KV index (FOUND-05).
 */

import { db, hasNeon } from "./neon.js";
import { normalizePhone } from "./leadStore.js";
import { hasKv, kvGet, kvZRevRange } from "./kv.js";

// ---------------------------------------------------------------------------
// resolveCrmLink
// ---------------------------------------------------------------------------

/**
 * Look up the CRM client and most-recent lead for a normalised phone number.
 * Returns { crmClientId, crmLeadId } — both null when no match or KV unavailable.
 *
 * @param {string} contactWaId - Already-normalised phone (27XXXXXXXXX)
 */
export async function resolveCrmLink(contactWaId) {
  if (!hasKv()) return { crmClientId: null, crmLeadId: null };

  const clientId = await kvGet(`clientByPhone:${contactWaId}`);
  if (!clientId) return { crmClientId: null, crmLeadId: null };

  const recent = await kvZRevRange(`client:${clientId}:leads`, 0, 0);
  const crmLeadId = recent[0] || null;

  return { crmClientId: String(clientId), crmLeadId };
}

// ---------------------------------------------------------------------------
// upsertThread
// ---------------------------------------------------------------------------

/**
 * Insert or update the whatsapp_threads row for a sender+team pair.
 * ON CONFLICT updates last_message_at, preview, and increments unread_count.
 * crm_client_id / crm_lead_id are set on first insert; COALESCE preserves
 * existing links if the row already exists.
 *
 * @returns {Promise<string>} thread UUID
 */
export async function upsertThread({
  contactWaId,
  teamWaId,
  contactName,
  lastMessageAt,
  preview,
  crmClientId,
  crmLeadId,
}) {
  const sql = db();
  const rows = await sql`
    INSERT INTO whatsapp_threads
      (contact_wa_id, team_wa_id, contact_name, crm_client_id, crm_lead_id, last_message_at, last_message_preview, unread_count)
    VALUES (${contactWaId}, ${teamWaId}, ${contactName}, ${crmClientId}, ${crmLeadId}, ${lastMessageAt}, ${preview}, 1)
    ON CONFLICT (contact_wa_id, team_wa_id) DO UPDATE SET
      last_message_at = EXCLUDED.last_message_at,
      last_message_preview = EXCLUDED.last_message_preview,
      unread_count = whatsapp_threads.unread_count + 1,
      contact_name = COALESCE(EXCLUDED.contact_name, whatsapp_threads.contact_name),
      crm_client_id = COALESCE(whatsapp_threads.crm_client_id, EXCLUDED.crm_client_id),
      crm_lead_id = COALESCE(whatsapp_threads.crm_lead_id, EXCLUDED.crm_lead_id)
    RETURNING id
  `;
  return rows[0].id;
}

// ---------------------------------------------------------------------------
// insertInboundMessage
// ---------------------------------------------------------------------------

/**
 * Insert a single inbound message row.
 * ON CONFLICT (wamid) DO NOTHING — safe for Meta at-least-once delivery.
 * A second call with the same wamid inserts no second row.
 */
export async function insertInboundMessage({
  wamid,
  threadId,
  fromWaId,
  toWaId,
  messageType,
  body,
  timestampMs,
}) {
  const sql = db();
  await sql`
    INSERT INTO whatsapp_messages
      (wamid, thread_id, direction, from_wa_id, to_wa_id, message_type, body, timestamp_ms)
    VALUES (${wamid}, ${threadId}, 'inbound', ${fromWaId}, ${toWaId}, ${messageType}, ${body}, ${timestampMs})
    ON CONFLICT (wamid) DO NOTHING
  `;
}

// ---------------------------------------------------------------------------
// processInboundMessage (orchestrator — called by the webhook route)
// ---------------------------------------------------------------------------

/**
 * Normalise phones, resolve CRM link, upsert thread, and insert message.
 * Returns { threadId, crmLeadId, crmClientId } or undefined when no DATABASE_URL.
 *
 * @param {{ wamid, from, to, type, body, timestampMs, contactName }} params
 */
export async function processInboundMessage({
  wamid,
  from,
  to,
  type,
  body,
  timestampMs,
  contactName,
}) {
  if (!hasNeon()) {
    console.warn("[whatsappStore] DATABASE_URL not set; skipping");
    return;
  }

  // FOUND-04: normalise at write time — not in the route handler
  const contactWaId = normalizePhone(from);
  const teamWaId = normalizePhone(to);

  // FOUND-05: auto-link to CRM via existing clientByPhone index
  const { crmClientId, crmLeadId } = await resolveCrmLink(contactWaId);

  const lastMessageAt = new Date(Number(timestampMs)).toISOString();
  const preview = (body || `[${type}]`).slice(0, 200);

  const threadId = await upsertThread({
    contactWaId,
    teamWaId,
    contactName: contactName || null,
    lastMessageAt,
    preview,
    crmClientId,
    crmLeadId,
  });

  await insertInboundMessage({
    wamid,
    threadId,
    fromWaId: contactWaId,
    toWaId: teamWaId,
    messageType: type,
    body: body || null,
    timestampMs: Number(timestampMs),
  });

  return { threadId, crmLeadId, crmClientId };
}

// ---------------------------------------------------------------------------
// linkThreadToLead (re-linking / backfill — used in future phases)
// ---------------------------------------------------------------------------

/**
 * Update a thread's CRM link after the fact (e.g. a lead is created post-chat).
 *
 * @param {string} threadId - UUID of the whatsapp_threads row
 * @param {{ crmClientId: string|null, crmLeadId: string|null }} link
 */
export async function linkThreadToLead(threadId, { crmClientId, crmLeadId }) {
  if (!hasNeon()) return;
  const sql = db();
  await sql`
    UPDATE whatsapp_threads
    SET crm_client_id = ${crmClientId},
        crm_lead_id   = ${crmLeadId}
    WHERE id = ${threadId}
  `;
}

// ---------------------------------------------------------------------------
// findOrCreateThread (convenience — used in tests and future phases)
// ---------------------------------------------------------------------------

/**
 * Return the thread UUID for a contact+team pair, creating one if needed.
 * Delegates to upsertThread with minimal fields.
 */
export async function findOrCreateThread({ contactWaId, teamWaId, contactName }) {
  if (!hasNeon()) return null;
  return upsertThread({
    contactWaId,
    teamWaId,
    contactName: contactName || null,
    lastMessageAt: new Date().toISOString(),
    preview: null,
    crmClientId: null,
    crmLeadId: null,
  });
}

// ---------------------------------------------------------------------------
// getThreadMessages (read path — used by chat UI in Phase 11+)
// ---------------------------------------------------------------------------

/**
 * Return messages for a thread in chronological order (oldest first).
 *
 * @param {string} threadId - UUID
 * @param {{ limit?: number }} options
 * @returns {Promise<object[]>}
 */
export async function getThreadMessages(threadId, { limit = 50 } = {}) {
  if (!hasNeon()) return [];
  const sql = db();
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  const rows = await sql`
    SELECT id, wamid, direction, from_wa_id, to_wa_id, message_type, body, media_url, timestamp_ms, created_at
    FROM whatsapp_messages
    WHERE thread_id = ${threadId}
    ORDER BY timestamp_ms ASC
    LIMIT ${safeLimit}
  `;
  return rows;
}
