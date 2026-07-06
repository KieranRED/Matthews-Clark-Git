/**
 * POST   /api/admin/leads/[leadId]/photos — upload check-in photos
 * DELETE /api/admin/leads/[leadId]/photos — remove a photo by id
 *
 * Requires: BLOB_READ_WRITE_TOKEN env var.
 */

import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_SIZE_MB = 30;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const DeleteSchema = z
  .object({ photoId: z.string().trim().min(1) })
  .strict();

async function requireAdmin(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  return verifyAdminSession(token);
}

/** POST — upload one or more photos */
export async function POST(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json({ error: "Photo uploads not configured (missing BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }

  const leadId = String(params?.leadId || "").trim();
  if (!leadId) return Response.json({ error: "Missing leadId." }, { status: 400 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  // Support multiple files under "files" (array) or single "file"
  const allFiles = [
    ...formData.getAll("files"),
    ...formData.getAll("file"),
  ].filter((f) => f && typeof f !== "string");

  if (!allFiles.length) return Response.json({ error: "No files provided." }, { status: 400 });

  // Validate each file before uploading any
  for (const file of allFiles) {
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return Response.json({ error: `${file.name}: unsupported type. Allowed: JPEG, PNG, WebP, HEIC.` }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Response.json({ error: `${file.name}: too large. Max ${MAX_SIZE_MB} MB per file.` }, { status: 400 });
    }
  }

  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });

  const existingPhotos = Array.isArray(lead.photos) ? lead.photos : [];

  // Upload all files
  const angle = String(formData.get("angle") || "").trim() || null; // optional angle label
  const uploaded = [];

  await Promise.all(
    allFiles.map(async (file) => {
      const id = crypto.randomUUID();
      const ext = file.name?.split(".").pop()?.toLowerCase() || "jpg";
      const blobPath = `leads/${leadId}/checkin/${id}.${ext}`;

      const blob = await put(blobPath, file, { access: "public", token: blobToken, addRandomSuffix: false });
      uploaded.push({
        id,
        url: blob.url,
        filename: file.name || `${id}.${ext}`,
        angle: angle || null,
        uploadedAt: new Date().toISOString(),
        uploadedBy: session?.name || session?.email || "admin",
      });
    })
  );

  const nextPhotos = [...existingPhotos, ...uploaded];
  await updateLead(leadId, { photos: nextPhotos });

  return Response.json({ ok: true, uploaded, total: nextPhotos.length });
}

/** DELETE — remove a photo record (does not delete from blob storage) */
export async function DELETE(request, { params }) {
  const session = await requireAdmin(request);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const leadId = String(params?.leadId || "").trim();
  if (!leadId) return Response.json({ error: "Missing leadId." }, { status: 400 });

  const json = await request.json().catch(() => null);
  const parsed = DeleteSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "photoId is required." }, { status: 400 });

  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });

  const existing = Array.isArray(lead.photos) ? lead.photos : [];
  const next = existing.filter((p) => String(p?.id || "") !== parsed.data.photoId);
  await updateLead(leadId, { photos: next });

  return Response.json({ ok: true, total: next.length });
}
