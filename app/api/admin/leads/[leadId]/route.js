import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { deleteLead, getLead, updateLead } from "@/lib/leadStore";
import { kvZRevRange } from "@/lib/kv";
import { deleteJob, listJobs } from "@/lib/jobStore";
import { saveTask } from "@/lib/taskStore";
import { deleteTask } from "@/lib/taskStore";
import { ensureExecution } from "@/lib/executionModel";

const PatchSchema = z
  .object({
    status: z
      .enum(["new", "called", "quoted", "booked", "in_progress", "completed", "lost"])
      .optional(),
    assignedTo: z.string().trim().max(80).nullable().optional(),
    followUpAt: z.string().datetime().nullable().optional(),
    lostReason: z.string().trim().max(500).nullable().optional(),
    quoteAmount: z.coerce.number().finite().nonnegative().nullable().optional(),
    jobValue: z.coerce.number().finite().nonnegative().nullable().optional(),
    invoiceReference: z.string().trim().max(60).nullable().optional(),
    clientAddress: z.string().trim().max(500).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    note: z.string().trim().max(2000).optional()
  })
  .strict();

export async function GET(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const lead = await getLead(params.leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, lead });
}

export async function PATCH(request, { params }) {
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
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const patch = { ...parsed.data };

  const nowIso = new Date().toISOString();
  const existingLead = (await getLead(params.leadId)) || null;
  if (patch.status === "called") {
    patch.calledAt = nowIso;
    patch.calledByName = session.username;
  } else if (patch.status === "quoted") {
    patch.quotedAt = nowIso;
    patch.quotedBy = session.username;
  } else if (patch.status === "booked") {
    patch.bookedAt = nowIso;
    patch.bookedBy = session.username;
  } else if (patch.status === "in_progress") {
    patch.startedAt = nowIso;
    if (!existingLead?.execution) {
      patch.execution = ensureExecution(existingLead || {}, session.username);
    }
  } else if (patch.status === "completed") {
    patch.completedAt = nowIso;
  } else if (patch.status === "lost") {
    patch.lostAt = nowIso;
    patch.lostBy = session.username;
  }
  if (typeof patch.note === "string" && patch.note.trim()) {
    const notes = Array.isArray(existingLead?.notes) ? existingLead.notes.slice(0, 200) : [];
    notes.unshift({ at: nowIso, by: session.username, text: patch.note.trim() });
    patch.notes = notes;
    delete patch.note;
  } else {
    delete patch.note;
  }

  const next = await updateLead(params.leadId, patch);
  if (!next) return Response.json({ error: "Failed to update lead" }, { status: 500 });

  // Auto-create a follow-up task when followUpAt is set.
  if (patch.followUpAt) {
    try {
      await saveTask({
        title: `Follow up: ${next.name || "Client"} (${next.number || "—"})`,
        dueAt: patch.followUpAt,
        leadId: next.id,
        clientId: next.clientId || null,
        assignedTo: next.assignedTo || null,
        notes: [{ at: nowIso, by: session.username, text: "Created from lead follow-up" }]
      });
    } catch (err) {
      console.error("[admin][lead][followup-task-failed]", err);
    }
  }
  return Response.json({ ok: true, lead: next });
}

export async function DELETE(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const leadId = String(params.leadId || "");
  if (!leadId) return Response.json({ error: "Missing leadId" }, { status: 400 });

  // Delete lead itself (and remove from indexes).
  const lead = await getLead(leadId);
  await deleteLead(leadId);

  // Best-effort cleanup: delete tasks attached to this lead.
  try {
    const taskIds = await kvZRevRange(`lead:${leadId}:tasks`, 0, 200);
    await Promise.all(taskIds.map((id) => deleteTask(String(id))));
  } catch (err) {
    console.error("[admin][lead-delete][tasks-cleanup-failed]", err);
  }

  // Best-effort cleanup: delete any job records linked to this lead.
  try {
    const jobs = await listJobs({ limit: 500 });
    const mine = jobs.filter((j) => String(j?.leadId || "") === leadId);
    await Promise.all(mine.map((j) => deleteJob(String(j.id))));
  } catch (err) {
    console.error("[admin][lead-delete][jobs-cleanup-failed]", err);
  }

  console.log("[admin][lead-delete]", { leadId, by: session.username });
  return Response.json({ ok: true, leadId, deleted: true, lead: lead || null });
}
