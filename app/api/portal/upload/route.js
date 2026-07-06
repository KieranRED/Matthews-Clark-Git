/**
 * POST /api/portal/upload
 *
 * Uploads a vehicle hero photo for the client portal.
 * Auth: session cookie OR body params { c, t }.
 * Form fields: file (image), vehicleId (string).
 *
 * Requires: BLOB_READ_WRITE_TOKEN env var.
 */

import { put } from "@vercel/blob";
import { z } from "zod";
import { getClient, updateClient } from "@/lib/leadStore";
import { verifyExpiringToken } from "@/lib/signedToken";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function portalSecret() {
  return process.env.CLIENT_LINK_SECRET || process.env.LEAD_LINK_SECRET || "";
}

function readSessionCookie(request, secret) {
  try {
    const raw = request.cookies.get("mc_portal")?.value;
    if (!raw) return null;
    const pipeIdx = raw.indexOf("|");
    if (pipeIdx <= 0) return null;
    const cookieClientId = raw.slice(0, pipeIdx);
    const cookieToken = raw.slice(pipeIdx + 1);
    const verdict = verifyExpiringToken({ secret, subject: `portal:${cookieClientId}`, token: cookieToken });
    if (!verdict.ok) return null;
    return cookieClientId;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json({ error: "Photo uploads not configured (missing BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET." }, { status: 500 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file      = formData.get("file");
  const vehicleId = String(formData.get("vehicleId") || "").trim();
  const bodyC     = String(formData.get("c") || "").trim();
  const bodyT     = String(formData.get("t") || "").trim();

  if (!file || typeof file === "string") return Response.json({ error: "No file provided." }, { status: 400 });
  if (!vehicleId) return Response.json({ error: "vehicleId is required." }, { status: 400 });

  // ── Auth: URL token params first, cookie fallback ─────────────────────
  let clientId = "";
  if (bodyC && bodyT) {
    const verdict = verifyExpiringToken({ secret, subject: `portal:${bodyC}`, token: bodyT });
    if (verdict.ok) clientId = bodyC;
  }
  if (!clientId) {
    clientId = readSessionCookie(request, secret) || "";
  }
  if (!clientId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // ── Validate file ─────────────────────────────────────────────────────
  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return Response.json({ error: `Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC.` }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: `File too large. Max ${MAX_SIZE_MB} MB.` }, { status: 400 });
  }

  // ── Load client and find vehicle ──────────────────────────────────────
  const client = await getClient(clientId);
  if (!client) return Response.json({ error: "Client not found." }, { status: 404 });

  const vehicles = Array.isArray(client.vehicles) ? client.vehicles : [];
  const vIdx = vehicles.findIndex((v) => String(v?.id || "") === vehicleId);
  if (vIdx < 0) return Response.json({ error: "Vehicle not found." }, { status: 404 });

  // ── Upload to Vercel Blob ─────────────────────────────────────────────
  const ext = file.name?.split(".").pop()?.toLowerCase() || "jpg";
  const blobPath = `portal/${clientId}/vehicles/${vehicleId}/hero.${ext}`;

  let blob;
  try {
    blob = await put(blobPath, file, { access: "public", token: blobToken, addRandomSuffix: false });
  } catch (err) {
    console.error("[portal/upload] blob error", err);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  // ── Update vehicle record ─────────────────────────────────────────────
  const next = [...vehicles];
  next[vIdx] = { ...next[vIdx], photoUrl: blob.url, photoUpdatedAt: new Date().toISOString() };
  await updateClient(clientId, { vehicles: next });

  return Response.json({ ok: true, vehicleId, photoUrl: blob.url });
}
