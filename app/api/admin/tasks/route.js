import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { listTasks, saveTask } from "@/lib/taskStore";

const CreateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    dueAt: z.string().datetime().nullable().optional(),
    clientId: z.string().trim().optional().nullable(),
    leadId: z.string().trim().optional().nullable(),
    assignedTo: z.string().trim().max(80).optional().nullable()
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

  const tasks = await listTasks({ limit, status });
  return Response.json({ ok: true, tasks });
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!ensureStorageConfigured()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const json = await request.json().catch(() => null);
  const parsed = CreateTaskSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const task = await saveTask({
    ...parsed.data,
    status: "open",
    notes: [{ at: new Date().toISOString(), by: session.username, text: "Created from CRM" }]
  });
  return Response.json({ ok: true, task });
}

