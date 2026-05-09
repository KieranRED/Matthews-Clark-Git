import { cookies } from "next/headers";
import { adminCookieName } from "@/lib/adminAuth";

export async function POST() {
  cookies().set(adminCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0
  });
  return Response.json({ ok: true });
}

