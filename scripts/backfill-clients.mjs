import { getClient, getLead, listClientIds, listLeadIds, updateClient, updateLead, upsertClientForLead } from "../lib/leadStore.js";
import { hasKv } from "../lib/kv.js";

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return fallback;
  return next;
}

function vehicleKeyFromLabel(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeVehicles(list) {
  const vehicles = Array.isArray(list) ? list.slice(0, 80) : [];
  const seen = new Set();
  const out = [];
  for (const v of vehicles) {
    if (!v || typeof v !== "object") continue;
    const label = String(v.label || "").trim();
    if (!label) continue;
    const key = vehicleKeyFromLabel(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...v, label, key });
  }
  return out;
}

const leadLimit = Math.max(1, Math.min(2500, Number(argValue("--leadLimit", "2500")) || 2500));
const clientLimit = Math.max(1, Math.min(2500, Number(argValue("--clientLimit", "2500")) || 2500));

if (!hasKv()) {
  console.error("KV not configured. Set KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).");
  process.exitCode = 1;
} else {
  const startedAt = Date.now();

  const leadIds = await listLeadIds({ limit: leadLimit });
  let leadsChecked = 0;
  let leadsReassigned = 0;
  let leadsPatched = 0;
  let leadsSkipped = 0;

  for (const id of leadIds) {
    const lead = await getLead(id);
    leadsChecked += 1;
    if (!lead || typeof lead !== "object") {
      leadsSkipped += 1;
      continue;
    }
    const beforeClientId = lead.clientId ? String(lead.clientId) : "";
    const client = await upsertClientForLead(lead);
    if (!client?.id) {
      leadsSkipped += 1;
      continue;
    }
    const afterClientId = String(client.id);

    if (!beforeClientId || beforeClientId !== afterClientId) {
      await updateLead(id, { clientId: afterClientId, clientLeadCount: client.leadCount || null, updatedAt: new Date().toISOString() });
      leadsPatched += 1;
      if (beforeClientId && beforeClientId !== afterClientId) leadsReassigned += 1;
    }
  }

  const clientIds = await listClientIds({ limit: clientLimit });
  let clientsChecked = 0;
  let clientsUpdated = 0;
  let clientsSkipped = 0;

  for (const id of clientIds) {
    const client = await getClient(id);
    clientsChecked += 1;
    if (!client || typeof client !== "object") {
      clientsSkipped += 1;
      continue;
    }
    const nextVehicles = dedupeVehicles(client.vehicles);
    const prevVehicles = Array.isArray(client.vehicles) ? client.vehicles : [];
    const needsVehicleUpdate =
      nextVehicles.length !== prevVehicles.length ||
      nextVehicles.some((v, i) => String(v?.key || "") !== String(prevVehicles?.[i]?.key || ""));
    if (needsVehicleUpdate) {
      await updateClient(String(client.id), { vehicles: nextVehicles });
    } else {
      await updateClient(String(client.id), {});
    }
    clientsUpdated += 1;
  }

  const ms = Date.now() - startedAt;
  console.log(
    JSON.stringify(
      {
        ok: true,
        leadLimit,
        clientLimit,
        leads: { checked: leadsChecked, patched: leadsPatched, reassigned: leadsReassigned, skipped: leadsSkipped },
        clients: { checked: clientsChecked, updated: clientsUpdated, skipped: clientsSkipped },
        tookMs: ms
      },
      null,
      2
    )
  );
}

