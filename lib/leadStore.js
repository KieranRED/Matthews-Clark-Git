import crypto from "node:crypto";

import { hasKv, kvDel, kvFetch, kvGet, kvKeys, kvSet, kvZAdd, kvZRem, kvZRevRange, kvZScore, maybeParseJson } from "./kv.js";

async function indexLead(lead) {
  if (!hasKv()) return;
  const createdAt = lead?.createdAt ? String(lead.createdAt) : new Date().toISOString();
  const score = Number.isFinite(Date.parse(createdAt)) ? Date.parse(createdAt) : Date.now();
  const leadId = encodeURIComponent(String(lead.id));
  // Sorted set index allows efficient "latest leads" listing.
  await kvZAdd("leads:index", score, String(lead.id));
}

export async function saveLead(lead) {
  if (!hasKv()) return;
  await kvSet(`lead:${lead.id}`, lead);
  try {
    await indexLead(lead);
  } catch (err) {
    console.error("[kv][indexLead-failed]", err);
  }
}

export async function getLead(id) {
  if (!hasKv()) return null;
  return maybeParseJson(await kvGet(`lead:${id}`));
}

export function normalizePhone(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  // Keep digits only, preserve leading + by converting +27... to 27...
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  // Common ZA normalization: 0XXXXXXXXX -> 27XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}

function normalizeEmail(input) {
  return String(input || "").trim().toLowerCase();
}

function vehicleKeyFromLabel(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeVehicles(existingList, nextLabel) {
  const vehicles = Array.isArray(existingList) ? existingList.slice(0, 50) : [];
  const label = String(nextLabel || "").trim();
  if (!label) return vehicles;
  const key = vehicleKeyFromLabel(label);
  const found = vehicles.find((v) => vehicleKeyFromLabel(v?.label) === key);
  if (found) return vehicles;
  // minimal vehicle record (portal can enrich later)
  vehicles.unshift({
    id: crypto.randomUUID(),
    label,
    key,
    createdAt: new Date().toISOString()
  });
  return vehicles;
}

async function getClientIdByPhoneNorm(phoneNorm) {
  if (!hasKv()) return null;
  if (!phoneNorm) return null;
  const id = maybeParseJson(await kvGet(`clientByPhone:${phoneNorm}`));
  if (!id) return null;
  return String(id);
}

async function saveClient(client) {
  if (!hasKv()) return;
  await kvSet(`client:${client.id}`, client);
  if (client.phoneNorm) {
    await kvSet(`clientByPhone:${client.phoneNorm}`, client.id);
  }
  if (client.email) {
    await kvSet(`clientByEmail:${normalizeEmail(client.email)}`, client.id);
  }
  try {
    const score = Number.isFinite(Date.parse(client.updatedAt || client.createdAt)) ? Date.parse(client.updatedAt || client.createdAt) : Date.now();
    await kvZAdd("clients:index", score, String(client.id));
  } catch (err) {
    console.error("[kv][indexClient-failed]", err);
  }
}

export async function getClient(clientId) {
  if (!hasKv()) return null;
  return maybeParseJson(await kvGet(`client:${clientId}`));
}

export async function getClientIdByEmail(email) {
  if (!hasKv()) return null;
  const e = normalizeEmail(email);
  if (!e) return null;
  const id = maybeParseJson(await kvGet(`clientByEmail:${e}`));
  if (!id) return null;
  return String(id);
}

async function mergeClientRecords({ primaryId, secondaryId }) {
  if (!hasKv()) return null;
  if (!primaryId || !secondaryId || primaryId === secondaryId) return null;

  const [a, b] = await Promise.all([getClient(primaryId), getClient(secondaryId)]);
  if (!a || !b) return null;

  const nowIso = new Date().toISOString();
  const merged = {
    ...b,
    ...a,
    id: primaryId,
    createdAt: a.createdAt || b.createdAt || nowIso,
    updatedAt: nowIso,
    phoneNorm: a.phoneNorm || b.phoneNorm || null,
    phone: a.phone || b.phone || null,
    email: a.email || b.email || null,
    name: a.name || b.name || null,
    leadCount: Number(a.leadCount || 0) + Number(b.leadCount || 0),
    vehicles: Array.isArray(a.vehicles) && a.vehicles.length ? a.vehicles : b.vehicles || []
  };

  // merge lead indexes
  try {
    const ids = await kvZRevRange(`client:${secondaryId}:leads`, 0, 500);
    const scoreNow = Date.now();
    for (const id of ids) await kvZAdd(`client:${primaryId}:leads`, scoreNow, String(id));
  } catch (err) {
    console.error("[kv][client-merge][leads-index-failed]", err);
  }

  await saveClient(merged);

  // remap lookup keys to primary
  if (merged.phoneNorm) await kvSet(`clientByPhone:${merged.phoneNorm}`, primaryId);
  if (merged.email) await kvSet(`clientByEmail:${normalizeEmail(merged.email)}`, primaryId);

  // delete secondary
  await kvDel(`client:${secondaryId}`);
  try {
    await kvZRem("clients:index", String(secondaryId));
  } catch {
    // ignore
  }
  return merged;
}

export async function updateClient(clientId, patch) {
  if (!hasKv()) return null;
  const existing = (await getClient(clientId)) || null;
  const base = existing && typeof existing === "object" ? existing : { id: clientId };
  const next = {
    ...base,
    ...patch,
    id: clientId,
    updatedAt: new Date().toISOString()
  };
  await saveClient(next);
  return next;
}

async function indexClientLead({ clientId, leadId, createdAt }) {
  if (!hasKv()) return;
  const score = Number.isFinite(Date.parse(createdAt)) ? Date.parse(createdAt) : Date.now();
  await kvZAdd(`client:${clientId}:leads`, score, String(leadId));
}

async function clientLeadAlreadyIndexed({ clientId, leadId }) {
  if (!hasKv()) return false;
  try {
    const res = await kvZScore(`client:${clientId}:leads`, String(leadId));
    return res !== null && res !== undefined && res !== false;
  } catch {
    return false;
  }
}

export async function upsertClientForLead(lead) {
  if (!hasKv()) return null;
  const phoneNorm = normalizePhone(lead?.number);
  const emailNorm = normalizeEmail(lead?.email);
  if (!phoneNorm && !emailNorm) return null;

  const nowIso = new Date().toISOString();
  const byPhoneId = phoneNorm ? await getClientIdByPhoneNorm(phoneNorm) : null;
  const byEmailId = emailNorm ? await getClientIdByEmail(emailNorm) : null;

  let primaryId = byPhoneId || byEmailId || null;
  let secondaryId = byPhoneId && byEmailId && byPhoneId !== byEmailId ? byEmailId : null;

  if (!primaryId) primaryId = crypto.randomUUID();
  if (secondaryId) await mergeClientRecords({ primaryId, secondaryId }).catch(() => null);

  const existing = await getClient(primaryId);

  const clientId = existing?.id ? String(existing.id) : primaryId;
  const createdAt = existing?.createdAt || nowIso;
  const already = lead?.id ? await clientLeadAlreadyIndexed({ clientId, leadId: lead.id }) : false;
  const leadCount = Number(existing?.leadCount || 0) + (already ? 0 : 1);

  const client = {
    id: clientId,
    createdAt,
    updatedAt: nowIso,
    phoneNorm: phoneNorm || existing?.phoneNorm || null,
    phone: lead?.number ? String(lead.number) : existing?.phone || null,
    email: lead?.email ? String(lead.email) : existing?.email || null,
    name: lead?.name ? String(lead.name) : existing?.name || null,
    lastLeadAt: nowIso,
    leadCount,
    vehicles: mergeVehicles(existing?.vehicles, lead?.car || "")
  };

  await saveClient(client);
  if (lead?.id) {
    await indexClientLead({ clientId, leadId: lead.id, createdAt: lead.createdAt || nowIso });
  }

  return client;
}

export async function listClientIds({ limit = 50 } = {}) {
  if (!hasKv()) return [];
  const safeLimit = Math.max(1, Math.min(2500, Number(limit) || 50));
  const res = await kvZRevRange("clients:index", 0, safeLimit - 1);
  if (res.length) return res.map((v) => String(v));

  const keys = await kvKeys("client:*");
  return keys
    .filter((k) => k.startsWith("client:") && !k.startsWith("clientByPhone:"))
    .map((k) => k.slice("client:".length))
    .slice(0, safeLimit);
}

export async function listClients({ limit = 50 } = {}) {
  const ids = await listClientIds({ limit });
  const clients = await Promise.all(ids.map((id) => getClient(id)));
  const filtered = clients.filter((c) => c && typeof c === "object");
  return filtered.sort((a, b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));
}

export async function listClientLeadIds({ clientId, limit = 50 } = {}) {
  if (!hasKv()) return [];
  if (!clientId) return [];
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const res = await kvZRevRange(`client:${clientId}:leads`, 0, safeLimit - 1);
  return res.map((v) => String(v));
}

export async function listLeadIds({ limit = 50 } = {}) {
  if (!hasKv()) return [];
  const safeLimit = Math.max(1, Math.min(2500, Number(limit) || 50));
  // Newest first.
  const res = await kvZRevRange("leads:index", 0, safeLimit - 1);
  if (res.length) return res.map((v) => String(v));

  // Fallback for older deployments that didn't write the index yet.
  // NOTE: KEYS can be slow at scale, but this CRM is small-volume.
  const keys = await kvKeys("lead:*");
  return keys
    .filter((k) => k.startsWith("lead:"))
    .map((k) => k.slice("lead:".length))
    .slice(0, safeLimit);
}

export async function listLeads({ limit = 50, status } = {}) {
  const ids = await listLeadIds({ limit });
  const leads = await Promise.all(ids.map((id) => getLead(id)));
  const filtered = leads.filter((l) => l && typeof l === "object");
  const sorted = filtered.sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
  if (status) return sorted.filter((l) => String(l.status || "").toLowerCase() === String(status).toLowerCase());
  return sorted;
}

// Thrown by updateLead() when a pipeline-stage transition is blocked by an
// unpaid milestone. A distinct class (not a generic Error) so callers can
// reliably tell "your update was invalid" apart from a real storage failure.
export class PcTransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = "PcTransitionError";
  }
}

// Enforced here — not in the admin dashboard route or the MCP server tool —
// because both call updateLead() directly and either one bypassing this
// check would silently defeat it. Paint-correction leads only: other
// services don't have a drop-off/pickup split and must not be blocked here.
function assertPcStatusTransition(next, status) {
  if (next.funnel !== "paint-correction") return;
  const pc = next.paintCorrection || {};
  if (status === "in_progress" && !pc.dropoffPaidAt) {
    throw new PcTransitionError("Cannot move this lead to in-bay: the drop-off payment hasn't been marked received yet (paintCorrection.dropoffPaidAt is required).");
  }
  if (status === "completed" && Number(pc.dueAtPickup) > 0 && !pc.pickupPaidAt) {
    throw new PcTransitionError("Cannot mark this lead delivered/complete: the pickup payment hasn't been marked received yet (paintCorrection.pickupPaidAt is required).");
  }
}

export async function updateLead(id, patch) {
  if (!hasKv()) return null;
  const existing = (await getLead(id)) || null;
  const base = existing && typeof existing === "object" ? existing : { id };
  const next = { ...base, ...patch, id };
  if (patch.status && patch.status !== base.status) {
    assertPcStatusTransition(next, patch.status);
  }
  await saveLead(next);
  return next;
}

export async function deleteLead(id) {
  if (!hasKv()) return { ok: false, error: "KV not configured" };
  const lead = await getLead(id);
  await kvDel(`lead:${id}`);
  try {
    await kvZRem("leads:index", String(id));
  } catch (err) {
    console.error("[kv][leads:index][zrem-failed]", err);
  }
  if (lead?.clientId) {
    try {
      await kvZRem(`client:${String(lead.clientId)}:leads`, String(id));
    } catch (err) {
      console.error("[kv][client:leads][zrem-failed]", err);
    }
  }
  return { ok: true, lead: lead || null };
}

export async function deleteClient(clientId) {
  if (!hasKv()) return { ok: false, error: "KV not configured" };
  const existing = await getClient(clientId);
  if (!existing) return { ok: false, error: "Not found" };

  await kvDel(`client:${clientId}`);
  try {
    await kvZRem("clients:index", String(clientId));
  } catch (err) {
    console.error("[kv][clients:index][zrem-failed]", err);
  }

  if (existing.phoneNorm) {
    try {
      await kvDel(`clientByPhone:${String(existing.phoneNorm)}`);
    } catch (err) {
      console.error("[kv][clientByPhone][del-failed]", err);
    }
  }
  if (existing.email) {
    try {
      await kvDel(`clientByEmail:${normalizeEmail(existing.email)}`);
    } catch (err) {
      console.error("[kv][clientByEmail][del-failed]", err);
    }
  }

  try {
    await kvDel(`client:${clientId}:leads`);
  } catch (err) {
    console.error("[kv][client:leads][del-failed]", err);
  }

  return { ok: true, client: existing };
}
