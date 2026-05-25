export const metadata = {
  title: 'Vehicle Wrapping',
  description: 'Matthews & Clark coordinates vehicle wrapping in Cape Town through our partnership with Izimoto. Full and partial colour change wraps. 5–10 day turnaround.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/wrapping' },
  openGraph: {
    title: 'Vehicle Wrapping — Matthews / Clark Cape Town',
    description: 'Matthews & Clark coordinates vehicle wrapping in Cape Town through our partnership with Izimoto. Full and partial colour change wraps. 5–10 day turnaround.',
    url: 'https://www.matthewsandclark.co.za/mc-site/wrapping',
  },
  twitter: {
    title: 'Vehicle Wrapping — Matthews / Clark Cape Town',
    description: 'Matthews & Clark coordinates vehicle wrapping in Cape Town through our partnership with Izimoto. Full and partial colour change wraps. 5–10 day turnaround.',
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

export default function WrappingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='wrapping';` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"How long does a wrap last?","acceptedAnswer":{"@type":"Answer","text":"5–7 years with proper care. Keep it out of direct sun where possible, hand wash rather than auto-wash."}},
    {"@type":"Question","name":"Will a wrap damage my paint?","acceptedAnswer":{"@type":"Answer","text":"Not if your paint is in good condition. If it isn't, we'll tell you before we apply anything."}},
    {"@type":"Question","name":"How much does wrapping a car cost in Cape Town?","acceptedAnswer":{"@type":"Answer","text":"Depends on the car and the coverage. Drop your car details in the form and we'll give you a real number fast."}},
    {"@type":"Question","name":"What colours and finishes are available?","acceptedAnswer":{"@type":"Answer","text":"Gloss, matte, satin, chrome, colour-shift. We work with what you're after."}},
    {"@type":"Question","name":"Can I ceramic coat over a wrap?","acceptedAnswer":{"@type":"Answer","text":"Yes. Ceramic over vinyl adds protection and improves the finish. We do this regularly."}}
  ]
}` }} />
      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  WRAP  /  GT3 RS</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/mc-site">Home</a><span className="sep">/</span>
              <a href="/mc-site/services">Services</a><span className="sep">/</span>
              <span className="here">Wrapping</span>
            </div>
            <h1>Vehicle Wrapping <span className="blue">in Cape Town.</span></h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · 5–10 days</div>
            <div className="actions">
              <a className="btn-primary" href="#book" data-book=""><span>Book a Slot</span><span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
              <a className="btn-ghost" href="#process">See the process →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-intro">
        <div className="container">
          <div className="label"><span className="num">02</span>What it is</div>
          <p>Matthews &amp; Clark coordinates vehicle wrapping in Cape Town through our partnership with Izimoto. You bring us the vision — we spec the job and manage it through Izimoto&apos;s experienced install team at their Woodstock workshop. Full colour change wraps, partial wraps, and accent wraps. Vinyl is applied over factory paint with no permanent change to your car&apos;s original finish. Available in gloss, matte, satin, and colour-shift finishes. Most full-car wraps take 5–10 working days.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>A wrap gives you a colour change without touching your factory paint. When you&apos;re done with it — or when you&apos;re ready to sell — it comes off clean. The original paint stays underneath, unaffected.</p>
            <p>That&apos;s not a compromise. That&apos;s smarter than a respray — and you deal with us the whole way through.</p>
            <p>Pair it with <a href="/mc-site/ppf" style={{color:'var(--accent)'}}>PPF</a> on the high-impact panels or a <a href="/mc-site/ceramic" style={{color:'var(--accent)'}}>ceramic coat</a> over the vinyl for extra protection and a sharper finish.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  WRAP  /  STUDIO</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">03</span><span>Options</span><span className="div"></span><span className="sub">Pick the right one for your car</span></span></div>
          <div className="opts-grid">
            <div className="opt-card"><div className="name">Full wrap<span className="price">Bumper to bumper</span></div><p className="desc">Complete colour change.</p><ul><li>Door jams, edges, mirrors</li><li>Hand-cut for your specific car</li><li>Reversible — paint stays intact</li></ul></div>
            <div className="opt-card"><div className="name">Partial wrap<span className="price">Roof, bonnet, mirrors</span></div><p className="desc">Contrast colour or accent work.</p><ul><li>2–3 day turnaround</li><li>Mix and match finishes</li><li>Custom designs on request</li></ul></div>
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
          <div className="sec-h"><span className="label"><span className="num">05</span><span>How it works</span><span className="div"></span><span className="sub">5–10 days</span></span></div>
          <div className="proc-grid">
            <div className="proc-step"><span className="num">01</span><h4>Colour consultation</h4><p>We work through finish and colour options with you. Swatches available. Izimoto confirms prep requirements before anything is ordered.</p></div>
            <div className="proc-step"><span className="num">02</span><h4>Surface prep</h4><p>The car is cleaned and decontaminated. Any paint damage noted before vinyl goes near it.</p></div>
            <div className="proc-step"><span className="num">03</span><h4>Application</h4><p>Vinyl applied panel by panel. Door jams, edges and cut lines done properly.</p></div>
            <div className="proc-step"><span className="num">04</span><h4>Inspection</h4><p>Every edge, every seam. We sign it off with Izimoto. You collect it when it&apos;s right.</p></div>
          </div>
        </div>
      </section>

      <section className="svc-related">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">06</span><span>Pair it with</span></span></div>
          <div className="rel-grid">
            <a className="rel-card" href="/mc-site/ppf"><div className="left"><span className="k">Protection</span><span className="n">PPF</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/mc-site/ceramic"><div className="left"><span className="k">Protection</span><span className="n">Ceramic</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/mc-site/correction"><div className="left"><span className="k">Restoration</span><span className="n">Paint Correction</span></div><span className="arr">→</span></a>
          </div>
        </div>
      </section>

      <section className="svc-faq">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">07</span><span>FAQ</span></span></div>
          <div className="faq-grid">
            <div className="left"><h2>What people <span className="blue">ask us.</span></h2><p className="copy">If your question isn&apos;t here, drop it in the booking form. We answer them properly.</p></div>
            <div className="faq-list">
              <details className="faq"><summary>How long does a wrap last?<span className="icon">+</span></summary><div className="answer"><p>5–7 years with proper care. Keep it out of direct sun where possible, hand wash rather than auto-wash.</p></div></details>
              <details className="faq"><summary>Will a wrap damage my paint?<span className="icon">+</span></summary><div className="answer"><p>Not if your paint is in good condition. If it isn&apos;t, we&apos;ll tell you before we apply anything.</p></div></details>
              <details className="faq"><summary>How much does wrapping a car cost in Cape Town?<span className="icon">+</span></summary><div className="answer"><p>Depends on the car and the coverage. Drop your car details in the form and we&apos;ll give you a real number fast.</p></div></details>
              <details className="faq"><summary>What colours and finishes are available?<span className="icon">+</span></summary><div className="answer"><p>Gloss, matte, satin, chrome, colour-shift. Most things. We work with what you&apos;re after.</p></div></details>
              <details className="faq"><summary>Can I ceramic coat over a wrap?<span className="icon">+</span></summary><div className="answer"><p>Yes. Ceramic over vinyl adds protection and improves the finish. We do this regularly.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Ready to <span className="blue">sort it?</span></h2>
        <p className="sub">Tell us the car and the look. We handle the rest — from spec to collection. Izimoto does the installation. You get the result.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
