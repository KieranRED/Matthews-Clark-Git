// CRM route group layout — scopes all CRM stylesheets and font loading to CRM routes only.
//
// next/font is declared here (not in app/layout.jsx) so that the render-blocking
// font CSS file only appears for CRM routes.  mc-site routes skip this layout
// entirely and use inline @font-face in their own layout for zero render-blocking CSS.
//
// The :root style below ensures --font-* variables resolve even before the
// external Next.js font stylesheet has been parsed, covering any race between
// globals.css `var(--font-sans)` and the font file loading.

import { Anton, Archivo, Inter_Tight, JetBrains_Mono } from "next/font/google";

const fontSans    = Inter_Tight({ subsets: ["latin"], variable: "--font-sans",    display: "swap" });
const fontMono    = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono",    display: "swap" });
const fontDisplay = Anton({ subsets: ["latin"], variable: "--font-display", weight: "400", display: "swap" });
const fontUi      = Archivo({ subsets: ["latin"], variable: "--font-ui",      display: "swap" });

import "../globals.css";
import "../styles/lead-flow.css";
import "../styles/crm-kit.css";
import "../styles/desktop.css";
import "../styles/invoice.css";
import "../styles/client-portal.css";

export default function CrmLayout({ children }) {
  return (
    <>
      {/* Declare font custom-properties on :root so var(--font-sans) etc. resolve
          even before the external Next.js font CSS file is fully parsed.
          The external file sets the same values via the .__variable_* class on
          the div below — these are complementary, not conflicting. */}
      <style>{`:root{--font-sans:"Inter Tight","Inter Tight Fallback";--font-mono:"JetBrains Mono","JetBrains Mono Fallback";--font-display:"Anton","Anton Fallback";--font-ui:"Archivo","Archivo Fallback"}`}</style>
      <div className={`${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} ${fontUi.variable}`}>
        {children}
      </div>
    </>
  );
}
