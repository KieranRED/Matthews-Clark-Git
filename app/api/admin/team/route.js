import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { hasKv } from "@/lib/kv";
import { listLeads } from "@/lib/leadStore";
import { createTeamMemberWithPassword, listTeamMembers, TEAM_ROLES } from "@/lib/teamStore";

export const dynamic = "force-dynamic";

const CreateSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    username: z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9._-]+$/),
    password: z.string().min(6).max(200),
    role: z.enum(TEAM_ROLES),
    phone: z.string().trim().max(40).optional().nullable(),
    email: z.string().trim().max(120).optional().nullable()
  })
  .strict();

function statsForMember({ member, leads }) {
  const username = String(member?.username || "").toLowerCase();
  const name = String(member?.name || "").toLowerCase();
  const role = String(member?.role || "");

  let called = 0;
  let booked = 0;
  let delivered = 0;
  let quoted = 0;
  let izimotoQuotes = 0;

  for (const l of leads) {
    if (!l) continue;
    const calledBy = String(l.calledByName || "").toLowerCase();
    const bookedBy = String(l.bookedBy || "").toLowerCase();
    const quotedBy = String(l.quotedBy || "").toLowerCase();
    const isMine = calledBy === username || calledBy === name || bookedBy === username || bookedBy === name || quotedBy === username || quotedBy === name;

    if (calledBy === username || calledBy === name) called++;
    if (bookedBy === username || bookedBy === name) booked++;
    if (quotedBy === username || quotedBy === name) quoted++;
    if (String(l.status || "") === "completed") delivered++;

    if (role.startsWith("izimoto")) {
      if (typeof l.vendorQuoteTotalExVat === "number" || typeof l.vendorQuoteAmount === "number") izimotoQuotes++;
    }
    if (!isMine) continue;
  }

  return { called, quoted, booked, delivered, izimotoQuotes };
}

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasKv()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 80)));

  const [members, leads] = await Promise.all([listTeamMembers({ limit }), listLeads({ limit: 500 })]);
  const enriched = members.map((m) => {
    const { passwordHash, passwordSalt, ...rest } = m || {};
    return { ...rest, stats: statsForMember({ member: m, leads }) };
  });
  return Response.json({ ok: true, members: enriched });
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasKv()) return Response.json({ error: "Storage not configured" }, { status: 500 });

  const json = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const member = await createTeamMemberWithPassword(parsed.data);
  if (!member) return Response.json({ error: "Failed to create member" }, { status: 500 });

  const { passwordHash, passwordSalt, ...safe } = member;
  return Response.json({ ok: true, member: safe });
}
