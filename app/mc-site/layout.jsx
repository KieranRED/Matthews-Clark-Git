import Script from 'next/script';

import Pixels from '@/components/Pixels/Pixels';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata = {
  metadataBase: new URL('https://www.matthewsandclark.co.za'),
  title: { template: '%s — Matthews / Clark Cape Town', default: 'Matthews / Clark — Cape Town' },
  description: 'Paint protection film, ceramic coating, wrapping, detailing and custom work in Cape Town, by appointment.',
  openGraph: {
    siteName: 'Matthews / Clark',
    locale: 'en_ZA',
    type: 'website',
    images: [{ url: '/site/media/garage.jpg', width: 1200, height: 800, alt: 'Matthews / Clark — Cape Town automotive protection and customisation' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/site/media/garage.jpg'],
  },
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['LocalBusiness', 'AutomotiveService'],
      '@id': 'https://matthewsandclark.co.za/#business',
      'name': 'Matthews / Clark',
      'alternateName': ['M/C', 'Matthews and Clark'],
      'url': 'https://matthewsandclark.co.za/mc-site',
      'logo': 'https://matthewsandclark.co.za/site/media/logo-mc.png',
      'image': 'https://matthewsandclark.co.za/site/media/logo-mc.png',
      'description': 'Matthews / Clark is a premium automotive protection and customisation brand in Cape Town, South Africa. In partnership with Izimoto, M/C delivers PPF, ceramic coating, vehicle wrapping, paint correction, detailing, body kits, custom wheels and starlight headliners. M/C manages the client relationship and project — Izimoto\'s expert team carries out all installation work at their Woodstock workshop.',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '3 Muir Street',
        'addressLocality': 'Woodstock',
        'addressRegion': 'Western Cape',
        'postalCode': '7925',
        'addressCountry': 'ZA',
      },
      'geo': {
        '@type': 'GeoCoordinates',
        'latitude': -33.9266,
        'longitude': 18.4494,
      },
      'openingHoursSpecification': [
        {
          '@type': 'OpeningHoursSpecification',
          'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          'opens': '08:00',
          'closes': '17:00',
        },
      ],
      'priceRange': 'RRRR',
      'currenciesAccepted': 'ZAR',
      'paymentAccepted': 'Cash, EFT',
      'areaServed': [
        { '@type': 'City', 'name': 'Cape Town' },
        { '@type': 'State', 'name': 'Western Cape' },
      ],
      'hasOfferCatalog': {
        '@type': 'OfferCatalog',
        'name': 'Automotive Services',
        'itemListElement': [
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Paint Protection Film (PPF)', 'url': 'https://matthewsandclark.co.za/mc-site/ppf' } },
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Vehicle Wrapping', 'url': 'https://matthewsandclark.co.za/mc-site/wrapping' } },
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Ceramic Coating', 'url': 'https://matthewsandclark.co.za/mc-site/ceramic' } },
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Paint Correction', 'url': 'https://matthewsandclark.co.za/mc-site/correction' } },
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Car Detailing', 'url': 'https://matthewsandclark.co.za/mc-site/detailing' } },
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Body Kits', 'url': 'https://matthewsandclark.co.za/mc-site/body-kits' } },
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Custom Wheels', 'url': 'https://matthewsandclark.co.za/mc-site/wheels' } },
          { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': 'Starlight Headliners', 'url': 'https://matthewsandclark.co.za/mc-site/starlight' } },
        ],
      },
      'sameAs': [
        'https://www.facebook.com/matthewsandclark',
        'https://www.instagram.com/matthewsandclark',
      ],
    },
    {
      '@type': 'Organization',
      '@id': 'https://matthewsandclark.co.za/#organisation',
      'name': 'Matthews / Clark',
      'alternateName': 'M/C',
      'url': 'https://matthewsandclark.co.za/mc-site',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://matthewsandclark.co.za/site/media/logo-mc.png',
      },
      'description': 'Matthews / Clark is a premium automotive protection and customisation brand in Cape Town, South Africa, operating in partnership with Izimoto.',
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '3 Muir Street',
        'addressLocality': 'Woodstock',
        'addressRegion': 'Western Cape',
        'addressCountry': 'ZA',
      },
      'sameAs': [
        'https://www.facebook.com/matthewsandclark',
        'https://www.instagram.com/matthewsandclark',
      ],
    },
  ],
};

export default function McSiteLayout({ children }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />

      {/*
        Critical CSS — inlined to eliminate render-blocking.
        Covers everything visible above the fold: variables, resets, and the full nav.
        site.css and service.css are loaded asynchronously below — they handle
        drawer, footer, FAQ, service-page components etc. which are all below-fold
        or hidden on load, so they can safely arrive after first paint.
      */}
      <style>{`
        /* ── Variables ── */
        :root{
          --black:#0D0D0D;--grey-dark:#1A1A1A;--grey-mid:#444444;--grey-light:#888888;
          --border:#2A2A2A;--border-strong:#3A3A3A;--accent:#1F4FFF;--accent-deep:#1638CC;
          --accent-bright:#4A78FF;--content-max:1280px;--gutter:48px;--gutter-sm:20px;
          --nav-h:60px;--ease:cubic-bezier(.2,.8,.2,1);
          /* Next.js loaded fonts — declared here so they're available before site.css arrives */
          --display:var(--font-display),Impact,sans-serif;
          --headline:var(--font-ui),system-ui,sans-serif;
          --body:var(--font-sans),system-ui,sans-serif;
          --mono:var(--font-mono),monospace;
        }
        /* ── Resets ── */
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        html,body{background:var(--black);color:#fff;-webkit-font-smoothing:antialiased;overflow-x:hidden}
        body{font-family:var(--body);font-size:16px;line-height:1.55;padding-bottom:0}
        a{color:inherit;text-decoration:none}
        button{font:inherit;cursor:pointer;border:0;background:none;color:inherit}
        img,video{display:block;max-width:100%}
        ::selection{background:var(--accent);color:#fff}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.4}}
        /* ── Container ── */
        .container{max-width:var(--content-max);margin:0 auto;padding:0 var(--gutter)}
        @media(max-width:760px){.container{padding:0 var(--gutter-sm)}:root{--gutter:20px}}
        /* ── Nav ── */
        .nav{position:fixed;top:20px;left:24px;right:24px;z-index:1000;height:var(--nav-h);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px;padding:0 8px 0 24px;background:rgba(13,13,13,0.55);backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);border:1px solid rgba(255,255,255,.08);border-radius:999px;box-shadow:0 10px 36px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.02) inset;transition:background .3s ease,border-color .3s ease,top .3s ease,box-shadow .3s ease}
        .nav.scrolled{background:rgba(13,13,13,0.82);border-color:rgba(255,255,255,.10);top:14px;box-shadow:0 14px 44px rgba(0,0,0,.55)}
        @media(max-width:760px){.nav{top:14px;left:14px;right:14px;padding:0 6px 0 18px;height:54px;grid-template-columns:auto 1fr auto;gap:8px}.nav.scrolled{top:10px}}
        .nav .brand{display:flex;align-items:baseline;gap:14px;justify-self:start;padding-left:6px;color:#fff;line-height:1}
        .nav .brand .wm{font-family:var(--display);font-size:22px;letter-spacing:.10em;text-transform:uppercase;color:#fff;display:inline-block}
        .nav .brand .wm .slash{color:var(--accent);font-weight:500;margin:0 -2px;display:inline-block;transform:translateY(1px)}
        .nav .brand .mono{font-family:var(--mono);font-size:10px;letter-spacing:.22em;color:rgba(255,255,255,.45);text-transform:uppercase;font-weight:400;border-left:1px solid rgba(255,255,255,.16);padding-left:12px}
        @media(max-width:760px){.nav .brand .wm{font-size:18px}.nav .brand .mono{display:none}}
        .nav .links{display:flex;align-items:center;gap:28px;justify-self:center;position:relative}
        .nav .links a{font-family:var(--mono);font-size:11px;font-weight:500;color:rgba(255,255,255,.85);letter-spacing:.18em;text-transform:uppercase;position:relative;padding:8px 0;transition:color .15s ease}
        .nav .links a:hover,.nav .links a.active{color:#fff}
        .nav .links a::after{content:'';position:absolute;left:0;right:0;bottom:2px;height:1px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .25s var(--ease)}
        .nav .links a:hover::after,.nav .links a.active::after{transform:scaleX(1)}
        .nav .links .has-caret span{display:inline-block;margin-left:6px;font-size:8px;vertical-align:middle;color:rgba(255,255,255,.4);transform:translateY(-1px)}
        @media(max-width:760px){.nav .links{display:none}}
        .nav .right{display:flex;align-items:center;gap:10px;justify-self:end}
        .nav .hamburger{width:44px;height:44px;display:none;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.3);color:#fff}
        .nav .hamburger .lines{display:flex;flex-direction:column;gap:4px;width:16px}
        .nav .hamburger .lines span{display:block;height:1.5px;background:#fff;width:100%}
        .nav .hamburger .lines span:nth-child(2){width:11px;margin-left:auto}
        @media(max-width:760px){.nav .hamburger{display:inline-flex}.nav .btn-accent{display:none}}
        .btn-accent{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px 0 22px;border-radius:999px;background:var(--accent);color:#fff;font-family:var(--headline);font-weight:700;font-size:13px;letter-spacing:.02em;transition:background .15s ease,transform .1s ease;white-space:nowrap}
        .btn-accent:hover{background:var(--accent-bright)}.btn-accent:active{transform:scale(.985);background:var(--accent-deep)}
        .btn-accent svg{transition:transform .2s ease}.btn-accent:hover svg{transform:translateX(2px)}
        .nav .svc-drop{position:absolute;top:calc(100% + 12px);left:50%;transform:translate(-50%,-4px);background:#111;border:1px solid #1F1F1F;border-radius:14px;padding:24px;min-width:520px;display:grid;grid-template-columns:1fr 1fr;gap:6px 32px;opacity:0;pointer-events:none;visibility:hidden;box-shadow:0 24px 56px rgba(0,0,0,.6);transition:opacity .2s ease,transform .2s ease,visibility .2s ease;z-index:1001}
        .nav .svc-wrap{position:relative}
        .nav .svc-wrap:hover .svc-drop,.nav .svc-wrap:focus-within .svc-drop{opacity:1;pointer-events:auto;visibility:visible;transform:translate(-50%,0)}
        .nav .svc-drop a{font-family:var(--body);font-weight:500;font-size:14px;letter-spacing:0;text-transform:none;color:#fff;padding:8px 0;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.04)}
        .nav .svc-drop a::after{display:none}
        .nav .svc-drop a:last-child,.nav .svc-drop a:nth-last-child(2){border-bottom:0}
        .nav .svc-drop a:hover{color:var(--accent)}
        .nav .svc-drop a .arr{margin-left:auto;font-family:var(--mono);color:rgba(255,255,255,.3);transition:transform .2s ease,color .2s ease}
        .nav .svc-drop a:hover .arr{color:var(--accent);transform:translateX(2px)}
        /* ── CRM host overrides ── */
        html,body{height:auto!important;overflow-anchor:none}
        html{overflow-y:auto}
        body{background:#0D0D0D!important;overflow-x:clip!important}
      `}</style>

      {/*
        Async CSS — preloaded but applied non-blocking after first paint.
        Covers: drawer, footer, FAQ, service-page components, utilities.
        noscript fallback for crawlers / JS-disabled browsers.
      */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){function a(h){var l=document.createElement('link');l.rel='preload';l.as='style';l.href=h;l.onload=function(){this.onload=null;this.rel='stylesheet'};document.head.appendChild(l)}a('/site/site.css');a('/site/service.css')})();` }} />
      <noscript>
        <link rel="stylesheet" href="/site/site.css" />
        <link rel="stylesheet" href="/site/service.css" />
      </noscript>

      {/* Preconnect to Cloudflare Stream — no crossOrigin so it matches the poster/thumbnail loads */}
      <link rel="preconnect" href="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com" />
      {/* Preload hls.js from CDN — no crossOrigin: must match the no-CORS dynamic <script> tag
          so the browser reuses the preload cache entry instead of fetching twice. */}
      <link rel="preload" as="script" href="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js" />
      {children}
      <Pixels />
      <Script src="/site/site.js" strategy="afterInteractive" />
    </>
  );
}
