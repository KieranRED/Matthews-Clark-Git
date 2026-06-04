export const metadata = {
  title: 'Ceramic Coating',
  description: 'Matthews & Clark manages ceramic coating in Cape Town through our partnership with Izimoto. Gold, Platinum and Diamond tiers — 1.5 to 5-year durability.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/ceramic' },
  openGraph: {
    title: 'Ceramic Coating — Matthews / Clark Cape Town',
    description: 'Matthews & Clark manages ceramic coating in Cape Town through our partnership with Izimoto. Gold, Platinum and Diamond tiers — 1.5 to 5-year durability.',
    url: 'https://www.matthewsandclark.co.za/mc-site/ceramic',
  },
  twitter: {
    title: 'Ceramic Coating — Matthews / Clark Cape Town',
    description: 'Matthews & Clark manages ceramic coating in Cape Town through our partnership with Izimoto. Gold, Platinum and Diamond tiers — 1.5 to 5-year durability.',
  },
};

const baScript = `
(() => {
  const frame = document.getElementById('baFrame');
  const handle = document.getElementById('baHandle');
  if (!frame || !handle) return;
  const before = frame.querySelector('.before');
  let dragging = false;
  const setPosition = (pct) => { pct = Math.max(2, Math.min(98, pct)); handle.style.left = pct + '%'; before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)'; };
  const moveTo = (clientX) => { const rect = frame.getBoundingClientRect(); setPosition(((clientX - rect.left) / rect.width) * 100); };
  const onDown = (e) => { dragging = true; frame.style.cursor='ew-resize'; e.preventDefault(); };
  const onUp = () => { dragging = false; frame.style.cursor=''; };
  const onMove = (e) => { if (!dragging) return; const x = e.touches ? e.touches[0].clientX : e.clientX; moveTo(x); };
  frame.addEventListener('click', (e) => { if (e.target.closest('.knob')) return; moveTo(e.clientX); });
  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
  setPosition(50);
})();
`;

export default function CeramicPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='ceramic';` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"How long does ceramic coating last?","acceptedAnswer":{"@type":"Answer","text":"1.5 years, 3 years, or 5 years depending on package. Maintained correctly, many go longer."}},
    {"@type":"Question","name":"Do I need paint correction before ceramic coating?","acceptedAnswer":{"@type":"Answer","text":"If your paint has swirl marks or scratches, yes. Ceramic locks in what's underneath it. We'd rather correct first."}},
    {"@type":"Question","name":"Is ceramic coating worth it?","acceptedAnswer":{"@type":"Answer","text":"If you care about your paint — yes. It's the difference between washing your car and just rinsing it."}},
    {"@type":"Question","name":"Can ceramic coating be applied to a wrapped car?","acceptedAnswer":{"@type":"Answer","text":"Yes. We ceramic over vinyl for additional protection and improved gloss."}},
    {"@type":"Question","name":"What is the difference between ceramic coating and wax?","acceptedAnswer":{"@type":"Answer","text":"Wax sits on top of the paint and wears off in weeks. Ceramic bonds to the clear coat and lasts years. Not the same product category."}}
  ]
}` }} />
      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  CERAMIC  /  M4 CS</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/mc-site">Home</a><span className="sep">/</span>
              <a href="/mc-site/services">Services</a><span className="sep">/</span>
              <span className="here">Ceramic</span>
            </div>
            <h1>Ceramic Coating <span className="blue">in Cape Town.</span></h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · 1.5–5 yr durability</div>
            <div className="actions">
              <a className="btn-primary" href="#book" data-book="">Book a Slot <span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-intro">
        <div className="container">
          <div className="label"><span className="num">02</span>What it is</div>
          <p>Matthews &amp; Clark manages ceramic coating packages in Cape Town through our partnership with Izimoto. We handle your consultation and package selection — Izimoto&apos;s detailing team carries out the application at their 3 Muir St, Woodstock facility. Ceramic coating is a liquid polymer that bonds chemically to your vehicle&apos;s paintwork, creating a semi-permanent protective layer that is hydrophobic, UV-resistant, and easier to maintain than bare paint. Durability ranges from 1.5 to 5 years depending on the package.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>Ceramic coating isn&apos;t a product you apply and wipe off. It bonds to your clear coat at a chemical level. Water beads off. Dirt doesn&apos;t stick. Your paint stays cleaner between washes, longer.</p>
            <p>Wax lasts weeks. A proper ceramic lasts years.</p>
            <p>Most ceramics here are layered after <a href="/mc-site/correction" style={{color:'var(--accent)'}}>paint correction</a> so we lock in a perfect finish, not the swirls underneath. Pair with <a href="/mc-site/ppf" style={{color:'var(--accent)'}}>PPF</a> if you want both hydrophobics and chip protection.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  CERAMIC  /  STUDIO</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">03</span><span>Options</span><span className="div"></span><span className="sub">Pick the right one for your car</span></span></div>
          <div className="opts-grid">
            <div className="opt-card tier"><div className="name">Gold<span className="price">1.5-year ceramic</span></div><p className="desc">Entry tier — gloss and hydrophobics.</p><ul><li>Strip wash</li><li>Interior valet</li><li>1-step polish</li><li>1.5-yr ceramic coating</li></ul></div>
            <div className="opt-card tier"><div className="name">Platinum<span className="price">3-year ceramic</span></div><p className="desc">Daily-driver tier — paint + windows.</p><ul><li>Strip wash</li><li>Interior valet</li><li>1-step polish</li><li>3-yr ceramic</li><li>+ window ceramic</li></ul></div>
            <div className="opt-card tier"><div className="name">Diamond<span className="price">5-year ceramic</span></div><p className="desc">Show-prep tier — every surface.</p><ul><li>Strip wash</li><li>Interior valet</li><li>2-step polish</li><li>5-yr ceramic</li><li>Window ceramic + door jams</li></ul></div>
          </div>
        </div>
      </section>

      <section className="svc-ba">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">04</span><span>Before / after</span><span className="div"></span><span className="sub">Drag the handle</span></span></div>
          <div className="ba-frame" id="baFrame">
            <div className="layer after"></div><div className="layer before"></div>
            <div className="pill before-l">Before</div><div className="pill after-l">After</div>
            <div className="handle" id="baHandle"><div className="knob" aria-label="Drag to compare"></div></div>
            <div className="stamp">PHOTO  /  REPLACE WITH BEFORE-AFTER</div>
          </div>
        </div>
      </section>

      <section className="svc-related">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">06</span><span>Pair it with</span></span></div>
          <div className="rel-grid">
            <a className="rel-card" href="/mc-site/correction"><div className="left"><span className="k">Restoration</span><span className="n">Paint Correction</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/mc-site/ppf"><div className="left"><span className="k">Protection</span><span className="n">PPF</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/mc-site/detailing"><div className="left"><span className="k">Care</span><span className="n">Detailing</span></div><span className="arr">→</span></a>
          </div>
        </div>
      </section>

      <section className="svc-faq">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">07</span><span>FAQ</span></span></div>
          <div className="faq-grid">
            <div className="left"><h2>What people <span className="blue">ask us.</span></h2><p className="copy">If your question isn&apos;t here, drop it in the booking form. We answer them properly.</p></div>
            <div className="faq-list">
              <details className="faq"><summary>How long does ceramic coating last?<span className="icon">+</span></summary><div className="answer"><p>1.5 years, 3 years, or 5 years depending on package. Maintained correctly, many go longer.</p></div></details>
              <details className="faq"><summary>Do I need paint correction before ceramic coating?<span className="icon">+</span></summary><div className="answer"><p>If your paint has swirl marks or scratches, yes. Ceramic locks in what&apos;s underneath it. We&apos;d rather correct first.</p></div></details>
              <details className="faq"><summary>Is ceramic coating worth it?<span className="icon">+</span></summary><div className="answer"><p>If you care about your paint — yes. It&apos;s the difference between washing your car and just rinsing it.</p></div></details>
              <details className="faq"><summary>Can ceramic coating be applied to a wrapped car?<span className="icon">+</span></summary><div className="answer"><p>Yes. We ceramic over vinyl for additional protection and improved gloss.</p></div></details>
              <details className="faq"><summary>What&apos;s the difference between ceramic and wax?<span className="icon">+</span></summary><div className="answer"><p>Wax sits on top of the paint and wears off in weeks. Ceramic bonds to the clear coat and lasts years. Not the same product category.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Ready to <span className="blue">sort it?</span></h2>
        <p className="sub">Tell us the car. We&apos;ll talk you through the right tier — no upselling, no nonsense. Izimoto applies it. You drive away with years of protection.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
