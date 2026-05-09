import { getClient, getClientIdByEmail, normalizePhone } from "@/lib/leadStore";
import { hasKv } from "@/lib/kv";

export async function GET(request) {
  if (!hasKv()) return Response.json({ ok: true, exists: false });

  const { searchParams } = new URL(request.url);
  const email = String(searchParams.get("email") || "").trim();
  const phone = String(searchParams.get("phone") || "").trim();

  if (!email) return Response.json({ ok: true, exists: false });

  const clientId = await getClientIdByEmail(email);
  if (!clientId) return Response.json({ ok: true, exists: false });

  const client = await getClient(clientId);
  if (!client) return Response.json({ ok: true, exists: false });

  // Avoid leaking client data via email enumeration:
  // only confirm when the phone also matches (if provided).
  const phoneNorm = normalizePhone(phone);
  if (phoneNorm && client.phoneNorm && phoneNorm !== client.phoneNorm) {
    return Response.json({ ok: true, exists: false });
  }

  const vehicles = Array.isArray(client.vehicles) ? client.vehicles : [];
  const safeVehicles = vehicles
    .map((v) => ({
      id: v?.id || null,
      label: v?.label || v?.make || v?.model || null
    }))
    .filter((v) => v.label);
  return Response.json({
    ok: true,
    exists: true,
    client: {
      id: String(client.id || ""),
      name: client.name || "Client",
      vehicles: safeVehicles.slice(0, 20)
    }
  });
}
