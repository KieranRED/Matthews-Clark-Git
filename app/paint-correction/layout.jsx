// Paint Correction ad funnel — scoped layout.
// Loads the exact display/mono/body typefaces the funnel design uses (Anton,
// Archivo, Inter Tight, JetBrains Mono) by their literal family names, which is
// what pc-flow.css references. lead-flow.css + globals.css load globally from the
// root layout, so the lf-* base vocabulary is already available here.
import "./pc-flow.css";

export const metadata = {
  title: "Paint Correction — Book your slot · Matthews & Clark",
  description:
    "We read your paint, recommend the honest correction tier — not the dearest — and book one car a day. Swirls out, gloss in. Woodstock, Cape Town.",
  robots: { index: false, follow: true }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#050505"
};

export default function PaintCorrectionLayout({ children }) {
  return (
    <>
      {/* Real webfonts so the literal family names in pc-flow.css resolve faithfully. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;700;800&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      />
      {children}
    </>
  );
}
