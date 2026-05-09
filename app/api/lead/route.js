import { z } from "zod";
import crypto from "node:crypto";

import { saveLead, upsertClientForLead } from "@/lib/leadStore";
import { telegramSendMessage } from "@/lib/telegram";
import { hmacToken } from "@/lib/linkToken";

const LeadSchema = z.object({
  name: z.string().trim().min(1),
  surname: z.string().trim().min(1),
  number: z.string().trim().min(8),
  email: z.string().trim().email(),
  car: z.string().trim().min(3),
  lane: z.enum(["protect", "present", "both"]),
  services: z.array(z.string()).default([]),
  serviceDetails: z
    .object({
      ppf: z
        .object({
          coverage: z.string().optional(),
          film: z.string().optional(),
          doorJambs: z.boolean().optional(),
          panels: z.array(z.string()).optional(),
          notes: z.string().optional()
        })
        .optional(),
      wrap: z
        .object({
          scope: z.string().optional(),
          finish: z.string().optional(),
          doorJambs: z.boolean().optional(),
          panels: z.array(z.string()).optional(),
          parts: z.array(z.string()).optional(),
          colour: z.string().optional(),
          notes: z.string().optional()
        })
        .optional(),
      tint: z
        .object({
          windows: z.string().optional(),
          shade: z.string().optional(),
          notes: z.string().optional()
        })
        .optional(),
      ceramic: z
        .object({
          package: z.string().optional(),
          wheels: z.boolean().optional(),
          glass: z.boolean().optional(),
          trim: z.boolean().optional(),
          notes: z.string().optional()
        })
        .optional(),
      correct: z
        .object({
          stage: z.string().optional(),
          notes: z.string().optional()
        })
        .optional(),
      detail: z
        .object({
          kind: z.string().optional(),
          notes: z.string().optional()
        })
        .optional(),
      wheel: z
        .object({
          service: z.string().optional(),
          finish: z.string().optional(),
          colour: z.string().optional(),
          notes: z.string().optional()
        })
        .optional(),
      kit: z
        .object({
          notes: z.string().optional()
        })
        .optional()
  })
    .optional(),
  timeframe: z.enum(["this-week", "this-month", "no-rush"]),
  source: z.enum(["TIKTOK", "INSTAGRAM", "WEBSITE"]).optional(),
  utm: z
    .object({
      source: z.string().trim().min(1).max(120).nullable().optional(),
      medium: z.string().trim().min(1).max(120).nullable().optional(),
      campaign: z.string().trim().min(1).max(120).nullable().optional(),
      content: z.string().trim().min(1).max(120).nullable().optional(),
      term: z.string().trim().min(1).max(120).nullable().optional()
    })
    .optional(),
  pageUrl: z.string().url().nullable().optional(),
  referrer: z.string().nullable().optional()
});

const SERVICE_LABELS = {
  detail: "Detail",
  correct: "Paint correction",
  ceramic: "Ceramic / Graphene",
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  wheel: "Wheels (Powder / Refurb)",
  kit: "Bodykit",
  unsure: "I'm not sure yet"
};

const LANE_LABELS = {
  protect: "Protect it",
  present: "Present it",
  both: "Both"
};

const TIME_LABELS = {
  "this-week": "This week",
  "this-month": "This month",
  "no-rush": "No rush"
};

function formatServices(services) {
  const list = Array.isArray(services) ? services : [];
  const labels = list.map((id) => SERVICE_LABELS[id] || id).filter(Boolean);
  return labels.length ? labels.join(" · ") : "—";
}

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bullet(label, value) {
  const v = value == null || value === "" ? "—" : String(value);
  return `• <b>${escapeHtml(label)}:</b> ${escapeHtml(v)}`;
}

function yesNo(v) {
  return v ? "Yes" : "No";
}

function labelFor(map, value) {
  const key = value == null ? "" : String(value);
  return map && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : key;
}

function formatServiceDetailsHtml(lead) {
  const d = lead?.serviceDetails && typeof lead.serviceDetails === "object" ? lead.serviceDetails : {};
  const lines = [];

  if (d.ppf) {
    const p = d.ppf || {};
    lines.push("<b>PPF</b>");
    lines.push(
      bullet(
        "Coverage",
        labelFor(
          { "full-front": "Full front", "track-pack": "Track pack", full: "Full car", custom: "Custom panels" },
          p.coverage
        )
      )
    );
    lines.push(bullet("Film", labelFor({ clear: "Clear", stealth: "Stealth (matte)", colour: "Colour PPF", carbon: "Carbon / forged" }, p.film)));
    lines.push(bullet("Door jambs", yesNo(Boolean(p.doorJambs))));
    if (Array.isArray(p.panels) && p.panels.length) lines.push(bullet("Panels", p.panels.join(", ")));
    if (p.notes) lines.push(bullet("Notes", p.notes));
    lines.push("");
  }

  if (d.wrap) {
    const w = d.wrap || {};
    lines.push("<b>WRAP</b>");
    lines.push(bullet("Scope", labelFor({ full: "Full wrap", partial: "Partial / accents", custom: "Custom panels" }, w.scope)));
    if (w.finish) lines.push(bullet("Finish", labelFor({ gloss: "Gloss", satin: "Satin", matte: "Matte" }, w.finish)));
    if (w.scope === "full") lines.push(bullet("Door jambs", yesNo(Boolean(w.doorJambs))));
    if (Array.isArray(w.parts) && w.parts.length) lines.push(bullet("Parts", w.parts.join(", ")));
    if (Array.isArray(w.panels) && w.panels.length) lines.push(bullet("Panels", w.panels.join(", ")));
    if (w.colour) lines.push(bullet("Colour", w.colour));
    if (w.notes) lines.push(bullet("Notes", w.notes));
    lines.push("");
  }

  if (d.tint) {
    const t = d.tint || {};
    lines.push("<b>TINT</b>");
    lines.push(bullet("Windows", labelFor({ "front-2": "Front 2 windows", "rear-3": "Rear set", all: "All windows" }, t.windows)));
    lines.push(bullet("Shade", t.shade ? `${t.shade}%` : t.shade));
    if (t.notes) lines.push(bullet("Notes", t.notes));
    lines.push("");
  }

  if (d.ceramic) {
    const c = d.ceramic || {};
    lines.push("<b>CERAMIC / GRAPHENE</b>");
    lines.push(bullet("Package", labelFor({ "2y": "2 Year", "5y": "5 Year", "10y": "10 Year" }, c.package)));
    lines.push(bullet("Wheels", yesNo(Boolean(c.wheels))));
    lines.push(bullet("Glass", yesNo(Boolean(c.glass))));
    lines.push(bullet("Trim", yesNo(Boolean(c.trim))));
    if (c.notes) lines.push(bullet("Notes", c.notes));
    lines.push("");
  }

  if (d.correct) {
    const c = d.correct || {};
    lines.push("<b>PAINT CORRECTION</b>");
    lines.push(bullet("Stage", labelFor({ stage1: "Stage 1", stage2: "Stage 2", stage3: "Stage 3" }, c.stage)));
    if (c.notes) lines.push(bullet("Notes", c.notes));
    lines.push("");
  }

  if (d.detail) {
    const dd = d.detail || {};
    lines.push("<b>DETAIL</b>");
    lines.push(bullet("Type", labelFor({ full: "Full detail", interior: "Interior only", exterior: "Exterior only", sale: "Sale prep" }, dd.kind)));
    if (dd.notes) lines.push(bullet("Notes", dd.notes));
    lines.push("");
  }

  if (d.wheel) {
    const w = d.wheel || {};
    lines.push("<b>WHEELS</b>");
    lines.push(bullet("Service", labelFor({ powder: "Powder coating", refurb: "Refurb / repair" }, w.service)));
    lines.push(bullet("Finish", labelFor({ gloss: "Gloss", satin: "Satin", matte: "Matte" }, w.finish)));
    if (w.colour) lines.push(bullet("Colour", w.colour));
    if (w.notes) lines.push(bullet("Notes", w.notes));
    lines.push("");
  }

  if (d.kit) {
    const k = d.kit || {};
    lines.push("<b>BODYKIT</b>");
    if (k.notes) lines.push(bullet("Notes", k.notes));
    lines.push("");
  }

  // Trim trailing blank lines.
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.length ? lines.join("\n") : null;
}

function formatLeadMessage(lead) {
  const safe = (v) => (v ? String(v) : "—");
  const services = formatServices(lead.services);
  const lane = LANE_LABELS[lead.lane] || lead.lane || "—";
  const timing = TIME_LABELS[lead.timeframe] || lead.timeframe || "—";
  return [
    "NEW LEAD (M/C)",
    `${safe(lead.name)} wants: ${services}`,
    `Car: ${safe(lead.car)}`,
    `Lane: ${lane} · Timing: ${timing}`,
    `Phone: ${safe(lead.number)}`,
    `Lead ID: ${safe(lead.id)}`,
    `Source: ${safe(lead.source)}`,
    lead.pageUrl ? `Page: ${lead.pageUrl}` : null,
    lead.referrer ? `Referrer: ${lead.referrer}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function telegramLeadText(lead) {
  const safe = (v) => (v ? String(v) : "—");
  const services = formatServices(lead.services);
  const lane = LANE_LABELS[lead.lane] || lead.lane || "—";
  const timing = TIME_LABELS[lead.timeframe] || lead.timeframe || "—";
  const details = formatServiceDetailsHtml(lead);
  return (
    `🚗 <b>NEW LEAD (M/C)</b>\n` +
    `<b>${escapeHtml(safe(lead.name))}</b> wants: <b>${escapeHtml(services)}</b>\n` +
    `${bullet("Car", safe(lead.car))}\n` +
    `${bullet("Lane", lane)} · ${bullet("Timing", timing).replace("• ", "")}\n` +
    `${bullet("Phone", safe(lead.number))}\n` +
    `${bullet("Email", safe(lead.email))}\n` +
    `<b>Lead ID:</b> <code>${safe(lead.id)}</code>`
    + (details ? `\n\n${details}` : "")
  );
}

function getBaseUrl(request) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return null;
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function quoteLinkFor({ request, leadId }) {
  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return null;
  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return null;
  const t = hmacToken({ secret, leadId });
  return `${baseUrl}/q/${encodeURIComponent(leadId)}?t=${t}`;
}

function consultLinkFor({ request, leadId }) {
  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return null;
  const baseUrl = getBaseUrl(request);
  if (!baseUrl) return null;
  const t = hmacToken({ secret, leadId });
  return `${baseUrl}/consult/${encodeURIComponent(leadId)}?t=${t}`;
}

export async function POST(request) {
  let json;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const fullName = [parsed.data.name, parsed.data.surname].filter(Boolean).join(" ").trim();
  const lead = {
    ...parsed.data,
    firstName: parsed.data.name,
    surname: parsed.data.surname,
    name: fullName,
    id: crypto.randomUUID()
  };
  const createdAt = new Date().toISOString();

  const leadRecord = {
    ...lead,
    createdAt,
    status: "new"
  };

  // Attach or create a client record (repeat leads share the same clientId by phone).
  try {
    const client = await upsertClientForLead(leadRecord);
    if (client?.id) leadRecord.clientId = client.id;
    if (client?.leadCount) leadRecord.clientLeadCount = client.leadCount;
  } catch (err) {
    console.error("[lead][client-upsert-failed]", err);
  }

  await saveLead(leadRecord);

  // Always capture in logs (Vercel runtime logs are the simplest "inbox" to start with).
  console.log("[lead]", { createdAt, ...leadRecord });

  const quoteLink = quoteLinkFor({ request, leadId: leadRecord.id });
  const consultLink = consultLinkFor({ request, leadId: leadRecord.id });

  // Telegram (M&C): lead + call button only.
  const mcChatId = process.env.TELEGRAM_MC_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const mcToken = process.env.TELEGRAM_MC_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (mcChatId && mcToken) {
    try {
      const result = await telegramSendMessage({
        chatId: mcChatId,
        token: mcToken,
        text: telegramLeadText(leadRecord),
        replyMarkup: {
          inline_keyboard: [
            [{ text: "✅ Called", callback_data: `called:${leadRecord.id}` }],
            [
              { text: "🔎 Consult", callback_data: `consult_needed:${leadRecord.id}` },
              ...(consultLink ? [{ text: "📅 Schedule", url: consultLink }] : [])
            ]
          ]
        }
      });
      console.log("[lead][telegram][mc-send-ok]", { leadId: leadRecord.id, chatId: mcChatId, messageId: result?.message_id });
    } catch (err) {
      console.error("[lead][telegram][mc-send-failed]", err);
    }
  }

  // Telegram (Izimoto): quote-only message with link to /q.
  const iziChatId = process.env.TELEGRAM_IZI_CHAT_ID || mcChatId;
  const iziToken = process.env.TELEGRAM_IZI_BOT_TOKEN;
  if (iziChatId && iziToken && quoteLink) {
    try {
      const result = await telegramSendMessage({
        chatId: iziChatId,
        token: iziToken,
        text:
          `🧾 <b>QUOTE REQUEST</b>\n` +
          `<b>Lead ID:</b> <code>${leadRecord.id}</code>\n` +
          `<b>Client:</b> ${leadRecord.name || "—"} (${leadRecord.number || "—"})\n` +
          `<b>Car:</b> ${leadRecord.car || "—"}\n` +
          `\n<b>Quote link:</b> ${quoteLink}\n\n` +
          `Fill per-service pricing (ex VAT) and submit.`,
        replyMarkup: {
          inline_keyboard: [[{ text: "🧾 Open Quote Form", url: quoteLink }]]
        },
        disableWebPagePreview: false
      });
      console.log("[lead][telegram][izi-send-ok]", { leadId: leadRecord.id, chatId: iziChatId, messageId: result?.message_id });
    } catch (err) {
      console.error("[lead][telegram][izi-send-failed]", err);
    }
  }

  return Response.json({ ok: true, createdAt, leadId: leadRecord.id, clientId: leadRecord.clientId || null });
}
