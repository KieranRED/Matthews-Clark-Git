import { put } from "@vercel/blob";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 20 * 1024 * 1024;

// Optional "show us the spots" photos a client adds after the deposit step.
export async function POST(request, { params }) {
  const leadId = String(params.leadId || "");
  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return Response.json({ error: "Uploads not configured" }, { status: 503 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const token = String(formData.get("t") || "");
  if (!verifyToken({ secret, leadId, token })) return Response.json({ error: "Invalid link token" }, { status: 401 });

  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const file = formData.get("file");
  const index = Number(formData.get("index") || 0);
  if (!file || typeof file === "string") return Response.json({ error: "No file provided" }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type.toLowerCase())) return Response.json({ error: "Images only" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (max 20 MB)." }, { status: 400 });

  let url = null;
  try {
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const blob = await put(`pc/${leadId}/spots/${Date.now()}-${index}.${ext}`, file, { access: "public", token: blobToken, addRandomSuffix: true });
    url = blob.url;
  } catch (err) {
    console.error("[pc-photos][blob-failed]", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }

  const pc = lead.paintCorrection || {};
  const photos = Array.isArray(pc.photos) ? [...pc.photos] : [];
  photos.push({ url, index, at: new Date().toISOString() });
  await updateLead(leadId, { paintCorrection: { ...pc, photos } });

  return Response.json({ ok: true, url });
}
