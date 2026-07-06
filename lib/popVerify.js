// Proof-of-payment verification for the paint-correction funnel.
//
// Reads an uploaded POP (PDF or image) and checks it against the expected
// booking values — deposit amount, beneficiary account/name, booking reference,
// a recent payment date — plus a document-authenticity signal from PDF metadata
// (bank-generated vs screenshot/edited/image). PDFs are read with `unpdf`
// (text + metadata); images (and image-only PDFs) are OCR'd with OpenAI vision
// when OPENAI_API_KEY is set. Never throws — always returns a verdict so the
// human approver gets a signal, and the slot is held regardless.

import { extractText, getDocumentProxy } from "unpdf";
import OpenAI from "openai";

// PDF producers/creators that indicate an edited or screenshotted document
// (i.e. NOT a statement exported straight from a banking app).
const EDIT_TOOLS = /canva|photoshop|gimp|microsoft word|powerpoint|figma|sketch|illustrator|quartz|skia\/?pdf|chromium|headless|wkhtmltopdf|pillow|screenshot|paint\.net|inkscape|libreoffice|pages|keynote/i;

function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function ocrImage(buffer, type) {
  if (!hasOpenAI()) return "";
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const b64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${type || "image/jpeg"};base64,${b64}`;
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "This is a proof of payment / bank transfer receipt. Transcribe ALL visible text verbatim — amounts, account numbers, names, reference, and the payment date. Output plain text only, no commentary." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ]
    });
    return r.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("[popVerify][ocr-failed]", String(err?.message || err));
    return "";
  }
}

// Does the expected amount appear, allowing R/ZAR prefixes, thousands separators
// (space or comma) and an optional .00 / ,00 ending?
function amountPresent(text, amount) {
  if (!amount) return false;
  const intStr = String(Math.round(amount));
  const grouped = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, "[\\s,]?");
  const re = new RegExp("(?:r|zar)?\\s*" + grouped + "(?:[.,]00)?(?!\\d)", "i");
  return re.test(String(text || "").replace(/ /g, " "));
}

function lastNameOf(name) {
  const parts = String(name || "").trim().split(/\s+/);
  return parts.length ? parts[parts.length - 1] : "";
}

// Looks for a payment date within the last few days, in common ZA formats.
function recentDatePresent(text) {
  const hay = String(text || "").toLowerCase();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const today = new Date();
  for (let back = 0; back <= 3; back++) {
    const d = new Date(today);
    d.setDate(d.getDate() - back);
    const yyyy = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const mm = String(m).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const mon = months[d.getMonth()];
    const candidates = [
      `${yyyy}-${mm}-${dd}`,
      `${yyyy}/${mm}/${dd}`,
      `${dd}/${mm}/${yyyy}`,
      `${dd}-${mm}-${yyyy}`,
      `${dd}/${m}/${yyyy}`,
      `${day} ${mon}`,
      `${mon} ${day}`,
      `${dd} ${mon}`
    ];
    if (candidates.some((c) => hay.includes(c))) return true;
  }
  return false;
}

function formatMoney(n) {
  return "R" + Number(n || 0).toLocaleString("en-ZA");
}

/**
 * @param {{ buffer: Buffer|Uint8Array, type?: string, fileName?: string,
 *           expected: { deposit?: number, reference?: string,
 *                       accountLast4?: string, holderName?: string, bankName?: string } }} args
 * @returns {Promise<{ verdict: 'pass'|'review', checks: Array, producer: string|null,
 *                     creator: string|null, ocrSource: string, textLength: number,
 *                     openaiUsed: boolean }>}
 */
export async function verifyPop({ buffer, type, fileName, expected = {} }) {
  const isPdf = /pdf/i.test(type || "") || /\.pdf$/i.test(fileName || "");
  let text = "";
  let producer = null;
  let creator = null;
  let ocrSource = "none";
  let openaiUsed = false;

  if (isPdf) {
    let pdf = null;
    try {
      pdf = await getDocumentProxy(new Uint8Array(buffer));
      const meta = await pdf.getMetadata().catch(() => null);
      producer = meta?.info?.Producer || null;
      creator = meta?.info?.Creator || null;
      const { text: t } = await extractText(pdf, { mergePages: true });
      text = Array.isArray(t) ? t.join("\n") : t || "";
      ocrSource = "pdf-text";
    } catch (err) {
      console.error("[popVerify][pdf-failed]", String(err?.message || err));
    } finally {
      try { await pdf?.destroy?.(); } catch {}
    }
    // Image-only / scanned PDF with no extractable text → OCR the rendered file.
    if (!text.trim() && hasOpenAI()) {
      text = await ocrImage(buffer, "application/pdf");
      ocrSource = "pdf-image-ocr";
      openaiUsed = true;
    }
  } else {
    text = await ocrImage(buffer, type);
    ocrSource = "image-ocr";
    openaiUsed = hasOpenAI();
  }

  const norm = text.toLowerCase().replace(/\s+/g, " ");
  const digits = text.replace(/[^0-9]/g, "");

  const checks = [];

  // Deposit amount.
  const amtPass = amountPresent(text, expected.deposit);
  checks.push({ id: "amt", label: "Slot hold amount", value: amtPass ? formatMoney(expected.deposit) : "not found", pass: amtPass });

  // Beneficiary — account last-4 OR holder name / surname.
  const last4 = expected.accountLast4 || "";
  const holder = (expected.holderName || "").toLowerCase();
  const surname = lastNameOf(expected.holderName).toLowerCase();
  const benPass = Boolean((last4 && digits.includes(last4)) || (holder && norm.includes(holder)) || (surname && surname.length > 2 && norm.includes(surname)));
  checks.push({ id: "ben", label: `Beneficiary · ${expected.bankName || "bank"} ··${last4 || "—"}`, value: benPass ? "matched" : "not found", pass: benPass });

  // Booking reference.
  const ref = (expected.reference || "").toLowerCase();
  const refPass = Boolean(ref && norm.includes(ref));
  checks.push({ id: "ref", label: "Booking reference", value: refPass ? expected.reference : "not found", pass: refPass });

  // Recent payment date.
  const datePass = recentDatePresent(text);
  checks.push({ id: "date", label: "Recent payment date", value: datePass ? "recent" : "unclear", pass: datePass });

  // Document source / authenticity.
  let srcPass = true;
  let srcVal = "Bank-generated PDF";
  if (!isPdf) {
    srcPass = false;
    srcVal = openaiUsed ? "Image / screenshot (OCR'd)" : "Image — couldn't auto-read";
  } else if (producer && EDIT_TOOLS.test(`${producer} ${creator || ""}`)) {
    srcPass = false;
    srcVal = `Edited / screenshot — ${producer}`;
  } else if (!text.trim()) {
    srcPass = false;
    srcVal = "Scanned image PDF — verify";
  } else if (producer) {
    srcVal = `Bank PDF (${producer})`;
  }
  checks.push({ id: "src", label: "Document source", value: srcVal, pass: srcPass });

  const financialOk = ["amt", "ben", "ref"].every((id) => checks.find((c) => c.id === id)?.pass);
  const verdict = financialOk && checks.find((c) => c.id === "src")?.pass ? "pass" : "review";

  return { verdict, checks, producer, creator, ocrSource, textLength: text.length, openaiUsed };
}
