import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

export async function GET() {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, user: { username: session.username } });
}

