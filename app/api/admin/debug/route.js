import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

function present(name) {
  return Boolean(process.env[name]);
}

export async function GET() {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({
    ok: true,
    env: {
      KV_REST_API_URL: present("KV_REST_API_URL"),
      KV_REST_API_TOKEN: present("KV_REST_API_TOKEN"),
      UPSTASH_REDIS_REST_URL: present("UPSTASH_REDIS_REST_URL"),
      UPSTASH_REDIS_REST_TOKEN: present("UPSTASH_REDIS_REST_TOKEN"),
      ADMIN_USERNAME: present("ADMIN_USERNAME"),
      ADMIN_PASSWORD: present("ADMIN_PASSWORD"),
      ADMIN_SESSION_SECRET: present("ADMIN_SESSION_SECRET")
    }
  });
}

