import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) redirect("/admin/login");
  return (
    <div style={{ background: "#050505", minHeight: "100vh" }}>
      <div className="crm-root">{children}</div>
    </div>
  );
}
