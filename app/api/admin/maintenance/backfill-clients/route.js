import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getClient, listClientIds, getLead, listLeadIds, updateClient, updateLead, upsertClientForLead } from "@/lib/leadStore";
import { hasKv, kvZRem } from "@/lib/kv";

export const dynamic = "force-dynamic";

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

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasKv()) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const leadLimit = Math.max(1, Math.min(900, Number(searchParams.get("leadLimit") || 600)));
  const clientLimit = Math.max(1, Math.min(1200, Number(searchParams.get("clientLimit") || 900)));

  // 1) Walk leads and ensure client linking is correct (phone/email merge logic + car->garage).
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
      if (beforeClientId && beforeClientId !== afterClientId) {
        leadsReassigned += 1;
        try {
          await kvZRem(`client:${beforeClientId}:leads`, String(id));
        } catch (err) {
          console.error("[backfill-clients][kv][zrem-old-client-lead-failed]", err);
        }
      }
    }
  }

  // 2) Resave clients to ensure clientByEmail index + dedup vehicles (adds `key`).
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
      clientsUpdated += 1;
    } else {
      // Touch-save to ensure indexes (clientByEmail/clientByPhone) exist.
      await updateClient(String(client.id), {});
      clientsUpdated += 1;
    }
  }

  return Response.json({
    ok: true,
    leadLimit,
    clientLimit,
    leads: { checked: leadsChecked, patched: leadsPatched, reassigned: leadsReassigned, skipped: leadsSkipped },
    clients: { checked: clientsChecked, updated: clientsUpdated, skipped: clientsSkipped },
    by: session.username
  });
}

