import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { deleteLead, listLeads } from "@/lib/leadStore";

const BodySchema = z
  .object({
    confirm: z.string().trim().min(1),
    names: z.array(z.string().trim().min(1).max(80)).min(1).max(40)
  })
  .strict();

function normName(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

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

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  if (parsed.data.confirm !== "PURGE_TEST_LEADS") {
    return Response.json({ error: "Missing confirmation (confirm must equal PURGE_TEST_LEADS)" }, { status: 400 });
  }

  const wanted = new Set(parsed.data.names.map(normName));
  const leads = await listLeads({ limit: 400 });
  const toDelete = leads.filter((l) => wanted.has(normName(l?.name)));

  const deleted = [];
  for (const lead of toDelete) {
    if (!lead?.id) continue;
    try {
      const res = await deleteLead(String(lead.id));
      if (res?.ok) deleted.push({ id: String(lead.id), name: lead?.name || null });
    } catch (err) {
      console.error("[maintenance][purge-test-leads][delete-failed]", { leadId: lead?.id, err });
    }
  }

  return Response.json({ ok: true, requestedNames: parsed.data.names, matched: toDelete.length, deleted });
}

