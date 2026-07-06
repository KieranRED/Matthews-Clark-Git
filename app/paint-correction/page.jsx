import Pixels from "@/components/Pixels/Pixels";

import PaintCorrectionFlow from "./PaintCorrectionFlow";

export const dynamic = "force-dynamic";

// Paid-ad destination page. Self-contained funnel: quiz → contact → chooser →
// car → calendar → checkout → R1,000 EFT slot-hold + POP (or WhatsApp-first)
// → held booking. Pixels are injected here (the root layout doesn't render
// them globally).
//
// utm_content (G1's ad-to-page headline match) is read here, server-side,
// from the real request — not via useSearchParams() in the client component.
// A client component that calls useSearchParams() only renders that subtree
// after hydration, so the server-rendered shell (what first paint and ad
// crawlers see) always showed the generic default headline regardless of
// which ad the visitor clicked, and let Vercel cache/serve one shell for
// every utm_content variant. Forcing this page dynamic and passing the value
// down as a prop makes the correct headline part of the actual response.
export default async function PaintCorrectionPage({ searchParams }) {
  const sp = await searchParams;
  const utmContent = typeof sp?.utm_content === "string" ? sp.utm_content : null;
  return (
    <>
      <PaintCorrectionFlow utmContent={utmContent} />
      <Pixels />
    </>
  );
}
