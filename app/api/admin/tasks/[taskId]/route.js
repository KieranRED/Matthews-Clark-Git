import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getTask, updateTask } from "@/lib/taskStore";

const PatchSchema = z
  .object({
    status: z.enum(["open", "done", "canceled"]).optional(),
    dueAt: z.string().datetime().nullable().optional(),
    assignedTo: z.string().trim().max(80).nullable().optional(),
    note: z.string().trim().max(2000).optional()
  })
  .strict();

function ensureStorageConfigured() {
  return (
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

export async function GET(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ensureStorageConfigured()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const task = await getTask(params.taskId);
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, task });
}

export async function PATCH(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ensureStorageConfigured()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const json = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const patch = { ...parsed.data };
  if (typeof patch.note === "string" && patch.note.trim()) {
    const existing = await getTask(params.taskId);
    const notes = Array.isArray(existing?.notes) ? existing.notes.slice(0, 200) : [];
    notes.unshift({ at: new Date().toISOString(), by: session.username, text: patch.note.trim() });
    patch.notes = notes;
    delete patch.note;
  } else {
    delete patch.note;
  }

  if (patch.status === "done") {
    patch.completedAt = new Date().toISOString();
  }

  const next = await updateTask(params.taskId, patch);
  if (!next) return Response.json({ error: "Failed to update task" }, { status: 500 });
  return Response.json({ ok: true, task: next });
}

