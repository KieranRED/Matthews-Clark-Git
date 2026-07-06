import { listLeads } from "@/lib/leadStore";

export const dynamic = "force-dynamic";

// Returns the set of business days already occupied by held/confirmed paint-
// correction bookings, so the funnel calendar greys them out (one car a day).
// Weekends and SA/Cape Town public holidays are computed client-side.
const BLOCKING = new Set(["held", "confirmed", "scheduled"]);

export async function GET() {
  const dates = new Set();
  try {
    const leads = await listLeads({ limit: 1000 });
    for (const lead of leads) {
      const pc = lead?.paintCorrection;
      const booking = lead?.booking;
      if (!pc || !booking) continue;
      const status = String(booking.status || "").toLowerCase();
      const cancelled = String(lead.status || "").toLowerCase() === "cancelled";
      if (cancelled) continue;
      if (!BLOCKING.has(status)) continue; // pending (no POP yet) does not block
      // D2: a "held" slot only blocks real availability once money has
      // actually landed (booking.paid, set when PoP is uploaded). The
      // WhatsApp-first path's 24h pencil is a soft note for the team, not a
      // hard block — otherwise any drive-by who taps "talk it through first"
      // (zero payment) could grey out a date for a paying customer. The date
      // stays open until whoever actually pays claims it.
      if (status === "held" && !booking.paid) continue;
      const days = Array.isArray(booking.bookedDates) ? booking.bookedDates : [];
      for (const iso of days) if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) dates.add(String(iso));
    }
  } catch (err) {
    console.error("[pc-availability] failed", err);
  }
  return Response.json(
    { booked: Array.from(dates).sort() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
