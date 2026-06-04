export const metadata = {
  title: 'Paint Correction',
  description: 'Matthews & Clark manages paint correction in Cape Town through our workshop partnership with Izimoto. 1-step and 2-step machine polishing. Swirls, scratches, oxidation removed.',
  alternates: { canonical: 'https://www.matthewsandclark.co.za/mc-site/correction' },
  openGraph: {
    title: 'Paint Correction — Matthews / Clark Cape Town',
    description: 'Matthews & Clark manages paint correction in Cape Town through our workshop partnership with Izimoto. 1-step and 2-step machine polishing. Swirls, scratches, oxidation removed.',
    url: 'https://www.matthewsandclark.co.za/mc-site/correction',
  },
  twitter: {
    title: 'Paint Correction — Matthews / Clark Cape Town',
    description: 'Matthews & Clark manages paint correction in Cape Town through our workshop partnership with Izimoto. 1-step and 2-step machine polishing. Swirls, scratches, oxidation removed.',
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

export default function CorrectionPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.body.dataset.page='correction';` }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"How long does paint correction take?","acceptedAnswer":{"@type":"Answer","text":"1-step: 1 day. 2-step: 2 days. One car at a time."}},
    {"@type":"Question","name":"Will paint correction remove all scratches?","acceptedAnswer":{"@type":"Answer","text":"It removes defects within the clear coat. Deep scratches through to the paint or primer cannot be polished out — those require respray. We'll tell you honestly what can and can't be corrected before we start."}},
    {"@type":"Question","name":"How do I know if I need paint correction?","acceptedAnswer":{"@type":"Answer","text":"Look at your car under direct sunlight or a bright LED. If you see a haze of circular marks in the finish — you need correction."}},
    {"@type":"Question","name":"Should I get paint correction before ceramic coating?","acceptedAnswer":{"@type":"Answer","text":"Yes. Ceramic locks in the surface it's applied to. Correcting first means locking in a perfect finish."}},
    {"@type":"Question","name":"Does paint correction damage the clear coat?","acceptedAnswer":{"@type":"Answer","text":"Done correctly, no. Machine polishing removes a microscopic layer of clear coat. A skilled correction removes the minimum necessary. Done wrong — yes, it can cause damage. This is why the person doing it matters."}}
  ]
}` }} />
      <header data-mc-nav=""></header>

      <section className="svc-hero">
        <div className="img"></div>
        <div className="scrim"></div>
        <span className="stamp">PHOTO  /  CORRECTION  /  MACAN GTS</span>
        <div className="container">
          <div className="content">
            <div className="crumbs">
              <a href="/mc-site">Home</a><span className="sep">/</span>
              <a href="/mc-site/services">Services</a><span className="sep">/</span>
              <span className="here">Paint Correction</span>
            </div>
            <h1>Paint Correction <span className="blue">in Cape Town.</span></h1>
            <div className="last-updated">Last updated <span className="b">May 2026</span> · 1–2 days</div>
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
          <p>Matthews &amp; Clark manages paint correction work in Cape Town through our partnership with Izimoto. We handle your consultation and assessment — Izimoto&apos;s detail team carries out the correction work at their Woodstock workshop. Swirl marks, light scratches, water spots, and oxidation are removed by cutting and refining the clear coat using machine polishing. All results are inspected under high-intensity lighting before handover.</p>
        </div>
      </section>

      <section className="svc-explainer">
        <div className="container">
          <div className="copy">
            <p>Most cars develop swirl marks over time. Automatic car washes, improper wash technique, years of incorrect care. Under direct sunlight or showroom lighting, they&apos;re immediately visible — a haze of fine circular scratches dulling the finish.</p>
            <p>Paint correction removes them. Mechanically, using a machine polisher and cutting compounds, progressively refined until the paint is clear.</p>
            <p>It&apos;s not a quick fix. A 2-step correction on a German saloon takes two full days. But the result looks like the car just came off the transporter. Most clients then lock it in with <a href="/mc-site/ceramic" style={{color:'var(--accent)'}}>ceramic coating</a> or <a href="/mc-site/ppf" style={{color:'var(--accent)'}}>PPF</a> — we manage that as one project too.</p>
            <a className="link-arrow" href="#book" data-book="">Get a quote on your car <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
          </div>
          <div className="photo"><span className="stamp">PHOTO  /  CORRECTION  /  STUDIO</span></div>
        </div>
      </section>

      <section className="svc-options">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">03</span><span>Options</span><span className="div"></span><span className="sub">Pick the right one for your car</span></span></div>
          <div className="opts-grid">
            <div className="opt-card"><div className="name">1-Step Polish<span className="price">1 day</span></div><p className="desc">Removes light swirls and improves gloss significantly.</p><ul><li>2× residue strip wash</li><li>One polish stage</li><li>Light defect removal</li></ul></div>
            <div className="opt-card"><div className="name">2-Step Polish<span className="price">2 days</span></div><p className="desc">For heavier defects, deeper scratches, or show-prep.</p><ul><li>2× residue strip wash</li><li>Cut + refine</li><li>Heavy defect removal</li><li>Show-condition finish</li></ul></div>
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
          <div className="sec-h"><span className="label"><span className="num">05</span><span>How it works</span><span className="div"></span><span className="sub">1–2 days</span></span></div>
          <div className="proc-grid">
            <div className="proc-step"><span className="num">01</span><h4>Paint inspection</h4><p>Under high-intensity lighting at Izimoto&apos;s workshop. We map what&apos;s there before anything is touched.</p></div>
            <div className="proc-step"><span className="num">02</span><h4>Wash and decontamination</h4><p>Clay bar treatment, iron fallout removal, strip wash.</p></div>
            <div className="proc-step"><span className="num">03</span><h4>Polishing</h4><p>Stage by stage, panel by panel. No rushing.</p></div>
            <div className="proc-step"><span className="num">04</span><h4>Final inspection</h4><p>Back under the lights. We sign off with Izimoto. If it&apos;s not right, we go again.</p></div>
          </div>
        </div>
      </section>

      <section className="svc-related">
        <div className="container">
          <div className="sec-h"><span className="label"><span className="num">06</span><span>Pair it with</span></span></div>
          <div className="rel-grid">
            <a className="rel-card" href="/mc-site/ceramic"><div className="left"><span className="k">Protection</span><span className="n">Ceramic</span></div><span className="arr">→</span></a>
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
              <details className="faq"><summary>How long does paint correction take?<span className="icon">+</span></summary><div className="answer"><p>1-step: 1 day. 2-step: 2 days. We do one car at a time.</p></div></details>
              <details className="faq"><summary>Will paint correction remove all scratches?<span className="icon">+</span></summary><div className="answer"><p>It removes defects within the clear coat. Deep scratches through to the paint or primer cannot be polished out — those require respray. We&apos;ll tell you honestly what can and can&apos;t be corrected before we start.</p></div></details>
              <details className="faq"><summary>How do I know if I need paint correction?<span className="icon">+</span></summary><div className="answer"><p>Look at your car under direct sunlight or a bright LED. If you see a haze of circular marks in the finish — you need correction.</p></div></details>
              <details className="faq"><summary>Should I get paint correction before ceramic coating?<span className="icon">+</span></summary><div className="answer"><p>Yes. Ceramic locks in the surface it&apos;s applied to. Correcting first means locking in a perfect finish.</p></div></details>
              <details className="faq"><summary>Does paint correction damage the clear coat?<span className="icon">+</span></summary><div className="answer"><p>Done correctly, no. Machine polishing removes a microscopic layer of clear coat. A skilled correction removes the minimum necessary. Done wrong — yes, it can cause damage. This is why the person doing it matters.</p></div></details>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="book">
        <h2>Ready to <span className="blue">sort it?</span></h2>
        <p className="sub">Send us the car. We&apos;ll assess what&apos;s correctable, manage the project through Izimoto&apos;s detail team, and hand it back to you right.</p>
        <a className="btn-big" href="https://matthewsandclark.co.za">Book a Slot <span className="arr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg></span></a>
      </section>

      <footer data-mc-footer=""></footer>
      <script dangerouslySetInnerHTML={{ __html: baScript }} />
    </>
  );
}
