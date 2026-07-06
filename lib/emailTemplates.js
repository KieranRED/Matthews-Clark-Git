/**
 * Matthews & Clark — Email Templates (dark only)
 *
 * Single responsive HTML: adapts desktop ↔ mobile via @media (max-width:600px).
 * Dark theme. Text colours are locked against Gmail mobile's render-layer inversion
 * via the gradient-clip text technique (u + .body selector).
 *
 * HOW COLOUR OVERRIDE IS PREVENTED:
 *
 * Backgrounds (all clients):
 *   background-image:linear-gradient(colour,colour) — Gmail does NOT invert
 *   background-image values, only background-color. Identical stops = solid colour.
 *
 * Text in Gmail mobile app (iOS/Android):
 *   Gmail's dark mode inverts text `color:` at the RENDER LAYER — !important cannot
 *   stop it. Fix: set color:transparent + paint the text via background-image clipped
 *   to text shape. Gmail doesn't invert background-image, so the colour is locked.
 *   Targeted via `u + .body .fg` — Gmail injects <u> before <body class="body">;
 *   other clients don't have this <u> so the rule never fires there.
 *
 * Outlook.com dark mode:
 *   Outlook adds data-ogsc to overridden color: elements, data-ogsb to backgrounds.
 *   Target via [data-ogsc] and [data-ogsb] selectors.
 *
 * Exports:
 *   invoiceEmail, bookingEmail, portalEmail, magicLinkEmail
 *   (plus *Dark aliases for test-emails.mjs compatibility)
 */

// ── Theme tokens ──────────────────────────────────────────────────────────

const T = {
  BG_0:  "#050505", BG_1: "#0A0A0A", BG_2: "#111111",
  BD_1:  "rgba(255,255,255,.08)", BD_2: "rgba(255,255,255,.14)",
  FG:    "#FFFFFF", FG2: "#B3B3B3", FG3: "#737373", FG_MUTE: "#4D4D4D",
  BLUE:  "#1F4FFF", BLUE_LT: "#4A78FF",
  HR:    "#1C1C1C",
};

// ── Core helpers ──────────────────────────────────────────────────────────

// Locks background colour in Gmail (gradient-image is not inverted by Gmail)
function bg(c) {
  return `background-color:${c};background-image:linear-gradient(${c},${c});`;
}

// Text colour locked via gradient-clip. Applied on elements with class .fg/.fg2/etc.
// via `u + .body` selector which ONLY targets Gmail. All other clients use inline color:.
function clipRule(cls, hex) {
  return `u + .body .${cls}{color:transparent!important;-webkit-text-fill-color:transparent!important;background-image:linear-gradient(${hex},${hex})!important;-webkit-background-clip:text!important;background-clip:text!important;}`;
}

// M/C mark — text-only (transform:skewX and display:inline-table both stripped by Gmail)
function mcMark(sz = 18) {
  return `<table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
    <td class="fg" style="font-family:'Anton',Impact,sans-serif;font-size:${sz}px;color:${T.FG};letter-spacing:.04em;line-height:1;text-transform:uppercase;">M<span class="fgb" style="color:${T.BLUE};">/</span>C</td>
  </tr></table>`;
}

// Blue slash for headlines
function slash() {
  return `<span class="fgb" style="color:${T.BLUE};font-family:'Anton',Impact,'Arial Black',sans-serif;"> / </span>`;
}

// Pill CTA — Outlook VML + modern
function pillBtn(label, url) {
  return `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="50%" strokecolor="${T.BLUE}" fillcolor="${T.BLUE}"><w:anchorlock/><center style="color:#fff;font-family:Arial;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!-->
<a href="${url}" class="btn-a" style="display:inline-block;padding:14px 28px;border-radius:999px;${bg(T.BLUE)}color:#ffffff;text-decoration:none;font-family:'Archivo','Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;"><span style="color:#ffffff;">${label} &nbsp;&rarr;</span></a>
<!--<![endif]-->`;
}

// ── CSS ───────────────────────────────────────────────────────────────────

function themeCSS() {
  return `
    /* ── Gmail mobile: gradient-clip locks text (Gmail never inverts background-image) ── */
    ${clipRule("fg",   T.FG)}
    ${clipRule("fg2",  T.FG2)}
    ${clipRule("fg3",  T.FG3)}
    ${clipRule("fgm",  T.FG_MUTE)}
    ${clipRule("fgb",  T.BLUE)}
    ${clipRule("fgbl", T.BLUE_LT)}

    /* ── Outlook.com dark mode (data-ogsc = color override, data-ogsb = bg override) ── */
    [data-ogsc] .fg   { color:${T.FG}!important; }
    [data-ogsc] .fg2  { color:${T.FG2}!important; }
    [data-ogsc] .fg3  { color:${T.FG3}!important; }
    [data-ogsc] .fgm  { color:${T.FG_MUTE}!important; }
    [data-ogsc] .fgb  { color:${T.BLUE}!important; }
    [data-ogsc] .fgbl { color:${T.BLUE_LT}!important; }
    [data-ogsb] .bg0  { ${bg(T.BG_0)} }
    [data-ogsb] .bg1  { ${bg(T.BG_1)} }
    [data-ogsb] .bg2  { ${bg(T.BG_2)} }`;
}

// ── Shell ─────────────────────────────────────────────────────────────────

function shell({ preheader = "", subject = "", bodyRows = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${subject}</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;700&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  /* ── Reset ── */
  body,.body{margin:0!important;padding:0!important;${bg(T.BG_0)}}
  /* ── Gmail webmail body bg ── */
  u+.body{background-color:${T.BG_0}!important;}
  u+.body .ow{${bg(T.BG_0)}}
  u+.body .card{${bg(T.BG_1)}}

  /* ── Text colour protection: Gmail mobile + Outlook.com ── */
  ${themeCSS()}

  /* ── Mobile layout ── */
  @media only screen and (max-width:600px){
    .card{width:100%!important;border-radius:0!important;border-left:none!important;border-right:none!important;}
    .outer-cell{padding:8px 0!important;}
    .hdr-pad{padding:22px 16px 18px!important;}
    .h1{font-size:32px!important;line-height:1.05!important;}
    .sec-pad{padding:20px 16px 12px!important;}
    .c-pad{padding-left:14px!important;padding-right:14px!important;}
    .det-cell{display:block!important;width:100%!important;box-sizing:border-box!important;}
    .btn-a{display:block!important;text-align:center!important;box-sizing:border-box!important;}
    .foot-mark{display:block!important;width:auto!important;padding-right:0!important;padding-bottom:16px!important;}
    .foot-col{display:block!important;width:100%!important;padding-right:0!important;padding-bottom:14px!important;}
    .foot-legal td{display:block!important;text-align:left!important;}
  }
</style>
</head>
<body class="body" style="margin:0;padding:0;${bg(T.BG_0)}-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table class="ow" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="${bg(T.BG_0)}">
  <tr>
    <td class="outer-cell" align="center" style="padding:40px 20px;${bg(T.BG_0)}">
      <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table class="card" width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="width:100%;max-width:600px;${bg(T.BG_1)}border:1px solid ${T.BD_1};border-radius:14px;">
        ${bodyRows}
        ${footer()}
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── Layout blocks ─────────────────────────────────────────────────────────

function hr() {
  return `<tr><td class="bhr" height="1" style="${bg(T.HR)}line-height:1px;font-size:1px;">&nbsp;</td></tr>`;
}

function header({ pillText, ref, headlineRows, sub }) {
  return `<tr>
    <td class="bg1" style="${bg(T.BG_1)}">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr><td class="hdr-pad" style="padding:36px 28px 30px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
            <td style="vertical-align:middle;">
              <span class="fgbl" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:10px;letter-spacing:.18em;color:${T.BLUE_LT};text-transform:uppercase;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:${T.BLUE};vertical-align:middle;margin-right:8px;"></span>${pillText}${ref ? ` &middot; ${ref}` : ""}
              </span>
            </td>
            <td align="right" style="vertical-align:middle;padding-left:12px;">${mcMark(18)}</td>
          </tr></table>
          <div class="fg h1" style="margin-top:28px;font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:48px;line-height:.95;letter-spacing:-.01em;color:${T.FG};text-transform:uppercase;">
            ${headlineRows}
          </div>
          ${sub ? `<p class="fg2" style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Inter Tight','Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:${T.FG2};max-width:420px;">${sub}</p>` : ""}
        </td></tr>
      </table>
    </td>
  </tr>${hr()}`;
}

function sectionHead(title, num, label) {
  return `<tr><td class="sec-pad" style="padding:28px 28px 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
      <td class="fg" style="font-family:'Anton',Impact,sans-serif;font-size:22px;letter-spacing:.04em;color:${T.FG};text-transform:uppercase;font-weight:400;">${title}</td>
      <td align="right" style="white-space:nowrap;padding-left:8px;vertical-align:bottom;">
        <span class="fg3" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:10px;letter-spacing:.18em;color:${T.FG3};text-transform:uppercase;">
          <span class="fgb" style="color:${T.BLUE};">${num}</span> &middot; ${label}
        </span>
      </td>
    </tr></table>
  </td></tr>`;
}

function detailGrid(cells) {
  const ch = cells.map(c => `
    <td class="bg2 det-cell" width="50%" valign="top" style="${bg(T.BG_2)}padding:20px;border:1px solid ${T.BD_1};">
      <div class="fg3" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:9px;letter-spacing:.18em;color:${T.FG3};text-transform:uppercase;margin-bottom:6px;">${c.lbl}</div>
      <div class="fg" style="font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:24px;line-height:1;letter-spacing:.02em;color:${T.FG};text-transform:uppercase;">${c.val}</div>
      ${c.sub ? `<div class="fg3" style="margin-top:6px;font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:11px;color:${T.FG3};letter-spacing:.04em;">${c.sub}</div>` : ""}
    </td>`).join("");
  return `<tr><td class="c-pad" style="padding:0 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr>${ch}</tr></table>
  </td></tr>`;
}

function ctaRow({ primary }) {
  return `<tr><td class="c-pad" style="padding:24px 28px 0;">
    ${primary ? pillBtn(primary.label, primary.url) : ""}
  </td></tr>`;
}

function nextBlock({ eyebrowText, title, paragraphs }) {
  const ps = paragraphs.map(p =>
    `<p class="fg2" style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Inter Tight','Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${T.FG2};">${p}</p>`
  ).join("");
  return `<tr><td class="c-pad" style="padding:24px 28px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border:1px solid ${T.BD_1};border-radius:12px;">
      <tr><td class="bg2" style="${bg(T.BG_2)}padding:22px;">
        <div class="fgbl" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:10px;letter-spacing:.18em;color:${T.BLUE_LT};text-transform:uppercase;margin-bottom:8px;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:${T.BLUE};vertical-align:middle;margin-right:8px;"></span>${eyebrowText}
        </div>
        <div class="fg" style="font-family:'Anton',Impact,sans-serif;font-size:22px;letter-spacing:.04em;color:${T.FG};text-transform:uppercase;font-weight:400;margin-bottom:12px;">${title}</div>
        ${ps}
      </td></tr>
    </table>
  </td></tr>`;
}

function footer({ partnerName, partnerEmail, partnerPhone } = {}) {
  return `<tr>
    <td class="bg0" style="${bg(T.BG_0)}border-top:1px solid ${T.BD_1};">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
        <tr><td style="padding:28px 28px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
            <td class="foot-mark" valign="top" style="width:96px;padding-right:16px;">${mcMark(22)}</td>
            <td valign="top">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
                <td class="foot-col" valign="top" style="width:50%;padding-right:12px;">
                  <div class="fg3" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:9px;letter-spacing:.18em;color:${T.FG3};text-transform:uppercase;margin-bottom:6px;">Studio</div>
                  <div class="fg2" style="font-family:-apple-system,'Inter Tight',Arial,sans-serif;font-size:12px;line-height:1.65;color:${T.FG2};">3 Muir Road<br>Woodstock &middot; Cape Town<br>+27 82 847 7701</div>
                </td>
                <td class="foot-col" valign="top">
                  <div class="fg3" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:9px;letter-spacing:.18em;color:${T.FG3};text-transform:uppercase;margin-bottom:6px;">Your partner</div>
                  <div class="fg2" style="font-family:-apple-system,'Inter Tight',Arial,sans-serif;font-size:12px;line-height:1.65;color:${T.FG2};">${partnerName || "Keanan Matthew"}<br>${partnerPhone || "+27 82 847 7701"}</div>
                </td>
              </tr></table>
            </td>
          </tr></table>
          <table class="foot-legal" width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:20px;border-top:1px solid ${T.BD_1};">
            <tr><td style="padding-top:14px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
                <td class="fgm" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:9px;letter-spacing:.12em;color:${T.FG_MUTE};text-transform:uppercase;">Matthews / Clark &middot; Concierge auto styling &middot; Cape Town</td>
                <td class="fgm" align="right" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:9px;letter-spacing:.12em;color:${T.FG_MUTE};text-transform:uppercase;white-space:nowrap;">&copy; 2026</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

// ── Email builders ────────────────────────────────────────────────────────

export function invoiceEmail({ name, car, ref, depositFormatted, totalFormatted, dueDate, url }) {
  const safeName = String(name || "there").replace(/</g, "&lt;");
  const safeCar  = String(car  || "your vehicle").replace(/</g, "&lt;");
  const safeRef  = String(ref  || "MC-0000").replace(/</g, "&lt;");

  const bodyRows = `
  ${header({
    pillText: "Invoice ready",
    ref: safeRef,
    headlineRows: `Your invoice<br>is${slash()}ready.`,
    sub: `Hi ${safeName} — your invoice for the <strong style="color:${T.FG};font-weight:600;">${safeCar}</strong> is below. Pay the 60% deposit and we&#8217;ll confirm your drop-off.`
  })}
  ${sectionHead("The invoice", "01", "PAYMENT")}
  ${detailGrid([
    { lbl: "Deposit due (60%)", val: depositFormatted || "—", sub: dueDate ? `By ${dueDate}` : "" },
    { lbl: "Total invoice",     val: totalFormatted  || "—", sub: `Ref ${safeRef}` }
  ])}
  ${ctaRow({ primary: { label: "View & download invoice", url } })}
  ${nextBlock({
    eyebrowText: "What happens next",
    title: "Pay, then we book you in",
    paragraphs: [
      "Once the deposit clears we&#8217;ll confirm your drop-off date via email and SMS. The balance is due on collection.",
      "Need a different payment arrangement? Reply to this email or call Sam directly."
    ]
  })}
  <tr><td height="32" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>`;

  return shell({
    preheader: `Invoice ${safeRef} ready — ${depositFormatted || "view invoice"} deposit due.`,
    subject: `Matthews & Clark — Invoice ${safeRef}`,
    bodyRows
  });
}

export function bookingEmail({ name, car, slots = [], url }) {
  const safeName = String(name || "there").replace(/</g, "&lt;");
  const safeCar  = String(car  || "your vehicle").replace(/</g, "&lt;");

  const slotItems = slots.slice(0, 4).map((iso, i) => {
    let label = String(iso);
    try {
      label = new Date(iso).toLocaleString("en-ZA", {
        weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit"
      });
    } catch {}
    return `<tr><td style="padding-top:${i === 0 ? 0 : 8}px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-radius:10px;">
        <tr>
          <td class="bg2" style="${bg(T.BG_2)}padding:14px 18px;vertical-align:middle;border:1px solid ${T.BD_1};border-radius:10px 0 0 10px;">
            <div style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:5px;">
              <span class="fgb" style="color:${T.BLUE};">${String(i + 1).padStart(2, "0")}</span>
              <span class="fgbl" style="color:${T.BLUE_LT};"> &middot; OPTION</span>
            </div>
            <div class="fg" style="font-family:-apple-system,'Inter Tight',Arial,sans-serif;font-size:14px;color:${T.FG};font-weight:600;">${label}</div>
          </td>
          <td class="bg2" align="right" style="${bg(T.BG_2)}padding:14px 18px;vertical-align:middle;width:64px;border:1px solid ${T.BD_1};border-left:none;border-radius:0 10px 10px 0;">
            <span class="fgbl" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:10px;letter-spacing:.14em;color:${T.BLUE_LT};text-transform:uppercase;">PICK &rarr;</span>
          </td>
        </tr>
      </table>
    </td></tr>`;
  }).join("");

  const bodyRows = `
  ${header({
    pillText: "Booking · deposit confirmed",
    ref: "",
    headlineRows: `Pick your<br>drop${slash()}off date.`,
    sub: `Hi ${safeName} — thanks for the deposit. Pick a slot for the <strong style="color:${T.FG};font-weight:600;">${safeCar}</strong> and we&#8217;ll lock it in.`
  })}
  ${sectionHead("Available slots", "01", "DROP-OFF")}
  <tr><td class="c-pad" style="padding:0 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">${slotItems}</table>
  </td></tr>
  ${ctaRow({ primary: { label: "Confirm your date", url } })}
  ${nextBlock({
    eyebrowText: "If none of these work",
    title: "Tell us when does",
    paragraphs: [
      "Reply to this email with a date that suits and we&#8217;ll do our best to make it happen — or tap the button above and pick &#8220;Request a different date&#8221; on the page."
    ]
  })}
  <tr><td height="32" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>`;

  return shell({
    preheader: `Deposit confirmed — pick your drop-off date for ${safeCar}.`,
    subject: "Matthews & Clark — Choose your booking date",
    bodyRows
  });
}

/**
 * Magic-link / portal access email.
 * Sent when a client requests a sign-in link. The link grants a 30-day session.
 */
export function magicLinkEmail({ name, url }) {
  const safeName = name ? String(name).replace(/</g, "&lt;") : "";

  const bodyRows = `
  ${header({
    pillText: "Secure sign-in link",
    ref: "",
    headlineRows: `Open${slash()}your build.`,
    sub: `${safeName ? `Hi ${safeName} — tap` : "Tap"} the button below to access your Matthews &amp; Clark portal. No password needed — this link signs you straight in.`
  })}
  ${ctaRow({ primary: { label: "Open my portal", url } })}
  ${nextBlock({
    eyebrowText: "Inside the portal",
    title: "Everything in one place",
    paragraphs: [
      "Track your build in real time, view quotes and invoices, confirm your booking, and add photos to your garage.",
      `<span class="fg3" style="font-family:'JetBrains Mono','Courier New',Courier,monospace;font-size:10px;color:${T.FG3};word-break:break-all;">${url}</span>`
    ]
  })}
  ${nextBlock({
    eyebrowText: "Heads up",
    title: "This link expires in 15 min",
    paragraphs: [
      "Once you sign in, your session stays active for 30 days — no need to request another link.",
      "Didn&#8217;t request this? Ignore the email — your account is safe."
    ]
  })}
  <tr><td height="32" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>`;

  return shell({
    preheader: `${safeName ? `${safeName}, your` : "Your"} Matthews & Clark portal link — tap to sign in.`,
    subject: "Matthews & Clark — Sign in to your portal",
    bodyRows
  });
}

// ── Paint Correction funnel emails ─────────────────────────────────────────

// Contact number for the (no-reply) funnel emails. Override via env if needed.
const PC_WA_RAW = (process.env.MC_WHATSAPP_NUMBER || "+27 82 847 7701").trim();
const PC_WA_DISPLAY = PC_WA_RAW;
const PC_WA_LINK = "https://wa.me/" + PC_WA_RAW.replace(/[^\d]/g, "");


/**
 * Booking confirmation / thank-you — sent the moment a client uploads their POP
 * on the paint-correction funnel. Cult-brand voice: confident, Cape Town,
 * honest. Returns { subject, html, text }.
 */
export function pcBookingConfirmationEmail({ name, car, packageName, ceramic, reference, dropoff, pickup, depositFormatted, dueAtDropoffFormatted, dueAtPickupFormatted } = {}) {
  const safeName = String(name || "there").replace(/</g, "&lt;");
  const safeCar = String(car || "your car").replace(/</g, "&lt;");
  const pkg = String(packageName || "Paint correction").replace(/</g, "&lt;") + (ceramic ? " + Ceramic" : "");
  const ref = String(reference || "").replace(/</g, "&lt;");
  const hasPickupBalance = !!dueAtPickupFormatted;

  const bodyRows = `
  ${header({
    pillText: "Booking · slot held",
    ref,
    headlineRows: `Your slot&#8217;s${slash()}held.`,
    sub: `Thanks ${safeName} — we&#8217;ve got the <strong style="color:${T.FG};font-weight:600;">${safeCar}</strong> down for ${pkg}. When your car&#8217;s in, it gets our full attention. Your slot&#8217;s confirmed the moment your hold payment reflects.`
  })}
  ${sectionHead("Your booking", "01", "PAINT CORRECTION")}
  ${detailGrid([
    { lbl: "Drop-off", val: dropoff || "—", sub: "Bring it to us" },
    { lbl: "Pickup", val: pickup || "—", sub: "Reveal in person" }
  ])}
  ${detailGrid([
    { lbl: "Package", val: pkg, sub: ref ? `Ref ${ref}` : "" },
    { lbl: "Slot hold paid", val: depositFormatted || "—", sub: `${dueAtDropoffFormatted || "—"} at drop-off` }
  ])}
  ${hasPickupBalance ? detailGrid([
    { lbl: "Due at pickup", val: dueAtPickupFormatted, sub: "Settled when you collect" }
  ]) : ""}
  ${nextBlock({
    eyebrowText: "What happens next",
    title: "We verify, then we confirm",
    paragraphs: [
      "A proof of payment can&#8217;t prove the cash has cleared — only the bank can. Sam or Keanan checks it against the actual deposit, then confirms your slot. Until then it&#8217;s held just for you.",
      `We&#8217;ll send a reminder before drop-off. ${dueAtDropoffFormatted || "The rest"} is due at drop-off, before work starts${hasPickupBalance ? ` — the remaining ${dueAtPickupFormatted} is due at pickup` : ""}. No surprises at pickup.`
    ]
  })}
  ${nextBlock({
    eyebrowText: "Questions or need to move it?",
    title: "Message us on WhatsApp",
    paragraphs: [
      `This inbox isn&#8217;t monitored — for anything at all, WhatsApp us on <a href="${PC_WA_LINK}" style="color:${T.BLUE_LT};font-weight:600;text-decoration:underline;">${PC_WA_DISPLAY}</a> and we&#8217;ll sort it. Plans change? We&#8217;ll shift your date — the hold&#8217;s transferable.`
    ]
  })}
  <tr><td height="32" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>`;

  const html = shell({
    preheader: `Slot held for the ${safeCar} — ${pkg}. ${dropoff || ""} → ${pickup || ""}.`,
    subject: "Matthews & Clark — Your slot's held",
    bodyRows
  });

  const text = [
    `Thanks ${name || "there"} — your slot's held.`,
    ``,
    `Car: ${car || "your car"}`,
    `Package: ${packageName || "Paint correction"}${ceramic ? " + Ceramic" : ""}`,
    reference ? `Reference: ${reference}` : null,
    `Drop-off: ${dropoff || "—"}  →  Pickup: ${pickup || "—"}`,
    `Slot hold paid: ${depositFormatted || "—"}  ·  Due at drop-off: ${dueAtDropoffFormatted || "—"}${hasPickupBalance ? `  ·  Due at pickup: ${dueAtPickupFormatted}` : ""}`,
    ``,
    `When your car's in, it gets our full attention. Sam or Keanan will verify your hold payment against the bank, then confirm your slot. We'll remind you before drop-off.`,
    ``,
    `This inbox isn't monitored — questions or need to move your date? WhatsApp us on ${PC_WA_DISPLAY}. The hold's transferable.`,
    ``,
    `Matthews / Clark — Woodstock, Cape Town`
  ].filter((l) => l !== null).join("\n");

  return { subject: "Matthews & Clark — Your slot's held", html, text };
}

/**
 * Pre-drop-off reminder — sent at intervals before the booked date by the
 * paint-correction reminder cron. `lead` controls the copy via `kind`:
 * "3day" (a few days out) or "1day" (tomorrow). Returns { subject, html, text }.
 */
export function pcReminderEmail({ name, car, packageName, dropoff, pickup, dueAtDropoffFormatted, dueAtPickupFormatted, kind = "1day" } = {}) {
  const safeName = String(name || "there").replace(/</g, "&lt;");
  const safeCar = String(car || "your car").replace(/</g, "&lt;");
  const pkg = String(packageName || "Paint correction").replace(/</g, "&lt;");
  const soon = kind === "3day";

  const headline = soon ? `Not long${slash()}now.` : `See you${slash()}tomorrow.`;
  const pill = soon ? "Reminder · drop-off soon" : "Reminder · drop-off tomorrow";
  const sub = soon
    ? `Heads up ${safeName} — the <strong style="color:${T.FG};font-weight:600;">${safeCar}</strong> is booked in for ${dropoff || "soon"}. Give it a rinse if you can, and we&#8217;ll take it from there.`
    : `Tomorrow&#8217;s the day, ${safeName}. Bring the <strong style="color:${T.FG};font-weight:600;">${safeCar}</strong> through and we&#8217;ll get to work. A quick wash beforehand helps us read the paint properly.`;

  const bodyRows = `
  ${header({ pillText: pill, ref: "", headlineRows: headline, sub })}
  ${sectionHead("The plan", "01", pkg.toUpperCase())}
  ${detailGrid([
    { lbl: "Drop-off", val: dropoff || "—", sub: "14 Albert Rd, Woodstock" },
    { lbl: "Pickup", val: pickup || "—", sub: "We reveal it in person" }
  ])}
  ${nextBlock({
    eyebrowText: "On the day",
    title: "What to bring",
    paragraphs: [
      "Just the car and the keys. Point out the marks that bug you most — that&#8217;s where we focus first.",
      dueAtDropoffFormatted
        ? `${dueAtDropoffFormatted} is due at drop-off, before work starts.${dueAtPickupFormatted ? ` The remaining ${dueAtPickupFormatted} is due at pickup.` : ""}`
        : "The remaining balance is due at drop-off, before work starts."
    ]
  })}
  ${nextBlock({
    eyebrowText: "Something came up?",
    title: "Message us on WhatsApp",
    paragraphs: [`No stress — this inbox isn&#8217;t monitored, so WhatsApp us on <a href="${PC_WA_LINK}" style="color:${T.BLUE_LT};font-weight:600;text-decoration:underline;">${PC_WA_DISPLAY}</a> and we&#8217;ll find a new date. Your hold moves with you.`]
  })}
  <tr><td height="32" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>`;

  const subject = soon ? "Matthews & Clark — Your slot's coming up" : "Matthews & Clark — See you tomorrow";
  const html = shell({
    preheader: `${soon ? "Coming up" : "Tomorrow"}: ${safeCar} — drop-off ${dropoff || ""}.`,
    subject,
    bodyRows
  });

  const text = [
    soon ? `Heads up ${name || "there"} — not long now.` : `See you tomorrow, ${name || "there"}.`,
    ``,
    `Car: ${car || "your car"} · ${packageName || "Paint correction"}`,
    `Drop-off: ${dropoff || "—"} (14 Albert Rd, Woodstock)  →  Pickup: ${pickup || "—"}`,
    dueAtDropoffFormatted ? `Due at drop-off: ${dueAtDropoffFormatted}${dueAtPickupFormatted ? `  ·  Due at pickup: ${dueAtPickupFormatted}` : ""}` : null,
    ``,
    `Bring the car and the keys, and point out the marks that bug you most. Something came up? WhatsApp us on ${PC_WA_DISPLAY} and we'll move it — your hold comes with you.`,
    ``,
    `Matthews / Clark — Woodstock, Cape Town`
  ].filter((l) => l !== null).join("\n");

  return { subject, html, text };
}

// portalEmail is an alias kept for any existing callers
export const portalEmail = magicLinkEmail;

// *Dark aliases kept for test-emails.mjs and any direct imports
export const invoiceEmailDark = invoiceEmail;
export const bookingEmailDark = bookingEmail;
export const portalEmailDark  = magicLinkEmail;
