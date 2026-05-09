import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";

export const dynamic = "force-dynamic";

export async function POST(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const existing = lead?.consultation && typeof lead.consultation === "object" ? lead.consultation : {};
  const updated = await updateLead(leadId, {
    consultation: {
      ...(existing || {}),
      required: true,
      status: existing?.status === "scheduled" || existing?.status === "done" ? existing.status : "needed",
      neededAt: existing?.neededAt || nowIso,
      neededBy: session.username
    },
    updatedAt: nowIso
  });

  return Response.json({ ok: true, leadId, lead: updated });
}

