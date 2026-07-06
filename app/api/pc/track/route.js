import { z } from "zod";

import { isKnownPcEvent, recordPcEvent } from "@/lib/pcTracking";

export const dynamic = "force-dynamic";

// Fire-and-forget anonymous funnel-event beacon for the paint-correction ad
// funnel (see PaintCorrectionFlow.jsx / lib/pcTracking.js). Always responds
// 204 regardless of outcome — sendBeacon/keepalive callers never read the
// response, and this must never surface an error to the page.
const Schema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  event: z.string().trim().min(1).max(60),
  meta: z.record(z.any()).optional(),
  ts: z.number().optional()
});

export async function POST(request) {
  let json;
  try {
    // navigator.sendBeacon posts a Blob without a reliable Content-Type in
    // some browsers, so read as text and parse rather than trusting headers.
    const text = await request.text();
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 204 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success || !isKnownPcEvent(parsed.data.event)) {
    return new Response(null, { status: 204 });
  }

  try {
    await recordPcEvent(parsed.data);
  } catch (err) {
    console.error("[pc-track] failed", err);
  }

  return new Response(null, { status: 204 });
}
