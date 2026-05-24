export const metadata = {
  title: 'Starlight Headliners',
  description: 'Matthews & Clark installs custom fibre-optic starlight headliners in Cape Town — standard or shooting-star configurations. 2–3 day install.',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Can a starlight headliner be installed in any car?', acceptedAnswer: { '@type': 'Answer', text: 'Most cars with a fabric headliner, yes. We\'ll confirm at consultation.' } },
    { '@type': 'Question', name: 'Does it affect the roof lining warranty?', acceptedAnswer: { '@type': 'Answer', text: 'Original lining is preserved where possible. We can advise on implications for specific vehicles.' } },
    { '@type': 'Question', name: 'How many stars/fibres?', acceptedAnswer: { '@type': 'Answer', text: 'Varies by roof size. Most installations use several hundred to a few thousand individual fibres.' } },
    { '@type': 'Question', name: 'Can the colour be changed?', acceptedAnswer: { '@type': 'Answer', text: 'Standard is white. Colour options available — discuss at consultation.' } },
    { '@type': 'Question', name: 'How long does it last?', acceptedAnswer: { '@type': 'Answer', text: 'Fibre optic panels are long-lasting. LED light source has a typical lifespan of 50,000+ hours.' } },
  ],
};

export default function StarlightPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='starlight';` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  STARLIGHT  /  G63</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/">Home</a><span className="sep">/</span>
              <a href="/services">Services</a><span className="sep">/</span>
              <span className="here">Starlight</span>
            </div>
            <h1>Starlight Headliners <span className="blue">in Cape Town.</span></h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · 2–3 days</div>
            <div className="actions">
              <a className="btn-primary" href="#book" data-book="">Book a Slot <span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
              <a className="btn-ghost" href="#process">See the process →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-intro">
        <div className="container">
          <div className="label"><span className="num">02</span>What it is</div>
          <p>Matthews &amp; Clark installs starlight headliners in Cape Town — custom fibre optic roof lining panels that create an illuminated night sky effect inside your vehicle. Each installation is custom to the vehicle&apos;s roof dimensions. Available in standard star configuration and shooting star configuration. Most installations take 2–3 working days.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>You&apos;ve done the outside. The headliner is the detail nobody sees until they get in — and then they can&apos;t stop looking up.</p>
            <p>Fibre optic panels, installed into your existing roof lining. Custom to your car&apos;s dimensions. Available in standard star configuration or with a shooting star sequence.</p>
            <p>Most starlight clients pair it with the wider interior package — talk to us about <a href="/detailing" style={{color:'var(--accent)'}}>detailing</a> or full <a href="/wrapping" style={{color:'var(--accent)'}}>build work</a> at the same time.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  STARLIGHT  /  STUDIO</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">03</span><span>Options</span><span className="div"></span><span className="sub">Pick the right one for your car</span></span></div>
          <div className="opts-grid">
            <div className="opt-card">
              <div className="name">Standard stars<span className="price">Fixed star field</span></div>
              <p className="desc">Classic look. Hundreds to thousands of fibres.</p>
              <ul><li>Custom to roof size</li><li>White or coloured</li><li>LED source, 50,000+ hr life</li></ul>
            </div>
            <div className="opt-card">
              <div className="name">Shooting stars<span className="price">Animated sequence</span></div>
              <p className="desc">Static field plus shooting sequence.</p>
              <ul><li>Programmable patterns</li><li>Brightness control</li><li>Custom to roof size</li></ul>
            </div>
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

      <section className="svc-process" id="process">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">05</span><span>How it works</span><span className="div"></span><span className="sub">2–3 days</span></span></div>
          <div className="proc-grid">
            <div className="proc-step"><span className="num">01</span><h4>Measurement</h4><p>Roof dimensions taken. Panel cut to fit.</p></div>
            <div className="proc-step"><span className="num">02</span><h4>Installation</h4><p>Roof lining removed, fibre optic panel fitted, lining reinstalled.</p></div>
            <div className="proc-step"><span className="num">03</span><h4>Inspection</h4><p>Every fibre tested. You see it before you collect.</p></div>
          </div>
        </div>
      </section>

      <section className="svc-related">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">06</span><span>Pair it with</span></span></div>
          <div className="rel-grid">
            <a className="rel-card" href="/body-kits"><div className="left"><span className="k">Build</span><span className="n">Body Kits</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/wrapping"><div className="left"><span className="k">Presence</span><span className="n">Wrapping</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/detailing"><div className="left"><span className="k">Care</span><span className="n">Detailing</span></div><span className="arr">→</span></a>
          </div>
        </div>
      </section>

      <section className="svc-faq">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">07</span><span>FAQ</span></span></div>
          <div className="faq-grid">
            <div className="left"><h2>What people <span className="blue">ask us.</span></h2><p className="copy">If your question isn&apos;t here, drop it in the booking form. We answer them properly.</p></div>
            <div className="faq-list">
              <details className="faq"><summary>Can a starlight headliner be installed in any car?<span className="icon">+</span></summary><div className="answer"><p>Most cars with a fabric headliner, yes. We&apos;ll confirm at consultation.</p></div></details>
              <details className="faq"><summary>Does it affect the roof lining warranty?<span className="icon">+</span></summary><div className="answer"><p>Original lining is preserved where possible. We can advise on implications for specific vehicles.</p></div></details>
              <details className="faq"><summary>How many stars/fibres?<span className="icon">+</span></summary><div className="answer"><p>Varies by roof size. Most installations use several hundred to a few thousand individual fibres.</p></div></details>
              <details className="faq"><summary>Can the colour be changed?<span className="icon">+</span></summary><div className="answer"><p>Standard is white. Colour options available — discuss at consultation.</p></div></details>
              <details className="faq"><summary>How long does it last?<span className="icon">+</span></summary><div className="answer"><p>Fibre optic panels are long-lasting. LED light source has a typical lifespan of 50,000+ hours.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Tell us what <span className="blue">you&apos;re building.</span></h2>
        <p className="sub">Year, make, model and roof configuration. We&apos;ll come back with the install plan.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
