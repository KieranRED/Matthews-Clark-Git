import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { hasKv } from "@/lib/kv";
import { getCrmKitData } from "@/lib/crmKitAdapter";
import { getTeamMemberByUsername } from "@/lib/teamStore";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasKv()) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(400, Number(searchParams.get("limit") || 200)));

  const data = await getCrmKitData({ limit });
  const viewer = await getTeamMemberByUsername(session.username).catch(() => null);
  const safeViewer = viewer
    ? {
        id: viewer.id,
        name: viewer.name,
        username: viewer.username,
        role: viewer.role,
        accent: viewer.role && String(viewer.role).startsWith("izimoto") ? "#9B51E0" : "#1F4FFF"
      }
    : { username: session.username, role: null, accent: "#1F4FFF" };

  return Response.json({ ok: true, data: { ...data, viewer: safeViewer } });
}
