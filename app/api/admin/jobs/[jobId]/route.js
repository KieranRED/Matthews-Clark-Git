import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getJob, updateJob } from "@/lib/jobStore";

const PatchSchema = z
  .object({
    status: z.enum(["scheduled", "in_progress", "completed", "canceled"]).optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    quoteAmount: z.coerce.number().finite().nonnegative().nullable().optional(),
    jobValue: z.coerce.number().finite().nonnegative().nullable().optional(),
    paidAmount: z.coerce.number().finite().nonnegative().nullable().optional(),
    paymentStatus: z.enum(["unpaid", "deposit", "paid"]).optional(),
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

  const job = await getJob(params.jobId);
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, job });
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
    const existing = await getJob(params.jobId);
    const notes = Array.isArray(existing?.notes) ? existing.notes.slice(0, 200) : [];
    notes.unshift({ at: new Date().toISOString(), by: session.username, text: patch.note.trim() });
    patch.notes = notes;
    delete patch.note;
  } else {
    delete patch.note;
  }

  const next = await updateJob(params.jobId, patch);
  if (!next) return Response.json({ error: "Failed to update job" }, { status: 500 });
  return Response.json({ ok: true, job: next });
}

