// Matthews & Clark — Paint Correction funnel: data + recommendation engine + calendar.
// Plain ES module (client-safe — no window, no DOM). Ported from the UI-kit prototype.

// ─────────────── Packages (flat pricing, no vehicle-size factor) ───────────────
// level: 1..5 used by the recommendation engine.
export const PC_PACKAGES = [
  {
    id: "stage-one", level: 1, name: "STREET GLOSS", metal: "#9AA7B4",
    tagline: "Express gloss — deep & fast", price: 5500, days: 1, bin: "revival",
    blurb: "Quick, sharp, affordable. An express paint correction focused on gloss — it floods the paint with a deep, wet shine, brightening and richening the finish fast. It's about shine, not full swirl removal.",
    chips: ["Express gloss correction", "Exterior wash", "Interior vacuum", "No protection", "1 day"],
    protection: "none",
    ceramic: null
  },
  {
    id: "bronze", level: 2, name: "BRONZE", metal: "#C8825A",
    tagline: "Swirls & haze, gone", price: 8500, days: 1, bin: "revival",
    blurb: "Two-step correction removing light-to-moderate swirl marks and haze across the whole car — heavy cut then fine polish — finished and protected. Your daily driver, brought back to life.",
    chips: ["Two-step correction", "Full wash + decon", "Full interior detail", "Wax sealant", "1 day"],
    protection: "wax",
    // ceramic on Bronze CHANGES duration (base is same-day wax sealant)
    ceramic: { label: "18-month ceramic instead of wax", totalPrice: 10000, addDays: 1, addCollection: 1500 }
  },
  {
    id: "silver", level: 3, name: "SILVER", metal: "#C9CDD4",
    tagline: "Swirls gone + your deep scratches", price: 10500, days: 2, bin: "revival",
    blurb: "Everything in Bronze, plus dedicated machine attention on the deeper scratches you point out — for an even, glossy, uniform finish. No wet sanding.",
    chips: ["Two-step + targeted", "Full wash + decon", "Full interior detail", "Wax sealant", "2 days"],
    protection: "wax",
    // Silver is always 2 days — ceramic adds NO time
    ceramic: { label: "18-month ceramic", totalPrice: 12500, addDays: 0, addCollection: 2000 }
  },
  {
    id: "gold", level: 4, name: "GOLD", metal: "#D4AF37",
    tagline: "Show-car deep correction", price: 16000, days: 3, bin: "flawless",
    blurb: "Three-step correction across the entire car — compound, polish, refine — removing deep scratches, marring and holograms for a rich, wet, in-depth finish. Ceramic-coated as standard.",
    chips: ["Three-step correction", "Full wash + decon", "Full interior detail", "3-year ceramic", "3 days"],
    protection: "ceramic-3yr",
    ceramic: null // included
  },
  {
    id: "diamond", level: 5, name: "DIAMOND", metal: "#7FC7E8",
    tagline: "Better than factory", price: 30000, days: 7, bin: "flawless",
    blurb: "Our flagship. A seven-day, stage-three paint restoration — deep wet sanding, scratch by scratch, paint chips and touch-ups addressed — until the finish is better than the day it left the factory. This isn’t a detail. It’s a build. We only take a handful a year.",
    chips: ["Stage-3 + wet sanding", "Paint touch-up", "Full premium detail", "5-year ceramic", "7 days"],
    protection: "ceramic-5yr",
    ceramic: null // included
  }
];

export const PC_BINS = {
  revival: {
    id: "revival", name: "REVIVAL", range: "R5,500 – R10,500",
    blurb: "Bring your car back to its best — clean, glossy, swirl-free, protected. Daily-driver to enthusiast.",
    tiers: ["stage-one", "bronze", "silver"]
  },
  flawless: {
    id: "flawless", name: "FLAWLESS", range: "R16,000 – R30,000",
    blurb: "The absolute best paint can look — deep correction to full concours restoration. Show cars and special builds.",
    tiers: ["gold", "diamond"]
  }
};

export const PC_FOOTER = "Full wash and interior detail included from Bronze up. Street Gloss includes an exterior wash and interior vacuum only. Final quotes may vary with vehicle condition — heavily neglected cars may need extra work.";

// ─────────────── The four questions ───────────────
export const PC_QUESTIONS = [
  {
    id: "car", eyebrow: "THE CAR", n: 1,
    q: "First — the important thing. What is it to you?",
    helper: "No make or model yet. Just how you feel about it.",
    options: [
      { id: "daily",   label: "Daily driver",   sub: "I just want it mint again",  a1: 1, lean: "revival" },
      { id: "weekend", label: "Weekend car",    sub: "I want it turning heads",     a1: 2, lean: "revival" },
      { id: "pride",   label: "My pride & joy", sub: "It deserves the best",        a1: 4, lean: "flawless" },
      { id: "dream",   label: "The dream build",sub: "Nothing but perfection",      a1: 5, lean: "flawless" }
    ],
    warmth: { daily: "Honest. We like that.", weekend: "Good taste.", pride: "Now we’re talking.", dream: "Say less." }
  },
  {
    id: "paint", eyebrow: "THE PAINT", n: 2,
    q: "How's it looking right now? Be honest, we've seen worse.",
    helper: "This sets the floor — we never recommend less than the paint needs.",
    options: [
      { id: "dull",     label: "Dull and tired",          sub: "Needs life back",              N: 1 },
      { id: "swirls",   label: "Swirls and haze",         sub: "You catch them in the sun",    N: 2 },
      { id: "scratches",label: "A few deeper scratches",  sub: "They bug me",                  N: 3 },
      { id: "rough",    label: "Rough — it's been through it", sub: "No judgement",            N: 4 }
    ]
  },
  {
    id: "goal", eyebrow: "THE GOAL", n: 3,
    q: "What are you actually after?",
    helper: "Your goal weighs more than sentiment when we read the car.",
    options: [
      { id: "gloss",    label: "Quick gloss",           sub: "Back on the road",           a3: 1 },
      { id: "lasting",  label: "Proper correction",     sub: "That actually lasts",        a3: 3 },
      { id: "deepest",  label: "The deepest correction",sub: "We can do",                  a3: 4 },
      { id: "flawless", label: "Flawless",              sub: "No compromise",              a3: 5 }
    ]
  },
  {
    id: "protection", eyebrow: "PROTECTION", n: 4,
    q: "And how long should it stay looking this good?",
    helper: "Protection only. It never changes the correction we recommend.",
    options: [
      { id: "freshen", label: "Just freshen it up", sub: "For now",            prot: "base" },
      { id: "couple",  label: "A solid couple of years", sub: "Lock in ceramic",prot: "ceramic" },
      { id: "longterm",label: "Lock it in long-term",   sub: "Strongest you have",prot: "strong" }
    ]
  }
];

// ─────────────── Recommendation engine ───────────────
export function pcClamp(x, lo, hi) { return Math.max(lo, Math.min(x, hi)); }

// answers = { car, paint, goal, protection } (option ids)
export function pcRecommend(answers) {
  const Q1 = PC_QUESTIONS[0].options.find((o) => o.id === answers.car);
  const Q2 = PC_QUESTIONS[1].options.find((o) => o.id === answers.paint);
  const Q3 = PC_QUESTIONS[2].options.find((o) => o.id === answers.goal);
  const Q4 = PC_QUESTIONS[3].options.find((o) => o.id === answers.protection);
  if (!Q1 || !Q2 || !Q3) return null;

  const N = Q2.N;                                   // need floor (honesty anchor)
  const A = Math.round(0.4 * Q1.a1 + 0.6 * Q3.a3);  // ambition (goal weighs more)
  let Rlevel = pcClamp(A, N, Math.min(N + 1, 5)); // never below need, max +1, cap 5

  // Routing rule: the ads anchor is R5,500 (Street Gloss). A "quick gloss" goal
  // against dull/swirl paint should land there — not get pulled up by the
  // paint-condition floor. Deeper marks (scratches/rough) still need more than
  // gloss can fix, so those keep the floor-driven recommendation.
  let upsellCard = null;
  const isGlossGoal = answers.goal === "gloss";
  const isLightPaint = answers.paint === "dull" || answers.paint === "swirls";
  if (isGlossGoal && isLightPaint) {
    if (Rlevel !== 1 && answers.paint === "swirls") upsellCard = { targetId: "bronze" };
    Rlevel = 1;
  }

  const rec = PC_PACKAGES.find((p) => p.level === Rlevel);
  const bin = rec.bin; // 1-3 revival, 4-5 flawless

  const protWant = Q4 ? Q4.prot : "base";

  let ceramicRec = false;
  if ((rec.id === "bronze" || rec.id === "silver") && (protWant === "ceramic" || protWant === "strong")) {
    ceramicRec = true;
  }

  const droveDream = answers.car === "dream" && bin === "revival";
  const underNeed = A < N;

  // The generic stage-one reason ("tired more than damaged") contradicts a
  // user who just told us they have swirls — say the honest, specific thing:
  // gloss now, Bronze if the swirls in the sun actually bother them.
  const reason = (rec.id === "stage-one" && answers.paint === "swirls" && answers.goal === "gloss")
    ? "You've got light swirls, but you want shine now without overpaying — Street Gloss knocks them back and brings the gloss today. If sun-swirls really bug you, Bronze cuts them out."
    : pcReason({ rec, N, A, Rlevel, Q1, Q2, Q3, droveDream, underNeed, ceramicRec });

  return { recId: rec.id, recLevel: Rlevel, bin, ceramicRec, protWant, droveDream, underNeed, reason, upsellCard };
}

// One-line "bridge" acknowledging the R5,500 ad anchor whenever the actual
// recommendation sits above it — so the user always sees Street Gloss named
// and understands in one line why they're being shown more.
export function pcBridgeLine(rec) {
  if (!rec || rec.recId === "stage-one") return null;
  if (rec.recId === "bronze") {
    return "Street Gloss (R5,500) knocks swirls back. You said you want them gone — that's a two-step job, and that's Bronze.";
  }
  if (rec.recId === "silver") {
    return "Street Gloss (R5,500) is the express gloss-up. You've got deeper marks worth pointing out — that needs Silver's targeted, two-step attention.";
  }
  const tier = PC_PACKAGES.find((p) => p.id === rec.recId);
  return `Street Gloss (R5,500) is the express gloss-up — what your paint needs goes further, into full ${tier ? tier.name : "correction"}-level work.`;
}

function pcReason({ rec, N, droveDream, underNeed, ceramicRec }) {
  if (underNeed && N >= 4) {
    return "It's taken a real beating — anything less won't truly fix it. We'd rather tell you straight: this is the level your paint actually needs.";
  }
  if (rec.id === "bronze") {
    return "Your paint mainly needs swirls and haze cut back and sealed — exactly what Bronze does, in a day. No need to pay for more correction than your car actually needs." + (ceramicRec ? " We'd lock it in with ceramic." : "");
  }
  if (rec.id === "stage-one") {
    return "Your paint's tired more than damaged — an express gloss brings it right back. Get the shine now; you can always come back for deeper correction later.";
  }
  if (rec.id === "silver") {
    if (droveDream) {
      return "Your paint's in great shape — we could wet-sand it, but that's clear coat you don't need to lose. Silver gets it flawless, the honest way." + (ceramicRec ? " Ceramic keeps it that way." : "");
    }
    return "You've got deeper marks that need pointing out and machining individually — Silver does that on top of the full two-step." + (ceramicRec ? " Ceramic locks the finish in." : "");
  }
  if (rec.id === "gold") {
    return "Three-step correction across the whole car is what this needs — compound, polish, refine. Ceramic's built in, so it stays this way for three years.";
  }
  if (rec.id === "diamond") {
    return "This is a full restoration job — wet sanding, scratch by scratch, until it's better than factory. Our flagship. We only take a handful a year.";
  }
  return "Based on your answers, this is the level your paint needs — no more, no less.";
}

// ─────────────── Calendar (capacity-aware, business days) ───────────────
// Working days: Mon–Fri. South African / Cape Town public holidays are excluded.

export function pcIsoDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// Computes Gregorian Easter Sunday (Anonymous algorithm) for a given year.
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// South African national public holidays for a year (Cape Town observes the
// national set — there are no separate municipal public holidays). Includes the
// Sunday→Monday observed rule from the Public Holidays Act.
export function saPublicHolidays(year) {
  const out = new Set();
  const add = (d) => out.add(pcIsoDate(d));

  // Fixed-date holidays (month is 0-indexed).
  const fixed = [
    [0, 1],   // New Year's Day
    [2, 21],  // Human Rights Day
    [3, 27],  // Freedom Day
    [4, 1],   // Workers' Day
    [5, 16],  // Youth Day
    [7, 9],   // National Women's Day
    [8, 24],  // Heritage Day
    [11, 16], // Day of Reconciliation
    [11, 25], // Christmas Day
    [11, 26]  // Day of Goodwill
  ];
  for (const [mo, day] of fixed) {
    const d = new Date(year, mo, day);
    add(d);
    // Act: if a holiday falls on a Sunday, the following Monday is also a holiday.
    if (d.getDay() === 0) add(addDays(d, 1));
  }

  // Easter-derived holidays.
  const easter = easterSunday(year);
  add(addDays(easter, -2)); // Good Friday
  add(addDays(easter, 1));  // Family Day (Easter Monday)

  return out;
}

// Cache holiday sets per year so repeated calendar renders stay cheap.
const HOLIDAY_CACHE = new Map();
export function isPublicHoliday(d) {
  const y = d.getFullYear();
  if (!HOLIDAY_CACHE.has(y)) HOLIDAY_CACHE.set(y, saPublicHolidays(y));
  return HOLIDAY_CACHE.get(y).has(pcIsoDate(d));
}

export function pcIsBusinessDay(d) {
  const day = d.getDay();
  if (day === 0 || day === 6) return false; // weekend
  if (isPublicHoliday(d)) return false;     // SA / Cape Town public holiday
  return true;
}

// Returns the next `n` business days starting AT `start` (inclusive if business day).
export function pcBusinessRange(start, n) {
  const out = [];
  const d = new Date(start);
  while (out.length < n) {
    if (pcIsBusinessDay(d)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// A start date is bookable if it's a business day AND the next `durationDays`
// business days are all free against the booked set (one car a day → capacity 1).
export function pcIsStartBookable(start, durationDays, booked) {
  if (!pcIsBusinessDay(start)) return false;
  const range = pcBusinessRange(start, durationDays);
  for (const day of range) {
    if (booked.has(pcIsoDate(day))) return false;
  }
  return true;
}

export function pcFmtDate(d) {
  return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
}

export function pcFmtMoney(n) {
  return "R" + Number(n || 0).toLocaleString("en-ZA");
}

// Post-deposit upsells. days drives schedule logic (all 0 = fit the booked window).
export const PC_UPSELLS = [
  { id: "headlight", name: "Headlight restoration", price: 950,  days: 0, blurb: "Cut the yellow haze, bring the lenses back to clear. Same day." },
  { id: "enginebay", name: "Engine bay detail",     price: 1200, days: 0, blurb: "Dressed, degreased, photographed. Pops the moment you open the bonnet." },
  { id: "interior",  name: "Interior protection upgrade", price: 1400, days: 0, blurb: "Leather feed + fabric guard so the inside survives Cape Town too." }
];

// ─────────────── Expectation-setting content (per tier) ───────────────
export const PC_FINGERNAIL = "If a scratch catches your fingernail, it’s usually too deep to remove without thinning the clear coat unsafely. At every level we reduce and soften these so they stop catching your eye — but erasing them completely isn’t always possible. We’ll tell you straight what your paint can take.";

export const PC_EXPECT = {
  "stage-one": {
    pct: 60, label: "50–70%", of: "of light swirls",
    sunlight: "Looks superb in everyday light. Pull it into hard, direct sun and a perfectionist will still catch the finer swirls — that’s exactly where Bronze comes in.",
    notThis: "This is a gloss-up, not a swirl correction. If swirls bug you in the sun, Bronze is the honest next step — and we’ll happily move you there."
  },
  bronze: {
    pct: 85, label: "~85%", of: "of swirls & haze",
    sunlight: "Reads clean and glossy in daylight and under showroom lights. In raking direct sun a sharp eye might still find the odd deeper mark — Silver chases those down one by one.",
    notThis: "A focused two-step, not a scratch-by-scratch hunt for every deep mark. Point those out and Silver gives them dedicated attention."
  },
  silver: {
    pct: 88, label: "85–90%", of: "of swirls + your deeper marks",
    sunlight: "Holds up under direct sun and detailing lights — swirls gone, deeper scratches knocked right back. For total under-the-loupe perfection, Gold’s three stages go further.",
    notThis: "Thorough correction, not wet-sanding — we keep your clear coat intact. For the last few percent under a loupe, that’s Gold and Diamond."
  },
  gold: {
    pct: 96, label: "95%+", of: "of all defects",
    sunlight: "Flawless in virtually any light — sun, LED, showroom. The final fraction of a percent, wet-sanded scratch by scratch, is Diamond territory.",
    notThis: "Show-car correction with ceramic built in — just short of a full restoration. Diamond is the seven-day, scratch-by-scratch rebuild."
  },
  diamond: {
    pct: 98, label: "95–99%", of: "of all defects",
    sunlight: "There is no next level. Under hard sun, detailing lights or a loupe, it reads better than the day it left the factory.",
    notThis: "Nothing held back — this is the full restoration. There is no tier beyond it."
  }
};

// EFT / deposit constants (real M&C banking details from the prototype).
export const PC_BANK = {
  bank: "FNB", holder: "Keanan Matthews", type: "FNB Next Transact Account",
  account: "62883053086", branch: "250655"
};

// NOTE: PC_DEPOSIT_PCT / pcPricing's 60% deposit is also used by the general
// multi-service quote tool (components/LeadFlow/LeadFlow.jsx) for services
// beyond paint correction — do not change its meaning here. The paint-
// correction AD FUNNEL uses a flat slot-hold instead (see pcSlotHold below),
// computed separately so the two flows don't interfere with each other.
export const PC_DEPOSIT_PCT = 0.6;

// Derive the priced selection for a package + ceramic toggle.
export function pcPricing(pkg, ceramicOn) {
  const useCeramic = ceramicOn && !!pkg.ceramic;
  const price = useCeramic ? pkg.ceramic.totalPrice : pkg.price;
  const durationDays = pkg.days + (useCeramic ? (pkg.ceramic.addDays || 0) : 0);
  const deposit = Math.round(price * PC_DEPOSIT_PCT);
  return { price, deposit, balance: price - deposit, durationDays, ceramicOn: useCeramic };
}

// Ad-funnel-only payment structure: a flat R1,000 slot-hold online, then a
// drop-off/pickup split keyed strictly off the final durationDays (ceramic's
// +1 day included) — never per-package, never per-lead:
//   <= 2 days: the rest of the total is due at drop-off, before work starts.
//   >= 3 days: 50% of the total is due at drop-off (hold credits toward it),
//              the other 50% is due at pickup.
// The hold always credits toward the drop-off amount, and the three figures
// always sum to exactly `price` regardless of rounding (dueAtPickup is
// price-minus-everything-else, not a second independent rounding).
export const PC_SLOT_HOLD_AMOUNT = 1000;
export function pcPaymentSchedule(price, durationDays) {
  const total = Math.max(0, Number(price) || 0);
  const hold = Math.min(PC_SLOT_HOLD_AMOUNT, total);

  let dueAtDropoff, dueAtPickup;
  if (Number(durationDays) >= 3) {
    const half = Math.round(total * 0.5);
    dueAtDropoff = half - hold;
    dueAtPickup = total - half;
  } else {
    dueAtDropoff = total - hold;
    dueAtPickup = 0;
  }

  return { hold, dueAtDropoff, dueAtPickup, balance: dueAtDropoff + dueAtPickup };
}

// Izimoto's cut of every PC package, always — not negotiated per-lead, not
// used for any other service. The CRM's commission math is `clientQuote -
// vendorQuoteTotalIncVat`, so this is what makes a PC lead's margin show up
// as ~90% instead of the ~100% it'd show with no vendor cost recorded at all.
export const PC_VENDOR_COMMISSION_PCT = 0.10;
export function pcVendorQuote(price, vatRate = 0.15) {
  const total = Math.max(0, Number(price) || 0);
  const incVat = Math.round(total * PC_VENDOR_COMMISSION_PCT);
  const exVat = Math.round((incVat / (1 + vatRate)) * 100) / 100;
  return { incVat, exVat };
}
