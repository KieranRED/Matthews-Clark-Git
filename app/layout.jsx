import "./globals.css";
import "./styles/lead-flow.css";
import "./styles/crm-kit.css";
import "./styles/invoice.css";
import "./styles/client-portal.css";

import { Anton, Archivo, Inter_Tight, JetBrains_Mono } from "next/font/google";

const fontSans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fontMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const fontDisplay = Anton({ subsets: ["latin"], variable: "--font-display", weight: "400", display: "swap" });
const fontUi = Archivo({ subsets: ["latin"], variable: "--font-ui", display: "swap" });

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
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} ${fontUi.variable}`}>
        {children}
      </body>
    </html>
  );
}
