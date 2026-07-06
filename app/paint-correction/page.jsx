import { Suspense } from "react";

import Pixels from "@/components/Pixels/Pixels";

import PaintCorrectionFlow from "./PaintCorrectionFlow";

// Paid-ad destination page. Self-contained funnel: quiz → contact → chooser →
// car → calendar → checkout → R1,000 EFT slot-hold + POP (or WhatsApp-first)
// → held booking. Pixels are injected here (the root layout doesn't render
// them globally). Suspense wraps the flow because it reads utm_content via
// useSearchParams() (G1's ad-to-page headline match) — Next.js requires that.
export default function PaintCorrectionPage() {
  return (
    <>
      <Suspense fallback={null}>
        <PaintCorrectionFlow />
      </Suspense>
      <Pixels />
    </>
  );
}
