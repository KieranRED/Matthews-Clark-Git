import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";
import { ensureExecution, EXEC_STEP_STATUSES, updateExecutionStep, upsertExecutionNote } from "@/lib/executionModel";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    action: z.enum(["init", "step", "note"]),
    stepId: z.string().trim().max(80).optional(),
    status: z.enum(EXEC_STEP_STATUSES).optional(),
    text: z.string().trim().min(1).max(2000).optional()
  })
  .strict();

export async function GET(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true, leadId, execution: lead.execution || null });
}

export async function POST(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const by = session.username;
  const existing = lead.execution && typeof lead.execution === "object" ? lead.execution : null;
  let next = ensureExecution(lead, by);

  if (parsed.data.action === "init") {
    // noop, ensureExecution already did it
  } else if (parsed.data.action === "note") {
    next = upsertExecutionNote(next, { by, text: parsed.data.text || "" });
  } else if (parsed.data.action === "step") {
    if (!parsed.data.stepId) return Response.json({ error: "Missing stepId" }, { status: 400 });
    if (!parsed.data.status) return Response.json({ error: "Missing status" }, { status: 400 });
    next = updateExecutionStep(next, { stepId: parsed.data.stepId, status: parsed.data.status, by });
  }

  const nowIso = new Date().toISOString();
  const updated = await updateLead(leadId, {
    execution: next,
    updatedAt: nowIso
  });

  return Response.json({ ok: true, leadId, execution: updated?.execution || next, previous: existing });
}
