import Script from 'next/script';

export const metadata = {
  title: { template: '%s — Matthews / Clark Cape Town', default: 'Matthews / Clark — Cape Town' },
  description: 'Paint protection film, ceramic coating, wrapping, detailing and custom work in Cape Town, by appointment.',
};

export default function McSiteLayout({ children }) {
  return (
    <>
      <style>{`
        /* Map Next.js loaded fonts to site.css variable names */
        :root {
          --display: var(--font-display), Impact, sans-serif;
          --headline: var(--font-ui), system-ui, sans-serif;
          --body: var(--font-sans), system-ui, sans-serif;
          --mono: var(--font-mono), monospace;
        }
        /* Reset body padding that CRM adds */
        body { background: #0D0D0D !important; }
      `}</style>
      <link rel="stylesheet" href="/site/site.css" />
      <link rel="stylesheet" href="/site/service.css" />
      {children}
      <Script src="/site/site.js" strategy="afterInteractive" />
    </>
  );
}
