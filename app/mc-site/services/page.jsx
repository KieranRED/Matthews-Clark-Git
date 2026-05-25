export const metadata = {
  title: 'Services',
  description: 'Everything M/C and Izimoto offer together in Cape Town — PPF, wrapping, ceramic, paint correction, detailing, body kits, wheels and starlight headliners.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/services' },
  openGraph: {
    title: 'Services — Matthews / Clark Cape Town',
    description: 'Everything M/C and Izimoto offer together in Cape Town — PPF, wrapping, ceramic, paint correction, detailing, body kits, wheels and starlight headliners.',
    url: 'https://www.matthewsandclark.co.za/mc-site/services',
  },
  twitter: {
    title: 'Services — Matthews / Clark Cape Town',
    description: 'Everything M/C and Izimoto offer together in Cape Town — PPF, wrapping, ceramic, paint correction, detailing, body kits, wheels and starlight headliners.',
  },
};

const pageCSS = `
  .svc-grid{display:grid;grid-template-columns:repeat(2, 1fr);gap:32px;margin-top:64px;}
  @media (max-width: 760px){.svc-grid{grid-template-columns:1fr;gap:18px;margin-top:32px}}
  .svc-card{display:flex;flex-direction:column;background:var(--grey-dark);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:border-color .25s ease, transform .25s ease;}
  .svc-card:hover{border-color:var(--border-strong);transform:translateY(-2px)}
  .svc-card .img{position:relative;aspect-ratio:3/2;overflow:hidden;background:#111;}
  .svc-card .img::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 70%, rgba(31,79,255,.16), transparent 60%),linear-gradient(155deg, #1d1d1d 0%, #050505 100%);transition:transform .35s ease;}
  .svc-card:hover .img::before{transform:scale(1.03)}
  .svc-card .img .ix{position:absolute;right:24px;top:18px;font-family:var(--display);font-size:80px;line-height:1;color:rgba(255,255,255,.05);}
  .svc-card .img .ph{position:absolute;left:18px;top:16px;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.4);}
  .svc-card .img .meta{position:absolute;left:18px;bottom:14px;right:18px;display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);}
  .svc-card .body{padding:28px 28px 24px;display:flex;flex-direction:column;gap:14px;}
  @media (max-width: 760px){.svc-card .body{padding:22px 20px 20px}}
  .svc-card h3{font-family:var(--display);font-size:32px;line-height:1;letter-spacing:.005em;text-transform:uppercase;color:#fff;}
  .svc-card .desc{font-family:var(--body);font-size:15px;line-height:1.55;color:rgba(255,255,255,.7);max-width:38ch;}
  .svc-card .more{margin-top:auto;font-family:var(--headline);font-weight:600;font-size:13px;color:var(--accent);display:inline-flex;align-items:center;gap:8px;padding-top:8px;letter-spacing:.04em;}
  .svc-card:hover .more{gap:12px}
  .intro-row{display:grid;grid-template-columns:1fr auto;gap:48px;align-items:end;padding-bottom:56px;border-bottom:1px solid rgba(255,255,255,.08);}
  .intro-row .lede{margin-top:24px}
  @media (max-width: 760px){.intro-row{grid-template-columns:1fr;gap:24px}}
  .intro-stat{font-family:var(--mono);font-size:11px;letter-spacing:.18em;line-height:1.8;text-transform:uppercase;color:rgba(255,255,255,.5);text-align:right;}
  .intro-stat .b{color:#fff;font-weight:500}
  @media (max-width: 760px){.intro-stat{text-align:left}}
`;

export default function ServicesPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='services';` }} />
      <style>{pageCSS}</style>

      <header data-mc-nav=""></header>

      <section className="page-hero">
        <div className="container">
          <div className="crumbs">
            <a href="/">Home</a>
            <span className="sep">/</span>
            <span className="here">Services</span>
          </div>
          <h1>Everything <span className="blue">we do.</span></h1>
          <div className="intro-row">
            <div>
              <p className="lede">One address, two brands working as one. Matthews &amp; Clark manages the client relationship and project — Izimoto&apos;s team does the work. Eight services, one number to call.</p>
              <div className="actions">
                <a className="btn-primary" href="#book" data-book="">
                  Book a Slot
                  <span className="arr">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </a>
                <a className="btn-ghost" href="/mc-site/about">About the studio →</a>
              </div>
            </div>
            <div className="intro-stat">
              <span className="b">08</span> services<br/>
              <span className="b">2</span> brands, one team<br/>
              <span className="b">1</span> workshop, Woodstock CPT
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{paddingTop:0,paddingBottom:'120px'}}>
        <div className="svc-grid">
          <a className="svc-card" href="/mc-site/ppf">
            <div className="img"><span className="ix">01</span><span className="ph">PHOTO / PPF</span><div className="meta"><span>Protection</span><span>5–7 days</span></div></div>
            <div className="body"><h3>PPF</h3><p className="desc">Clear or coloured film bonded to your paint. Chips and scratches stop here.</p><span className="more">Learn more →</span></div>
          </a>
          <a className="svc-card" href="/mc-site/wrapping">
            <div className="img"><span className="ix">02</span><span className="ph">PHOTO / WRAP</span><div className="meta"><span>Presence</span><span>5–10 days</span></div></div>
            <div className="body"><h3>Wrapping</h3><p className="desc">Full colour change or partial wrap. No commitment to factory paint.</p><span className="more">Learn more →</span></div>
          </a>
          <a className="svc-card" href="/mc-site/ceramic">
            <div className="img"><span className="ix">03</span><span className="ph">PHOTO / CERAMIC</span><div className="meta"><span>Protection</span><span>1.5–5 yr</span></div></div>
            <div className="body"><h3>Ceramic Coating</h3><p className="desc">A chemical bond to your clear coat that lasts years, not weeks.</p><span className="more">Learn more →</span></div>
          </a>
          <a className="svc-card" href="/mc-site/correction">
            <div className="img"><span className="ix">04</span><span className="ph">PHOTO / CORRECTION</span><div className="meta"><span>Restoration</span><span>1–2 days</span></div></div>
            <div className="body"><h3>Paint Correction</h3><p className="desc">Swirl marks, scratches, oxidation — removed with machine polishing.</p><span className="more">Learn more →</span></div>
          </a>
          <a className="svc-card" href="/mc-site/detailing">
            <div className="img"><span className="ix">05</span><span className="ph">PHOTO / DETAILING</span><div className="meta"><span>Care</span><span>1–5 days</span></div></div>
            <div className="body"><h3>Detailing</h3><p className="desc">From a quick valet to full strip wash with paint work.</p><span className="more">Learn more →</span></div>
          </a>
          <a className="svc-card" href="/mc-site/body-kits">
            <div className="img"><span className="ix">06</span><span className="ph">PHOTO / BODYKIT</span><div className="meta"><span>Presence</span><span>By project</span></div></div>
            <div className="body"><h3>Body Kits</h3><p className="desc">We source and fit imported kits. Widebody, aero, OEM+ — done properly.</p><span className="more">Learn more →</span></div>
          </a>
          <a className="svc-card" href="/mc-site/wheels">
            <div className="img"><span className="ix">07</span><span className="ph">PHOTO / WHEELS</span><div className="meta"><span>Presence</span><span>Sourced</span></div></div>
            <div className="body"><h3>Custom Wheels</h3><p className="desc">Real wheels. Not reps. Right fitment for your car.</p><span className="more">Learn more →</span></div>
          </a>
          <a className="svc-card" href="/mc-site/starlight">
            <div className="img"><span className="ix">08</span><span className="ph">PHOTO / STARLIGHT</span><div className="meta"><span>Interior</span><span>2–3 days</span></div></div>
            <div className="body"><h3>Starlight Headliners</h3><p className="desc">Fibre optic ceiling panels. The interior upgrade nobody expects.</p><span className="more">Learn more →</span></div>
          </a>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Not sure what <span className="blue">you need?</span></h2>
        <p className="sub">Send the car, send the goal. We come back same day with what we&apos;d actually do and what it costs. M&amp;C manages the project. Izimoto does the work. You get the result.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">
          Book a Slot
          <span className="arr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </a>
      </section>

      <footer data-mc-footer=""></footer>
    </>
  );
}
