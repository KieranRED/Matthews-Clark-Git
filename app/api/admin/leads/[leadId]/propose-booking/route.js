import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    slots: z.array(z.string().datetime()).min(1).max(6),
    notes: z.string().trim().max(1500).optional().default("")
  })
  .strict();

export async function POST(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const existing = lead?.booking && typeof lead.booking === "object" ? lead.booking : {};
  const patch = {
    booking: {
      ...(existing || {}),
      status: existing?.status === "scheduled" ? "scheduled" : "proposed",
      proposedSlots: parsed.data.slots,
      proposedAt: nowIso,
      proposedBy: session.username,
      notes: parsed.data.notes || "",
      updatedAt: nowIso
    },
    updatedAt: nowIso
  };

  const updated = await updateLead(leadId, patch);
  return Response.json({ ok: true, leadId, lead: updated });
}

