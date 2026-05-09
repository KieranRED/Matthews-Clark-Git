import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { hasKv } from "@/lib/kv";
import { getTeamMemberById, saveTeamMember, setTeamMemberPassword, TEAM_ROLES } from "@/lib/teamStore";

const PatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(TEAM_ROLES).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    email: z.string().trim().max(120).nullable().optional(),
    password: z.string().min(6).max(200).optional()
  })
  .strict();

export async function PATCH(request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasKv()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const json = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const id = String(params.id || "");
  const existing = await getTeamMemberById(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const { password, ...patch } = parsed.data;
  const next = await saveTeamMember({ ...existing, ...patch, id: existing.id });
  if (!next) return Response.json({ error: "Failed to update" }, { status: 500 });

  if (password) {
    await setTeamMemberPassword({ id: String(existing.id), password });
  }

  const { passwordHash, passwordSalt, ...safe } = next;
  return Response.json({ ok: true, member: safe });
}

export async function GET(_request, { params }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasKv()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const member = await getTeamMemberById(String(params.id || ""));
  if (!member) return Response.json({ error: "Not found" }, { status: 404 });
  const { passwordHash, passwordSalt, ...safe } = member;
  return Response.json({ ok: true, member: safe });
}

