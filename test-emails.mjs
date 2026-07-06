/**
 * Sends all 3 dark-mode email variants to Gmail for testing.
 * Run: node test-emails.mjs
 */

import {
  invoiceEmail,
  bookingEmail,
  magicLinkEmail,
} from "./lib/emailTemplates.js";

const RESEND_API_KEY = "re_djtp6Vsq_9Mta2gTFF2P8WwAuo2SjtaNX";
const FROM = "noreply@matthewsandclark.co.za";
const TO   = "kierandeclanredpath@gmail.com";

async function send({ subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: TO, subject, html, text: subject })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

const INVOICE = { name:"Kieran", car:"BMW M3 Touring", ref:"MC-0142", depositFormatted:"R 50 700", totalFormatted:"R 84 500", dueDate:"30 May 2026", url:"https://www.matthewsandclark.co.za/i/MC-0142" };
const BOOKING = { name:"Kieran", car:"BMW M3 Touring", slots:["2026-06-02T08:30:00+02:00","2026-06-04T08:30:00+02:00","2026-06-09T08:30:00+02:00","2026-06-11T08:30:00+02:00"], url:"https://www.matthewsandclark.co.za/b/MC-0142" };
const PORTAL  = { name:"Kieran", url:"https://www.matthewsandclark.co.za/portal?c=abc123&t=exp.sig" };

const tests = [
  { label:"Invoice",    fn: invoiceEmail,   args: INVOICE },
  { label:"Booking",    fn: bookingEmail,   args: BOOKING },
  { label:"Magic Link", fn: magicLinkEmail, args: PORTAL  },
];

console.log(`Sending ${tests.length} emails to ${TO}...\n`);
for (const t of tests) {
  try {
    const r = await send({ subject: `M/C — ${t.label}`, html: t.fn(t.args) });
    console.log(`✅ ${t.label} — ${r.id}`);
  } catch (e) {
    console.error(`❌ ${t.label} — ${e.message}`);
  }
}
console.log("\nDone.");
