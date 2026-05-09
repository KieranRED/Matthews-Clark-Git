import { cookies } from "next/headers";
import crypto from "node:crypto";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { deleteClient, getClient, getLead, listClientLeadIds, updateClient } from "@/lib/leadStore";

const PatchSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    tag: z.string().trim().min(1).max(30).optional(),
    vehicle: z
      .object({
        make: z.string().trim().max(40),
        model: z.string().trim().max(40),
        year: z.string().trim().max(10).optional().nullable(),
        reg: z.string().trim().max(20).optional().nullable(),
        color: z.string().trim().max(30).optional().nullable()
      })
      .optional(),
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

  const client = await getClient(params.clientId);
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });

  const leadIds = await listClientLeadIds({ clientId: params.clientId, limit: 50 });
  const leads = (await Promise.all(leadIds.map((id) => getLead(id)))).filter(Boolean);

  return Response.json({ ok: true, client, leads });
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

  const existing = await getClient(params.clientId);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch = {};
  if (typeof parsed.data.name === "string") patch.name = parsed.data.name;

  if (parsed.data.tag) {
    const tags = Array.isArray(existing.tags) ? existing.tags.slice(0, 50) : [];
    if (!tags.includes(parsed.data.tag)) tags.unshift(parsed.data.tag);
    patch.tags = tags.slice(0, 20);
  }

  if (parsed.data.vehicle) {
    const vehicles = Array.isArray(existing.vehicles) ? existing.vehicles.slice(0, 50) : [];
    vehicles.unshift({ id: crypto.randomUUID?.() || `${Date.now()}`, ...parsed.data.vehicle, addedAt: new Date().toISOString() });
    patch.vehicles = vehicles.slice(0, 20);
  }

  if (typeof parsed.data.note === "string" && parsed.data.note.trim()) {
    const notes = Array.isArray(existing.notes) ? existing.notes.slice(0, 200) : [];
    notes.unshift({ at: new Date().toISOString(), by: session.username, text: parsed.data.note.trim() });
    patch.notes = notes;
  }

  const next = await updateClient(params.clientId, patch);
  if (!next) return Response.json({ error: "Failed to update client" }, { status: 500 });
  return Response.json({ ok: true, client: next });
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

  const res = await deleteClient(params.clientId);
  if (!res?.ok) return Response.json({ error: res?.error || "Failed to delete client" }, { status: res?.error === "Not found" ? 404 : 500 });
  return Response.json({ ok: true, client: res.client || null });
}
