import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, listLeadIds, updateLead, upsertClientForLead } from "@/lib/leadStore";

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(300, Number(searchParams.get("limit") || 200)));

  const ids = await listLeadIds({ limit });
  let updated = 0;
  let skipped = 0;

  for (const id of ids) {
    const lead = await getLead(id);
    if (!lead || typeof lead !== "object") {
      skipped += 1;
      continue;
    }
    if (lead.clientId) {
      skipped += 1;
      continue;
    }
    const client = await upsertClientForLead(lead);
    if (!client?.id) {
      skipped += 1;
      continue;
    }
    await updateLead(id, { clientId: client.id, clientLeadCount: client.leadCount || null });
    updated += 1;
  }

  return Response.json({ ok: true, checked: ids.length, updated, skipped, by: session.username });
}

