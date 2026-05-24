export const metadata = {
  title: 'Paint Protection Film (PPF)',
  description: 'Matthews & Clark installs paint protection film (PPF) in Cape Town — clear or coloured urethane film bonded to your paint. 5–7 day install for full coverage.',
};

const baScript = `
(() => {
  const frame = document.getElementById('baFrame');
  const handle = document.getElementById('baHandle');
  if (!frame || !handle) return;
  const before = frame.querySelector('.before');
  let dragging = false;
  const setPosition = (pct) => {
    pct = Math.max(2, Math.min(98, pct));
    handle.style.left = pct + '%';
    before.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
  };
  const moveTo = (clientX) => {
    const rect = frame.getBoundingClientRect();
    setPosition(((clientX - rect.left) / rect.width) * 100);
  };
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

const schemaJson = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"How long does PPF last?","acceptedAnswer":{"@type":"Answer","text":"Quality PPF lasts 5–10 years with proper care. It's warranted against yellowing, cracking, and delamination."}},
    {"@type":"Question","name":"Can PPF be removed?","acceptedAnswer":{"@type":"Answer","text":"Yes. It peels cleanly off factory paint with no adhesive residue when removed by a professional."}},
    {"@type":"Question","name":"Is PPF worth it on a daily driver?","acceptedAnswer":{"@type":"Answer","text":"If you drive it on South African roads — yes. Gravel roads, highway driving, and municipal road surfaces will mark your car. PPF prevents that."}},
    {"@type":"Question","name":"What's the difference between PPF and ceramic coating?","acceptedAnswer":{"@type":"Answer","text":"PPF is a physical barrier. Ceramic coating is a chemical surface treatment. They serve different purposes. Many clients combine both — PPF for impact protection, ceramic for hydrophobics and gloss."}},
    {"@type":"Question","name":"How much does PPF cost in Cape Town?","acceptedAnswer":{"@type":"Answer","text":"It depends on coverage area and vehicle size. Send us your car details via the form and we'll give you a straight answer."}},
    {"@type":"Question","name":"Do you do full-car PPF?","acceptedAnswer":{"@type":"Answer","text":"Yes. Full-wrap PPF on supercars and collector cars. Also partial coverage for those protecting high-impact zones only."}}
  ]
});

export default function PPFPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='ppf';` }} />

      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  PPF  /  488 PISTA</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/">Home</a><span className="sep">/</span>
              <a href="/services">Services</a><span className="sep">/</span>
              <span className="here">PPF</span>
            </div>
            <h1>Paint Protection Film <span className="blue">in Cape Town.</span></h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · Lead time 5–7 days</div>
            <div className="actions">
              <a className="btn-primary" href="#book" data-book="">
                Book a Slot
                <span className="arr"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              </a>
              <a className="btn-ghost" href="#process">See the process →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-intro">
        <div className="container">
          <div className="label"><span className="num">02</span>What it is</div>
          <p>Matthews &amp; Clark installs paint protection film (PPF) in Cape Town from our workshop for all vehicle types — daily drivers, supercars, and modified builds. PPF is a clear or coloured urethane film bonded directly to your painted surfaces, protecting against stone chips, scratches, bug damage, and UV fade. Clear PPF preserves your factory colour. Coloured PPF changes it. Installation takes 5–7 working days depending on coverage.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>Paint gets damaged. It&apos;s not a question of if — it&apos;s a question of when. Motorway chips, car-park scratches, bird strikes, tree sap. Factory paint is softer than most people realise, and once the damage is in, it&apos;s expensive to get out.</p>
            <p>PPF is a sacrificial layer. It takes the damage so your paint doesn&apos;t. Unlike <a href="/ceramic" style={{color:'var(--accent)'}}>ceramic coating</a> — which is a surface treatment — PPF is a physical barrier. You can&apos;t replicate that with wax or spray sealant.</p>
            <p>If you drive it, you need it. PPF isn&apos;t just for Ferraris — though we&apos;ve done a few of those. A Golf GTI on the N1 collects the same chips as a 911. The film doesn&apos;t care what the car cost. Pair it with <a href="/correction" style={{color:'var(--accent)'}}>paint correction</a> first if your paint already has defects we should lock out, not seal in.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  PPF APPLICATION</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h">
            <span className="label"><span className="num">03</span><span>Options</span><span className="div"></span><span className="sub">Two ways to run PPF</span></span>
          </div>
          <div className="opts-grid">
            <div className="opt-card">
              <div className="name">Clear PPF<span className="price">Most popular</span></div>
              <p className="desc">Invisible protection. Your colour stays, your shine stays, chips don&apos;t.</p>
              <ul><li>High-gloss self-healing film</li><li>10-year warranty on film integrity</li><li>Full-front, partial or full-car</li></ul>
            </div>
            <div className="opt-card">
              <div className="name">Coloured PPF<span className="price">Two outcomes, one application</span></div>
              <p className="desc">Change your car&apos;s appearance and protect it at the same time.</p>
              <ul><li>Matte, satin or gloss finish</li><li>Reversible — factory paint stays intact</li><li>Hand-cut for your specific car</li></ul>
            </div>
          </div>
        </div>
      </section>

      <section className="svc-ba">
        <div className="container">
          <div className="sec-h">
            <span className="label"><span className="num">04</span><span>Before / after</span><span className="div"></span><span className="sub">Drag the handle</span></span>
          </div>
          <div className="ba-frame" id="baFrame">
            <div className="layer after"></div>
            <div className="layer before"></div>
            <div className="pill before-l">Before</div>
            <div className="pill after-l">After</div>
            <div className="handle" id="baHandle"><div className="knob" aria-label="Drag to compare"></div></div>
            <div className="stamp">PHOTO  /  REPLACE WITH BEFORE-AFTER</div>
          </div>
        </div>
      </section>

      <section className="svc-process" id="process">
        <div className="container">
          <div className="sec-h">
            <span className="label"><span className="num">05</span><span>How it works</span><span className="div"></span><span className="sub">5–7 working days</span></span>
          </div>
          <div className="proc-grid">
            <div className="proc-step"><span className="num">01</span><h4>Paint assessment</h4><p>We inspect your paint before we touch it. Damage that should be corrected first, gets corrected first.</p></div>
            <div className="proc-step"><span className="num">02</span><h4>Surface prep</h4><p>The car is stripped and decontaminated. PPF needs a clean, prepared surface to bond properly.</p></div>
            <div className="proc-step"><span className="num">03</span><h4>Application</h4><p>Film is cut and applied section by section. High-wear areas first: bonnet, bumper, mirrors, headlights.</p></div>
            <div className="proc-step"><span className="num">04</span><h4>Inspection</h4><p>No bubbles, no lifted edges, no shortcuts. You collect a car we&apos;re proud of.</p></div>
          </div>
        </div>
      </section>

      <section className="svc-related">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">06</span><span>Pair it with</span></span></div>
          <div className="rel-grid">
            <a className="rel-card" href="/ceramic"><div className="left"><span className="k">Protection</span><span className="n">Ceramic</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/correction"><div className="left"><span className="k">Restoration</span><span className="n">Paint Correction</span></div><span className="arr">→</span></a>
            <a className="rel-card" href="/detailing"><div className="left"><span className="k">Care</span><span className="n">Detailing</span></div><span className="arr">→</span></a>
          </div>
        </div>
      </section>

      <section className="svc-faq">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">07</span><span>FAQ</span></span></div>
          <div className="faq-grid">
            <div className="left">
              <h2>What people <span className="blue">ask us.</span></h2>
              <p className="copy">If your question isn&apos;t here, drop it in the booking form. We answer them properly.</p>
            </div>
            <div className="faq-list">
              <details className="faq"><summary>How long does PPF last?<span className="icon">+</span></summary><div className="answer"><p>Quality PPF lasts 5–10 years with proper care. It&apos;s warranted against yellowing, cracking, and delamination.</p></div></details>
              <details className="faq"><summary>Can PPF be removed?<span className="icon">+</span></summary><div className="answer"><p>Yes. It peels cleanly off factory paint with no adhesive residue when removed by a professional.</p></div></details>
              <details className="faq"><summary>Is PPF worth it on a daily driver?<span className="icon">+</span></summary><div className="answer"><p>If you drive it on South African roads — yes. Gravel roads, highway driving and municipal road surfaces will mark your car. PPF prevents that.</p></div></details>
              <details className="faq"><summary>What&apos;s the difference between PPF and ceramic coating?<span className="icon">+</span></summary><div className="answer"><p>PPF is a physical barrier. Ceramic coating is a chemical surface treatment. They serve different purposes.</p><p>Many clients combine both — PPF for impact protection, ceramic for hydrophobics and gloss.</p></div></details>
              <details className="faq"><summary>How much does PPF cost in Cape Town?<span className="icon">+</span></summary><div className="answer"><p>It depends on coverage area and vehicle size. Send us your car details via the form — we&apos;ll give you a straight answer.</p></div></details>
              <details className="faq"><summary>Do you do full-car PPF?<span className="icon">+</span></summary><div className="answer"><p>Yes. Full-wrap PPF on supercars and collector cars. Also partial coverage for those protecting high-impact zones only.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Ready to <span className="blue">sort it?</span></h2>
        <p className="sub">Tell us the car and the goal. One slot per car, per studio block — booked in person, finished in person.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">
          Book a Slot
          <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
        </a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
