import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";
import { pcSendOrEditChaseMessage } from "@/lib/pcChase";

export const dynamic = "force-dynamic";

// Marks the paint-correction drop-off payment as received. Nothing in the
// funnel/EFT flow sets this automatically — the drop-off amount is settled
// in person (or however the team collects it), so a human confirms it here.
// This is what unblocks the lead's transition to "in_progress" (in-bay) —
// see the guard in lib/leadStore.js's updateLead().
export async function POST(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
  if (lead.funnel !== "paint-correction") {
    return Response.json({ error: "Not a paint-correction lead" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const pc = lead.paintCorrection || {};
  const updated = await updateLead(leadId, {
    paintCorrection: { ...pc, dropoffPaidAt: nowIso },
    updatedAt: nowIso
  });

  if (pc.telegramMessageId) {
    try {
      await pcSendOrEditChaseMessage({ lead: updated, trigger: pc.telegramSentTrigger || "bounce" });
    } catch (err) {
      console.error("[pc-mark-dropoff-paid][chase-edit-failed]", err);
    }
  }

  return Response.json({ ok: true, leadId, lead: updated });
}
