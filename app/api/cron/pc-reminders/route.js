import { listLeads, updateLead } from "@/lib/leadStore";
import { hasResend, sendEmail } from "@/lib/email";
import { pcReminderEmail } from "@/lib/emailTemplates";
import { saveTask } from "@/lib/taskStore";
import { pcSendOrEditChaseMessage, pcFlagHoldExpiring } from "@/lib/pcChase";

export const runtime = "nodejs";
export const maxDuration = 60;

function isCronAuthorized(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const got = request.headers.get("authorization") || "";
  return got === `Bearer ${expected}`;
}

function fmt(iso) {
  try { return new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }); } catch { return String(iso); }
}
function money(n) { return "R" + Number(n || 0).toLocaleString("en-ZA"); }

// Reminder schedule (calendar days before drop-off).
const SCHEDULE = [
  { kind: "3day", days: 3 },
  { kind: "1day", days: 1 }
];

const BLOCKING = new Set(["held", "confirmed", "scheduled"]);
const POP_NUDGE_AFTER_MS = 60 * 60 * 1000; // 60 minutes
const HANDOFF_QUIET_MS = 60 * 60 * 1000; // 60 minutes, no inbound reply
const BOUNCE_SILENCE_MS = 45 * 60 * 1000; // 45 minutes since their last step
const HOLD_EXPIRY_WARNING_WINDOW_MS = 4 * 60 * 60 * 1000; // ~20h into the 24h pencil, 4h left

export async function GET(request) {
  if (!isCronAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const results = { sent: 0, scanned: 0, errors: 0, popNudgeTasks: 0, chaseHandoff: 0, chaseBounce: 0 };

  let leads = [];
  try {
    leads = await listLeads({ limit: 1000 });
  } catch (err) {
    console.error("[pc-reminders][list-failed]", err);
    return Response.json({ error: "list failed" }, { status: 500 });
  }

  for (const lead of leads) {
    const pc = lead?.paintCorrection;
    if (!pc) continue;
    if (String(lead.status || "").toLowerCase() === "cancelled") continue;

    // No WABA send integration exists yet to auto-WhatsApp a "slot's still
    // yours" nudge, so this creates a CRM follow-up task instead — someone on
    // the team still has to reach out, but the drop-off doesn't go unnoticed.
    if (pc.packageId && !pc.popUploadedAt && !pc.popReminderTaskId) {
      const committedAt = Date.parse(lead.updatedAt || lead.createdAt || "");
      if (Number.isFinite(committedAt) && Date.now() - committedAt >= POP_NUDGE_AFTER_MS) {
        try {
          const task = await saveTask({
            title: `PoP not received — call/WhatsApp ${lead.firstName || lead.name || "lead"} (slot still held)`,
            dueAt: new Date().toISOString(),
            leadId: lead.id,
            notes: [{ at: new Date().toISOString(), by: "system", text: "Auto-created: no proof of payment 60 min after committing to hold a slot" }]
          });
          if (task?.id) {
            await updateLead(lead.id, { paintCorrection: { ...pc, popReminderTaskId: task.id } });
            results.popNudgeTasks += 1;
          }
        } catch (err) {
          console.error("[pc-reminders][pop-nudge-task-failed]", { leadId: lead.id, err: String(err) });
          results.errors += 1;
        }
      }
    }

    // T1 — the one Telegram message per lead, sent at the first trigger to
    // fire. PoP-in is handled synchronously in pc-deposit/route.js; these two
    // are the only ones that need a periodic check. First trigger wins —
    // both are skipped once telegramMessageId exists.
    if (!pc.popUploadedAt && !pc.telegramMessageId) {
      const nowMs = Date.now();
      if (pc.whatsappHandoffAt && !pc.whatsappInboundAt) {
        const handoffMs = Date.parse(pc.whatsappHandoffAt);
        if (Number.isFinite(handoffMs) && nowMs - handoffMs >= HANDOFF_QUIET_MS) {
          try {
            const sent = await pcSendOrEditChaseMessage({ lead, trigger: "handoff" });
            if (sent?.messageId) {
              await updateLead(lead.id, {
                paintCorrection: { ...pc, telegramMessageId: sent.messageId, telegramChatId: sent.chatId || pc.telegramChatId, telegramSentTrigger: "handoff" }
              });
              results.chaseHandoff += 1;
            }
          } catch (err) {
            console.error("[pc-reminders][chase-handoff-failed]", { leadId: lead.id, err: String(err) });
            results.errors += 1;
          }
        }
      } else if (pc.stage) {
        const lastActivityMs = Date.parse(pc.lastActivityAt || lead.updatedAt || lead.createdAt || "");
        if (Number.isFinite(lastActivityMs) && nowMs - lastActivityMs >= BOUNCE_SILENCE_MS) {
          try {
            const sent = await pcSendOrEditChaseMessage({ lead, trigger: "bounce" });
            if (sent?.messageId) {
              await updateLead(lead.id, {
                paintCorrection: { ...pc, telegramMessageId: sent.messageId, telegramChatId: sent.chatId || pc.telegramChatId, telegramSentTrigger: "bounce" }
              });
              results.chaseBounce += 1;
            }
          } catch (err) {
            console.error("[pc-reminders][chase-bounce-failed]", { leadId: lead.id, err: String(err) });
            results.errors += 1;
          }
        }
      }
    }

    // F1 — the WhatsApp-path's 24h pencil lapses silently otherwise. At ~20h
    // in (4h left), silently edit the lead's existing chase message (if any)
    // so "HOLD EXPIRES TONIGHT" is the first thing the team sees — no new
    // notification, since they're already chasing off the original one.
    const bookingForExpiry = lead?.booking;
    if (bookingForExpiry?.status === "held" && !bookingForExpiry.paid && bookingForExpiry.heldUntil && !pc.holdExpiryFlaggedAt) {
      const heldUntilMs = Date.parse(bookingForExpiry.heldUntil);
      if (Number.isFinite(heldUntilMs) && heldUntilMs - Date.now() > 0 && heldUntilMs - Date.now() <= HOLD_EXPIRY_WARNING_WINDOW_MS) {
        try {
          const flagged = await pcFlagHoldExpiring({ lead });
          if (flagged) {
            await updateLead(lead.id, { paintCorrection: { ...pc, holdExpiryFlaggedAt: new Date().toISOString() } });
          }
        } catch (err) {
          console.error("[pc-reminders][hold-expiry-flag-failed]", { leadId: lead.id, err: String(err) });
          results.errors += 1;
        }
      }
    }

    const booking = lead?.booking;
    if (!hasResend() || !booking || !pc.dropoff) continue;
    if (!BLOCKING.has(String(booking.status || "").toLowerCase())) continue; // only deposited bookings
    if (!lead.email) continue;
    results.scanned += 1;

    const dropoffDate = new Date(pc.dropoff + "T00:00:00");
    if (Number.isNaN(dropoffDate.getTime())) continue;
    const daysUntil = Math.round((dropoffDate - today) / 86400000);

    const due = SCHEDULE.find((s) => s.days === daysUntil);
    if (!due) continue;

    const sent = Array.isArray(pc.remindersSent) ? pc.remindersSent : [];
    if (sent.includes(due.kind)) continue;

    try {
      const { subject, html, text } = pcReminderEmail({
        name: lead.firstName || lead.name,
        car: lead.car,
        packageName: pc.packageName,
        dropoff: fmt(pc.dropoff),
        pickup: pc.pickup ? fmt(pc.pickup) : "—",
        dueAtDropoffFormatted: money(pc.dueAtDropoff ?? pc.balance ?? 0),
        dueAtPickupFormatted: pc.dueAtPickup > 0 ? money(pc.dueAtPickup) : null,
        kind: due.kind
      });
      await sendEmail({ to: lead.email, subject, html, text });
      await updateLead(lead.id, {
        paintCorrection: { ...pc, remindersSent: [...sent, due.kind] }
      });
      results.sent += 1;
    } catch (err) {
      console.error("[pc-reminders][send-failed]", { leadId: lead.id, err: String(err) });
      results.errors += 1;
    }
  }

  return Response.json({ ok: true, ...results });
}
