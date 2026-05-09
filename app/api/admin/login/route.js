import crypto from "node:crypto";
import { z } from "zod";
import { cookies } from "next/headers";

import { adminCookieName, createAdminSession } from "@/lib/adminAuth";
import { verifyTeamPassword } from "@/lib/teamStore";

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200)
});

function safeEq(a, b) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export async function POST(request) {
  const json = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  // Prefer team-based logins when KV is configured.
  try {
    const member = await verifyTeamPassword({ username: parsed.data.username, password: parsed.data.password });
    if (member?.username) {
      const session = await createAdminSession({ username: member.username });
      cookies().set(adminCookieName(), session, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7
      });
      return Response.json({ ok: true });
    }
  } catch {
    // fall back to env credentials
  }

  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    return Response.json({ error: "Admin login not configured (missing ADMIN_USERNAME/ADMIN_PASSWORD)." }, { status: 500 });
  }

  const ok = safeEq(parsed.data.username, expectedUser) && safeEq(parsed.data.password, expectedPass);
  if (!ok) return Response.json({ error: "Invalid username or password" }, { status: 401 });

  const token = await createAdminSession({ username: parsed.data.username });

  cookies().set(adminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return Response.json({ ok: true });
}
