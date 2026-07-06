import { put } from "@vercel/blob";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";
import { telegramSendMessage } from "@/lib/telegram";
import { hasResend, sendEmail } from "@/lib/email";
import { pcBookingConfirmationEmail } from "@/lib/emailTemplates";
import { verifyPop } from "@/lib/popVerify";
import { PC_BANK } from "@/app/paint-correction/pcData";
import { updateTask } from "@/lib/taskStore";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 20 * 1024 * 1024;

function escapeHtml(input) {
  return String(input || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function fmt(iso) {
  try { return new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }); } catch { return String(iso); }
}
function money(n) { return "R" + Number(n || 0).toLocaleString("en-ZA"); }

function getBaseUrl(request) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `${proto}://${host}`.replace(/\/+$/, "") : null;
}

export async function POST(request, { params }) {
  const leadId = String(params.leadId || "");
  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });

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
  if (!file || typeof file === "string") return Response.json({ error: "No file provided" }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type.toLowerCase())) {
    return Response.json({ error: "Unsupported file type. Upload a PDF or image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (max 20 MB)." }, { status: 400 });

  // Read the file once — reused for both the blob upload and verification.
  const buffer = Buffer.from(await file.arrayBuffer());
  const pc = lead.paintCorrection || {};
  const booking = lead.booking || {};

  // ── Real POP verification: OCR / PDF text + metadata authenticity ──
  let verification = null;
  try {
    verification = await verifyPop({
      buffer,
      type: file.type,
      fileName: file.name,
      expected: {
        deposit: pc.deposit,
        reference: pc.reference,
        accountLast4: PC_BANK.account.slice(-4),
        holderName: PC_BANK.holder,
        bankName: PC_BANK.bank
      }
    });
  } catch (err) {
    console.error("[pc-deposit][verify-failed]", err);
    verification = { verdict: "review", checks: [], error: true };
  }

  // Upload POP to Vercel Blob (optional — degrade gracefully if not configured).
  let popUrl = null;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const ext = (file.name?.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const blob = await put(`pc/${leadId}/pop/${Date.now()}.${ext}`, buffer, {
        access: "public",
        token: blobToken,
        addRandomSuffix: true,
        contentType: file.type || "application/octet-stream"
      });
      popUrl = blob.url;
    } catch (err) {
      console.error("[pc-deposit][blob-failed]", err);
    }
  }

  const nowIso = new Date().toISOString();
  const autoVerified = verification?.verdict === "pass";

  const updated = await updateLead(leadId, {
    status: "booked",
    invoiceStatus: "deposit_pending",
    bookedAt: lead.bookedAt || nowIso,
    bookedBy: "client",
    updatedAt: nowIso,
    paintCorrection: {
      ...pc,
      popUrl: popUrl || pc.popUrl || null,
      popUploadedAt: nowIso,
      popVerdict: verification?.verdict || "review",
      popVerification: verification || null,
      depositReportedAt: nowIso
    },
    booking: {
      ...booking,
      status: "held",
      paid: true, // D2: real money landed - this is what actually blocks the calendar now
      heldAt: nowIso,
      updatedAt: nowIso
    }
  });

  // PoP landed — close out any auto-created follow-up/nudge tasks so the
  // team's task list doesn't nag about a lead that already booked.
  for (const taskId of [pc.followUpTaskId, pc.popReminderTaskId].filter(Boolean)) {
    try {
      await updateTask(taskId, { status: "done", updatedAt: nowIso });
    } catch (err) {
      console.error("[pc-deposit][task-close-failed]", { taskId, err: String(err) });
    }
  }

  const name = updated?.name || lead.name || "—";
  const car = updated?.car || lead.car || "—";
  const pkgName = pc.packageName || "Paint correction";
  const deposit = pc.holdAmount ?? pc.deposit ?? 0;
  const dueAtDropoff = pc.dueAtDropoff ?? pc.balance ?? 0;
  const dueAtPickup = pc.dueAtPickup || 0;
  const dropoff = pc.dropoff;
  const pickup = pc.pickup;

  // Telegram approval — Approve maps to the existing `deposit_paid` webhook callback.
  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      const rows = [
        [{ text: "💰 Approve deposit", callback_data: `deposit_paid:${leadId}` }],
        [{ text: "✅ Called", callback_data: `called:${leadId}` }]
      ];
      if (popUrl) rows.push([{ text: "📄 View POP", url: popUrl }]);

      const vchecks = Array.isArray(verification?.checks) ? verification.checks : [];
      const checkLines = vchecks.map((c) => `${c.pass ? "✓" : "⚠"} ${escapeHtml(c.label)}: ${escapeHtml(String(c.value))}`).join("\n");
      const verdictLine = autoVerified
        ? "✅ <b>AUTO-CHECK PASSED</b>"
        : "⚠️ <b>NEEDS A MANUAL LOOK</b>";

      // Bounced/handoff-quiet leads get a fresh 💰 ping here too — the one
      // exception to "edit in place" (T1/T2): a lead paying after already
      // being chased is high-value and deserves a new notification, not a
      // silent edit to a message the team may have scrolled past.
      const sent = await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text:
          `🧾 <b>DEPOSIT — POP RECEIVED</b>\n` +
          `${verdictLine}\n` +
          `<b>${escapeHtml(name)}</b> · ${escapeHtml(updated?.number || lead.number || "—")}\n` +
          `Car: <b>${escapeHtml(car)}</b>\n` +
          `Package: <b>${escapeHtml(pkgName)}</b>\n` +
          `In the bay: ${escapeHtml(fmt(dropoff))} → ${escapeHtml(fmt(pickup))}\n` +
          `Slot hold: <b>${escapeHtml(money(deposit))}</b> · Due at drop-off: <b>${escapeHtml(money(dueAtDropoff))}</b>` +
          (dueAtPickup > 0 ? ` · Due at pickup: <b>${escapeHtml(money(dueAtPickup))}</b>\n` : `\n`) +
          (checkLines ? `\n<b>Auto-verification</b>\n${checkLines}\n` : "") +
          `\n<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n` +
          `<i>A POP can’t prove funds cleared — approve once you see the deposit land in the account.</i>`,
        replyMarkup: { inline_keyboard: rows },
        disableWebPagePreview: true
      });
      if (sent?.message_id) {
        await updateLead(leadId, {
          paintCorrection: {
            ...(updated?.paintCorrection || pc),
            telegramMessageId: sent.message_id,
            telegramChatId: mcChatId,
            telegramSentTrigger: "pop"
          }
        });
      }
    } catch (err) {
      console.error("[pc-deposit][telegram-failed]", err);
    }
  }

  // Client confirmation / thank-you email (cult-brand). Gated by Resend config.
  if (hasResend() && updated?.email) {
    try {
      const baseUrl = getBaseUrl(request);
      const { subject, html, text } = pcBookingConfirmationEmail({
        name: updated.firstName || name,
        car,
        packageName: pkgName,
        ceramic: !!pc.ceramic,
        reference: pc.reference || "",
        dropoff: dropoff ? fmt(dropoff) : "—",
        pickup: pickup ? fmt(pickup) : "—",
        depositFormatted: money(deposit),
        dueAtDropoffFormatted: money(dueAtDropoff),
        dueAtPickupFormatted: dueAtPickup > 0 ? money(dueAtPickup) : null,
        baseUrl
      });
      await sendEmail({ to: updated.email, subject, html, text });
      await updateLead(leadId, { paintCorrection: { ...(updated.paintCorrection || pc), confirmationEmailAt: new Date().toISOString() } });
    } catch (err) {
      console.error("[pc-deposit][email-failed]", err);
    }
  }

  return Response.json({
    ok: true,
    leadId,
    popUrl,
    verification: verification ? { verdict: verification.verdict, checks: verification.checks } : null
  });
}
