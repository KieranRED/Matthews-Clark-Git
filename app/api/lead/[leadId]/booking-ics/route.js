import { getLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";

export const dynamic = "force-dynamic";

function icsEscape(s) {
  return String(s || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function toIcsDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export async function GET(request, { params }) {
  const leadId = String(params.leadId || "");
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get("t") || "");

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return new Response("Missing LEAD_LINK_SECRET", { status: 500 });
  if (!verifyToken({ secret, leadId, token })) return new Response("Unauthorized", { status: 401 });

  const lead = await getLead(leadId);
  if (!lead) return new Response("Not found", { status: 404 });

  const when = lead?.booking?.scheduledAt || null;
  if (!when) return new Response("No booking scheduled", { status: 400 });

  const start = toIcsDate(when);
  // Default duration: 2 hours
  const end = toIcsDate(new Date(Date.parse(when) + 2 * 60 * 60 * 1000).toISOString());
  const uid = `mc-${leadId}@matthewsclark.co.za`;
  const summary = `Matthews & Clark — Booking`;
  const description = `Vehicle: ${lead?.car || "—"}`;
  const location = `Matthews & Clark, 3 Muir St, Woodstock, Cape Town`;

  const ics =
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "PRODID:-//Matthews & Clark//CRM//EN\n" +
    "CALSCALE:GREGORIAN\n" +
    "METHOD:PUBLISH\n" +
    "BEGIN:VEVENT\n" +
    `UID:${icsEscape(uid)}\n` +
    `DTSTAMP:${toIcsDate(new Date().toISOString())}\n` +
    `DTSTART:${start}\n` +
    `DTEND:${end}\n` +
    `SUMMARY:${icsEscape(summary)}\n` +
    `DESCRIPTION:${icsEscape(description)}\n` +
    `LOCATION:${icsEscape(location)}\n` +
    "END:VEVENT\n" +
    "END:VCALENDAR\n";

  const raw = String(lead?.invoiceNumber || "").trim();
  const digits = raw.replace(/[^\d]/g, "");
  const num = digits ? digits.slice(-5).padStart(5, "0") : String(raw || leadId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase().padStart(5, "0");
  const file = `MC_${num}-booking.ics`;
  return new Response(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename=\"${file}\"`
    }
  });
}
