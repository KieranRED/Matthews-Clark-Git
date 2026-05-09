import { z } from "zod";
import crypto from "node:crypto";

import { getClient, updateClient } from "@/lib/leadStore";
import { verifyExpiringToken } from "@/lib/signedToken";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    c: z.string().trim().min(1),
    t: z.string().trim().min(1),
    vehicle: z
      .object({
        id: z.string().trim().optional(),
        label: z.string().trim().min(2).max(80),
        year: z.string().trim().max(12).optional().nullable(),
        make: z.string().trim().max(40).optional().nullable(),
        model: z.string().trim().max(60).optional().nullable(),
        colour: z.string().trim().max(40).optional().nullable(),
        plate: z.string().trim().max(32).optional().nullable()
      })
      .strict()
  })
  .strict();

function portalSecret() {
  return process.env.CLIENT_LINK_SECRET || process.env.LEAD_LINK_SECRET || "";
}

function vehicleKeyFromLabel(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET (or LEAD_LINK_SECRET fallback)." }, { status: 500 });

  const clientId = parsed.data.c;
  const verdict = verifyExpiringToken({ secret, subject: `portal:${clientId}`, token: parsed.data.t });
  if (!verdict.ok) return Response.json({ error: "Invalid or expired session." }, { status: 401 });

  const client = await getClient(clientId);
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  const vehicles = Array.isArray(client?.vehicles) ? client.vehicles.slice(0, 50) : [];
  const v = parsed.data.vehicle;
  const label = String(v.label || "").trim();
  const key = vehicleKeyFromLabel(label);
  const existingIdxById = v.id ? vehicles.findIndex((x) => String(x?.id || "") === String(v.id)) : -1;
  const existingIdxByKey = key ? vehicles.findIndex((x) => vehicleKeyFromLabel(x?.label) === key) : -1;

  const id = existingIdxById >= 0 ? String(vehicles[existingIdxById].id) : existingIdxByKey >= 0 ? String(vehicles[existingIdxByKey].id) : crypto.randomUUID();
  const nextVehicle = { ...v, id, key };
  const idx = existingIdxById >= 0 ? existingIdxById : existingIdxByKey;
  if (idx >= 0) vehicles[idx] = { ...vehicles[idx], ...nextVehicle };
  else vehicles.unshift(nextVehicle);

  const updated = await updateClient(clientId, { vehicles });
  return Response.json({ ok: true, client: updated });
}
