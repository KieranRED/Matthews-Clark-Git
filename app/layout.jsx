// Root layout — minimal on purpose.
// CRM styles (globals.css, lead-flow.css, crm-kit.css, invoice.css, client-portal.css)
// live in app/(crm)/layout.jsx so they only load for CRM routes.
// mc-site routes skip the (crm) layout entirely, eliminating the render-blocking
// CSS bundle from the marketing site's critical path.

// Font strategy: only the two fonts on the first-paint critical path are loaded
// as web fonts — Inter Tight (body/inputs) + Anton (hero titles). JetBrains Mono
// (--font-mono) and Archivo (--font-ui) now fall back to system fonts via the
// :root declarations in globals.css, removing 2 font files from the critical path.
// preload:true emits <link rel=preload as=font> so the 2 remaining fonts start
// downloading before the font CSS is parsed.
import { Anton, Inter_Tight } from "next/font/google";
import "./globals.css";
import "./styles/lead-flow.css";

const fontSans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans", display: "swap", preload: true });
const fontDisplay = Anton({ subsets: ["latin"], variable: "--font-display", weight: "400", display: "swap", preload: true });

export const metadata = {
  title: "Matthews & Clark — Start a Job",
  description: "Lead capture flow",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
      { url: "/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "M&C CRM"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontDisplay.variable}`}>
        {children}
      </body>
    </html>
  );
}
