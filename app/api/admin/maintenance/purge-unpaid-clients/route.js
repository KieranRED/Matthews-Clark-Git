/**
 * POST /api/admin/maintenance/purge-unpaid-clients
 *
 * Deletes all client records whose leads have never had a deposit paid.
 * A "client" is only someone who has paid their first deposit — everyone
 * else is just a lead.
 *
 * Query params:
 *   ?dry=1   — preview only, don't delete (default: delete)
 *
 * Returns:
 *   { kept: [...], purged: [...], dryRun: bool }
 */

import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { listClients, listClientLeadIds, getLead, listLeads } from "@/lib/leadStore";
import { hasKv, kvDel, kvZRem } from "@/lib/kv";

export const dynamic = "force-dynamic";

const PAID_STATUSES = new Set(["deposit_paid", "paid"]);

async function getClientLeads(clientId) {
  let leadIds = await listClientLeadIds({ clientId, limit: 200 });
  if (!leadIds.length) {
    // Backward-compat: fallback scan.
    const all = await listLeads({ limit: 400 });
    leadIds = all.filter((l) => String(l?.clientId || "") === String(clientId)).map((l) => String(l.id));
  }
  return Promise.all(leadIds.map((id) => getLead(id)));
}

function hasDeposit(leads) {
  return leads.some((l) => l && PAID_STATUSES.has(String(l?.invoiceStatus || "")));
}

async function deleteClient(clientId, client) {
  if (!hasKv()) return;
  await kvDel(`client:${clientId}`);
  await kvZRem("clients:index", String(clientId)).catch(() => null);
  if (client?.phoneNorm) await kvDel(`clientByPhone:${client.phoneNorm}`).catch(() => null);
  if (client?.email) await kvDel(`clientByEmail:${String(client.email).trim().toLowerCase()}`).catch(() => null);
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasKv()) return Response.json({ error: "KV not configured." }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dry") === "1" || searchParams.get("dryRun") === "true";

  const clients = await listClients({ limit: 1000 });
  const kept = [];
  const purged = [];

  for (const client of clients) {
    if (!client?.id) continue;
    const leads = await getClientLeads(String(client.id));
    const paid = hasDeposit(leads);

    const summary = {
      id: String(client.id),
      name: client.name || null,
      email: client.email || null,
      phone: client.phone || null,
      leadCount: leads.length,
      invoiceStatuses: leads.map((l) => String(l?.invoiceStatus || "none")),
    };

    if (paid) {
      kept.push(summary);
    } else {
      purged.push(summary);
      if (!dryRun) {
        await deleteClient(String(client.id), client);
      }
    }
  }

  return Response.json({
    ok: true,
    dryRun,
    keptCount: kept.length,
    purgedCount: purged.length,
    kept,
    purged,
    by: session.username,
  });
}
