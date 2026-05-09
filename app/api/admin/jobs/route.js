import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { listJobs, saveJob } from "@/lib/jobStore";

const CreateJobSchema = z
  .object({
    clientId: z.string().trim().min(1),
    leadId: z.string().trim().optional().nullable(),
    services: z.array(z.string().trim()).default([]),
    scheduledAt: z.string().datetime().nullable().optional(),
    vehicle: z
      .object({
        make: z.string().trim().max(40).optional().nullable(),
        model: z.string().trim().max(40).optional().nullable(),
        year: z.string().trim().max(10).optional().nullable(),
        reg: z.string().trim().max(20).optional().nullable(),
        color: z.string().trim().max(30).optional().nullable()
      })
      .optional()
      .nullable()
  })
  .strict();

function ensureStorageConfigured() {
  return (
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ensureStorageConfigured()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 80)));
  const status = searchParams.get("status") || undefined;

  const jobs = await listJobs({ limit, status });
  return Response.json({ ok: true, jobs });
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ensureStorageConfigured()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const json = await request.json().catch(() => null);
  const parsed = CreateJobSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const job = await saveJob({
    ...parsed.data,
    status: "scheduled",
    notes: [{ at: new Date().toISOString(), by: session.username, text: "Created from CRM" }]
  });
  return Response.json({ ok: true, job });
}

