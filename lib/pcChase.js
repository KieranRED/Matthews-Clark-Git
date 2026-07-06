// Paint-correction funnel — the Telegram "chase" layer (T1/T2 from the
// perfection-list doc). One notifying message per lead, sent when the
// outcome is known (PoP in / WhatsApp handoff gone quiet / bounced), edited
// in place afterwards rather than re-spammed. The CRM tracks every step in
// real time (see app/api/lead/[leadId]/pc-progress); this module turns that
// state into the one message the team needs to act without opening the CRM.

import { PC_PACKAGES, PC_QUESTIONS, pcRecommend, pcFmtMoney } from "@/app/paint-correction/pcData";
import { telegramSendMessage, telegramEditMessage } from "@/lib/telegram";

function escapeHtml(input) {
  return String(input || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }); } catch { return String(iso); }
}

// "daily driver · swirls and haze · quick gloss · just freshen it up"
export function pcAnswerSummaryLine(answers) {
  if (!answers) return null;
  const parts = PC_QUESTIONS.map((q) => {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    return opt ? opt.label.toLowerCase() : null;
  }).filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

const STAGE_LABELS = {
  quiz_complete: "contact capture · no package viewed yet",
  package_selected: "package reveal",
  car_details: "car details",
  date_selected: "calendar / date picked",
  checkout: "checkout (last details)",
  payment_viewed: "payment screen · no PoP",
  whatsapp_handoff: "tapped “rather talk it through first”",
  booked: "booked"
};

export function pcFurthestStepLabel(pc) {
  return STAGE_LABELS[pc?.stage] || "quiz / contact capture";
}

// "Light swirls, Street Gloss territory, R5,500, same day."
export function pcOpenerLine(pc) {
  if (!pc?.answers) return null;
  const rec = pcRecommend(pc.answers);
  if (!rec) return null;
  const pkg = PC_PACKAGES.find((p) => p.id === rec.recId);
  if (!pkg) return null;
  const paintOpt = PC_QUESTIONS[1].options.find((o) => o.id === pc.answers.paint);
  const paintLabel = paintOpt ? paintOpt.label.toLowerCase() : "their paint";
  const days = pkg.days === 1 ? "same day" : `${pkg.days} days`;
  return `${paintLabel[0].toUpperCase()}${paintLabel.slice(1)}, ${pkg.name} territory, ${pcFmtMoney(pkg.price)}, ${days}.`;
}

// "R1,000 hold · R4,500 at drop-off" / "R1,000 hold · R7,000 at drop-off · R8,000 at pickup"
export function pcPaymentLine(pc) {
  if (pc?.holdAmount == null && pc?.deposit == null) return null;
  const hold = pcFmtMoney(pc.holdAmount ?? pc.deposit ?? 0);
  const dropoff = pcFmtMoney(pc.dueAtDropoff ?? pc.balance ?? 0);
  const pickup = Number(pc.dueAtPickup) > 0 ? ` · ${pcFmtMoney(pc.dueAtPickup)} at pickup` : "";
  return `${hold} hold · ${dropoff} at drop-off${pickup}`;
}

// "STREET GLOSS R5,500 (recommended & kept)" / "(recommended Street Gloss, switched to Bronze R8,500)"
export function pcPackageLine(pc) {
  const chosen = PC_PACKAGES.find((p) => p.id === pc?.packageId);
  if (!chosen) return pc?.packageName || "—";
  const rec = pc?.answers ? pcRecommend(pc.answers) : null;
  const price = pcFmtMoney(pc.price ?? chosen.price);
  if (!rec || rec.recId === chosen.id) {
    return `${chosen.name} ${price} (recommended &amp; kept)`;
  }
  const recPkg = PC_PACKAGES.find((p) => p.id === rec.recId);
  return `${chosen.name} ${price} (recommended ${recPkg ? recPkg.name : "—"}, switched to ${chosen.name})`;
}

function buildChaseBody({ lead, trigger }) {
  const pc = lead.paintCorrection || {};
  const name = lead.firstName || lead.name || "—";
  const phone = lead.number ? `${lead.dial || ""} ${lead.number}`.trim() : "—";
  const car = lead.car || [lead.make, lead.model, lead.year].filter(Boolean).join(" ") || "not given yet";
  const answersLine = pcAnswerSummaryLine(pc.answers);
  const opener = pcOpenerLine(pc);
  const dateLine = pc.dropoff ? `${fmtDate(pc.dropoff)} (held 24h)` : "not picked yet";
  const noPop = !pc.popUploadedAt;

  const titles = {
    handoff: "🟡 <b>PC LEAD — SAID THEY’D WHATSAPP, DIDN’T</b>",
    bounce: "🔴 <b>PC LEAD BOUNCED — " + escapeHtml(pcFurthestStepLabel(pc)).toUpperCase() + "</b>"
  };

  const lines = [
    `${titles[trigger] || titles.bounce} — ${escapeHtml(name)} · ${escapeHtml(phone)}`,
    `Car: <b>${escapeHtml(car)}</b>`,
    answersLine ? `Said: ${escapeHtml(answersLine)}` : null,
    pc.packageId ? `Read: ${pcPackageLine(pc)}` : null,
    pcPaymentLine(pc) ? `Payment: ${escapeHtml(pcPaymentLine(pc))}` : null,
    pc.dropoff ? `Date picked: <b>${escapeHtml(dateLine)}</b>` : null,
    `Furthest step: ${escapeHtml(pcFurthestStepLabel(pc))}${noPop ? " · no PoP" : ""}`,
    opener ? `Opener: send them their paint read → "${escapeHtml(opener)}"` : null,
    `Ref ${escapeHtml(pc.reference || lead.reference || "—")} · Lead <code>${escapeHtml(lead.id)}</code>`
  ].filter(Boolean);

  return lines.join("\n");
}

/**
 * Send or edit the ONE Telegram message for a lead. First trigger wins and
 * subsequent state changes edit that message in place (silent, no re-ping) —
 * except "pop" (a deposit landing), which always posts fresh since it's the
 * one outcome worth a new notification, even for a previously-bounced lead.
 */
export async function pcSendOrEditChaseMessage({ lead, trigger, replyMarkup }) {
  const chatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return null;

  const pc = lead.paintCorrection || {};
  const text = buildChaseBody({ lead, trigger });

  if (pc.telegramMessageId && trigger !== "pop") {
    try {
      await telegramEditMessage({ chatId: pc.telegramChatId || chatId, messageId: pc.telegramMessageId, text, replyMarkup, token });
      return { messageId: pc.telegramMessageId, edited: true };
    } catch (err) {
      console.error("[pcChase][edit-failed]", err);
      return null;
    }
  }

  try {
    const sent = await telegramSendMessage({ chatId, text, replyMarkup, token });
    return { messageId: sent?.message_id || null, chatId, edited: false };
  } catch (err) {
    console.error("[pcChase][send-failed]", err);
    return null;
  }
}

/**
 * F1 — silently edit the lead's existing chase message to flag an
 * approaching 24h hold expiry, without a new notification. The boys are
 * already chasing off the original message; this keeps the deadline in
 * front of them instead of letting it lapse unnoticed.
 */
export async function pcFlagHoldExpiring({ lead, trigger }) {
  const pc = lead.paintCorrection || {};
  if (!pc.telegramMessageId) return null;
  const chatId = pc.telegramChatId || process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return null;

  const dateLine = pc.dropoff ? fmtDate(pc.dropoff) : "their date";
  const text = `⏳ <b>HOLD EXPIRES TONIGHT — ${escapeHtml(dateLine)}</b>\n\n` + buildChaseBody({ lead, trigger: trigger || pc.telegramSentTrigger || "bounce" });

  try {
    await telegramEditMessage({ chatId, messageId: pc.telegramMessageId, text, token });
    return true;
  } catch (err) {
    console.error("[pcChase][hold-expiry-edit-failed]", err);
    return null;
  }
}
