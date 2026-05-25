// Auto-generated sitemap for www.matthewsandclark.co.za
// Covers the M/C marketing site at /mc-site/*

const BASE = 'https://www.matthewsandclark.co.za';

const pages = [
  { path: '/mc-site',              priority: 1.0, changeFrequency: 'weekly' },
  { path: '/mc-site/services',     priority: 0.9, changeFrequency: 'monthly' },
  { path: '/mc-site/ppf',          priority: 0.9, changeFrequency: 'monthly' },
  { path: '/mc-site/wrapping',     priority: 0.9, changeFrequency: 'monthly' },
  { path: '/mc-site/ceramic',      priority: 0.9, changeFrequency: 'monthly' },
  { path: '/mc-site/correction',   priority: 0.8, changeFrequency: 'monthly' },
  { path: '/mc-site/detailing',    priority: 0.8, changeFrequency: 'monthly' },
  { path: '/mc-site/body-kits',    priority: 0.7, changeFrequency: 'monthly' },
  { path: '/mc-site/wheels',       priority: 0.7, changeFrequency: 'monthly' },
  { path: '/mc-site/starlight',    priority: 0.7, changeFrequency: 'monthly' },
  { path: '/mc-site/about',        priority: 0.6, changeFrequency: 'monthly' },
  { path: '/mc-site/community',    priority: 0.5, changeFrequency: 'weekly' },
];

export default function sitemap() {
  return pages.map(({ path, priority, changeFrequency }) => ({
    url: BASE + path,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
