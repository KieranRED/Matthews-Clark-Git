import { Resend } from "resend";

export function hasResend() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("Missing EMAIL_FROM");
  const resend = getResend();
  const res = await resend.emails.send({
    from,
    to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {})
  });
  if (res?.error) throw new Error(res.error?.message || "Failed to send email");
  return res?.data || res;
}

