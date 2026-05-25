import Script from 'next/script';

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
      <style>{`
        /* Map Next.js loaded fonts to site.css variable names */
        :root {
          --display: var(--font-display), Impact, sans-serif;
          --headline: var(--font-ui), system-ui, sans-serif;
          --body: var(--font-sans), system-ui, sans-serif;
          --mono: var(--font-mono), monospace;
        }
        /* Reset CRM global styles that break page scrolling.
           globals.css sets html,body{height:100%} and body{overflow-x:hidden}.
           overflow-x:hidden implicitly makes overflow-y:auto, creating a second
           scroll container inside the viewport — causing directional stickiness.
           overflow-x:clip clips without creating a scroll container. */
        html, body { height: auto !important; overflow-anchor: none; }
        html { overflow-y: auto; }
        body { background: #0D0D0D !important; overflow-x: clip !important; }
      `}</style>
      {/* Preconnect to Cloudflare Stream so the TCP+TLS handshake is done before any video requests */}
      <link rel="preconnect" href="https://customer-36nn7ohpldm6zgjs.cloudflarestream.com" crossOrigin="anonymous" />
      {/* Preload hls.js from CDN — by the time mobile-hero.js requests it, the browser serves it from cache */}
      <link rel="preload" as="script" href="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js" crossOrigin="anonymous" />
      <link rel="stylesheet" href="/site/site.css" />
      <link rel="stylesheet" href="/site/service.css" />
      {children}
      <Script src="/site/site.js" strategy="afterInteractive" />
    </>
  );
}
